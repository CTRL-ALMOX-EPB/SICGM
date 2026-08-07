// ============================================
// DASHBOARD ADITIVOS FÍSICOS (OTIMIZADO)
// ============================================

console.log('🚀 dashboards-aditivos-fisicos.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let itemSelecionado = null;

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
    console.log('🔄 Aplicando filtros...');
    const dataInicio = document.getElementById('filterDataInicio')?.value || '';
    const dataFim = document.getElementById('filterDataFim')?.value || '';
    const filtroAplicacao = document.getElementById('filterAplicacao')?.value || 'todos';
    
    console.log(`📅 Filtros: Início=${dataInicio}, Fim=${dataFim}, Aplicação=${filtroAplicacao}`);
    
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
        console.log(`📊 Após filtro de aplicação: ${filtrados.length} aditivos`);
    }
    
    dadosFiltrados = filtrados;
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        totalRegistros.textContent = `${filtrados.length} aditivos encontrados`;
    }
    
    renderizarDashboard(filtrados);
}

function limparFiltros() {
    console.log('🧹 Limpando filtros...');
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterAplicacao').value = 'todos';
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
            const colaborador = item.colaborador_solicitante || 'NÃO INFORMADO';
            
            if (!grupos[codigo]) {
                grupos[codigo] = {
                    codigo: codigo,
                    descricao: descricao,
                    unidade: unidade,
                    total: 0,
                    obras: [],
                    saidas: [],
                    itens: [],
                    aplicacaoCount: { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 }
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
                colaborador: colaborador,
                data: controle.data_programacao || '',
                numero: controle.numero,
                ...item
            };
            
            if (isSaida) {
                grupos[codigo].saidas.push(itemData);
            } else {
                grupos[codigo].obras.push(itemData);
            }
            
            grupos[codigo].itens.push(itemData);
        });
    });
    
    const resultado = Object.values(grupos).sort((a, b) => b.total - a.total);
    console.log(`✅ ${resultado.length} grupos de itens criados a partir de ${totalItens} itens`);
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
                <p>Nenhum aditivo físico encontrado</p>
                <p style="font-size: 12px; color: #a0aec0;">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    const itensAgrupados = agruparItensFisicos(aditivos);
    console.log(`📦 ${itensAgrupados.length} grupos de itens criados`);
    
    renderizarKPIs(itensAgrupados);
    renderizarListaItens(itensAgrupados);
    renderizarGraficos(itensAgrupados);
    renderizarEncarregados(aditivos);
    
    if (itemSelecionado) {
        const encontrado = itensAgrupados.find(i => i.codigo === itemSelecionado.codigo);
        if (encontrado) {
            renderizarDetalhes(encontrado);
        }
    }
}

// ============================================
// KPIs
// ============================================

function renderizarKPIs(itensAgrupados) {
    console.log('📊 Renderizando KPIs...');
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalItens = itensAgrupados.reduce((sum, item) => sum + item.total, 0);
    const totalObras = new Set();
    const totalEncarregados = new Set();
    
    itensAgrupados.forEach(item => {
        item.obras.forEach(o => totalObras.add(o.obra));
        item.saidas.forEach(s => totalObras.add(s.obra));
        item.itens.forEach(i => {
            if (i.encarregado) totalEncarregados.add(i.encarregado);
        });
    });
    
    const aplicacaoCount = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(aplicacaoCount).forEach(key => {
            aplicacaoCount[key] += item.aplicacaoCount[key] || 0;
        });
    });
    
    container.innerHTML = `
        <div class="kpi-card">
            <div class="kpi-icon">🔧</div>
            <div class="kpi-value">${totalItens}</div>
            <div class="kpi-label">Total de Itens Aditivados</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras.size}</div>
            <div class="kpi-label">Obras com Aditivos</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${totalEncarregados.size}</div>
            <div class="kpi-label">Encarregados Envolvidos</div>
        </div>
        <div class="kpi-card status-aplicado">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${aplicacaoCount.SIM}</div>
            <div class="kpi-label">Aplicados Totalmente</div>
        </div>
        <div class="kpi-card status-nao-aplicado">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${aplicacaoCount.NAO}</div>
            <div class="kpi-label">Não Aplicados</div>
        </div>
        <div class="kpi-card status-parcial">
            <div class="kpi-icon">🔄</div>
            <div class="kpi-value">${aplicacaoCount.PARCIAL}</div>
            <div class="kpi-label">Parcialmente Aplicados</div>
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
    console.log(`🔍 Selecionando item: ${codigo}`);
    const itensAgrupados = agruparItensFisicos(dadosFiltrados);
    const item = itensAgrupados.find(i => i.codigo === codigo);
    
    if (item) {
        itemSelecionado = item;
        renderizarDetalhes(item);
        renderizarListaItens(itensAgrupados);
    }
}

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
            <span class="status-item"><span class="count status-aplicado">${aplicacaoMap.SIM}</span> ✅ Aplicado</span>
            <span class="status-item"><span class="count status-nao-aplicado">${aplicacaoMap.NAO}</span> ❌ Não Aplicado</span>
            <span class="status-item"><span class="count status-parcial">${aplicacaoMap.PARCIAL}</span> 🔄 Parcial</span>
            <span class="status-item"><span class="count status-pendente">${aplicacaoMap.PENDENTE}</span> ⏳ Pendente</span>
        </div>
    `;
    
    if (item.obras.length > 0) {
        html += `<div class="detail-section-title">🏗️ Obras:</div>
        <div class="item-detail-obras">`;
        item.obras.forEach(o => {
            const badge = getAplicacaoBadge(o.aplicado);
            html += `
                <div class="obra-row">
                    <span>${o.obra}</span>
                    <span><span class="qtd">${o.quantidade}</span> ${badge}</span>
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

function renderizarGraficos(itensAgrupados) {
    console.log('📊 Renderizando gráficos...');
    
    const aplicacaoCount = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(aplicacaoCount).forEach(key => {
            aplicacaoCount[key] += item.aplicacaoCount[key] || 0;
        });
    });
    
    const maxQtd = Math.max(...Object.values(aplicacaoCount), 1);
    
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
        const height = value > 0 ? (value / maxQtd) * 150 : 10;
        html += `
            <div class="chart-bar ${classes[key]}" style="height: ${height}px;">
                <span class="bar-value">${value}</span>
                <span class="bar-label">${labels[key]}</span>
            </div>
        `;
    });
    
    const chartContainer = document.getElementById('aplicacaoChart');
    if (chartContainer) chartContainer.innerHTML = html;
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
                    <span class="total">${stats.total}</span>
                    <span class="aplicado">✅ ${stats.aplicado}</span>
                    <span class="nao-aplicado">❌ ${stats.naoAplicado}</span>
                    <span class="parcial">🔄 ${stats.parcial}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarItem = selecionarItem;