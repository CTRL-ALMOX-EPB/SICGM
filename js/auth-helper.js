// ============================================
// AUTH-HELPER.JS - FUNÇÕES AUXILIARES DE AUTENTICAÇÃO
// ============================================

/**
 * Verifica se o usuário está autenticado
 * @returns {Object|null} Dados do usuário ou null
 */
function getUsuarioAutenticado() {
    try {
        if (typeof authService === 'undefined' || !authService) {
            console.warn('⚠️ authService não disponível');
            return null;
        }
        
        if (!authService.isLoggedIn()) {
            console.warn('🔒 Usuário não logado');
            return null;
        }
        
        const user = authService.getUserData();
        if (!user) {
            console.warn('🔒 Dados do usuário não encontrados');
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        return null;
    }
}

/**
 * Verifica se o usuário tem um perfil específico
 * @param {string} perfilRequerido - Perfil necessário (GESTAO, OPERACIONAL, VISUALIZACAO)
 * @param {boolean} redirecionar - Se deve redirecionar para login
 * @returns {Object|null} Dados do usuário ou null
 */
function verificarPerfil(perfilRequerido, redirecionar = true) {
    const user = getUsuarioAutenticado();
    
    if (!user) {
        if (redirecionar) {
            window.location.href = 'login.html';
        }
        return null;
    }
    
    if (perfilRequerido && user.perfil !== perfilRequerido) {
        console.warn(`🔒 Perfil ${user.perfil} não autorizado (requer ${perfilRequerido})`);
        if (redirecionar) {
            const homePages = {
                'GESTAO': 'home-gestao.html',
                'OPERACIONAL': 'home-operacional.html',
                'VISUALIZACAO': 'home-visualizacao.html'
            };
            window.location.href = homePages[user.perfil] || 'login.html';
        }
        return null;
    }
    
    return user;
}

/**
 * Obtém o perfil do usuário atual
 * @returns {string|null} Perfil ou null
 */
function getPerfilAtual() {
    const user = getUsuarioAutenticado();
    return user ? user.perfil : null;
}

/**
 * Obtém o nome do usuário atual
 * @returns {string|null} Nome ou null
 */
function getNomeUsuario() {
    const user = getUsuarioAutenticado();
    return user ? user.nome : null;
}

/**
 * Obtém a matrícula do usuário atual
 * @returns {string|null} Matrícula ou null
 */
function getMatriculaUsuario() {
    const user = getUsuarioAutenticado();
    return user ? user.matricula : null;
}

// 🔥 EXPORTAR FUNÇÕES GLOBAIS
window.getUsuarioAutenticado = getUsuarioAutenticado;
window.verificarPerfil = verificarPerfil;
window.getPerfilAtual = getPerfilAtual;
window.getNomeUsuario = getNomeUsuario;
window.getMatriculaUsuario = getMatriculaUsuario;

console.log('✅ Auth Helper carregado!');