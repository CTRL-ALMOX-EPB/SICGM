// ============================================
// PROGRAMAÇÃO SIAGO - PROCESSAMENTO DE DADOS
// ============================================

console.log('🚀 programacao-siago.js carregado!');

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let dadosProgramacaoSiago = [];
let dadosProgramacaoProcessados = {};
let etapasPorObra = {};

// ============================================
// URL DO ARQUIVO NO R2
// ============================================

const PROGRAMACAO_SIAGO_URL = `${API_URL}/proxy/programacao-siago`;

// ============================================
// FUNÇÃO: CARREGAR E PROCESSAR PROGRAMAÇÃO SIAGO
// ============================================

async function carregarProgramacaoSiago() {
    console.log('📡 Carregando programacao_siago.txt...');
    
    try {
        const response = await fetch(PROGRAMACAO_SIAGO_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const texto = await response.text();
        console.log(`✅ Arquivo carregado (${texto.split('\n').length} linhas)`);
        
        processarDadosProgramacao(texto);
        console.log(`✅ Dados processados: ${Object.keys(etapasPorObra).length} obras únicas`);
        
        return dadosProgramacaoProcessados;
        
    } catch (error) {
        console.error('❌ Erro ao carregar programacao_siago.txt:', error);
        return null;
    }
}

// ============================================
// FUNÇÃO: PROCESSAR DADOS (ELIMINAR DUPLICIDADES)
// ============================================

function processarDadosProgramacao(texto) {
    console.log('🔄 Processando dados de programação...');
    
    const linhas = texto.trim().split('\n');
    
    if (linhas.length < 2) {
        console.warn('⚠️ Arquivo vazio ou com apenas cabeçalho');
        return;
    }
    
    // Parse do cabeçalho
    const cabecalho = linhas[0].split('\t').map(h => h.trim().toLowerCase());
    console.log(`📋 Cabeçalho: ${cabecalho.length} colunas`);
    
    // Mapear índices das colunas que nos interessam
    const idxNumObra = cabecalho.indexOf('num_obra');
    const idxEtapa = cabecalho.indexOf('etapa');
    const idxSituacao = cabecalho.indexOf('dsc_situacao_programacao_obra');
    const idxObra = cabecalho.indexOf('end_obra') !== -1 ? cabecalho.indexOf('end_obra') : -1;
    const idxBairro = cabecalho.indexOf('bairro_obra') !== -1 ? cabecalho.indexOf('bairro_obra') : -1;
    const idxLocalidade = cabecalho.indexOf('localidade_obra') !== -1 ? cabecalho.indexOf('localidade_obra') : -1;
    const idxUf = cabecalho.indexOf('uf_obra') !== -1 ? cabecalho.indexOf('uf_obra') : -1;
    const idxCliente = cabecalho.indexOf('cliente') !== -1 ? cabecalho.indexOf('cliente') : -1;
    const idxDataInicial = cabecalho.indexOf('dth_programacao_inicial') !== -1 ? cabecalho.indexOf('dth_programacao_inicial') : -1;
    const idxDataFinal = cabecalho.indexOf('dth_programacao_final') !== -1 ? cabecalho.indexOf('dth_programacao_final') : -1;
    const idxStatus = cabecalho.indexOf('dsc_status') !== -1 ? cabecalho.indexOf('dsc_status') : -1;
    
    console.log(`📌 Índices mapeados:`);
    console.log(`   - num_obra: ${idxNumObra}`);
    console.log(`   - etapa: ${idxEtapa}`);
    console.log(`   - dsc_situacao_programacao_obra: ${idxSituacao}`);
    
    // Objeto para armazenar dados processados (elimina duplicidades)
    const obrasMap = {};
    let linhasProcessadas = 0;
    let duplicadasIgnoradas = 0;
    
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const partes = linha.split('\t');
        if (partes.length < 3) continue;
        
        const numObra = partes[idxNumObra]?.trim() || '';
        const etapaStr = partes[idxEtapa]?.trim() || '';
        const situacao = partes[idxSituacao]?.trim() || '';
        
        if (!numObra || !etapaStr) continue;
        
        const etapa = parseInt(etapaStr);
        if (isNaN(etapa)) continue;
        
        // Chave única: obra + etapa
        const chave = `${numObra}|${etapa}`;
        
        // Se já existe esta combinação, ignora (duplicidade)
        if (obrasMap[chave]) {
            duplicadasIgnoradas++;
            continue;
        }
        
        // Extrair informações adicionais
        const endereco = idxObra !== -1 ? partes[idxObra]?.trim() || '' : '';
        const bairro = idxBairro !== -1 ? partes[idxBairro]?.trim() || '' : '';
        const localidade = idxLocalidade !== -1 ? partes[idxLocalidade]?.trim() || '' : '';
        const uf = idxUf !== -1 ? partes[idxUf]?.trim() || '' : '';
        const cliente = idxCliente !== -1 ? partes[idxCliente]?.trim() || '' : '';
        const dataInicial = idxDataInicial !== -1 ? partes[idxDataInicial]?.trim() || '' : '';
        const dataFinal = idxDataFinal !== -1 ? partes[idxDataFinal]?.trim() || '' : '';
        const statusObra = idxStatus !== -1 ? partes[idxStatus]?.trim() || '' : '';
        
        // Armazenar
        obrasMap[chave] = {
            num_obra: numObra,
            obra_formatada: formatarObraParaExibicao(numObra),
            etapa: etapa,
            situacao: situacao,
            endereco: endereco,
            bairro: bairro,
            localidade: localidade,
            uf: uf,
            cliente: cliente,
            data_inicial: dataInicial,
            data_final: dataFinal,
            status: statusObra,
            // Flag: é reprovada?
            is_reprovada: situacao === 'ETAPA REPROVADA'
        };
        
        linhasProcessadas++;
    }
    
    console.log(`✅ ${linhasProcessadas} registros processados, ${duplicadasIgnoradas} duplicidades ignoradas`);
    
    // ============================================
    // AGRUPAR POR OBRA PARA CONTAGEM DE ETAPAS
    // ============================================
    
    const etapasPorObraTemp = {};
    
    for (const chave in obrasMap) {
        const dado = obrasMap[chave];
        const numObra = dado.num_obra;
        
        if (!etapasPorObraTemp[numObra]) {
            etapasPorObraTemp[numObra] = {
                num_obra: numObra,
                obra_formatada: dado.obra_formatada,
                endereco: dado.endereco,
                bairro: dado.bairro,
                localidade: dado.localidade,
                uf: dado.uf,
                cliente: dado.cliente,
                status: dado.status,
                etapas: [],
                total_etapas: 0,
                etapas_reprovadas: 0,
                etapas_validas: 0,
                etapas_detalhes: {}
            };
        }
        
        // Adicionar etapa à lista
        etapasPorObraTemp[numObra].etapas.push(dado.etapa);
        
        // Contar reprovadas
        if (dado.is_reprovada) {
            etapasPorObraTemp[numObra].etapas_reprovadas++;
        }
        
        // Armazenar detalhes da etapa
        etapasPorObraTemp[numObra].etapas_detalhes[dado.etapa] = {
            situacao: dado.situacao,
            is_reprovada: dado.is_reprovada,
            data_inicial: dado.data_inicial,
            data_final: dado.data_final
        };
    }
    
    // Calcular totais
    for (const numObra in etapasPorObraTemp) {
        const obra = etapasPorObraTemp[numObra];
        obra.total_etapas = obra.etapas.length;
        obra.etapas_validas = obra.total_etapas - obra.etapas_reprovadas;
        obra.etapas.sort((a, b) => a - b); // Ordenar etapas numericamente
    }
    
    // Armazenar nos objetos globais
    dadosProgramacaoProcessados = obrasMap;
    etapasPorObra = etapasPorObraTemp;
    
    console.log(`📊 Resumo por obra:`);
    let totalObras = 0;
    let totalEtapas = 0;
    let totalReprovadas = 0;
    
    for (const numObra in etapasPorObra) {
        const obra = etapasPorObra[numObra];
        totalObras++;
        totalEtapas += obra.total_etapas;
        totalReprovadas += obra.etapas_reprovadas;
    }
    
    console.log(`   - ${totalObras} obras únicas`);
    console.log(`   - ${totalEtapas} etapas no total`);
    console.log(`   - ${totalReprovadas} etapas reprovadas`);
    console.log(`   - ${totalEtapas - totalReprovadas} etapas válidas (não reprovadas)`);
}

// ============================================
// FUNÇÃO: OBTER ETAPAS POR OBRA
// ============================================

function getEtapasPorObra(numObra) {
    if (!numObra) return null;
    
    // Normalizar obra para 10 dígitos
    const obraNorm = normalizarObra(numObra);
    
    if (etapasPorObra[obraNorm]) {
        return etapasPorObra[obraNorm];
    }
    
    // Tentar buscar com zeros à esquerda
    for (const key in etapasPorObra) {
        if (key === obraNorm || key === numObra) {
            return etapasPorObra[key];
        }
    }
    
    return null;
}

// ============================================
// FUNÇÃO: OBTER RESUMO DE ETAPAS PARA EXIBIÇÃO
// ============================================

function getResumoEtapasParaExibicao(numObra) {
    const dados = getEtapasPorObra(numObra);
    
    if (!dados) {
        return {
            existe: false,
            total: 0,
            validas: 0,
            reprovadas: 0,
            texto: '📭 Sem dados de programação'
        };
    }
    
    return {
        existe: true,
        total: dados.total_etapas,
        validas: dados.etapas_validas,
        reprovadas: dados.etapas_reprovadas,
        etapas: dados.etapas,
        detalhes: dados.etapas_detalhes,
        texto: `${dados.etapas_validas} etapas válidas (${dados.total_etapas} total)`,
        cor: dados.etapas_validas > 0 ? '#48BB78' : '#FC8181'
    };
}

// ============================================
// FUNÇÃO: FORMATAR ETAPAS PARA EXIBIÇÃO
// ============================================

function formatarEtapasParaExibicao(numObra) {
    const dados = getEtapasPorObra(numObra);
    
    if (!dados) return 'Sem dados';
    
    return dados.etapas.join(' → ');
}

function formatarSituacaoEtapa(situacao) {
    if (!situacao) return 'Desconhecida';
    
    if (situacao === 'ETAPA REPROVADA') {
        return '🔴 REPROVADA';
    }
    if (situacao === 'ETAPA CONCLUÍDA') {
        return '✅ CONCLUÍDA';
    }
    if (situacao === 'ETAPA CANCELADA') {
        return '⛔ CANCELADA';
    }
    if (situacao === 'ETAPA PENDENTE') {
        return '⏳ PENDENTE';
    }
    return situacao;
}

// ============================================
// FUNÇÃO: GERAR HTML DE ETAPAS PARA O DASHBOARD
// ============================================

function gerarHTMLEtapas(numObra) {
    const dados = getEtapasPorObra(numObra);
    
    if (!dados) {
        return `
            <div class="etapas-info empty">
                <span class="etapas-icon">📭</span>
                <span class="etapas-text">Sem dados de programação</span>
            </div>
        `;
    }
    
    const total = dados.total_etapas;
    const validas = dados.etapas_validas;
    const reprovadas = dados.etapas_reprovadas;
    const percentualValidas = total > 0 ? Math.round((validas / total) * 100) : 0;
    
    let etapasHTML = '';
    dados.etapas.forEach(etapa => {
        const detalhe = dados.etapas_detalhes[etapa] || {};
        const situacao = detalhe.situacao || 'Desconhecida';
        const isReprovada = situacao === 'ETAPA REPROVADA';
        const icon = isReprovada ? '🔴' : (situacao === 'ETAPA CONCLUÍDA' ? '✅' : '⏳');
        const classe = isReprovada ? 'etapa-reprovada' : (situacao === 'ETAPA CONCLUÍDA' ? 'etapa-concluida' : 'etapa-pendente');
        
        etapasHTML += `
            <span class="etapa-badge ${classe}" title="${situacao}">
                ${icon} ${etapa}
            </span>
        `;
    });
    
    return `
        <div class="etapas-info">
            <div class="etapas-resumo">
                <span class="etapas-total">📊 ${total} etapas</span>
                <span class="etapas-validas" style="color: ${validas > 0 ? '#48BB78' : '#718096'};">✅ ${validas} válidas</span>
                <span class="etapas-reprovadas" style="color: ${reprovadas > 0 ? '#FC8181' : '#718096'};">🔴 ${reprovadas} reprovadas</span>
                <span class="etapas-percentual">${percentualValidas}% válidas</span>
            </div>
            <div class="etapas-badges">
                ${etapasHTML}
            </div>
        </div>
    `;
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================

window.carregarProgramacaoSiago = carregarProgramacaoSiago;
window.getEtapasPorObra = getEtapasPorObra;
window.getResumoEtapasParaExibicao = getResumoEtapasParaExibicao;
window.formatarEtapasParaExibicao = formatarEtapasParaExibicao;
window.formatarSituacaoEtapa = formatarSituacaoEtapa;
window.gerarHTMLEtapas = gerarHTMLEtapas;

console.log('✅ programacao-siago.js inicializado!');