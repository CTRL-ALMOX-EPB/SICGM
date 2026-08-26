// ============================================
// ADMIN.JS - PAINEL DE ADMINISTRAÇÃO
// ============================================

let dadosCache = null;
let intervaloAutoRefresh = null;

// ============================================
// VERIFICAR ACESSO ADMIN
// ============================================
function verificarAcessoAdmin() {
    if (typeof authService === 'undefined') {
        console.error('❌ authService não encontrado');
        window.location.href = '../login.html';
        return false;
    }
    
    if (!authService.isLoggedIn()) {
        alert('🔒 Você precisa estar logado para acessar o admin.');
        window.location.href = '../login.html';
        return false;
    }
    
    const user = authService.getUserData();
    if (!user || user.perfil !== 'GESTAO') {
        alert('🔒 Apenas usuários GESTAO podem acessar o admin.');
        window.location.href = '../home-gestao.html';
        return false;
    }
    
    return true;
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarDados() {
    if (!verificarAcessoAdmin()) return;
    
    const loading = document.getElementById('loading');
    const conteudo = document.getElementById('conteudo');
    
    if (loading) loading.style.display = 'block';
    if (conteudo) conteudo.style.display = 'none';
    
    try {
        // Buscar todos os usuários
        const todos = await authService.listUsers();
        dadosCache = todos;
        
        // Buscar usuários online
        const online = await authService.getActiveSessions();
        
        // Renderizar
        renderizarStats(todos, online);
        renderizarUsuarios(todos);
        renderizarOnline(online);
        
        // Atualizar badges
        const badgeTotal = document.getElementById('badgeTotal');
        const badgeOnline = document.getElementById('badgeOnline');
        if (badgeTotal) badgeTotal.textContent = todos.stats.total;
        if (badgeOnline) badgeOnline.textContent = online.total_ativos || 0;
        
        if (loading) loading.style.display = 'none';
        if (conteudo) conteudo.style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar:', error);
        
        if (loading) {
            if (error.message && error.message.includes('Acesso negado')) {
                loading.innerHTML = '🔒 Acesso negado. Apenas usuários GESTAO podem acessar esta página.';
            } else {
                loading.innerHTML = `❌ Erro ao carregar: ${error.message}`;
            }
        }
    }
}

// ============================================
// RENDERIZAR ESTATÍSTICAS
// ============================================
function renderizarStats(todos, online) {
    const elTotal = document.getElementById('totalUsers');
    const elActive = document.getElementById('activeUsers');
    const elInactive = document.getElementById('inactiveUsers');
    const elOnline = document.getElementById('onlineUsers');
    
    if (elTotal) elTotal.textContent = todos.stats.total;
    if (elActive) elActive.textContent = todos.stats.ativos;
    if (elInactive) elInactive.textContent = todos.stats.inativos;
    if (elOnline) elOnline.textContent = online.total_ativos || 0;
}

// ============================================
// RENDERIZAR USUÁRIOS
// ============================================
function renderizarUsuarios(todos) {
    const container = document.getElementById('allUsersList');
    
    if (!container) return;
    
    if (!todos.usuarios || todos.usuarios.length === 0) {
        container.innerHTML = '<p style="color: #718096; padding: 10px;">Nenhum usuário encontrado.</p>';
        return;
    }
    
    let html = '';
    todos.usuarios.forEach(user => {
        const statusClass = user.ativo ? 'status-ativo' : 'status-inativo';
        const statusText = user.ativo ? '✅ Ativo' : '❌ Inativo';
        const perfilClass = `perfil-${user.perfil || 'OPERACIONAL'}`;
        
        html += `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-name">
                        ${user.nome}
                        <span class="user-perfil ${perfilClass}">${user.perfil || 'N/D'}</span>
                    </div>
                    <div class="user-email">${user.email}</div>
                </div>
                <div>
                    <span class="${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// RENDERIZAR ONLINE
// ============================================
function renderizarOnline(online) {
    const container = document.getElementById('onlineUsersList');
    
    if (!container) return;
    
    if (!online.usuarios || online.usuarios.length === 0) {
        container.innerHTML = '<p style="color: #718096; padding: 10px;">Nenhum usuário online no momento.</p>';
        return;
    }
    
    let html = '';
    online.usuarios.forEach(user => {
        const perfilClass = `perfil-${user.perfil || 'OPERACIONAL'}`;
        
        html += `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-name">
                        ${user.nome}
                        <span class="user-perfil ${perfilClass}">${user.perfil || 'N/D'}</span>
                    </div>
                    <div class="user-email">${user.email}</div>
                    <div style="font-size: 11px; color: #718096; margin-top: 2px;">
                        ⏰ Expira: ${user.expira_em || 'N/A'}
                    </div>
                </div>
                <div>
                    <span class="status-ativo">🟢 Online</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// REVOGAR USUÁRIO
// ============================================
async function revogarUsuario() {
    const input = document.getElementById('revokeEmail');
    const mensagem = document.getElementById('mensagemRevogar');
    
    if (!input || !mensagem) return;
    
    const email = input.value.trim();
    
    if (!email) {
        mensagem.className = 'mensagem mensagem-erro';
        mensagem.textContent = '⚠️ Digite um e-mail válido.';
        return;
    }
    
    if (!confirm(`Tem certeza que quer revogar acesso de ${email}?`)) return;
    
    try {
        const result = await authService.revokeUser(email);
        mensagem.className = 'mensagem mensagem-sucesso';
        mensagem.textContent = `✅ ${result.message}`;
        input.value = '';
        carregarDados();
    } catch (error) {
        mensagem.className = 'mensagem mensagem-erro';
        mensagem.textContent = `❌ ${error.message}`;
    }
}

// ============================================
// REATIVAR USUÁRIO
// ============================================
async function reativarUsuario() {
    const input = document.getElementById('reactivateEmail');
    const mensagem = document.getElementById('mensagemReativar');
    
    if (!input || !mensagem) return;
    
    const email = input.value.trim();
    
    if (!email) {
        mensagem.className = 'mensagem mensagem-erro';
        mensagem.textContent = '⚠️ Digite um e-mail válido.';
        return;
    }
    
    if (!confirm(`Tem certeza que quer reativar acesso de ${email}?`)) return;
    
    try {
        const result = await authService.reactivateUser(email);
        mensagem.className = 'mensagem mensagem-sucesso';
        mensagem.textContent = `✅ ${result.message}`;
        input.value = '';
        carregarDados();
    } catch (error) {
        mensagem.className = 'mensagem mensagem-erro';
        mensagem.textContent = `❌ ${error.message}`;
    }
}

// ============================================
// SAIR
// ============================================
async function sair() {
    if (!confirm('Deseja sair do sistema?')) return;
    
    try {
        if (typeof authService !== 'undefined') {
            await authService.logout();
        } else {
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('session_expiry');
        }
        window.location.href = '../login.html';
    } catch (error) {
        console.error('Erro ao sair:', error);
        alert('Erro ao sair. Tente novamente.');
    }
}

// ============================================
// INICIAR
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('👑 Painel Admin iniciado');
    
    if (verificarAcessoAdmin()) {
        carregarDados();
        
        // Auto-atualizar a cada 30 segundos
        if (intervaloAutoRefresh) {
            clearInterval(intervaloAutoRefresh);
        }
        intervaloAutoRefresh = setInterval(carregarDados, 30000);
        
        // Verificar sessão a cada 30 segundos
        setInterval(() => {
            if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
                window.location.href = '../login.html';
            }
        }, 30000);
    }
});