// ============================================
// FIREBASE-INIT.JS - INICIALIZAÇÃO DO FIREBASE
// ============================================
// ⚠️ Este arquivo NÃO contém dados sensíveis!
// Os dados vêm da variável global FIREBASE_CONFIG
// injetada pelo workflow no HTML
// ============================================

if (typeof window.FIREBASE_CONFIG !== 'undefined' && window.FIREBASE_CONFIG !== null) {
    // Inicializar Firebase com a config global
    firebase.initializeApp(window.FIREBASE_CONFIG);
    const auth = firebase.auth();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    console.log('🔥 Firebase inicializado com sucesso!');
} else {
    console.error('❌ FIREBASE_CONFIG não encontrado! Verifique se o workflow injetou as variáveis corretamente.');
}