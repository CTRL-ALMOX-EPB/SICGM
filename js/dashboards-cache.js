// ============================================
// DASHBOARDS - SISTEMA DE CACHE COMPLETO
// ============================================

console.log('🚀 dashboards-cache.js carregado!');

// ============================================
// 🔥 VERIFICAR AUTENTICAÇÃO ANTES DE CARREGAR
// ============================================

function verificarAutenticacaoCache() {
    if (typeof authService === 'undefined' || !authService) {
        console.error('❌ authService não disponível');
        window.location.href = '../login.html';
        return false;
    }

    if (!authService.isLoggedIn()) {
        console.error('❌ Usuário não logado');
        window.location.href = '../login.html';
        return false;
    }

    const user = authService.getUserData();
    if (!user) {
        console.error('❌ Dados do usuário não encontrados');
        window.location.href = '../login.html';
        return false;
    }

    console.log(`✅ Autenticado: ${user.nome} (${user.perfil})`);
    return true;
}

if (!verificarAutenticacaoCache()) {
    throw new Error('Autenticação necessária');
}

if (typeof API_URL === 'undefined') {
    var API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';
    console.log('⚠️ API_URL não encontrada, usando fallback:', API_URL);
} else {
    console.log('📡 Usando API_URL existente:', API_URL);
}

const CACHE_VERSION = 'v2';
const CACHE_EXPIRY = 5 * 60 * 1000;

class DashboardCache {
    constructor() {
        this.cache = {};
        this.loading = {};
        this.promises = {};
        this.stats = {
            hits: 0,
            misses: 0,
            totalRequests: 0
        };
        console.log('📊 DashboardCache inicializado');
    }

    async get(endpoint, forceRefresh = false) {
        const cacheKey = `${CACHE_VERSION}:${endpoint}`;
        this.stats.totalRequests++;
        
        if (this.loading[cacheKey]) {
            console.log(`⏳ Aguardando carregamento de ${endpoint}...`);
            return this.promises[cacheKey];
        }
        
        if (!forceRefresh && this.cache[cacheKey]) {
            const cached = this.cache[cacheKey];
            if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
                this.stats.hits++;
                console.log(`✅ Cache válido para ${endpoint} (${cached.data?.length || 0} registros)`);
                return cached.data;
            }
            console.log(`⏰ Cache expirado para ${endpoint}`);
        }
        
        this.stats.misses++;
        
        console.log(`📡 Carregando ${endpoint}...`);
        this.loading[cacheKey] = true;
        
        const promise = this._fetchData(endpoint).then(data => {
            this.cache[cacheKey] = {
                data: data,
                timestamp: Date.now()
            };
            this.loading[cacheKey] = false;
            console.log(`✅ ${endpoint} carregado com sucesso (${data?.length || 0} registros)`);
            console.log(`📊 Estatísticas: Hits=${this.stats.hits}, Misses=${this.stats.misses}, Total=${this.stats.totalRequests}`);
            return data;
        }).catch(error => {
            this.loading[cacheKey] = false;
            console.error(`❌ Erro ao carregar ${endpoint}:`, error);
            
            if (this.cache[cacheKey]) {
                console.log(`⚠️ Usando cache expirado como fallback`);
                return this.cache[cacheKey].data;
            }
            throw error;
        });
        
        this.promises[cacheKey] = promise;
        return promise;
    }

    async _fetchData(endpoint) {
        const url = `${API_URL}${endpoint}`;
        console.log(`🌐 Buscando: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return data.data || [];
    }

    async getWithTimeout(endpoint, timeout = 30000, forceRefresh = false) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout ao carregar ${endpoint}`)), timeout);
        });
        
        try {
            return await Promise.race([
                this.get(endpoint, forceRefresh),
                timeoutPromise
            ]);
        } catch (error) {
            console.error(`❌ Erro ao buscar ${endpoint}:`, error);
            const cacheKey = `${CACHE_VERSION}:${endpoint}`;
            if (this.cache[cacheKey]) {
                console.log(`⚠️ Usando cache fallback para ${endpoint}`);
                return this.cache[cacheKey].data;
            }
            return [];
        }
    }

    async getWithoutTimeout(endpoint, forceRefresh = false) {
        try {
            return await this.get(endpoint, forceRefresh);
        } catch (error) {
            console.error(`❌ Erro ao buscar ${endpoint}:`, error);
            const cacheKey = `${CACHE_VERSION}:${endpoint}`;
            if (this.cache[cacheKey]) {
                console.log(`⚠️ Usando cache fallback para ${endpoint}`);
                return this.cache[cacheKey].data;
            }
            return [];
        }
    }

    clear() {
        console.log('🧹 Limpando cache...');
        this.cache = {};
        this.loading = {};
        this.promises = {};
        this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    }

    invalidate(endpoint) {
        const cacheKey = `${CACHE_VERSION}:${endpoint}`;
        delete this.cache[cacheKey];
        delete this.loading[cacheKey];
        delete this.promises[cacheKey];
        console.log(`🗑️ Cache invalidado para ${endpoint}`);
    }

    getStats() {
        console.log('📊 Estatísticas do Cache:');
        console.log(`   - Hits: ${this.stats.hits}`);
        console.log(`   - Misses: ${this.stats.misses}`);
        console.log(`   - Total: ${this.stats.totalRequests}`);
        console.log(`   - Hit Rate: ${this.stats.totalRequests > 0 ? Math.round((this.stats.hits / this.stats.totalRequests) * 100) : 0}%`);
        return this.stats;
    }
}

const dashboardCache = new DashboardCache();

async function buscarAditivosSistemicosCompleto(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/aditivo-sistemico-completo', 30000, forceRefresh);
}

async function buscarAditivosFisicosCompleto(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/aditivo-fisico-completo', 30000, forceRefresh);
}

async function buscarFarolObrasCompleto(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/farol-obras-completo', 30000, forceRefresh);
}

async function buscarPendenciasDevolucao(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/pendencia-devolucao?limit=1000', 45000, forceRefresh);
}

async function buscarPendenciasBaixa(forceRefresh = false) {
    return dashboardCache.getWithoutTimeout('/pendencia-baixa-completo', forceRefresh);
}

async function preCarregarDashboards() {
    console.log('🚀 Pré-carregando dados dos dashboards...');
    console.log(`📡 Usando API_URL: ${API_URL}`);
    const startTime = Date.now();
    
    try {
        const results = await Promise.allSettled([
            buscarAditivosSistemicosCompleto(),
            buscarAditivosFisicosCompleto(),
            buscarFarolObrasCompleto(),
            buscarPendenciasDevolucao(),
            buscarPendenciasBaixa()
        ]);
        
        const elapsed = Date.now() - startTime;
        console.log(`✅ Pré-carregamento concluído em ${elapsed}ms`);
        
        const names = ['Aditivos Sistêmicos', 'Aditivos Físicos', 'Farol de Obras', 'Pendências Devolução', 'Pendência de Requisição'];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`   ✅ ${names[index]}: ${result.value?.length || 0} registros`);
            } else {
                console.log(`   ❌ ${names[index]}: Erro - ${result.reason?.message || 'Desconhecido'}`);
            }
        });
        
        return results;
    } catch (error) {
        console.error('❌ Erro no pré-carregamento:', error);
        return null;
    }
}

window.dashboardCache = dashboardCache;
window.buscarAditivosSistemicosCompleto = buscarAditivosSistemicosCompleto;
window.buscarAditivosFisicosCompleto = buscarAditivosFisicosCompleto;
window.buscarFarolObrasCompleto = buscarFarolObrasCompleto;
window.buscarPendenciasDevolucao = buscarPendenciasDevolucao;
window.buscarPendenciasBaixa = buscarPendenciasBaixa;
window.preCarregarDashboards = preCarregarDashboards;

console.log('✅ dashboards-cache.js inicializado!');
console.log(`📡 API_URL configurada: ${API_URL}`);
console.log('💡 Use preCarregarDashboards() para carregar todos os dados antecipadamente');