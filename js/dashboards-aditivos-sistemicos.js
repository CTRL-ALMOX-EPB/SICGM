// ============================================
// DASHBOARD ADITIVOS SISTÊMICOS (REFORMULADO)
// ============================================

console.log('🚀 dashboards-aditivos-sistemicos.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let itemSelecionado = null;
let abaAtual = 'materiais'; // 'materiais' ou 'obras'

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
        console.log('📡 Iniciando busca de dados...');
        
        const startTime = Date.now();
        dadosCompletos = await buscarAditivosSistemicosCompleto();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} aditivos carregados em ${elapsed}ms`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhum aditivo sistêmico encontrado');
            mostrarToast('⚠️ Nenhum aditivo sistêmico encontrado no sistema', 'warning');
        }
        
        // Cria as abas
        criarAbas();
        
        // Aplica filtros iniciais
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
    const container = document.querySelector('.dashboard-main');
    if (!container) return;
    
    // Adiciona o container de abas antes do grid
    const abaContainer = document.createElement('div');
    abaContainer.className = 'dashboard-card';
    abaContainer.style.gridColumn = '1 / -1';
    abaContainer.style.marginBottom = '0';
    abaContainer.style.padding = '10px 20px';
    abaContainer.innerHTML = `
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn-aba active" data-aba="materiais" onclick="trocarAba('materiais')" style="padding: 8px 20px; border: 2px solid #E2E8F0; border-radius: 8px; background: #F7FAFC; color: #4A5568; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.3s;">
                📦 Materiais
            </button>
            <button class="btn-aba" data-aba="obras" onclick="trocarAba('obras')" style="padding: 8px 20px; border: 2px solid #E2E8F0; border-radius: 8px; background: #F7FAFC; color: #4A5568; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.3s;">
                🏗️ Obras
            </button>
        </div>
    `;
    
    container.parentNode.insertBefore(abaContainer, container);
    
    // Adiciona estilos para as abas ativas
    const style = document.createElement('style');
    style.textContent = `
        .btn-aba.active {
            background: #ED8936 !important;
            color: white !important;
            border-color: #ED8936 !important;
        }
        .btn-aba:hover:not(.active) {
            background: #EDF2F7 !important;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// TROCAR ABA
// ============================================

function trocarAba(aba) {
    abaAtual = aba;
    
    // Atualiza botões
    document.querySelectorAll('.btn-aba').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    // Re-renderiza com a aba atual
    renderizarDashboard(dadosFiltrados);
}

// ============================================
// FILTROS
// ============================================

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros...');
    const dataInicio = document.getElementById('filterDataInicio')?.value || '';
    const dataFim = document.getElementById('filterDataFim')?.value || '';
    const statusFiltro = document.getElementById('filterStatus')?.value || 'todos';
    
    console.log(`📅 Filtros: Início=${dataInicio}, Fim=${dataFim}, Status=${statusFiltro}`);
    
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
    
    if (statusFiltro !== 'todos') {
        filtrados = filtrados.map(aditivo => ({
            ...aditivo,
            itens: (aditivo.itens || []).filter(item => 
                (item.status_aditivo || 'ANALISE') === statusFiltro
            )
        })).filter(aditivo => aditivo.itens && aditivo.itens.length > 0);
        console.log(`📊 Após filtro de status: ${filtrados.length} aditivos`);
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
    document.getElementById('filterStatus').value = 'todos';
    aplicarFiltros();
}

// ============================================
// AGRUPAMENTO DE ITENS
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
            const quantidade = parseFloat(item.quantidade) || 0;
            const unidade = item.unidade || 'UN';
            
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
            const status = item.status_aditivo || 'ANALISE';
            
            if (grupos[codigo].statusCount[status] !== undefined) {
                grupos[codigo].statusCount[status] += quantidade;
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
                skus: new Set()
            };
        }
        
        obras[obra].datas.add(dataProgramacao);
        
        itens.forEach(item => {
            obras[obra].itens.push({
                ...item,
                data: dataProgramacao,
                numero: controle.numero
            });
            obras[obra].totalItens += parseFloat(item.quantidade) || 0;
            if (item.codigo) obras[obra].skus.add(item.codigo);
        });
    });
    
    const resultado = Object.values(obras).map(obra => ({
        ...obra,
        datas: Array.from(obra.datas).sort(),
        skusCount: obra.skus.size
    })).sort((a, b) => b.totalItens - a.totalItens);
    
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
        return;
    }
    
    if (abaAtual === 'materiais') {
        const itensAgrupados = agruparItensPorCodigo(aditivos);
        console.log(`📦 ${itensAgrupados.length} grupos de itens criados`);
        
        renderizarKPIsMateriais(itensAgrupados);
        renderizarListaItens(itensAgrupados);
        renderizarGraficos(itensAgrupados);
        
        if (itemSelecionado) {
            const encontrado = itensAgrupados.find(i => i.codigo === itemSelecionado.codigo);
            if (encontrado) {
                renderizarDetalhes(encontrado);
            }
        }
    } else {
        const obrasAgrupadas = agruparPorObra(aditivos);
        renderizarListaObras(obrasAgrupadas);
        renderizarKPIsObras(obrasAgrupadas);
    }
}

// ============================================
// KPIs - MATERIAIS
// ============================================

function renderizarKPIsMateriais(itensAgrupados) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    // Conta quantos SKUs diferentes (itens) existem
    const totalSkus = itensAgrupados.length;
    
    // Conta quantas obras diferentes têm aditivos
    const obrasSet = new Set();
    itensAgrupados.forEach(item => {
        item.obras.forEach(o => obrasSet.add(o.obra));
        item.saidas.forEach(s => obrasSet.add(s.obra));
    });
    const totalObras = obrasSet.size;
    
    // Conta quantos SKUs por status (usando COUNT, não soma)
    const statusCount = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    itensAgrupados.forEach(item => {
        // Para cada SKU, verifica se tem pelo menos um item com aquele status
        const statusPorSku = new Set();
        item.itens.forEach(i => {
            const s = i.status || 'ANALISE';
            statusPorSku.add(s);
        });
        // Cada SKU conta apenas uma vez por status
        statusPorSku.forEach(s => {
            if (statusCount[s] !== undefined) statusCount[s]++;
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
        <div class="kpi-card status-analise">
            <div class="kpi-icon">📊</div>
            <div class="kpi-value">${statusCount.ANALISE}</div>
            <div class="kpi-label">SKUs em Análise</div>
        </div>
        <div class="kpi-card status-aprovado">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${statusCount.APROVADO}</div>
            <div class="kpi-label">SKUs Aprovados</div>
        </div>
        <div class="kpi-card status-reprovado">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${statusCount.REPROVADO}</div>
            <div class="kpi-label">SKUs Reprovados</div>
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
    const totalSkus = obrasAgrupadas.reduce((sum, o) => sum + o.skusCount, 0);
    const totalItens = obrasAgrupadas.reduce((sum, o) => sum + o.totalItens, 0);
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Total de Obras</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalSkus}</div>
            <div class="kpi-label">SKUs Aditivados</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📊</div>
            <div class="kpi-value">${Math.round(totalItens * 100) / 100}</div>
            <div class="kpi-label">Total de Itens</div>
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
    
    let html = '';
    itensAgrupados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.codigo === item.codigo;
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
        const isActive = itemSelecionado && itemSelecionado.obra === obra.obra;
        const totalFormatado = Number.isInteger(obra.totalItens) ? obra.totalItens : obra.totalItens.toFixed(2);
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${obra.obra}')">
                <span class="item-code">🏗️</span>
                <span class="item-desc">${obra.obra}</span>
                <span class="item-total">${obra.skusCount} SKUs | ${totalFormatado} itens</span>
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
    
    let html = `
        <div class="detail-title">🏗️ ${obra.obra}</div>
        <div class="detail-row">
            <span class="label">SKUs Aditivados:</span>
            <span class="value">${obra.skusCount}</span>
        </div>
        <div class="detail-row">
            <span class="label">Total de Itens:</span>
            <span class="value">${Number.isInteger(obra.totalItens) ? obra.totalItens : obra.totalItens.toFixed(2)}</span>
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
    
    // Lista todos os materiais pendentes
    html += `<div class="detail-section-title">📦 Materiais Aditivados:</div>
    <div class="item-detail-obras">`;
    
    // Agrupa itens por código para mostrar resumo
    const itensPorCodigo = {};
    obra.itens.forEach(item => {
        const codigo = item.codigo || 'SEM_CODIGO';
        if (!itensPorCodigo[codigo]) {
            itensPorCodigo[codigo] = {
                codigo: codigo,
                descricao: item.descricao || 'Sem descrição',
                quantidade: 0,
                status: item.status_aditivo || 'ANALISE'
            };
        }
        itensPorCodigo[codigo].quantidade += parseFloat(item.quantidade) || 0;
    });
    
    Object.values(itensPorCodigo).forEach(item => {
        const qtdFormatada = Number.isInteger(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2);
        const badge = getStatusBadge(item.status);
        html += `
            <div class="obra-row">
                <span><strong>${item.codigo}</strong> - ${item.descricao}</span>
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
    const itensAgrupados = agruparItensPorCodigo(dadosFiltrados);
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
    
    const statusMap = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    item.itens.forEach(i => {
        const s = i.status || 'ANALISE';
        if (statusMap[s] !== undefined) statusMap[s] += i.quantidade;
    });
    
    let html = `
        <div class="detail-title">📦 ${item.codigo} - ${item.descricao}</div>
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
            const qtdFormatada = Number.isInteger(o.quantidade) ? o.quantidade : o.quantidade.toFixed(2);
            html += `
                <div class="obra-row">
                    <span>${o.obra}</span>
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
            const badge = getStatusBadge(o.status);
            const qtdFormatada = Number.isInteger(o.quantidade) ? o.quantidade : o.quantidade.toFixed(2);
            html += `
                <div class="obra-row">
                    <span>${o.obra}</span>
                    <span><span class="qtd">${qtdFormatada}</span> ${badge}</span>
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
// GRÁFICOS DE INDICADORES
// ============================================

function renderizarGraficos(itensAgrupados) {
    console.log('📊 Renderizando gráficos de indicadores...');
    
    // Calcula totais por status (usando COUNT de SKUs)
    const statusCount = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    itensAgrupados.forEach(item => {
        const statusPorSku = new Set();
        item.itens.forEach(i => {
            const s = i.status || 'ANALISE';
            statusPorSku.add(s);
        });
        statusPorSku.forEach(s => {
            if (statusCount[s] !== undefined) statusCount[s]++;
        });
    });
    
    const totalSkus = itensAgrupados.length;
    const maxValue = totalSkus > 0 ? totalSkus : 1;
    
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
    
    // Gráfico 1: Distribuição de SKUs por Status (barras horizontais estilo indicador)
    let htmlStatus = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; padding: 10px 0;">
    `;
    
    Object.keys(statusCount).forEach(status => {
        const value = statusCount[status];
        const percentual = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const colorClass = statusClasses[status];
        
        htmlStatus += `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 12px; color: #4A5568; min-width: 90px;">${statusLabels[status]}</span>
                <div style="flex: 1; background: #EDF2F7; border-radius: 10px; height: 24px; overflow: hidden; position: relative;">
                    <div class="${colorClass}" style="width: ${percentual}%; height: 100%; border-radius: 10px; transition: width 0.8s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; min-width: ${value > 0 ? '30px' : '0'};">
                        <span style="font-size: 12px; font-weight: 600; color: white;">${value}</span>
                    </div>
                </div>
                <span style="font-size: 12px; color: #718096; min-width: 40px;">${percentual.toFixed(0)}%</span>
            </div>
        `;
    });
    
    htmlStatus += `
            <div style="display: flex; align-items: center; gap: 10; margin-top: 4px;">
                <span style="font-size: 12px; color: #4A5568; min-width: 90px; font-weight: 600;">Total</span>
                <div style="flex: 1; background: #EDF2F7; border-radius: 10px; height: 24px; overflow: hidden; position: relative;">
                    <div style="width: 100%; height: 100%; background: #4299E1; border-radius: 10px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">
                        <span style="font-size: 12px; font-weight: 700; color: white;">${totalSkus}</span>
                    </div>
                </div>
                <span style="font-size: 12px; color: #718096; min-width: 40px;">100%</span>
            </div>
        </div>
    `;
    
    document.getElementById('statusChart').innerHTML = htmlStatus;
    
    // Gráfico 2: Top 10 SKUs com maior quantidade
    const topSkus = [...itensAgrupados]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    
    const maxTotal = topSkus.length > 0 ? Math.max(...topSkus.map(s => s.total)) : 1;
    
    let htmlTop = `
        <div style="width: 100%; display: flex; flex-direction: column; gap: 6px; padding: 10px 0;">
    `;
    
    topSkus.forEach((item, index) => {
        const percentual = (item.total / maxTotal) * 100;
        const qtdFormatada = Number.isInteger(item.total) ? item.total : item.total.toFixed(1);
        htmlTop += `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; color: #4A5568; min-width: 60px; font-weight: 500;">#${index + 1}</span>
                <span style="font-size: 11px; color: #2D3748; min-width: 70px; font-weight: 600;">${item.codigo}</span>
                <div style="flex: 1; background: #EDF2F7; border-radius: 6px; height: 18px; overflow: hidden;">
                    <div style="width: ${percentual}%; height: 100%; background: linear-gradient(90deg, #4299E1, #2B6CB0); border-radius: 6px; transition: width 0.8s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; min-width: ${item.total > 0 ? '20px' : '0'};">
                        <span style="font-size: 10px; font-weight: 600; color: white;">${qtdFormatada}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    htmlTop += `</div>`;
    document.getElementById('valorChart').innerHTML = htmlTop;
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

console.log('✅ dashboards-aditivos-sistemicos.js inicializado!');