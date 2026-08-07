// ============================================
// DASHBOARDS - FUNÇÕES COMPARTILHADAS
// ============================================

const API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';

// Torna a API_URL global
window.API_URL = API_URL;

console.log('🚀 dashboards-common.js carregado!');
console.log(`📡 API_URL: ${API_URL}`);

// ============================================
// UTILIDADES
// ============================================

function mostrarToast(mensagem, tipo = 'info') {
    const toastExistente = document.querySelector('.toast-dashboard');
    if (toastExistente) toastExistente.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-dashboard ${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function formatarData(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dataString;
    }
}

function getSessao() {
    console.log('🔍 Verificando sessão...');
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (!sessao) {
        console.log('❌ Sessão não encontrada');
        window.location.href = '../login.html';
        return null;
    }
    try {
        const dados = JSON.parse(sessao);
        console.log('✅ Sessão carregada:', dados.nome, '-', dados.perfil);
        return dados;
    } catch (e) {
        console.error('❌ Erro ao parsear sessão:', e);
        window.location.href = '../login.html';
        return null;
    }
}

function redirecionarParaHome() {
    const sessao = getSessao();
    if (sessao) {
        const homeMap = {
            'OPERACIONAL': '../home-operacional.html',
            'GESTAO': '../home-gestao.html',
            'VISUALIZACAO': '../home-visualizacao.html'
        };
        const homePage = homeMap[sessao.perfil] || '../index.html';
        console.log('🏠 Redirecionando para:', homePage);
        window.location.href = homePage;
    } else {
        window.location.href = '../index.html';
    }
}

// ============================================
// BUSCA DE DADOS COM LOGS
// ============================================

async function buscarTodosRegistros(endpoint) {
    console.log(`📡 Buscando todos registros de: ${endpoint}`);
    try {
        let todos = [];
        let pagina = 1;
        let totalPaginas = 1;
        
        do {
            console.log(`📄 Buscando página ${pagina}...`);
            const url = `${API_URL}${endpoint}?page=${pagina}&limit=100`;
            console.log(`🌐 URL: ${url}`);
            
            const response = await fetch(url);
            console.log(`📊 Status da resposta: ${response.status}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Erro na resposta: ${errorText}`);
                throw new Error(`Erro ao buscar dados: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log(`📦 Dados recebidos:`, data);
            
            const registros = data.data || [];
            console.log(`📋 ${registros.length} registros na página ${pagina}`);
            todos = todos.concat(registros);
            
            totalPaginas = data.pagination?.totalPages || 1;
            console.log(`📊 Total de páginas: ${totalPaginas}`);
            pagina++;
            
        } while (pagina <= totalPaginas);
        
        console.log(`✅ Total de registros carregados: ${todos.length}`);
        return todos;
    } catch (error) {
        console.error('❌ Erro ao buscar registros:', error);
        mostrarToast(`❌ Erro ao carregar dados: ${error.message}`, 'error');
        return [];
    }
}

async function buscarRegistroComItens(endpoint, numero) {
    console.log(`📡 Buscando registro #${numero} de: ${endpoint}`);
    try {
        const url = `${API_URL}${endpoint}/${numero}`;
        console.log(`🌐 URL: ${url}`);
        
        const response = await fetch(url);
        console.log(`📊 Status da resposta: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erro na resposta: ${errorText}`);
            return null;
        }
        
        const data = await response.json();
        console.log(`✅ Registro #${numero} carregado com ${data.itens?.length || 0} itens`);
        return data;
    } catch (error) {
        console.error(`❌ Erro ao buscar registro #${numero}:`, error);
        return null;
    }
}

// ============================================
// AGRUPAMENTO DE ITENS
// ============================================

function agruparItensPorCodigo(controles) {
    console.log(`📦 Agrupando itens de ${controles.length} controles...`);
    const grupos = {};
    let totalItens = 0;
    
    controles.forEach(controle => {
        const itens = controle.itens || [];
        totalItens += itens.length;
        
        itens.forEach(item => {
            const codigo = item.codigo || 'SEM_CODIGO';
            const descricao = item.descricao || 'Sem descrição';
            const quantidade = parseFloat(item.quantidade) || 0;
            const unidade = item.unidade || 'UN';
            
            if (!grupos[codigo]) {
                grupos[codigo] = {
                    codigo: codigo,
                    descricao: descricao,
                    unidade: unidade,
                    total: 0,
                    obras: [],
                    saidas: [],
                    itens: [],
                    statusCount: { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 }
                };
            }
            
            if (!grupos[codigo].descricao || grupos[codigo].descricao === 'Sem descrição') {
                grupos[codigo].descricao = descricao;
            }
            
            grupos[codigo].total += quantidade;
            
            const obra = controle.obra || 'SEM OBRA';
            const isSaida = obra.toUpperCase().includes('SAÍDA') || obra.toUpperCase().includes('SAIDA');
            const status = item.status_aditivo || 'ANALISE';
            
            if (grupos[codigo].statusCount[status] !== undefined) {
                grupos[codigo].statusCount[status] += quantidade;
            }
            
            const itemData = {
                obra: obra,
                quantidade: quantidade,
                status: status,
                data: controle.data_programacao || '',
                numero: controle.numero,
                ...item
            };
            
            if (isSaida) {
                grupos[codigo].saidas.push(itemData);
            } else {
                grupos[codigo].obras.push(itemData);
            }
            
            grupos[codigo].itens.push(itemData);
        });
    });
    
    const resultado = Object.values(grupos).sort((a, b) => b.total - a.total);
    console.log(`✅ ${resultado.length} grupos de itens criados a partir de ${totalItens} itens`);
    return resultado;
}

// ============================================
// FILTROS
// ============================================

function filtrarPorPeriodo(dados, dataInicio, dataFim) {
    if (!dataInicio && !dataFim) return dados;
    
    const inicio = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;
    
    return dados.filter(item => {
        const dataItem = new Date(item.data_programacao);
        if (inicio && dataItem < inicio) return false;
        if (fim && dataItem > fim) return false;
        return true;
    });
}

// ============================================
// EXPORTAR
// ============================================

// Torna as funções disponíveis globalmente
window.API_URL = API_URL;
window.mostrarToast = mostrarToast;
window.formatarData = formatarData;
window.getSessao = getSessao;
window.redirecionarParaHome = redirecionarParaHome;
window.buscarTodosRegistros = buscarTodosRegistros;
window.buscarRegistroComItens = buscarRegistroComItens;
window.agruparItensPorCodigo = agruparItensPorCodigo;
window.filtrarPorPeriodo = filtrarPorPeriodo;

console.log('✅ dashboards-common.js inicializado!');