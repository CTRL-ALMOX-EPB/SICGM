// ============================================
// AUTH-GLOBAL.JS - VERIFICA SESSÃO
// ============================================

let sessionVerified = false;

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🔐 Iniciando verificação de autenticação...');
    
    // ============================================
    // FUNÇÃO PRINCIPAL: VERIFICAR E ACESSAR
    // ============================================
    function verificarEAcessar() {
        // 🔥 SE JÁ VERIFICOU, NÃO REPETIR
        if (sessionVerified) {
            console.log('⏹️ Sessão já verificada anteriormente');
            return;
        }
        
        // 🔥 VERIFICAR SE O authService EXISTE
        if (typeof authService === 'undefined' || !authService) {
            console.warn('⏳ Aguardando authService carregar...');
            setTimeout(verificarEAcessar, 300);
            return;
        }
        
        // 🔥 VERIFICAR SE ESTÁ LOGADO
        if (!authService.isLoggedIn()) {
            console.log('🔒 Sessão inválida - Redirecionando para login');
            window.location.replace('login.html');
            return;
        }
        
        // 🔥 PEGAR DADOS DO USUÁRIO
        const user = authService.getUserData();
        if (!user) {
            console.log('🔒 Dados do usuário não encontrados - Redirecionando');
            window.location.replace('login.html');
            return;
        }
        
        // 🎯 SESSÃO VÁLIDA! CARREGAR A PÁGINA
        sessionVerified = true;
        console.log(`✅ Sessão válida: ${user.nome} (${user.perfil})`);
        
        // Carregar dados do usuário na página
        carregarDadosNaPagina(user);
        
        // Remover loading
        const loading = document.getElementById('loadingOverlay');
        const content = document.getElementById('homeContent');
        if (loading) {
            loading.classList.remove('active');
            loading.style.display = 'none';
        }
        if (content) {
            content.style.display = 'block';
        }
        
        // Iniciar timer (opcional)
        const timer = document.getElementById('sessionTimer');
        if (timer) {
            iniciarTimer(timer, user.exp);
        }
    }
    
    // ============================================
    // CARREGAR DADOS NA PÁGINA
    // ============================================
    function carregarDadosNaPagina(user) {
        const nome = document.getElementById('nomeUsuario');
        const matricula = document.getElementById('matriculaUsuario');
        const perfil = document.getElementById('perfilUsuario');
        const mensagem = document.getElementById('mensagemBoasVindas');
        
        if (nome) nome.textContent = user.nome;
        if (matricula) matricula.textContent = `Matrícula: ${user.matricula}`;
        if (perfil) perfil.textContent = user.perfil;
        if (mensagem) mensagem.textContent = `👋 Olá, ${user.nome}!`;
        
        console.log('📋 Dados carregados na página');
    }
    
    // ============================================
    // TIMER DA SESSÃO
    // ============================================
    function iniciarTimer(element, expiracao) {
        function update() {
            const restante = Math.max(0, Math.floor((expiracao - Date.now()) / 60000));
            element.textContent = `${restante} minuto${restante !== 1 ? 's' : ''}`;
            
            if (restante === 0) {
                clearInterval(interval);
                console.log('⏰ Sessão expirou!');
            }
        }
        update();
        const interval = setInterval(update, 60000);
    }
    
    // ============================================
    // VERIFICAR PERIODICAMENTE (A CADA 30 SEGUNDOS)
    // ============================================
    setInterval(() => {
        if (sessionVerified) return;
        
        if (typeof authService !== 'undefined' && authService) {
            if (!authService.isLoggedIn()) {
                console.log('🔒 Sessão expirada - Redirecionando');
                window.location.replace('login.html');
            }
        }
    }, 30000);
    
    // ============================================
    // INICIAR VERIFICAÇÃO
    // ============================================
    setTimeout(verificarEAcessar, 500);
    
    console.log('🔐 Sistema de autenticação pronto');
});

// ============================================
// 🔥 FUNÇÃO SAIR - IGUAL AO ADMIN (FUNCIONA!)
// ============================================
async function sair() {
    if (!confirm('Deseja sair do sistema?')) return;
    
    console.log('🚪 Saindo do sistema...');
    
    try {
        // 🔥 1. USAR authService.logout() QUE REMOVE DO KV
        if (typeof authService !== 'undefined' && authService) {
            await authService.logout();
            console.log('✅ Logout via authService concluído');
        } else {
            // Fallback: limpar manualmente
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('session_expiry');
            console.log('✅ sessionStorage limpo (fallback)');
        }
        
        // 🔥 2. RESETAR VARIÁVEL
        sessionVerified = false;
        
        // 🔥 3. REDIRECIONAR PARA LOGIN
        console.log('🔀 Redirecionando para login...');
        window.location.replace('login.html');
        
    } catch (error) {
        console.error('❌ Erro ao sair:', error);
        // 🔥 EM CASO DE ERRO, LIMPAR E REDIRECIONAR MESMO ASSIM
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('session_expiry');
        sessionVerified = false;
        window.location.replace('login.html');
    }
}