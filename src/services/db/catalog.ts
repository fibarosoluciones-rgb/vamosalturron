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
} from "firebase/firestore";
import type { QueryConstraint, QueryDocumentSnapshot } from "firebase/firestore";
import type { AppConfigGeneral, Category, Item } from "@/types/catalog";

const db = getFirestore();

type ItemsCursor = QueryDocumentSnapshot<Item> | null;

type GetItemsOptions = {
  categoryId?: string;
  limit?: number;
  cursor?: ItemsCursor;
};

export async function getConfigGeneral(): Promise<AppConfigGeneral | null> {
  const ref = doc(db, "app", "config", "general");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AppConfigGeneral) : null;
}

export async function upsertConfigGeneral(partial: Partial<AppConfigGeneral>): Promise<void> {
  const ref = doc(db, "app", "config", "general");
  await setDoc(
    ref,
    {
      brand: "FIBARO",
      featureFlags: {},
      updatedAt: new Date().toISOString(),
      ...partial,
    },
    { merge: true }
  );
}

export async function getCategories(): Promise<Category[]> {
  const col = collection(db, "catalog", "categories");
  const q = query(col, orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((document) => ({ id: document.id, ...(document.data() as Category) }));
}

export async function upsertCategory(category: Category): Promise<void> {
  const ref = doc(db, "catalog", "categories", category.id);
  await setDoc(
    ref,
    { ...category, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const ref = doc(db, "catalog", "categories", categoryId);
  await deleteDoc(ref);
}

export async function getItems(
  options: GetItemsOptions = {}
): Promise<{ items: Item[]; nextCursor?: QueryDocumentSnapshot<Item> }> {
  const { categoryId, limit = 20, cursor } = options;
  const col = collection(db, "catalog", "items");

  const constraints: QueryConstraint[] = [];

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

  const items = snap.docs.map((document) => ({
    id: document.id,
    ...(document.data() as Item),
  }));

  const nextCursor = snap.docs.length === limit ? (snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot<Item>) : undefined;

  return { items, nextCursor };
}

export async function getItemById(itemId: string): Promise<Item | null> {
  const ref = doc(db, "catalog", "items", itemId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Item) }) : null;
}

export async function upsertItem(item: Item): Promise<void> {
  const ref = doc(db, "catalog", "items", item.id);
  await setDoc(
    ref,
    { ...item, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function deleteItem(itemId: string): Promise<void> {
  const ref = doc(db, "catalog", "items", itemId);
  await deleteDoc(ref);
}
