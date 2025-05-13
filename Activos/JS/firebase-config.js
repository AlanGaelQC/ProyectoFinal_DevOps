// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyDliwZ114VGWK_2wA9agciV2DuB1F-Baro",
  authDomain: "burntorace-5ddb1.firebaseapp.com",
  projectId: "burntorace-5ddb1",
  storageBucket: "burntorace-5ddb1.appspot.com", // CORREGIDO: este era incorrecto
  messagingSenderId: "623988173896",
  appId: "1:623988173896:web:d970debd1192c4df2c3c7d",
  measurementId: "G-5PW6LY0PBF"
};

// Inicializa Firebase con las variables globales de los scripts por CDN
firebase.initializeApp(firebaseConfig);
firebase.analytics(); // Opcional: solo si usas analytics
