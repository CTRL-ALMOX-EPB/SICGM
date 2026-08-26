// ============================================
// FIREBASE-INIT.JS - INICIALIZAÇÃO DO FIREBASE
// ============================================
// ⚠️ Este arquivo NÃO contém dados sensíveis!
// Os dados vêm do firebase-config.js
// ============================================

// 🔥 Verificar se o Firebase já foi inicializado
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    console.warn('⚠️ Firebase não foi inicializado! Verifique se o firebase-config.js foi carregado.');
} else if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    console.log('🔥 Firebase já está inicializado!');
} else {
    console.error('❌ Firebase SDK não encontrado!');
}