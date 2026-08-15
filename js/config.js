// ============================================
// CONFIGURAÇÃO GLOBAL DO SISTEMA
// ============================================

const CONFIG = {
    // Detecta automaticamente o ambiente
    isDevelopment: (() => {
        const hostname = window.location.hostname;
        const port = window.location.port;
        
        // Live Server, localhost ou qualquer ambiente de desenvolvimento
        return hostname === '127.0.0.1' || 
               hostname === 'localhost' ||
               hostname === '0.0.0.0' ||
               port === '5500' || // Porta padrão do Live Server
               port === '5501' || // Porta alternativa do Live Server
               port === '3000' || // Porta comum para dev
               port === '8080';   // Outra porta comum
    })(),
    
    // Obtém o caminho base para os arquivos
    getBasePath: function() {
        return this.isDevelopment ? '' : '/SICGM';
    },
    
    // Obtém a URL completa para um arquivo de dados
    getDataUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/data/${cleanFilename}` : `data/${cleanFilename}`;
    },
    
    // Obtém a URL completa para um arquivo CSS
    getCssUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/css/${cleanFilename}` : `css/${cleanFilename}`;
    },
    
    // Obtém a URL completa para um arquivo JS
    getJsUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/js/${cleanFilename}` : `js/${cleanFilename}`;
    },
    
    // Obtém a URL completa para uma imagem
    getImgUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/assets/img/${cleanFilename}` : `assets/img/${cleanFilename}`;
    },
    
    // Obtém a URL completa para uma página HTML
    getPageUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        
        // Remove qualquer "../" do início para evitar navegação relativa
        const cleanPath = cleanFilename.replace(/^(\.\.\/)+/, '');
        
        // Se for uma página na raiz ou em subpasta
        return basePath ? `${basePath}/${cleanPath}` : cleanPath;
    },
    
    // ============================================
    // NOVA FUNÇÃO: Navegação universal
    // ============================================
    navigateTo: function(page, params = null) {
        // Obtém a URL completa
        let url = this.getPageUrl(page);
        
        // Adiciona parâmetros se fornecidos
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
        }
        
        console.log(`🔀 Navegando para: ${url}`);
        
        // Navega para a URL
        window.location.href = url;
    },
    
    // ============================================
    // NOVA FUNÇÃO: Voltar para Home com segurança
    // ============================================
    goHome: function() {
        // Tenta obter a sessão para saber o perfil
        let perfil = 'GESTAO'; // Perfil padrão
        
        try {
            const sessao = sessionStorage.getItem('sessaoSICGM');
            if (sessao) {
                const dados = JSON.parse(sessao);
                perfil = dados.perfil || 'GESTAO';
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível obter o perfil da sessão, usando padrão');
        }
        
        // Mapeamento de perfis para páginas
        const HOME_PAGES = {
            'OPERACIONAL': 'home-operacional.html',
            'GESTAO': 'home-gestao.html',
            'VISUALIZACAO': 'home-visualizacao.html'
        };
        
        const homePage = HOME_PAGES[perfil.toUpperCase()] || 'home-gestao.html';
        
        console.log(`🏠 Voltando para home: ${homePage} (Perfil: ${perfil})`);
        
        // Usa a navegação universal
        this.navigateTo(homePage);
    }
};

// Expõe para uso global
window.CONFIG = CONFIG;

// Log para debug
console.log(`🌍 Ambiente: ${CONFIG.isDevelopment ? 'DESENVOLVIMENTO (Local)' : 'PRODUÇÃO'}`);
console.log(`📁 Base Path: ${CONFIG.getBasePath() || '/'}`);
console.log(`🔧 CONFIG carregado com sucesso!`);
console.log(`📋 Métodos disponíveis:`, Object.keys(CONFIG).filter(key => typeof CONFIG[key] === 'function'));