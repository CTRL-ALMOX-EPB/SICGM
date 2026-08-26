// ============================================
// AUTH-GLOBAL.JS - VERIFICA SESSÃO EM TODAS AS PÁGINAS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🔐 Iniciando autenticação global...');
    
    // ============================================
    // 1. VERIFICAR SE ESTÁ LOGADO
    // ============================================
    function verificarSessao() {
        // 🔥 VERIFICAR SE O authService ESTÁ DISPONÍVEL
        if (typeof authService === 'undefined') {
            console.warn('⏳ Aguardando authService carregar...');
            return false;
        }
        
        // 🔥 VERIFICAR SE ESTÁ LOGADO
        if (!authService.isLoggedIn()) {
            console.log('🔒 Não autenticado - Redirecionando para login');
            window.location.href = 'login.html';
            return false;
        }

        try {
            const payload = authService.getUserData();
            
            if (!payload) {
                console.log('🔒 Sessão inválida - Redirecionando para login');
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('session_expiry');
                window.location.href = 'login.html';
                return false;
            }

            console.log(`✅ Sessão válida: ${payload.nome} (${payload.perfil})`);
            return payload;
            
        } catch (e) {
            console.error('❌ Erro ao verificar sessão:', e);
            window.location.href = 'login.html';
            return false;
        }
    }

    // ============================================
    // 2. CARREGAR DADOS DO USUÁRIO
    // ============================================
    function carregarDadosUsuario() {
        // 🔥 ESPERAR O authService CARREGAR
        if (typeof authService === 'undefined') {
            console.warn('⏳ Aguardando authService carregar...');
            // Tentar novamente em 500ms
            setTimeout(carregarDadosUsuario, 500);
            return;
        }
        
        const user = verificarSessao();
        if (!user) return;

        // Preencher elementos da página
        const nomeUsuario = document.getElementById('nomeUsuario');
        const matriculaUsuario = document.getElementById('matriculaUsuario');
        const perfilUsuario = document.getElementById('perfilUsuario');
        const mensagemBoasVindas = document.getElementById('mensagemBoasVindas');

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
        if (typeof authService !== 'undefined') {
            if (!authService.isLoggedIn()) {
                console.log('🔒 Sessão expirada - Redirecionando');
                window.location.href = 'login.html';
            }
        }
    }, 30000);

    // ============================================
    // 5. CARREGAR TUDO
    // ============================================
    // 🔥 USAR setTimeout PARA GARANTIR QUE O authService CARREGOU
    setTimeout(function() {
        carregarDadosUsuario();
    }, 300);

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
        
        window.location.href = 'login.html';
        
    } catch (error) {
        console.error('Erro ao sair:', error);
        alert('Erro ao sair. Tente novamente.');
    }
}