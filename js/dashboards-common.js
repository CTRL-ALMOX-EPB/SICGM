// ============================================
// DASHBOARDS - FUNÇÕES COMPARTILHADAS
// ============================================

const API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';

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
    }, 3000);
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
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (!sessao) {
        window.location.href = '../login.html';
        return null;
    }
    try {
        return JSON.parse(sessao);
    } catch {
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
        window.location.href = homeMap[sessao.perfil] || '../index.html';
    } else {
        window.location.href = '../index.html';
    }
}

// ============================================
// BUSCA DE DADOS
// ============================================

async function buscarTodosRegistros(endpoint) {
    try {
        let todos = [];
        let pagina = 1;
        let totalPaginas = 1;
        
        do {
            const response = await fetch(`${API_URL}${endpoint}?page=${pagina}&limit=100`);
            if (!response.ok) throw new Error('Erro ao buscar dados');
            
            const data = await response.json();
            const registros = data.data || [];
            todos = todos.concat(registros);
            
            totalPaginas = data.pagination?.totalPages || 1;
            pagina++;
            
        } while (pagina <= totalPaginas);
        
        return todos;
    } catch (error) {
        console.error('❌ Erro ao buscar registros:', error);
        mostrarToast('❌ Erro ao carregar dados', 'error');
        return [];
    }
}

async function buscarRegistroComItens(endpoint, numero) {
    try {
        const response = await fetch(`${API_URL}${endpoint}/${numero}`);
        if (!response.ok) throw new Error('Erro ao buscar registro');
        return await response.json();
    } catch (error) {
        console.error(`❌ Erro ao buscar registro #${numero}:`, error);
        return null;
    }
}

// ============================================
// AGRUPAMENTO DE ITENS
// ============================================

function agruparItensPorCodigo(controles) {
    const grupos = {};
    
    controles.forEach(controle => {
        const itens = controle.itens || [];
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
            
            // Conta status
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
    
    return Object.values(grupos).sort((a, b) => b.total - a.total);
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

window.mostrarToast = mostrarToast;
window.formatarData = formatarData;
window.getSessao = getSessao;
window.redirecionarParaHome = redirecionarParaHome;
window.buscarTodosRegistros = buscarTodosRegistros;
window.buscarRegistroComItens = buscarRegistroComItens;
window.agruparItensPorCodigo = agruparItensPorCodigo;
window.filtrarPorPeriodo = filtrarPorPeriodo;