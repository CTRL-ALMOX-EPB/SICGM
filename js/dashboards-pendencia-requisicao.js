// ============================================
// DASHBOARD PENDÊNCIA DE REQUISIÇÃO - v5
// Lógica: MGM (Σ QTD. APLICADA da devolucao_compilada) × qtdrealizada (previsto_realizado)
//
// REQUISITAR → qtdMGM > qtdRealizada  (falta subir o sistêmico)
// DEVOLVER   → qtdRealizada > qtdMGM  (sobra, precisa baixar)
// OK         → |qtdMGM - qtdRealizada| <= 0.01
//
// Fontes:
//   - devolucao_compilada.txt (R2)   → MGM (usado fisicamente)
//   - previsto_realizado.txt (R2)    → requisitado no sistêmico
//   - programacao_siago.txt (R2)     → etapas formais (visual)
//
// QTD. DMA NOVO é ignorado (só rastreio, não entra na conta)
// mgm-online-completo (D1) não é usado nesta versão (futuro)
// ============================================

console.log('🚀 dashboards-pendencia-requisicao.js carregado! (v5 - devolucao_compilada × previsto_realizado)');

const ARQUIVOS_R2 = {
    movimentosSiago:    `${API_URL}/proxy/movimentos-siago`,
    programacaoSiago:   `${API_URL}/proxy/programacao-siago`,
    previstoRealizado:  `${API_URL}/proxy/previsto-realizado`,
    devolucaoCompilada: `${API_URL}/proxy/devolucao-compilada`
};

// ============================================
// ESTADO GLOBAL
// ============================================

let dadosCarregadosMGM = false;
let pendenciasConsolidadas = [];   // [{ obra, codigo, qtdMGM, qtdRealizada, falta, sobra, status, ... }]
let dadosFiltradosMGM = [];
let dadosEtapasPorObra = {};       // { obra: { etapasMGM: [...], ... } }
let filtroStatusMGMAtivo = null;
let itemSelecionadoMGM = null;     // { obra }
let filtroEtapasMinimo = 0;

const DATA_CORTE_INICIO_OBRA = '2026-07-01';
const TOLERANCIA_QTD = 0.01;

let obrasPermitidas = null;
const __cacheInicioObra = {};

// ============================================
// HELPERS BÁSICOS
// ============================================

function getEtapasPorObraData() {
    return window.__etapasPorObra || {};
}

// Converte string numérica com vírgula ou ponto decimal para float.
// Suporta "1.234,56" e "1234.56" e "1234,56".
function parseNumeroBR(valor) {
    if (valor === null || valor === undefined) return 0;
    let s = String(valor).trim();
    if (!s) return 0;
    // Remove espaços e possíveis caracteres de moeda
    s = s.replace(/\s/g, '').replace(/[R$]/g, '');
    // Caso tenha vírgula E ponto: o último separador é o decimal
    const temVirgula = s.includes(',');
    const temPonto = s.includes('.');
    if (temVirgula && temPonto) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            // Formato pt-BR: 1.234,56
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            // Formato en-US: 1,234.56
            s = s.replace(/,/g, '');
        }
    } else if (temVirgula) {
        s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

// Converte data "DD.MM.YYYY", "DD/MM/YYYY" ou "YYYY-MM-DD" → "YYYY-MM-DD"
function parseDataGenerica(str) {
    if (!str) return null;
    const s = String(str).trim();
    let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
}

// Mantido para compatibilidade (programacao_siago usa DD/MM/YYYY ou YYYY-MM-DD)
function parseDataSiago(str) {
    return parseDataGenerica(str);
}

function normalizarObra(obra) {
    if (!obra) return '';
    let limpo = String(obra).trim().replace(/[^0-9]/g, '');
    if (limpo.length === 10) return limpo;
    if (limpo.length === 9) return '0' + limpo;
    if (limpo.length < 9) {
        const padStart = 10 - limpo.length;
        return '0'.repeat(padStart) + limpo;
    }
    return limpo;
}

function formatarObra(obra) {
    if (!obra) return '';
    let limpo = String(obra).trim().replace(/[^0-9]/g, '');
    if (limpo.length !== 10) return obra;
    return limpo.substring(0, 3) + '-' + limpo.substring(3, 5) + '-' + limpo.substring(5, 10);
}

function formatarData(dataString) {
    if (!dataString) return '-';
    const s = String(dataString).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    const m2 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (m2) return s.substring(0, 10);
    const m3 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m3) return `${m[1]}.${m[2]}.${m[3]}`;
    return s.substring(0, 10);
}

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
// PARSER — DEVOLUÇÃO COMPILADA (= MGM)
// Colunas: OBRA, DATA, CÓDIGO, DESCRIÇÃO, QTD. APLICADA, QTD. DMA NOVO, ARQUIVO
// Agrega por obra+codigo:  Σ QTD. APLICADA, lista de datas (MGMs), descrição, unidade
// ============================================

function parsearDevolucaoCompilada(texto) {
    console.log('🔄 Parseando devolucao_compilada.txt...');
    const linhas = texto.split(/\r?\n/);
    if (linhas.length < 2) {
        console.warn('⚠️ devolucao_compilada.txt vazio ou sem cabeçalho');
        return { mgmMap: {}, etapasPorObra: {} };
    }

    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    const idx = {
        obra:        cabecalho.findIndex(h => /^OBRA$/i.test(h)),
        data:        cabecalho.findIndex(h => /^DATA$/i.test(h)),
        codigo:      cabecalho.findIndex(h => /C[ÓO]DIGO/i.test(h)),
        descricao:   cabecalho.findIndex(h => /DESCRI[ÇC][ÃA]O/i.test(h)),
        qtdAplicada: cabecalho.findIndex(h => /QTD\.?\s*APLICADA/i.test(h)),
        qtdDmaNovo:  cabecalho.findIndex(h => /QTD\.?\s*DMA/i.test(h))
    };

    if (idx.obra < 0 || idx.codigo < 0 || idx.qtdAplicada < 0 || idx.data < 0) {
        console.error('❌ Cabeçalho inesperado em devolucao_compilada:', cabecalho);
        return { mgmMap: {}, etapasPorObra: {} };
    }

    const mgmMap = {};           // chave: "obra|codigo"
    const etapasPorObra = {};    // chave: obra → { etapasMGM: [{ numero, data, itens: [] }] }
    let totalLinhas = 0;
    let linhasIgnoradasZero = 0;

    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha.trim()) continue;
        const c = linha.split('\t');
        if (c.length < cabecalho.length) continue;

        const obra = normalizarObra(c[idx.obra] || '');
        const codigo = String(c[idx.codigo] || '').trim();
        if (!obra || !codigo) continue;

        const qtdAplicada = parseNumeroBR(c[idx.qtdAplicada]);
        if (qtdAplicada <= 0) {
            linhasIgnoradasZero++;
            continue;
        }

        const dataOriginal = (c[idx.data] || '').trim();
        const dataISO = parseDataGenerica(dataOriginal);
        const descricao = (c[idx.descricao] || '').trim();

        // Agrega MGM por obra+codigo
        const chave = `${obra}|${codigo}`;
        if (!mgmMap[chave]) {
            mgmMap[chave] = {
                obra,
                codigo,
                descricao,
                unidade: '',           // devolucao_compilada não traz unidade → preenche depois via previsto
                qtdMGM: 0,
                qtdDMA: 0,
                datas: [],
                arquivos: new Set()
            };
        }
        mgmMap[chave].qtdMGM += qtdAplicada;
        if (idx.qtdDmaNovo >= 0) {
            mgmMap[chave].qtdDMA += parseNumeroBR(c[idx.qtdDmaNovo]);
        }
        if (dataISO && !mgmMap[chave].datas.includes(dataISO)) {
            mgmMap[chave].datas.push(dataISO);
        }
        mgmMap[chave].arquivos.add(`${obra}|${dataOriginal}`);

        // Agrupa itens por obra+data (cada data = uma MGM)
        if (!etapasPorObra[obra]) {
            etapasPorObra[obra] = { obra, etapasMGM: [], _mapa: {} };
        }
        const grupoObra = etapasPorObra[obra];
        const chaveData = dataISO || dataOriginal || 'SEM_DATA';
        if (!grupoObra._mapa[chaveData]) {
            grupoObra._mapa[chaveData] = {
                numero: chaveData,           // string YYYY-MM-DD (ou "SEM_DATA")
                data: dataISO || '',
                dataOriginal,
                qtdItens: 0,
                qtdAplicadaTotal: 0,
                itens: []
            };
            grupoObra.etapasMGM.push(grupoObra._mapa[chaveData]);
        }
        grupoObra._mapa[chaveData].itens.push({
            codigo,
            descricao,
            qtdAplicada
        });
        grupoObra._mapa[chaveData].qtdItens += 1;
        grupoObra._mapa[chaveData].qtdAplicadaTotal += qtdAplicada;

        totalLinhas++;
    }

    // Converte Set de datas em array ordenado e limpa _mapa
    Object.keys(mgmMap).forEach(k => {
        mgmMap[k].datas.sort();
        delete mgmMap[k].arquivos;
    });
    Object.keys(etapasPorObra).forEach(o => {
        delete etapasPorObra[o]._mapa;
        etapasPorObra[o].etapasMGM.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    });

    console.log(`✅ devolucao_compilada: ${totalLinhas} linhas válidas | ${Object.keys(mgmMap).length} combinações obra+codigo | ${Object.keys(etapasPorObra).length} obras`);
    console.log(`   🔇 ${linhasIgnoradasZero} linhas ignoradas (QTD. APLICADA = 0 ou vazia)`);
    return { mgmMap, etapasPorObra };
}

// ============================================
// PARSER — PREVISTO REALIZADO
// Colunas: num_obra, cod_material, descricao, und_medida, qtdprevista, qtdrealizada, val_material, val_requisitado, nome
// ============================================

function parsearPrevistoRealizado(texto) {
    console.log('🔄 Parseando previsto_realizado.txt...');
    const linhas = texto.split(/\r?\n/);
    if (linhas.length < 2) return {};
    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    const idx = {
        num_obra:        cabecalho.indexOf('num_obra'),
        cod_material:    cabecalho.indexOf('cod_material'),
        descricao:       cabecalho.indexOf('descricao'),
        und_medida:      cabecalho.indexOf('und_medida'),
        qtdprevista:     cabecalho.indexOf('qtdprevista'),
        qtdrealizada:    cabecalho.indexOf('qtdrealizada'),
        val_material:    cabecalho.indexOf('val_material'),
        val_requisitado: cabecalho.indexOf('val_requisitado'),
        nome:            cabecalho.indexOf('nome')
    };
    const mapa = {};
    let totalLinhas = 0;
    for (let i = 1; i < linhas.length; i++) {
        const c = linhas[i].split('\t');
        if (c.length < cabecalho.length) continue;
        const obra = normalizarObra(c[idx.num_obra] || '');
        const codigo = String(c[idx.cod_material] || '').trim();
        if (!obra || !codigo) continue;
        const chave = `${obra}|${codigo}`;
        const qtdRealizada = parseNumeroBR(c[idx.qtdrealizada]);
        const qtdPrevista = parseNumeroBR(c[idx.qtdprevista]);
        if (!mapa[chave]) {
            mapa[chave] = {
                obra,
                codigo,
                descricao: (c[idx.descricao] || '').trim(),
                unidade: (c[idx.und_medida] || 'UN').trim(),
                qtdPrevista: 0,
                qtdRealizada: 0,
                valorUnitario: parseNumeroBR(c[idx.val_material]),
                valorRequisitado: 0,
                nome: (c[idx.nome] || '').trim()
            };
        }
        mapa[chave].qtdPrevista += qtdPrevista;
        mapa[chave].qtdRealizada += qtdRealizada;
        mapa[chave].valorRequisitado += parseNumeroBR(c[idx.val_requisitado]);
        totalLinhas++;
    }
    console.log(`✅ previsto_realizado: ${totalLinhas} linhas | ${Object.keys(mapa).length} combinações obra+codigo`);
    return mapa;
}

// ============================================
// CONSOLIDAÇÃO POR OBRA
// Regras:
//   qtdMGM       = Σ QTD. APLICADA (devolucao_compilada) = usado fisicamente
//   qtdRealizada = previsto_realizado.qtdrealizada      = requisitado no sistêmico
//
//   qtdMGM > qtdRealizada → 🔴 REQUISITAR (falta subir o sistêmico)
//   qtdRealizada > qtdMGM → 🟠 DEVOLVER   (sobra, precisa baixar)
//   |diferença| <= TOLERANCIA_QTD → ✅ OK
// ============================================

function consolidarPorObra(mgmMap, previstoMap) {
    console.log('🔄 Consolidando (MGM × previsto_realizado)...');
    const pendencias = [];
    const todasChaves = new Set([
        ...Object.keys(mgmMap || {}),
        ...Object.keys(previstoMap || {})
    ]);

    todasChaves.forEach(chave => {
        const mgm = mgmMap[chave];
        const prev = previstoMap[chave];

        const obra = (mgm?.obra) || (prev?.obra) || normalizarObra(chave.split('|')[0]);
        const codigo = (mgm?.codigo) || (prev?.codigo) || chave.split('|')[1];
        const descricao = (prev?.descricao) || (mgm?.descricao) || '';
        const unidade = (prev?.unidade) || (mgm?.unidade) || 'UN';

        const qtdMGM = mgm?.qtdMGM || 0;
        const qtdRealizada = prev?.qtdRealizada || 0;

        // falta requisitar → MGM > Realizada → precisa SUBIR o sistêmico
        // devolver (sobra) → Realizada > MGM → precisa BAIXAR o sistêmico
        const falta = Math.max(0, qtdMGM - qtdRealizada);
        const sobra = Math.max(0, qtdRealizada - qtdMGM);
        const diferenca = qtdMGM - qtdRealizada;   // com sinal, útil para debug

        let status;
        if (falta > TOLERANCIA_QTD) {
            status = 'REQUISITAR';
        } else if (sobra > TOLERANCIA_QTD) {
            status = 'DEVOLVER';
        } else {
            status = 'OK';
        }

        pendencias.push({
            obra,
            obraFormatada: formatarObra(obra),
            codigo,
            descricao,
            unidade,
            qtdMGM,
            qtdRealizada,
            qtdPrevista: prev?.qtdPrevista || 0,
            diferenca,
            falta,
            sobra,
            status,
            valorUnitario: prev?.valorUnitario || 0,
            valorRequisitado: prev?.valorRequisitado || 0,
            nome: prev?.nome || '',
            datasMGM: mgm?.datas || [],
            numEtapasMGM: (mgm?.datas || []).length
        });
    });

    console.log(`✅ ${pendencias.length} pendências geradas`);
    console.log(`   🔴 Requisitar (falta subir):   ${pendencias.filter(p => p.status === 'REQUISITAR').length}`);
    console.log(`   🟠 Devolver  (precisa baixar): ${pendencias.filter(p => p.status === 'DEVOLVER').length}`);
    console.log(`   ✅ OK (MGM ≈ Realizada):        ${pendencias.filter(p => p.status === 'OK').length}`);

    return { pendencias };
}

// ============================================
// PROGRAMAÇÃO SIAGO (etapas formais — apenas visual)
// ============================================

function parsearProgramacaoSiago(texto) {
    console.log('🔄 Parseando programacao_siago.txt...');
    const linhas = texto.trim().split(/\r?\n/);
    if (linhas.length < 2) return {};
    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    const idx = {
        num_obra: cabecalho.indexOf('num_obra'),
        etapa: cabecalho.indexOf('etapa'),
        dth_programacao_inicial: cabecalho.indexOf('dth_programacao_inicial'),
        dsc_situacao_programacao_obra: cabecalho.indexOf('dsc_situacao_programacao_obra'),
        cod_situacao_programacao_obra: cabecalho.indexOf('cod_situacao_programacao_obra'),
        dsc_etapa: cabecalho.indexOf('dsc_etapa'),
        idt_programacao_obra: cabecalho.indexOf('idt_programacao_obra')
    };
    const etapasPorObra = {};
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i];
        if (!linha.trim()) continue;
        const partes = linha.split('\t');
        const numObra = (partes[idx.num_obra] || '').trim();
        if (!numObra) continue;
        const obraNorm = normalizarObra(numObra);
        if (!etapasPorObra[obraNorm]) {
            etapasPorObra[obraNorm] = {
                obra: obraNorm, etapas_raw: [], etapas: [],
                etapas_detalhes: {}, total_etapas: 0,
                etapas_validas: 0, etapas_reprovadas: 0
            };
        }
        const etapaNum = parseInt(partes[idx.etapa] || '0');
        const dth = (partes[idx.dth_programacao_inicial] || '').trim();
        const situacao = (partes[idx.dsc_situacao_programacao_obra] || '').trim();
        const codSituacao = parseInt(partes[idx.cod_situacao_programacao_obra] || '0');
        const dscEtapa = (partes[idx.dsc_etapa] || '').trim();
        const idtProg = (partes[idx.idt_programacao_obra] || '').trim();
        const registro = {
            etapa: etapaNum,
            dth_programacao_inicial: dth,
            data_programacao_inicial: parseDataSiago(dth),
            dsc_situacao_programacao_obra: situacao,
            cod_situacao_programacao_obra: codSituacao,
            dsc_etapa: dscEtapa,
            idt_programacao_obra: idtProg
        };
        etapasPorObra[obraNorm].etapas_raw.push(registro);
        etapasPorObra[obraNorm].etapas.push(etapaNum);
        etapasPorObra[obraNorm].etapas_detalhes[String(etapaNum)] = registro;
    }
    Object.keys(etapasPorObra).forEach(obraNorm => {
        const info = etapasPorObra[obraNorm];
        const etapasUnicas = [...new Set(info.etapas)].sort((a, b) => a - b);
        info.etapas = etapasUnicas;
        info.total_etapas = etapasUnicas.length;
        let validas = 0, reprovadas = 0;
        etapasUnicas.forEach(n => {
            const det = info.etapas_detalhes[String(n)];
            if (!det) return;
            const s = (det.dsc_situacao_programacao_obra || '').toUpperCase();
            if (s.includes('CANCELADA') || s.includes('REPROVADA')) reprovadas++;
            else validas++;
        });
        info.etapas_validas = validas;
        info.etapas_reprovadas = reprovadas;
    });
    console.log(`✅ ${Object.keys(etapasPorObra).length} obras com programação Siago`);
    return etapasPorObra;
}

function getEtapasPorObra(obraNorm) {
    const etapasPorObra = getEtapasPorObraData();
    const info = etapasPorObra[obraNorm];
    if (!info) return null;
    return {
        total_etapas: info.total_etapas,
        etapas_validas: info.etapas_validas,
        etapas_reprovadas: info.etapas_reprovadas,
        etapas: info.etapas,
        etapas_detalhes: info.etapas_detalhes
    };
}

function etapaEhValida(det) {
    if (!det) return false;
    const s = String(det.dsc_situacao_programacao_obra || '').toUpperCase();
    if (s.includes('CANCELADA') || s.includes('REPROVADA')) return false;
    return true;
}

function getPrimeiraEtapaValida(obraNorm) {
    const etapasPorObra = getEtapasPorObraData();
    const info = etapasPorObra[obraNorm];
    if (!info || !info.etapas_raw || info.etapas_raw.length === 0) return null;
    const linhas = [...info.etapas_raw].sort((a, b) => (a.etapa || 0) - (b.etapa || 0));
    for (const linha of linhas) {
        if (etapaEhValida(linha) && linha.data_programacao_inicial) return linha;
    }
    return null;
}

function getDataInicioObra(obraNorm) {
    if (!obraNorm) return null;
    if (__cacheInicioObra[obraNorm] !== undefined) return __cacheInicioObra[obraNorm];
    const primeira = getPrimeiraEtapaValida(obraNorm);
    const resultado = primeira ? primeira.data_programacao_inicial : null;
    __cacheInicioObra[obraNorm] = resultado;
    return resultado;
}

function classificarObra(obraNorm) {
    const etapasPorObra = getEtapasPorObraData();
    const info = etapasPorObra[obraNorm];
    if (!info || !info.etapas_raw || info.etapas_raw.length === 0) {
        return { status: 'sem_programacao', dataInicio: null };
    }
    const dataInicio = getDataInicioObra(obraNorm);
    if (!dataInicio) return { status: 'invalida', dataInicio: null };
    if (dataInicio >= DATA_CORTE_INICIO_OBRA) return { status: 'valida', dataInicio };
    return { status: 'invalida', dataInicio };
}

function construirObrasPermitidas() {
    const todasObras = new Set();
    pendenciasConsolidadas.forEach(p => todasObras.add(normalizarObra(p.obra)));
    const permitidas = new Set();
    let semProgramacao = 0, cortadas = 0;
    todasObras.forEach(obraNorm => {
        if (!obraNorm) return;
        const cls = classificarObra(obraNorm);
        if (cls.status === 'valida') permitidas.add(obraNorm);
        else if (cls.status === 'sem_programacao') semProgramacao++;
        else cortadas++;
    });
    console.log(`✅ ${permitidas.size} obras permitidas | ${cortadas} cortadas | ${semProgramacao} sem programação`);
    return permitidas;
}

function aplicarFiltroInicioObraFrontEnd() {
    obrasPermitidas = construirObrasPermitidas();
    const antes = pendenciasConsolidadas.length;
    pendenciasConsolidadas = pendenciasConsolidadas.filter(p =>
        obrasPermitidas.has(normalizarObra(p.obra))
    );
    console.log(`🚫 ${antes - pendenciasConsolidadas.length} pendências removidas pelo corte de data`);
    dadosFiltradosMGM = [...pendenciasConsolidadas];
}

// ============================================
// CARREGAMENTO (R2) — devolucao_compilada + previsto_realizado + programacao_siago
// ============================================

async function carregarArquivoR2(url, nomeArquivo) {
    console.log(`📥 Carregando ${nomeArquivo}...`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const texto = await response.text();
        console.log(`✅ ${nomeArquivo} carregado (${texto.split('\n').length} linhas)`);
        return texto;
    } catch (error) {
        console.error(`❌ Erro ao carregar ${nomeArquivo}:`, error);
        throw error;
    }
}

async function carregarDadosMGM() {
    console.log('🚀 Iniciando carregamento (devolucao_compilada × previsto_realizado)...');
    try {
        if (dadosCarregadosMGM) {
            renderizarDashboardMGM();
            return true;
        }

        const [textoProgramacao, textoPrevisto, textoDevolucao] = await Promise.all([
            carregarArquivoR2(ARQUIVOS_R2.programacaoSiago, 'programacao_siago.txt').catch(() => ''),
            carregarArquivoR2(ARQUIVOS_R2.previstoRealizado, 'previsto_realizado.txt'),
            carregarArquivoR2(ARQUIVOS_R2.devolucaoCompilada, 'devolucao_compilada.txt')
        ]);

        if (textoProgramacao) {
            const etapasPorObra = parsearProgramacaoSiago(textoProgramacao);
            window.__etapasPorObra = etapasPorObra;
        } else {
            window.__etapasPorObra = {};
        }

        const { mgmMap, etapasPorObra: etapasMGM } = parsearDevolucaoCompilada(textoDevolucao);
        const previstoMap = parsearPrevistoRealizado(textoPrevisto);
        const { pendencias } = consolidarPorObra(mgmMap, previstoMap);

        pendenciasConsolidadas = pendencias;
        dadosEtapasPorObra = etapasMGM;   // etapas MGM agrupadas por obra+data
        dadosFiltradosMGM = [...pendenciasConsolidadas];
        dadosCarregadosMGM = true;

        aplicarFiltroInicioObraFrontEnd();

        const loadingElement = document.getElementById('loadingMGM');
        if (loadingElement) loadingElement.style.display = 'none';

        renderizarDashboardMGM();
        return true;
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        const loadingElement = document.getElementById('loadingMGM');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="color: #FC8181; text-align: center; padding: 20px;">
                    <div style="font-size: 36px;">❌</div>
                    <p style="margin-top: 10px;">Erro ao carregar dados</p>
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

// ============================================
// FILTROS
// ============================================

function aplicarFiltroStatusMGM(status) {
    if (filtroStatusMGMAtivo === status) {
        filtroStatusMGMAtivo = null;
        dadosFiltradosMGM = [...pendenciasConsolidadas];
    } else {
        filtroStatusMGMAtivo = status;
        dadosFiltradosMGM = pendenciasConsolidadas.filter(p => p.status === status);
    }
    document.querySelectorAll('.kpi-card-mgm').forEach(el => {
        el.classList.remove('active-filter');
        if (el.dataset.status && el.dataset.status === filtroStatusMGMAtivo) el.classList.add('active-filter');
    });
    const selectStatus = document.getElementById('filterStatusMGM');
    if (selectStatus) selectStatus.value = filtroStatusMGMAtivo || 'todos';
    itemSelecionadoMGM = null;
    renderizarDashboardMGM();
}

function aplicarFiltrosMGM() {
    const filtroStatus = document.getElementById('filterStatusMGM')?.value || 'todos';
    const buscaTexto = document.getElementById('filterBuscaMGM')?.value?.toLowerCase() || '';
    const buscaObra = document.getElementById('filterObraMGM')?.value || '';
    const inputEtapas = document.getElementById('filtroEtapas');
    const valorEtapas = inputEtapas ? parseInt(inputEtapas.value) : 0;
    filtroEtapasMinimo = isNaN(valorEtapas) || valorEtapas < 0 ? 0 : valorEtapas;

    let filtrados = [...pendenciasConsolidadas];

    if (filtroStatus !== 'todos') {
        filtrados = filtrados.filter(p => p.status === filtroStatus);
        filtroStatusMGMAtivo = filtroStatus;
    } else {
        filtroStatusMGMAtivo = null;
    }

    if (buscaTexto) {
        filtrados = filtrados.filter(p =>
            String(p.codigo).toLowerCase().includes(buscaTexto) ||
            String(p.descricao).toLowerCase().includes(buscaTexto)
        );
    }
    if (buscaObra) {
        const obraNorm = normalizarObra(buscaObra);
        filtrados = filtrados.filter(p =>
            p.obra.includes(obraNorm) || p.obraFormatada.includes(buscaObra)
        );
    }
    if (filtroEtapasMinimo > 0) {
        filtrados = filtrados.filter(p => {
            const etapasInfo = getEtapasPorObra(p.obra);
            if (!etapasInfo) return false;
            return etapasInfo.etapas_validas === filtroEtapasMinimo;
        });
    }

    dadosFiltradosMGM = filtrados;
    itemSelecionadoMGM = null;
    const totalRegistros = document.getElementById('totalRegistrosMGM');
    if (totalRegistros) totalRegistros.textContent = `${filtrados.length} pendências`;
    renderizarDashboardMGM();
}

function aplicarFiltroEtapas() {
    aplicarFiltrosMGM();
}

function limparFiltrosMGM() {
    const elStatus = document.getElementById('filterStatusMGM');
    const elBusca = document.getElementById('filterBuscaMGM');
    const elObra = document.getElementById('filterObraMGM');
    const elEtapas = document.getElementById('filtroEtapas');
    if (elStatus) elStatus.value = 'todos';
    if (elBusca) elBusca.value = '';
    if (elObra) elObra.value = '';
    if (elEtapas) elEtapas.value = '';
    filtroEtapasMinimo = 0;
    filtroStatusMGMAtivo = null;
    dadosFiltradosMGM = [...pendenciasConsolidadas];
    itemSelecionadoMGM = null;
    document.querySelectorAll('.kpi-card-mgm').forEach(el => el.classList.remove('active-filter'));
    renderizarDashboardMGM();
}

// ============================================
// RENDERIZAÇÃO — DASHBOARD
// ============================================

function renderizarDashboardMGM() {
    const container = document.getElementById('dashboardMGM');
    if (!container) return;
    if (!pendenciasConsolidadas || pendenciasConsolidadas.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📊</div>
                <p>Nenhum dado disponível</p>
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
    if (totalRegistros) totalRegistros.textContent = `${dadosExibir.length} pendências`;

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
}

// ============================================
// KPIs
// ============================================

function renderizarKPIsMGM(pendencias) {
    const container = document.getElementById('kpiGridMGM');
    if (!container) return;

    const total = pendencias.length;
    const devolver = pendencias.filter(p => p.status === 'DEVOLVER');
    const requisitar = pendencias.filter(p => p.status === 'REQUISITAR');
    const ok = pendencias.filter(p => p.status === 'OK');

    const obrasSet = new Set(pendencias.map(p => p.obra));
    const obrasDevolver = new Set(devolver.map(p => p.obra));
    const obrasRequisitar = new Set(requisitar.map(p => p.obra));
    const obrasOk = new Set(ok.map(p => p.obra));

    let qtdTotalDevolver = 0, valorTotalDevolver = 0;
    devolver.forEach(p => {
        qtdTotalDevolver += p.sobra || 0;
        valorTotalDevolver += (p.sobra || 0) * (p.valorUnitario || 0);
    });

    let qtdTotalRequisitar = 0, valorTotalRequisitar = 0;
    requisitar.forEach(p => {
        qtdTotalRequisitar += p.falta || 0;
        valorTotalRequisitar += (p.falta || 0) * (p.valorUnitario || 0);
    });

    const totalEtapasMGM = Object.values(dadosEtapasPorObra).reduce(
        (acc, o) => acc + (o.etapasMGM?.length || 0), 0
    );

    const isActive = (status) => filtroStatusMGMAtivo === status;
    const fmtBRL = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    container.innerHTML = `
        <div class="kpi-card kpi-card-mgm status-total ${isActive('TOTAL') ? 'active-filter' : ''}" 
             data-status="TOTAL" onclick="aplicarFiltroStatusMGM('TOTAL')" style="cursor: pointer;">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total de Pendências</div>
        </div>
        
        <div class="kpi-card kpi-card-mgm status-sobra ${isActive('DEVOLVER') ? 'active-filter' : ''}" 
             data-status="DEVOLVER" onclick="aplicarFiltroStatusMGM('DEVOLVER')" 
             style="cursor: pointer; border-color: ${isActive('DEVOLVER') ? '#D69E2E' : '#E2E8F0'};">
            <div class="kpi-icon">🟠</div>
            <div class="kpi-value" style="color: #D69E2E;">${devolver.length}</div>
            <div class="kpi-label">🟠 Devolver (${qtdTotalDevolver.toFixed(0)} un)</div>
            <div class="kpi-sublabel" style="font-size: 10px; color: #A0AEC0; margin-top: 2px;">${fmtBRL(valorTotalDevolver)}</div>
        </div>
        
        <div class="kpi-card kpi-card-mgm status-falta ${isActive('REQUISITAR') ? 'active-filter' : ''}" 
             data-status="REQUISITAR" onclick="aplicarFiltroStatusMGM('REQUISITAR')" 
             style="cursor: pointer; border-color: ${isActive('REQUISITAR') ? '#E53E3E' : '#E2E8F0'};">
            <div class="kpi-icon">🔴</div>
            <div class="kpi-value" style="color: #E53E3E;">${requisitar.length}</div>
            <div class="kpi-label">🔴 Requisitar (${qtdTotalRequisitar.toFixed(0)} un)</div>
            <div class="kpi-sublabel" style="font-size: 10px; color: #A0AEC0; margin-top: 2px;">${fmtBRL(valorTotalRequisitar)}</div>
        </div>
        
        <div class="kpi-card kpi-card-mgm status-baixado ${isActive('OK') ? 'active-filter' : ''}" 
             data-status="OK" onclick="aplicarFiltroStatusMGM('OK')" 
             style="cursor: pointer; border-color: ${isActive('OK') ? '#48BB78' : '#E2E8F0'};">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value" style="color: #48BB78;">${ok.length}</div>
            <div class="kpi-label">✅ OK (MGM = Realizado)</div>
        </div>
        
        <div class="kpi-card kpi-card-mgm" style="cursor: default; background: #F7FAFC;">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value" style="color: #2D3748;">${obrasSet.size}</div>
            <div class="kpi-label">Obras Impactadas</div>
            <div class="kpi-sublabel" style="font-size: 10px; color: #A0AEC0; margin-top: 2px;">
                🟠 ${obrasDevolver.size} | 🔴 ${obrasRequisitar.size} | ✅ ${obrasOk.size}
            </div>
        </div>
        
        <div class="kpi-card kpi-card-mgm" style="cursor: default; background: #EBF8FF; border-color: #4299E1;">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value" style="color: #4299E1;">${totalEtapasMGM}</div>
            <div class="kpi-label">Etapas MGM (total)</div>
        </div>
    `;
}

// ============================================
// LISTA AGRUPADA POR OBRA
// ============================================

function renderizarListaObrasMGM(pendencias) {
    const container = document.getElementById('itemListMGM');
    if (!container) return;

    if (!pendencias || pendencias.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma pendência encontrada</p>
            </div>
        `;
        return;
    }

    const grupos = {};
    pendencias.forEach(p => {
        const obra = p.obra;
        if (!grupos[obra]) {
            grupos[obra] = {
                obra,
                obraFormatada: p.obraFormatada,
                itens: [],
                numDevolver: 0, qtdDevolver: 0, valorDevolver: 0,
                numRequisitar: 0, qtdRequisitar: 0, valorRequisitar: 0,
                numOk: 0,
                numEtapasMGM: 0,
                etapasInfoSiago: null
            };
        }
        grupos[obra].itens.push(p);
        if (p.status === 'DEVOLVER') {
            grupos[obra].numDevolver++;
            grupos[obra].qtdDevolver += p.sobra || 0;
            grupos[obra].valorDevolver += (p.sobra || 0) * (p.valorUnitario || 0);
        } else if (p.status === 'REQUISITAR') {
            grupos[obra].numRequisitar++;
            grupos[obra].qtdRequisitar += p.falta || 0;
            grupos[obra].valorRequisitar += (p.falta || 0) * (p.valorUnitario || 0);
        } else {
            grupos[obra].numOk++;
        }
    });

    Object.keys(grupos).forEach(obra => {
        const etapasMGM = dadosEtapasPorObra[obra]?.etapasMGM || [];
        grupos[obra].numEtapasMGM = etapasMGM.length;
        grupos[obra].etapasInfoSiago = getEtapasPorObra(obra);
    });

    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 90px 1fr 55px 70px 70px 60px 55px; gap: 4px; padding: 6px 10px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 10px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span>Itens / Etapas</span>
            <span style="text-align: right;">Total</span>
            <span style="text-align: center; color: #D69E2E;">🟠 Dev.</span>
            <span style="text-align: center; color: #E53E3E;">🔴 Req.</span>
            <span style="text-align: center; color: #48BB78;">✅ OK</span>
            <span style="text-align: center;">Status</span>
        </div>
    `;

    const listaOrdenada = Object.values(grupos).sort((a, b) => {
        const scoreA = (a.numRequisitar > 0 ? 1000 : 0) + (a.numDevolver > 0 ? 500 : 0) + a.itens.length;
        const scoreB = (b.numRequisitar > 0 ? 1000 : 0) + (b.numDevolver > 0 ? 500 : 0) + b.itens.length;
        return scoreB - scoreA;
    });

    listaOrdenada.forEach(grupo => {
        const isActive = itemSelecionadoMGM && itemSelecionadoMGM.obra === grupo.obra;
        const temDevolver = grupo.numDevolver > 0;
        const temRequisitar = grupo.numRequisitar > 0;

        let statusBadge = '', statusClass = '';
        if (temDevolver && temRequisitar) {
            statusBadge = '🟠+🔴';
            statusClass = 'status-misto';
        } else if (temDevolver) {
            statusBadge = '🟠 Dev';
            statusClass = 'status-sobra';
        } else if (temRequisitar) {
            statusBadge = '🔴 Req';
            statusClass = 'status-falta';
        } else {
            statusBadge = '✅ OK';
            statusClass = 'status-atendido';
        }

        const etapasSiagoInfo = grupo.etapasInfoSiago;
        let etapasBadge = '';
        if (grupo.numEtapasMGM > 0 || etapasSiagoInfo) {
            const validas = etapasSiagoInfo?.etapas_validas ?? 0;
            const totalSiago = etapasSiagoInfo?.total_etapas ?? 0;
            etapasBadge = `<span class="obra-etapas-indicator has-etapas" title="MGM: ${grupo.numEtapasMGM} | Siago: ${validas}/${totalSiago}">📋 MGM:${grupo.numEtapasMGM} · SIA:${validas}/${totalSiago}</span>`;
        } else {
            etapasBadge = `<span class="obra-etapas-indicator no-etapas">📭</span>`;
        }

        html += `
            <div class="item-group-item ${isActive ? 'active' : ''} ${statusClass}" 
                 onclick="selecionarObraMGM('${grupo.obra}')" 
                 style="display: grid; grid-template-columns: 90px 1fr 55px 70px 70px 60px 55px; gap: 4px; padding: 8px 10px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;
                        ${temRequisitar ? 'border-left: 4px solid #E53E3E;' : temDevolver ? 'border-left: 4px solid #D69E2E;' : 'border-left: 4px solid #48BB78;'}">
                <span class="item-code" style="font-size: 11px;">
                    ${grupo.obraFormatada}<br>${etapasBadge}
                </span>
                <span class="item-desc" style="font-size: 11px; display: flex; align-items: center;">
                    ${grupo.itens.length} item(ns)
                </span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0; font-size: 11px;">${grupo.itens.length}</span>
                <span style="text-align: center; font-weight: 600; color: ${temDevolver ? '#D69E2E' : '#A0AEC0'}; font-size: 10px;">
                    ${temDevolver ? grupo.qtdDevolver.toFixed(0) : '-'}
                </span>
                <span style="text-align: center; font-weight: 600; color: ${temRequisitar ? '#E53E3E' : '#A0AEC0'}; font-size: 10px;">
                    ${temRequisitar ? grupo.qtdRequisitar.toFixed(0) : '-'}
                </span>
                <span style="text-align: center; font-weight: 600; color: #48BB78; font-size: 10px;">${grupo.numOk}</span>
                <span style="text-align: center;">
                    <span class="badge-status ${statusClass}" style="font-size: 9px; padding: 2px 6px;">${statusBadge}</span>
                </span>
            </div>
        `;
    });

    container.innerHTML = html;

    const inputEtapas = document.getElementById('filtroEtapas');
    if (inputEtapas) inputEtapas.value = filtroEtapasMinimo > 0 ? filtroEtapasMinimo : '';
}

// ============================================
// GRÁFICOS
// ============================================

function renderizarGraficosMGM(pendencias) {
    const statusCount = { DEVOLVER: 0, REQUISITAR: 0, OK: 0 };
    pendencias.forEach(p => {
        if (statusCount[p.status] !== undefined) statusCount[p.status]++;
    });
    const total = Object.values(statusCount).reduce((a, b) => a + b, 0) || 1;
    const statusLabels = { DEVOLVER: '🟠 Devolver', REQUISITAR: '🔴 Requisitar', OK: '✅ OK' };
    const statusColors = { DEVOLVER: 'bar-sobra', REQUISITAR: 'bar-pendente', OK: 'bar-baixado' };

    let htmlStatus = '';
    for (const status of ['REQUISITAR', 'DEVOLVER', 'OK']) {
        const value = statusCount[status] || 0;
        const percentual = (value / total) * 100;
        htmlStatus += `
            <div class="chart-bar-indicator">
                <span class="label">${statusLabels[status]}</span>
                <div class="bar-track">
                    <div class="bar-fill ${statusColors[status]}" style="width: ${percentual}%;">
                        <span class="value">${value}</span>
                    </div>
                </div>
                <span class="percent">${percentual.toFixed(0)}%</span>
            </div>
        `;
    }
    const elStatus = document.getElementById('statusChartMGM');
    if (elStatus) elStatus.innerHTML = htmlStatus;

    const obrasSet = new Set(pendencias.map(p => p.obra));
    const obrasDevolver = new Set(pendencias.filter(p => p.status === 'DEVOLVER').map(p => p.obra));
    const obrasRequisitar = new Set(pendencias.filter(p => p.status === 'REQUISITAR').map(p => p.obra));
    const obrasOk = new Set(pendencias.filter(p => p.status === 'OK').map(p => p.obra));
    const totalObras = obrasSet.size || 1;

    let htmlObras = `
        <div class="chart-bar-indicator">
            <span class="label">🔴 Com Falta</span>
            <div class="bar-track"><div class="bar-fill bar-pendente" style="width: ${(obrasRequisitar.size / totalObras) * 100}%;"><span class="value">${obrasRequisitar.size}</span></div></div>
            <span class="percent">${((obrasRequisitar.size / totalObras) * 100).toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator">
            <span class="label">🟠 Com Sobra</span>
            <div class="bar-track"><div class="bar-fill bar-sobra" style="width: ${(obrasDevolver.size / totalObras) * 100}%;"><span class="value">${obrasDevolver.size}</span></div></div>
            <span class="percent">${((obrasDevolver.size / totalObras) * 100).toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator">
            <span class="label">✅ OK</span>
            <div class="bar-track"><div class="bar-fill bar-baixado" style="width: ${(obrasOk.size / totalObras) * 100}%;"><span class="value">${obrasOk.size}</span></div></div>
            <span class="percent">${((obrasOk.size / totalObras) * 100).toFixed(0)}%</span>
        </div>
    `;
    const elValor = document.getElementById('valorChartMGM');
    if (elValor) elValor.innerHTML = htmlObras;
}

// ============================================
// DETALHE DA OBRA
// ============================================

function selecionarObraMGM(obra) {
    if (itemSelecionadoMGM && itemSelecionadoMGM.obra === obra) {
        itemSelecionadoMGM = null;
    } else {
        itemSelecionadoMGM = { obra };
    }
    renderizarDetalhesObraMGM(itemSelecionadoMGM);

    document.querySelectorAll('#itemListMGM .item-group-item').forEach(el => el.classList.remove('active'));
    if (itemSelecionadoMGM) {
        document.querySelectorAll('#itemListMGM .item-group-item').forEach(el => {
            const attr = el.getAttribute('onclick');
            if (attr && attr.includes(`'${itemSelecionadoMGM.obra}'`)) el.classList.add('active');
        });
    }
}

function renderizarDetalhesObraMGM(itemSelecionado) {
    const container = document.getElementById('itemDetailsMGM');
    if (!container) return;
    if (!itemSelecionado || !itemSelecionado.obra) {
        container.innerHTML = `<div class="empty-state-dashboard"><div class="icon">👆</div><p>Selecione uma obra para ver os detalhes</p></div>`;
        return;
    }

    const obra = itemSelecionado.obra;
    const itensObra = dadosFiltradosMGM.filter(p => p.obra === obra);
    if (itensObra.length === 0) {
        container.innerHTML = `<div class="empty-state-dashboard"><div class="icon">📭</div><p>Sem pendências para esta obra</p></div>`;
        return;
    }

    const obraFormatada = itensObra[0].obraFormatada;

    let numDevolver = 0, numRequisitar = 0, numOk = 0;
    let qtdDevolver = 0, qtdRequisitar = 0;
    let valorDevolver = 0, valorRequisitar = 0;
    itensObra.forEach(p => {
        if (p.status === 'DEVOLVER') {
            numDevolver++; qtdDevolver += p.sobra;
            valorDevolver += p.sobra * (p.valorUnitario || 0);
        } else if (p.status === 'REQUISITAR') {
            numRequisitar++; qtdRequisitar += p.falta;
            valorRequisitar += p.falta * (p.valorUnitario || 0);
        } else {
            numOk++;
        }
    });

    const etapasMGM = dadosEtapasPorObra[obra]?.etapasMGM || [];
    const etapasSiago = getEtapasPorObra(obra);
    const fmtBRL = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let html = `
        <div class="detail-header">
            <div class="detail-title">🏗️ ${obraFormatada}</div>
            <div class="detail-subtitle">
                📦 ${itensObra.length} item(ns) analisados · 
                📋 ${etapasMGM.length} MGM aplicada(s)
                ${etapasSiago ? ` · 🗂️ ${etapasSiago.etapas_validas}/${etapasSiago.total_etapas} etapas Siago válidas` : ''}
            </div>
        </div>
        
        <div class="detail-stats-grid">
            <div class="detail-stat">
                <span class="stat-label">🟠 Devolver</span>
                <span class="stat-value" style="color: #D69E2E;">${numDevolver}</span>
            </div>
            <div class="detail-stat">
                <span class="stat-label">🔴 Requisitar</span>
                <span class="stat-value" style="color: #E53E3E;">${numRequisitar}</span>
            </div>
            <div class="detail-stat">
                <span class="stat-label">✅ OK</span>
                <span class="stat-value" style="color: #48BB78;">${numOk}</span>
            </div>
        </div>
        
        <div class="detail-summary">
            <div class="summary-item" style="background: #FEFCBF; border-left: 4px solid #D69E2E;">
                <span class="summary-label">🟠 Devolver (qtd)</span>
                <span class="summary-value" style="color: #D69E2E; font-weight: 700;">${qtdDevolver.toFixed(0)} un</span>
            </div>
            <div class="summary-item" style="background: #FED7D7; border-left: 4px solid #E53E3E;">
                <span class="summary-label">🔴 Requisitar (qtd)</span>
                <span class="summary-value" style="color: #E53E3E; font-weight: 700;">${qtdRequisitar.toFixed(0)} un</span>
            </div>
        </div>
        <div class="detail-summary">
            <div class="summary-item" style="background: #FFFAF0; border-left: 4px solid #D69E2E;">
                <span class="summary-label">💰 Valor a devolver</span>
                <span class="summary-value" style="color: #D69E2E; font-weight: 700;">${fmtBRL(valorDevolver)}</span>
            </div>
            <div class="summary-item" style="background: #FFF5F5; border-left: 4px solid #E53E3E;">
                <span class="summary-label">💰 Valor a requisitar</span>
                <span class="summary-value" style="color: #E53E3E; font-weight: 700;">${fmtBRL(valorRequisitar)}</span>
            </div>
        </div>
        
        <div class="detail-section-title">📋 Itens (MGM × Previsto/Realizado)</div>
        <div class="detail-items-list">
    `;

    const ordemStatus = { REQUISITAR: 1, DEVOLVER: 2, OK: 3 };
    const itensOrdenados = [...itensObra].sort((a, b) => {
        const da = ordemStatus[a.status] - ordemStatus[b.status];
        if (da !== 0) return da;
        return String(a.codigo).localeCompare(String(b.codigo));
    });

    itensOrdenados.forEach(item => {
        let statusBadge = '', statusClass = '';
        if (item.status === 'REQUISITAR') {
            statusBadge = `🔴 +${item.falta.toFixed(2)}`;
            statusClass = 'status-falta';
        } else if (item.status === 'DEVOLVER') {
            statusBadge = `🟠 -${item.sobra.toFixed(2)}`;
            statusClass = 'status-sobra';
        } else {
            statusBadge = '✅';
            statusClass = 'status-atendido';
        }

        const valorDif = Math.abs(item.qtdMGM - item.qtdRealizada) * (item.valorUnitario || 0);

        html += `
            <div class="detail-item ${statusClass}">
                <div class="item-code-detail">${item.codigo}</div>
                <div class="item-desc-detail" title="${item.descricao}">${item.descricao}</div>
                <div class="item-qtd-detail" title="MGM aplicada × Requisitado">${item.qtdMGM.toFixed(2)} × ${item.qtdRealizada.toFixed(2)}</div>
                <div class="item-status-detail ${statusClass}">${statusBadge}</div>
                <div class="item-mov-detail" style="font-size: 9px; color: #718096;">
                    ${item.valorUnitario ? fmtBRL(valorDif) : ''}
                </div>
                ${item.numEtapasMGM > 0 ? `<div class="item-multi-detail" style="font-size: 9px; color: #805AD5; grid-column: 1 / -1;">🔀 ${item.numEtapasMGM} MGM: ${item.datasMGM.join(', ')}</div>` : ''}
            </div>
        `;
    });
    html += `</div>`;

    // ===== ETAPAS MGM (secundário) =====
    if (etapasMGM.length > 0) {
        html += `
            <div class="detail-etapas-section">
                <div class="section-title">📋 Etapas MGM (execução) — ${etapasMGM.length}</div>
                <div class="etapas-info">
                    <div class="etapas-badges">
        `;
        etapasMGM.forEach(e => {
            const dataFmt = formatarData(e.data) || formatarData(e.dataOriginal);
            html += `<span class="etapa-badge etapa-pendente" title="MGM ${dataFmt} · ${e.qtdItens} itens · ${e.qtdAplicadaTotal.toFixed(2)} qtd aplicada">📋 ${dataFmt} (${e.qtdItens})</span>`;
        });
        html += `</div></div></div>`;
    }

    // ===== ETAPAS SIAGO (secundário) =====
    if (etapasSiago) {
        const percentual = etapasSiago.total_etapas > 0
            ? Math.round((etapasSiago.etapas_validas / etapasSiago.total_etapas) * 100)
            : 0;
        let badgesHTML = '';
        etapasSiago.etapas.forEach(etapa => {
            const det = etapasSiago.etapas_detalhes[etapa] || {};
            const sit = String(det.dsc_situacao_programacao_obra || '').toUpperCase();
            const isReprov = sit.includes('REPROVADA');
            const isCancel = sit.includes('CANCELADA');
            const isConcl = sit.includes('CONCLUÍDA');
            let icon = '⏳', cls = 'etapa-pendente';
            if (isReprov) { icon = '🔴'; cls = 'etapa-reprovada'; }
            else if (isCancel) { icon = '🚫'; cls = 'etapa-reprovada'; }
            else if (isConcl) { icon = '✅'; cls = 'etapa-concluida'; }
            const dataFmt = formatarData(det.data_programacao_inicial);
            badgesHTML += `<span class="etapa-badge ${cls}" title="${det.dsc_situacao_programacao_obra || ''} · ${dataFmt}">${icon} ${etapa}</span>`;
        });
        html += `
            <div class="detail-etapas-section">
                <div class="section-title">🗂️ Programação Siago — ${etapasSiago.total_etapas} etapa(s)</div>
                <div class="etapas-info">
                    <div class="etapas-resumo">
                        <span class="etapas-total">📊 ${etapasSiago.total_etapas} total</span>
                        <span class="etapas-validas" style="color: ${etapasSiago.etapas_validas > 0 ? '#48BB78' : '#718096'};">✅ ${etapasSiago.etapas_validas} válidas</span>
                        <span class="etapas-reprovadas" style="color: ${etapasSiago.etapas_reprovadas > 0 ? '#FC8181' : '#718096'};">🔴 ${etapasSiago.etapas_reprovadas} reprov/canc</span>
                        <span class="etapas-percentual">${percentual}% válidas</span>
                    </div>
                    <div class="etapas-badges">${badgesHTML}</div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// ============================================
// ABA PRINCIPAL
// ============================================

function trocarAbaPrincipal(aba) {
    document.querySelectorAll('.btn-aba-principal').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === 'mgm');
    });
    const containerSeparacao = document.getElementById('dashboardSeparacao');
    const containerMGM = document.getElementById('dashboardMGM');
    if (containerSeparacao) containerSeparacao.style.display = 'none';
    if (containerMGM) containerMGM.style.display = 'block';
    if (!dadosCarregadosMGM) carregarDadosMGM();
    else renderizarDashboardMGM();
}

// ============================================
// BOOTSTRAP
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 DOM carregado, iniciando dashboard (v5)...');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    if (!loadingOverlay || !dashboardContent) return;

    const sessao = getSessao();
    if (!sessao) return;

    const elName = document.getElementById('userName');
    const elMat = document.getElementById('userMatricula');
    const elPerfil = document.getElementById('userPerfil');
    if (elName) elName.textContent = sessao.nome || 'Usuário';
    if (elMat) elMat.textContent = `Matrícula: ${sessao.matricula || '---'}`;
    if (elPerfil) elPerfil.textContent = sessao.perfil || 'GESTÃO';

    try {
        await carregarDadosMGM();
        trocarAbaPrincipal('mgm');
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        console.log('✅ Dashboard renderizado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarToast(`❌ Erro: ${error.message}`, 'error');
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
    }
});

// ============================================
// EXPORTS GLOBAIS
// ============================================

window.trocarAbaPrincipal = trocarAbaPrincipal;
window.aplicarFiltrosMGM = aplicarFiltrosMGM;
window.limparFiltrosMGM = limparFiltrosMGM;
window.selecionarObraMGM = selecionarObraMGM;
window.carregarDadosMGM = carregarDadosMGM;
window.renderizarDashboardMGM = renderizarDashboardMGM;
window.aplicarFiltroStatusMGM = aplicarFiltroStatusMGM;
window.aplicarFiltroEtapas = aplicarFiltroEtapas;

console.log('✅ dashboards-pendencia-requisicao.js inicializado! (v5)');