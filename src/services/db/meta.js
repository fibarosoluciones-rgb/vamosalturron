import { loadFirestoreModule } from "../firebaseModule.js";

async function getFirestoreExports() {
  return loadFirestoreModule();
}

async function getDb() {
  const firestore = await getFirestoreExports();
  return firestore.getFirestore();
}

export async function getSchemaVersion() {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "app", "meta", "version");
  const snap = await firestore.getDoc(ref);
  if (!snap.exists()) {
    return 1;
  }

  const data = snap.data() || {};
  return typeof data.schema === "number" ? data.schema : 1;
}

export async function setSchemaVersion(schema) {
  const firestore = await getFirestoreExports();
  const db = await getDb();
  const ref = firestore.doc(db, "app", "meta", "version");
  await firestore.setDoc(
    ref,
    {
      schema,
      migratedAt: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
