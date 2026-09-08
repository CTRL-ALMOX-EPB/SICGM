// ============================================
// GESTÃO INDICADORES - OBRAS MOVIMENTADAS
// ============================================

const WORKER_URL_OBRAS = 'https://gestao-xd-almox.alefe-gomes-72f.workers.dev';
const DATA_CORTE = '2026-08-01';

// ============================================
// FUNÇÃO DE NORMALIZAÇÃO DE OBRA (10 DÍGITOS)
// ============================================
function normalizarObra(obra) {
    if (!obra) return '';
    
    var limpo = obra.replace(/[\s\.\-/]/g, '');
    limpo = limpo.replace(/\D/g, '');
    
    if (limpo.length === 0) return '';
    
    while (limpo.length < 10) {
        limpo = '0' + limpo;
    }
    
    if (limpo.length > 10) {
        limpo = limpo.substring(limpo.length - 10);
    }
    
    return limpo;
}

// ============================================
// FUNÇÃO PARA FORMATAR OBRA COM TRAÇOS (10 DÍGITOS)
// ============================================
function formatarObraComTraco(obra) {
    var normalizada = normalizarObra(obra);
    if (!normalizada || normalizada.length !== 10) return obra;
    
    var parte1 = normalizada.substring(0, 3);
    var parte2 = normalizada.substring(3, 5);
    var parte3 = normalizada.substring(5, 10);
    
    return parte1 + '-' + parte2 + '-' + parte3;
}

let dadosObras = {
    // Dados brutos (completos)
    movimentos: [],
    programacao: [],
    devolucao: [],
    
    // Dados filtrados (aplicando filtro de meses)
    movimentosFiltrados: [],
    programacaoFiltrados: [],
    devolucaoFiltrados: [],
    
    // Obras únicas (completas)
    obrasMovimentos: new Set(),
    obrasProgramacao: new Set(),
    obrasDevolucao: new Set(),
    
    // Obras únicas (filtradas)
    obrasMovimentosFiltrados: new Set(),
    obrasProgramacaoFiltrados: new Set(),
    obrasDevolucaoFiltrados: new Set(),
    
    // Métricas (filtradas)
    obrasGeral: new Set(),
    obrasMovimentadas: new Set(),
    obrasPendentes: new Set(),
    obrasAntigas: new Set(),
    
    // Detalhes
    detalhesProgramacao: {},
    detalhesProgramacaoCompleta: {},
    detalhesDevolucao: {},
    detalhesMovimentos: {},
    
    // Obras por Mês (completos - SEMPRE TODOS OS MESES, SEM FILTRO)
    obrasMensal: {},
    detalhesObrasMensal: {},
    valoresMensal: {}
};

let graficos = {
    mensal: null,
    situacao: null,
    comparativo: null
};

let detalhesObrasAtuais = [];

// ============================================
// FILTROS DE MÊS PARA OBRAS
// ============================================
let filtroObras = {
    mesesSelecionados: []
};

// ============================================
// SWITCH TABS
// ============================================
function switchTab(tabId) {
    console.log('🔄 Trocando para aba: ' + tabId);
    
    document.querySelectorAll('.tab-content').forEach(function(el) {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(function(el) {
        el.classList.remove('active');
    });
    
    var targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    var targetBtn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (targetBtn) targetBtn.classList.add('active');
    
    if (tabId === 'tab-obras') {
        setTimeout(carregarDadosObras, 100);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado (Obras)');
    
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tabId = this.getAttribute('data-tab');
            if (typeof switchTab === 'function') switchTab(tabId);
        });
    });
    
    var tabObras = document.getElementById('tab-obras');
    if (tabObras && tabObras.classList.contains('active')) {
        carregarDadosObras();
    }
});

// ============================================
// CARREGAR DADOS DAS OBRAS
// ============================================
async function carregarDadosObras() {
    var loadingEl = document.getElementById('loadingObras');
    if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = '<div class="spinner"></div><div>⏳ Carregando dados das obras...</div>';
    }
    
    try {
        console.log('📡 Carregando dados das obras...');
        console.log('📅 DATA DE CORTE: ' + DATA_CORTE);
        
        var programacaoTexto = await fetchProgramacao();
        var devolucaoTexto = await fetchDevolucao();
        var movimentosTexto = await fetchMovimentos();
        
        // Processar dados completos
        processarProgramacaoCompleta(programacaoTexto);
        processarProgramacao(programacaoTexto);
        processarDevolucao(devolucaoTexto);
        processarMovimentos(movimentosTexto);
        
        // Inicializar filtros (apenas Agosto e Setembro)
        inicializarFiltrosObras();
        
        // GERAR GRÁFICO MENSAL PRIMEIRO (sempre visível - TODOS OS MESES)
        gerarGraficoMensal();
        
        // Aplicar filtro aos gráficos de situação e comparativo
        aplicarFiltroMeses();
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        console.log('✅ Dados carregados!');
        console.log('📊 Programação Completa: ' + Object.keys(dadosObras.detalhesProgramacaoCompleta).length + ' obras');
        
    } catch (error) {
        console.error('❌ Erro:', error);
        if (loadingEl) {
            loadingEl.innerHTML = '<div style="color:#C53030;padding:20px;">❌ Erro: ' + error.message + '<br><br><button onclick="carregarDadosObras()" style="padding:10px 20px;background:#4299E1;color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Tentar Novamente</button></div>';
            loadingEl.style.display = 'block';
        }
    }
}

// ============================================
// BUSCAR ARQUIVOS
// ============================================
async function fetchProgramacao() {
    try {
        var response = await fetch(WORKER_URL_OBRAS + '/api/programacao');
        if (response.ok) {
            var texto = await response.text();
            if (texto && texto.trim().length > 0) return texto;
        }
        return await fetchArquivoGenerico('programacao_siago.txt');
    } catch (e) { return ''; }
}

async function fetchDevolucao() {
    try {
        var response = await fetch(WORKER_URL_OBRAS + '/api/devolucao');
        if (response.ok) {
            var texto = await response.text();
            if (texto && texto.trim().length > 0) return texto;
        }
        return await fetchArquivoGenerico('devolucao_compilada.txt');
    } catch (e) { return ''; }
}

async function fetchMovimentos() {
    try {
        var response = await fetch(WORKER_URL_OBRAS + '/api/movimentos');
        if (response.ok) {
            var texto = await response.text();
            if (texto && texto.trim().length > 0) return texto;
        }
        return await fetchArquivoGenerico('movimentos_siago.txt');
    } catch (e) { return ''; }
}

async function fetchArquivoGenerico(nome) {
    try {
        var response = await fetch(WORKER_URL_OBRAS + '/api/arquivo?nome=' + encodeURIComponent(nome));
        if (response.ok) {
            var texto = await response.text();
            if (texto && texto.trim().length > 0) return texto;
        }
        return '';
    } catch (e) { return ''; }
}

// ============================================
// FUNÇÃO PARA VERIFICAR DATA >= DATA_CORTE
// ============================================
function isDataAposCorte(dataStr) {
    if (!dataStr) return false;
    
    var dataObj = null;
    var match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
        dataObj = new Date(match[3] + '-' + match[2] + '-' + match[1] + 'T00:00:00');
    } else {
        var match2 = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match2) {
            dataObj = new Date(match2[1] + '-' + match2[2] + '-' + match2[3] + 'T00:00:00');
        }
    }
    
    if (!dataObj) return false;
    var dataCorteObj = new Date(DATA_CORTE + 'T00:00:00');
    return dataObj >= dataCorteObj;
}

// ============================================
// FUNÇÃO PARA VERIFICAR SE MÊS ESTÁ NO FILTRO
// ============================================
function mesEstaNoFiltro(mesAno) {
    if (filtroObras.mesesSelecionados.length === 0) return true;
    return filtroObras.mesesSelecionados.indexOf(mesAno) > -1;
}

// ============================================
// PROCESSAR PROGRAMAÇÃO COMPLETA (SEM FILTRO DE DATA)
// ============================================
function processarProgramacaoCompleta(texto) {
    dadosObras.detalhesProgramacaoCompleta = {};
    
    if (!texto) return;
    
    var linhas = texto.trim().split('\n');
    if (linhas.length < 2) return;
    
    var cabecalho = linhas[0].split('\t').map(function(h) { return h.trim().toLowerCase(); });
    var idxObra = cabecalho.indexOf('num_obra');
    var idxStatus = cabecalho.indexOf('dsc_status');
    var idxEtapas = cabecalho.indexOf('total_etapas');
    
    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].trim().split('\t');
        if (partes.length < Math.max(idxObra, idxStatus) + 1) continue;
        
        var obraOriginal = partes[idxObra]?.trim() || '';
        if (!obraOriginal) continue;
        
        var obraNormalizada = normalizarObra(obraOriginal);
        if (!obraNormalizada) continue;
        
        var status = partes[idxStatus]?.trim() || 'N/A';
        var etapas = partes[idxEtapas]?.trim() || '0';
        
        if (!dadosObras.detalhesProgramacaoCompleta[obraNormalizada]) {
            dadosObras.detalhesProgramacaoCompleta[obraNormalizada] = {
                status: status,
                etapas: etapas,
                obraOriginal: obraOriginal,
                obraFormatada: formatarObraComTraco(obraNormalizada)
            };
        } else {
            var existente = dadosObras.detalhesProgramacaoCompleta[obraNormalizada];
            if (status !== 'N/A' && status !== 'ETAPA CANCELADA') {
                existente.status = status;
                existente.etapas = etapas;
            }
        }
    }
    
    console.log('📋 Programação Completa: ' + Object.keys(dadosObras.detalhesProgramacaoCompleta).length + ' obras');
}

// ============================================
// PROCESSAR PROGRAMAÇÃO (FILTRADO POR DATA_CORTE)
// ============================================
function processarProgramacao(texto) {
    dadosObras.programacao = [];
    dadosObras.obrasProgramacao = new Set();
    dadosObras.detalhesProgramacao = {};
    
    if (!texto) return;
    
    var linhas = texto.trim().split('\n');
    if (linhas.length < 2) return;
    
    var cabecalho = linhas[0].split('\t').map(function(h) { return h.trim().toLowerCase(); });
    var idxObra = cabecalho.indexOf('num_obra');
    var idxData = cabecalho.indexOf('dth_programacao_inicial');
    var idxStatus = cabecalho.indexOf('dsc_status');
    var idxEtapas = cabecalho.indexOf('total_etapas');
    
    var dataCorteObj = new Date(DATA_CORTE + 'T00:00:00');
    var obrasMap = new Map();
    
    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].trim().split('\t');
        if (partes.length < Math.max(idxObra, idxData) + 1) continue;
        
        var obraOriginal = partes[idxObra]?.trim() || '';
        if (!obraOriginal) continue;
        
        var obraNormalizada = normalizarObra(obraOriginal);
        if (!obraNormalizada) continue;
        
        var dataRaw = partes[idxData]?.trim() || '';
        var dataObj = null;
        var mesAno = '';
        
        if (dataRaw) {
            var match = dataRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
                dataObj = new Date(match[3] + '-' + match[2] + '-' + match[1] + 'T00:00:00');
                mesAno = match[3] + '-' + match[2];
            } else {
                var match2 = dataRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (match2) {
                    dataObj = new Date(match2[1] + '-' + match2[2] + '-' + match2[3] + 'T00:00:00');
                    mesAno = match2[1] + '-' + match2[2];
                }
            }
        }
        
        if (dataObj && dataObj >= dataCorteObj) {
            var status = partes[idxStatus]?.trim() || 'N/A';
            var etapas = partes[idxEtapas]?.trim() || '0';
            
            if (!obrasMap.has(obraNormalizada)) {
                obrasMap.set(obraNormalizada, { 
                    obra: obraNormalizada, 
                    obraOriginal: obraOriginal,
                    status: status, 
                    data: dataRaw, 
                    etapas: etapas,
                    mesAno: mesAno
                });
            } else {
                var existente = obrasMap.get(obraNormalizada);
                if (status !== 'N/A' && status !== 'ETAPA CANCELADA') {
                    existente.status = status;
                    existente.data = dataRaw;
                    existente.etapas = etapas;
                }
            }
        }
    }
    
    obrasMap.forEach(function(valor) {
        dadosObras.programacao.push(valor);
        dadosObras.obrasProgramacao.add(valor.obra);
        dadosObras.detalhesProgramacao[valor.obra] = { 
            status: valor.status, 
            data: valor.data,
            etapas: valor.etapas,
            obraOriginal: valor.obraOriginal,
            obraFormatada: formatarObraComTraco(valor.obra),
            mesAno: valor.mesAno
        };
    });
    
    console.log('📋 Programação Filtrada: ' + dadosObras.obrasProgramacao.size + ' obras únicas');
}

// ============================================
// PROCESSAR DEVOLUÇÃO
// ============================================
function processarDevolucao(texto) {
    dadosObras.devolucao = [];
    dadosObras.obrasDevolucao = new Set();
    dadosObras.detalhesDevolucao = {};
    
    if (!texto) return;
    
    var linhas = texto.trim().split('\n');
    if (linhas.length < 2) return;
    
    var obrasMap = new Map();
    
    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].trim().split('\t');
        if (partes.length < 2) continue;
        
        var obraOriginal = partes[0]?.trim() || '';
        if (!obraOriginal) continue;
        
        var obraNormalizada = normalizarObra(obraOriginal);
        if (!obraNormalizada) continue;
        
        var data = partes[1]?.trim() || '';
        var qtd = parseFloat(partes[4]?.trim().replace(',', '.')) || 0;
        var mesAno = '';
        
        if (data) {
            var match = data.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (match) {
                mesAno = match[3] + '-' + match[2];
            }
        }
        
        if (!isDataAposCorte(data)) continue;
        
        if (!obrasMap.has(obraNormalizada)) {
            obrasMap.set(obraNormalizada, { 
                obra: obraNormalizada,
                obraOriginal: obraOriginal,
                totalQtd: 0, 
                data: data,
                mesAno: mesAno
            });
        }
        var item = obrasMap.get(obraNormalizada);
        item.totalQtd += qtd;
        if (data) item.data = data;
    }
    
    obrasMap.forEach(function(valor) {
        dadosObras.devolucao.push(valor);
        dadosObras.obrasDevolucao.add(valor.obra);
        dadosObras.detalhesDevolucao[valor.obra] = { 
            totalQtd: valor.totalQtd, 
            data: valor.data,
            obraOriginal: valor.obraOriginal,
            obraFormatada: formatarObraComTraco(valor.obra),
            mesAno: valor.mesAno
        };
    });
    
    console.log('📦 Devolução: ' + dadosObras.obrasDevolucao.size + ' obras únicas');
}

// ============================================
// PROCESSAR MOVIMENTOS (SEMPRE TODOS OS MESES - SEM FILTRO DE DATA)
// ============================================
function processarMovimentos(texto) {
    dadosObras.movimentos = [];
    dadosObras.obrasMovimentos = new Set();
    dadosObras.detalhesMovimentos = {};
    dadosObras.obrasMensal = {};
    dadosObras.detalhesObrasMensal = {};
    dadosObras.valoresMensal = {};
    
    if (!texto) return;
    
    var linhas = texto.trim().split('\n');
    if (linhas.length < 2) return;
    
    var cabecalho = linhas[0].split('\t').map(function(h) { return h.trim().toLowerCase(); });
    var idxObra = cabecalho.indexOf('num_obra');
    var idxData = cabecalho.indexOf('datamov');
    var idxValor = cabecalho.indexOf('vlrmov');
    
    var dataCorteObj = new Date(DATA_CORTE + 'T00:00:00');
    var obrasMap = new Map();
    var valoresPorObraMes = {};
    
    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].trim().split('\t');
        if (partes.length < Math.max(idxObra, idxData) + 1) continue;
        
        var obraOriginal = partes[idxObra]?.trim() || '';
        if (!obraOriginal) continue;
        
        var obraNormalizada = normalizarObra(obraOriginal);
        if (!obraNormalizada) continue;
        
        var dataRaw = partes[idxData]?.trim() || '';
        var valor = parseFloat(partes[idxValor]?.trim().replace(',', '.')) || 0;
        var dataObj = null;
        var mesAno = '';
        var dataApenas = '';
        
        if (dataRaw) {
            var match = dataRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
                var dia = match[1];
                var mes = match[2];
                var ano = match[3];
                dataObj = new Date(ano + '-' + mes + '-' + dia + 'T00:00:00');
                mesAno = ano + '-' + mes;
                dataApenas = dia + '/' + mes + '/' + ano;
            } else {
                var match2 = dataRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (match2) {
                    var ano2 = match2[1];
                    var mes2 = match2[2];
                    var dia2 = match2[3];
                    dataObj = new Date(ano2 + '-' + mes2 + '-' + dia2 + 'T00:00:00');
                    mesAno = ano2 + '-' + mes2;
                    dataApenas = dia2 + '/' + mes2 + '/' + ano2;
                }
            }
        }
        
        if (!dataObj || !mesAno) continue;
        
        var chave = obraNormalizada + '|' + mesAno;
        if (!valoresPorObraMes[chave]) {
            valoresPorObraMes[chave] = {
                obra: obraNormalizada,
                obraOriginal: obraOriginal,
                mesAno: mesAno,
                valorTotal: 0,
                data: dataApenas
            };
        }
        valoresPorObraMes[chave].valorTotal += valor;
        
        // SEMPRE adicionar à obrasMensal (todos os meses - SEM FILTRO DE DATA)
        if (!dadosObras.obrasMensal[mesAno]) {
            dadosObras.obrasMensal[mesAno] = new Set();
            dadosObras.detalhesObrasMensal[mesAno] = [];
            dadosObras.valoresMensal[mesAno] = 0;
        }
        dadosObras.obrasMensal[mesAno].add(obraNormalizada);
        
        // Para os movimentos filtrados (usados nos gráficos de situação e comparativo)
        if (dataObj >= dataCorteObj) {
            if (!obrasMap.has(obraNormalizada)) {
                obrasMap.set(obraNormalizada, {
                    obra: obraNormalizada,
                    obraOriginal: obraOriginal,
                    data: dataApenas,
                    mesAno: mesAno,
                    valor: 0,
                    ultimaData: dataApenas
                });
            }
            var existente = obrasMap.get(obraNormalizada);
            existente.valor += valor;
            
            var dataExistente = existente.ultimaData;
            var dataExistenteObj = null;
            var matchExistente = dataExistente.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (matchExistente) {
                dataExistenteObj = new Date(matchExistente[3] + '-' + matchExistente[2] + '-' + matchExistente[1] + 'T00:00:00');
            }
            if (!dataExistenteObj || dataObj > dataExistenteObj) {
                existente.ultimaData = dataApenas;
                existente.data = dataApenas;
                existente.mesAno = mesAno;
            }
        }
    }
    
    var chaves = Object.keys(valoresPorObraMes);
    for (var k = 0; k < chaves.length; k++) {
        var item = valoresPorObraMes[chaves[k]];
        var mesAno = item.mesAno;
        var obra = item.obra;
        var obraOriginal = item.obraOriginal;
        var valorTotal = item.valorTotal;
        var dataItem = item.data;
        
        var existe = false;
        var detalhes = dadosObras.detalhesObrasMensal[mesAno];
        for (var d = 0; d < detalhes.length; d++) {
            if (detalhes[d].obra === obra) {
                detalhes[d].valor += valorTotal;
                existe = true;
                break;
            }
        }
        
        if (!existe) {
            dadosObras.detalhesObrasMensal[mesAno].push({ 
                obra: obra,
                obraOriginal: obraOriginal,
                obraFormatada: formatarObraComTraco(obra),
                data: dataItem,
                valor: valorTotal,
                mesAno: mesAno
            });
            dadosObras.valoresMensal[mesAno] += valorTotal;
        }
    }
    
    obrasMap.forEach(function(valor) {
        dadosObras.movimentos.push(valor);
        dadosObras.obrasMovimentos.add(valor.obra);
        dadosObras.detalhesMovimentos[valor.obra] = {
            data: valor.data,
            mesAno: valor.mesAno,
            valor: valor.valor,
            obraOriginal: valor.obraOriginal,
            obraFormatada: formatarObraComTraco(valor.obra)
        };
    });
    
    console.log('📊 Movimentos: ' + dadosObras.obrasMovimentos.size + ' obras únicas');
    console.log('📊 Meses disponíveis no gráfico: ' + Object.keys(dadosObras.obrasMensal).sort().join(', '));
}

// ============================================
// APLICAR FILTRO DE MESES (APENAS PARA SITUAÇÃO E COMPARATIVO)
// ============================================
function aplicarFiltroMeses() {
    console.log('🔍 Aplicando filtro de meses para Situação e Comparativo...');
    console.log('📌 Meses selecionados:', filtroObras.mesesSelecionados);
    
    // Resetar dados filtrados
    dadosObras.obrasMovimentosFiltrados = new Set();
    dadosObras.obrasProgramacaoFiltrados = new Set();
    dadosObras.obrasDevolucaoFiltrados = new Set();
    dadosObras.movimentosFiltrados = [];
    dadosObras.programacaoFiltrados = [];
    dadosObras.devolucaoFiltrados = [];
    
    // Se não há meses selecionados, usar todos
    var temFiltro = filtroObras.mesesSelecionados.length > 0;
    
    // Filtrar programação
    dadosObras.programacao.forEach(function(item) {
        if (!temFiltro || (item.mesAno && mesEstaNoFiltro(item.mesAno))) {
            dadosObras.programacaoFiltrados.push(item);
            dadosObras.obrasProgramacaoFiltrados.add(item.obra);
        }
    });
    
    // Filtrar devolução
    dadosObras.devolucao.forEach(function(item) {
        if (!temFiltro || (item.mesAno && mesEstaNoFiltro(item.mesAno))) {
            dadosObras.devolucaoFiltrados.push(item);
            dadosObras.obrasDevolucaoFiltrados.add(item.obra);
        }
    });
    
    // Filtrar movimentos
    dadosObras.movimentos.forEach(function(item) {
        if (!temFiltro || (item.mesAno && mesEstaNoFiltro(item.mesAno))) {
            dadosObras.movimentosFiltrados.push(item);
            dadosObras.obrasMovimentosFiltrados.add(item.obra);
        }
    });
    
    // Calcular métricas com os dados filtrados
    calcularMetricasObrasFiltradas();
    
    // Atualizar indicadores
    atualizarIndicadores();
    
    // Atualizar gráfico de situação com dados filtrados
    gerarGraficoSituacaoFiltrado();
    
    // Atualizar gráfico comparativo com dados filtrados
    gerarGraficoComparativoFiltrado();
}

// ============================================
// CALCULAR MÉTRICAS COM DADOS FILTRADOS
// ============================================
function calcularMetricasObrasFiltradas() {
    // Obras GERAIS = Programação + Devolução (filtradas)
    dadosObras.obrasGeral = new Set([
        ...dadosObras.obrasProgramacaoFiltrados,
        ...dadosObras.obrasDevolucaoFiltrados
    ]);
    
    // Obras Movimentadas = Obras que estão em Geral E em Movimentos (filtradas)
    dadosObras.obrasMovimentadas = new Set();
    dadosObras.obrasGeral.forEach(function(obra) {
        if (dadosObras.obrasMovimentosFiltrados.has(obra)) {
            dadosObras.obrasMovimentadas.add(obra);
        }
    });
    
    // Obras Pendentes = Obras em Geral mas NÃO em Movimentos
    dadosObras.obrasPendentes = new Set();
    dadosObras.obrasGeral.forEach(function(obra) {
        if (!dadosObras.obrasMovimentosFiltrados.has(obra)) {
            dadosObras.obrasPendentes.add(obra);
        }
    });
    
    // Obras Antigas = Obras em Movimentos mas NÃO em Geral
    dadosObras.obrasAntigas = new Set();
    dadosObras.obrasMovimentosFiltrados.forEach(function(obra) {
        if (!dadosObras.obrasGeral.has(obra)) {
            dadosObras.obrasAntigas.add(obra);
        }
    });
    
    console.log('📊 Métricas Filtradas:');
    console.log('   Obras Gerais: ' + dadosObras.obrasGeral.size);
    console.log('   Movimentadas: ' + dadosObras.obrasMovimentadas.size);
    console.log('   Pendentes: ' + dadosObras.obrasPendentes.size);
    console.log('   Antigas: ' + dadosObras.obrasAntigas.size);
}

// ============================================
// INICIALIZAR FILTROS DE MÊS (OBRAS) - APENAS AGOSTO E SETEMBRO
// ============================================
function inicializarFiltrosObras() {
    var mesesContainer = document.getElementById('mesesContainerObras');
    if (!mesesContainer) {
        console.warn('⚠️ mesesContainerObras não encontrado');
        return;
    }
    
    mesesContainer.innerHTML = '';
    
    // Obter todos os meses disponíveis
    var mesesDisponiveis = Object.keys(dadosObras.obrasMensal).sort();
    
    if (mesesDisponiveis.length === 0) {
        mesesContainer.innerHTML = '<span style="color:#A0AEC0;font-size:13px;">Nenhum mês disponível</span>';
        return;
    }
    
    // FILTRAR APENAS MESES A PARTIR DE 01/08/2026 (AGOSTO E SETEMBRO)
    var mesesFiltrados = mesesDisponiveis.filter(function(mesAno) {
        var partes = mesAno.split('-');
        var ano = parseInt(partes[0]);
        var mes = parseInt(partes[1]);
        return (ano > 2026) || (ano === 2026 && mes >= 8);
    });
    
    if (mesesFiltrados.length === 0) {
        mesesContainer.innerHTML = '<span style="color:#A0AEC0;font-size:13px;">Nenhum mês disponível a partir de 01/08/2026</span>';
        return;
    }
    
    var MESES = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março',
        '04': 'Abril', '05': 'Maio', '06': 'Junho',
        '07': 'Julho', '08': 'Agosto', '09': 'Setembro',
        '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    
    mesesFiltrados.forEach(function(mesAno) {
        var btn = document.createElement('button');
        btn.className = 'btn-mes';
        btn.dataset.mes = mesAno;
        
        var partes = mesAno.split('-');
        var ano = partes[0];
        var mes = partes[1];
        btn.textContent = MESES[mes] + '/' + ano;
        
        var count = dadosObras.obrasMensal[mesAno]?.size || 0;
        btn.title = MESES[mes] + '/' + ano + ': ' + count + ' obras';
        
        if (filtroObras.mesesSelecionados.indexOf(mesAno) > -1) {
            btn.classList.add('active');
        }
        
        btn.addEventListener('click', function() {
            var mes = this.dataset.mes;
            var index = filtroObras.mesesSelecionados.indexOf(mes);
            
            if (index > -1) {
                filtroObras.mesesSelecionados.splice(index, 1);
                this.classList.remove('active');
            } else {
                filtroObras.mesesSelecionados.push(mes);
                this.classList.add('active');
            }
            
            // Reaplicar filtro para situação e comparativo
            aplicarFiltroMeses();
        });
        
        mesesContainer.appendChild(btn);
    });
    
    console.log('📅 Filtros de meses inicializados: ' + mesesFiltrados.length + ' meses disponíveis (após 01/08/2026)');
}

// ============================================
// GRÁFICO 1: OBRAS POR MÊS (TODOS OS MESES - SEM FILTRO DE DATA)
// ============================================
function gerarGraficoMensal() {
    var canvas = document.getElementById('graficoObrasMensal');
    if (!canvas) {
        console.error('❌ Canvas graficoObrasMensal não encontrado!');
        return;
    }
    
    // Limpar o canvas antes de renderizar
    var parent = canvas.parentElement;
    
    // TODOS os meses disponíveis (SEM FILTRO DE DATA)
    var mesesOrdenados = Object.keys(dadosObras.obrasMensal).sort();
    
    if (mesesOrdenados.length === 0) {
        if (parent) {
            parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#A0AEC0;font-size:16px;">Sem dados para exibir</div>';
        }
        return;
    }
    
    var meses = {'01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun',
                 '07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez'};
    
    var labels = mesesOrdenados.map(function(m) {
        var partes = m.split('-');
        return (meses[partes[1]] || partes[1]) + '/' + partes[0];
    });
    
    var valoresObras = mesesOrdenados.map(function(m) {
        return dadosObras.obrasMensal[m]?.size || 0;
    });
    
    // Destruir gráfico anterior se existir
    if (graficos.mensal) {
        graficos.mensal.destroy();
        graficos.mensal = null;
    }
    
    // Criar novo gráfico
    graficos.mensal = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Obras Únicas Movimentadas',
                data: valoresObras,
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3B82F6',
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: '#94A3B8', font: { size: 12, weight: 'bold' } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' obra(s)';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#94A3B8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94A3B8', font: { size: 11 } },
                    grid: { display: false }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    var index = elements[0].index;
                    var mesKey = mesesOrdenados[index];
                    if (mesKey && dadosObras.detalhesObrasMensal[mesKey]) {
                        mostrarDetalhesMensal(mesKey);
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico Obras por Mês gerado com ' + mesesOrdenados.length + ' meses (TODOS)');
}

// ============================================
// GERAR GRÁFICO DE SITUAÇÃO FILTRADO
// ============================================
function gerarGraficoSituacaoFiltrado() {
    var canvas = document.getElementById('graficoSituacao');
    if (!canvas) return;
    
    var movimentadas = dadosObras.obrasMovimentadas.size;
    var pendentes = dadosObras.obrasPendentes.size;
    var antigas = dadosObras.obrasAntigas.size;
    var total = movimentadas + pendentes + antigas;
    
    // Destruir gráfico anterior se existir
    if (graficos.situacao) {
        graficos.situacao.destroy();
        graficos.situacao = null;
    }
    
    // Se não houver dados, mostrar mensagem
    var parent = canvas.parentElement;
    if (total === 0) {
        parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#A0AEC0;font-size:16px;">Nenhum dado no período selecionado</div>';
        return;
    }
    
    graficos.situacao = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['✅ Movimentadas', '⏳ Pendentes', '🔄 Antigas Corrigidas'],
            datasets: [{
                data: [movimentadas, pendentes, antigas],
                backgroundColor: ['#48BB78', '#EF4444', '#F59E0B'],
                borderColor: ['#38A169', '#DC2626', '#D69E2E'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94A3B8', font: { size: 12 }, padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            var total2 = context.dataset.data.reduce(function(a,b){ return a + b; }, 0);
                            var pct = total2 > 0 ? Math.round((context.parsed / total2) * 100) : 0;
                            return context.label + ': ' + context.parsed + ' obras (' + pct + '%)';
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    var index = elements[0].index;
                    var tipos = ['movimentadas', 'pendentes', 'antigas'];
                    var tipo = tipos[index];
                    var titulos = {
                        'movimentadas': '✅ Obras Movimentadas',
                        'pendentes': '⏳ Obras Pendentes',
                        'antigas': '🔄 Obras Antigas Corrigidas'
                    };
                    mostrarDetalhesSituacao(tipo, titulos[tipo]);
                }
            }
        }
    });
}

// ============================================
// GERAR GRÁFICO COMPARATIVO FILTRADO
// ============================================
function gerarGraficoComparativoFiltrado() {
    var canvas = document.getElementById('graficoComparativo');
    if (!canvas) return;
    
    var programadas = dadosObras.obrasProgramacaoFiltrados.size;
    var movimentadas = dadosObras.obrasMovimentadas.size;
    var pendentes = dadosObras.obrasPendentes.size;
    var antigas = dadosObras.obrasAntigas.size;
    
    // Destruir gráfico anterior se existir
    if (graficos.comparativo) {
        graficos.comparativo.destroy();
        graficos.comparativo = null;
    }
    
    var parent = canvas.parentElement;
    if (programadas === 0 && movimentadas === 0 && pendentes === 0 && antigas === 0) {
        parent.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#A0AEC0;font-size:16px;">Nenhum dado no período selecionado</div>';
        return;
    }
    
    graficos.comparativo = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: ['📋 Programadas', '✅ Movimentadas', '⏳ Pendentes', '🔄 Antigas'],
            datasets: [{
                label: 'Obras Únicas (após ' + DATA_CORTE + ')',
                data: [programadas, movimentadas, pendentes, antigas],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(72, 187, 120, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: ['#3B82F6', '#48BB78', '#EF4444', '#F59E0B'],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' obra(s)';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#94A3B8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94A3B8', font: { size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

// ============================================
// ATUALIZAR INDICADORES
// ============================================
function atualizarIndicadores() {
    var total = dadosObras.obrasGeral.size;
    var movimentadas = dadosObras.obrasMovimentadas.size;
    var pendentes = dadosObras.obrasPendentes.size;
    var antigas = dadosObras.obrasAntigas.size;
    var programadas = dadosObras.obrasProgramacaoFiltrados.size;
    
    document.getElementById('totalObras').textContent = total;
    document.getElementById('obrasMovimentadas').textContent = movimentadas;
    document.getElementById('obrasPendentes').textContent = pendentes;
    document.getElementById('obrasAntigas').textContent = antigas;
    document.getElementById('obrasProgramadas').textContent = programadas;
    
    var pctMovimentadas = total > 0 ? Math.round((movimentadas / total) * 100) : 0;
    var pctPendentes = total > 0 ? Math.round((pendentes / total) * 100) : 0;
    
    document.getElementById('pctMovimentadas').textContent = pctMovimentadas + '%';
    document.getElementById('pctPendentes').textContent = pctPendentes + '%';
}

// ============================================
// DETALHES: OBRAS POR MÊS
// ============================================
function mostrarDetalhesMensal(mesKey) {
    var container = document.getElementById('detalhesObrasMensal');
    var titulo = document.getElementById('detalhesObrasTitulo');
    var conteudo = document.getElementById('detalhesObrasConteudo');
    
    if (!container || !titulo || !conteudo) return;
    
    var itens = dadosObras.detalhesObrasMensal[mesKey] || [];
    var meses = {'01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril',
                 '05':'Maio','06':'Junho','07':'Julho','08':'Agosto','09':'Setembro',
                 '10':'Outubro','11':'Novembro','12':'Dezembro'};
    var partes = mesKey.split('-');
    var label = (meses[partes[1]] || partes[1]) + '/' + partes[0];
    
    var valorTotalMes = 0;
    itens.forEach(function(item) {
        valorTotalMes += item.valor || 0;
    });
    
    itens.sort(function(a, b) {
        return (b.valor || 0) - (a.valor || 0);
    });
    
    dadosObrasAtuais = itens;
    
    titulo.textContent = '📋 Obras em ' + label + ' (' + itens.length + ' obras) - Valor Total: R$ ' + Math.round(valorTotalMes).toLocaleString('pt-BR');
    container.classList.add('visible');
    
    document.getElementById('searchObrasDetalhes').value = '';
    renderizarDetalhesObras(itens);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// RENDERIZAR DETALHES DE OBRAS
// ============================================
function renderizarDetalhesObras(itens) {
    var conteudo = document.getElementById('detalhesObrasConteudo');
    if (!conteudo) return;
    
    var termo = document.getElementById('searchObrasDetalhes').value.toLowerCase().trim();
    
    var filtrados = itens;
    if (termo) {
        filtrados = itens.filter(function(item) {
            var obraExibicao = item.obraFormatada || item.obra || item.obraOriginal || '';
            return obraExibicao.toLowerCase().includes(termo);
        });
    }
    
    if (filtrados.length === 0) {
        conteudo.innerHTML = '<p style="color:#A0AEC0;text-align:center;padding:20px;">' +
            (termo ? 'Nenhuma obra encontrada para "' + termo + '"' : 'Nenhuma obra registrada') + '</p>';
        return;
    }
    
    var totalGeral = 0;
    filtrados.forEach(function(item) {
        totalGeral += item.valor || 0;
    });
    
    var html = '<table class="tabela-obras-detalhes"><thead><tr><th>Obra</th><th>Data</th><th>Valor Total (R$)</th></tr></thead><tbody>';
    filtrados.forEach(function(item) {
        var valor = item.valor || 0;
        var obraExibicao = item.obraFormatada || item.obra || item.obraOriginal || '-';
        html += '<tr><td><strong>' + obraExibicao + '</strong></td><td>' + (item.data || '-') + '</td><td style="font-weight:600;color:#10B981;">R$ ' + Math.round(valor).toLocaleString('pt-BR') + '</td></tr>';
    });
    html += '</tbody><tfoot><tr style="background:#EDF2F7;font-weight:700;"><td colspan="2" style="text-align:right;">TOTAL:</td><td style="color:#10B981;">R$ ' + Math.round(totalGeral).toLocaleString('pt-BR') + '</td></tr></tfoot></table>';
    conteudo.innerHTML = html;
}

function filtrarDetalhesObras() {
    renderizarDetalhesObras(dadosObrasAtuais);
}

function fecharDetalhesObras() {
    document.getElementById('detalhesObrasMensal').classList.remove('visible');
    dadosObrasAtuais = [];
}

// ============================================
// DETALHES: SITUAÇÃO DAS OBRAS (COM DATA PARA ANTIGAS)
// ============================================
function mostrarDetalhesSituacao(tipo, titulo) {
    var container = document.getElementById('detalhesSituacao');
    var tituloEl = document.getElementById('detalhesSituacaoTitulo');
    var conteudo = document.getElementById('detalhesSituacaoConteudo');
    
    if (!container || !tituloEl || !conteudo) return;
    
    var obras = [];
    var label = '';
    
    if (tipo === 'movimentadas') {
        obras = Array.from(dadosObras.obrasMovimentadas);
        label = '✅ Movimentadas';
    } else if (tipo === 'pendentes') {
        obras = Array.from(dadosObras.obrasPendentes);
        label = '⏳ Pendentes';
    } else if (tipo === 'antigas') {
        obras = Array.from(dadosObras.obrasAntigas);
        label = '🔄 Antigas Corrigidas';
    }
    
    tituloEl.textContent = titulo || label + ' (' + obras.length + ' obras)';
    container.classList.add('visible');
    
    var itensDetalhados = obras.map(function(obra) {
        var info = {
            obra: obra,
            obraFormatada: formatarObraComTraco(obra),
            status: 'N/A',
            etapas: '0',
            situacao: label,
            data: '-' // Valor padrão
        };
        
        if (dadosObras.detalhesProgramacaoCompleta[obra]) {
            info.status = dadosObras.detalhesProgramacaoCompleta[obra].status || 'N/A';
            info.etapas = dadosObras.detalhesProgramacaoCompleta[obra].etapas || '0';
        } else if (dadosObras.detalhesProgramacao[obra]) {
            info.status = dadosObras.detalhesProgramacao[obra].status || 'N/A';
            info.etapas = dadosObras.detalhesProgramacao[obra].etapas || '0';
        }
        
        // Buscar dados do movimento (data e valor)
        if (dadosObras.detalhesMovimentos[obra]) {
            info.ultimaData = dadosObras.detalhesMovimentos[obra].data || '-';
            info.valor = dadosObras.detalhesMovimentos[obra].valor || 0;
            info.data = dadosObras.detalhesMovimentos[obra].data || '-'; // Adiciona a data
        }
        
        return info;
    });
    
    dadosObrasAtuais = itensDetalhados;
    document.getElementById('searchSituacaoDetalhes').value = '';
    renderizarDetalhesSituacao(itensDetalhados);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderizarDetalhesSituacao(itens) {
    var conteudo = document.getElementById('detalhesSituacaoConteudo');
    if (!conteudo) return;
    
    var termo = document.getElementById('searchSituacaoDetalhes').value.toLowerCase().trim();
    
    var filtrados = itens;
    if (termo) {
        filtrados = itens.filter(function(item) {
            var obraExibicao = item.obraFormatada || item.obra || '';
            return obraExibicao.toLowerCase().includes(termo);
        });
    }
    
    if (filtrados.length === 0) {
        conteudo.innerHTML = '<p style="color:#A0AEC0;text-align:center;padding:20px;">' +
            (termo ? 'Nenhuma obra encontrada para "' + termo + '"' : 'Nenhuma obra registrada') + '</p>';
        return;
    }
    
    // Verificar se é a lista de "Antigas Corrigidas" para adicionar a coluna Data
    var isAntigas = filtrados.length > 0 && filtrados[0].situacao === '🔄 Antigas Corrigidas';
    
    var html = '<table class="tabela-obras-detalhes"><thead><tr>';
    html += '<th>Obra</th><th>Status</th><th>Etapas</th>';
    if (isAntigas) {
        html += '<th>Data Movimentação</th>'; // Coluna extra para Antigas
    }
    html += '<th>Situação</th></tr></thead><tbody>';
    
    filtrados.forEach(function(item) {
        var obraExibicao = item.obraFormatada || item.obra || '-';
        html += '<tr><td><strong>' + obraExibicao + '</strong></td>';
        html += '<td><span class="status-badge ' + getStatusClass(item.status) + '" title="' + item.status + '">' + item.status + '</span></td>';
        html += '<td>' + item.etapas + '</td>';
        if (isAntigas) {
            html += '<td>' + (item.data || '-') + '</td>'; // Data da movimentação
        }
        html += '<td>' + item.situacao + '</td></tr>';
    });
    
    html += '</tbody></table>';
    conteudo.innerHTML = html;
}

function filtrarDetalhesSituacao() {
    renderizarDetalhesSituacao(dadosObrasAtuais);
}

function fecharDetalhesSituacao() {
    document.getElementById('detalhesSituacao').classList.remove('visible');
    dadosObrasAtuais = [];
}

// ============================================
// UTILITÁRIOS
// ============================================
function getStatusClass(status) {
    if (!status) return 'status-default';
    var s = status.toLowerCase();
    if (s.includes('concluída') || s.includes('concluido')) return 'status-concluida';
    if (s.includes('cancelada') || s.includes('cancelado')) return 'status-cancelada';
    if (s.includes('programada') || s.includes('programado')) return 'status-programada';
    if (s.includes('reprovada') || s.includes('reprovado')) return 'status-reprovada';
    if (s.includes('suspensão') || s.includes('suspensa')) return 'status-suspensa';
    if (s.includes('pendente')) return 'status-pendente';
    return 'status-default';
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.carregarDadosObras = carregarDadosObras;
window.switchTab = switchTab;
window.filtrarDetalhesObras = filtrarDetalhesObras;
window.fecharDetalhesObras = fecharDetalhesObras;
window.filtrarDetalhesSituacao = filtrarDetalhesSituacao;
window.fecharDetalhesSituacao = fecharDetalhesSituacao;