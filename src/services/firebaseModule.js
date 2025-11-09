const FIREBASE_VERSION = "10.12.2";

let firestoreModulePromise;

export function loadFirestoreModule() {
  if (!firestoreModulePromise) {
    firestoreModulePromise =
      typeof window === "undefined"
        ? import("firebase/firestore")
        : import(
            /* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
          );
  }
  return firestoreModulePromise;
}
