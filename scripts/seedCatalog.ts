import { initializeApp, type FirebaseOptions } from "firebase/app";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import type { AppConfigGeneral, Category, Item } from "@/types/catalog";

async function resolveFirebaseConfig(): Promise<FirebaseOptions> {
  try {
    const module = await import("../firebase-config.js");
    const options = module.firebaseConfig as FirebaseOptions | undefined;
    if (options) {
      return options;
    }
  } catch (error) {
    if (process.env.DEBUG_SEED === "1") {
      console.warn("Fallo al importar firebase-config.js", error);
    }
  }

  const json = process.env.FIREBASE_CONFIG_JSON;
  if (json) {
    return JSON.parse(json) as FirebaseOptions;
  }

  throw new Error(
    "No se ha encontrado la configuración de Firebase. Exporta firebaseConfig en firebase-config.js o define FIREBASE_CONFIG_JSON"
  );
}

async function seed(): Promise<void> {
  const firebaseOptions = await resolveFirebaseConfig();
  const app = initializeApp(firebaseOptions, "seedCatalog");
  const db = getFirestore(app);
  const now = new Date().toISOString();

  const config: AppConfigGeneral = {
    brand: "FIBARO",
    featureFlags: { newCatalog: true },
    updatedAt: now,
  };

  const category: Category = {
    id: "internet",
    name: "Solo fibra",
    order: 1,
    isActive: true,
    updatedAt: now,
  };

  const item: Item = {
    id: "ex-jazztel-fibra-600",
    categoryId: category.id,
    operator: "jazztel",
    name: "Fibra 600",
    price: 30.95,
    features: { permanence: "12m" },
    isActive: true,
    updatedAt: now,
  };

  await setDoc(doc(db, "app", "config", "general"), config, { merge: true });
  await setDoc(doc(db, "catalog", "categories", category.id), category, { merge: true });
  await setDoc(doc(db, "catalog", "items", item.id), item, { merge: true });

  console.log("Seed OK");
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
