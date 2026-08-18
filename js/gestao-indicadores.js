// ============================================
// GESTÃO INDICADORES - RMA x DMA (APENAS R2)
// ============================================

const WORKER_URL = 'https://gestao-xd-almox.alefe-gomes-72f.workers.dev';

let dadosCompletos = [];
let graficoLogin = null;
let graficoMes = null;

// ============================================
// 1. Buscar dados consolidados do Worker
// ============================================
async function buscarDadosConsolidados(deposito = '1050') {
    try {
        const response = await fetch(`${WORKER_URL}/api/dados-consolidados?deposito=${deposito}`);
        if (!response.ok) {
            console.warn(`⚠️ Worker retornou status ${response.status}`);
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error('❌ Erro ao buscar dados:', error);
        return [];
    }
}

// ============================================
// 2. Processar dados (separar RMA e DMA)
// ============================================
function processarDados(movimentos) {
    // Mapeia cada movimento
    return movimentos.map(item => {
        // RMA = Requisição (orgmov = DMA) -> valor positivo
        // DMA = Devolução (orgmov = DMD?) -> valor negativo?
        // Pela sua planilha, orgmov = DMA é requisição.
        // Vamos considerar: se orgmov === 'DMA' -> RMA, senão -> DMA
        // Mas para garantir, usei a lógica: qtdmov positiva = RMA, negativa = DMA
        const qtd = item.qtdmov || 0;
        const valor = item.valor_total || 0;
        
        return {
            ...item,
            tipo: qtd >= 0 ? 'RMA' : 'DMA',
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
            `<div class="erro-msg">❌ Erro ao carregar dados.</div>`;
    }
}

// ============================================
// 4. Filtrar e gerar gráficos
// ============================================
function popularFiltros() {
    const logins = [...new Set(dadosCompletos.map(d => d.sigla_mov_mat).filter(Boolean))].sort();
    const meses = [...new Set(dadosCompletos.map(d => {
        if (!d.datamov) return null;
        const parts = d.datamov.split('/');
        if (parts.length !== 3) return null;
        return `${parts[2]}-${parts[1]}`; // AAAA-MM
    }).filter(Boolean))].sort();
    
    const selectLogin = document.getElementById('filtroLogin');
    const selectMes = document.getElementById('filtroMes');
    
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
            const mesAno = `${parts[2]}-${parts[1]}`;
            return mesAno === mesFiltro;
        });
    }
    
    // Totais
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
// 5. Gráfico por Login (RMA x DMA)
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
                    backgroundColor: '#3B82F6',
                    borderColor: '#2563EB',
                    borderWidth: 1
                },
                {
                    label: 'DMA (Devoluções)',
                    data: dmaValues,
                    backgroundColor: '#10B981',
                    borderColor: '#059669',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `R$ ${v.toLocaleString('pt-BR')}` }
                }
            }
        }
    });
}

// ============================================
// 6. Gráfico Mensal (RMA x DMA)
// ============================================
function gerarGraficoMes(dados) {
    const agrupado = {};
    dados.forEach(d => {
        if (!d.datamov) return;
        const parts = d.datamov.split('/');
        if (parts.length !== 3) return;
        const mesAno = `${parts[2]}-${parts[1]}`;
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
                    backgroundColor: '#3B82F6',
                    borderColor: '#2563EB',
                    borderWidth: 1
                },
                {
                    label: 'DMA (Devoluções)',
                    data: dmaValues,
                    backgroundColor: '#10B981',
                    borderColor: '#059669',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => `R$ ${v.toLocaleString('pt-BR')}` }
                }
            }
        }
    });
}

// ============================================
// Inicialização
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const sessao = verificarSessao();
    if (!sessao || sessao.perfil !== 'GESTAO') {
        alert('Acesso restrito ao perfil GESTÃO.');
        window.location.href = '/home-gestao.html';
        return;
    }
    carregarDados();
});

window.aplicarFiltros = aplicarFiltros;