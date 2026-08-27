// ============================================
// SCRIPT COMPARTILHADO - FUNÇÕES GLOBAIS
// ============================================

// ============================================
// MAPEAMENTO DE PERFIS PARA PÁGINAS HOME
// ============================================

const HOME_PAGES = {
    'OPERACIONAL': 'home-operacional.html',
    'GESTAO': 'home-gestao.html',
    'VISUALIZACAO': 'home-visualizacao.html'
};

// ============================================
// FUNÇÕES DE NAVEGAÇÃO UNIVERSAL
// ============================================

/**
 * Navega para uma página usando o caminho correto
 * @param {string} page - Nome da página (ex: 'gestao/index.html')
 * @param {Object} params - Parâmetros da URL (opcional)
 */
function navigateTo(page, params = null) {
    // Remove qualquer "../" do início
    let cleanPath = page.replace(/^(\.\.\/)+/g, '');
    
    // Garante que o caminho comece com / (absoluto a partir da raiz)
    if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
    }
    
    // Remove a barra inicial para montar a URL final (sem duplicar)
    let url = cleanPath.substring(1);
    
    // Adiciona parâmetros
    if (params) {
        const queryString = new URLSearchParams(params).toString();
        url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
    }
    
    console.log(`🔀 Navegando para: ${url}`);
    window.location.href = url;
}

/**
 * Volta para a página home baseado no perfil do usuário
 * 🔥 USA O authService EM VEZ DA SESSÃO ANTIGA
 */
function goHome() {
    // Tenta obter o perfil do authService
    let perfil = 'GESTAO';
    try {
        if (typeof authService !== 'undefined' && authService) {
            const user = authService.getUserData();
            if (user && user.perfil) {
                perfil = user.perfil;
            }
        }
    } catch (e) {
        console.warn('⚠️ Erro ao ler perfil:', e);
    }
    
    const homePage = HOME_PAGES[perfil.toUpperCase()] || 'home-gestao.html';
    
    console.log(`🏠 Voltando para home: ${homePage} (Perfil: ${perfil})`);
    navigateTo(homePage);
}

// ============================================
// OUTRAS FUNÇÕES ÚTEIS
// ============================================

/**
 * Redireciona para a home baseado no perfil atual
 * 🔥 USA O authService
 */
function redirecionarParaHome() {
    // 🔥 CORRIGIDO: USA authService EM VEZ DE verificarSessao()
    let perfil = 'GESTAO';
    try {
        if (typeof authService !== 'undefined' && authService) {
            const user = authService.getUserData();
            if (user && user.perfil) {
                perfil = user.perfil;
            }
        }
    } catch (e) {
        console.warn('⚠️ Erro ao obter perfil:', e);
    }
    
    const homePage = HOME_PAGES[perfil.toUpperCase()] || 'home-gestao.html';
    console.log(`🏠 Redirecionando para home: ${homePage} (Perfil: ${perfil})`);
    navigateTo(homePage);
}

/**
 * Obtém o perfil do usuário logado
 * 🔥 USA O authService
 */
function getPerfilAtual() {
    try {
        if (typeof authService !== 'undefined' && authService) {
            const user = authService.getUserData();
            return user ? user.perfil : null;
        }
    } catch (e) {
        console.warn('⚠️ Erro ao obter perfil:', e);
    }
    return null;
}

/**
 * Obtém a página home baseada no perfil
 */
function getHomePageAtual() {
    const perfil = getPerfilAtual();
    if (!perfil) return 'login.html';
    return HOME_PAGES[perfil.toUpperCase()] || 'login.html';
}

/**
 * Obtém a página home para um perfil específico
 */
function getPaginaHomePorPerfil(perfil) {
    const perfilNormalizado = perfil.toUpperCase().trim();
    return HOME_PAGES[perfilNormalizado] || 'login.html';
}

/**
 * Cria botão "Voltar ao Início" estilizado
 */
function criarBotaoVoltarHome(estilo = 'padrao') {
    const botao = document.createElement('button');
    botao.innerHTML = '🏠 Voltar ao Início';
    botao.onclick = goHome;
    botao.className = 'btn-voltar-home';
    
    const estilos = {
        'padrao': {
            background: '#4299E1',
            color: 'white',
            border: 'none',
            padding: '10px 25px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            margin: '10px 0'
        },
        'pequeno': {
            background: '#4299E1',
            color: 'white',
            border: 'none',
            padding: '6px 15px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '12px',
            transition: 'all 0.3s ease',
            margin: '5px 0'
        },
        'outline': {
            background: 'transparent',
            color: '#4299E1',
            border: '2px solid #4299E1',
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            margin: '10px 0'
        }
    };
    
    const estiloEscolhido = estilos[estilo] || estilos.padrao;
    Object.assign(botao.style, estiloEscolhido);
    
    botao.onmouseover = function() {
        if (estilo === 'outline') {
            this.style.background = '#4299E1';
            this.style.color = 'white';
        } else {
            this.style.background = '#3182CE';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 12px rgba(66, 153, 225, 0.3)';
        }
    };
    
    botao.onmouseout = function() {
        if (estilo === 'outline') {
            this.style.background = 'transparent';
            this.style.color = '#4299E1';
        } else {
            this.style.background = estiloEscolhido.background;
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = 'none';
        }
    };
    
    return botao;
}

/**
 * Verifica acesso baseado no perfil
 * 🔥 USA O authService
 */
function verificarAcesso(perfilRequerido) {
    try {
        if (typeof authService === 'undefined' || !authService) {
            console.log('🔒 authService não disponível');
            navigateTo('login.html');
            return null;
        }
        
        if (!authService.isLoggedIn()) {
            console.log('🔒 Usuário não logado');
            navigateTo('login.html');
            return null;
        }
        
        const user = authService.getUserData();
        if (!user) {
            console.log('🔒 Dados do usuário não encontrados');
            navigateTo('login.html');
            return null;
        }
        
        if (perfilRequerido && user.perfil !== perfilRequerido) {
            console.log(`🔒 Perfil ${user.perfil} não autorizado (requer ${perfilRequerido})`);
            navigateTo('login.html');
            return null;
        }
        
        return user;
    } catch (e) {
        console.error('❌ Erro ao verificar acesso:', e);
        navigateTo('login.html');
        return null;
    }
}

// ============================================
// FUNÇÕES GLOBAIS EXPORTADAS
// ============================================

// 🔥 EXPORTA APENAS FUNÇÕES QUE NÃO CONFLITAM COM auth-service
window.navigateTo = navigateTo;
window.goHome = goHome;
window.redirecionarParaHome = redirecionarParaHome;
window.getPerfilAtual = getPerfilAtual;
window.getHomePageAtual = getHomePageAtual;
window.criarBotaoVoltarHome = criarBotaoVoltarHome;
window.getPaginaHomePorPerfil = getPaginaHomePorPerfil;
window.verificarAcesso = verificarAcesso;

// ⚠️ REMOVIDAS: verificarSessao, criarSessao, logout (usar authService)

console.log('📦 script.js carregado com sucesso! (sem conflitos de sessão)');

// ============================================
// INICIALIZAÇÃO - REMOVIDA PARA EVITAR CONFLITO
// ============================================
// 🔥 A verificação de sessão agora é feita APENAS pelo auth-global.js