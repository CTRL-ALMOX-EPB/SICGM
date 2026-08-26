// ============================================
// AUTH-GLOBAL.JS - VERIFICA SESSÃO EM TODAS AS PÁGINAS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================
    // 1. VERIFICAR SE ESTÁ LOGADO
    // ============================================
    function verificarSessao() {
        const token = sessionStorage.getItem('auth_token');
        if (!token) {
            console.log('🔒 Sem token - Redirecionando para login');
            window.location.href = 'login.html';
            return false;
        }

        try {
            const payload = JSON.parse(atob(token));
            
            if (payload.exp < Date.now()) {
                console.log('⏰ Sessão expirada - Redirecionando para login');
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('session_expiry');
                alert('⏰ Sua sessão expirou. Faça login novamente.');
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
        const user = verificarSessao();
        if (!user) return;

        // Preencher elementos da página
        const nomeUsuario = document.getElementById('nomeUsuario');
        const matriculaUsuario = document.getElementById('matriculaUsuario');
        const perfilUsuario = document.getElementById('perfilUsuario');
        const mensagemBoasVindas = document.getElementById('mensagemBoasVindas');

        if (nomeUsuario) nomeUsuario.textContent = user.nome;
        if (matriculaUsuario) matriculaUsuario.textContent = `Matrícula: ${user.matricula}`;
        if (perfilUsuario) perfilUsuario.textContent = user.perfil;
        if (mensagemBoasVindas) mensagemBoasVindas.textContent = `👋 Olá, ${user.nome}!`;

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
        verificarSessao();
    }, 30000);

    // ============================================
    // 5. CARREGAR TUDO
    // ============================================
    carregarDadosUsuario();

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