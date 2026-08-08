// ============================================
// DASHBOARD ADITIVOS FÍSICOS
// ============================================

console.log('🚀 dashboards-aditivos-fisicos.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let itemSelecionado = null;
let abaAtual = 'materiais';

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
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 DOM carregado, iniciando dashboard Aditivos Físicos...');
    
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
        console.log('📡 Iniciando busca de dados...');
        
        const startTime = Date.now();
        dadosCompletos = await buscarAditivosFisicosCompleto();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} aditivos físicos carregados em ${elapsed}ms`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhum aditivo físico encontrado');
            mostrarToast('⚠️ Nenhum aditivo físico encontrado no sistema', 'warning');
        }
        
        criarAbas();
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
    
    document.querySelectorAll('.btn-aba').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    const listTitle = document.getElementById('listTitle');
    if (listTitle) {
        listTitle.textContent = aba === 'materiais' ? '📦 Itens Aditivados' : '🏗️ Obras com Aditivos';
    }
    
    renderizarDashboard(dadosFiltrados);
}

// ============================================
// FILTROS
// ============================================

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros...');
    const dataInicio = document.getElementById('filterDataInicio')?.value || '';
    const dataFim = document.getElementById('filterDataFim')?.value || '';
    const filtroAplicacao = document.getElementById('filterAplicacao')?.value || 'todos';
    const buscaTexto = document.getElementById('filterBusca')?.value?.toLowerCase() || '';
    const buscaObra = document.getElementById('filterObra')?.value || '';
    
    let filtrados = [...dadosCompletos];
    
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
        console.log(`📅 Após filtro de período: ${filtrados.length} aditivos`);
    }
    
    if (filtroAplicacao !== 'todos') {
        filtrados = filtrados.map(aditivo => ({
            ...aditivo,
            itens: (aditivo.itens || []).filter(item => 
                (item.aplicado || 'PENDENTE') === filtroAplicacao
            )
        })).filter(aditivo => aditivo.itens && aditivo.itens.length > 0);
        console.log(`🔄 Após filtro de aplicação: ${filtrados.length} aditivos`);
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
    document.getElementById('filterAplicacao').value = 'todos';
    document.getElementById('filterBusca').value = '';
    document.getElementById('filterObra').value = '';
    aplicarFiltros();
}

// ============================================
// AGRUPAMENTO DE ITENS FÍSICOS
// ============================================

function agruparItensFisicos(controles) {
    console.log(`📦 Agrupando itens físicos de ${controles.length} controles...`);
    const grupos = {};
    let totalItens = 0;
    
    controles.forEach(controle => {
        const itens = controle.itens || [];
        totalItens += itens.length;
        
        itens.forEach(item => {
            const codigo = item.codigo || 'SEM_CODIGO';
            const descricao = item.descricao || 'Sem descrição';
            const quantidade = parseFloat(item.quantidade) || 0;
            const unidade = item.unidade || 'UN';
            const aplicado = item.aplicado || 'PENDENTE';
            const encarregado = item.encarregado_obra || 'NÃO INFORMADO';
            
            if (!grupos[codigo]) {
                grupos[codigo] = {
                    codigo: codigo,
                    descricao: descricao,
                    unidade: unidade,
                    total: 0,
                    obras: [],
                    saidas: [],
                    itens: [],
                    aplicacaoCount: { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 },
                    obrasSet: new Set(),
                    saidasSet: new Set()
                };
            }
            
            if (!grupos[codigo].descricao || grupos[codigo].descricao === 'Sem descrição') {
                grupos[codigo].descricao = descricao;
            }
            
            grupos[codigo].total += quantidade;
            
            const obra = controle.obra || 'SEM OBRA';
            const isSaida = obra.toUpperCase().includes('SAÍDA') || obra.toUpperCase().includes('SAIDA');
            
            const statusKey = aplicado === 'SIM' ? 'SIM' : 
                             aplicado === 'NÃO' ? 'NAO' : 
                             aplicado === 'PARCIAL' ? 'PARCIAL' : 'PENDENTE';
            
            if (grupos[codigo].aplicacaoCount[statusKey] !== undefined) {
                grupos[codigo].aplicacaoCount[statusKey] += quantidade;
            }
            
            const itemData = {
                obra: obra,
                quantidade: quantidade,
                aplicado: aplicado,
                encarregado: encarregado,
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
// AGRUPAR POR OBRA
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
                <p>Nenhum dado para exibir</p>
            </div>
        `;
        return;
    }
    
    if (abaAtual === 'materiais') {
        const itensAgrupados = agruparItensFisicos(aditivos);
        renderizarKPIsMateriais(itensAgrupados);
        renderizarListaItens(itensAgrupados);
        renderizarGraficos(itensAgrupados, aditivos);
        renderizarTopSkus(itensAgrupados);
        
        if (itemSelecionado && itemSelecionado.tipo === 'material') {
            const encontrado = itensAgrupados.find(i => i.codigo === itemSelecionado.codigo);
            if (encontrado) {
                renderizarDetalhes(encontrado);
            } else {
                document.getElementById('itemDetails').innerHTML = `
                    <div class="empty-state-dashboard">
                        <div class="icon">👆</div>
                        <p>Selecione um item para ver os detalhes</p>
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
// KPIs - MATERIAIS
// ============================================

function renderizarKPIsMateriais(itensAgrupados) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalSkus = itensAgrupados.length;
    const totalItens = itensAgrupados.reduce((sum, item) => sum + item.total, 0);
    
    const obrasSet = new Set();
    itensAgrupados.forEach(item => {
        item.obras.forEach(o => obrasSet.add(o.obra));
        item.saidas.forEach(s => obrasSet.add(s.obra));
    });
    const totalObras = obrasSet.size;
    
    const aplicacaoCount = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(aplicacaoCount).forEach(key => {
            aplicacaoCount[key] += item.aplicacaoCount[key] || 0;
        });
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalSkus}</div>
            <div class="kpi-label">SKUs Aditivados</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras com Aditivos</div>
        </div>
        <div class="kpi-card status-aplicado">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${aplicacaoCount.SIM.toFixed(1)}</div>
            <div class="kpi-label">Aplicados</div>
        </div>
        <div class="kpi-card status-nao-aplicado">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${aplicacaoCount.NAO.toFixed(1)}</div>
            <div class="kpi-label">Não Aplicados</div>
        </div>
        <div class="kpi-card status-parcial">
            <div class="kpi-icon">🔄</div>
            <div class="kpi-value">${aplicacaoCount.PARCIAL.toFixed(1)}</div>
            <div class="kpi-label">Parcial</div>
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
            <div class="kpi-icon">📊</div>
            <div class="kpi-value">${totalSkusUnicos}</div>
            <div class="kpi-label">SKUs Únicos</div>
        </div>
    `;
}

// ============================================
// LISTA DE ITENS
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
    
    let html = '';
    itensAgrupados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'material' && itemSelecionado.codigo === item.codigo;
        const totalFormatado = Number.isInteger(item.total) ? item.total : item.total.toFixed(2);
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarItem('${item.codigo}')">
                <span class="item-code">${item.codigo}</span>
                <span class="item-desc">${item.descricao}</span>
                <span class="item-total">${totalFormatado} ${item.unidade}</span>
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
    
    let html = '';
    obrasAgrupadas.forEach(obra => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'obra' && itemSelecionado.obra === obra.obra;
        const obraFormatada = formatarObraParaExibicao(obra.obra);
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${obra.obra}')">
                <span class="item-code">🏗️</span>
                <span class="item-desc">${obraFormatada}</span>
                <span class="item-total">${obra.skusCount} SKUs</span>
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
    const obrasAgrupadas = agruparPorObra(dadosFiltrados);
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
            <span class="label">Total de Itens:</span>
            <span class="value">${obra.totalItens.toFixed(2)}</span>
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
                aplicado: item.aplicado || 'PENDENTE',
                ocorrencias: 0
            };
        }
        itensPorCodigo[codigo].quantidade += parseFloat(item.quantidade) || 0;
        itensPorCodigo[codigo].ocorrencias++;
    });
    
    Object.values(itensPorCodigo).forEach(item => {
        const qtdFormatada = Number.isInteger(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2);
        const badge = getAplicacaoBadge(item.aplicado);
        html += `
            <div class="obra-row">
                <span><strong>${item.codigo}</strong> - ${item.descricao} (${item.ocorrencias}x)</span>
                <span>${qtdFormatada} ${badge}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR ITEM
// ============================================

function selecionarItem(codigo) {
    console.log(`🔍 Selecionando item: ${codigo}`);
    const itensAgrupados = agruparItensFisicos(dadosFiltrados);
    const item = itensAgrupados.find(i => i.codigo === codigo);
    
    if (item) {
        itemSelecionado = { codigo: item.codigo, tipo: 'material' };
        renderizarDetalhes(item);
        renderizarListaItens(itensAgrupados);
    }
}

// ============================================
// DETALHES DO ITEM
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
    
    const aplicacaoMap = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    item.itens.forEach(i => {
        const key = i.aplicado === 'SIM' ? 'SIM' : 
                   i.aplicado === 'NÃO' ? 'NAO' : 
                   i.aplicado === 'PARCIAL' ? 'PARCIAL' : 'PENDENTE';
        aplicacaoMap[key] += i.quantidade;
    });
    
    let html = `
        <div class="detail-title">🔧 ${item.codigo} - ${item.descricao}</div>
        <div class="detail-row">
            <span class="label">Total Aditivado:</span>
            <span class="value">${Number.isInteger(item.total) ? item.total : item.total.toFixed(2)} ${item.unidade}</span>
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
            <span class="status-item"><span class="count status-aplicado">${aplicacaoMap.SIM.toFixed(1)}</span> ✅ Aplicado</span>
            <span class="status-item"><span class="count status-nao-aplicado">${aplicacaoMap.NAO.toFixed(1)}</span> ❌ Não Aplicado</span>
            <span class="status-item"><span class="count status-parcial">${aplicacaoMap.PARCIAL.toFixed(1)}</span> 🔄 Parcial</span>
            <span class="status-item"><span class="count status-pendente">${aplicacaoMap.PENDENTE.toFixed(1)}</span> ⏳ Pendente</span>
        </div>
    `;
    
    if (item.obras.length > 0) {
        html += `<div class="detail-section-title">🏗️ Obras:</div>
        <div class="item-detail-obras">`;
        item.obras.forEach(o => {
            const badge = getAplicacaoBadge(o.aplicado);
            const qtdFormatada = Number.isInteger(o.quantidade) ? o.quantidade : o.quantidade.toFixed(2);
            const obraFormatada = formatarObraParaExibicao(o.obra);
            html += `
                <div class="obra-row">
                    <span>${obraFormatada}</span>
                    <span><span class="qtd">${qtdFormatada}</span> ${badge}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    if (item.saidas.length > 0) {
        html += `<div class="detail-section-title">🚚 Saídas:</div>
        <div class="item-detail-obras">`;
        item.saidas.forEach(o => {
            const badge = getAplicacaoBadge(o.aplicado);
            const qtdFormatada = Number.isInteger(o.quantidade) ? o.quantidade : o.quantidade.toFixed(2);
            const obraFormatada = formatarObraParaExibicao(o.obra);
            html += `
                <div class="obra-row">
                    <span>${obraFormatada}</span>
                    <span><span class="qtd">${qtdFormatada}</span> ${badge}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

function getAplicacaoBadge(status) {
    const map = {
        'SIM': '<span class="badge-aplicacao aplicado">✅ Aplicado</span>',
        'NÃO': '<span class="badge-aplicacao nao-aplicado">❌ Não Aplicado</span>',
        'PARCIAL': '<span class="badge-aplicacao parcial">🔄 Parcial</span>',
        'PENDENTE': '<span class="badge-aplicacao pendente">⏳ Pendente</span>'
    };
    return map[status] || `<span class="badge-aplicacao">${status}</span>`;
}

// ============================================
// GRÁFICOS
// ============================================

function renderizarGraficos(itensAgrupados, aditivos) {
    console.log('📊 Renderizando gráficos...');
    
    // Gráfico 1: Distribuição por Status de Aplicação
    const aplicacaoCount = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(aplicacaoCount).forEach(key => {
            aplicacaoCount[key] += item.aplicacaoCount[key] || 0;
        });
    });
    
    const totalGeral = Object.values(aplicacaoCount).reduce((sum, v) => sum + v, 0);
    const maxValue = totalGeral > 0 ? totalGeral : 1;
    
    const labels = {
        'SIM': 'Aplicado',
        'NAO': 'Não Aplicado',
        'PARCIAL': 'Parcial',
        'PENDENTE': 'Pendente'
    };
    
    const classes = {
        'SIM': 'bar-aplicado',
        'NAO': 'bar-nao-aplicado',
        'PARCIAL': 'bar-parcial',
        'PENDENTE': 'bar-pendente'
    };
    
    let html = '';
    Object.keys(aplicacaoCount).forEach(key => {
        const value = aplicacaoCount[key];
        const percentual = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const colorClass = classes[key];
        const valueFormat = Number.isInteger(value) ? value : value.toFixed(1);
        
        html += `
            <div class="chart-bar-indicator">
                <span class="label">${labels[key]}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${percentual}%;">
                        <span class="value">${valueFormat}</span>
                    </div>
                </div>
                <span class="percent">${percentual.toFixed(0)}%</span>
            </div>
        `;
    });
    
    html += `
        <div class="chart-bar-indicator" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span class="label" style="font-weight: 700;">Total</span>
            <div class="bar-track">
                <div class="bar-fill bar-total" style="width: 100%;">
                    <span class="value">${Number.isInteger(totalGeral) ? totalGeral : totalGeral.toFixed(1)}</span>
                </div>
            </div>
            <span class="percent" style="font-weight: 700;">100%</span>
        </div>
    `;
    
    document.getElementById('statusChart').innerHTML = html;
    
    // Gráfico 2: Encarregados
    renderizarEncarregados(aditivos);
}

// ============================================
// ENCARREGADOS
// ============================================

function renderizarEncarregados(aditivos) {
    const container = document.getElementById('encarregadoList');
    if (!container) return;
    
    const encarregados = {};
    
    aditivos.forEach(aditivo => {
        (aditivo.itens || []).forEach(item => {
            const nome = item.encarregado_obra || 'NÃO INFORMADO';
            if (!encarregados[nome]) {
                encarregados[nome] = { total: 0, aplicado: 0, naoAplicado: 0, parcial: 0, pendente: 0 };
            }
            
            const qtd = parseFloat(item.quantidade) || 0;
            encarregados[nome].total += qtd;
            
            const status = item.aplicado || 'PENDENTE';
            if (status === 'SIM') encarregados[nome].aplicado += qtd;
            else if (status === 'NÃO') encarregados[nome].naoAplicado += qtd;
            else if (status === 'PARCIAL') encarregados[nome].parcial += qtd;
            else encarregados[nome].pendente += qtd;
        });
    });
    
    const sorted = Object.entries(encarregados)
        .sort((a, b) => b[1].total - a[1].total);
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👤</div>
                <p>Nenhum encarregado encontrado</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    sorted.forEach(([nome, stats]) => {
        html += `
            <div class="encarregado-item">
                <span class="name">${nome}</span>
                <div class="stats">
                    <span class="total">${stats.total.toFixed(1)}</span>
                    <span class="aplicado">✅ ${stats.aplicado.toFixed(1)}</span>
                    <span class="nao-aplicado">❌ ${stats.naoAplicado.toFixed(1)}</span>
                    <span class="parcial">🔄 ${stats.parcial.toFixed(1)}</span>
                    <span class="pendente">⏳ ${stats.pendente.toFixed(1)}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// TOP SKUs
// ============================================

function renderizarTopSkus(itensAgrupados) {
    const container = document.getElementById('topSkusChart');
    if (!container) return;
    
    const topSkus = [...itensAgrupados]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    
    const maxTotal = topSkus.length > 0 ? Math.max(...topSkus.map(s => s.total)) : 1;
    
    let html = '';
    topSkus.forEach((item, index) => {
        const percentual = (item.total / maxTotal) * 100;
        const qtdFormatada = Number.isInteger(item.total) ? item.total : item.total.toFixed(1);
        html += `
            <div class="top-sku-item">
                <span class="rank">#${index + 1}</span>
                <span class="code">${item.codigo}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentual}%;">
                        <span class="value">${qtdFormatada}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (topSkus.length === 0) {
        html = `<div class="empty-state-dashboard"><p>Nenhum SKU encontrado</p></div>`;
    }
    
    container.innerHTML = html;
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

console.log('✅ dashboards-aditivos-fisicos.js inicializado!');