// Configura aquí tu proyecto de Firebase.
// Sustituye los valores por los de tu panel de Firebase.
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: '',
  authDomain: '',
  projectId: '',
};

// Puedes ajustar la colección/documento donde se guardará el estado compartido.
window.FIREBASE_DATA_DOCUMENT = window.FIREBASE_DATA_DOCUMENT || {
  collection: 'app',
  document: 'state',
};
