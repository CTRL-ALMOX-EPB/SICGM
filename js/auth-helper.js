// ============================================
// AUTH-HELPER.JS - v5
// Utilitário de UI. NÃO declara 'redirecting'.
// NÃO redireciona. NÃO mexe em sessão.
// Serve apenas para preencher campos de usuário em páginas
// que não importam auth-global.js (ex: home-operacional, home-gestao).
// ============================================

(function () {
    'use strict';

    function getDataBrasilLocal() {
        const agora = new Date();
        const offsetBrasil = -3;
        const horaUTC = agora.getTime() + (agora.getTimezoneOffset() * 60000);
        const dataBrasil = new Date(horaUTC + (offsetBrasil * 3600000));
        return dataBrasil.toISOString().split('T')[0];
    }

    // Preenche campos de exibição e formulário a partir de um user object
    window.preencheUsuarioUI = function (user) {
        if (!user) return;

        const setText = (id, v) => {
            const el = document.getElementById(id);
            if (el && 'textContent' in el) el.textContent = v;
        };
        const setValue = (id, v) => {
            const el = document.getElementById(id);
            if (el && 'value' in el) el.value = v;
        };

        // elementos de exibição
        setText('nomeUsuario', user.nome || '');
        setText('matriculaUsuario', user.matricula ? `Matrícula: ${user.matricula}` : '');
        setText('perfilUsuario', user.perfil || '');
        setText('mensagemBoasVindas', user.nome ? `👋 Olá, ${user.nome}!` : '');

        // elementos de formulário
        setValue('nome', user.nome || '');
        setValue('matricula', user.matricula || '');

        const elData = document.getElementById('data');
        if (elData && !elData.value) {
            setValue('data', getDataBrasilLocal());
        }

        window.dadosSessao = {
            nome: user.nome || '',
            matricula: user.matricula || '',
            perfil: user.perfil || '',
            email: user.email || ''
        };
    };

    // Inicialização leve: espera authService, preenche UI, esconde loading
    document.addEventListener('DOMContentLoaded', async function () {
        if (typeof authService === 'undefined' || !authService) {
            console.warn('⚠️ auth-helper: authService indisponível.');
            return;
        }

        try {
            await authService.waitForInit();

            // Não força login — se não estiver logado, apenas não preenche
            if (!authService.isLoggedIn()) {
                console.log('ℹ️ auth-helper: usuário não logado — UI não preenchida.');
                return;
            }

            const user = authService.getUserData();
            if (!user) return;

            window.preencheUsuarioUI(user);
            console.log('✅ auth-helper: UI preenchida para', user.nome);

            const loading = document.getElementById('loadingOverlay');
            const content = document.getElementById('homeContent');
            if (loading) { loading.style.display = 'none'; loading.classList.remove('active'); }
            if (content) content.style.display = 'block';

        } catch (e) {
            console.error('❌ auth-helper erro:', e);
        }
    });
})();