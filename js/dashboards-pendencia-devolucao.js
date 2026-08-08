// ============================================
// DASHBOARD PENDÊNCIA DE BAIXA
// ============================================

console.log('🚀 dashboards-pendencia-baixa.js carregado!');

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
    console.log('📋 DOM carregado, iniciando dashboard Pendência de Baixa...');
    
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
        dadosCompletos = await buscarPendenciasBaixa();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} pendências carregadas em ${elapsed}ms`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhuma pendência de baixa encontrada');
            mostrarToast('⚠️ Nenhuma pendência de baixa encontrada', 'warning');
        }
        
        // Cria o container de KPIs com loading
        const kpiGrid = document.getElementById('kpiGrid');
        if (kpiGrid) {
            kpiGrid.innerHTML = `
                <div class="loading-dashboard" style="min-height: 60px; grid-column: 1 / -1;">
                    <div class="spinner"></div>
                </div>
            `;
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
    const filtroBaixado = document.getElementById('filterBaixado')?.value || 'todos';
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
        console.log(`📅 Após filtro de período: ${filtrados.length} pendências`);
    }
    
    if (filtroBaixado !== 'todos') {
        filtrados = filtrados.map(pendencia => ({
            ...pendencia,
            itens: (pendencia.itens || []).filter(item => 
                (item.baixado || 'NÃO') === filtroBaixado
            )
        })).filter(pendencia => pendencia.itens && pendencia.itens.length > 0);
        console.log(`📊 Após filtro de baixado: ${filtrados.length} pendências`);
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
        console.log(`🔍 Após filtro de busca: ${filtrados.length} pendências`);
    }
    
    if (buscaObra) {
        filtrados = filtrados.filter(pendencia => {
            const obra = (pendencia.obra || '').toLowerCase();
            return obra.includes(buscaObra.toLowerCase());
        });
        console.log(`🏗️ Após filtro de obra: ${filtrados.length} pendências`);
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
    document.getElementById('filterBaixado').value = 'todos';
    document.getElementById('filterBusca').value = '';
    document.getElementById('filterObra').value = '';
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
        
        if (tipo === 'baixado') {
            dadosExibidos = dadosFiltrados.filter(p => {
                const itensBaixados = (p.itens || []).filter(i => i.baixado === valor);
                return itensBaixados.length > 0;
            });
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
// AGRUPAR ITENS POR CÓDIGO
// ============================================

function agruparItensPorCodigo(pendencias) {
    console.log(`📦 Agrupando itens de ${pendencias.length} pendências...`);
    const grupos = {};
    
    pendencias.forEach(pendencia => {
        const itens = pendencia.itens || [];
        itens.forEach(item => {
            const codigo = item.codigo || 'SEM_CODIGO';
            const descricao = item.descricao || 'Sem descrição';
            const unidade = item.unidade || 'UN';
            const quantidade = parseFloat(item.quantidade) || 0;
            const baixado = item.baixado || 'NÃO';
            
            if (!grupos[codigo]) {
                grupos[codigo] = {
                    codigo: codigo,
                    descricao: descricao,
                    unidade: unidade,
                    total: 0,
                    itens: [],
                    obras: [],
                    baixados: 0,
                    naoBaixados: 0,
                    pendentes: 0,
                    obrasSet: new Set()
                };
            }
            
            if (!grupos[codigo].descricao || grupos[codigo].descricao === 'Sem descrição') {
                grupos[codigo].descricao = descricao;
            }
            
            grupos[codigo].total += 1; // COUNT de ocorrências
            grupos[codigo].itens.push(item);
            
            const obra = pendencia.obra || 'SEM OBRA';
            grupos[codigo].obrasSet.add(obra);
            
            if (baixado === 'SIM') {
                grupos[codigo].baixados += 1;
            } else {
                grupos[codigo].naoBaixados += 1;
                grupos[codigo].pendentes += 1;
            }
        });
    });
    
    const resultado = Object.values(grupos).sort((a, b) => b.total - a.total);
    console.log(`✅ ${resultado.length} grupos de itens criados`);
    return resultado;
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
        
        // Atualiza gráficos vazios
        document.getElementById('statusChart').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📊</div>
                <p>Sem dados para exibir</p>
            </div>
        `;
        document.getElementById('topSkusChart').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📊</div>
                <p>Sem dados para exibir</p>
            </div>
        `;
        return;
    }
    
    const itensAgrupados = agruparItensPorCodigo(pendencias);
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
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalOcorrencias = itensAgrupados.reduce((sum, item) => sum + item.total, 0);
    const totalSkus = itensAgrupados.length;
    const totalBaixados = itensAgrupados.reduce((sum, item) => sum + item.baixados, 0);
    const totalNaoBaixados = itensAgrupados.reduce((sum, item) => sum + item.naoBaixados, 0);
    
    const isFilterActive = (tipo, valor) => {
        return filtroAtivo && filtroAtivo.tipo === tipo && filtroAtivo.valor === valor;
    };
    
    container.innerHTML = `
        <div class="kpi-card status-total ${isFilterActive('total', 'TOTAL') ? 'active' : ''}" onclick="aplicarFiltroCard('total', 'TOTAL')" style="cursor: pointer; ${isFilterActive('total', 'TOTAL') ? 'border: 2px solid #4299E1; background: #EBF8FF;' : ''}">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalOcorrencias}</div>
            <div class="kpi-label">Ocorrências</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalSkus}</div>
            <div class="kpi-label">SKUs com Pendência</div>
        </div>
        <div class="kpi-card status-baixado ${isFilterActive('baixado', 'SIM') ? 'active' : ''}" onclick="aplicarFiltroCard('baixado', 'SIM')" style="cursor: pointer; ${isFilterActive('baixado', 'SIM') ? 'border: 2px solid #48BB78; background: #F0FFF4;' : ''}">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${totalBaixados}</div>
            <div class="kpi-label">Baixados</div>
        </div>
        <div class="kpi-card status-pendente ${isFilterActive('baixado', 'NÃO') ? 'active' : ''}" onclick="aplicarFiltroCard('baixado', 'NÃO')" style="cursor: pointer; ${isFilterActive('baixado', 'NÃO') ? 'border: 2px solid #ED8936; background: #FFFAF0;' : ''}">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value">${totalNaoBaixados}</div>
            <div class="kpi-label">Não Baixados</div>
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
    
    let html = `
        <div style="display: grid; grid-template-columns: 80px 1fr 70px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Código</span>
            <span>Descrição</span>
            <span style="text-align: right;">Ocorr.</span>
        </div>
    `;
    
    itensAgrupados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.codigo === item.codigo;
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarItem('${item.codigo}')" style="display: grid; grid-template-columns: 80px 1fr 70px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="item-code">${item.codigo}</span>
                <span class="item-desc">${item.descricao}</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${item.total}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR ITEM
// ============================================

function selecionarItem(codigo) {
    console.log(`🔍 Selecionando item: ${codigo}`);
    const itensAgrupados = agruparItensPorCodigo(dadosExibidos);
    const item = itensAgrupados.find(i => i.codigo === codigo);
    
    if (item) {
        itemSelecionado = { codigo: item.codigo };
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
    
    const obrasMap = {};
    item.itens.forEach(i => {
        const obra = i.obra || 'SEM OBRA';
        if (!obrasMap[obra]) {
            obrasMap[obra] = {
                obra: obra,
                total: 0,
                baixados: 0,
                naoBaixados: 0,
                itens: []
            };
        }
        obrasMap[obra].total += 1;
        obrasMap[obra].itens.push(i);
        if (i.baixado === 'SIM') {
            obrasMap[obra].baixados += 1;
        } else {
            obrasMap[obra].naoBaixados += 1;
        }
    });
    
    const obrasOrdenadas = Object.values(obrasMap).sort((a, b) => a.obra.localeCompare(b.obra));
    
    let html = `
        <div class="detail-title">📦 ${item.codigo} - ${item.descricao}</div>
        <div class="detail-row">
            <span class="label">Ocorrências:</span>
            <span class="value">${item.total}</span>
        </div>
        <div class="detail-row">
            <span class="label">Obras:</span>
            <span class="value">${obrasOrdenadas.length}</span>
        </div>
        <div class="detail-status-count">
            <span class="status-item"><span class="count status-baixado">${item.baixados}</span> ✅ Baixados</span>
            <span class="status-item"><span class="count status-pendente">${item.naoBaixados}</span> ⏳ Não Baixados</span>
        </div>
        <div class="detail-section-title">🏗️ Obras com Pendência:</div>
        <div class="item-detail-obras">
    `;
    
    obrasOrdenadas.forEach(obra => {
        const obraFormatada = formatarObraParaExibicao(obra.obra);
        const statusIcon = obra.naoBaixados > 0 ? '⏳' : '✅';
        html += `
            <div class="obra-row">
                <span>🏗️ ${obraFormatada} ${statusIcon}</span>
                <span>${obra.total} ocorrências (${obra.baixados} ✅ / ${obra.naoBaixados} ⏳)</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    html += `<div class="detail-section-title">📋 Detalhes por Obra:</div>
    <div class="item-detail-obras">`;
    
    obrasOrdenadas.forEach(obra => {
        const obraFormatada = formatarObraParaExibicao(obra.obra);
        html += `
            <div style="padding: 4px 0; border-bottom: 1px solid #EDF2F7;">
                <div style="font-weight: 600; color: #2D3748; font-size: 13px;">🏗️ ${obraFormatada}</div>
        `;
        
        obra.itens.forEach(i => {
            const qtdFormatada = Number.isInteger(i.quantidade) ? i.quantidade : i.quantidade.toFixed(2);
            const badge = i.baixado === 'SIM' 
                ? '<span class="badge-baixa baixado">✅ Baixado</span>' 
                : '<span class="badge-baixa nao-baixado">⏳ Pendente</span>';
            html += `
                <div style="display: flex; justify-content: space-between; padding: 2px 8px; font-size: 12px; color: #4A5568;">
                    <span>${i.codigo} - ${i.descricao || 'Sem descrição'}</span>
                    <span>${qtdFormatada} ${i.unidade || 'UN'} ${badge}</span>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// ============================================
// GRÁFICOS
// ============================================

function renderizarGraficos(itensAgrupados) {
    console.log('📊 Renderizando gráficos...');
    
    const totalBaixados = itensAgrupados.reduce((sum, item) => sum + item.baixados, 0);
    const totalNaoBaixados = itensAgrupados.reduce((sum, item) => sum + item.naoBaixados, 0);
    const totalGeral = totalBaixados + totalNaoBaixados || 1;
    
    const categorias = [
        { key: 'baixados', count: totalBaixados, label: 'Baixados', class: 'bar-baixado' },
        { key: 'naoBaixados', count: totalNaoBaixados, label: 'Não Baixados', class: 'bar-nao-baixado' }
    ];
    
    let html = '';
    categorias.forEach(cat => {
        const percentual = (cat.count / totalGeral) * 100;
        html += `
            <div class="chart-bar-indicator">
                <span class="label">${cat.label}</span>
                <div class="bar-track">
                    <div class="bar-fill ${cat.class}" style="width: ${percentual}%;">
                        <span class="value">${cat.count}</span>
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
                    <span class="value">${totalGeral}</span>
                </div>
            </div>
            <span class="percent" style="font-weight: 700;">100%</span>
        </div>
    `;
    
    document.getElementById('statusChart').innerHTML = html;
    
    const topSkus = [...itensAgrupados]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    
    const maxTotal = topSkus.length > 0 ? Math.max(...topSkus.map(s => s.total)) : 1;
    
    let htmlTop = '';
    topSkus.forEach((item, index) => {
        const percentual = (item.total / maxTotal) * 100;
        htmlTop += `
            <div class="top-sku-item">
                <span class="rank">#${index + 1}</span>
                <span class="code">${item.codigo}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentual}%;">
                        <span class="value">${item.total}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (topSkus.length === 0) {
        htmlTop = `<div class="empty-state-dashboard"><p>Nenhum SKU encontrado</p></div>`;
    }
    
    document.getElementById('topSkusChart').innerHTML = htmlTop;
}

// ============================================
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarItem = selecionarItem;
window.renderizarDashboard = renderizarDashboard;
window.aplicarFiltroCard = aplicarFiltroCard;

console.log('✅ dashboards-pendencia-baixa.js inicializado!');