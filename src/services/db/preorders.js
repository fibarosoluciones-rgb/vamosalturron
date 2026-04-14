import { loadFirestoreModule } from "../firebaseModule.js";

const PREORDERS_COLLECTION = "preorders";

async function getFirestoreExports() {
  return loadFirestoreModule();
}

async function getDb() {
  const firestore = await getFirestoreExports();
  return firestore.getFirestore();
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value) {
  const allowed = new Set(["nuevo", "contactado", "en_gestion", "cerrado"]);
  const status = cleanString(value).toLowerCase();
  return allowed.has(status) ? status : "nuevo";
}

function normalizeClient(client) {
  const source = client && typeof client === "object" ? client : {};
  return {
    name: cleanString(source.name),
    phone: cleanString(source.phone),
    email: cleanString(source.email),
    notes: cleanString(source.notes),
  };
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      return {
        tariffId: cleanString(entry.tariffId),
        code: cleanString(entry.code),
        name: cleanString(entry.name),
        company: cleanString(entry.company),
        price: Number.isFinite(Number(entry.price)) ? Number(entry.price) : null,
      };
    })
    .filter((entry) => entry && (entry.tariffId || entry.code || entry.name));
}

function normalizeCollaborator(collaborator) {
  if (!collaborator || typeof collaborator !== "object") {
    return null;
  }

  const username = cleanString(collaborator.username);
  const name = cleanString(collaborator.name);
  if (!username && !name) {
    return null;
  }

  return { username, name };
}

function mapSnapshotToPreorder(document) {
  const data = document.data() || {};
  return {
    id: document.id,
    status: normalizeStatus(data.status),
    client: normalizeClient(data.client),
    items: normalizeItems(data.items),
    collaborator: normalizeCollaborator(data.collaborator),
    source: cleanString(data.source),
    leadId: cleanString(data.leadId),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function createPreorder(payload) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const col = firestore.collection(db, PREORDERS_COLLECTION);

  const source = payload && typeof payload === "object" ? payload : {};
  const data = {
    status: normalizeStatus(source.status),
    client: normalizeClient(source.client),
    items: normalizeItems(source.items),
    collaborator: normalizeCollaborator(source.collaborator),
    source: cleanString(source.source),
    leadId: cleanString(source.leadId),
    createdAt: firestore.serverTimestamp(),
    updatedAt: firestore.serverTimestamp(),
  };

  const ref = await firestore.addDoc(col, data);
  return {
    id: ref.id,
    ...data,
  };
}

export async function listPreorders(options = {}) {
  const firestore = await getFirestoreExports();
  const db = await getDb();

  const limitValue = Number.isFinite(Number(options.limit))
    ? Math.max(1, Math.floor(Number(options.limit)))
    : 50;

  const col = firestore.collection(db, PREORDERS_COLLECTION);
  const q = firestore.query(
    col,
    firestore.orderBy("createdAt", "desc"),
    firestore.limit(limitValue)
  );

  const snap = await firestore.getDocs(q);
  return snap.docs.map(mapSnapshotToPreorder);
}
