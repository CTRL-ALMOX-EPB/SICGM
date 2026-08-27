// ============================================
// GESTÃO INDICADORES - RMA x DMA
// ============================================

const WORKER_URL = 'https://gestao-xd-almox.alefe-gomes-72f.workers.dev';

let dadosCompletos = [];
let graficoLogin = null;
let graficoMes = null;
let posicaoEstoque = {}; // Cache da posição de estoque

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
// FUNÇÃO: VOLTAR PARA HOME
// ============================================

function voltarParaHome() {
    try {
        if (window.CONFIG && typeof CONFIG.goHome === 'function') {
            CONFIG.goHome();
        } else {
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
// 1. BUSCAR POSIÇÃO DE ESTOQUE (VALORES)
// ============================================
async function carregarPosicaoEstoque() {
    try {
        console.log('📡 Carregando posição de estoque...');
        const response = await fetch(`${WORKER_URL}/api/posicao`);
        
        if (!response.ok) {
            console.warn('⚠️ Posição de estoque não encontrada, valores serão 0');
            return {};
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        const mapa = {};
        
        for (let i = 1; i < linhas.length; i++) {
            const partes = linhas[i].trim().split('\t');
            if (partes.length >= 6) {
                const codigo = partes[0].trim();
                const vlrultCot = parseFloat(partes[4]?.trim().replace(',', '.')) || 0;
                if (codigo && vlrultCot > 0) {
                    mapa[codigo] = vlrultCot;
                }
            }
        }
        
        console.log(`✅ ${Object.keys(mapa).length} materiais com valor carregados`);
        return mapa;
    } catch (error) {
        console.error('❌ Erro ao carregar posição:', error);
        return {};
    }
}

// ============================================
// 2. BUSCAR MOVIMENTOS (ARQUIVO BRUTO)
// ============================================
async function buscarMovimentos() {
    try {
        const url = `${WORKER_URL}/api/movimentos`;
        console.log(`📡 Buscando movimentos: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        const texto = await response.text();
        console.log(`✅ Arquivo carregado (${texto.split('\n').length} linhas)`);
        return texto;
    } catch (error) {
        console.error('❌ Erro ao buscar movimentos:', error);
        throw error;
    }
}

// ============================================
// 3. PARSER DO MOVIMENTOS_SIAGO.TXT
// ============================================
function parseMovimentos(texto, posicaoMap) {
    const linhas = texto.trim().split('\n');
    
    if (linhas.length < 2) {
        console.warn('⚠️ Arquivo vazio ou com apenas cabeçalho');
        return [];
    }
    
    // Cabeçalho
    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    
    const idx = {
        orgmov: cabecalho.indexOf('orgmov'),
        numdoc_mov: cabecalho.indexOf('numdoc_mov'),
        datamov: cabecalho.indexOf('datamov'),
        codmat_mov: cabecalho.indexOf('codmat_mov'),
        dscmat: cabecalho.indexOf('dscmat'),
        qtdmov: cabecalho.indexOf('qtdmov'),
        vlrmov: cabecalho.indexOf('vlrmov'),
        nummov: cabecalho.indexOf('nummov'),
        sigla_mov_mat: cabecalho.indexOf('sigla_mov_mat')
    };
    
    console.log('📌 Índices:', idx);
    
    const movimentos = [];
    let ignorados = 0;
    
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const partes = linha.split('\t');
        if (partes.length < 16) {
            ignorados++;
            continue;
        }
        
        const qtdmov = parseFloat(partes[idx.qtdmov]?.trim().replace(',', '.')) || 0;
        
        // Pular qtd = 0
        if (qtdmov === 0) {
            ignorados++;
            continue;
        }
        
        const codmat = partes[idx.codmat_mov]?.trim() || '';
        const vlrUnitario = posicaoMap[codmat] || 0;
        
        // orgmov define se é RMA ou DMA
        // RMA = orgmov "S" (Saída) ou "RMA"
        // DMA = orgmov "E" (Entrada) ou "DMA"
        const orgmov = partes[idx.orgmov]?.trim() || '';
        const isRMA = orgmov === 'S' || orgmov === 'RMA' || orgmov.toUpperCase() === 'RMA';
        
        movimentos.push({
            orgmov: orgmov,
            numdoc_mov: partes[idx.numdoc_mov]?.trim() || '',
            datamov: partes[idx.datamov]?.trim() || '',
            codmat: codmat,
            dscmat: partes[idx.dscmat]?.trim() || '',
            qtdmov: qtdmov,
            vlrmov: parseFloat(partes[idx.vlrmov]?.trim().replace(',', '.')) || 0,
            nummov: partes[idx.nummov]?.trim() || '',
            sigla_mov_mat: partes[idx.sigla_mov_mat]?.trim() || '',
            tipo: isRMA ? 'RMA' : 'DMA',
            vlr_unitario: vlrUnitario,
            valor_total: vlrUnitario * Math.abs(qtdmov),
            valor_abs: Math.abs(vlrUnitario * qtdmov),
            qtd_abs: Math.abs(qtdmov)
        });
    }
    
    console.log(`✅ ${movimentos.length} movimentos processados (${ignorados} ignorados)`);
    return movimentos;
}

// ============================================
// 4. CARREGAR TUDO
// ============================================
async function carregarDados() {
    try {
        // Carrega posição de estoque primeiro
        posicaoEstoque = await carregarPosicaoEstoque();
        
        // Carrega movimentos
        const texto = await buscarMovimentos();
        
        // Parse
        const movimentos = parseMovimentos(texto, posicaoEstoque);
        
        if (!movimentos || movimentos.length === 0) {
            document.querySelector('.graficos-grid').innerHTML = 
                `<div class="erro-msg">⚠️ Nenhum movimento encontrado.</div>`;
            return;
        }
        
        dadosCompletos = movimentos;
        console.log(`📊 ${dadosCompletos.length} movimentos carregados`);
        console.log('📋 Primeiros 3:', dadosCompletos.slice(0, 3));
        
        popularFiltros();
        aplicarFiltros();
    } catch (erro) {
        console.error('❌ Erro ao carregar dados:', erro);
        document.querySelector('.graficos-grid').innerHTML = 
            `<div class="erro-msg">❌ Erro ao carregar dados: ${erro.message}</div>`;
    }
}

// ============================================
// 5. POPULAR FILTROS
// ============================================
function popularFiltros() {
    if (!dadosCompletos || dadosCompletos.length === 0) return;
    
    const logins = [...new Set(dadosCompletos.map(d => d.sigla_mov_mat).filter(Boolean))].sort();
    const meses = [...new Set(dadosCompletos.map(d => {
        if (!d.datamov) return null;
        const parts = d.datamov.split('/');
        if (parts.length !== 3) return null;
        return `${parts[2]}-${parts[1].padStart(2, '0')}`;
    }).filter(Boolean))].sort();
    
    const selectLogin = document.getElementById('filtroLogin');
    const selectMes = document.getElementById('filtroMes');
    
    if (!selectLogin || !selectMes) return;
    
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
// 6. APLICAR FILTROS
// ============================================
function aplicarFiltros() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        console.warn('⚠️ Nenhum dado para filtrar');
        return;
    }
    
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
    
    console.log(`📊 ${dadosFiltrados.length} registros após filtros`);
    
    // Calcular totais (usando valor_total)
    const totalRMA = dadosFiltrados.filter(d => d.tipo === 'RMA').reduce((acc, d) => acc + d.valor_total, 0);
    const totalDMA = dadosFiltrados.filter(d => d.tipo === 'DMA').reduce((acc, d) => acc + d.valor_total, 0);
    const saldo = totalRMA - totalDMA;
    
    document.getElementById('totalRMA').textContent = `R$ ${totalRMA.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalDMA').textContent = `R$ ${totalDMA.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalSaldo').textContent = `R$ ${saldo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalSaldo').style.color = saldo >= 0 ? '#3B82F6' : '#EF4444';
    
    gerarGraficoLogin(dadosFiltrados);
    gerarGraficoMes(dadosFiltrados);
}

// ============================================
// 7. GRÁFICO POR LOGIN
// ============================================
function gerarGraficoLogin(dados) {
    if (!dados || dados.length === 0) return;
    
    const agrupado = {};
    dados.forEach(d => {
        const login = d.sigla_mov_mat;
        if (!login) return;
        if (!agrupado[login]) {
            agrupado[login] = { RMA: 0, DMA: 0 };
        }
        if (d.tipo === 'RMA') agrupado[login].RMA += d.valor_total;
        else agrupado[login].DMA += d.valor_total;
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
// 8. GRÁFICO MENSAL
// ============================================
function gerarGraficoMes(dados) {
    if (!dados || dados.length === 0) return;
    
    const agrupado = {};
    dados.forEach(d => {
        if (!d.datamov) return;
        const parts = d.datamov.split('/');
        if (parts.length !== 3) return;
        const mesAno = `${parts[2]}-${parts[1].padStart(2, '0')}`;
        if (!agrupado[mesAno]) {
            agrupado[mesAno] = { RMA: 0, DMA: 0 };
        }
        if (d.tipo === 'RMA') agrupado[mesAno].RMA += d.valor_total;
        else agrupado[mesAno].DMA += d.valor_total;
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
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacaoGestao()) return;
    carregarDados();
});

window.aplicarFiltros = aplicarFiltros;
window.voltarParaHome = voltarParaHome;