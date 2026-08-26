// ============================================
// CONFIGURAÇÃO DO FIREBASE
// ============================================

// COLE AQUI AS CONFIGURAÇÕES QUE VOCÊ COPIU DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBMh_q404XwdVjDCIRnu503w1jdGiUHF7g",
  authDomain: "sicgm-ctrlalmox.firebaseapp.com",
  projectId: "sicgm-ctrlalmox",
  storageBucket: "sicgm-ctrlalmox.firebasestorage.app",
  messagingSenderId: "134511015185",
  appId: "1:134511015185:web:f48bc85f5c533da95c08b0",
  measurementId: "G-S6P74JMJ5G"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Configurar para manter sessão (opcional)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

console.log('🔥 Firebase inicializado com sucesso!');