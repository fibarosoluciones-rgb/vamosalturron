import { loadFirestoreModule } from "../services/firebaseModule.js";

export const SOURCE_ID = "legacy-state";

const LEGACY_COLLECTION = "app";
const LEGACY_DOCUMENT = "state";

async function getFirestoreExports() {
  return loadFirestoreModule();
}

async function getDb() {
  const firestore = await getFirestoreExports();
  return firestore.getFirestore();
}

function normaliseCategoryId(entry) {
  const candidates = [entry.categoryId, entry.category, entry.tipo, entry.type];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }
  return null;
}

function normaliseCategoryName(entry, fallback) {
  const candidates = [entry.categoriaNombre, entry.familia, entry.categoryName, entry.category];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return fallback;
}

async function readLegacyState() {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, LEGACY_COLLECTION, LEGACY_DOCUMENT);
  const snap = await firestore.getDoc(ref);
  if (!snap.exists()) {
    return {};
  }
  const data = snap.data();
  return data ?? {};
}

async function readDistributedTariffs() {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const colRef = firestore.collection(db, LEGACY_COLLECTION, LEGACY_DOCUMENT, "tariffs");
  const snapshot = await firestore.getDocs(colRef);
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() ?? {}) }));
}

async function loadLegacyTariffs() {
  const state = await readLegacyState();
  const legacyTariffs = Array.isArray(state.tariffs) ? state.tariffs : [];
  if (legacyTariffs.length) {
    return legacyTariffs;
  }
  return readDistributedTariffs();
}

export async function getLegacyCategoriesShape() {
  const tariffs = await loadLegacyTariffs();
  const categories = [];
  const seen = new Set();

  tariffs.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      return;
    }
    const entry = raw;
    const categoryId = normaliseCategoryId(entry);
    if (!categoryId || seen.has(categoryId)) {
      return;
    }
    seen.add(categoryId);
    const name = normaliseCategoryName(entry, categoryId);
    const orderValue = entry.order;
    const order = typeof orderValue === "number" && Number.isFinite(orderValue) ? orderValue : index;
    const active = Boolean(entry.activa ?? entry.active ?? true);
    categories.push({ id: categoryId, name, order, active });
  });

  return categories;
}

export async function getLegacyItemsShape(categoryId) {
  const tariffs = await loadLegacyTariffs();
  const target = typeof categoryId === "string" && categoryId.trim() ? categoryId.trim().toLowerCase() : "";

  return tariffs
    .filter((raw) => {
      if (!target) {
        return true;
      }
      if (!raw || typeof raw !== "object") {
        return false;
      }
      const entry = raw;
      const category = normaliseCategoryId(entry);
      if (category) {
        return category === target;
      }
      const type = typeof entry.tipo === "string" ? entry.tipo.trim().toLowerCase() : "";
      return type === target;
    })
    .map((entry) => (entry && typeof entry === "object" ? { ...entry } : entry));
}

export async function getLegacyBrand() {
  const state = await readLegacyState();
  const brandCandidates = [state.config?.brand, state.brand];
  for (const value of brandCandidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "FIBARO";
}
