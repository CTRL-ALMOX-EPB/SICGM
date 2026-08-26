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
    // NAVEGAÇÃO UNIVERSAL
    // ============================================
    navigateTo: function(page, params = null) {
        let url = this.getPageUrl(page);
        
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
        }
        
        console.log(`🔀 Navegando para: ${url}`);
        window.location.href = url;
    },
    
    // ============================================
    // VOLTAR PARA HOME (USANDO authService)
    // ============================================
    goHome: function() {
        let perfil = 'GESTAO'; // Perfil padrão
        
        try {
            // 🔥 USA O authService EM VEZ DA SESSÃO ANTIGA
            if (typeof authService !== 'undefined' && authService) {
                const user = authService.getUserData();
                if (user && user.perfil) {
                    perfil = user.perfil;
                } else {
                    // Se não conseguir pelo authService, tenta o token direto
                    const token = sessionStorage.getItem('auth_token');
                    if (token) {
                        const payload = JSON.parse(atob(token));
                        if (payload && payload.perfil) {
                            perfil = payload.perfil;
                        }
                    }
                }
            } else {
                // Fallback: tentar ler do token diretamente
                const token = sessionStorage.getItem('auth_token');
                if (token) {
                    const payload = JSON.parse(atob(token));
                    if (payload && payload.perfil) {
                        perfil = payload.perfil;
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível obter o perfil, usando padrão:', e);
        }
        
        // Mapeamento de perfis para páginas
        const HOME_PAGES = {
            'OPERACIONAL': 'home-operacional.html',
            'GESTAO': 'home-gestao.html',
            'VISUALIZACAO': 'home-visualizacao.html'
        };
        
        const homePage = HOME_PAGES[perfil.toUpperCase()] || 'home-gestao.html';
        
        console.log(`🏠 Voltando para home: ${homePage} (Perfil: ${perfil})`);
        this.navigateTo(homePage);
    },
    
    // ============================================
    // VERIFICAR SE ESTÁ LOGADO (USANDO authService)
    // ============================================
    isLoggedIn: function() {
        try {
            if (typeof authService !== 'undefined' && authService) {
                return authService.isLoggedIn();
            }
            // Fallback: verificar token diretamente
            const token = sessionStorage.getItem('auth_token');
            if (!token) return false;
            
            const payload = JSON.parse(atob(token));
            if (!payload || !payload.exp) return false;
            
            if (payload.exp < Date.now()) {
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('session_expiry');
                return false;
            }
            
            return true;
        } catch (e) {
            return false;
        }
    },
    
    // ============================================
    // OBTER DADOS DO USUÁRIO (USANDO authService)
    // ============================================
    getUserData: function() {
        try {
            if (typeof authService !== 'undefined' && authService) {
                return authService.getUserData();
            }
            // Fallback: ler do token diretamente
            const token = sessionStorage.getItem('auth_token');
            if (!token) return null;
            
            const payload = JSON.parse(atob(token));
            if (!payload || !payload.exp) return null;
            
            if (payload.exp < Date.now()) {
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('session_expiry');
                return null;
            }
            
            return payload;
        } catch (e) {
            return null;
        }
    }
};

// Expõe para uso global
window.CONFIG = CONFIG;

// Log para debug
console.log(`🌍 Ambiente: ${CONFIG.isDevelopment ? 'DESENVOLVIMENTO (Local)' : 'PRODUÇÃO'}`);
console.log(`📁 Base Path: ${CONFIG.getBasePath() || '/'}`);
console.log(`🔧 CONFIG carregado com sucesso!`);
console.log(`📋 Métodos disponíveis:`, Object.keys(CONFIG).filter(key => typeof CONFIG[key] === 'function'));