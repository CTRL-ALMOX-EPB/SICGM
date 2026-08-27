// ============================================
// DASHBOARD PENDÊNCIA DE REQUISIÇÃO - COMPLETO
// ============================================

console.log('🚀 dashboards-pendencia-requisicao.js carregado!');

// ============================================
// 🔥 GET SESSÃO (NOVA VERSÃO - USANDO authService)
// ============================================

function getSessao() {
    console.log('🔍 Verificando autenticação...');
    
    if (typeof authService === 'undefined' || !authService) {
        console.error('❌ authService não disponível');
        window.location.href = '../login.html';
        return null;
    }

    if (!authService.isLoggedIn()) {
        console.error('❌ Usuário não logado');
        window.location.href = '../login.html';
        return null;
    }

    const user = authService.getUserData();
    if (!user) {
        console.error('❌ Dados do usuário não encontrados');
        window.location.href = '../login.html';
        return null;
    }

    console.log(`✅ Sessão válida: ${user.nome} (${user.perfil})`);
    return {
        nome: user.nome,
        matricula: user.matricula,
        perfil: user.perfil,
        timestamp: Date.now()
    };
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

// URLs R2 - Usando binding do Worker (via proxy)
const ARQUIVOS_R2 = {
    movimentosSiago: `${API_URL}/proxy/movimentos-siago`,
    devolucaoCompilada: `${API_URL}/proxy/devolucao-compilada`
};

console.log('📡 URLs R2 configuradas:');
console.log(`   📄 Movimentos Siago: ${ARQUIVOS_R2.movimentosSiago}`);
console.log(`   📄 Devolução Compilada: ${ARQUIVOS_R2.devolucaoCompilada}`);

// ============================================
// VARIÁVEIS GLOBAIS - DASHBOARD ANTIGO (SEPARAÇÃO)
// ============================================

let dadosCompletos = [];
let dadosFiltrados = [];
let dadosExibidos = [];
let itemSelecionado = null;
let abaAtual = 'separacao';
let mesSelecionado = null;
let filtroAtivo = null;

// ============================================
// VARIÁVEIS PARA O DASHBOARD NOVO (MGM)
// ============================================

let dadosMovimentosSiago = {};
let dadosDevolucaoCompilada = [];
let movimentosDoBanco = [];
let aditivosSistemicos = [];
let pendenciasConsolidadas = [];
let dadosFiltradosMGM = [];
let filtroStatusMGMAtivo = null;

let abaAtualMGM = 'mgm';
let itemSelecionadoMGM = null;
let dadosCarregadosMGM = false;

// ============================================
// VARIÁVEIS PARA PROGRAMAÇÃO SIAGO
// ============================================

// As variáveis são gerenciadas pelo programacao-siago.js via window.__*
// Não redeclarar para evitar conflito

// Criar alias local para acesso fácil
function getDadosProgramacaoSiago() {
    return window.__dadosProgramacaoSiago || {};
}

function getEtapasPorObraData() {
    return window.__etapasPorObra || {};
}

function isProgramacaoSiagoCarregado() {
    return window.__dadosProgramacaoSiagoCarregados || false;
}

// ============================================
// VARIÁVEIS PARA FILTRO DE ETAPAS
// ============================================

let filtroEtapasMinimo = 0;

// ============================================
// NOVA VARIÁVEL: ITENS REPRESADOS
// ============================================

let itensRepresados = {
    total: 0,
    itens: []
};

// ============================================
// FUNÇÃO: MOSTRAR TOAST
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

// ============================================
// FUNÇÃO: FORMATAR OBRA PARA EXIBIÇÃO
// ============================================

function formatarObraParaExibicao(obra) {
    if (!obra) return '';
    let limpo = obra.trim().replace(/[^0-9]/g, '');
    if (limpo.length !== 10) return obra;
    return limpo.substring(0, 3) + '-' + 
           limpo.substring(3, 5) + '-' + 
           limpo.substring(5, 10);
}

function normalizarObra(obra) {
    if (!obra) return '';
    let limpo = obra.trim().replace(/[^0-9]/g, '');
    if (limpo.length === 10) return limpo;
    if (limpo.length === 9) return '0' + limpo;
    if (limpo.length < 9) {
        const padStart = 10 - limpo.length;
        return '0'.repeat(padStart) + limpo;
    }
    return obra;
}

function formatarObra(obra) {
    if (!obra) return '';
    let limpo = obra.trim().replace(/[^0-9]/g, '');
    if (limpo.length !== 10) return obra;
    return limpo.substring(0, 3) + '-' + 
           limpo.substring(3, 5) + '-' + 
           limpo.substring(5, 10);
}

// ============================================
// FUNÇÃO: OBTER MÊS DA DATA
// ============================================

function getMesAno(dataString) {
    if (!dataString) return null;
    try {
        const data = new Date(dataString);
        const ano = data.getUTCFullYear();
        const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}`;
    } catch {
        return null;
    }
}

// ============================================
// FUNÇÃO: FORMATAR MÊS PARA EXIBIÇÃO
// ============================================

function formatarMesAno(mesAno) {
    if (!mesAno) return '';
    const [ano, mes] = mesAno.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]} ${ano}`;
}

// ============================================
// FUNÇÃO: FORMATAR VALOR PARA MOEDA
// ============================================

function formatarValor(valor) {
    if (!valor || valor === 0) return 'R$ 0,00';
    return 'R$ ' + valor.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ============================================
// FUNÇÃO: FORMATAR DATA
// ============================================

function formatarData(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        if (!isNaN(data)) {
            const dia = String(data.getUTCDate()).padStart(2, '0');
            const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
            const ano = data.getUTCFullYear();
            return `${dia}.${mes}.${ano}`;
        }
    } catch {
        return dataString;
    }
    return dataString;
}

// ============================================
// FUNÇÃO: BUSCAR PENDÊNCIAS DE BAIXA
// ============================================

async function buscarPendenciasBaixa() {
    console.log('📡 Buscando pendências de baixa...');
    try {
        const response = await fetch(`${API_URL}/pendencia-baixa-completo`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        const pendencias = data.data || [];
        console.log(`✅ ${pendencias.length} pendências de baixa carregadas`);
        return pendencias;
    } catch (error) {
        console.error('❌ Erro ao buscar pendências de baixa:', error);
        return [];
    }
}

// ============================================
// FUNÇÕES PARA O DASHBOARD MGM (NOVO)
// ============================================

async function buscarMovimentosDoBanco() {
    console.log('📡 Buscando movimentos do banco de dados...');
    try {
        const response = await fetch(`${API_URL}/movimento?limit=10000`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        movimentosDoBanco = data.data || [];
        
        console.log(`✅ ${movimentosDoBanco.length} movimentos carregados do banco`);
        
        let multiplosContados = 0;
        movimentosDoBanco.forEach(m => {
            const tipoMgm = (m.tipo_mgm || '').toUpperCase();
            if (tipoMgm === 'MULTIPLO' || tipoMgm === 'MULTIPLA') {
                multiplosContados++;
                m.tipo_mgm = 'MULTIPLO';
                if (typeof m.datas_programacao === 'string') {
                    m.datas_programacao = m.datas_programacao.split(',').map(d => d.trim());
                }
                if (!m.datas_programacao) {
                    m.datas_programacao = [];
                }
                if (!m.qtd_linhas) {
                    m.qtd_linhas = m.datas_programacao.length || 1;
                }
            }
        });
        
        console.log(`🔀 MULTIPLOS identificados: ${multiplosContados}`);
        
        const multiplos = movimentosDoBanco.filter(m => m.tipo_mgm === 'MULTIPLO');
        if (multiplos.length > 0) {
            console.log('📋 MULTIPLOS encontrados:');
            multiplos.forEach(m => {
                const datas = m.datas_programacao ? m.datas_programacao.join(', ') : 'N/A';
                console.log(`   📌 ${m.cod_movimentacao} | Obra: ${m.obra} | ${m.qtd_linhas || 0} linhas | Datas: ${datas}`);
            });
        }
        
        return movimentosDoBanco;
    } catch (error) {
        console.error('❌ Erro ao buscar movimentos:', error);
        return [];
    }
}

async function buscarAditivosSistemicos() {
    console.log('📡 Buscando aditivos sistêmicos do banco de dados...');
    try {
        const response = await fetch(`${API_URL}/aditivo-sistemico-completo?limit=10000`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        aditivosSistemicos = data.data || [];
        console.log(`✅ ${aditivosSistemicos.length} aditivos sistêmicos carregados`);
        return aditivosSistemicos;
    } catch (error) {
        console.error('❌ Erro ao buscar aditivos sistêmicos:', error);
        return [];
    }
}

async function carregarArquivoR2(url, nomeArquivo) {
    console.log(`📥 Carregando ${nomeArquivo}...`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const texto = await response.text();
        console.log(`✅ ${nomeArquivo} carregado (${texto.split('\n').length} linhas)`);
        return texto;
    } catch (error) {
        console.error(`❌ Erro ao carregar ${nomeArquivo}:`, error);
        throw error;
    }
}

function parsearMovimentosSiago(texto) {
    console.log('🔄 Parseando movimentos_siago.txt...');
    const linhas = texto.trim().split('\n');
    
    if (linhas.length < 2) {
        console.warn('⚠️ Arquivo vazio ou com apenas cabeçalho');
        return {};
    }
    
    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    console.log(`📋 Cabeçalho: ${cabecalho.length} colunas`);
    
    const indices = {
        numdoc_mov: cabecalho.indexOf('numdoc_mov'),
        orgmov: cabecalho.indexOf('orgmov'),
        sigla_mov_mat: cabecalho.indexOf('sigla_mov_mat'),
        dscmat: cabecalho.indexOf('dscmat'),
        qtdmov: cabecalho.indexOf('qtdmov'),
        nummov: cabecalho.indexOf('nummov'),
        codmat_mov: cabecalho.indexOf('codmat_mov'),
        datamov: cabecalho.indexOf('datamov'),
        codreg: cabecalho.indexOf('codreg'),
        nomereg: cabecalho.indexOf('nomereg'),
        vlrult_cot: cabecalho.indexOf('vlrult_cot')
    };
    
    const movimentos = {};
    let linhasProcessadas = 0;
    
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const partes = linha.split('\t');
        const numdocMov = partes[indices.numdoc_mov]?.trim() || '';
        
        if (!numdocMov) continue;
        
        if (!movimentos[numdocMov]) {
            movimentos[numdocMov] = {
                numdoc_mov: numdocMov,
                orgmov: partes[indices.orgmov]?.trim() || '',
                sigla_mov_mat: partes[indices.sigla_mov_mat]?.trim() || '',
                nummov: partes[indices.nummov]?.trim() || '',
                datamov: partes[indices.datamov]?.trim() || '',
                codreg: partes[indices.codreg]?.trim() || '',
                nomereg: partes[indices.nomereg]?.trim() || '',
                itens: []
            };
        }
        
        const item = {
            codmat_mov: partes[indices.codmat_mov]?.trim() || '',
            dscmat: partes[indices.dscmat]?.trim() || '',
            qtdmov: parseFloat(partes[indices.qtdmov]?.trim().replace(',', '.') || '0'),
            vlrult_cot: parseFloat(partes[indices.vlrult_cot]?.trim().replace(',', '.') || '0')
        };
        
        if (item.codmat_mov && item.dscmat) {
            movimentos[numdocMov].itens.push(item);
            linhasProcessadas++;
        }
    }
    
    console.log(`✅ ${Object.keys(movimentos).length} movimentos processados com ${linhasProcessadas} itens`);
    return movimentos;
}

function parsearDevolucaoCompilada(texto) {
    console.log('🔄 Parseando devolucao_compilada.txt...');
    const linhas = texto.trim().split('\n');
    
    if (linhas.length < 2) {
        console.warn('⚠️ Arquivo vazio ou com apenas cabeçalho');
        return [];
    }
    
    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    console.log(`📋 Cabeçalho: ${cabecalho.length} colunas`);
    
    const indices = {
        obra: cabecalho.indexOf('OBRA'),
        data: cabecalho.indexOf('DATA'),
        codigo: cabecalho.indexOf('CÓDIGO'),
        descricao: cabecalho.indexOf('DESCRIÇÃO'),
        qtdAplicada: cabecalho.indexOf('QTD. APLICADA'),
        qtdDma: cabecalho.indexOf('QTD. DMA NOVO'),
        arquivo: cabecalho.indexOf('ARQUIVO')
    };
    
    console.log('📌 Índices mapeados:', indices);
    
    const itens = [];
    let linhasProcessadas = 0;
    let datasInvalidas = 0;
    
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const partes = linha.split('\t');
        if (partes.length < 7) continue;
        
        let dataOriginal = partes[indices.data]?.trim() || '';
        let dataConvertida = dataOriginal;
        
        if (dataOriginal) {
            dataOriginal = dataOriginal.trim();
            
            if (dataOriginal.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                const partesData = dataOriginal.split('.');
                const dia = partesData[0].padStart(2, '0');
                const mes = partesData[1].padStart(2, '0');
                const ano = partesData[2];
                const anoCompleto = ano.length === 2 ? '20' + ano : ano;
                dataConvertida = `${anoCompleto}-${mes}-${dia}`;
            }
            else if (dataOriginal.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const partesData = dataOriginal.split('/');
                const dia = partesData[0].padStart(2, '0');
                const mes = partesData[1].padStart(2, '0');
                const ano = partesData[2];
                const anoCompleto = ano.length === 2 ? '20' + ano : ano;
                dataConvertida = `${anoCompleto}-${mes}-${dia}`;
            }
            else if (dataOriginal.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dataConvertida = dataOriginal;
            }
            else {
                const regexMatch = dataOriginal.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
                if (regexMatch) {
                    const dia = regexMatch[1].padStart(2, '0');
                    const mes = regexMatch[2].padStart(2, '0');
                    let ano = regexMatch[3];
                    if (ano.length === 2) ano = '20' + ano;
                    dataConvertida = `${ano}-${mes}-${dia}`;
                } else {
                    try {
                        const testDate = new Date(dataOriginal);
                        if (!isNaN(testDate)) {
                            const dia = String(testDate.getUTCDate()).padStart(2, '0');
                            const mes = String(testDate.getUTCMonth() + 1).padStart(2, '0');
                            const ano = testDate.getUTCFullYear();
                            dataConvertida = `${ano}-${mes}-${dia}`;
                        }
                    } catch (e) {}
                }
            }
        }
        
        const item = {
            obra: partes[indices.obra]?.trim() || '',
            data: dataConvertida,
            dataOriginal: dataOriginal,
            codigo: partes[indices.codigo]?.trim() || '',
            descricao: partes[indices.descricao]?.trim() || '',
            qtdAplicada: parseFloat(partes[indices.qtdAplicada]?.trim().replace(',', '.') || '0'),
            qtdDma: parseFloat(partes[indices.qtdDma]?.trim().replace(',', '.') || '0'),
            arquivo: partes[indices.arquivo]?.trim() || ''
        };
        
        if (item.obra && item.codigo) {
            itens.push(item);
            linhasProcessadas++;
        }
    }
    
    console.log(`✅ ${linhasProcessadas} itens processados (${datasInvalidas} datas inválidas corrigidas)`);
    return itens;
}

function consolidarPendenciasMGM(devolucaoItens, movimentosSiago, movimentosBanco, aditivosSistemicos) {
    console.log('🔄 Consolidando pendências MGM...');
    console.log(`📊 Devolução: ${devolucaoItens.length} itens`);
    console.log(`📊 Movimentos Siago: ${Object.keys(movimentosSiago).length}`);
    console.log(`📊 Movimentos Banco: ${movimentosBanco.length}`);
    console.log(`📊 Aditivos: ${aditivosSistemicos.length}`);
    
    const itensComAplicada = devolucaoItens.filter(item => {
        const qtdAplicada = parseFloat(item.qtdAplicada) || 0;
        return qtdAplicada > 0;
    });
    
    console.log(`📊 Itens com QTD. APLICADA > 0: ${itensComAplicada.length} (de ${devolucaoItens.length} total)`);
    
    if (itensComAplicada.length === 0) {
        console.warn('⚠️ Nenhum item com QTD. APLICADA > 0 encontrado!');
        return [];
    }
    
    const documentosMultiplos = new Set();
    const documentosPorObraDocumento = {};
    
    console.log('🔍 IDENTIFICANDO DOCUMENTOS MÚLTIPLOS NA CONSOLIDAÇÃO...');
    console.log(`📊 Total de movimentosBanco: ${movimentosBanco.length}`);
    
    movimentosBanco.forEach(m => {
        const obraNorm = normalizarObra(m.obra);
        const tipoMgm = (m.tipo_mgm || '').toUpperCase();
        
        if (m.cod_movimentacao && (tipoMgm === 'MULTIPLO' || tipoMgm === 'MULTIPLA')) {
            documentosMultiplos.add(m.cod_movimentacao);
            const chaveDoc = `${obraNorm}|${m.cod_movimentacao}`;
            if (!documentosPorObraDocumento[chaveDoc]) {
                documentosPorObraDocumento[chaveDoc] = [];
            }
            documentosPorObraDocumento[chaveDoc].push(m);
        }
    });
    
    if (documentosMultiplos.size === 0) {
        console.log('⚠️ Nenhum MULTIPLO pelo tipo_mgm, tentando por cod_movimentacao repetido...');
        
        const gruposPorCodigo = {};
        movimentosBanco.forEach(m => {
            if (!m.cod_movimentacao) return;
            const chave = `${m.cod_movimentacao}|${normalizarObra(m.obra)}`;
            if (!gruposPorCodigo[chave]) {
                gruposPorCodigo[chave] = [];
            }
            gruposPorCodigo[chave].push(m);
        });
        
        Object.keys(gruposPorCodigo).forEach(chave => {
            if (gruposPorCodigo[chave].length > 1) {
                console.log(`🔀 Documento ${chave} tem ${gruposPorCodigo[chave].length} linhas`);
                gruposPorCodigo[chave].forEach(m => {
                    const obraNorm = normalizarObra(m.obra);
                    const codMov = m.cod_movimentacao;
                    documentosMultiplos.add(codMov);
                    const chaveDoc = `${obraNorm}|${codMov}`;
                    if (!documentosPorObraDocumento[chaveDoc]) {
                        documentosPorObraDocumento[chaveDoc] = [];
                    }
                    if (!documentosPorObraDocumento[chaveDoc].includes(m)) {
                        documentosPorObraDocumento[chaveDoc].push(m);
                    }
                });
            }
        });
    }
    
    console.log(`✅ Documentos MULTIPLOS identificados: ${documentosMultiplos.size}`);
    if (documentosMultiplos.size > 0) {
        console.log(`📋 Códigos: ${Array.from(documentosMultiplos).join(', ')}`);
    }
    
    const movimentosPorDocumento = {};
    const movimentosPorObraData = {};
    
    movimentosBanco.forEach(m => {
        const obraNorm = normalizarObra(m.obra);
        
        if (m.cod_movimentacao) {
            if (!movimentosPorDocumento[m.cod_movimentacao]) {
                movimentosPorDocumento[m.cod_movimentacao] = [];
            }
            movimentosPorDocumento[m.cod_movimentacao].push(m);
        }
        
        const chave = `${obraNorm}|${m.data_programacao}`;
        if (!movimentosPorObraData[chave]) {
            movimentosPorObraData[chave] = [];
        }
        movimentosPorObraData[chave].push(m);
    });
    
    const aditivosPorDocumento = {};
    const aditivosPorObraData = {};
    
    aditivosSistemicos.forEach(aditivo => {
        const obraNorm = normalizarObra(aditivo.obra);
        const itens = aditivo.itens || [];
        
        itens.forEach(item => {
            const numDoc = item.numero_documento || '';
            if (numDoc) {
                if (!aditivosPorDocumento[numDoc]) {
                    aditivosPorDocumento[numDoc] = [];
                }
                aditivosPorDocumento[numDoc].push({
                    aditivo: aditivo,
                    item: item,
                    codigo: item.codigo,
                    descricao: item.descricao,
                    obra: obraNorm,
                    data_programacao: aditivo.data_programacao,
                    numero_documento: numDoc,
                    tipo_movimento: 'RMA'
                });
                
                const chave = `${obraNorm}|${aditivo.data_programacao}`;
                if (!aditivosPorObraData[chave]) {
                    aditivosPorObraData[chave] = [];
                }
                if (!aditivosPorObraData[chave].includes(numDoc)) {
                    aditivosPorObraData[chave].push(numDoc);
                }
            }
        });
    });
    
    console.log(`📊 ${Object.keys(aditivosPorDocumento).length} documentos com aditivos`);
    
    const gruposMultiplos = {};
    const gruposUnicos = {};
    
    console.log('📊 Agrupando itens com QTD. APLICADA > 0...');
    
    itensComAplicada.forEach(item => {
        const obraNorm = normalizarObra(item.obra);
        const documento = item.arquivo;
        const qtdAplicada = parseFloat(item.qtdAplicada) || 0;
        const qtdEsperada = qtdAplicada;
        
        if (qtdAplicada === 0) {
            return;
        }
        
        const isMultiplo = documentosMultiplos.has(documento) || documentosMultiplos.has(item.codigo);
        
        if (isMultiplo) {
            const chave = `${documento}|${obraNorm}|${item.codigo}`;
            
            if (!gruposMultiplos[chave]) {
                gruposMultiplos[chave] = {
                    documento: documento,
                    obra: obraNorm,
                    codigo: item.codigo,
                    descricao: item.descricao,
                    qtdEsperada: 0,
                    datas: [],
                    itens: [],
                    movimentos: documentosPorObraDocumento[`${obraNorm}|${documento}`] || []
                };
            }
            
            const grupo = gruposMultiplos[chave];
            grupo.qtdEsperada += qtdEsperada;
            grupo.itens.push(item);
            
            if (item.data && !grupo.datas.includes(item.data)) {
                grupo.datas.push(item.data);
            }
        } else {
            const chave = `${obraNorm}|${item.data}|${item.codigo}`;
            
            if (!gruposUnicos[chave]) {
                gruposUnicos[chave] = {
                    obra: obraNorm,
                    data: item.data,
                    codigo: item.codigo,
                    descricao: item.descricao,
                    qtdEsperada: 0,
                    documentos: [],
                    itens: []
                };
            }
            
            const grupo = gruposUnicos[chave];
            grupo.qtdEsperada += qtdEsperada;
            grupo.itens.push(item);
            
            if (documento && !grupo.documentos.includes(documento)) {
                grupo.documentos.push(documento);
            }
        }
    });
    
    console.log(`📊 ${Object.keys(gruposMultiplos).length} grupos para MGM MÚLTIPLA`);
    console.log(`📊 ${Object.keys(gruposUnicos).length} grupos para MGM ÚNICA`);
    
    if (Object.keys(gruposMultiplos).length === 0 && documentosMultiplos.size > 0) {
        console.log('⚠️ Grupos múltiplos vazio, mas documentos múltiplos existem. Criando grupos...');
        
        documentosMultiplos.forEach(doc => {
            const movimentos = documentosPorObraDocumento[Object.keys(documentosPorObraDocumento).find(k => k.includes(doc))] || [];
            
            if (movimentos.length === 0) {
                console.log(`   ⚠️ Documento ${doc} não tem movimentos associados`);
                return;
            }
            
            const obraNorm = normalizarObra(movimentos[0].obra);
            
            const itensDoc = itensComAplicada.filter(item => item.arquivo === doc);
            
            if (itensDoc.length === 0) {
                console.log(`   ⚠️ Documento ${doc} não tem itens com QTD. APLICADA > 0`);
                return;
            }
            
            itensDoc.forEach(item => {
                const chave = `${doc}|${obraNorm}|${item.codigo}`;
                if (!gruposMultiplos[chave]) {
                    gruposMultiplos[chave] = {
                        documento: doc,
                        obra: obraNorm,
                        codigo: item.codigo,
                        descricao: item.descricao,
                        qtdEsperada: parseFloat(item.qtdAplicada) || 0,
                        datas: [item.data],
                        itens: [item],
                        movimentos: [movimentos[0]]
                    };
                    console.log(`   ✅ Grupo criado: ${chave}`);
                }
            });
        });
        
        console.log(`✅ ${Object.keys(gruposMultiplos).length} grupos criados a partir de documentos múltiplos`);
    }
    
    const pendencias = [];
    const itensRepresadosTemp = [];
    let totalRepresados = 0;
    let gruposProcessados = 0;
    let gruposUnicosAtendidos = 0;
    let gruposMultiplosAtendidos = 0;
    
    for (const chave in gruposUnicos) {
        const grupo = gruposUnicos[chave];
        const { obra, data, codigo, descricao, qtdEsperada, documentos } = grupo;
        
        gruposProcessados++;
        if (gruposProcessados % 500 === 0) {
            console.log(`📊 Processando grupo ${gruposProcessados}/${Object.keys(gruposUnicos).length + Object.keys(gruposMultiplos).length}...`);
        }
        
        const chaveObraData = `${obra}|${data}`;
        let movimentosEncontrados = movimentosPorObraData[chaveObraData] || [];
        let fontes = [];
        let documentosEncontrados = [];
        
        if (movimentosEncontrados.length > 0) {
            movimentosEncontrados.forEach(m => {
                if (m.cod_movimentacao && !documentosEncontrados.includes(m.cod_movimentacao)) {
                    documentosEncontrados.push(m.cod_movimentacao);
                    fontes.push({
                        documento: m.cod_movimentacao,
                        tipo: 'MOVIMENTO',
                        dados: m,
                        tipo_movimento: m.tipo_movimento || ''
                    });
                }
            });
        }
        
        const aditivosDocs = aditivosPorObraData[chaveObraData] || [];
        if (aditivosDocs.length > 0) {
            aditivosDocs.forEach(doc => {
                if (!documentosEncontrados.includes(doc)) {
                    documentosEncontrados.push(doc);
                    fontes.push({
                        documento: doc,
                        tipo: 'ADITIVO',
                        dados: null,
                        tipo_movimento: 'RMA'
                    });
                }
            });
        }
        
        let tipo_mgm = 'UNICO';
        let statusBanco = null;
        let tipoMovimento = null;
        
        if (movimentosEncontrados.length > 0) {
            const primeiro = movimentosEncontrados[0];
            tipo_mgm = primeiro.tipo_mgm || 'UNICO';
            statusBanco = primeiro.status || 'PENDENTE';
            tipoMovimento = primeiro.tipo_movimento || null;
        }
        
        let qtdRMA = 0;
        let qtdDMA = 0;
        let docsRMA = [];
        let docsDMA = [];
        let docsUsados = [];
        let distribuicao = [];
        let valorUnitario = 0;
        let siglaMovimento = '';
        let detalhesDocumentos = [];
        let qtdTotalDocumentos = 0;
        
        for (const fonte of fontes) {
            const documento = fonte.documento;
            const movimentoSiago = movimentosSiago[documento];
            
            if (movimentoSiago) {
                const itemSiago = movimentoSiago.itens.find(i => 
                    i.codmat_mov === codigo || 
                    i.codmat_mov === codigo.padStart(5, '0')
                );
                
                if (itemSiago && itemSiago.qtdmov > 0) {
                    const qtdItem = itemSiago.qtdmov;
                    qtdTotalDocumentos += qtdItem;
                    valorUnitario = itemSiago.vlrult_cot || 0;
                    siglaMovimento = movimentoSiago.sigla_mov_mat || '';
                    
                    const tipoMov = fonte.tipo_movimento || movimentoSiago.orgmov || '';
                    const isRMA = tipoMov.toUpperCase() === 'RMA' || tipoMov.toUpperCase().includes('RMA');
                    
                    if (isRMA) {
                        qtdRMA += qtdItem;
                        docsRMA.push(documento);
                    } else {
                        qtdDMA += qtdItem;
                        docsDMA.push(documento);
                    }
                    
                    if (!docsUsados.includes(documento)) {
                        docsUsados.push(documento);
                    }
                    
                    detalhesDocumentos.push({
                        documento: documento,
                        fonte: fonte.tipo,
                        quantidade: qtdItem,
                        tipo: isRMA ? 'RMA' : 'DMA',
                        descricao_item: itemSiago.dscmat || ''
                    });
                    
                    distribuicao.push({
                        documento: documento,
                        fonte: fonte.tipo,
                        quantidade: qtdItem,
                        data: data,
                        tipo: isRMA ? 'RMA' : 'DMA'
                    });
                }
            }
        }
        
        let qtdEfetiva = qtdRMA - qtdDMA;
        let pendenciaRMA = 0;
        let pendenciaDMA = 0;
        let status = 'PENDENTE';
        let motivo = '';
        let sobra = 0;
        let falta = 0;
        
        if (qtdEfetiva === 0 && qtdTotalDocumentos === 0) {
            status = 'PENDENTE';
            motivo = 'Nenhum movimento ou aditivo encontrado';
            pendenciaRMA = qtdEsperada;
        } else if (qtdEfetiva === 0 && qtdTotalDocumentos > 0) {
            status = 'PENDENTE';
            motivo = `RMA (${qtdRMA}) e DMA (${qtdDMA}) se cancelam - efetivo 0`;
            pendenciaRMA = qtdEsperada;
        } else if (qtdEfetiva < 0) {
            status = 'PENDENTE';
            motivo = `DMA (${qtdDMA}) excede RMA (${qtdRMA})`;
            pendenciaRMA = Math.abs(qtdEfetiva) + qtdEsperada;
        } else if (qtdEfetiva > 0) {
            if (qtdEfetiva > qtdEsperada) {
                pendenciaDMA = qtdEfetiva - qtdEsperada;
                status = 'SOBRA';
                motivo = `Excedente de ${pendenciaDMA.toFixed(0)} unidades (precisa de DMA)`;
                sobra = pendenciaDMA;
            } else if (qtdEfetiva >= qtdEsperada) {
                status = 'ATENDIDO';
                motivo = `Atendido (RMA: ${qtdRMA}, DMA: ${qtdDMA})`;
                gruposUnicosAtendidos++;
            } else if (qtdEfetiva < qtdEsperada) {
                pendenciaRMA = qtdEsperada - qtdEfetiva;
                status = 'PARCIAL';
                motivo = `Faltam ${pendenciaRMA.toFixed(0)} unidades (precisa de RMA)`;
                falta = pendenciaRMA;
            }
        }
        
        const docsStr = docsUsados.length > 0 ? docsUsados.join(', ') : 'Nenhum';
        const docsRMAStr = docsRMA.length > 0 ? docsRMA.join(', ') : 'Nenhum';
        const docsDMAStr = docsDMA.length > 0 ? docsDMA.join(', ') : 'Nenhum';
        const temAditivos = fontes.some(f => f.tipo === 'ADITIVO');
        
        if (qtdEsperada > 0 || qtdRMA > 0 || qtdDMA > 0) {
            pendencias.push({
                obra: obra,
                obraFormatada: formatarObra(obra),
                data: data,
                codigo: codigo,
                descricao: descricao,
                qtdEsperada: qtdEsperada,
                qtdRMA: qtdRMA,
                qtdDMA: qtdDMA,
                qtdEfetiva: qtdEfetiva,
                qtdEncontrada: qtdEfetiva > 0 ? qtdEfetiva : 0,
                pendenciaRMA: pendenciaRMA,
                pendenciaDMA: pendenciaDMA,
                sobra: sobra,
                falta: falta,
                status: status,
                motivo: motivo,
                documentosEncontrados: documentosEncontrados,
                documentosUsados: docsUsados,
                documentosStr: docsStr,
                documentosRMA: docsRMA,
                documentosRMAStr: docsRMAStr,
                documentosDMA: docsDMA,
                documentosDMAStr: docsDMAStr,
                qtdDocumentos: docsUsados.length,
                totalDocumentos: documentosEncontrados.length,
                temMultiplasMGM: false,
                tipo_mgm: tipo_mgm,
                distribuicao: distribuicao,
                detalhesDocumentos: detalhesDocumentos,
                temAditivos: temAditivos,
                temMovimentos: fontes.some(f => f.tipo === 'MOVIMENTO'),
                valor_unitario: valorUnitario,
                tipoMovimento: tipoMovimento,
                siglaMovimento: siglaMovimento,
                statusBanco: statusBanco,
                fontes: fontes,
                isMultipla: false,
                qtdTotalDocumentos: qtdTotalDocumentos
            });
        }
    }
    
    for (const chave in gruposMultiplos) {
        const grupo = gruposMultiplos[chave];
        const { documento, obra, codigo, descricao, qtdEsperada, datas, movimentos } = grupo;
        
        gruposProcessados++;
        console.log(`🔀 Processando MÚLTIPLA: ${documento} | ${codigo} | ${qtdEsperada} esperada | ${movimentos.length} datas`);
        
        const movimentoSiago = movimentosSiago[documento];
        let qtdRMA = 0;
        let qtdDMA = 0;
        let docsRMA = [];
        let docsDMA = [];
        let valorUnitario = 0;
        let siglaMovimento = '';
        let docsUsados = [];
        let tipoMovimentoDoc = '';
        
        if (movimentoSiago) {
            const itemSiago = movimentoSiago.itens.find(i => 
                i.codmat_mov === codigo || 
                i.codmat_mov === codigo.padStart(5, '0')
            );
            
            if (itemSiago && itemSiago.qtdmov > 0) {
                tipoMovimentoDoc = movimentoSiago.orgmov || '';
                const isRMA = tipoMovimentoDoc.toUpperCase() === 'RMA' || tipoMovimentoDoc.toUpperCase().includes('RMA');
                const qtdItem = itemSiago.qtdmov;
                valorUnitario = itemSiago.vlrult_cot || 0;
                siglaMovimento = movimentoSiago.sigla_mov_mat || '';
                docsUsados.push(documento);
                
                if (isRMA) {
                    qtdRMA = qtdItem;
                    docsRMA.push(documento);
                    console.log(`   📦 RMA: ${qtdRMA} unidades`);
                } else {
                    qtdDMA = qtdItem;
                    docsDMA.push(documento);
                    console.log(`   📦 DMA: ${qtdDMA} unidades`);
                }
            } else {
                console.log(`   ⚠️ Item ${codigo} não encontrado no Siago para ${documento}`);
            }
        } else {
            console.log(`   ⚠️ Documento ${documento} não encontrado no Siago`);
        }
        
        const pendenciasExistentes = pendencias.filter(p => 
            p.obra === obra && p.codigo === codigo && p.temMultiplasMGM === false
        );
        
        let pendenciaRMA = 0;
        let pendenciaDMA = 0;
        
        pendenciasExistentes.forEach(p => {
            pendenciaRMA += p.pendenciaRMA || 0;
            pendenciaDMA += p.pendenciaDMA || 0;
        });
        
        console.log(`   📊 Pendências existentes: RMA=${pendenciaRMA}, DMA=${pendenciaDMA}`);
        console.log(`   📊 Saldo Múltipla: RMA=${qtdRMA}, DMA=${qtdDMA}`);
        
        let saldoRMA = qtdRMA;
        let saldoDMA = qtdDMA;
        let rmaUsado = 0;
        let dmaUsado = 0;
        let represadosRMA = 0;
        let represadosDMA = 0;
        let status = 'PENDENTE';
        let motivo = '';
        let pendenciaRMAFinal = pendenciaRMA;
        let pendenciaDMAFinal = pendenciaDMA;
        
        if (pendenciaRMA > 0 && saldoRMA > 0) {
            const usado = Math.min(pendenciaRMA, saldoRMA);
            rmaUsado = usado;
            pendenciaRMAFinal = pendenciaRMA - usado;
            saldoRMA -= usado;
            console.log(`   🔄 RMA da múltipla usado para cobrir pendência RMA: ${usado}`);
        }
        
        if (pendenciaDMA > 0 && saldoDMA > 0) {
            const usado = Math.min(pendenciaDMA, saldoDMA);
            dmaUsado = usado;
            pendenciaDMAFinal = pendenciaDMA - usado;
            saldoDMA -= usado;
            console.log(`   🔄 DMA da múltipla usado para cobrir pendência DMA: ${usado}`);
        }
        
        if (saldoRMA > 0) {
            represadosRMA = saldoRMA;
            totalRepresados += saldoRMA;
            itensRepresadosTemp.push({
                documento: documento,
                obra: obra,
                codigo: codigo,
                descricao: descricao,
                quantidade: saldoRMA,
                tipo: 'RMA',
                motivo: 'Excedente de RMA após corrigir pendências'
            });
            console.log(`   📌 ${saldoRMA} unidades de RMA REPRESADAS`);
        }
        
        if (saldoDMA > 0) {
            represadosDMA = saldoDMA;
            totalRepresados += saldoDMA;
            itensRepresadosTemp.push({
                documento: documento,
                obra: obra,
                codigo: codigo,
                descricao: descricao,
                quantidade: saldoDMA,
                tipo: 'DMA',
                motivo: 'Excedente de DMA após corrigir pendências'
            });
            console.log(`   📌 ${saldoDMA} unidades de DMA REPRESADAS`);
        }
        
        if (pendenciaRMAFinal === 0 && pendenciaDMAFinal === 0) {
            status = 'ATENDIDO';
            motivo = 'Todas as pendências corrigidas pela MGM Múltipla';
            gruposMultiplosAtendidos++;
        } else if (pendenciaRMAFinal > 0 || pendenciaDMAFinal > 0) {
            status = 'PARCIAL';
            motivo = `Pendências restantes: RMA=${pendenciaRMAFinal}, DMA=${pendenciaDMAFinal}`;
        }
        
        if (pendenciasExistentes.length > 0 || qtdRMA > 0 || qtdDMA > 0) {
            pendenciasExistentes.forEach(p => {
                p.status = status;
                p.motivo = motivo + ' (corrigido pela MGM Múltipla)';
                p.pendenciaRMA = pendenciaRMAFinal;
                p.pendenciaDMA = pendenciaDMAFinal;
                p.qtdEncontrada = p.qtdEsperada - pendenciaRMAFinal + pendenciaDMAFinal;
                p.temMultiplasMGM = true;
                p.isMultipla = true;
            });
            
            const docsStr = docsUsados.length > 0 ? docsUsados.join(', ') : 'Nenhum';
            const docsRMAStr = docsRMA.length > 0 ? docsRMA.join(', ') : 'Nenhum';
            const docsDMAStr = docsDMA.length > 0 ? docsDMA.join(', ') : 'Nenhum';
            
            if (qtdRMA > 0 || qtdDMA > 0 || pendenciaRMAFinal > 0 || pendenciaDMAFinal > 0) {
                pendencias.push({
                    obra: obra,
                    obraFormatada: formatarObra(obra),
                    data: datas.length > 0 ? datas[0] : '',
                    codigo: codigo,
                    descricao: descricao,
                    qtdEsperada: qtdEsperada,
                    qtdRMA: qtdRMA,
                    qtdDMA: qtdDMA,
                    qtdEfetiva: qtdRMA - qtdDMA,
                    qtdEncontrada: qtdRMA - qtdDMA,
                    pendenciaRMA: pendenciaRMAFinal,
                    pendenciaDMA: pendenciaDMAFinal,
                    sobra: 0,
                    falta: pendenciaRMAFinal + pendenciaDMAFinal,
                    represados: represadosRMA + represadosDMA,
                    status: status,
                    motivo: motivo,
                    documento: documento,
                    documentosUsados: docsUsados,
                    documentosStr: docsStr,
                    documentosRMA: docsRMA,
                    documentosRMAStr: docsRMAStr,
                    documentosDMA: docsDMA,
                    documentosDMAStr: docsDMAStr,
                    qtdDocumentos: docsUsados.length,
                    totalDocumentos: 1,
                    temMultiplasMGM: true,
                    isMultipla: true,
                    tipo_mgm: 'MULTIPLO',
                    distribuicao: [],
                    temAditivos: false,
                    temMovimentos: true,
                    valor_unitario: valorUnitario,
                    siglaMovimento: siglaMovimento,
                    datas: datas,
                    qtdDisponivel: qtdRMA - qtdDMA,
                    tipoMovimentoDoc: tipoMovimentoDoc,
                    rmaUsado: rmaUsado,
                    dmaUsado: dmaUsado,
                    represadosRMA: represadosRMA,
                    represadosDMA: represadosDMA,
                    pendenciasCorrigidas: pendenciasExistentes.length
                });
            }
        }
    }
    
    itensRepresados = {
        total: totalRepresados,
        itens: itensRepresadosTemp
    };
    
    console.log(`✅ ${pendencias.length} pendências MGM consolidadas`);
    console.log(`📊 ${gruposUnicosAtendidos} grupos ÚNICOS atendidos`);
    console.log(`📊 ${gruposMultiplosAtendidos} grupos MÚLTIPLOS que corrigiram pendências`);
    console.log(`📊 Represados: ${totalRepresados.toFixed(2)} unidades`);
    console.log(`📊 ${itensRepresadosTemp.length} itens represados`);
    
    return pendencias;
}

async function carregarDadosMGM() {
    console.log('🚀 Iniciando carregamento dos dados MGM...');
    
    try {
        if (dadosCarregadosMGM) {
            console.log('📊 Dados MGM já carregados, renderizando...');
            renderizarDashboardMGM();
            return true;
        }
        
        const [textoMovimentos, textoDevolucao, movimentosBanco, aditivos] = await Promise.all([
            carregarArquivoR2(ARQUIVOS_R2.movimentosSiago, 'movimentos_siago.txt'),
            carregarArquivoR2(ARQUIVOS_R2.devolucaoCompilada, 'devolucao_compilada.txt'),
            buscarMovimentosDoBanco(),
            buscarAditivosSistemicos()
        ]);
        
        dadosMovimentosSiago = parsearMovimentosSiago(textoMovimentos);
        dadosDevolucaoCompilada = parsearDevolucaoCompilada(textoDevolucao);
        movimentosDoBanco = movimentosBanco;
        aditivosSistemicos = aditivos;
        
        pendenciasConsolidadas = consolidarPendenciasMGM(
            dadosDevolucaoCompilada, 
            dadosMovimentosSiago, 
            movimentosDoBanco,
            aditivosSistemicos
        );
        dadosFiltradosMGM = [...pendenciasConsolidadas];
        
        dadosCarregadosMGM = true;
        
        console.log(`📊 Dados MGM carregados:`);
        console.log(`   - Movimentos Siago: ${Object.keys(dadosMovimentosSiago).length}`);
        console.log(`   - Itens Devolução: ${dadosDevolucaoCompilada.length}`);
        console.log(`   - Movimentos Banco: ${movimentosDoBanco.length}`);
        console.log(`   - Aditivos Sistêmicos: ${aditivosSistemicos.length}`);
        console.log(`   - Pendências Consolidadas: ${pendenciasConsolidadas.length}`);
        console.log(`   - Itens Represados: ${itensRepresados.total.toFixed(2)} unidades`);
        
        const loadingElement = document.getElementById('loadingMGM');
        if (loadingElement) loadingElement.style.display = 'none';
        
        renderizarDashboardMGM();
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados MGM:', error);
        const loadingElement = document.getElementById('loadingMGM');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="color: #FC8181; text-align: center; padding: 20px;">
                    <div style="font-size: 36px;">❌</div>
                    <p style="margin-top: 10px;">Erro ao carregar dados MGM</p>
                    <p style="font-size: 12px; color: #718096;">${error.message}</p>
                    <button onclick="carregarDadosMGM()" style="margin-top: 10px; padding: 8px 20px; background: #4299E1; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Tentar novamente
                    </button>
                </div>
            `;
        }
        return false;
    }
}

function aplicarFiltroStatusMGM(status) {
    console.log(`🔍 Filtrando por status: ${status}`);
    
    if (filtroStatusMGMAtivo === status) {
        filtroStatusMGMAtivo = null;
        dadosFiltradosMGM = [...pendenciasConsolidadas];
    } else {
        filtroStatusMGMAtivo = status;
        dadosFiltradosMGM = pendenciasConsolidadas.filter(p => p.status === status);
    }
    
    document.querySelectorAll('.kpi-card-mgm').forEach(el => {
        el.classList.remove('active-filter');
        const cardStatus = el.dataset.status;
        if (cardStatus && cardStatus === filtroStatusMGMAtivo) {
            el.classList.add('active-filter');
        }
    });
    
    const selectStatus = document.getElementById('filterStatusMGM');
    if (selectStatus) {
        selectStatus.value = filtroStatusMGMAtivo || 'todos';
    }
    
    itemSelecionadoMGM = null;
    
    renderizarDashboardMGM();
}

function renderizarDashboardMGM() {
    console.log('🔄 Renderizando dashboard MGM...');
    
    const container = document.getElementById('dashboardMGM');
    if (!container) {
        console.warn('⚠️ Container MGM não encontrado');
        return;
    }
    
    if (!pendenciasConsolidadas || pendenciasConsolidadas.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📊</div>
                <p>Nenhum dado MGM disponível</p>
                <p class="sub">Aguarde o carregamento dos dados</p>
            </div>
        `;
        return;
    }
    
    const dadosExibir = dadosFiltradosMGM.length > 0 ? dadosFiltradosMGM : pendenciasConsolidadas;
    
    renderizarKPIsMGM(dadosExibir);
    renderizarListaObrasMGM(dadosExibir);
    renderizarGraficosMGM(dadosExibir);
    
    const totalRegistros = document.getElementById('totalRegistrosMGM');
    if (totalRegistros) {
        totalRegistros.textContent = `${dadosExibir.length} pendências`;
    }
    
    if (itemSelecionadoMGM) {
        renderizarDetalhesObraMGM(itemSelecionadoMGM);
    } else {
        const detalhesContainer = document.getElementById('itemDetailsMGM');
        if (detalhesContainer) {
            detalhesContainer.innerHTML = `
                <div class="empty-state-dashboard">
                    <div class="icon">👆</div>
                    <p>Selecione uma obra para ver os detalhes</p>
                </div>
            `;
        }
    }
    
    console.log(`✅ Dashboard MGM atualizado com ${dadosExibir.length} registros`);
}

function renderizarKPIsMGM(pendencias) {
    const container = document.getElementById('kpiGridMGM');
    if (!container) return;
    
    const total = pendencias.length;
    const pendentes = pendencias.filter(p => p.status === 'PENDENTE').length;
    const parciais = pendencias.filter(p => p.status === 'PARCIAL').length;
    const atendidos = pendencias.filter(p => p.status === 'ATENDIDO').length;
    const sobras = pendencias.filter(p => p.status === 'SOBRA').length;
    const represados = pendencias.filter(p => p.status === 'REPRESADO').length;
    
    const comAditivos = pendencias.filter(p => p.temAditivos).length;
    const comMovimentos = pendencias.filter(p => p.temMovimentos).length;
    const multiplasMGM = pendencias.filter(p => p.temMultiplasMGM || p.isMultipla).length;
    
    const obrasSet = new Set(pendencias.map(p => p.obra));
    const totalObras = obrasSet.size;
    
    let totalQuantidadeEsperada = 0;
    let totalQuantidadeEncontrada = 0;
    let totalSobra = 0;
    let totalFalta = 0;
    let totalRepresados = 0;
    
    pendencias.forEach(p => {
        totalQuantidadeEsperada += p.qtdEsperada || 0;
        totalQuantidadeEncontrada += p.qtdEncontrada || 0;
        totalSobra += p.sobra || 0;
        totalFalta += p.falta || 0;
        totalRepresados += p.represados || 0;
    });
    
    const isActive = (status) => filtroStatusMGMAtivo === status;
    
    container.innerHTML = `
        <div class="kpi-card kpi-card-mgm status-total ${isActive('TOTAL') ? 'active-filter' : ''}" data-status="TOTAL" onclick="aplicarFiltroStatusMGM('TOTAL')" style="cursor: pointer;">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total de Pendências</div>
        </div>
        <div class="kpi-card kpi-card-mgm status-pendente ${isActive('PENDENTE') ? 'active-filter' : ''}" data-status="PENDENTE" onclick="aplicarFiltroStatusMGM('PENDENTE')" style="cursor: pointer; border-color: ${isActive('PENDENTE') ? '#E53E3E' : '#E2E8F0'};">
            <div class="kpi-icon">🔴</div>
            <div class="kpi-value" style="color: #E53E3E;">${pendentes + parciais}</div>
            <div class="kpi-label">🔴 Pendentes (${parciais} parciais)</div>
        </div>
        <div class="kpi-card kpi-card-mgm status-baixado ${isActive('ATENDIDO') ? 'active-filter' : ''}" data-status="ATENDIDO" onclick="aplicarFiltroStatusMGM('ATENDIDO')" style="cursor: pointer; border-color: ${isActive('ATENDIDO') ? '#48BB78' : '#E2E8F0'};">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value" style="color: #48BB78;">${atendidos}</div>
            <div class="kpi-label">✅ Atendidos</div>
        </div>
        <div class="kpi-card kpi-card-mgm status-sobra ${isActive('SOBRA') ? 'active-filter' : ''}" data-status="SOBRA" onclick="aplicarFiltroStatusMGM('SOBRA')" style="cursor: pointer; border-color: ${isActive('SOBRA') ? '#D69E2E' : '#E2E8F0'};">
            <div class="kpi-icon">🟠</div>
            <div class="kpi-value" style="color: #D69E2E;">${sobras}</div>
            <div class="kpi-label">🟠 Devolver (sobras)</div>
        </div>
        <div class="kpi-card kpi-card-mgm status-represado ${isActive('REPRESADO') ? 'active-filter' : ''}" data-status="REPRESADO" onclick="aplicarFiltroStatusMGM('REPRESADO')" style="cursor: pointer; border-color: ${isActive('REPRESADO') ? '#805AD5' : '#E2E8F0'};">
            <div class="kpi-icon">📌</div>
            <div class="kpi-value" style="color: #805AD5;">${represados}</div>
            <div class="kpi-label">📌 Itens Represados</div>
        </div>
        <div class="kpi-card kpi-card-mgm" style="cursor: default;">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras Impactadas</div>
        </div>
        <div class="kpi-card kpi-card-mgm" style="border-color: #9F7AEA; cursor: default; background: #FAF5FF;">
            <div class="kpi-icon">📝</div>
            <div class="kpi-value" style="color: #805AD5; font-size: 18px;">${comAditivos}</div>
            <div class="kpi-label">📝 Com Aditivos</div>
        </div>
        <div class="kpi-card kpi-card-mgm" style="border-color: #4299E1; cursor: default; background: #EBF8FF;">
            <div class="kpi-icon">📄</div>
            <div class="kpi-value" style="color: #4299E1; font-size: 18px;">${comMovimentos}</div>
            <div class="kpi-label">📄 Com Movimentos</div>
        </div>
        <div class="kpi-card kpi-card-mgm" style="border-color: #D69E2E; cursor: default; background: #FFFAF0;">
            <div class="kpi-icon">🔀</div>
            <div class="kpi-value" style="color: #D69E2E; font-size: 18px;">${multiplasMGM}</div>
            <div class="kpi-label">🔀 Múltiplas MGM</div>
        </div>
        <div class="kpi-card kpi-card-mgm status-valor" style="border-color: #4299E1; cursor: default;">
            <div class="kpi-icon">📊</div>
            <div class="kpi-value" style="color: #4299E1; font-size: 18px;">${totalQuantidadeEsperada.toFixed(0)}</div>
            <div class="kpi-label">Qtd. Esperada</div>
        </div>
        <div class="kpi-card kpi-card-mgm status-total" style="border-color: #48BB78; cursor: default;">
            <div class="kpi-icon">📈</div>
            <div class="kpi-value" style="color: #48BB78; font-size: 18px;">${totalQuantidadeEncontrada.toFixed(0)}</div>
            <div class="kpi-label">Qtd. Encontrada</div>
        </div>
        <div class="kpi-card kpi-card-mgm" style="border-color: #D69E2E; cursor: default;">
            <div class="kpi-icon">🔄</div>
            <div class="kpi-value" style="color: #D69E2E; font-size: 18px;">${totalSobra.toFixed(0)}</div>
            <div class="kpi-label">Total de Sobras</div>
        </div>
        <div class="kpi-card kpi-card-mgm" style="border-color: #E53E3E; cursor: default;">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value" style="color: #E53E3E; font-size: 18px;">${totalFalta.toFixed(0)}</div>
            <div class="kpi-label">Total de Faltas</div>
        </div>
        <div class="kpi-card kpi-card-mgm status-represado" style="border-color: #805AD5; cursor: default; background: #FAF5FF;">
            <div class="kpi-icon">📌</div>
            <div class="kpi-value" style="color: #805AD5; font-size: 18px; font-weight: 700;">${totalRepresados.toFixed(0)}</div>
            <div class="kpi-label">📌 Itens Represados do Passado</div>
        </div>
    `;
}

function renderizarListaObrasMGM(pendencias) {
    const container = document.getElementById('itemListMGM');
    if (!container) return;
    
    if (!pendencias || pendencias.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma pendência MGM encontrada</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    // ============================================
    // APLICAR FILTRO POR ETAPAS (EXATO)
    // ============================================
    let pendenciasFiltradas = pendencias;
    
    if (filtroEtapasMinimo > 0) {
        pendenciasFiltradas = pendencias.filter(p => {
            const obraNorm = normalizarObra(p.obra);
            const etapasInfo = getEtapasPorObra(obraNorm);
            if (!etapasInfo) return false;
            // 🔥 FILTRO EXATO: número de etapas válidas === valor digitado
            return etapasInfo.etapas_validas === filtroEtapasMinimo;
        });
    }
    
    if (pendenciasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">🔍</div>
                <p>Nenhuma obra encontrada com exatamente ${filtroEtapasMinimo} etapa(s) válida(s)</p>
                <p class="sub">Ajuste o filtro para ver mais resultados</p>
            </div>
        `;
        return;
    }
    
    // ============================================
    // AGRUPAR OBJETOS
    // ============================================
    const grupos = {};
    pendenciasFiltradas.forEach(p => {
        const obra = p.obra;
        if (!grupos[obra]) {
            grupos[obra] = {
                obra: obra,
                obraFormatada: p.obraFormatada,
                datas: new Set(),
                itens: [],
                totalPendentes: 0,
                totalAtendidos: 0,
                totalParciais: 0,
                totalSobras: 0,
                totalRepresados: 0,
                totalSobraQtd: 0,
                totalFaltaQtd: 0,
                totalRepresadosQtd: 0,
                totalDocumentos: 0,
                totalAditivos: 0,
                multiplasMGM: 0,
                multiplasMGMItens: [],
                status: 'PENDENTE'
            };
        }
        grupos[obra].itens.push(p);
        if (p.datas) {
            p.datas.forEach(d => grupos[obra].datas.add(d));
        }
        grupos[obra].totalDocumentos += p.totalDocumentos || 0;
        if (p.temAditivos) {
            grupos[obra].totalAditivos++;
        }
        if (p.temMultiplasMGM || p.isMultipla) {
            grupos[obra].multiplasMGM++;
            grupos[obra].multiplasMGMItens.push(p);
        }
        
        if (p.status === 'PENDENTE') grupos[obra].totalPendentes++;
        else if (p.status === 'PARCIAL') {
            grupos[obra].totalParciais++;
            grupos[obra].totalFaltaQtd += p.falta || 0;
        } else if (p.status === 'ATENDIDO') grupos[obra].totalAtendidos++;
        else if (p.status === 'SOBRA') {
            grupos[obra].totalSobras++;
            grupos[obra].totalSobraQtd += p.sobra || 0;
        } else if (p.status === 'REPRESADO') {
            grupos[obra].totalRepresados++;
            grupos[obra].totalRepresadosQtd += p.represados || 0;
        }
        
        if (grupos[obra].totalPendentes > 0 || grupos[obra].totalParciais > 0 || grupos[obra].totalSobras > 0 || grupos[obra].totalRepresados > 0) {
            grupos[obra].status = 'PENDENTE';
        } else {
            grupos[obra].status = 'ATENDIDO';
        }
    });
    
    // ============================================
    // RENDERIZAR LISTA
    // ============================================
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 80px 1fr 40px 50px 50px 60px 50px 45px; gap: 4px; padding: 6px 10px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 10px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span>Descrição</span>
            <span style="text-align: right;">Qtd</span>
            <span style="text-align: center; color: #805AD5;">📌</span>
            <span style="text-align: center; color: #D69E2E;">🟠</span>
            <span style="text-align: center; color: #E53E3E;">🔴</span>
            <span style="text-align: center;">Status</span>
            <span style="text-align: center; color: #805AD5;">🔀</span>
        </div>
    `;
    
    for (const obra in grupos) {
        const grupo = grupos[obra];
        const isActive = itemSelecionadoMGM && 
            itemSelecionadoMGM.obra === grupo.obra;
        
        const totalPend = grupo.totalPendentes + grupo.totalParciais + grupo.totalSobras + grupo.totalRepresados;
        const totalItens = grupo.itens.length;
        const temSobra = grupo.totalSobraQtd > 0;
        const temFalta = grupo.totalFaltaQtd > 0;
        const temRepresado = grupo.totalRepresadosQtd > 0;
        const temAditivo = grupo.totalAditivos > 0;
        const temMultiplas = grupo.multiplasMGM > 0;
        
        let statusBadge = '';
        let statusClass = '';
        if (temRepresado) {
            statusBadge = `📌 ${grupo.totalRepresadosQtd.toFixed(0)}`;
            statusClass = 'status-represado';
        } else if (temSobra && temFalta) {
            statusBadge = `🟠+🔴`;
            statusClass = 'status-misto';
        } else if (temSobra) {
            statusBadge = `🟠 ${grupo.totalSobraQtd.toFixed(0)}`;
            statusClass = 'status-sobra';
        } else if (temFalta) {
            statusBadge = `🔴 ${grupo.totalFaltaQtd.toFixed(0)}`;
            statusClass = 'status-falta';
        } else if (totalPend > 0) {
            statusBadge = '⏳ Pendente';
            statusClass = 'status-pendente';
        } else {
            statusBadge = '✅ Atendido';
            statusClass = 'status-atendido';
        }
        
        const totalSobraExibicao = temSobra ? `🟠 ${grupo.totalSobraQtd.toFixed(0)}` : '-';
        const totalFaltaExibicao = temFalta ? `🔴 ${grupo.totalFaltaQtd.toFixed(0)}` : '-';
        const totalRepresadoExibicao = temRepresado ? `📌 ${grupo.totalRepresadosQtd.toFixed(0)}` : '-';
        const docsInfo = grupo.totalDocumentos > 0 ? `📄${grupo.totalDocumentos}` : '';
        const aditivoInfo = temAditivo ? `📝${grupo.totalAditivos}` : '';
        const multiplasInfo = temMultiplas ? `🔀${grupo.multiplasMGM}` : '';
        const infoExtra = [docsInfo, aditivoInfo, multiplasInfo].filter(Boolean).join(' ');
        
        // ============================================
        // INDICADOR DE ETAPAS NA LISTA DE OBRAS
        // ============================================
        const obraNorm = normalizarObra(grupo.obra);
        const etapasInfo = getEtapasPorObra(obraNorm);
        let etapasIndicator = '';
        
        if (etapasInfo && etapasInfo.total_etapas > 0) {
            const validas = etapasInfo.etapas_validas;
            const total = etapasInfo.total_etapas;
            const hasValid = validas > 0;
            etapasIndicator = `
                <span class="obra-etapas-indicator ${hasValid ? 'has-etapas' : 'no-etapas'}" title="${validas} etapas válidas de ${total}">
                    📋 ${validas}/${total}
                </span>
            `;
        } else {
            etapasIndicator = `
                <span class="obra-etapas-indicator no-etapas" title="Sem dados de programação">
                    📭
                </span>
            `;
        }
        
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''} ${statusClass}" onclick="selecionarObraMGM('${grupo.obra}')" style="display: grid; grid-template-columns: 80px 1fr 40px 50px 50px 60px 50px 45px; gap: 4px; padding: 8px 10px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s; ${temRepresado ? 'border-left: 4px solid #805AD5;' : ''} ${temSobra ? 'border-left: 4px solid #D69E2E;' : ''} ${temFalta ? 'border-right: 4px solid #E53E3E;' : ''}">
                <span class="item-code" style="font-size: 11px;">
                    ${grupo.obraFormatada}
                    <br>
                    ${etapasIndicator}
                </span>
                <span class="item-desc" style="font-size: 11px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${totalItens} itens ${infoExtra}
                </span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0; font-size: 11px;">${totalItens}</span>
                <span style="text-align: center; font-weight: 600; color: ${temRepresado ? '#805AD5' : '#A0AEC0'}; font-size: 11px;">${totalRepresadoExibicao}</span>
                <span style="text-align: center; font-weight: 600; color: ${temSobra ? '#D69E2E' : '#A0AEC0'}; font-size: 11px;">${totalSobraExibicao}</span>
                <span style="text-align: center; font-weight: 600; color: ${temFalta ? '#E53E3E' : '#A0AEC0'}; font-size: 11px;">${totalFaltaExibicao}</span>
                <span style="text-align: center;"><span class="badge-status ${statusClass}" style="font-size: 9px; padding: 2px 6px;">${statusBadge}</span></span>
                <span style="text-align: center; font-size: 14px; color: ${temMultiplas ? '#805AD5' : '#A0AEC0'};">${temMultiplas ? '🔀' : ''}</span>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    // Atualizar o valor do input
    const inputEtapas = document.getElementById('filtroEtapas');
    if (inputEtapas) {
        inputEtapas.value = filtroEtapasMinimo > 0 ? filtroEtapasMinimo : '';
    }
}

function renderizarGraficosMGM(pendencias) {
    const statusCount = {
        'PENDENTE': 0,
        'PARCIAL': 0,
        'ATENDIDO': 0,
        'SOBRA': 0,
        'REPRESADO': 0
    };
    
    pendencias.forEach(p => {
        if (statusCount[p.status] !== undefined) {
            statusCount[p.status]++;
        }
    });
    
    const total = Object.values(statusCount).reduce((a, b) => a + b, 0) || 1;
    
    const statusLabels = {
        'PENDENTE': '🔴 Pendentes',
        'PARCIAL': '🔴 Parciais',
        'ATENDIDO': '✅ Atendidos',
        'SOBRA': '🟠 Sobras',
        'REPRESADO': '📌 Represados'
    };
    
    const statusColors = {
        'PENDENTE': 'bar-pendente',
        'PARCIAL': 'bar-parcial',
        'ATENDIDO': 'bar-baixado',
        'SOBRA': 'bar-sobra',
        'REPRESADO': 'bar-represado'
    };
    
    let htmlStatus = '';
    for (const status in statusCount) {
        const value = statusCount[status];
        const percentual = (value / total) * 100;
        const colorClass = statusColors[status];
        
        htmlStatus += `
            <div class="chart-bar-indicator">
                <span class="label">${statusLabels[status]}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${percentual}%;">
                        <span class="value">${value}</span>
                    </div>
                </div>
                <span class="percent">${percentual.toFixed(0)}%</span>
            </div>
        `;
    }
    
    document.getElementById('statusChartMGM').innerHTML = htmlStatus;
    
    const obrasComSobra = new Set(
        pendencias.filter(p => p.status === 'SOBRA')
            .map(p => p.obra)
    );
    
    const obrasSet = new Set(pendencias.map(p => p.obra));
    const obrasComFalta = new Set(
        pendencias.filter(p => p.status === 'PENDENTE' || p.status === 'PARCIAL')
            .map(p => p.obra)
    );
    
    const obrasAtendidas = new Set(
        pendencias.filter(p => p.status === 'ATENDIDO')
            .map(p => p.obra)
    );
    
    const obrasRepresadas = new Set(
        pendencias.filter(p => p.status === 'REPRESADO')
            .map(p => p.obra)
    );
    
    const totalObras = obrasSet.size || 1;
    const obrasFalta = obrasComFalta.size;
    const obrasAtendidasCount = obrasAtendidas.size;
    const obrasSobra = obrasComSobra.size;
    const obrasRepresadasCount = obrasRepresadas.size;
    
    let htmlObras = `
        <div class="chart-bar-indicator">
            <span class="label">🔴 Com Falta</span>
            <div class="bar-track">
                <div class="bar-fill bar-pendente" style="width: ${(obrasFalta / totalObras) * 100}%;">
                    <span class="value">${obrasFalta}</span>
                </div>
            </div>
            <span class="percent">${((obrasFalta / totalObras) * 100).toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator">
            <span class="label">🟠 Com Sobras</span>
            <div class="bar-track">
                <div class="bar-fill bar-sobra" style="width: ${(obrasSobra / totalObras) * 100}%;">
                    <span class="value">${obrasSobra}</span>
                </div>
            </div>
            <span class="percent">${((obrasSobra / totalObras) * 100).toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator">
            <span class="label">✅ Atendidas</span>
            <div class="bar-track">
                <div class="bar-fill bar-baixado" style="width: ${(obrasAtendidasCount / totalObras) * 100}%;">
                    <span class="value">${obrasAtendidasCount}</span>
                </div>
            </div>
            <span class="percent">${((obrasAtendidasCount / totalObras) * 100).toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator">
            <span class="label">📌 Com Represados</span>
            <div class="bar-track">
                <div class="bar-fill bar-represado" style="width: ${(obrasRepresadasCount / totalObras) * 100}%;">
                    <span class="value">${obrasRepresadasCount}</span>
                </div>
            </div>
            <span class="percent">${((obrasRepresadasCount / totalObras) * 100).toFixed(0)}%</span>
        </div>
    `;
    
    document.getElementById('valorChartMGM').innerHTML = htmlObras;
}

function selecionarObraMGM(obra) {
    console.log(`🔍 Selecionando obra MGM: ${obra}`);
    
    if (itemSelecionadoMGM && itemSelecionadoMGM.obra === obra) {
        itemSelecionadoMGM = null;
    } else {
        itemSelecionadoMGM = { obra: obra, dataSelecionada: null };
    }
    
    renderizarDetalhesObraMGM(itemSelecionadoMGM);
    
    document.querySelectorAll('#itemListMGM .item-group-item').forEach(el => {
        el.classList.remove('active');
    });
    if (itemSelecionadoMGM) {
        const items = document.querySelectorAll('#itemListMGM .item-group-item');
        items.forEach(el => {
            const onclickAttr = el.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`'${itemSelecionadoMGM.obra}'`)) {
                el.classList.add('active');
            }
        });
    }
}

function selecionarDataObraMGM(obra, data) {
    console.log(`📅 Selecionando data ${data} da obra ${obra}`);
    
    if (!itemSelecionadoMGM || itemSelecionadoMGM.obra !== obra) {
        itemSelecionadoMGM = { obra: obra, dataSelecionada: data };
    } else if (itemSelecionadoMGM.dataSelecionada === data) {
        itemSelecionadoMGM.dataSelecionada = null;
    } else {
        itemSelecionadoMGM.dataSelecionada = data;
    }
    
    renderizarDetalhesObraMGM(itemSelecionadoMGM);
}

function renderizarDetalhesObraMGM(itemSelecionado) {
    const container = document.getElementById('itemDetailsMGM');
    if (!container) return;
    
    if (!itemSelecionado || !itemSelecionado.obra) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Selecione uma obra para ver os detalhes</p>
            </div>
        `;
        return;
    }
    
    const obra = itemSelecionado.obra;
    const dataSelecionada = itemSelecionado.dataSelecionada;
    
    let todosItens = dadosFiltradosMGM.filter(p => p.obra === obra);
    
    if (todosItens.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhum detalhe encontrado para esta obra</p>
            </div>
        `;
        return;
    }
    
    const datasMap = {};
    todosItens.forEach(p => {
        const dataKey = p.data || 'sem_data';
        if (!datasMap[dataKey]) {
            datasMap[dataKey] = {
                data: dataKey,
                dataFormatada: p.data ? formatarData(p.data) : 'Sem data',
                itens: [],
                totalPendentes: 0,
                totalAtendidos: 0,
                totalParciais: 0,
                totalSobras: 0,
                totalRepresados: 0,
                totalSobraQtd: 0,
                totalFaltaQtd: 0,
                totalRepresadosQtd: 0,
                totalAditivos: 0,
                totalDocumentos: 0,
                multiplasMGM: 0
            };
        }
        datasMap[dataKey].itens.push(p);
        if (p.status === 'PENDENTE') datasMap[dataKey].totalPendentes++;
        else if (p.status === 'PARCIAL') {
            datasMap[dataKey].totalParciais++;
            datasMap[dataKey].totalFaltaQtd += p.falta || 0;
        } else if (p.status === 'ATENDIDO') datasMap[dataKey].totalAtendidos++;
        else if (p.status === 'SOBRA') {
            datasMap[dataKey].totalSobras++;
            datasMap[dataKey].totalSobraQtd += p.sobra || 0;
        } else if (p.status === 'REPRESADO') {
            datasMap[dataKey].totalRepresados++;
            datasMap[dataKey].totalRepresadosQtd += p.represados || 0;
        }
        if (p.temAditivos) {
            datasMap[dataKey].totalAditivos++;
        }
        datasMap[dataKey].totalDocumentos += p.totalDocumentos || 0;
        if (p.temMultiplasMGM || p.isMultipla) {
            datasMap[dataKey].multiplasMGM++;
        }
    });
    
    const datasOrdenadas = Object.keys(datasMap).sort();
    const obraFormatada = todosItens[0].obraFormatada;
    
    let itensParaMostrar = [];
    let dataAtiva = dataSelecionada;
    
    if (dataSelecionada && datasMap[dataSelecionada]) {
        itensParaMostrar = datasMap[dataSelecionada].itens;
    } else {
        todosItens.forEach(p => {
            itensParaMostrar.push(p);
        });
        dataAtiva = null;
    }
    
    let totalPendentes = 0, totalAtendidos = 0, totalParciais = 0, totalSobras = 0, totalRepresados = 0;
    let totalSobraQtd = 0, totalFaltaQtd = 0, totalRepresadosQtd = 0, valorTotal = 0;
    let totalAditivos = 0;
    let totalDocumentos = 0;
    let totalMultiplas = 0;
    
    todosItens.forEach(p => {
        if (p.status === 'PENDENTE') totalPendentes++;
        else if (p.status === 'PARCIAL') {
            totalParciais++;
            totalFaltaQtd += p.falta || 0;
        } else if (p.status === 'ATENDIDO') totalAtendidos++;
        else if (p.status === 'SOBRA') {
            totalSobras++;
            totalSobraQtd += p.sobra || 0;
        } else if (p.status === 'REPRESADO') {
            totalRepresados++;
            totalRepresadosQtd += p.represados || 0;
        }
        if (p.temAditivos) {
            totalAditivos++;
        }
        totalDocumentos += p.totalDocumentos || 0;
        if (p.temMultiplasMGM || p.isMultipla) {
            totalMultiplas++;
        }
        valorTotal += p.qtdEsperada * (p.valor_unitario || 0);
    });
    
    // ============================================
    // ADICIONAR ETAPAS DA PROGRAMAÇÃO SIAGO
    // ============================================
    
    const obraNorm = normalizarObra(obra);
    const etapasInfo = getEtapasPorObra(obraNorm);
    let etapasHTML = '';
    
    if (etapasInfo) {
        const total = etapasInfo.total_etapas;
        const validas = etapasInfo.etapas_validas;
        const reprovadas = etapasInfo.etapas_reprovadas;
        const percentual = total > 0 ? Math.round((validas / total) * 100) : 0;
        
        let badgesHTML = '';
        etapasInfo.etapas.forEach(etapa => {
            const detalhe = etapasInfo.etapas_detalhes[etapa] || {};
            const situacao = detalhe.situacao || 'Desconhecida';
            const isReprovada = situacao === 'ETAPA REPROVADA';
            const icon = isReprovada ? '🔴' : (situacao === 'ETAPA CONCLUÍDA' ? '✅' : '⏳');
            const classe = isReprovada ? 'etapa-reprovada' : (situacao === 'ETAPA CONCLUÍDA' ? 'etapa-concluida' : 'etapa-pendente');
            
            badgesHTML += `
                <span class="etapa-badge ${classe}" title="${situacao}">
                    ${icon} ${etapa}
                </span>
            `;
        });
        
        etapasHTML = `
            <div class="detail-etapas-section">
                <div class="section-title">📋 Etapas da Obra</div>
                <div class="etapas-info">
                    <div class="etapas-resumo">
                        <span class="etapas-total">📊 ${total} etapas</span>
                        <span class="etapas-validas" style="color: ${validas > 0 ? '#48BB78' : '#718096'};">✅ ${validas} válidas</span>
                        <span class="etapas-reprovadas" style="color: ${reprovadas > 0 ? '#FC8181' : '#718096'};">🔴 ${reprovadas} reprovadas</span>
                        <span class="etapas-percentual">${percentual}% válidas</span>
                    </div>
                    <div class="etapas-badges">
                        ${badgesHTML}
                    </div>
                </div>
            </div>
        `;
    } else {
        etapasHTML = `
            <div class="detail-etapas-section">
                <div class="section-title">📋 Etapas da Obra</div>
                <div class="etapas-info empty">
                    <span>📭 Sem dados de programação para esta obra</span>
                </div>
            </div>
        `;
    }
    
    let html = `
        <div class="detail-header">
            <div class="detail-title">🏗️ ${obraFormatada}</div>
            <div class="detail-subtitle">📦 ${todosItens.length} itens | 📄 ${totalDocumentos} documentos ${totalAditivos > 0 ? `| 📝 ${totalAditivos} aditivos` : ''} ${totalMultiplas > 0 ? `| 🔀 ${totalMultiplas} múltiplas` : ''}</div>
        </div>
        
        <div class="detail-stats-grid">
            <div class="detail-stat">
                <span class="stat-label">📦 Total</span>
                <span class="stat-value">${todosItens.length}</span>
            </div>
            <div class="detail-stat">
                <span class="stat-label">🔴 Pendentes</span>
                <span class="stat-value" style="color: #E53E3E;">${totalPendentes}</span>
            </div>
            <div class="detail-stat">
                <span class="stat-label">🔴 Parciais</span>
                <span class="stat-value" style="color: #E53E3E;">${totalParciais}</span>
            </div>
            <div class="detail-stat">
                <span class="stat-label">🟠 Sobras</span>
                <span class="stat-value" style="color: #D69E2E;">${totalSobras}</span>
            </div>
            <div class="detail-stat">
                <span class="stat-label">📌 Represados</span>
                <span class="stat-value" style="color: #805AD5;">${totalRepresados}</span>
            </div>
            <div class="detail-stat">
                <span class="stat-label">✅ Atendidos</span>
                <span class="stat-value" style="color: #48BB78;">${totalAtendidos}</span>
            </div>
            ${totalAditivos > 0 ? `
            <div class="detail-stat">
                <span class="stat-label">📝 Aditivos</span>
                <span class="stat-value" style="color: #805AD5;">${totalAditivos}</span>
            </div>` : ''}
            <div class="detail-stat">
                <span class="stat-label">📄 Documentos</span>
                <span class="stat-value" style="color: #4299E1;">${totalDocumentos}</span>
            </div>
            ${totalMultiplas > 0 ? `
            <div class="detail-stat">
                <span class="stat-label">🔀 Múltiplas</span>
                <span class="stat-value" style="color: #D69E2E;">${totalMultiplas}</span>
            </div>` : ''}
        </div>
        
        <div class="detail-summary">
            <div class="summary-item" style="background: #FEFCBF; border-left: 4px solid #D69E2E;">
                <span class="summary-label">🟠 Excedentes (Sobras)</span>
                <span class="summary-value" style="color: #D69E2E; font-weight: 700;">${totalSobraQtd.toFixed(0)} unidades</span>
            </div>
            <div class="summary-item" style="background: #FED7D7; border-left: 4px solid #E53E3E;">
                <span class="summary-label">🔴 Faltas (Pendentes)</span>
                <span class="summary-value" style="color: #E53E3E; font-weight: 700;">${totalFaltaQtd.toFixed(0)} unidades</span>
            </div>
            <div class="summary-item" style="background: #FAF5FF; border-left: 4px solid #805AD5;">
                <span class="summary-label">📌 Represados do Passado</span>
                <span class="summary-value" style="color: #805AD5; font-weight: 700;">${totalRepresadosQtd.toFixed(0)} unidades</span>
            </div>
        </div>
        
        <div class="detail-section-title">📅 Datas de Programação</div>
        <div class="detail-datas-list">
    `;
    
    datasOrdenadas.forEach(data => {
        const info = datasMap[data];
        const isActive = dataAtiva === data;
        const totalPend = info.totalPendentes + info.totalParciais + info.totalSobras + info.totalRepresados;
        const temAditivo = info.totalAditivos > 0;
        const temDocumentos = info.totalDocumentos > 0;
        const temMultiplas = info.multiplasMGM > 0;
        
        let statusBadge = '';
        let badgeClass = '';
        if (info.totalRepresadosQtd > 0) {
            statusBadge = `📌 ${info.totalRepresadosQtd.toFixed(0)}`;
            badgeClass = 'status-represado';
        } else if (info.totalSobraQtd > 0 && info.totalFaltaQtd > 0) {
            statusBadge = `🟠+🔴`;
            badgeClass = 'status-misto';
        } else if (info.totalSobraQtd > 0) {
            statusBadge = `🟠 ${info.totalSobraQtd.toFixed(0)}`;
            badgeClass = 'status-sobra';
        } else if (info.totalFaltaQtd > 0) {
            statusBadge = `🔴 ${info.totalFaltaQtd.toFixed(0)}`;
            badgeClass = 'status-falta';
        } else if (totalPend > 0) {
            statusBadge = '⏳';
            badgeClass = 'status-pendente';
        } else {
            statusBadge = '✅';
            badgeClass = 'status-atendido';
        }
        
        const aditivoInfo = temAditivo ? ' 📝' : '';
        const docInfo = temDocumentos ? ` 📄${info.totalDocumentos}` : '';
        const multiplasInfo = temMultiplas ? ' 🔀' : '';
        
        html += `
            <div class="detail-data-item ${isActive ? 'active' : ''} ${badgeClass}" onclick="selecionarDataObraMGM('${obra}', '${data}')">
                <span class="data-label">📅 ${info.dataFormatada}</span>
                <span class="data-badge">${info.itens.length} itens${aditivoInfo}${docInfo}${multiplasInfo}</span>
                <span class="data-status ${badgeClass}">${statusBadge}</span>
            </div>
        `;
    });
    
    html += `
        </div>
        
        <div class="detail-section-title">📋 Itens ${dataAtiva ? 'da data selecionada' : 'da obra'}</div>
        <div class="detail-items-list">
    `;
    
    itensParaMostrar.forEach(item => {
        let statusBadge = '';
        let statusClass = '';
        if (item.status === 'ATENDIDO') {
            statusBadge = '✅ Atendido';
            statusClass = 'status-atendido';
        } else if (item.status === 'SOBRA') {
            statusBadge = `🟠 +${item.sobra.toFixed(0)}`;
            statusClass = 'status-sobra';
        } else if (item.status === 'PARCIAL') {
            statusBadge = `🔴 -${item.falta.toFixed(0)}`;
            statusClass = 'status-falta';
        } else if (item.status === 'REPRESADO') {
            statusBadge = `📌 ${item.represados.toFixed(0)} represados`;
            statusClass = 'status-represado';
        } else {
            statusBadge = '🔴 Pendente';
            statusClass = 'status-pendente';
        }
        
        const qtdInfo = `${item.qtdEncontrada.toFixed(2)} / ${item.qtdEsperada.toFixed(2)}`;
        const temMultiplas = (item.temMultiplasMGM || item.isMultipla) ? '🔀 Múltiplas MGM' : '';
        const tipoMgmLabel = item.tipo_mgm === 'MULTIPLO' ? '🔀' : '📌';
        const temAditivo = item.temAditivos ? '📝 Aditivo' : '';
        const docsInfo = item.qtdDocumentos > 0 ? `📄${item.qtdDocumentos}` : '';
        
        let distribuicaoInfo = '';
        if (item.distribuicao && item.distribuicao.length > 0) {
            distribuicaoInfo = item.distribuicao.map(d => 
                `${formatarData(d.data)}: ${d.quantidade.toFixed(2)}`
            ).join(' | ');
        }
        
        const docsRMAInfo = item.documentosRMA && item.documentosRMA.length > 0 
            ? item.documentosRMA.join(', ') 
            : '';
        const docsDMAInfo = item.documentosDMA && item.documentosDMA.length > 0 
            ? item.documentosDMA.join(', ') 
            : '';
        
        const infoExtra = [docsInfo, temAditivo, temMultiplas].filter(Boolean).join(' ');
        
        html += `
            <div class="detail-item ${statusClass}">
                <div class="item-code-detail">${item.codigo}</div>
                <div class="item-desc-detail">${item.descricao}</div>
                <div class="item-qtd-detail">${qtdInfo}</div>
                <div class="item-status-detail ${statusClass}">${statusBadge}</div>
                <div class="item-mov-detail" style="font-size: 9px; color: #718096;">${infoExtra} ${tipoMgmLabel}</div>
                ${docsRMAInfo ? `<div class="item-rma-detail" style="font-size: 9px; color: #48BB78; margin-top: 2px;">🟢 RMA: ${docsRMAInfo}</div>` : ''}
                ${docsDMAInfo ? `<div class="item-dma-detail" style="font-size: 9px; color: #E53E3E; margin-top: 2px;">🔴 DMA: ${docsDMAInfo}</div>` : ''}
                ${temMultiplas ? `<div class="item-multi-detail" style="font-size: 9px; color: #805AD5;">${temMultiplas}</div>` : ''}
                ${distribuicaoInfo ? `<div class="item-distribuicao-detail" style="font-size: 9px; color: #4A5568; grid-column: 1 / -1; background: #F7FAFC; padding: 4px 8px; border-radius: 4px; margin-top: 2px;">📊 Distribuição: ${distribuicaoInfo}</div>` : ''}
            </div>
        `;
    });
    
    html += `
        </div>
        ${etapasHTML}
    `;
    
    container.innerHTML = html;
}

// ============================================
// FUNÇÃO: APLICAR FILTRO POR ETAPAS (CORRIGIDA - INPUT NUMÉRICO EXATO)
// ============================================

function aplicarFiltroEtapas() {
    const input = document.getElementById('filtroEtapas');
    if (!input) return;
    
    const valor = parseInt(input.value);
    // Se for NaN, vazio ou negativo, considerar como 0 (todas)
    filtroEtapasMinimo = isNaN(valor) || valor < 0 ? 0 : valor;
    
    console.log(`🔍 Filtrando obras com exatamente ${filtroEtapasMinimo} etapa(s) (0 = todas)`);
    
    // Atualizar a lista com o filtro
    renderizarListaObrasMGM(dadosFiltradosMGM);
    
    // Atualizar o contador
    const totalRegistros = document.getElementById('totalRegistrosMGM');
    if (totalRegistros) {
        let dadosFiltrados = dadosFiltradosMGM;
        
        if (filtroEtapasMinimo > 0) {
            dadosFiltrados = dadosFiltradosMGM.filter(p => {
                const obraNorm = normalizarObra(p.obra);
                const etapasInfo = getEtapasPorObra(obraNorm);
                if (!etapasInfo) return false;
                return etapasInfo.etapas_validas === filtroEtapasMinimo;
            });
        }
        
        totalRegistros.textContent = `${dadosFiltrados.length} pendências`;
    }
}

window.aplicarFiltroEtapas = aplicarFiltroEtapas;

function aplicarFiltrosMGM() {
    console.log('🔄 Aplicando filtros MGM...');
    const filtroStatus = document.getElementById('filterStatusMGM')?.value || 'todos';
    const buscaTexto = document.getElementById('filterBuscaMGM')?.value?.toLowerCase() || '';
    const buscaObra = document.getElementById('filterObraMGM')?.value || '';
    
    let filtrados = [...pendenciasConsolidadas];
    
    if (filtroStatus !== 'todos') {
        filtrados = filtrados.filter(p => p.status === filtroStatus);
        filtroStatusMGMAtivo = filtroStatus;
    } else {
        filtroStatusMGMAtivo = null;
    }
    
    if (buscaTexto) {
        filtrados = filtrados.filter(p => 
            p.codigo.toLowerCase().includes(buscaTexto) || 
            p.descricao.toLowerCase().includes(buscaTexto)
        );
    }
    
    if (buscaObra) {
        const obraNorm = normalizarObra(buscaObra);
        filtrados = filtrados.filter(p => 
            p.obra.includes(obraNorm) || 
            p.obraFormatada.includes(buscaObra)
        );
    }
    
    dadosFiltradosMGM = filtrados;
    itemSelecionadoMGM = null;
    
    const totalRegistros = document.getElementById('totalRegistrosMGM');
    if (totalRegistros) {
        totalRegistros.textContent = `${filtrados.length} pendências`;
    }
    
    // Resetar filtro de etapas ao aplicar outros filtros
    const inputEtapas = document.getElementById('filtroEtapas');
    if (inputEtapas) {
        inputEtapas.value = '';
        filtroEtapasMinimo = 0;
    }
    
    renderizarDashboardMGM();
}

function limparFiltrosMGM() {
    console.log('🧹 Limpando filtros MGM...');
    document.getElementById('filterStatusMGM').value = 'todos';
    document.getElementById('filterBuscaMGM').value = '';
    document.getElementById('filterObraMGM').value = '';
    
    // 🔥 RESETAR FILTRO DE ETAPAS
    const inputEtapas = document.getElementById('filtroEtapas');
    if (inputEtapas) {
        inputEtapas.value = '';
        filtroEtapasMinimo = 0;
    }
    
    filtroStatusMGMAtivo = null;
    dadosFiltradosMGM = [...pendenciasConsolidadas];
    itemSelecionadoMGM = null;
    
    document.querySelectorAll('.kpi-card-mgm').forEach(el => {
        el.classList.remove('active-filter');
    });
    
    renderizarDashboardMGM();
}

function trocarAbaPrincipal(aba) {
    console.log(`🔄 Trocando para aba: ${aba}`);
    abaAtual = aba;
    
    document.querySelectorAll('.btn-aba-principal').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    const containerSeparacao = document.getElementById('dashboardSeparacao');
    const containerMGM = document.getElementById('dashboardMGM');
    
    if (aba === 'separacao') {
        if (containerSeparacao) containerSeparacao.style.display = 'block';
        if (containerMGM) containerMGM.style.display = 'none';
        if (dadosFiltrados.length > 0) {
            renderizarDashboardSeparacao(dadosFiltrados);
        }
    } else {
        if (containerSeparacao) containerSeparacao.style.display = 'none';
        if (containerMGM) containerMGM.style.display = 'block';
        if (!dadosCarregadosMGM) {
            carregarDadosMGM();
        } else {
            renderizarDashboardMGM();
        }
    }
}

function criarMeses() {
    const container = document.getElementById('mesesContainer');
    if (!container) return;
    
    const mesesSet = new Set();
    dadosCompletos.forEach(item => {
        const mes = getMesAno(item.data_programacao);
        if (mes) mesesSet.add(mes);
    });
    
    const meses = Array.from(mesesSet).sort();
    
    if (meses.length === 0) {
        container.innerHTML = `<span style="font-size: 12px; color: #A0AEC0;">Nenhum mês disponível</span>`;
        return;
    }
    
    let html = `
        <button class="btn-mes active" data-mes="todos" onclick="filtrarPorMes('todos')" style="padding: 4px 12px; border: 2px solid #E2E8F0; border-radius: 6px; background: #ED8936; color: white; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; border-color: #ED8936;">
            📅 Todos
        </button>
    `;
    
    meses.forEach(mes => {
        const label = formatarMesAno(mes);
        html += `
            <button class="btn-mes" data-mes="${mes}" onclick="filtrarPorMes('${mes}')" style="padding: 4px 12px; border: 2px solid #E2E8F0; border-radius: 6px; background: #F7FAFC; color: #4A5568; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                📅 ${label}
            </button>
        `;
    });
    
    container.innerHTML = html;
    container.style.display = 'flex';
    container.style.gap = '8px';
    container.style.flexWrap = 'wrap';
    container.style.padding = '10px 0';
    container.style.marginBottom = '15px';
}

function filtrarPorMes(mes) {
    mesSelecionado = mes === 'todos' ? null : mes;
    
    document.querySelectorAll('.btn-mes').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mes === mes);
        if (btn.dataset.mes === mes) {
            btn.style.background = '#ED8936';
            btn.style.color = 'white';
            btn.style.borderColor = '#ED8936';
        } else {
            btn.style.background = '#F7FAFC';
            btn.style.color = '#4A5568';
            btn.style.borderColor = '#E2E8F0';
        }
    });
    
    aplicarFiltros();
}

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros (Separação)...');
    const dataInicio = document.getElementById('filterDataInicio')?.value || '';
    const dataFim = document.getElementById('filterDataFim')?.value || '';
    const filtroStatus = document.getElementById('filterStatus')?.value || 'todos';
    const buscaTexto = document.getElementById('filterBusca')?.value?.toLowerCase() || '';
    const buscaObra = document.getElementById('filterObra')?.value || '';
    
    let filtrados = [...dadosCompletos];
    
    if (mesSelecionado) {
        filtrados = filtrados.filter(item => {
            const mes = getMesAno(item.data_programacao);
            return mes === mesSelecionado;
        });
    }
    
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
    }
    
    if (filtroStatus !== 'todos') {
        const statusMap = {
            'PENDENTE': 'NÃO',
            'BAIXADO': 'SIM'
        };
        const statusValue = statusMap[filtroStatus] || filtroStatus;
        filtrados = filtrados.map(pendencia => ({
            ...pendencia,
            itens: (pendencia.itens || []).filter(item => 
                (item.baixado || 'NÃO') === statusValue
            )
        })).filter(pendencia => pendencia.itens && pendencia.itens.length > 0);
    }
    
    if (buscaTexto) {
        filtrados = filtrados.map(pendencia => ({
            ...pendencia,
            itens: (pendencia.itens || []).filter(item => {
                const codigo = (item.codigo || '').toLowerCase();
                const descricao = (item.descricao || '').toLowerCase();
                return codigo.includes(buscaTexto) || descricao.includes(buscaTexto);
            })
        })).filter(pendencia => pendencia.itens && pendencia.itens.length > 0);
    }
    
    if (buscaObra) {
        filtrados = filtrados.filter(pendencia => {
            const obra = (pendencia.obra || '').toLowerCase();
            return obra.includes(buscaObra.toLowerCase());
        });
    }
    
    dadosFiltrados = filtrados;
    dadosExibidos = filtrados;
    filtroAtivo = null;
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        totalRegistros.textContent = `${filtrados.length} pendências`;
    }
    
    renderizarDashboardSeparacao(filtrados);
}

function limparFiltros() {
    console.log('🧹 Limpando filtros...');
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterStatus').value = 'todos';
    document.getElementById('filterBusca').value = '';
    document.getElementById('filterObra').value = '';
    mesSelecionado = null;
    filtroAtivo = null;
    
    document.querySelectorAll('.btn-mes').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#F7FAFC';
        btn.style.color = '#4A5568';
        btn.style.borderColor = '#E2E8F0';
    });
    
    aplicarFiltros();
}

function renderizarDashboardSeparacao(pendencias) {
    if (!pendencias || pendencias.length === 0) {
        document.getElementById('itemList').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma pendência encontrada</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        document.getElementById('itemDetails').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Selecione um item para ver os detalhes</p>
            </div>
        `;
        return;
    }
    
    const itensAgrupados = agruparItensPorCodigo(pendencias);
    renderizarListaItensSeparacao(itensAgrupados);
    renderizarGraficosSeparacao(itensAgrupados);
    atualizarKPIsSeparacao(itensAgrupados);
}

function agruparItensPorCodigo(pendencias) {
    console.log(`📦 Agrupando itens de ${pendencias.length} pendências...`);
    const grupos = {};
    let totalItens = 0;
    
    pendencias.forEach(pendencia => {
        const itens = pendencia.itens || [];
        totalItens += itens.length;
        
        itens.forEach(item => {
            const codigo = item.codigo || 'SEM_CODIGO';
            const descricao = item.descricao || 'Sem descrição';
            const unidade = item.unidade || 'UN';
            const quantidade = parseFloat(item.quantidade) || 0;
            const baixado = item.baixado || 'NÃO';
            const valorUnitario = 0;
            
            if (!grupos[codigo]) {
                grupos[codigo] = {
                    codigo: codigo,
                    descricao: descricao,
                    unidade: unidade,
                    total: 0,
                    obras: [],
                    saidas: [],
                    itens: [],
                    statusCount: { PENDENTE: 0, BAIXADO: 0 },
                    valorStatusCount: { PENDENTE: 0, BAIXADO: 0 },
                    obrasSet: new Set(),
                    saidasSet: new Set(),
                    valorUnitario: valorUnitario,
                    quantidadeTotal: 0
                };
            }
            
            if (!grupos[codigo].descricao || grupos[codigo].descricao === 'Sem descrição') {
                grupos[codigo].descricao = descricao;
            }
            
            grupos[codigo].total += 1;
            grupos[codigo].quantidadeTotal += quantidade;
            
            const obra = pendencia.obra || 'SEM OBRA';
            const isSaida = obra.toUpperCase().includes('SAÍDA') || obra.toUpperCase().includes('SAIDA');
            const status = baixado === 'SIM' ? 'BAIXADO' : 'PENDENTE';
            
            if (grupos[codigo].statusCount[status] !== undefined) {
                grupos[codigo].statusCount[status] += 1;
                grupos[codigo].valorStatusCount[status] += quantidade * valorUnitario;
            }
            
            const itemData = {
                obra: obra,
                quantidade: quantidade,
                status: status,
                data: pendencia.data_programacao || '',
                numero: pendencia.numero,
                ...item
            };
            
            if (isSaida) {
                grupos[codigo].saidas.push(itemData);
                grupos[codigo].saidasSet.add(obra);
            } else {
                grupos[codigo].obras.push(itemData);
                grupos[codigo].obrasSet.add(obra);
            }
            
            grupos[codigo].itens.push(itemData);
        });
    });
    
    const resultado = Object.values(grupos).sort((a, b) => b.total - a.total);
    console.log(`✅ ${resultado.length} grupos de itens criados a partir de ${totalItens} itens`);
    return resultado;
}

function renderizarListaItensSeparacao(itensAgrupados) {
    const container = document.getElementById('itemList');
    if (!container) return;
    
    if (!itensAgrupados || itensAgrupados.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhum item encontrado</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 80px 1fr 70px 80px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Código</span>
            <span>Descrição</span>
            <span style="text-align: right;">Ocorr.</span>
            <span style="text-align: right;">Valor</span>
        </div>
    `;
    
    itensAgrupados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.codigo === item.codigo;
        const valorTotal = item.quantidadeTotal * item.valorUnitario;
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarItemSeparacao('${item.codigo}')" style="display: grid; grid-template-columns: 80px 1fr 70px 80px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="item-code">${item.codigo}</span>
                <span class="item-desc">${item.descricao}</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${item.total}</span>
                <span style="text-align: right; font-weight: 600; color: #ED8936; font-size: 12px;">${formatarValor(valorTotal)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function selecionarItemSeparacao(codigo) {
    console.log(`🔍 Selecionando item: ${codigo}`);
    const itensAgrupados = agruparItensPorCodigo(dadosExibidos);
    const item = itensAgrupados.find(i => i.codigo === codigo);
    
    if (item) {
        itemSelecionado = { codigo: item.codigo };
        renderizarDetalhesItemSeparacao(item);
        renderizarDashboardSeparacao(dadosExibidos);
    }
}

function renderizarDetalhesItemSeparacao(item) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    if (!item) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Selecione um item para ver os detalhes</p>
            </div>
        `;
        return;
    }
    
    let totalQuantidade = 0;
    item.itens.forEach(i => {
        totalQuantidade += parseFloat(i.quantidade) || 0;
    });
    
    const valorUnitario = item.valorUnitario;
    const valorTotal = totalQuantidade * valorUnitario;
    
    const statusMap = { PENDENTE: 0, BAIXADO: 0 };
    item.itens.forEach(i => {
        const s = i.status || 'PENDENTE';
        if (statusMap[s] !== undefined) statusMap[s] += 1;
    });
    
    let html = `
        <div class="detail-title">📦 ${item.codigo} - ${item.descricao}</div>
        <div class="detail-row">
            <span class="label">Ocorrências:</span>
            <span class="value">${item.total}</span>
        </div>
        <div class="detail-row">
            <span class="label">Quantidade Total:</span>
            <span class="value">${totalQuantidade.toFixed(2)} ${item.unidade}</span>
        </div>
        <div class="detail-row">
            <span class="label">Valor Unitário:</span>
            <span class="value" style="color: #4299E1;">${formatarValor(valorUnitario)}</span>
        </div>
        <div class="detail-row">
            <span class="label">Valor Total:</span>
            <span class="value" style="color: #ED8936; font-weight: 700;">${formatarValor(valorTotal)}</span>
        </div>
        <div class="detail-status-count">
            <span class="status-item"><span class="count status-pendente">${statusMap.PENDENTE}</span> ⏳ Pendentes</span>
            <span class="status-item"><span class="count status-baixado">${statusMap.BAIXADO}</span> ✅ Baixados</span>
        </div>
    `;
    
    if (item.obras.length > 0) {
        html += `<div class="detail-section-title">🏗️ Obras:</div>
        <div class="item-detail-obras">`;
        item.obras.forEach(o => {
            const badge = o.status === 'BAIXADO' 
                ? '<span class="badge-status baixado">✅ Baixado</span>'
                : '<span class="badge-status pendente">⏳ Pendente</span>';
            const obraFormatada = formatarObraParaExibicao(o.obra);
            html += `
                <div class="obra-row">
                    <span>${obraFormatada}</span>
                    <span>${badge}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

function atualizarKPIsSeparacao(itensAgrupados) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalOcorrencias = itensAgrupados.reduce((sum, item) => sum + item.total, 0);
    const totalSkusUnicos = itensAgrupados.length;
    
    const obrasSet = new Set();
    itensAgrupados.forEach(item => {
        item.obras.forEach(o => obrasSet.add(o.obra));
        item.saidas.forEach(s => obrasSet.add(s.obra));
    });
    const totalObras = obrasSet.size;
    
    const statusCount = { PENDENTE: 0, BAIXADO: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(statusCount).forEach(status => {
            statusCount[status] += item.statusCount[status] || 0;
        });
    });
    
    let valorTotal = 0;
    itensAgrupados.forEach(item => {
        valorTotal += item.quantidadeTotal * item.valorUnitario;
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total" style="cursor: default;">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalOcorrencias}</div>
            <div class="kpi-label">Ocorrências</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalSkusUnicos}</div>
            <div class="kpi-label">SKUs com Pendência</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras com Pendência</div>
        </div>
        <div class="kpi-card status-pendente" style="cursor: default;">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value">${statusCount.PENDENTE}</div>
            <div class="kpi-label">Pendentes</div>
        </div>
        <div class="kpi-card status-baixado" style="cursor: default;">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${statusCount.BAIXADO}</div>
            <div class="kpi-label">Baixados</div>
        </div>
        <div class="kpi-card status-valor" style="border-color: #48BB78; cursor: default;">
            <div class="kpi-icon">💰</div>
            <div class="kpi-value" style="color: #48BB78; font-size: 20px;">${formatarValor(valorTotal)}</div>
            <div class="kpi-label">Valor Total Pendente</div>
        </div>
    `;
}

function renderizarGraficosSeparacao(itensAgrupados) {
    console.log('📊 Renderizando gráficos (Separação)...');
    
    const statusCount = { PENDENTE: 0, BAIXADO: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(statusCount).forEach(status => {
            statusCount[status] += item.statusCount[status] || 0;
        });
    });
    
    const totalGeral = Object.values(statusCount).reduce((sum, v) => sum + v, 0);
    const maxValue = totalGeral > 0 ? totalGeral : 1;
    
    const statusLabels = {
        'PENDENTE': 'Pendentes',
        'BAIXADO': 'Baixados'
    };
    
    const statusClasses = {
        'PENDENTE': 'bar-pendente',
        'BAIXADO': 'bar-baixado'
    };
    
    let htmlStatus = '';
    Object.keys(statusCount).forEach(status => {
        const value = statusCount[status];
        const percentual = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const colorClass = statusClasses[status];
        
        htmlStatus += `
            <div class="chart-bar-indicator">
                <span class="label">${statusLabels[status]}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${percentual}%;">
                        <span class="value">${value}</span>
                    </div>
                </div>
                <span class="percent">${percentual.toFixed(0)}%</span>
            </div>
        `;
    });
    
    htmlStatus += `
        <div class="chart-bar-indicator" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span class="label" style="font-weight: 700;">Total</span>
            <div class="bar-track">
                <div class="bar-fill bar-total" style="width: 100%;">
                    <span class="value">${totalGeral}</span>
                </div>
            </div>
            <span class="percent" style="font-weight: 700;">100%</span>
        </div>
    `;
    
    document.getElementById('statusChart').innerHTML = htmlStatus;
    
    const valorStatus = { PENDENTE: 0, BAIXADO: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(valorStatus).forEach(status => {
            valorStatus[status] += item.valorStatusCount[status] || 0;
        });
    });
    
    const valorTotal = Object.values(valorStatus).reduce((sum, v) => sum + v, 0);
    const maxValor = valorTotal > 0 ? valorTotal : 1;
    
    let htmlValor = '';
    Object.keys(valorStatus).forEach(status => {
        const value = valorStatus[status];
        const percentual = maxValor > 0 ? (value / maxValor) * 100 : 0;
        const colorClass = statusClasses[status];
        
        htmlValor += `
            <div class="chart-bar-indicator">
                <span class="label">${statusLabels[status]}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${percentual}%;">
                        <span class="value">${formatarValor(value)}</span>
                    </div>
                </div>
                <span class="percent">${percentual.toFixed(0)}%</span>
            </div>
        `;
    });
    
    htmlValor += `
        <div class="chart-bar-indicator" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span class="label" style="font-weight: 700;">Total</span>
            <div class="bar-track">
                <div class="bar-fill bar-total" style="width: 100%;">
                    <span class="value">${formatarValor(valorTotal)}</span>
                </div>
            </div>
            <span class="percent" style="font-weight: 700;">100%</span>
        </div>
    `;
    
    document.getElementById('valorChart').innerHTML = htmlValor;
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 DOM carregado, iniciando dashboard...');
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (!loadingOverlay || !dashboardContent) {
        console.error('❌ Elementos não encontrados!');
        return;
    }
    
    const sessao = getSessao();
    if (!sessao) {
        console.log('❌ Sessão inválida');
        return;
    }
    
    console.log('👤 Usuário:', sessao.nome, '- Perfil:', sessao.perfil);
    
    document.getElementById('userName').textContent = sessao.nome || 'Usuário';
    document.getElementById('userMatricula').textContent = `Matrícula: ${sessao.matricula || '---'}`;
    document.getElementById('userPerfil').textContent = sessao.perfil || 'GESTÃO';
    
    try {
        console.log('📡 Iniciando busca de dados (Pendência de Baixa)...');
        
        dadosCompletos = await buscarPendenciasBaixa();
        
        console.log(`✅ ${dadosCompletos.length} pendências carregadas`);
        
        let totalItens = 0;
        dadosCompletos.forEach(p => {
            if (p.itens) {
                totalItens += p.itens.length;
            }
        });
        console.log(`📦 Total de itens encontrados: ${totalItens}`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhuma pendência de requisição encontrada');
            mostrarToast('⚠️ Nenhuma pendência de requisição encontrada', 'warning');
        }
        
        criarMeses();
        aplicarFiltros();
        
        trocarAbaPrincipal('separacao');
        
        // ============================================
        // CARREGAR PROGRAMAÇÃO SIAGO
        // ============================================
        try {
            console.log('📡 Carregando programação siago...');
            const programacaoData = await carregarProgramacaoSiago();
            if (programacaoData) {
                // Os dados já estão em window.__dadosProgramacaoSiago e window.__etapasPorObra
                console.log(`✅ Programação siago carregada: ${Object.keys(window.__etapasPorObra || {}).length} obras`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar programação siago:', error);
        }
        
        setTimeout(() => {
            carregarDadosMGM();
        }, 500);
        
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        console.log('✅ Dashboard renderizado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarToast(`❌ Erro ao carregar dados: ${error.message}`, 'error');
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        
        document.getElementById('itemList').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">❌</div>
                <p>Erro ao carregar dados</p>
                <p class="sub">${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 20px; background: #4299E1; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Tentar novamente
                </button>
            </div>
        `;
    }
});

// ============================================
// EXPORTAR FUNÇÕES PARA USO GLOBAL
// ============================================

window.trocarAbaPrincipal = trocarAbaPrincipal;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.filtrarPorMes = filtrarPorMes;
window.selecionarItemSeparacao = selecionarItemSeparacao;
window.selecionarObraMGM = selecionarObraMGM;
window.selecionarDataObraMGM = selecionarDataObraMGM;
window.carregarDadosMGM = carregarDadosMGM;
window.aplicarFiltrosMGM = aplicarFiltrosMGM;
window.limparFiltrosMGM = limparFiltrosMGM;
window.renderizarDashboardMGM = renderizarDashboardMGM;
window.aplicarFiltroStatusMGM = aplicarFiltroStatusMGM;
window.aplicarFiltroEtapas = aplicarFiltroEtapas;

console.log('✅ dashboards-pendencia-requisicao.js inicializado!');