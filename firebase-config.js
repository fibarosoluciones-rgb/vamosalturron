import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

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
  apiKey: "AIzaSyDNvCUWoSppn7EKlUdc8CnADlBzT_nLzaE",
  authDomain: "vamosalturron-prod.firebaseapp.com",
  projectId: "vamosalturron-prod",
  storageBucket: "vamosalturron-prod.appspot.com",
  messagingSenderId: "878159706683",
  appId: "1:878159706683:web:1adc78e6ac7a1a7e0e7a1e",
  measurementId: "G-MGQ5TEBYD1"
};

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname === "[::1]" ||
   window.location.hostname.startsWith("192.168."));

export const firebaseConfig = isLocalhost ? devConfig : prodConfig;
export const app = initializeApp(firebaseConfig);
