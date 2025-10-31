import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// Firebase Web config (vamosalturron-3242c)
const firebaseConfig = {
  apiKey: "AIzaSyD12d4a_m7Hn1xQ1uBwogvqnaVsFdnJxXo",
  authDomain: "vamosalturron-3242c.firebaseapp.com",
  projectId: "vamosalturron-3242c",
  storageBucket: "vamosalturron-3242c.appspot.com",
  messagingSenderId: "885711634201",
  appId: "1:885711634201:web:565c8d958547964bc58f88",
  measurementId: "G-NTWC6V4W4X",
};

const app = initializeApp(firebaseConfig);

try {
  // `getAnalytics` solo funciona en navegadores con Analytics habilitado.
  if (typeof window !== "undefined") {
    getAnalytics(app);
  }
} catch (error) {
  console.warn("Firebase Analytics no se ha podido inicializar", error);
}

if (typeof window !== "undefined") {
  window.FIREBASE_CONFIG = firebaseConfig;
  window.firebaseApp = app;
}

export { firebaseConfig, app };
