import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

const db = getFirestore();

export async function getSchemaVersion(): Promise<number> {
  const ref = doc(db, "app", "meta", "version");
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return 1;
  }

  const data = snap.data() as { schema?: number } | undefined;
  return typeof data?.schema === "number" ? data.schema : 1;
}

export async function setSchemaVersion(schema: number): Promise<void> {
  const ref = doc(db, "app", "meta", "version");
  await setDoc(
    ref,
    {
      schema,
      migratedAt: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
