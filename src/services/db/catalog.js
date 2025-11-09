import { loadFirestoreModule } from "../firebaseModule.js";

function ensureFirestoreTimestamp() {
  return new Date().toISOString();
}

async function getFirestoreExports() {
  return loadFirestoreModule();
}

async function getDb() {
  const firestore = await getFirestoreExports();
  return firestore.getFirestore();
}

export async function getConfigGeneral() {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "app", "config", "general");
  const snap = await firestore.getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function upsertConfigGeneral(partial) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "app", "config", "general");
  await firestore.setDoc(
    ref,
    {
      brand: "FIBARO",
      featureFlags: {},
      updatedAt: ensureFirestoreTimestamp(),
      ...partial,
    },
    { merge: true }
  );
}

export async function getCategories() {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const col = firestore.collection(db, "catalog", "categories");
  const q = firestore.query(col, firestore.orderBy("order", "asc"));
  const snap = await firestore.getDocs(q);
  return snap.docs.map((document) => ({ id: document.id, ...document.data() }));
}

export async function upsertCategory(category) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "catalog", "categories", category.id);
  await firestore.setDoc(
    ref,
    { ...category, updatedAt: ensureFirestoreTimestamp() },
    { merge: true }
  );
}

export async function deleteCategory(categoryId) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "catalog", "categories", categoryId);
  await firestore.deleteDoc(ref);
}

export async function getItems(options = {}) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const { categoryId, limit = 20, cursor } = options;
  const col = firestore.collection(db, "catalog", "items");

  const constraints = [];

  if (categoryId) {
    constraints.push(firestore.where("categoryId", "==", categoryId));
  }

  constraints.push(firestore.orderBy("updatedAt", "desc"));
  constraints.push(firestore.limit(limit));

  if (cursor) {
    constraints.push(firestore.startAfter(cursor));
  }

  const q = firestore.query(col, ...constraints);
  const snap = await firestore.getDocs(q);

  const items = snap.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));

  const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1] : undefined;

  return { items, nextCursor };
}

export async function getItemById(itemId) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "catalog", "items", itemId);
  const snap = await firestore.getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function upsertItem(item) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "catalog", "items", item.id);
  await firestore.setDoc(
    ref,
    { ...item, updatedAt: ensureFirestoreTimestamp() },
    { merge: true }
  );
}

export async function deleteItem(itemId) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "catalog", "items", itemId);
  await firestore.deleteDoc(ref);
}
