// ============================================
// AUTH-GLOBAL.JS - v4 (KV COMO FONTE DA VERDADE)
// ============================================

let redirecting = false;

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
        window.location.href = 'login.html';
        return;
    }

    console.log(`✅ Sessão válida: ${user.nome} (${user.perfil})`);

    // Preenche UI
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('nomeUsuario', user.nome);
    set('matriculaUsuario', `Matrícula: ${user.matricula}`);
    set('perfilUsuario', user.perfil);
    set('mensagemBoasVindas', `👋 Olá, ${user.nome}!`);

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