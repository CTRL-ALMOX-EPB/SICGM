// ============================================
// SCRIPT COMPARTILHADO - GERENCIAMENTO DE SESSÃO
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
// FUNÇÕES DE NAVEGAÇÃO UNIVERSAL (CORRIGIDAS)
// ============================================

/**
 * Navega para uma página usando o caminho correto
 * @param {string} page - Nome da página (ex: 'home-gestao.html')
 * @param {Object} params - Parâmetros da URL (opcional)
 */
function navigateTo(page, params = null) {
    // Remove qualquer "../" do início
    let cleanPath = page.replace(/^(\.\.\/)+/g, '');
    
    // Remove barras duplicadas
    cleanPath = cleanPath.replace(/\/\//g, '/');
    
    // Se CONFIG estiver disponível, usa a função dele
    if (typeof CONFIG !== 'undefined' && CONFIG && typeof CONFIG.getPageUrl === 'function') {
        const url = CONFIG.getPageUrl(cleanPath);
        
        // Adiciona parâmetros
        let finalUrl = url;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            finalUrl += url.includes('?') ? `&${queryString}` : `?${queryString}`;
        }
        
        console.log(`🔀 Navegando para: ${finalUrl}`);
        window.location.href = finalUrl;
        return;
    }
    
    // Fallback: navegação manual
    // Se estiver em produção (GitHub Pages), adiciona /SICGM/
    const isProduction = window.location.hostname !== '127.0.0.1' && 
                        window.location.hostname !== 'localhost' &&
                        window.location.hostname !== '0.0.0.0';
    
    // Se a página já começa com /, remove
    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
    }
    
    let url = isProduction ? `/SICGM/${cleanPath}` : cleanPath;
    
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
 */
function goHome() {
    // Tenta obter o perfil da sessão
    let perfil = 'GESTAO';
    try {
        const sessao = sessionStorage.getItem('sessaoSICGM');
        if (sessao) {
            const dados = JSON.parse(sessao);
            perfil = dados.perfil || 'GESTAO';
        }
    } catch (e) {
        console.warn('⚠️ Erro ao ler sessão:', e);
    }
    
    const homePage = HOME_PAGES[perfil.toUpperCase()] || 'home-gestao.html';
    
    console.log(`🏠 Voltando para home: ${homePage} (Perfil: ${perfil})`);
    
    // Usa navigateTo com a página limpa
    navigateTo(homePage);
}

// ============================================
// FUNÇÕES DE GERENCIAMENTO DE SESSÃO
// ============================================

/**
 * Cria sessão para o usuário
 */
function criarSessao(usuario) {
    const sessao = {
        matricula: usuario.matricula,
        nome: usuario.nome,
        cpf: usuario.cpf,
        perfil: usuario.perfil || 'OPERACIONAL',
        timestamp: Date.now()
    };
    sessionStorage.setItem('sessaoSICGM', JSON.stringify(sessao));
    console.log('✅ Sessão criada:', sessao);
}

/**
 * Verifica se a sessão atual é válida
 */
function verificarSessao() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (!sessao) return null;
    
    try {
        const dados = JSON.parse(sessao);
        const tempoDecorrido = Date.now() - dados.timestamp;
        if (tempoDecorrido > 30 * 60 * 1000) {
            sessionStorage.removeItem('sessaoSICGM');
            console.log('⏰ Sessão expirada');
            return null;
        }
        return dados;
    } catch (e) {
        console.error('❌ Erro ao verificar sessão:', e);
        return null;
    }
}

/**
 * Faz logout
 */
function logout() {
    sessionStorage.removeItem('sessaoSICGM');
    navigateTo('login.html');
}

/**
 * Redireciona para a página home conforme o perfil
 */
function redirecionarPorPerfil(perfil) {
    const perfilNormalizado = perfil.toUpperCase().trim();
    const homePage = HOME_PAGES[perfilNormalizado] || 'login.html';
    navigateTo(homePage);
}

/**
 * Redireciona para a home baseado no perfil atual
 */
function redirecionarParaHome() {
    goHome();
}

// ============================================
// OUTRAS FUNÇÕES
// ============================================

function getPerfilAtual() {
    const sessao = verificarSessao();
    return sessao ? sessao.perfil : null;
}

function getHomePageAtual() {
    const sessao = verificarSessao();
    if (!sessao) return 'login.html';
    const perfilNormalizado = sessao.perfil.toUpperCase().trim();
    return HOME_PAGES[perfilNormalizado] || 'login.html';
}

function getPaginaHomePorPerfil(perfil) {
    const perfilNormalizado = perfil.toUpperCase().trim();
    return HOME_PAGES[perfilNormalizado] || 'login.html';
}

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

function verificarAcesso(perfilRequerido) {
    const sessao = verificarSessao();
    
    if (!sessao) {
        navigateTo('login.html');
        return null;
    }
    
    if (perfilRequerido && sessao.perfil !== perfilRequerido) {
        console.log(`🔒 Perfil ${sessao.perfil} não autorizado`);
        navigateTo('login.html');
        return null;
    }
    
    return sessao;
}

// ============================================
// FUNÇÕES GLOBAIS EXPORTADAS
// ============================================

window.verificarSessao = verificarSessao;
window.criarSessao = criarSessao;
window.logout = logout;
window.sair = logout;
window.redirecionarPorPerfil = redirecionarPorPerfil;
window.redirecionarParaHome = redirecionarParaHome;
window.goHome = goHome;
window.navigateTo = navigateTo;
window.getPerfilAtual = getPerfilAtual;
window.getHomePageAtual = getHomePageAtual;
window.criarBotaoVoltarHome = criarBotaoVoltarHome;
window.getPaginaHomePorPerfil = getPaginaHomePorPerfil;
window.verificarAcesso = verificarAcesso;

console.log('📦 script.js carregado com sucesso!');

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const isHomePage = document.getElementById('homeContent') !== null;
    
    if (isHomePage) {
        const sessao = verificarSessao();
        if (!sessao) {
            console.log('🔒 Sessão inválida - Redirecionando para login');
            navigateTo('login.html');
        } else {
            console.log('✅ Sessão válida para:', sessao.nome);
        }
    }
});