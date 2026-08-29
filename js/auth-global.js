// ============================================
// AUTH-GLOBAL.JS - VERIFICA SESSÃO (COM PREVENÇÃO DE LOOP)
// ============================================

// Flag para evitar múltiplos redirecionamentos
let redirecting = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Verificando autenticação...');
    
    // Verificar se authService existe
    if (typeof authService === 'undefined' || !authService) {
        console.error('❌ authService não encontrado!');
        return;
    }
    
    // Verificar sessão
    if (!authService.isLoggedIn()) {
        console.log('🔒 Sessão inválida - Redirecionando para login');
        window.location.href = 'login.html';
        return;
    }
    
    // Pegar dados do usuário
    const user = authService.getUserData();
    if (!user) {
        console.log('🔒 Dados do usuário não encontrados');
        window.location.href = 'login.html';
        return;
    }
    
    // Sessão válida
    console.log(`✅ Sessão válida: ${user.nome} (${user.perfil})`);
    
    // Carregar dados na página
    const nome = document.getElementById('nomeUsuario');
    const matricula = document.getElementById('matriculaUsuario');
    const perfil = document.getElementById('perfilUsuario');
    const mensagem = document.getElementById('mensagemBoasVindas');
    
    if (nome) nome.textContent = user.nome;
    if (matricula) matricula.textContent = `Matrícula: ${user.matricula}`;
    if (perfil) perfil.textContent = user.perfil;
    if (mensagem) mensagem.textContent = `👋 Olá, ${user.nome}!`;
    
    // Remover loading
    const loading = document.getElementById('loadingOverlay');
    const content = document.getElementById('homeContent');
    if (loading) {
        loading.style.display = 'none';
        loading.classList.remove('active');
    }
    if (content) {
        content.style.display = 'block';
    }
    
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
        window.location.href = 'login.html';
    } catch (error) {
        console.error('❌ Erro ao sair:', error);
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}