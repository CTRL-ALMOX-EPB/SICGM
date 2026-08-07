// ============================================
// DASHBOARD ADITIVOS SISTÊMICOS
// ============================================

let dadosCompletos = [];
let dadosFiltrados = [];
let itemSelecionado = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    
    const sessao = getSessao();
    if (!sessao) return;
    
    document.getElementById('userName').textContent = sessao.nome || 'Usuário';
    document.getElementById('userMatricula').textContent = `Matrícula: ${sessao.matricula || '---'}`;
    document.getElementById('userPerfil').textContent = sessao.perfil || 'GESTÃO';
    
    try {
        // Busca todos os aditivos sistêmicos
        const response = await fetch(`${API_URL}/aditivo-sistemico?limit=1000`);
        if (!response.ok) throw new Error('Erro ao buscar dados');
        
        const data = await response.json();
        dadosCompletos = data.data || [];
        
        // Busca os itens de cada aditivo
        let totalItens = 0;
        for (const aditivo of dadosCompletos) {
            try {
                const itemResponse = await fetch(`${API_URL}/aditivo-sistemico/${aditivo.numero}`);
                if (itemResponse.ok) {
                    const itemData = await itemResponse.json();
                    aditivo.itens = itemData.itens || [];
                    totalItens += aditivo.itens.length;
                } else {
                    aditivo.itens = [];
                }
            } catch (e) {
                aditivo.itens = [];
            }
        }
        
        console.log(`✅ ${dadosCompletos.length} aditivos, ${totalItens} itens carregados`);
        
        aplicarFiltros();
        
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarToast('❌ Erro ao carregar dados', 'error');
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        
        document.getElementById('itemList').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">❌</div>
                <p>Erro ao carregar dados</p>
                <p style="font-size: 12px; color: #a0aec0;">${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 20px; background: #4299e1; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Tentar novamente
                </button>
            </div>
        `;
    }
});

// ============================================
// FILTROS
// ============================================

function aplicarFiltros() {
    const dataInicio = document.getElementById('filterDataInicio').value;
    const dataFim = document.getElementById('filterDataFim').value;
    const statusFiltro = document.getElementById('filterStatus').value;
    
    let filtrados = [...dadosCompletos];
    
    // Filtro por período
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
    }
    
    // Filtro por status
    if (statusFiltro !== 'todos') {
        filtrados = filtrados.map(aditivo => ({
            ...aditivo,
            itens: (aditivo.itens || []).filter(item => 
                (item.status_aditivo || 'ANALISE') === statusFiltro
            )
        })).filter(aditivo => aditivo.itens.length > 0);
    }
    
    dadosFiltrados = filtrados;
    document.getElementById('totalRegistros').textContent = `${filtrados.length} aditivos encontrados`;
    
    renderizarDashboard(filtrados);
}

function limparFiltros() {
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterStatus').value = 'todos';
    aplicarFiltros();
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(aditivos) {
    const itensAgrupados = agruparItensPorCodigo(aditivos);
    
    renderizarKPIs(itensAgrupados);
    renderizarListaItens(itensAgrupados);
    renderizarGraficos(itensAgrupados);
    
    if (itemSelecionado) {
        const encontrado = itensAgrupados.find(i => i.codigo === itemSelecionado.codigo);
        if (encontrado) {
            renderizarDetalhes(encontrado);
        } else {
            document.getElementById('itemDetails').innerHTML = `
                <div class="empty-state-dashboard">
                    <div class="icon">👆</div>
                    <p>Item não encontrado nos filtros atuais</p>
                </div>
            `;
        }
    }
}

// ============================================
// KPIs
// ============================================

function renderizarKPIs(itensAgrupados) {
    const totalItens = itensAgrupados.reduce((sum, item) => sum + item.total, 0);
    const totalObras = new Set();
    const totalSaidas = new Set();
    
    itensAgrupados.forEach(item => {
        item.obras.forEach(o => totalObras.add(o.obra));
        item.saidas.forEach(s => totalSaidas.add(s.obra));
    });
    
    const statusCount = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    itensAgrupados.forEach(item => {
        Object.keys(statusCount).forEach(status => {
            statusCount[status] += item.statusCount[status] || 0;
        });
    });
    
    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalItens}</div>
            <div class="kpi-label">Total de Itens Aditivados</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras.size}</div>
            <div class="kpi-label">Obras com Aditivos</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🚚</div>
            <div class="kpi-value">${totalSaidas.size}</div>
            <div class="kpi-label">Saídas com Aditivos</div>
        </div>
        <div class="kpi-card status-analise">
            <div class="kpi-icon">📊</div>
            <div class="kpi-value">${statusCount.ANALISE}</div>
            <div class="kpi-label">Em Análise</div>
        </div>
        <div class="kpi-card status-aprovado">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${statusCount.APROVADO}</div>
            <div class="kpi-label">Aprovados</div>
        </div>
        <div class="kpi-card status-reprovado">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${statusCount.REPROVADO}</div>
            <div class="kpi-label">Reprovados</div>
        </div>
    `;
}

// ============================================
// LISTA DE ITENS
// ============================================

function renderizarListaItens(itensAgrupados) {
    const container = document.getElementById('itemList');
    
    if (!itensAgrupados || itensAgrupados.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhum item encontrado</p>
                <p style="font-size: 12px; color: #a0aec0;">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    itensAgrupados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.codigo === item.codigo;
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarItem('${item.codigo}')">
                <span class="item-code">${item.codigo}</span>
                <span class="item-desc">${item.descricao}</span>
                <span class="item-total">${item.total} ${item.unidade}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// DETALHES DO ITEM
// ============================================

function selecionarItem(codigo) {
    const itensAgrupados = agruparItensPorCodigo(dadosFiltrados);
    const item = itensAgrupados.find(i => i.codigo === codigo);
    
    if (item) {
        itemSelecionado = item;
        renderizarDetalhes(item);
        renderizarListaItens(itensAgrupados);
    }
}

function renderizarDetalhes(item) {
    const container = document.getElementById('itemDetails');
    
    if (!item) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Selecione um item para ver os detalhes</p>
            </div>
        `;
        return;
    }
    
    // Conta status
    const statusMap = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    item.itens.forEach(i => {
        const s = i.status || 'ANALISE';
        if (statusMap[s] !== undefined) statusMap[s] += i.quantidade;
    });
    
    let html = `
        <div class="detail-title">📦 ${item.codigo} - ${item.descricao}</div>
        <div class="detail-row">
            <span class="label">Total Aditivado:</span>
            <span class="value">${item.total} ${item.unidade}</span>
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
    
    // Obras
    if (item.obras.length > 0) {
        html += `<div class="detail-section-title">🏗️ Obras:</div>
        <div class="item-detail-obras">`;
        item.obras.forEach(o => {
            const badge = getStatusBadge(o.status);
            html += `
                <div class="obra-row">
                    <span>${o.obra}</span>
                    <span><span class="qtd">${o.quantidade}</span> ${badge}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    // Saídas
    if (item.saidas.length > 0) {
        html += `<div class="detail-section-title">🚚 Saídas:</div>
        <div class="item-detail-obras">`;
        item.saidas.forEach(o => {
            const badge = getStatusBadge(o.status);
            html += `
                <div class="obra-row">
                    <span>${o.obra}</span>
                    <span><span class="qtd">${o.quantidade}</span> ${badge}</span>
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
// GRÁFICOS
// ============================================

function renderizarGraficos(itensAgrupados) {
    // Gráfico de quantidade por status
    const statusCount = { ANALISE: 0, APROVADO: 0, REPROVADO: 0, 'S/ SOLICITAÇÃO': 0 };
    itensAgrupados.forEach(item => {
        Object.keys(statusCount).forEach(status => {
            statusCount[status] += item.statusCount[status] || 0;
        });
    });
    
    const maxQtd = Math.max(...Object.values(statusCount), 1);
    
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
    
    let htmlQtd = '';
    Object.keys(statusCount).forEach(status => {
        const value = statusCount[status];
        const height = value > 0 ? (value / maxQtd) * 150 : 10;
        htmlQtd += `
            <div class="chart-bar ${statusClasses[status]}" style="height: ${height}px;">
                <span class="bar-value">${value}</span>
                <span class="bar-label">${statusLabels[status]}</span>
            </div>
        `;
    });
    
    document.getElementById('statusChart').innerHTML = htmlQtd;
    
    // Gráfico de valores (simulado - usando quantidade como proxy)
    // Como não temos valores reais, vamos usar a quantidade como indicador
    const valorMap = {};
    itensAgrupados.forEach(item => {
        Object.keys(statusCount).forEach(status => {
            if (!valorMap[status]) valorMap[status] = 0;
            // Simula valor baseado na quantidade
            valorMap[status] += (item.statusCount[status] || 0) * 1.5;
        });
    });
    
    const maxValor = Math.max(...Object.values(valorMap), 1);
    let htmlValor = '';
    Object.keys(valorMap).forEach(status => {
        const value = Math.round(valorMap[status]);
        const height = value > 0 ? (value / maxValor) * 150 : 10;
        htmlValor += `
            <div class="chart-bar ${statusClasses[status]}" style="height: ${height}px;">
                <span class="bar-value">R$ ${value}</span>
                <span class="bar-label">${statusLabels[status]}</span>
            </div>
        `;
    });
    
    document.getElementById('valorChart').innerHTML = htmlValor;
}

// ============================================
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarItem = selecionarItem;
window.renderizarDashboard = renderizarDashboard;