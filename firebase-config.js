// Configuración multi-entorno de Firebase.
// Ajusta los valores `prod` y `dev` con las credenciales reales de cada proyecto.
(function configureFirebaseEnv() {
  const PROJECTS = window.FIREBASE_PROJECTS || {
    prod: {
      config: {
        apiKey: "AIzaSyD12d4a_m7Hn1xQ1uBwogvqnaVsFdnJxXo",
        authDomain: "vamosalturron-3242c.firebaseapp.com",
        projectId: "vamosalturron-3242c",
        storageBucket: "vamosalturron-3242c.firebasestorage.app",
        messagingSenderId: "885711634201",
        appId: "1:885711634201:web:565c8d958547964bc58f88",
        measurementId: "G-NTWC6V4W4X"
      },
      dataDocument: { collection: 'app', document: 'state' },
      appCheckSiteKey: '',
      functionsRegion: 'europe-west1'
    },
    dev: {
      config: {
        apiKey: '',
        authDomain: 'vamosalturron-dev.firebaseapp.com',
        projectId: 'vamosalturron-dev',
        storageBucket: 'vamosalturron-dev.appspot.com',
        messagingSenderId: '',
        appId: '',
        measurementId: ''
      },
      dataDocument: { collection: 'app', document: 'state' },
      appCheckSiteKey: '',
      functionsRegion: 'europe-west1'
    }
  };

  const inferredEnv = window.FIREBASE_ENV || (window.location.hostname.includes('localhost') ? 'dev' : 'prod');
  const active = PROJECTS[inferredEnv] || PROJECTS.prod;

  window.FIREBASE_ENV = inferredEnv;
  window.FIREBASE_CONFIG = active.config;
  window.FIREBASE_DATA_DOCUMENT = active.dataDocument;
  window.APP_CHECK_SITE_KEY = active.appCheckSiteKey || '';
  window.FIREBASE_FUNCTIONS_REGION = active.functionsRegion || 'europe-west1';
})();
