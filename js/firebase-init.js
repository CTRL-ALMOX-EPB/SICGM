// ============================================
// FIREBASE-INIT.JS - ÚNICO PONTO DE INICIALIZAÇÃO
// ============================================
// Deve ser carregado DEPOIS de firebase-config.js
// ============================================

(function () {
    'use strict';

    if (window.__FIREBASE_INITIALIZED__) {
        console.log('🔥 Firebase já inicializado (skip).');
        return;
    }

    if (typeof firebase === 'undefined') {
        console.error('❌ SDK do Firebase não carregado!');
        return;
    }

    const config = window.FIREBASE_CONFIG ||
                  (typeof firebaseConfig !== 'undefined' ? firebaseConfig : null);

    if (!config) {
        console.error('❌ FIREBASE_CONFIG não encontrado!');
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
            console.log('🔥 Firebase inicializado!');
        } else {
            console.log('🔥 Firebase já estava inicializado.');
        }

        // LOCAL: sobrevive a fechar aba/navegador.
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => console.log('🔒 Persistência: LOCAL'))
            .catch(err => console.warn('⚠️ Erro ao definir persistência:', err));

        window.__FIREBASE_INITIALIZED__ = true;
    } catch (error) {
        console.error('❌ Erro ao inicializar Firebase:', error);
    }
})();