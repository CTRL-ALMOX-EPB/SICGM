// ============================================
// DASHBOARD ADITIVOS SISTÊMICOS
// ============================================

console.log('🚀 dashboards-aditivos-sistemicos.js carregado!');

// URL do Cloudflare R2
const R2_URL = 'https://pub-b5fbd1ddaff14047bf16aef93e8886dd.r2.dev';

let dadosCompletos = [];
let dadosFiltrados = [];
let dadosExibidos = [];
let itemSelecionado = null;
let abaAtual = 'materiais';
let mesSelecionado = null;
let filtroAtivo = null;
let posicaoEstoque = {};

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

// ============================================
// FUNÇÃO: OBTER MÊS DA DATA
// ============================================

function getMesAno(dataString) {
    if (!dataString) return null;
    try {
        const data = new Date(dataString);
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
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
// FUNÇÃO: BUSCAR VALOR DO ITEM NO R2
// ============================================

function buscarValorItem(codigo) {
    if (!codigo) return 0;
    const item = posicaoEstoque[codigo];
    if (item && item.valor_unitario) {
        return item.valor_unitario;
    }
    return 0;
}

// ============================================
// FUNÇÃO: CARREGAR POSIÇÃO DE ESTOQUE DO R2
// ============================================

async function carregarPosicaoEstoque() {
    try {
        console.log('🔄 Carregando posição de estoque do R2...');
        
        const response = await fetch(`${R2_URL}/posicacao-de-estoque/posicao-de-estoque-1050.txt`);
        
        if (!response.ok) {
            console.warn('⚠️ Arquivo posicao-de-estoque-1050.txt não encontrado no R2');
            return;
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        
        if (linhas.length === 0) {
            console.warn('⚠️ Arquivo posicao-de-estoque.txt vazio');
            return;
        }
        
        console.log(`📄 Arquivo carregado: ${linhas.length} linhas`);
        
        posicaoEstoque = {};
        let linhasProcessadas = 0;
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const partes = linha.split('\t');
            
            if (partes.length >= 6) {
                const codmat = partes[0].trim();
                const dscmat = partes[2]?.trim() || '';
                const codund = partes[3]?.trim() || '';
                
                let vlrultCot = 0;
                try {
                    const valorStr = partes[4]?.trim().replace(',', '.') || '0';
                    vlrultCot = parseFloat(valorStr) || 0;
                } catch (e) {
                    vlrultCot = 0;
                }
                
                if (codmat) {
                    posicaoEstoque[codmat] = {
                        codmat: codmat,
                        descricao: dscmat,
                        und: codund,
                        valor_unitario: vlrultCot
                    };
                    linhasProcessadas++;
                }
            }
        }
        
        console.log(`📦 Posição de estoque carregada: ${linhasProcessadas} códigos`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar posição de estoque:', error);
        mostrarToast('❌ Erro ao carregar valores dos itens', 'erro');
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 DOM carregado, iniciando dashboard Aditivos Sistêmicos...');
    
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
        await carregarPosicaoEstoque();
        
        console.log('📡 Iniciando busca de dados...');
        
        const startTime = Date.now();
        dadosCompletos = await buscarAditivosSistemicosCompleto();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} aditivos carregados em ${elapsed}ms`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhum aditivo sistêmico encontrado');
            mostrarToast('⚠️ Nenhum aditivo sistêmico encontrado no sistema', 'warning');
        }
        
        criarAbas();
        criarMeses();
        aplicarFiltros();
        
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
// CRIAR MESES
// ============================================

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

// ============================================
// FILTRAR POR MÊS
// ============================================

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

// ============================================
// CRIAR ABAS
// ============================================

function criarAbas() {
    const mainContainer = document.querySelector('.dashboard-main');
    if (!mainContainer) return;
    
    const existingAbas = document.querySelector('.abas-container');
    if (existingAbas) existingAbas.remove();
    
    const abaContainer = document.createElement('div');
    abaContainer.className = 'abas-container';
    abaContainer.innerHTML = `
        <button class="btn-aba active" data-aba="materiais" onclick="trocarAba('materiais')">
            📦 Materiais
        </button>
        <button class="btn-aba" data-aba="obras" onclick="trocarAba('obras')">
            🏗️ Obras
        </button>
    `;
    
    mainContainer.parentNode.insertBefore(abaContainer, mainContainer);
}

// ============================================
// TROCAR ABA
// ============================================

function trocarAba(aba) {
    abaAtual = aba;
    itemSelecionado = null;
    filtroAtivo = null;
    
    document.querySelectorAll('.btn-aba').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    const listTitle = document.getElementById('listTitle');
    if (listTitle) {
        const titles = {
            'materiais': '📦 Itens Aditivados',
            'obras': '🏗️ Obras com Aditivos'
        };
        listTitle.textContent = titles[aba] || '📦 Itens Aditivados';
    }
    
    renderizarDashboard(dadosFiltrados);
}

// ============================================
// APLICAR FILTRO DO CARD
// ============================================

function aplicarFiltroCard(tipo, valor) {
    console.log(`🔍 Aplicando filtro do card: ${tipo} = ${valor}`);
    
    if (filtroAtivo && filtroAtivo.tipo === tipo && filtroAtivo.valor === valor) {
        filtroAtivo = null;
        dadosExibidos = [...dadosFiltrados];
    } else {
        filtroAtivo = { tipo, valor };
        
        if (tipo === 'status') {
            dadosExibidos = dadosFiltrados.filter(aditivo => {
                const itens = (aditivo.itens || []).filter(item => 
                    (item.status_aditivo || 'ANALISE') === valor
                );
                return itens.length > 0;
            });
        } else if (tipo === 'total') {
            dadosExibidos = [...dadosFiltrados];
        }
    }
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        const textoFiltro = filtroAtivo ? ` (filtrado: ${filtroAtivo.tipo})` : '';
        totalRegistros.textContent = `${dadosExibidos.length} aditivos${textoFiltro}`;
    }
    
    renderizarDashboard(dadosExibidos);
}

// ============================================
// FILTROS
// ============================================

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros...');
    const dataInicio = document.getElementById('filterDataInicio')?.value || '';
    const dataFim = document.getElementById('filterDataFim')?.value || '';
    const statusFiltro = document.getElementById('filterStatus')?.value || 'todos';
    const buscaTexto = document.getElementById('filterBusca')?.value?.toLowerCase() || '';
    const buscaObra = document.getElementById('filterObra')?.value || '';
    
    let filtrados = [...dadosCompletos];
    
    if (mesSelecionado) {
        filtrados = filtrados.filter(item => {
            const mes = getMesAno(item.data_programacao);
            return mes === mesSelecionado;
        });
        console.log(`📅 Após filtro de mês: ${filtrados.length} aditivos`);
    }
    
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
        console.log(`📅 Após filtro de período: ${filtrados.length} aditivos`);
    }
    
    if (statusFiltro !== 'todos') {
        filtrados = filtrados.map(aditivo => ({
            ...aditivo,
            itens: (aditivo.itens || []).filter(item => 
                (item.status_aditivo || 'ANALISE') === statusFiltro
            )
        })).filter(aditivo => aditivo.itens && aditivo.itens.length > 0);
        console.log(`📊 Após filtro de status: ${filtrados.length} aditivos`);
    }
    
    if (buscaTexto) {
        filtrados = filtrados.map(aditivo => ({
            ...aditivo,
            itens: (aditivo.itens || []).filter(item => {
                const codigo = (item.codigo || '').toLowerCase();
                const descricao = (item.descricao || '').toLowerCase();
                return codigo.includes(buscaTexto) || descricao.includes(buscaTexto);
            })
        })).filter(aditivo => aditivo.itens && aditivo.itens.length > 0);
        console.log(`🔍 Após filtro de busca: ${filtrados.length} aditivos`);
    }
    
    if (buscaObra) {
        filtrados = filtrados.filter(aditivo => {
            const obra = (aditivo.obra || '').toLowerCase();
            return obra.includes(buscaObra.toLowerCase());
        });
        console.log(`🏗️ Após filtro de obra: ${filtrados.length} aditivos`);
    }
    
    dadosFiltrados = filtrados;
    dadosExibidos = filtrados;
    filtroAtivo = null;
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        totalRegistros.textContent = `${filtrados.length} aditivos`;
    }
    
    renderizarDashboard(filtrados);
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

// ============================================
// AGRUPAMENTO DE ITENS POR CÓDIGO (COUNT)
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
            const unidade = item.unidade || 'UN';
            const quantidade = parseFloat(item.quantidade) || 0;
            const valorUnitario = buscarValorItem(codigo);
            
            if (!grupos[codigo]) {
                grupos[codigo] = {
                    codigo: codigo,
                    descricao: descricao,
                    unidade: unidade,
                    total: 0,
                    obras: [],
                    saidas: [],
                    itens: [],
                    statusCount: { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 },
                    valorStatusCount: { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 },
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
            
            const obra = controle.obra || 'SEM OBRA';
            const isSaida = obra.toUpperCase().includes('SAÍDA') || obra.toUpperCase().includes('SAIDA');
            const status = item.status_aditivo || 'ANALISE';
            
            if (grupos[codigo].statusCount[status] !== undefined) {
                grupos[codigo].statusCount[status] += 1;
                grupos[codigo].valorStatusCount[status] += quantidade * valorUnitario;
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

// ============================================
// AGRUPAR POR OBRA (COUNT)
// ============================================

function agruparPorObra(controles) {
    console.log(`🏗️ Agrupando por obra...`);
    const obras = {};
    
    controles.forEach(controle => {
        const obra = controle.obra || 'SEM OBRA';
        const itens = controle.itens || [];
        const dataProgramacao = controle.data_programacao || '';
        
        if (!obras[obra]) {
            obras[obra] = {
                obra: obra,
                datas: new Set(),
                itens: [],
                totalItens: 0,
                skus: [],
                skusSet: new Set()
            };
        }
        
        obras[obra].datas.add(dataProgramacao);
        
        itens.forEach(item => {
            obras[obra].itens.push({
                ...item,
                data: dataProgramacao,
                numero: controle.numero
            });
            const qtd = parseFloat(item.quantidade) || 0;
            obras[obra].totalItens += qtd;
            
            if (item.codigo) {
                obras[obra].skus.push(item.codigo);
                obras[obra].skusSet.add(item.codigo);
            }
        });
    });
    
    const resultado = Object.values(obras).map(obra => ({
        ...obra,
        datas: Array.from(obra.datas).sort(),
        skusCount: obra.skus.length,
        skusUnico: obra.skusSet.size
    })).sort((a, b) => b.skusCount - a.skusCount);
    
    console.log(`✅ ${resultado.length} obras agrupadas`);
    return resultado;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(aditivos) {
    if (!aditivos || aditivos.length === 0) {
        console.log('📭 Nenhum aditivo para renderizar');
        document.getElementById('itemList').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhum aditivo encontrado</p>
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
    
    if (abaAtual === 'materiais') {
        const itensAgrupados = agruparItensPorCodigo(aditivos);
        renderizarKPIsMateriais(itensAgrupados);
        renderizarListaItens(itensAgrupados);
        renderizarGraficos(itensAgrupados);
        
        if (itemSelecionado && itemSelecionado.tipo === 'material') {
            const encontrado = itensAgrupados.find(i => i.codigo === itemSelecionado.codigo);
            if (encontrado) {
                renderizarDetalhes(encontrado);
            } else {
                document.getElementById('itemDetails').innerHTML = `
                    <div class="empty-state-dashboard">
                        <div class="icon">👆</div>
                        <p>Item não encontrado</p>
                    </div>
                `;
            }
        }
    } else {
        const obrasAgrupadas = agruparPorObra(aditivos);
        renderizarListaObras(obrasAgrupadas);
        renderizarKPIsObras(obrasAgrupadas);
        
        if (itemSelecionado && itemSelecionado.tipo === 'obra') {
            const encontrado = obrasAgrupadas.find(o => o.obra === itemSelecionado.obra);
            if (encontrado) {
                renderizarDetalhesObra(encontrado);
            }
        }
    }
}

// ============================================
// KPIs - MATERIAIS (COUNT) - INTERATIVOS
// ============================================

function renderizarKPIsMateriais(itensAgrupados) {
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
    
    const statusCount = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    itensAgrupados.forEach(item => {
        Object.keys(statusCount).forEach(status => {
            statusCount[status] += item.statusCount[status] || 0;
        });
    });
    
    let valorTotal = 0;
    itensAgrupados.forEach(item => {
        valorTotal += item.quantidadeTotal * item.valorUnitario;
    });
    
    const isFilterActive = (tipo, valor) => {
        return filtroAtivo && filtroAtivo.tipo === tipo && filtroAtivo.valor === valor;
    };
    
    container.innerHTML = `
        <div class="kpi-card status-total ${isFilterActive('total', 'TOTAL') ? 'active' : ''}" onclick="aplicarFiltroCard('total', 'TOTAL')" style="cursor: pointer; ${isFilterActive('total', 'TOTAL') ? 'border: 2px solid #4299E1; background: #EBF8FF;' : ''}">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalOcorrencias}</div>
            <div class="kpi-label">Ocorrências de SKUs</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalSkusUnicos}</div>
            <div class="kpi-label">SKUs Únicos</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras com Aditivos</div>
        </div>
        <div class="kpi-card status-analise ${isFilterActive('status', 'ANALISE') ? 'active' : ''}" onclick="aplicarFiltroCard('status', 'ANALISE')" style="cursor: pointer; ${isFilterActive('status', 'ANALISE') ? 'border: 2px solid #ED8936; background: #FFFAF0;' : ''}">
            <div class="kpi-icon">📊</div>
            <div class="kpi-value">${statusCount.ANALISE}</div>
            <div class="kpi-label">Ocorr. em Análise</div>
        </div>
        <div class="kpi-card status-aprovado ${isFilterActive('status', 'APROVADO') ? 'active' : ''}" onclick="aplicarFiltroCard('status', 'APROVADO')" style="cursor: pointer; ${isFilterActive('status', 'APROVADO') ? 'border: 2px solid #48BB78; background: #F0FFF4;' : ''}">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${statusCount.APROVADO}</div>
            <div class="kpi-label">Ocorr. Aprovadas</div>
        </div>
        <div class="kpi-card status-reprovado ${isFilterActive('status', 'REPROVADO') ? 'active' : ''}" onclick="aplicarFiltroCard('status', 'REPROVADO')" style="cursor: pointer; ${isFilterActive('status', 'REPROVADO') ? 'border: 2px solid #FC8181; background: #FFF5F5;' : ''}">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${statusCount.REPROVADO}</div>
            <div class="kpi-label">Ocorr. Reprovadas</div>
        </div>
        <div class="kpi-card" style="grid-column: span 1; border-color: #48BB78; cursor: default;">
            <div class="kpi-icon">💰</div>
            <div class="kpi-value" style="color: #48BB78; font-size: 20px;">${formatarValor(valorTotal)}</div>
            <div class="kpi-label">Valor Total dos Aditivos</div>
        </div>
    `;
}

// ============================================
// KPIs - OBRAS
// ============================================

function renderizarKPIsObras(obrasAgrupadas) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalObras = obrasAgrupadas.length;
    const totalSkusOcorrencias = obrasAgrupadas.reduce((sum, o) => sum + o.skusCount, 0);
    const totalSkusUnicos = obrasAgrupadas.reduce((sum, o) => sum + o.skusUnico, 0);
    
    let valorTotal = 0;
    obrasAgrupadas.forEach(obra => {
        obra.itens.forEach(item => {
            const qtd = parseFloat(item.quantidade) || 0;
            const valorUnitario = buscarValorItem(item.codigo);
            valorTotal += qtd * valorUnitario;
        });
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Total de Obras</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalSkusOcorrencias}</div>
            <div class="kpi-label">Ocorrências de SKUs</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalSkusUnicos}</div>
            <div class="kpi-label">SKUs Únicos</div>
        </div>
        <div class="kpi-card" style="border-color: #48BB78; cursor: default;">
            <div class="kpi-icon">💰</div>
            <div class="kpi-value" style="color: #48BB78; font-size: 20px;">${formatarValor(valorTotal)}</div>
            <div class="kpi-label">Valor Total dos Aditivos</div>
        </div>
    `;
}

// ============================================
// LISTA DE ITENS (MATERIAIS)
// ============================================

function renderizarListaItens(itensAgrupados) {
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
        const isActive = itemSelecionado && itemSelecionado.tipo === 'material' && itemSelecionado.codigo === item.codigo;
        const valorTotal = item.quantidadeTotal * item.valorUnitario;
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarItem('${item.codigo}')" style="display: grid; grid-template-columns: 80px 1fr 70px 80px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="item-code">${item.codigo}</span>
                <span class="item-desc">${item.descricao}</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${item.total}</span>
                <span style="text-align: right; font-weight: 600; color: #48BB78; font-size: 12px;">${formatarValor(valorTotal)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// LISTA DE OBRAS
// ============================================

function renderizarListaObras(obrasAgrupadas) {
    const container = document.getElementById('itemList');
    if (!container) return;
    
    if (!obrasAgrupadas || obrasAgrupadas.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma obra encontrada</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 100px 1fr 70px 70px 80px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span>Informações</span>
            <span style="text-align: right;">Ocorr.</span>
            <span style="text-align: right;">SKUs Ún.</span>
            <span style="text-align: right;">Valor</span>
        </div>
    `;
    
    obrasAgrupadas.forEach(obra => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'obra' && itemSelecionado.obra === obra.obra;
        const obraFormatada = formatarObraParaExibicao(obra.obra);
        
        let valorTotal = 0;
        obra.itens.forEach(item => {
            const qtd = parseFloat(item.quantidade) || 0;
            const valorUnitario = buscarValorItem(item.codigo);
            valorTotal += qtd * valorUnitario;
        });
        
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${obra.obra}')" style="display: grid; grid-template-columns: 100px 1fr 70px 70px 80px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="item-code">🏗️ ${obraFormatada}</span>
                <span class="item-desc">${obra.skusCount} SKUs</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${obra.skusCount}</span>
                <span style="text-align: right; font-weight: 600; color: #48BB78;">${obra.skusUnico}</span>
                <span style="text-align: right; font-weight: 600; color: #48BB78; font-size: 12px;">${formatarValor(valorTotal)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR OBRA
// ============================================

function selecionarObra(obraNome) {
    console.log(`🔍 Selecionando obra: ${obraNome}`);
    const obrasAgrupadas = agruparPorObra(dadosExibidos);
    const obra = obrasAgrupadas.find(o => o.obra === obraNome);
    
    if (obra) {
        itemSelecionado = { obra: obra.obra, tipo: 'obra' };
        renderizarDetalhesObra(obra);
        renderizarListaObras(obrasAgrupadas);
    }
}

// ============================================
// DETALHES DA OBRA
// ============================================

function renderizarDetalhesObra(obra) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    const obraFormatada = formatarObraParaExibicao(obra.obra);
    
    let valorTotal = 0;
    obra.itens.forEach(item => {
        const qtd = parseFloat(item.quantidade) || 0;
        const valorUnitario = buscarValorItem(item.codigo);
        valorTotal += qtd * valorUnitario;
    });
    
    let html = `
        <div class="detail-title">🏗️ ${obraFormatada}</div>
        <div class="detail-row">
            <span class="label">Ocorrências de SKUs:</span>
            <span class="value">${obra.skusCount}</span>
        </div>
        <div class="detail-row">
            <span class="label">SKUs Únicos:</span>
            <span class="value">${obra.skusUnico}</span>
        </div>
        <div class="detail-row">
            <span class="label">Valor Total:</span>
            <span class="value" style="color: #48BB78; font-weight: 700;">${formatarValor(valorTotal)}</span>
        </div>
        <div class="detail-section-title">📅 Datas de Programação:</div>
        <div class="item-detail-obras">
    `;
    
    obra.datas.forEach(data => {
        html += `
            <div class="obra-row">
                <span>📅 ${formatarData(data)}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    html += `<div class="detail-section-title">📦 Materiais Aditivados:</div>
    <div class="item-detail-obras">`;
    
    const itensPorCodigo = {};
    obra.itens.forEach(item => {
        const codigo = item.codigo || 'SEM_CODIGO';
        if (!itensPorCodigo[codigo]) {
            itensPorCodigo[codigo] = {
                codigo: codigo,
                descricao: item.descricao || 'Sem descrição',
                quantidade: 0,
                status: item.status_aditivo || 'ANALISE',
                ocorrencias: 0,
                valorUnitario: buscarValorItem(codigo)
            };
        }
        itensPorCodigo[codigo].quantidade += parseFloat(item.quantidade) || 0;
        itensPorCodigo[codigo].ocorrencias += 1;
    });
    
    Object.values(itensPorCodigo).forEach(item => {
        const qtdFormatada = Number.isInteger(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2);
        const valorTotalItem = item.quantidade * item.valorUnitario;
        const badge = getStatusBadge(item.status);
        html += `
            <div class="obra-row">
                <span><strong>${item.codigo}</strong> - ${item.descricao} (${item.ocorrencias}x) 💰 ${formatarValor(valorTotalItem)}</span>
                <span>${qtdFormatada} ${badge}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR ITEM (MATERIAL)
// ============================================

function selecionarItem(codigo) {
    console.log(`🔍 Selecionando item: ${codigo}`);
    const itensAgrupados = agruparItensPorCodigo(dadosExibidos);
    const item = itensAgrupados.find(i => i.codigo === codigo);
    
    if (item) {
        itemSelecionado = { codigo: item.codigo, tipo: 'material' };
        renderizarDetalhes(item);
        renderizarListaItens(itensAgrupados);
    }
}

// ============================================
// DETALHES DO ITEM (MATERIAL)
// ============================================

function renderizarDetalhes(item) {
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
    
    const statusMap = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    item.itens.forEach(i => {
        const s = i.status || 'ANALISE';
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
            <span class="value" style="color: #48BB78; font-weight: 700;">${formatarValor(valorTotal)}</span>
        </div>
        <div class="detail-row">
            <span class="label">Obras:</span>
            <span class="value">${item.obras.length}</span>
        </div>
        <div class="detail-row">
            <span class="label">Saídas:</span>
            <span class="value">${item.saidas.length}</span>
        </div>
        <div class="detail-status-count">
            <span class="status-item"><span class="count status-analise">${statusMap.ANALISE}</span> 📊 Análise</span>
            <span class="status-item"><span class="count status-aprovado">${statusMap.APROVADO}</span> ✅ Aprovado</span>
            <span class="status-item"><span class="count status-reprovado">${statusMap.REPROVADO}</span> ❌ Reprovado</span>
            <span class="status-item"><span class="count status-s-solicitacao">${statusMap['S/ SOLICITAÇÃO']}</span> 📋 S/ Solicitação</span>
        </div>
    `;
    
    if (item.obras.length > 0) {
        html += `<div class="detail-section-title">🏗️ Obras:</div>
        <div class="item-detail-obras">`;
        item.obras.forEach(o => {
            const badge = getStatusBadge(o.status);
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
    
    if (item.saidas.length > 0) {
        html += `<div class="detail-section-title">🚚 Saídas:</div>
        <div class="item-detail-obras">`;
        item.saidas.forEach(o => {
            const badge = getStatusBadge(o.status);
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

function getStatusBadge(status) {
    const map = {
        'ANALISE': '<span class="badge-status analise">📊 Análise</span>',
        'APROVADO': '<span class="badge-status aprovado">✅ Aprovado</span>',
        'REPROVADO': '<span class="badge-status reprovado">❌ Reprovado</span>',
        'S/ SOLICITAÇÃO': '<span class="badge-status s-solicitacao">📋 S/ Solicitação</span>'
    };
    return map[status] || `<span class="badge-status">${status}</span>`;
}

// ============================================
// GRÁFICOS - OCORRÊNCIAS E VALORES
// ============================================

function renderizarGraficos(itensAgrupados) {
    console.log('📊 Renderizando gráficos de indicadores...');
    
    // ============================================
    // GRÁFICO 1: OCORRÊNCIAS POR STATUS
    // ============================================
    const statusCount = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    itensAgrupados.forEach(item => {
        Object.keys(statusCount).forEach(status => {
            statusCount[status] += item.statusCount[status] || 0;
        });
    });
    
    const totalGeral = Object.values(statusCount).reduce((sum, v) => sum + v, 0);
    const maxValue = totalGeral > 0 ? totalGeral : 1;
    
    const statusLabels = {
        'ANALISE': 'Análise',
        'APROVADO': 'Aprovado',
        'REPROVADO': 'Reprovado',
        'S/ SOLICITAÇÃO': 'S/ Solicitação'
    };
    
    const statusClasses = {
        'ANALISE': 'bar-analise',
        'APROVADO': 'bar-aprovado',
        'REPROVADO': 'bar-reprovado',
        'S/ SOLICITAÇÃO': 'bar-s-solicitacao'
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
    
    // ============================================
    // GRÁFICO 2: VALORES POR STATUS
    // ============================================
    const valorStatus = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    itensAgrupados.forEach(item => {
        Object.keys(valorStatus).forEach(status => {
            valorStatus[status] += item.valorStatusCount[status] || 0;
        });
    });
    
    const valorTotal = Object.values(valorStatus).reduce((sum, v) => sum + v, 0);
    const maxValor = valorTotal > 0 ? valorTotal : 1;
    
    const valorClasses = {
        'ANALISE': 'bar-analise',
        'APROVADO': 'bar-aprovado',
        'REPROVADO': 'bar-reprovado',
        'S/ SOLICITAÇÃO': 'bar-s-solicitacao'
    };
    
    let htmlValor = '';
    Object.keys(valorStatus).forEach(status => {
        const value = valorStatus[status];
        const percentual = maxValor > 0 ? (value / maxValor) * 100 : 0;
        const colorClass = valorClasses[status];
        
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
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarItem = selecionarItem;
window.selecionarObra = selecionarObra;
window.trocarAba = trocarAba;
window.renderizarDashboard = renderizarDashboard;
window.filtrarPorMes = filtrarPorMes;
window.aplicarFiltroCard = aplicarFiltroCard;

console.log('✅ dashboards-aditivos-sistemicos.js inicializado!');