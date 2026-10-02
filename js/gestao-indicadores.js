// ============================================
// GESTÃO INDICADORES - RMA x DMA (COM AGRUPAMENTO)
// ============================================

const WORKER_URL = 'https://gestao-xd-almox.alefe-gomes-72f.workers.dev';

let dadosCompletos = [];
let dadosFiltrados = [];
let graficoLogin = null;
let graficoMes = null;
let filtrosAplicados = false;

let dadosDetalhesAtuais = {
    tipo: '',
    label: '',
    itens: []
};

const filtroEstado = {
    mesesSelecionados: [],
    dataInicio: '',
    dataFim: '',
    loginSelecionado: 'Todos',
    obraSelecionada: 'Todas'
};

const MESES = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março',
    '04': 'Abril', '05': 'Maio', '06': 'Junho',
    '07': 'Julho', '08': 'Agosto', '09': 'Setembro',
    '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

// ============================================
// FORMATAR VALORES
// ============================================
function formatarMoeda(valor) {
    return `R$ ${Math.round(valor).toLocaleString('pt-BR')}`;
}

function formatarValor(valor) {
    return Math.round(valor).toLocaleString('pt-BR');
}

// ============================================
// FORMATAR NÚMERO DA OBRA (000-00-00000)
// ============================================
// Entrada: "12501556" (8 dígitos) -> Saída: "001-25-01556"
function formatarNumeroObra(numObra) {
    if (!numObra) return 'SEM OBRA';
    const limpo = String(numObra).replace(/\D/g, '');
    if (limpo.length !== 8) return String(numObra);
    const parte1 = '00' + limpo[0];          // "001"
    const parte2 = limpo.substring(1, 3);    // "25"
    const parte3 = limpo.substring(3, 8);    // "01556"
    return `${parte1}-${parte2}-${parte3}`;
}

// ============================================
// FECHAR DETALHES
// ============================================
function fecharDetalhes(id) {
    const container = document.getElementById(id);
    if (container) {
        container.style.display = 'none';
        const searchInput = document.getElementById(`search${id === 'detalhesLogin' ? 'Login' : 'Mes'}`);
        if (searchInput) searchInput.value = '';
        dadosDetalhesAtuais = { tipo: '', label: '', itens: [] };
    }
}

window.fecharDetalhes = fecharDetalhes;

// ============================================
// FILTRAR DETALHES (COM AGRUPAMENTO + OBRA)
// ============================================
function filtrarDetalhes(tipo) {
    const searchId = tipo === 'login' ? 'searchLogin' : 'searchMes';
    const conteudoId = tipo === 'login' ? 'detalhesLoginConteudo' : 'detalhesMesConteudo';
    const tituloId = tipo === 'login' ? 'detalhesLoginTitulo' : 'detalhesMesTitulo';

    const searchInput = document.getElementById(searchId);
    const conteudo = document.getElementById(conteudoId);
    const titulo = document.getElementById(tituloId);

    if (!searchInput || !conteudo) return;

    const termo = searchInput.value.toLowerCase().trim();
    const itens = dadosDetalhesAtuais.itens || [];

    // Filtrar itens (por código, descrição, obra formatada ou obra bruta)
    let itensFiltrados = itens;
    if (termo) {
        itensFiltrados = itens.filter(item => {
            const codigo = (item.codigo || '').toLowerCase();
            const descricao = (item.dscmat || item.descricao || '').toLowerCase();
            const obraFormatada = (item.num_obra_formatado || '').toLowerCase();
            const obraBruta = (item.num_obra || '').toLowerCase();
            return codigo.includes(termo)
                || descricao.includes(termo)
                || obraFormatada.includes(termo)
                || obraBruta.includes(termo);
        });
    }

    // 🔥 AGRUPAR POR MATERIAL + OBRA
    const agrupado = {};
    itensFiltrados.forEach(item => {
        const key = (item.codigo || item.dscmat || 'unknown') + '|' + (item.num_obra || '');
        if (!agrupado[key]) {
            agrupado[key] = {
                codigo: item.codigo || '',
                descricao: item.dscmat || item.descricao || '',
                unidade: item.codund || '',
                obra: item.num_obra_formatado || 'SEM OBRA',
                RMA_qtd: 0, RMA_valor: 0,
                DMA_qtd: 0, DMA_valor: 0,
                total_qtd: 0, total_valor: 0
            };
        }
        if (item.tipo === 'RMA') {
            agrupado[key].RMA_qtd += Math.abs(item.qtdmov);
            agrupado[key].RMA_valor += item.valor_total;
        } else {
            agrupado[key].DMA_qtd += Math.abs(item.qtdmov);
            agrupado[key].DMA_valor += item.valor_total;
        }
        agrupado[key].total_qtd = agrupado[key].RMA_qtd + agrupado[key].DMA_qtd;
        agrupado[key].total_valor = agrupado[key].RMA_valor + agrupado[key].DMA_valor;
    });

    const itensAgrupados = Object.values(agrupado);
    itensAgrupados.sort((a, b) => b.total_valor - a.total_valor);

    // Título
    const label = dadosDetalhesAtuais.label || '';
    const tipoLabel = dadosDetalhesAtuais.tipo === 'login' ? 'Login' : 'Mês';
    const sufixoObra = (filtroEstado.obraSelecionada && filtroEstado.obraSelecionada !== 'Todas')
        ? ` — Obra ${formatarNumeroObra(filtroEstado.obraSelecionada)}`
        : '';
    titulo.textContent = `📋 Detalhes do ${tipoLabel}: ${label}${sufixoObra} (${itensAgrupados.length} materiais)`;

    const rmaTotal = itensAgrupados.reduce((acc, d) => acc + d.RMA_valor, 0);
    const dmaTotal = itensAgrupados.reduce((acc, d) => acc + d.DMA_valor, 0);

    let html = '';

    html += `
        <div style="display:flex; gap:20px; margin-bottom:15px; flex-wrap:wrap;">
            <span style="color:#3B82F6; font-weight:600;">RMA: ${itensAgrupados.filter(d => d.RMA_qtd > 0).length} materiais (${formatarMoeda(rmaTotal)})</span>
            <span style="color:#10B981; font-weight:600;">DMA: ${itensAgrupados.filter(d => d.DMA_qtd > 0).length} materiais (${formatarMoeda(dmaTotal)})</span>
            <span style="color:#6B7280; font-weight:600;">Total: ${itensAgrupados.length} materiais</span>
            ${termo ? `<span style="color:#F59E0B; font-weight:600;">🔍 Filtro: "${termo}"</span>` : ''}
        </div>
    `;

    if (itensAgrupados.length === 0) {
        html += `<p style="color:#A0AEC0; text-align:center; padding:20px;">Nenhum material encontrado para "${termo}"</p>`;
        conteudo.innerHTML = html;
        return;
    }

    // Tabela com coluna Obra
    html += `<table class="tabela-detalhes">
        <thead>
            <tr>
                <th>🏗️ Obra</th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Un.</th>
                <th style="color:#3B82F6;">RMA Qtd</th>
                <th style="color:#3B82F6;">RMA Valor</th>
                <th style="color:#10B981;">DMA Qtd</th>
                <th style="color:#10B981;">DMA Valor</th>
                <th>Total Valor</th>
            </tr>
        </thead>
        <tbody>
    `;

    itensAgrupados.forEach(item => {
        const hasRMA = item.RMA_qtd > 0;
        const hasDMA = item.DMA_qtd > 0;
        let rowClass = '';
        if (hasRMA && hasDMA) rowClass = 'ambos-row';
        else if (hasRMA) rowClass = 'rma-row';
        else if (hasDMA) rowClass = 'dma-row';

        html += `
            <tr class="${rowClass}">
                <td><strong style="color:#F59E0B;">${item.obra}</strong></td>
                <td><strong>${item.codigo || '-'}</strong></td>
                <td>${item.descricao || '-'}</td>
                <td>${item.unidade || '-'}</td>
                <td style="color:#3B82F6; font-weight:600;">${hasRMA ? formatarValor(item.RMA_qtd) : '-'}</td>
                <td style="color:#3B82F6;">${hasRMA ? formatarMoeda(item.RMA_valor) : '-'}</td>
                <td style="color:#10B981; font-weight:600;">${hasDMA ? formatarValor(item.DMA_qtd) : '-'}</td>
                <td style="color:#10B981;">${hasDMA ? formatarMoeda(item.DMA_valor) : '-'}</td>
                <td class="valor">${formatarMoeda(item.total_valor)}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    conteudo.innerHTML = html;
}

window.filtrarDetalhes = filtrarDetalhes;

// ============================================
// VERIFICAR AUTENTICAÇÃO
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
// VOLTAR PARA HOME
// ============================================
function voltarParaHome() {
    try {
        if (window.CONFIG && typeof CONFIG.goHome === 'function') {
            CONFIG.goHome();
        } else {
            let perfil = 'GESTAO';
            if (typeof authService !== 'undefined' && authService) {
                const user = authService.getUserData();
                if (user && user.perfil) perfil = user.perfil;
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
// BUSCAR DADOS
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
                if (codigo && vlrultCot > 0) mapa[codigo] = vlrultCot;
            }
        }

        console.log(`✅ ${Object.keys(mapa).length} materiais com valor carregados`);
        return mapa;
    } catch (error) {
        console.error('❌ Erro ao carregar posição:', error);
        return {};
    }
}

async function buscarMovimentos() {
    try {
        const url = `${WORKER_URL}/api/movimentos`;
        console.log(`📡 Buscando movimentos: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);
        const texto = await response.text();
        console.log(`✅ Arquivo carregado (${texto.split('\n').length} linhas)`);
        return texto;
    } catch (error) {
        console.error('❌ Erro ao buscar movimentos:', error);
        throw error;
    }
}

function parseMovimentos(texto, posicaoMap) {
    const linhas = texto.trim().split('\n');

    if (linhas.length < 2) {
        console.warn('⚠️ Arquivo vazio ou com apenas cabeçalho');
        return [];
    }

    const cabecalho = linhas[0].split('\t').map(h => h.trim());

    const idx = {
        orgmov: cabecalho.indexOf('orgmov'),
        numdoc_mov: cabecalho.indexOf('numdoc_mov'),
        datamov: cabecalho.indexOf('datamov'),
        codmat_mov: cabecalho.indexOf('codmat_mov'),
        dscmat: cabecalho.indexOf('dscmat'),
        codund: cabecalho.indexOf('codund'),
        qtdmov: cabecalho.indexOf('qtdmov'),
        vlrmov: cabecalho.indexOf('vlrmov'),
        nummov: cabecalho.indexOf('nummov'),
        sigla_mov_mat: cabecalho.indexOf('sigla_mov_mat'),
        num_obra: cabecalho.indexOf('num_obra'),
        codarea_mov: cabecalho.indexOf('codarea_mov'),
        codsct_mov: cabecalho.indexOf('codsct_mov')
    };

    console.log('📌 Índices:', idx);

    const movimentos = [];
    let ignorados = 0;

    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) { ignorados++; continue; }

        const partes = linha.split('\t');
        if (partes.length < 16) { ignorados++; continue; }

        const qtdmov = parseFloat(partes[idx.qtdmov]?.trim().replace(',', '.')) || 0;
        if (qtdmov === 0) { ignorados++; continue; }

        const datamovRaw = partes[idx.datamov]?.trim() || '';
        let dataFormatada = '';

        if (datamovRaw) {
            const match = datamovRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
                dataFormatada = `${match[1]}-${match[2]}-${match[3]}`;
            } else {
                const match2 = datamovRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (match2) dataFormatada = `${match2[3]}-${match2[2]}-${match2[1]}`;
                else dataFormatada = datamovRaw;
            }
        }

        const codmat = partes[idx.codmat_mov]?.trim() || '';
        const vlrUnitario = posicaoMap[codmat] || 0;

        const orgmov = partes[idx.orgmov]?.trim() || '';
        const isRMA = orgmov === 'S' || orgmov === 'RMA' || orgmov.toUpperCase() === 'RMA';

        let mesNumero = '', anoNumero = '', mesAno = '';
        if (dataFormatada) {
            const partesData = dataFormatada.split('-');
            if (partesData.length === 3) {
                mesNumero = partesData[1];
                anoNumero = partesData[2];
                mesAno = `${anoNumero}-${mesNumero}`;
            }
        }

        const numObraRaw = partes[idx.num_obra]?.trim() || '';

        movimentos.push({
            orgmov: orgmov,
            numdoc_mov: partes[idx.numdoc_mov]?.trim() || '',
            datamov_raw: datamovRaw,
            datamov: dataFormatada,
            datamov_display: dataFormatada,
            codmat: codmat,
            dscmat: partes[idx.dscmat]?.trim() || '',
            codund: partes[idx.codund]?.trim() || '',
            qtdmov: qtdmov,
            vlrmov: parseFloat(partes[idx.vlrmov]?.trim().replace(',', '.')) || 0,
            nummov: partes[idx.nummov]?.trim() || '',
            sigla_mov_mat: partes[idx.sigla_mov_mat]?.trim() || '',
            tipo: isRMA ? 'RMA' : 'DMA',
            vlr_unitario: vlrUnitario,
            valor_total: vlrUnitario * Math.abs(qtdmov),
            qtd_abs: Math.abs(qtdmov),
            mes: mesNumero,
            ano: anoNumero,
            mes_ano: mesAno,
            descricao: partes[idx.dscmat]?.trim() || '',
            codigo: codmat,
            unidade: partes[idx.codund]?.trim() || '',
            num_obra: numObraRaw,
            num_obra_formatado: formatarNumeroObra(numObraRaw),
            obra: numObraRaw || 'SEM OBRA',
            codarea_mov: partes[idx.codarea_mov]?.trim() || '',
            codsct_mov: partes[idx.codsct_mov]?.trim() || ''
        });
    }

    console.log(`✅ ${movimentos.length} movimentos processados (${ignorados} ignorados)`);
    return movimentos;
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarDados() {
    try {
        const posicaoEstoque = await carregarPosicaoEstoque();
        const texto = await buscarMovimentos();
        const movimentos = parseMovimentos(texto, posicaoEstoque);

        if (!movimentos || movimentos.length === 0) {
            document.querySelector('.graficos-top').innerHTML =
                `<div class="erro-msg">⚠️ Nenhum movimento encontrado.</div>`;
            return;
        }

        dadosCompletos = movimentos;
        console.log(`📊 ${dadosCompletos.length} movimentos carregados`);

        inicializarFiltros();
        aplicarFiltros();

    } catch (erro) {
        console.error('❌ Erro ao carregar dados:', erro);
        document.querySelector('.graficos-top').innerHTML =
            `<div class="erro-msg">❌ Erro: ${erro.message}</div>`;
    }
}

// ============================================
// INICIALIZAR FILTROS
// ============================================
function inicializarFiltros() {
    const mesesContainer = document.getElementById('mesesContainer');
    if (!mesesContainer) {
        console.warn('⚠️ mesesContainer não encontrado');
        return;
    }

    mesesContainer.innerHTML = '';

    const mesesDisponiveis = [...new Set(dadosCompletos.map(d => d.mes).filter(Boolean))].sort();
    const mesesParaMostrar = mesesDisponiveis.length > 0 ? mesesDisponiveis : Object.keys(MESES);

    mesesParaMostrar.forEach(mesNum => {
        const btn = document.createElement('button');
        btn.className = 'btn-mes';
        btn.dataset.mes = mesNum;
        btn.textContent = MESES[mesNum] || mesNum;

        const count = dadosCompletos.filter(d => d.mes === mesNum).length;
        btn.title = `${MESES[mesNum] || mesNum}: ${count} movimentos`;

        btn.classList.remove('active');

        btn.addEventListener('click', function() {
            const mes = this.dataset.mes;
            const index = filtroEstado.mesesSelecionados.indexOf(mes);
            if (index > -1) {
                filtroEstado.mesesSelecionados.splice(index, 1);
                this.classList.remove('active');
            } else {
                filtroEstado.mesesSelecionados.push(mes);
                this.classList.add('active');
            }
            aplicarFiltros();
        });

        mesesContainer.appendChild(btn);
    });

    // FILTRO DE LOGIN
    const logins = [...new Set(dadosCompletos.map(d => d.sigla_mov_mat).filter(Boolean))].sort();
    const selectLogin = document.getElementById('filtroLogin');

    if (selectLogin) {
        selectLogin.innerHTML = '<option value="Todos">Todos os Logins</option>';
        logins.forEach(login => {
            const opt = document.createElement('option');
            opt.value = login;
            opt.textContent = login;
            selectLogin.appendChild(opt);
        });
        selectLogin.value = filtroEstado.loginSelecionado || 'Todos';

        selectLogin.addEventListener('change', function() {
            filtroEstado.loginSelecionado = this.value;
            aplicarFiltros();
        });
    }

    // ============================================
    // FILTRO DE OBRA (com busca + formatação)
    // ============================================
    const mapaObras = {};
    dadosCompletos.forEach(d => {
        if (d.num_obra) mapaObras[d.num_obra] = d.num_obra_formatado;
    });

    const obrasUnicas = Object.keys(mapaObras).sort((a, b) =>
        mapaObras[a].localeCompare(mapaObras[b], 'pt-BR')
    );

    const selectObra = document.getElementById('filtroObra');
    const inputBuscaObra = document.getElementById('buscaObra');

    // 🔧 Declarada no escopo da função (acessível pelo btnLimparPeriodo)
    let popularObrasSelect = function(termo = '') {
        if (!selectObra) return;

        const termoLower = termo.toLowerCase().trim();
        const termoLimpo = termoLower.replace(/\D/g, '');

        const filtradas = termoLower
            ? obrasUnicas.filter(o => {
                const formatado = mapaObras[o].toLowerCase();
                const bruto = o.toLowerCase();
                return formatado.includes(termoLower)
                    || bruto.includes(termoLimpo)
                    || formatado.replace(/\D/g, '').includes(termoLimpo);
            })
            : obrasUnicas;

        selectObra.innerHTML = '<option value="Todas">Todas as Obras</option>';
        filtradas.forEach(bruto => {
            const opt = document.createElement('option');
            opt.value = bruto;
            opt.textContent = mapaObras[bruto];
            selectObra.appendChild(opt);
        });

        // Restaura seleção se ainda existir
        if (filtroEstado.obraSelecionada && filtroEstado.obraSelecionada !== 'Todas') {
            if (obrasUnicas.includes(filtroEstado.obraSelecionada)) {
                selectObra.value = filtroEstado.obraSelecionada;
            } else {
                selectObra.value = 'Todas';
                filtroEstado.obraSelecionada = 'Todas';
            }
        }
    };

    if (selectObra) {
        popularObrasSelect();

        // Busca com debounce
        let timeoutBuscaObra;
        if (inputBuscaObra) {
            inputBuscaObra.addEventListener('input', function() {
                clearTimeout(timeoutBuscaObra);
                timeoutBuscaObra = setTimeout(() => popularObrasSelect(this.value), 150);
            });
        }

        // Seleção no select
        selectObra.addEventListener('change', function() {
            filtroEstado.obraSelecionada = this.value;
            aplicarFiltros();
        });
    }

    // ============================================
    // FILTRO DE PERÍODO + BOTÃO LIMPAR (limpa período + obra)
    // ============================================
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    const btnLimparPeriodo = document.getElementById('limparPeriodo');

    if (dataInicio) {
        dataInicio.value = filtroEstado.dataInicio;
        dataInicio.addEventListener('change', function() {
            filtroEstado.dataInicio = this.value;
            aplicarFiltros();
        });
    }

    if (dataFim) {
        dataFim.value = filtroEstado.dataFim;
        dataFim.addEventListener('change', function() {
            filtroEstado.dataFim = this.value;
            aplicarFiltros();
        });
    }

    if (btnLimparPeriodo) {
        btnLimparPeriodo.addEventListener('click', function() {
            // 🔧 Limpa período
            filtroEstado.dataInicio = '';
            filtroEstado.dataFim = '';
            if (dataInicio) dataInicio.value = '';
            if (dataFim) dataFim.value = '';

            // 🔧 Limpa também a obra
            filtroEstado.obraSelecionada = 'Todas';
            if (inputBuscaObra) inputBuscaObra.value = '';
            if (selectObra) selectObra.value = 'Todas';
            if (typeof popularObrasSelect === 'function') popularObrasSelect('');

            aplicarFiltros();
        });
    }
}

// ============================================
// APLICAR FILTROS
// ============================================
function aplicarFiltros() {
    if (!dadosCompletos || dadosCompletos.length === 0) {
        console.warn('⚠️ Nenhum dado para filtrar');
        return;
    }

    console.log('🔍 Aplicando filtros...');

    let dados = [...dadosCompletos];

    const temFiltroMes = filtroEstado.mesesSelecionados.length > 0;
    const temFiltroLogin = filtroEstado.loginSelecionado && filtroEstado.loginSelecionado !== 'Todos';
    const temFiltroPeriodo = filtroEstado.dataInicio || filtroEstado.dataFim;
    const temFiltroObra = filtroEstado.obraSelecionada && filtroEstado.obraSelecionada !== 'Todas';

    filtrosAplicados = temFiltroMes || temFiltroLogin || temFiltroPeriodo || temFiltroObra;
    console.log(`📌 Filtros aplicados: ${filtrosAplicados ? 'SIM' : 'NÃO'}`);

    if (temFiltroMes) {
        dados = dados.filter(d => filtroEstado.mesesSelecionados.includes(d.mes));
    }

    if (temFiltroLogin) {
        dados = dados.filter(d => d.sigla_mov_mat === filtroEstado.loginSelecionado);
    }

    if (temFiltroObra) {
        dados = dados.filter(d => d.num_obra === filtroEstado.obraSelecionada);
        console.log(`🏗️ Filtrado por obra: ${formatarNumeroObra(filtroEstado.obraSelecionada)}`);
    }

    if (filtroEstado.dataInicio) {
        const inicio = new Date(filtroEstado.dataInicio + 'T00:00:00');
        dados = dados.filter(d => {
            const partes = d.datamov?.split('-') || [];
            if (partes.length !== 3) return false;
            return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T00:00:00`) >= inicio;
        });
    }

    if (filtroEstado.dataFim) {
        const fim = new Date(filtroEstado.dataFim + 'T23:59:59');
        dados = dados.filter(d => {
            const partes = d.datamov?.split('-') || [];
            if (partes.length !== 3) return false;
            return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T00:00:00`) <= fim;
        });
    }

    dadosFiltrados = dados;
    console.log(`📊 ${dadosFiltrados.length} registros após filtros`);

    atualizarContadores(dadosFiltrados);

    const canvasLogin = document.getElementById('graficoLogin');
    const canvasMes = document.getElementById('graficoMes');

    if (canvasLogin) gerarGraficoLogin(dadosFiltrados);
    else console.error('❌ Canvas graficoLogin não encontrado!');

    if (canvasMes) gerarGraficoMes(dadosFiltrados);
    else console.error('❌ Canvas graficoMes não encontrado!');
}

// ============================================
// ATUALIZAR CONTADORES
// ============================================
function atualizarContadores(dados) {
    const totalRMA = dados.filter(d => d.tipo === 'RMA').reduce((acc, d) => acc + d.valor_total, 0);
    const totalDMA = dados.filter(d => d.tipo === 'DMA').reduce((acc, d) => acc + d.valor_total, 0);
    const totalRMAQtd = dados.filter(d => d.tipo === 'RMA').length;
    const totalDMAQtd = dados.filter(d => d.tipo === 'DMA').length;

    document.getElementById('totalRMA').textContent = formatarMoeda(totalRMA);
    document.getElementById('totalDMA').textContent = formatarMoeda(totalDMA);
    document.getElementById('totalRegistros').textContent = formatarValor(dados.length);
    document.getElementById('totalRMAQtd').textContent = `${totalRMAQtd} requisições`;
    document.getElementById('totalDMAQtd').textContent = `${totalDMAQtd} devoluções`;
}

// ============================================
// EXIBIR DETALHES AO CLICAR NO GRÁFICO
// ============================================
function exibirDetalhes(tipo, label, dados) {
    const containerId = tipo === 'login' ? 'detalhesLogin' : 'detalhesMes';
    const tituloId = tipo === 'login' ? 'detalhesLoginTitulo' : 'detalhesMesTitulo';
    const conteudoId = tipo === 'login' ? 'detalhesLoginConteudo' : 'detalhesMesConteudo';
    const searchId = tipo === 'login' ? 'searchLogin' : 'searchMes';

    const container = document.getElementById(containerId);
    const titulo = document.getElementById(tituloId);
    const conteudo = document.getElementById(conteudoId);
    const searchInput = document.getElementById(searchId);

    if (!container || !titulo || !conteudo) return;

    let itens = [];
    let tituloTexto = '';

    if (tipo === 'login') {
        itens = dados.filter(d => d.sigla_mov_mat === label);
        tituloTexto = `📋 Detalhes do Login: ${label}`;
    } else {
        itens = dados.filter(d => d.mes_ano === label);
        const partes = label.split('-');
        const mesNome = MESES[partes[1]] || partes[1];
        tituloTexto = `📋 Detalhes do Mês: ${mesNome}/${partes[0]}`;
    }

    if (filtroEstado.obraSelecionada && filtroEstado.obraSelecionada !== 'Todas') {
        tituloTexto += ` — Obra ${formatarNumeroObra(filtroEstado.obraSelecionada)}`;
    }

    dadosDetalhesAtuais = { tipo, label, itens };

    if (searchInput) searchInput.value = '';

    if (itens.length === 0) {
        conteudo.innerHTML = '<p style="color:#A0AEC0; text-align:center; padding:20px;">Nenhum item encontrado</p>';
        container.style.display = 'block';
        return;
    }

    titulo.textContent = tituloTexto;
    container.style.display = 'block';
    filtrarDetalhes(tipo);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// GRÁFICO POR LOGIN - COM CLIQUE
// ============================================
function gerarGraficoLogin(dados) {
    const canvas = document.getElementById('graficoLogin');
    if (!canvas) {
        console.error('❌ Canvas graficoLogin não encontrado');
        return;
    }

    if (!dados || dados.length === 0) {
        canvas.parentElement.innerHTML = '<div class="sem-dados">Sem dados para exibir</div>';
        return;
    }

    const agrupado = {};
    dados.forEach(d => {
        const login = d.sigla_mov_mat;
        if (!login) return;
        if (!agrupado[login]) agrupado[login] = { RMA: 0, DMA: 0, total: 0 };
        if (d.tipo === 'RMA') agrupado[login].RMA += d.valor_total;
        else agrupado[login].DMA += d.valor_total;
        agrupado[login].total = agrupado[login].RMA + agrupado[login].DMA;
    });

    const sorted = Object.entries(agrupado).sort((a, b) => b[1].total - a[1].total);

    let dadosGrafico = sorted;
    let labelSufixo = '';

    if (!filtrosAplicados) {
        dadosGrafico = sorted.slice(0, 10);
        labelSufixo = ' (Top 10)';
    }

    const sufixoObra = (filtroEstado.obraSelecionada && filtroEstado.obraSelecionada !== 'Todas')
        ? ` — Obra ${formatarNumeroObra(filtroEstado.obraSelecionada)}`
        : '';

    const labels = dadosGrafico.map(item => item[0]);
    const rmaValues = dadosGrafico.map(item => item[1].RMA);
    const dmaValues = dadosGrafico.map(item => item[1].DMA);

    if (graficoLogin) graficoLogin.destroy();

    graficoLogin = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'RMA (Requisições)',
                    data: rmaValues,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3B82F6',
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: 'DMA (Devoluções)',
                    data: dmaValues,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10B981',
                    borderWidth: 2,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94A3B8', font: { size: 12, weight: 'bold' }, padding: 20 }
                },
                title: {
                    display: true,
                    text: `Valor por Login${labelSufixo}${sufixoObra}`,
                    color: '#A0AEC0',
                    font: { size: 14, weight: 'normal' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => formatarMoeda(v), color: '#94A3B8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94A3B8', maxRotation: 45, minRotation: 0, font: { size: 11 } },
                    grid: { color: 'rgba(148, 163, 184, 0.05)' }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = this.data.labels[index];
                    exibirDetalhes('login', label, dados);
                }
            }
        }
    });
}

// ============================================
// GRÁFICO MENSAL - COM CLIQUE
// ============================================
function gerarGraficoMes(dados) {
    const canvas = document.getElementById('graficoMes');
    if (!canvas) {
        console.error('❌ Canvas graficoMes não encontrado');
        return;
    }

    if (!dados || dados.length === 0) {
        canvas.parentElement.innerHTML = '<div class="sem-dados">Sem dados para exibir</div>';
        return;
    }

    const agrupado = {};
    dados.forEach(d => {
        if (!d.mes_ano) return;
        if (!agrupado[d.mes_ano]) agrupado[d.mes_ano] = { RMA: 0, DMA: 0, mes: d.mes, ano: d.ano };
        if (d.tipo === 'RMA') agrupado[d.mes_ano].RMA += d.valor_total;
        else agrupado[d.mes_ano].DMA += d.valor_total;
    });

    const labels = Object.keys(agrupado).sort();
    const rmaValues = labels.map(l => agrupado[l].RMA);
    const dmaValues = labels.map(l => agrupado[l].DMA);

    const labelsDisplay = labels.map(l => {
        const partes = l.split('-');
        if (partes.length === 2) return `${MESES[partes[1]] || partes[1]}/${partes[0]}`;
        return l;
    });

    const sufixoObra = (filtroEstado.obraSelecionada && filtroEstado.obraSelecionada !== 'Todas')
        ? ` — Obra ${formatarNumeroObra(filtroEstado.obraSelecionada)}`
        : '';

    if (graficoMes) graficoMes.destroy();

    graficoMes = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labelsDisplay,
            datasets: [
                {
                    label: 'RMA (Requisições)',
                    data: rmaValues,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3B82F6',
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: 'DMA (Devoluções)',
                    data: dmaValues,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10B981',
                    borderWidth: 2,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#94A3B8', font: { size: 12, weight: 'bold' }, padding: 20 }
                },
                title: {
                    display: true,
                    text: `Evolução Mensal${sufixoObra}`,
                    color: '#A0AEC0',
                    font: { size: 14, weight: 'normal' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatarMoeda(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (v) => formatarMoeda(v), color: '#94A3B8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94A3B8', maxRotation: 0, font: { size: 12, weight: 'bold' } },
                    grid: { color: 'rgba(148, 163, 184, 0.05)' }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const label = labels[index];
                    exibirDetalhes('mes', label, dados);
                }
            }
        }
    });
}

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado!');
    if (!verificarAutenticacaoGestao()) return;
    carregarDados();
});

window.aplicarFiltros = aplicarFiltros;
window.voltarParaHome = voltarParaHome;
window.formatarNumeroObra = formatarNumeroObra;