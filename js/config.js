// ============================================
// CONFIG.JS - CONFIGURAÇÃO GLOBAL DO SISTEMA
// ============================================

const CONFIG = {
    isDevelopment: (() => {
        const hostname = window.location.hostname;
        const port = window.location.port;

        return hostname === '127.0.0.1' ||
               hostname === 'localhost' ||
               hostname === '0.0.0.0' ||
               port === '5500' ||
               port === '5501' ||
               port === '3000' ||
               port === '8080';
    })(),

    getBasePath: function() {
        return this.isDevelopment ? '' : '/SICGM';
    },

    getDataUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/data/${cleanFilename}` : `data/${cleanFilename}`;
    },

    getCssUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/css/${cleanFilename}` : `css/${cleanFilename}`;
    },

    getJsUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/js/${cleanFilename}` : `js/${cleanFilename}`;
    },

    getImgUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        return basePath ? `${basePath}/assets/img/${cleanFilename}` : `assets/img/${cleanFilename}`;
    },

    getPageUrl: function(filename) {
        const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
        const basePath = this.getBasePath();
        const cleanPath = cleanFilename.replace(/^(\.\.\/)+/, '');
        return basePath ? `${basePath}/${cleanPath}` : cleanPath;
    },

    navigateTo: function(page, params = null) {
        let url = this.getPageUrl(page);

        if (params) {
            const queryString = new URLSearchParams(params).toString();
            url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
        }

        console.log(`🔀 Navegando para: ${url}`);
        window.location.href = url;
    },

    goHome: function() {
        let perfil = 'GESTAO';

        try {
            if (typeof authService !== 'undefined' && authService) {
                const user = authService.getUserData();
                if (user && user.perfil) {
                    perfil = user.perfil;
                } else {
                    const token = sessionStorage.getItem('auth_token');
                    if (token) {
                        const payload = JSON.parse(atob(token));
                        if (payload && payload.perfil) {
                            perfil = payload.perfil;
                        }
                    }
                }
            } else {
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

        const HOME_PAGES = {
            'OPERACIONAL': 'home-operacional.html',
            'GESTAO': 'home-gestao.html',
            'VISUALIZACAO': 'home-visualizacao.html'
        };

        const homePage = HOME_PAGES[perfil.toUpperCase()] || 'home-gestao.html';

        console.log(`🏠 Voltando para home: ${homePage} (Perfil: ${perfil})`);
        this.navigateTo(homePage);
    },

    isLoggedIn: function() {
        try {
            if (typeof authService !== 'undefined' && authService) {
                return authService.isLoggedIn();
            }
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

    getUserData: function() {
        try {
            if (typeof authService !== 'undefined' && authService) {
                return authService.getUserData();
            }
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

window.CONFIG = CONFIG;

console.log(`🌍 Ambiente: ${CONFIG.isDevelopment ? 'DESENVOLVIMENTO (Local)' : 'PRODUÇÃO'}`);
console.log(`📁 Base Path: ${CONFIG.getBasePath() || '/'}`);
console.log(`🔧 CONFIG carregado com sucesso!`);