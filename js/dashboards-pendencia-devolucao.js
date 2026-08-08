// ============================================
// DASHBOARD PENDÊNCIA DE DEVOLUÇÃO
// ============================================

console.log('🚀 dashboards-pendencia-devolucao.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let dadosExibidos = [];
let itemSelecionado = null;
let filtroAtivo = null;

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
    console.log('📋 DOM carregado, iniciando dashboard Pendência de Devolução...');
    
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
        dadosCompletos = await buscarPendenciasDevolucao();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} pendências de devolução carregadas em ${elapsed}ms`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhuma pendência de devolução encontrada');
            mostrarToast('⚠️ Nenhuma pendência de devolução encontrada', 'warning');
        }
        
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
// FILTROS
// ============================================

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros...');
    const dataInicio = document.getElementById('filterDataInicio')?.value || '';
    const dataFim = document.getElementById('filterDataFim')?.value || '';
    const buscaObra = document.getElementById('filterObra')?.value || '';
    const buscaEncarregado = document.getElementById('filterEncarregado')?.value?.toLowerCase() || '';
    
    let filtrados = [...dadosCompletos];
    
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
        console.log(`📅 Após filtro de período: ${filtrados.length} pendências`);
    }
    
    if (buscaObra) {
        filtrados = filtrados.filter(item => {
            const obra = (item.obra || '').toLowerCase();
            return obra.includes(buscaObra.toLowerCase());
        });
        console.log(`🏗️ Após filtro de obra: ${filtrados.length} pendências`);
    }
    
    if (buscaEncarregado) {
        filtrados = filtrados.filter(item => {
            const encarregado = (item.encarregado || '').toLowerCase();
            return encarregado.includes(buscaEncarregado);
        });
        console.log(`👤 Após filtro de encarregado: ${filtrados.length} pendências`);
    }
    
    dadosFiltrados = filtrados;
    dadosExibidos = filtrados;
    filtroAtivo = null;
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        totalRegistros.textContent = `${filtrados.length} pendências`;
    }
    
    renderizarDashboard(filtrados);
}

function limparFiltros() {
    console.log('🧹 Limpando filtros...');
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterObra').value = '';
    document.getElementById('filterEncarregado').value = '';
    filtroAtivo = null;
    aplicarFiltros();
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
        
        if (tipo === 'encarregado') {
            dadosExibidos = dadosFiltrados.filter(p => p.encarregado === valor);
        } else if (tipo === 'total') {
            dadosExibidos = [...dadosFiltrados];
        }
    }
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        const textoFiltro = filtroAtivo ? ` (filtrado: ${filtroAtivo.tipo})` : '';
        totalRegistros.textContent = `${dadosExibidos.length} pendências${textoFiltro}`;
    }
    
    renderizarDashboard(dadosExibidos);
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(pendencias) {
    if (!pendencias || pendencias.length === 0) {
        console.log('📭 Nenhuma pendência para renderizar');
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
    
    renderizarKPIs(pendencias);
    renderizarListaPendencias(pendencias);
    renderizarGraficos(pendencias);
    
    if (itemSelecionado) {
        const encontrado = pendencias.find(p => p.id === itemSelecionado.id);
        if (encontrado) {
            renderizarDetalhes(encontrado);
        }
    }
}

// ============================================
// KPIs
// ============================================

function renderizarKPIs(pendencias) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const total = pendencias.length;
    const totalObras = new Set(pendencias.map(p => p.obra)).size;
    const totalEncarregados = new Set(pendencias.map(p => p.encarregado).filter(e => e)).size;
    
    // Conta pendências por encarregado
    const encarregadosCount = {};
    pendencias.forEach(p => {
        const nome = p.encarregado || 'NÃO INFORMADO';
        if (!encarregadosCount[nome]) encarregadosCount[nome] = 0;
        encarregadosCount[nome]++;
    });
    
    const sortedEncarregados = Object.entries(encarregadosCount)
        .sort((a, b) => b[1] - a[1]);
    
    const topEncarregado = sortedEncarregados.length > 0 ? sortedEncarregados[0][0] : 'Nenhum';
    const topCount = sortedEncarregados.length > 0 ? sortedEncarregados[0][1] : 0;
    
    const isFilterActive = (tipo, valor) => {
        return filtroAtivo && filtroAtivo.tipo === tipo && filtroAtivo.valor === valor;
    };
    
    container.innerHTML = `
        <div class="kpi-card status-total ${isFilterActive('total', 'TOTAL') ? 'active' : ''}" onclick="aplicarFiltroCard('total', 'TOTAL')" style="cursor: pointer; ${isFilterActive('total', 'TOTAL') ? 'border: 2px solid #4299E1; background: #EBF8FF;' : ''}">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total de Pendências</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras com Pendência</div>
        </div>
        <div class="kpi-card ${isFilterActive('encarregado', topEncarregado) ? 'active' : ''}" onclick="aplicarFiltroCard('encarregado', '${topEncarregado}')" style="cursor: pointer; ${isFilterActive('encarregado', topEncarregado) ? 'border: 2px solid #ED8936; background: #FFFAF0;' : ''}">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${topCount}</div>
            <div class="kpi-label">${topEncarregado}</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalEncarregados}</div>
            <div class="kpi-label">Encarregados</div>
        </div>
    `;
}

// ============================================
// LISTA DE PENDÊNCIAS
// ============================================

function renderizarListaPendencias(pendencias) {
    const container = document.getElementById('itemList');
    if (!container) return;
    
    if (!pendencias || pendencias.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma pendência encontrada</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    // Ordena pendências por obra
    const pendenciasOrdenadas = [...pendencias].sort((a, b) => (a.obra || '').localeCompare(b.obra || ''));
    
    let html = `
        <div style="display: grid; grid-template-columns: 100px 1fr 100px 80px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span>Encarregado</span>
            <span style="text-align: right;">Data</span>
            <span style="text-align: right;">Status</span>
        </div>
    `;
    
    pendenciasOrdenadas.forEach(pendencia => {
        const isActive = itemSelecionado && itemSelecionado.id === pendencia.id;
        const obraFormatada = formatarObraParaExibicao(pendencia.obra);
        const encarregado = pendencia.encarregado || 'NÃO INFORMADO';
        const dataFormatada = formatarData(pendencia.data_programacao);
        
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarPendencia(${pendencia.id})" style="display: grid; grid-template-columns: 100px 1fr 100px 80px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="item-code">🏗️ ${obraFormatada}</span>
                <span class="item-desc">👤 ${encarregado}</span>
                <span style="text-align: right; font-size: 12px; color: #718096;">${dataFormatada}</span>
                <span style="text-align: right;"><span class="badge-baixa nao-baixado">⏳ Pendente</span></span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR PENDÊNCIA
// ============================================

function selecionarPendencia(id) {
    console.log(`🔍 Selecionando pendência ID: ${id}`);
    const pendencia = dadosExibidos.find(p => p.id === id);
    
    if (pendencia) {
        itemSelecionado = { id: pendencia.id };
        renderizarDetalhes(pendencia);
        renderizarListaPendencias(dadosExibidos);
    }
}

// ============================================
// DETALHES DA PENDÊNCIA
// ============================================

function renderizarDetalhes(pendencia) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    const obraFormatada = formatarObraParaExibicao(pendencia.obra);
    
    let html = `
        <div class="detail-title">📦 Pendência - ${obraFormatada}</div>
        <div class="detail-row">
            <span class="label">Obra:</span>
            <span class="value">🏗️ ${obraFormatada}</span>
        </div>
        <div class="detail-row">
            <span class="label">Encarregado:</span>
            <span class="value">👤 ${pendencia.encarregado || 'Não informado'}</span>
        </div>
        <div class="detail-row">
            <span class="label">Data de Programação:</span>
            <span class="value">📅 ${formatarData(pendencia.data_programacao)}</span>
        </div>
        <div class="detail-row">
            <span class="label">Data de Descarga:</span>
            <span class="value">📦 ${formatarData(pendencia.data_descarga)}</span>
        </div>
        <div class="detail-row">
            <span class="label">Data Devolução Física:</span>
            <span class="value">📦 ${formatarData(pendencia.data_devolucao_fisica)}</span>
        </div>
        <div class="detail-row">
            <span class="label">Motivo da Pendência:</span>
            <span class="value">${pendencia.motivo_pendencia || 'Não informado'}</span>
        </div>
        <div class="detail-row">
            <span class="label">Solução:</span>
            <span class="value">${pendencia.solucao_pendencia || 'Não informada'}</span>
        </div>
        <div class="detail-row">
            <span class="label">Pendência por:</span>
            <span class="value">${pendencia.pendencia_por || 'Não informado'}</span>
        </div>
        <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value" style="color: #ED8936; font-weight: 600;">⏳ Pendente</span>
        </div>
    `;
    
    if (pendencia.observacao) {
        html += `
            <div class="detail-section-title">📝 Observação</div>
            <div class="detail-row" style="grid-column: 1 / -1;">
                <span class="value" style="font-size: 13px; color: #4A5568;">${pendencia.observacao}</span>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// GRÁFICOS
// ============================================

function renderizarGraficos(pendencias) {
    console.log('📊 Renderizando gráficos...');
    
    const total = pendencias.length || 1;
    
    // Gráfico 1: Distribuição por Encarregado
    const encarregadosCount = {};
    pendencias.forEach(p => {
        const nome = p.encarregado || 'NÃO INFORMADO';
        if (!encarregadosCount[nome]) encarregadosCount[nome] = 0;
        encarregadosCount[nome]++;
    });
    
    const sorted = Object.entries(encarregadosCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
    
    const maxCount = sorted.length > 0 ? Math.max(...sorted.map(s => s[1])) : 1;
    
    let htmlEncarregado = '';
    sorted.forEach(([nome, count]) => {
        const percentual = (count / maxCount) * 100;
        const percentualTotal = (count / total) * 100;
        htmlEncarregado += `
            <div class="chart-bar-indicator" style="margin-bottom: 6px;">
                <span class="label" style="min-width: 100px; font-size: 11px;">${nome}</span>
                <div class="bar-track" style="height: 22px;">
                    <div class="bar-fill" style="width: ${percentual}%; background: linear-gradient(90deg, #ED8936, #C05621);">
                        <span class="value">${count}</span>
                    </div>
                </div>
                <span class="percent" style="font-size: 11px;">${percentualTotal.toFixed(0)}%</span>
            </div>
        `;
    });
    
    if (sorted.length === 0) {
        htmlEncarregado = `<div class="empty-state-dashboard"><p>Nenhum encarregado encontrado</p></div>`;
    }
    
    document.getElementById('statusChart').innerHTML = htmlEncarregado;
    
    // Gráfico 2: Top Obras com Pendência
    const obrasCount = {};
    pendencias.forEach(p => {
        const obra = p.obra || 'SEM OBRA';
        if (!obrasCount[obra]) obrasCount[obra] = 0;
        obrasCount[obra]++;
    });
    
    const sortedObras = Object.entries(obrasCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const maxObras = sortedObras.length > 0 ? Math.max(...sortedObras.map(s => s[1])) : 1;
    
    let htmlObras = '';
    sortedObras.forEach(([obra, count]) => {
        const percentual = (count / maxObras) * 100;
        const obraFormatada = formatarObraParaExibicao(obra);
        htmlObras += `
            <div class="top-sku-item">
                <span class="rank" style="min-width: 25px;">#</span>
                <span class="code" style="min-width: 80px; font-size: 10px;">${obraFormatada}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentual}%; background: linear-gradient(90deg, #FC8181, #C53030);">
                        <span class="value">${count}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (sortedObras.length === 0) {
        htmlObras = `<div class="empty-state-dashboard"><p>Nenhuma obra encontrada</p></div>`;
    }
    
    document.getElementById('topSkusChart').innerHTML = htmlObras;
}

// ============================================
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarPendencia = selecionarPendencia;
window.renderizarDashboard = renderizarDashboard;
window.aplicarFiltroCard = aplicarFiltroCard;

console.log('✅ dashboards-pendencia-devolucao.js inicializado!');