import { initializeApp } from "firebase/app";

// DESARROLLO
const devConfig = {
  apiKey: "AIzaSyCk1wMhtVbO3O9QaWJ3taR2dDq1Wf8rFkY",
  authDomain: "vamosalturron-dev.firebaseapp.com",
  projectId: "vamosalturron-dev",
  storageBucket: "vamosalturron-dev.appspot.com",
  messagingSenderId: "1075634985123",
  appId: "1:1075634985123:web:90c7a7d48d3bcbe6271e4f",
  measurementId: "G-1N2P3Q4R5S"
};

// PRODUCCIÓN
const prodConfig = {
  // <-- PEGAR AQUÍ EL BLOQUE PROD (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId si aplica)
};

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname === "[::1]" ||
   window.location.hostname.startsWith("192.168."));

export const firebaseConfig = isLocalhost ? devConfig : prodConfig;
export const app = initializeApp(firebaseConfig);
