// ============================================
// AUTH-GLOBAL.JS - VERIFICA SESSÃO EM TODAS AS PÁGINAS
// ============================================

// 🔥 VARIÁVEL PARA CONTROLAR O REDIRECIONAMENTO
let isRedirecting = false;
let verificado = false;

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🔐 Iniciando autenticação global...');
    
    // ============================================
    // 1. FUNÇÃO PARA VERIFICAR SESSÃO
    // ============================================
    function verificarSessao() {
        // 🔥 VERIFICAR SE O authService ESTÁ DISPONÍVEL
        if (typeof authService === 'undefined') {
            console.warn('⏳ Aguardando authService carregar...');
            return false;
        }
        
        // 🔥 VERIFICAR SE ESTÁ LOGADO
        if (!authService.isLoggedIn()) {
            console.log('🔒 Não autenticado');
            return false;
        }

        try {
            const payload = authService.getUserData();
            
            if (!payload) {
                console.log('🔒 Sessão inválida');
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('session_expiry');
                return false;
            }

            console.log(`✅ Sessão válida: ${payload.nome} (${payload.perfil})`);
            return payload;
            
        } catch (e) {
            console.error('❌ Erro ao verificar sessão:', e);
            return false;
        }
    }

    // ============================================
    // 2. CARREGAR DADOS DO USUÁRIO
    // ============================================
    function carregarDadosUsuario() {
        // 🔥 SE JÁ ESTÁ REDIRECIONANDO, PARAR
        if (isRedirecting) {
            console.log('⏹️ Redirecionamento em andamento, cancelando...');
            return;
        }
        
        // 🔥 SE JÁ VERIFICOU, NÃO VERIFICAR NOVAMENTE
        if (verificado) {
            console.log('⏹️ Já verificado, ignorando...');
            return;
        }
        
        // 🔥 ESPERAR O authService CARREGAR
        if (typeof authService === 'undefined') {
            console.warn('⏳ Aguardando authService carregar...');
            setTimeout(carregarDadosUsuario, 500);
            return;
        }
        
        const user = verificarSessao();
        
        // 🔥 SE NÃO TIVER SESSÃO, REDIRECIONAR
        if (!user) {
            console.log('🔒 Sessão inválida - Redirecionando para login');
            if (!isRedirecting) {
                isRedirecting = true;
                verificado = true;
                console.log('🔀 Navegando para: login.html');
                window.location.href = 'login.html';
            }
            return;
        }

        // 🔥 SE CHEGOU AQUI, SESSÃO VÁLIDA!
        verificado = true;
        
        // Preencher elementos da página
        const nomeUsuario = document.getElementById('nomeUsuario');
        const matriculaUsuario = document.getElementById('matriculaUsuario');
        const perfilUsuario = document.getElementById('perfilUsuario');
        const mensagemBoasVindas = document.getElementById('mensagemBoasVindas');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const homeContent = document.getElementById('homeContent');

        if (nomeUsuario) {
            nomeUsuario.textContent = user.nome;
            console.log(`👤 Nome carregado: ${user.nome}`);
        }
        if (matriculaUsuario) {
            matriculaUsuario.textContent = `Matrícula: ${user.matricula}`;
        }
        if (perfilUsuario) {
            perfilUsuario.textContent = user.perfil;
        }
        if (mensagemBoasVindas) {
            mensagemBoasVindas.textContent = `👋 Olá, ${user.nome}!`;
        }

        // 🔥 REMOVER LOADING E MOSTRAR CONTEÚDO
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
            loadingOverlay.style.display = 'none';
        }
        if (homeContent) {
            homeContent.style.display = 'block';
        }

        // Mostrar timer (opcional)
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            atualizarTimer(timerElement, user.exp);
        }

        return user;
    }

    // ============================================
    // 3. ATUALIZAR TIMER (opcional)
    // ============================================
    function atualizarTimer(element, expiracao) {
        function update() {
            const restante = Math.max(0, Math.floor((expiracao - Date.now()) / 60000));
            element.textContent = `${restante} minuto${restante !== 1 ? 's' : ''}`;
            
            if (restante === 0) {
                clearInterval(interval);
            }
        }
        
        update();
        const interval = setInterval(update, 60000);
    }

    // ============================================
    // 4. VERIFICAR A CADA 30 SEGUNDOS
    // ============================================
    setInterval(() => {
        // 🔥 NÃO VERIFICAR SE JÁ ESTÁ REDIRECIONANDO OU JÁ VERIFICOU
        if (isRedirecting || verificado) return;
        
        if (typeof authService !== 'undefined') {
            if (!authService.isLoggedIn()) {
                console.log('🔒 Sessão expirada - Redirecionando');
                isRedirecting = true;
                verificado = true;
                window.location.href = 'login.html';
            }
        }
    }, 30000);

    // ============================================
    // 5. CARREGAR TUDO (COM DELAY MAIOR)
    // ============================================
    // 🔥 ESPERAR 1 SEGUNDO PARA GARANTIR QUE TUDO CARREGOU
    setTimeout(function() {
        carregarDadosUsuario();
    }, 1000);

    console.log('🔐 Autenticação global carregada');
});

// ============================================
// FUNÇÃO SAIR (global)
// ============================================
async function sair() {
    if (!confirm('Tem certeza que deseja sair?')) return;
    
    try {
        if (typeof authService !== 'undefined' && authService) {
            await authService.logout();
        } else {
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('session_expiry');
        }
        
        // 🔥 RESETAR VARIÁVEIS
        isRedirecting = false;
        verificado = false;
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Erro ao sair:', error);
        alert('Erro ao sair. Tente novamente.');
    }
}