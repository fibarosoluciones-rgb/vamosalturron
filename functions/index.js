const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule: firebaseOnSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");

admin.initializeApp();

const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId);
const BUCKET_NAME = "vamosalturron-3242c-backups";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`;
const storage = new Storage();

if (!PROJECT_ID) {
  throw new Error("Project ID is not defined in the environment");
}

const region = (name) => ({ region: name });

function onSchedule(schedule, runtimeOptions, handler) {
  if (typeof schedule === "string" && typeof handler === "function" && runtimeOptions && runtimeOptions.region) {
    return firebaseOnSchedule({ schedule, ...runtimeOptions }, handler);
  }
  return firebaseOnSchedule(schedule, runtimeOptions);
}

async function getAccessToken() {
  const credential = admin.credential.applicationDefault();
  const { access_token: accessToken } = await credential.getAccessToken();
  return accessToken;
}

function formatTimestampPath(date = new Date()) {
  const pad = (value) => value.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return {
    folder: `${year}-${month}-${day}`,
    time: `${hours}${minutes}`,
  };
}

async function triggerFirestoreExport(outputUriPrefix) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${FIRESTORE_BASE_URL}:exportDocuments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ outputUriPrefix }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Export API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

async function triggerFirestoreImport(inputUriPrefix) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${FIRESTORE_BASE_URL}:importDocuments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputUriPrefix }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Import API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

async function findLatestBackupPrefix() {
  const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: "firestore/" });
  const candidates = new Set();

  files.forEach((file) => {
    const match = file.name.match(/^firestore\/(\d{4}-\d{2}-\d{2})\/(\d{4})\//);
    if (match) {
      candidates.add(`${match[1]}/${match[2]}`);
    }
  });

  if (!candidates.size) {
    return null;
  }

  const sorted = Array.from(candidates).sort();
  const latest = sorted[sorted.length - 1];
  return `gs://${BUCKET_NAME}/firestore/${latest}/`;
}

exports.scheduledBackup = onSchedule("every 60 minutes", region("europe-southwest1"), async () => {
  const { folder, time } = formatTimestampPath();
  const destination = `gs://${BUCKET_NAME}/firestore/${folder}/${time}/`;
  logger.info("Starting Firestore backup", { destination });

  try {
    const result = await triggerFirestoreExport(destination);
    logger.info("Firestore backup requested successfully", { operation: result.name, destination });
    return result;
  } catch (error) {
    logger.error("Error during Firestore backup", { error: error.message, destination });
    throw error;
  }
});

exports.importLatestBackup = onRequest({ region: "europe-southwest1" }, async (req, res) => {
  const authHeader = req.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    logger.warn("Unauthorized request: missing bearer token");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!process.env.ADMIN_TOKEN) {
    logger.warn("ADMIN_TOKEN environment variable is not set");
  }
  if (!token || token !== process.env.ADMIN_TOKEN) {
    logger.warn("Unauthorized request: invalid token");
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const latestBackup = await findLatestBackupPrefix();
    if (!latestBackup) {
      logger.warn("No Firestore backups found in bucket");
      res.status(404).json({ error: "No backups available" });
      return;
    }

    logger.info("Starting Firestore restore", { source: latestBackup });
    const result = await triggerFirestoreImport(latestBackup);
    logger.info("Firestore restore requested successfully", { operation: result.name, source: latestBackup });
    res.json({ message: "Backup import started", operation: result.name, source: latestBackup });
  } catch (error) {
    logger.error("Error during Firestore restore", { error: error.message });
    res.status(500).json({ error: "Failed to import backup" });
  }
});
