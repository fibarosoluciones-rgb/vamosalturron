import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit as limitQuery,
  orderBy,
  query,
  setDoc,
  startAfter,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore();

export async function getConfigGeneral() {
  const ref = doc(db, "app", "config", "general");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function upsertConfigGeneral(partial) {
  const ref = doc(db, "app", "config", "general");
  await setDoc(
    ref,
    {
      brand: "FIBARO",
      featureFlags: {},
      updatedAt: new Date().toISOString(),
      ...(partial || {}),
    },
    { merge: true },
  );
}

export async function getCategories() {
  const col = collection(db, "catalog", "categories");
  const q = query(col, orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export async function upsertCategory(category) {
  const ref = doc(db, "catalog", "categories", category.id);
  await setDoc(ref, { ...category, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteCategory(categoryId) {
  const ref = doc(db, "catalog", "categories", categoryId);
  await deleteDoc(ref);
}

export async function getItems(options = {}) {
  const { categoryId, limit = 20, cursor } = options;
  const col = collection(db, "catalog", "items");
  const constraints = [];

  if (categoryId) {
    constraints.push(where("categoryId", "==", categoryId));
  }

  constraints.push(orderBy("updatedAt", "desc"));
  constraints.push(limitQuery(limit));

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  const q = query(col, ...constraints);
  const snap = await getDocs(q);
  const items = snap.docs.map((document) => ({ id: document.id, ...document.data() }));
  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1] : undefined;

  return { items, nextCursor };
}

export async function getItemById(itemId) {
  const ref = doc(db, "catalog", "items", itemId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function upsertItem(item) {
  const ref = doc(db, "catalog", "items", item.id);
  await setDoc(ref, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteItem(itemId) {
  const ref = doc(db, "catalog", "items", itemId);
  await deleteDoc(ref);
}
