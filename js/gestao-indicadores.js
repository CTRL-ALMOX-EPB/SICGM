// ============================================
// GESTÃO INDICADORES - RMA x DMA
// ============================================

// 🔥 WORKER DE GESTÃO
const WORKER_URL = 'https://gestao-xd-almox.alefe-gomes-72f.workers.dev';

let dadosCompletos = [];
let graficoLogin = null;
let graficoMes = null;

// ============================================
// 🔥 VERIFICAR AUTENTICAÇÃO
// ============================================

function verificarAutenticacaoGestao() {
    console.log('🔍 Verificando autenticação...');
    
    if (typeof authService === 'undefined' || !authService) {
        console.error('❌ authService não disponível');
        alert('🔒 Sessão inválida. Faça login novamente.');
        window.location.href = '../login.html';
        return false;
    }

    if (!authService.isLoggedIn()) {
        console.error('❌ Usuário não logado');
        alert('🔒 Sessão expirada. Faça login novamente.');
        window.location.href = '../login.html';
        return false;
    }

    const user = authService.getUserData();
    if (!user) {
        console.error('❌ Dados do usuário não encontrados');
        window.location.href = '../login.html';
        return false;
    }

    if (user.perfil !== 'GESTAO') {
        console.error(`❌ Perfil ${user.perfil} não autorizado`);
        alert('🔒 Acesso restrito ao perfil GESTÃO.');
        window.location.href = '../home-gestao.html';
        return false;
    }

    console.log(`✅ Autenticado: ${user.nome} (${user.perfil})`);
    return true;
}

// ============================================
// FUNÇÃO: VOLTAR PARA HOME (USANDO CONFIG)
// ============================================

function voltarParaHome() {
    try {
        if (window.CONFIG && typeof CONFIG.goHome === 'function') {
            CONFIG.goHome();
        } else {
            // Fallback
            let perfil = 'GESTAO';
            if (typeof authService !== 'undefined' && authService) {
                const user = authService.getUserData();
                if (user && user.perfil) {
                    perfil = user.perfil;
                }
            }
            const homeMap = {
                'OPERACIONAL': '../home-operacional.html',
                'GESTAO': '../home-gestao.html',
                'VISUALIZACAO': '../home-visualizacao.html'
            };
            window.location.href = homeMap[perfil] || '../home-gestao.html';
        }
    } catch (error) {
        console.error('❌ Erro ao redirecionar:', error);
        window.location.href = '../home-gestao.html';
    }
}

window.voltarParaHome = voltarParaHome;

// ============================================
// 1. Buscar dados consolidados do Worker
// ============================================
async function buscarDadosConsolidados(deposito = '1050') {
    try {
        const url = `${WORKER_URL}/api/dados-consolidados?deposito=${deposito}`;
        console.log(`📡 Buscando dados: ${url}`);
        
        const response = await fetch(url);
        
        if (response.status === 503) {
            throw new Error('Worker indisponível (503). Verifique se está online.');
        }
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const dados = await response.json();
        console.log(`✅ ${dados.length} movimentos carregados`);
        return dados;
    } catch (error) {
        console.error('❌ Erro ao buscar dados:', error);
        throw error;
    }
}

// ============================================
// 2. Processar dados (separar RMA e DMA)
// ============================================
function processarDados(movimentos) {
    return movimentos.map(item => {
        const qtd = item.qtdmov || 0;
        const valor = item.vlrmov || 0;
        
        // RMA = quantidade positiva, DMA = quantidade negativa
        const isRMA = qtd > 0;
        
        return {
            ...item,
            tipo: isRMA ? 'RMA' : 'DMA',
            valor_abs: Math.abs(valor),
            qtd_abs: Math.abs(qtd)
        };
    });
}

// ============================================
// 3. Carregar e processar
// ============================================
async function carregarDados() {
    try {
        const deposito = '1050';
        const movimentos = await buscarDadosConsolidados(deposito);
        
        if (!movimentos || movimentos.length === 0) {
            document.querySelector('.graficos-grid').innerHTML = 
                `<div class="erro-msg">⚠️ Nenhum movimento encontrado no R2.</div>`;
            return;
        }
        
        dadosCompletos = processarDados(movimentos);
        popularFiltros();
        aplicarFiltros();
    } catch (erro) {
        console.error('Erro:', erro);
        document.querySelector('.graficos-grid').innerHTML = 
            `<div class="erro-msg">❌ Erro ao carregar dados: ${erro.message}</div>`;
    }
}

// ============================================
// 4. Popular filtros
// ============================================
function popularFiltros() {
    const logins = [...new Set(dadosCompletos.map(d => d.sigla_mov_mat).filter(Boolean))].sort();
    const meses = [...new Set(dadosCompletos.map(d => {
        if (!d.datamov) return null;
        const parts = d.datamov.split('/');
        if (parts.length !== 3) return null;
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
    }).filter(Boolean))].sort();
    
    const selectLogin = document.getElementById('filtroLogin');
    const selectMes = document.getElementById('filtroMes');
    
    // Limpar opções existentes (manter o "Todos")
    selectLogin.innerHTML = '<option value="Todos">Todos</option>';
    selectMes.innerHTML = '<option value="Todos">Todos</option>';
    
    logins.forEach(login => {
        const opt = document.createElement('option');
        opt.value = login;
        opt.textContent = login;
        selectLogin.appendChild(opt);
    });
    
    meses.forEach(mes => {
        const opt = document.createElement('option');
        opt.value = mes;
        opt.textContent = mes;
        selectMes.appendChild(opt);
    });
}

// ============================================
// 5. Aplicar filtros e atualizar gráficos
// ============================================
function aplicarFiltros() {
    const loginFiltro = document.getElementById('filtroLogin').value;
    const mesFiltro = document.getElementById('filtroMes').value;
    
    let dadosFiltrados = dadosCompletos;
    if (loginFiltro !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(d => d.sigla_mov_mat === loginFiltro);
    }
    if (mesFiltro !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(d => {
            if (!d.datamov) return false;
            const parts = d.datamov.split('/');
            if (parts.length !== 3) return false;
            const mesAno = `${parts[2]}-${parts[1].padStart(2, '0')}`;
            return mesAno === mesFiltro;
        });
    }
    
    // Calcular totais
    const totalRMA = dadosFiltrados.filter(d => d.tipo === 'RMA').reduce((acc, d) => acc + d.valor_abs, 0);
    const totalDMA = dadosFiltrados.filter(d => d.tipo === 'DMA').reduce((acc, d) => acc + d.valor_abs, 0);
    const saldo = totalRMA - totalDMA;
    
    document.getElementById('totalRMA').textContent = `R$ ${totalRMA.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalDMA').textContent = `R$ ${totalDMA.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalSaldo').textContent = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalSaldo').style.color = saldo >= 0 ? '#3B82F6' : '#EF4444';
    
    gerarGraficoLogin(dadosFiltrados);
    gerarGraficoMes(dadosFiltrados);
}

// ============================================
// 6. Gráfico por Login (RMA x DMA)
// ============================================
function gerarGraficoLogin(dados) {
    const agrupado = {};
    dados.forEach(d => {
        const login = d.sigla_mov_mat;
        if (!login) return;
        if (!agrupado[login]) {
            agrupado[login] = { RMA: 0, DMA: 0 };
        }
        if (d.tipo === 'RMA') agrupado[login].RMA += d.valor_abs;
        else agrupado[login].DMA += d.valor_abs;
    });
    
    const labels = Object.keys(agrupado).sort();
    const rmaValues = labels.map(l => agrupado[l].RMA);
    const dmaValues = labels.map(l => agrupado[l].DMA);
    
    const ctx = document.getElementById('graficoLogin').getContext('2d');
    if (graficoLogin) graficoLogin.destroy();
    
    graficoLogin = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'RMA (Requisições)',
                    data: rmaValues,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3B82F6',
                    borderWidth: 2
                },
                {
                    label: 'DMA (Devoluções)',
                    data: dmaValues,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10B981',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { color: '#94A3B8' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        callback: (v) => `R$ ${v.toLocaleString('pt-BR')}`,
                        color: '#94A3B8'
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94A3B8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

// ============================================
// 7. Gráfico Mensal (RMA x DMA)
// ============================================
function gerarGraficoMes(dados) {
    const agrupado = {};
    dados.forEach(d => {
        if (!d.datamov) return;
        const parts = d.datamov.split('/');
        if (parts.length !== 3) return;
        const mesAno = `${parts[2]}-${parts[1].padStart(2, '0')}`;
        if (!agrupado[mesAno]) {
            agrupado[mesAno] = { RMA: 0, DMA: 0 };
        }
        if (d.tipo === 'RMA') agrupado[mesAno].RMA += d.valor_abs;
        else agrupado[mesAno].DMA += d.valor_abs;
    });
    
    const labels = Object.keys(agrupado).sort();
    const rmaValues = labels.map(l => agrupado[l].RMA);
    const dmaValues = labels.map(l => agrupado[l].DMA);
    
    const ctx = document.getElementById('graficoMes').getContext('2d');
    if (graficoMes) graficoMes.destroy();
    
    graficoMes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'RMA (Requisições)',
                    data: rmaValues,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: '#3B82F6',
                    borderWidth: 2
                },
                {
                    label: 'DMA (Devoluções)',
                    data: dmaValues,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10B981',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'top',
                    labels: { color: '#94A3B8' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        callback: (v) => `R$ ${v.toLocaleString('pt-BR')}`,
                        color: '#94A3B8'
                    },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94A3B8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

// ============================================
// Inicialização
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // 🔥 VERIFICAR AUTENTICAÇÃO PRIMEIRO
    if (!verificarAutenticacaoGestao()) return;
    carregarDados();
});

// EXPOR FUNÇÕES GLOBAIS
window.aplicarFiltros = aplicarFiltros;
window.voltarParaHome = voltarParaHome;