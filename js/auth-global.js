// ============================================
// AUTH-GLOBAL.JS - v5
// - Envolto em IIFE para evitar colisão com auth-helper.js
// - Preenche #nomeUsuario, #matriculaUsuario, #perfilUsuario (textContent)
// - Preenche #nome, #matricula, #data (value — inputs de formulário)
// - Suporta iframe (postMessage PRECISA_LOGIN)
// - Renovação automática a cada 5 min
// ============================================

(function () {
    'use strict';

    let redirecting = false;

    function getDataBrasilLocal() {
        const agora = new Date();
        const offsetBrasil = -3;
        const horaUTC = agora.getTime() + (agora.getTimezoneOffset() * 60000);
        const dataBrasil = new Date(horaUTC + (offsetBrasil * 3600000));
        return dataBrasil.toISOString().split('T')[0];
    }

    document.addEventListener('DOMContentLoaded', async function () {
        console.log('🔐 Verificando autenticação...');

        if (typeof authService === 'undefined' || !authService) {
            console.error('❌ authService não encontrado!');
            return;
        }

        await authService.waitForInit();

        // Espera o Firebase restaurar o usuário do IndexedDB
        if (authService.auth) {
            await new Promise(resolve => {
                let done = false;
                const finish = () => { if (!done) { done = true; resolve(); } };
                const unsub = authService.auth.onAuthStateChanged(() => { unsub(); finish(); });
                setTimeout(finish, 2500);
            });
        }

        // 1. Caminho rápido: token local válido
        let user = authService.getUserData();

        // 2. Caminho KV: sessionStorage vazio (aba fechada) → pergunta ao Worker
        if (!user) {
            console.log('🔍 Sem token local — consultando KV...');
            const restored = await authService.restoreSessionFromKV();
            if (restored) user = authService.getUserData();
        }

        // 3. Não tem como manter → login
        if (!user) {
            if (redirecting) return;
            redirecting = true;
            console.log('🔒 Sessão inválida — indo para login.');
            if (window.self !== window.top) {
                // Estou em iframe → avisa o parent para redirecionar a janela inteira
                try {
                    window.parent.postMessage({ type: 'PRECISA_LOGIN' }, '*');
                } catch (_) {
                    window.location.href = 'login.html';
                }
            } else {
                window.location.href = 'login.html';
            }
            return;
        }

        console.log(`✅ Sessão válida: ${user.nome} (${user.perfil})`);

        // ============================================
        // Preenche UI
        // ============================================
        const setText = (id, v) => {
            const el = document.getElementById(id);
            if (el && 'textContent' in el) el.textContent = v;
        };
        const setValue = (id, v) => {
            const el = document.getElementById(id);
            if (el && 'value' in el) el.value = v;
        };

        // elementos de exibição (span/div)
        setText('nomeUsuario', user.nome);
        setText('matriculaUsuario', `Matrícula: ${user.matricula}`);
        setText('perfilUsuario', user.perfil);
        setText('mensagemBoasVindas', `👋 Olá, ${user.nome}!`);

        // 🔧 CORREÇÃO: elementos de formulário (contagem-diaria, etc.)
        setValue('nome', user.nome || '');
        setValue('matricula', user.matricula || '');

        const elData = document.getElementById('data');
        if (elData && !elData.value) {
            setValue('data', getDataBrasilLocal());
        }

        // 🔧 CORREÇÃO: publica para outras partes do sistema consultarem
        window.dadosSessao = {
            nome: user.nome || '',
            matricula: user.matricula || '',
            perfil: user.perfil || '',
            email: user.email || ''
        };

        const loading = document.getElementById('loadingOverlay');
        const content = document.getElementById('homeContent');
        if (loading) { loading.style.display = 'none'; loading.classList.remove('active'); }
        if (content) content.style.display = 'block';

        // Renovação automática (local + KV) a cada 5 min
        setInterval(async () => {
            if (!authService.isLoggedIn()) return;
            authService.renewSession();
            const u = authService.getUserData();
            if (u) authService.registerActiveSession(u);
        }, 5 * 60 * 1000);

        console.log('✅ Página carregada com sucesso!');
    });

    // ============================================
    // FUNÇÃO SAIR (GLOBAL)
    // ============================================
    async function sair() {
        if (redirecting) return;
        if (!confirm('Deseja sair do sistema?')) return;

        redirecting = true;
        console.log('🚪 Saindo...');

        try {
            if (typeof authService !== 'undefined' && authService) {
                await authService.logout();
            } else {
                sessionStorage.clear();
            }
        } catch (error) {
            console.error('❌ Erro ao sair:', error);
            sessionStorage.clear();
        }

        window.location.href = 'login.html';
    }

    window.sair = sair;
})();