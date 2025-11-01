import { doc, getDoc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const db = getFirestore();

export async function getSchemaVersion() {
  const ref = doc(db, "app", "meta", "version");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return 1;
  }
  const data = snap.data() || {};
  return typeof data.schema === "number" ? data.schema : 1;
}

export async function setSchemaVersion(schema) {
  const ref = doc(db, "app", "meta", "version");
  await setDoc(ref, { schema, migratedAt: null }, { merge: true });
}
