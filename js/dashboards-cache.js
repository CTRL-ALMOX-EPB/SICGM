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

// Executar verificação
if (!verificarAutenticacaoCache()) {
    // A página já vai redirecionar, mas evitamos executar o resto
    throw new Error('Autenticação necessária');
}


// Usa a API_URL do dashboards-common.js (já declarada globalmente)
// Não redeclarar com const/let, apenas usar a existente
if (typeof API_URL === 'undefined') {
    // Fallback apenas se não existir
    var API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';
    console.log('⚠️ API_URL não encontrada, usando fallback:', API_URL);
} else {
    console.log('📡 Usando API_URL existente:', API_URL);
}

const CACHE_VERSION = 'v2';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

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

    // Busca dados com cache
    async get(endpoint, forceRefresh = false) {
        const cacheKey = `${CACHE_VERSION}:${endpoint}`;
        this.stats.totalRequests++;
        
        // Se já está carregando, retorna a promise existente
        if (this.loading[cacheKey]) {
            console.log(`⏳ Aguardando carregamento de ${endpoint}...`);
            return this.promises[cacheKey];
        }
        
        // Verifica cache
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
        
        // Inicia carregamento
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
            
            // Se tinha cache antigo, retorna ele mesmo expirado
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

    // Busca dados com timeout
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

    // Busca dados SEM TIMEOUT (aguarda até completar)
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

    // Limpa cache
    clear() {
        console.log('🧹 Limpando cache...');
        this.cache = {};
        this.loading = {};
        this.promises = {};
        this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    }

    // Remove um item específico do cache
    invalidate(endpoint) {
        const cacheKey = `${CACHE_VERSION}:${endpoint}`;
        delete this.cache[cacheKey];
        delete this.loading[cacheKey];
        delete this.promises[cacheKey];
        console.log(`🗑️ Cache invalidado para ${endpoint}`);
    }

    // Mostra estatísticas
    getStats() {
        console.log('📊 Estatísticas do Cache:');
        console.log(`   - Hits: ${this.stats.hits}`);
        console.log(`   - Misses: ${this.stats.misses}`);
        console.log(`   - Total: ${this.stats.totalRequests}`);
        console.log(`   - Hit Rate: ${this.stats.totalRequests > 0 ? Math.round((this.stats.hits / this.stats.totalRequests) * 100) : 0}%`);
        return this.stats;
    }
}

// Instância global do cache
const dashboardCache = new DashboardCache();

// ============================================
// FUNÇÕES OTIMIZADAS DE BUSCA
// ============================================

// Aditivos Sistêmicos - 30 segundos
async function buscarAditivosSistemicosCompleto(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/aditivo-sistemico-completo', 30000, forceRefresh);
}

// Aditivos Físicos - 30 segundos
async function buscarAditivosFisicosCompleto(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/aditivo-fisico-completo', 30000, forceRefresh);
}

// Farol de Obras - 30 segundos
async function buscarFarolObrasCompleto(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/farol-obras-completo', 30000, forceRefresh);
}

// Pendências de Devolução - 45 segundos
async function buscarPendenciasDevolucao(forceRefresh = false) {
    return dashboardCache.getWithTimeout('/pendencia-devolucao?limit=1000', 45000, forceRefresh);
}

// Pendências de Baixa (Pendência de Requisição) - USANDO A ROTA COMPLETA
async function buscarPendenciasBaixa(forceRefresh = false) {
    return dashboardCache.getWithoutTimeout('/pendencia-baixa-completo', forceRefresh);
}

// ============================================
// FUNÇÃO PARA PRÉ-CARREGAR DADOS
// ============================================

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

// ============================================
// EXPORTAR (tornar disponível globalmente)
// ============================================

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