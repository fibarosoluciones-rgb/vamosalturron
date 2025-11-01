import { collection, doc, getDoc, getDocs, getFirestore } from "firebase/firestore";

export const SOURCE_ID = "legacy-state";

const db = getFirestore();
const LEGACY_COLLECTION = "app";
const LEGACY_DOCUMENT = "state";

interface LegacyState {
  tariffs?: unknown[];
  brand?: unknown;
  config?: { brand?: unknown };
  featureFlags?: Record<string, unknown>;
}

function normaliseCategoryId(entry: Record<string, unknown>): string | null {
  const candidates = [entry.categoryId, entry.category, entry.tipo, entry.type];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }
  return null;
}

function normaliseCategoryName(entry: Record<string, unknown>, fallback: string): string {
  const candidates = [entry.categoriaNombre, entry.familia, entry.categoryName, entry.category];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return fallback;
}

async function readLegacyState(): Promise<LegacyState> {
  const ref = doc(db, LEGACY_COLLECTION, LEGACY_DOCUMENT);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {};
  }
  const data = snap.data() as LegacyState | undefined;
  return data ?? {};
}

async function readDistributedTariffs(): Promise<unknown[]> {
  const colRef = collection(db, LEGACY_COLLECTION, LEGACY_DOCUMENT, "tariffs");
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Record<string, unknown>) }));
}

async function loadLegacyTariffs(): Promise<unknown[]> {
  const state = await readLegacyState();
  const legacyTariffs = Array.isArray(state.tariffs) ? state.tariffs : [];
  if (legacyTariffs.length) {
    return legacyTariffs;
  }
  return readDistributedTariffs();
}

export async function getLegacyCategoriesShape() {
  const tariffs = await loadLegacyTariffs();
  const categories: { id: string; name: string; order: number; active: boolean }[] = [];
  const seen = new Set<string>();

  tariffs.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") {
      return;
    }
    const entry = raw as Record<string, unknown>;
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

export async function getLegacyItemsShape(categoryId: string) {
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
      const entry = raw as Record<string, unknown>;
      const category = normaliseCategoryId(entry);
      if (category) {
        return category === target;
      }
      const type = typeof entry.tipo === "string" ? entry.tipo.trim().toLowerCase() : "";
      return type === target;
    })
    .map((entry) => (entry && typeof entry === "object" ? { ...(entry as Record<string, unknown>) } : entry));
}

export async function getLegacyBrand(): Promise<string> {
  const state = await readLegacyState();
  const brandCandidates = [state.config?.brand, state.brand];
  for (const value of brandCandidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "FIBARO";
}
