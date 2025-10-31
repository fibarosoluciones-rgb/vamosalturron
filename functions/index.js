const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");

admin.initializeApp();

const PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId);
const BUCKET_NAME = "vamosalturron-3242c-backups";
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`;
const storage = new Storage();
const firestore = admin.firestore();

const BACKUP_RETENTION_DAYS = Number.parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10);
const BACKUP_PREFIX = "firestore/";
const BACKUP_COLLECTION = "disasterRecovery";
const BACKUP_DOC_ID = "exports";
const BACKUP_RUNS_SUBCOLLECTION = "runs";

if (Number.isNaN(BACKUP_RETENTION_DAYS) || BACKUP_RETENTION_DAYS <= 0) {
  throw new Error("BACKUP_RETENTION_DAYS must be a positive integer");
}

if (!PROJECT_ID) {
  throw new Error("Project ID is not defined in the environment");
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

function buildRelativePrefix(folder, time) {
  return `${BACKUP_PREFIX}${folder}/${time}/`;
}

function buildGsUri(relativePrefix) {
  return `gs://${BUCKET_NAME}/${relativePrefix}`;
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

async function waitForOperationCompletion(operationName, { pollIntervalMs = 5000, timeoutMs = 15 * 60 * 1000 } = {}) {
  const accessToken = await getAccessToken();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const response = await fetch(`https://firestore.googleapis.com/v1/${operationName}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Operation polling error: ${response.status} ${response.statusText} - ${text}`);
    }

    const payload = await response.json();
    if (payload.done) {
      return payload;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`Operation ${operationName} did not complete before timeout`);
}

async function findLatestBackupPrefix() {
  const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: BACKUP_PREFIX });
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

async function calculateBackupSizeBytes(relativePrefix) {
  const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: relativePrefix });
  return files.reduce((total, file) => {
    const size = Number.parseInt(file.metadata?.size || "0", 10);
    return total + (Number.isNaN(size) ? 0 : size);
  }, 0);
}

async function logBackupRun({ destination, sizeBytes, trigger }) {
  const docRef = firestore.collection(BACKUP_COLLECTION).doc(BACKUP_DOC_ID);
  const runsCollection = docRef.collection(BACKUP_RUNS_SUBCOLLECTION);
  await docRef.set({ updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  await runsCollection.add({
    destination,
    sizeBytes,
    trigger,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

function parseBackupKey(key) {
  const match = key.match(/^(\d{4}-\d{2}-\d{2})\/(\d{4})\/$/);
  if (!match) {
    return null;
  }
  const [year, month, day] = match[1].split("-").map((part) => Number.parseInt(part, 10));
  const hours = Number.parseInt(match[2].slice(0, 2), 10);
  const minutes = Number.parseInt(match[2].slice(2, 4), 10);
  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

async function cleanupExpiredBackups(now = new Date()) {
  const cutoff = new Date(now.getTime() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: BACKUP_PREFIX });
  const prefixes = new Set();

  for (const file of files) {
    const match = file.name.match(/^firestore\/(\d{4}-\d{2}-\d{2})\/(\d{4})\//);
    if (match) {
      prefixes.add(`${match[1]}/${match[2]}/`);
    }
  }

  for (const key of prefixes) {
    const timestamp = parseBackupKey(key);
    if (!timestamp || timestamp >= cutoff) {
      continue;
    }
    const prefix = `${BACKUP_PREFIX}${key}`;
    logger.info("Removing expired backup", { prefix, cutoff: cutoff.toISOString() });
    await storage.bucket(BUCKET_NAME).deleteFiles({ prefix, force: true }).catch((error) => {
      logger.error("Failed to delete expired backup", { prefix, error: error.message });
    });
  }
}

async function runManagedBackup(trigger) {
  const { folder, time } = formatTimestampPath();
  const relativePrefix = buildRelativePrefix(folder, time);
  const destination = buildGsUri(relativePrefix);
  logger.info("Starting Firestore backup", { destination, trigger });

  const exportResponse = await triggerFirestoreExport(destination);
  const operation = exportResponse.name;

  try {
    const completion = await waitForOperationCompletion(operation);
    const outputPrefix = completion?.metadata?.outputUriPrefix || destination;
    const relative = outputPrefix.replace(`gs://${BUCKET_NAME}/`, "");
    const sizeBytes = await calculateBackupSizeBytes(relative);
    await logBackupRun({ destination: outputPrefix, sizeBytes, trigger });
    await cleanupExpiredBackups();
    logger.info("Firestore backup completed", { destination: outputPrefix, sizeBytes, trigger });
    return { destination: outputPrefix, sizeBytes };
  } catch (error) {
    logger.error("Error completing Firestore backup", { operation, trigger, error: error.message });
    throw error;
  }
}

// The Cloud Scheduler job region is derived from the function's manifest.
// Explicitly pinning the region to europe-west1 keeps the scheduler in a
// supported location even if europe-southwest1 lacks the service.
const scheduledBackup = onSchedule(
  {
    schedule: "0 2 * * *",
    region: "europe-west1",
  },
  async () => {
    try {
      return await runManagedBackup("scheduled");
    } catch (error) {
      logger.error("Scheduled backup failed", { error: error.message });
      throw error;
    }
  }
);

exports.scheduledBackup = scheduledBackup;

function validateAdminToken(req, res) {
  const authHeader = req.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    logger.warn("Unauthorized request: missing bearer token");
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!process.env.ADMIN_TOKEN) {
    logger.warn("ADMIN_TOKEN environment variable is not set");
  }
  if (!token || token !== process.env.ADMIN_TOKEN) {
    logger.warn("Unauthorized request: invalid token");
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return token;
}

function parseJsonBody(req) {
  if (req.body && Object.keys(req.body).length) {
    return req.body;
  }
  if (req.rawBody) {
    try {
      return JSON.parse(req.rawBody.toString());
    } catch (error) {
      logger.warn("Failed to parse JSON body", { error: error.message });
    }
  }
  return {};
}

exports.importLatestBackup = onRequest({ region: "europe-southwest1" }, async (req, res) => {
  if (!validateAdminToken(req, res)) {
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

exports.triggerManualBackup = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Admin privileges required");
  }

  try {
    const result = await runManagedBackup("manual");
    return { message: "Backup completed", ...result };
  } catch (error) {
    logger.error("Manual backup failed", { error: error.message });
    throw new HttpsError("internal", error.message || "Backup failed");
  }
});

exports.assignAdminRole = onRequest({ region: "europe-west1" }, async (req, res) => {
  if (req.method !== "POST") {
    res.set("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (!validateAdminToken(req, res)) {
    return;
  }

  const payload = parseJsonBody(req);
  const uid = payload.uid;
  const enabled = payload.admin !== false;

  if (typeof uid !== "string" || uid.length === 0) {
    res.status(400).json({ error: "Missing uid" });
    return;
  }

  try {
    const record = await admin.auth().getUser(uid);
    const customClaims = { ...(record.customClaims || {}) };
    if (enabled) {
      customClaims.admin = true;
    } else {
      delete customClaims.admin;
    }
    await admin.auth().setCustomUserClaims(uid, customClaims);
    await firestore
      .collection("adminAssignments")
      .doc(uid)
      .set(
        {
          admin: enabled,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    res.json({ uid, admin: enabled });
  } catch (error) {
    logger.error("Failed to assign admin role", { uid, error: error.message });
    res.status(500).json({ error: "Failed to assign admin role" });
  }
});

exports.setUserRoles = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Admin privileges required");
  }

  const uidRaw = request.data?.uid;
  if (typeof uidRaw !== "string" || !uidRaw.trim()) {
    throw new HttpsError("invalid-argument", "A valid uid is required");
  }
  const uid = uidRaw.trim();
  const rawClaims = request.data?.claims;
  if (!rawClaims || typeof rawClaims !== "object" || Array.isArray(rawClaims)) {
    throw new HttpsError("invalid-argument", "claims must be an object");
  }

  const updates = {};
  const removals = new Set();

  for (const [key, value] of Object.entries(rawClaims)) {
    if (value === undefined) {
      continue;
    }
    if (key === "roles") {
      if (value === null) {
        removals.add("roles");
        continue;
      }
      if (!Array.isArray(value)) {
        throw new HttpsError("invalid-argument", "roles must be an array of strings");
      }
      const roles = Array.from(new Set(value
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length)));
      if (roles.length) {
        updates.roles = roles;
      } else {
        removals.add("roles");
      }
      continue;
    }
    if (key === "role") {
      if (value === null || value === false) {
        removals.add("role");
        continue;
      }
      if (typeof value !== "string") {
        throw new HttpsError("invalid-argument", "role must be a string");
      }
      const trimmedRole = value.trim();
      if (trimmedRole) {
        updates.role = trimmedRole;
      } else {
        removals.add("role");
      }
      continue;
    }
    if (value === null || value === false) {
      removals.add(key);
      continue;
    }
    if (typeof value === "boolean" || typeof value === "string" || typeof value === "number") {
      updates[key] = value;
      continue;
    }
    throw new HttpsError("invalid-argument", `Unsupported claim value for ${key}`);
  }

  try {
    const record = await admin.auth().getUser(uid);
    const customClaims = { ...(record.customClaims || {}) };
    removals.forEach((key) => {
      delete customClaims[key];
    });
    Object.assign(customClaims, updates);
    await admin.auth().setCustomUserClaims(uid, customClaims);
    return { uid, claims: customClaims };
  } catch (error) {
    logger.error("Failed to set user roles", { uid, error: error.message });
    throw new HttpsError("internal", error.message || "Failed to set user roles");
  }
});

exports.listBackups = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError("permission-denied", "Admin privileges required");
  }
  const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: BACKUP_PREFIX });
  const items = files
    .filter((file) => /export\.json$/.test(file.name))
    .map((file) => ({
      name: file.name,
      updated: file.metadata?.updated || file.metadata?.timeCreated,
      size: Number.parseInt(file.metadata?.size || "0", 10) || 0,
    }));
  return { items };
});
