// ============================================
// DASHBOARD PENDÊNCIA DE DEVOLUÇÃO
// ============================================

console.log('🚀 dashboards-pendencia-devolucao.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let itemSelecionado = null;
let abaAtual = 'obras';

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
    const buscaTexto = document.getElementById('filterBusca')?.value?.toLowerCase() || '';
    
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
    
    if (buscaTexto) {
        filtrados = filtrados.filter(item => {
            const obra = (item.obra || '').toLowerCase();
            const encarregado = (item.encarregado || '').toLowerCase();
            return obra.includes(buscaTexto) || encarregado.includes(buscaTexto);
        });
        console.log(`🔍 Após filtro de busca: ${filtrados.length} pendências`);
    }
    
    dadosFiltrados = filtrados;
    
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
    document.getElementById('filterBusca').value = '';
    aplicarFiltros();
}

// ============================================
// TROCAR ABA
// ============================================

function trocarAba(aba) {
    abaAtual = aba;
    itemSelecionado = null;
    
    document.querySelectorAll('.btn-aba').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    const listTitle = document.getElementById('listTitle');
    if (listTitle) {
        const titles = {
            'obras': '🏗️ Lista de Obras',
            'encarregados': '👤 Lista de Encarregados'
        };
        listTitle.textContent = titles[aba] || '🏗️ Lista de Obras';
    }
    
    renderizarDashboard(dadosFiltrados);
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
                <p>Selecione uma obra ou encarregado para ver os detalhes</p>
            </div>
        `;
        return;
    }
    
    renderizarKPIs(pendencias);
    renderizarGraficos(pendencias);
    
    if (abaAtual === 'obras') {
        renderizarListaObras(pendencias);
        if (itemSelecionado && itemSelecionado.tipo === 'obra') {
            const encontrado = pendencias.filter(p => p.obra === itemSelecionado.obra);
            if (encontrado.length > 0) {
                renderizarDetalhesObra(encontrado);
            }
        }
    } else {
        renderizarListaEncarregados(pendencias);
        if (itemSelecionado && itemSelecionado.tipo === 'encarregado') {
            const encontrado = pendencias.filter(p => p.encarregado === itemSelecionado.nome);
            if (encontrado.length > 0) {
                renderizarDetalhesEncarregado(encontrado);
            }
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
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total de Pendências</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras com Pendência</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${totalEncarregados}</div>
            <div class="kpi-label">Encarregados</div>
        </div>
        <div class="kpi-card status-pendente">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Pendentes</div>
        </div>
    `;
}

// ============================================
// LISTA DE OBRAS
// ============================================

function renderizarListaObras(pendencias) {
    const container = document.getElementById('itemList');
    if (!container) return;
    
    // Agrupa pendências por obra
    const obrasMap = {};
    pendencias.forEach(p => {
        const obra = p.obra || 'SEM OBRA';
        if (!obrasMap[obra]) {
            obrasMap[obra] = {
                obra: obra,
                count: 0,
                pendencias: []
            };
        }
        obrasMap[obra].count++;
        obrasMap[obra].pendencias.push(p);
    });
    
    const obrasOrdenadas = Object.values(obrasMap).sort((a, b) => a.obra.localeCompare(b.obra));
    
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span style="text-align: right;">Pend.</span>
        </div>
    `;
    
    obrasOrdenadas.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'obra' && itemSelecionado.obra === item.obra;
        const obraFormatada = formatarObraParaExibicao(item.obra);
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${item.obra}')" style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 10px 12px;">
                <span class="item-code">🏗️ ${obraFormatada}</span>
                <span class="item-count">${item.count}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// LISTA DE ENCARREGADOS
// ============================================

function renderizarListaEncarregados(pendencias) {
    const container = document.getElementById('itemList');
    if (!container) return;
    
    // Agrupa pendências por encarregado
    const encarregadosMap = {};
    pendencias.forEach(p => {
        const nome = p.encarregado || 'NÃO INFORMADO';
        if (!encarregadosMap[nome]) {
            encarregadosMap[nome] = {
                nome: nome,
                count: 0,
                pendencias: []
            };
        }
        encarregadosMap[nome].count++;
        encarregadosMap[nome].pendencias.push(p);
    });
    
    const encarregadosOrdenados = Object.values(encarregadosMap)
        .sort((a, b) => b.count - a.count);
    
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Encarregado</span>
            <span style="text-align: right;">Pend.</span>
        </div>
    `;
    
    encarregadosOrdenados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'encarregado' && itemSelecionado.nome === item.nome;
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarEncarregado('${item.nome}')" style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 10px 12px;">
                <span class="item-code">👤 ${item.nome}</span>
                <span class="item-count">${item.count}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR OBRA
// ============================================

function selecionarObra(obra) {
    console.log(`🔍 Selecionando obra: ${obra}`);
    const pendencias = dadosFiltrados.filter(p => p.obra === obra);
    if (pendencias.length > 0) {
        itemSelecionado = { obra: obra, tipo: 'obra' };
        renderizarDetalhesObra(pendencias);
        renderizarListaObras(dadosFiltrados);
    }
}

// ============================================
// SELECIONAR ENCARREGADO
// ============================================

function selecionarEncarregado(nome) {
    console.log(`🔍 Selecionando encarregado: ${nome}`);
    const pendencias = dadosFiltrados.filter(p => p.encarregado === nome);
    if (pendencias.length > 0) {
        itemSelecionado = { nome: nome, tipo: 'encarregado' };
        renderizarDetalhesEncarregado(pendencias);
        renderizarListaEncarregados(dadosFiltrados);
    }
}

// ============================================
// DETALHES DA OBRA (com todas as saídas)
// ============================================

function renderizarDetalhesObra(pendencias) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    const obraFormatada = formatarObraParaExibicao(pendencias[0].obra);
    const total = pendencias.length;
    
    // Agrupa por data de programação (saídas)
    const saidasMap = {};
    pendencias.forEach(p => {
        const data = p.data_programacao || 'SEM DATA';
        if (!saidasMap[data]) {
            saidasMap[data] = {
                data: data,
                pendencias: []
            };
        }
        saidasMap[data].pendencias.push(p);
    });
    
    const saidasOrdenadas = Object.values(saidasMap)
        .sort((a, b) => a.data.localeCompare(b.data));
    
    let html = `
        <div class="detail-title">🏗️ ${obraFormatada}</div>
        <div class="detail-row">
            <span class="label">Total de Pendências:</span>
            <span class="value" style="font-weight: 700; color: #ED8936;">${total}</span>
        </div>
        <div class="detail-row">
            <span class="label">Saídas:</span>
            <span class="value">${saidasOrdenadas.length}</span>
        </div>
        <div class="detail-section-title">📅 Saídas com Pendência:</div>
        <div class="detail-list">
    `;
    
    saidasOrdenadas.forEach(saida => {
        const dataFormatada = formatarData(saida.data);
        const pendenteCount = saida.pendencias.length;
        const encarregado = saida.pendencias[0].encarregado || 'N/I';
        html += `
            <div class="list-row">
                <span>📅 ${dataFormatada} 👤 ${encarregado}</span>
                <span style="font-weight: 600; color: #ED8936;">${pendenteCount} pendências</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    // Detalhes das pendências
    html += `<div class="detail-section-title">📋 Detalhes das Pendências:</div>
    <div class="detail-list">`;
    
    pendencias.forEach(p => {
        const dataFormatada = formatarData(p.data_programacao);
        const motivo = p.motivo_pendencia || 'Sem motivo';
        html += `
            <div class="list-row">
                <span>📅 ${dataFormatada} - ${motivo}</span>
                <span style="font-size: 12px; color: #718096;">${p.solucao_pendencia || 'Sem solução'}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// ============================================
// DETALHES DO ENCARREGADO (com todas as obras e saídas)
// ============================================

function renderizarDetalhesEncarregado(pendencias) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    const nome = pendencias[0].encarregado || 'NÃO INFORMADO';
    const total = pendencias.length;
    
    // Agrupa por obra
    const obrasMap = {};
    pendencias.forEach(p => {
        const obra = p.obra || 'SEM OBRA';
        if (!obrasMap[obra]) {
            obrasMap[obra] = {
                obra: obra,
                pendencias: [],
                saidas: new Set()
            };
        }
        obrasMap[obra].pendencias.push(p);
        obrasMap[obra].saidas.add(p.data_programacao);
    });
    
    const obrasOrdenadas = Object.values(obrasMap)
        .sort((a, b) => a.obra.localeCompare(b.obra));
    
    let html = `
        <div class="detail-title">👤 ${nome}</div>
        <div class="detail-row">
            <span class="label">Total de Pendências:</span>
            <span class="value" style="font-weight: 700; color: #ED8936;">${total}</span>
        </div>
        <div class="detail-row">
            <span class="label">Obras:</span>
            <span class="value">${obrasOrdenadas.length}</span>
        </div>
        <div class="detail-section-title">🏗️ Obras com Pendência:</div>
        <div class="detail-list">
    `;
    
    obrasOrdenadas.forEach(obra => {
        const obraFormatada = formatarObraParaExibicao(obra.obra);
        const count = obra.pendencias.length;
        const saidasCount = obra.saidas.size;
        html += `
            <div class="list-row">
                <span>🏗️ ${obraFormatada}</span>
                <span style="font-weight: 600; color: #ED8936;">${count} pend. • ${saidasCount} saídas</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    // Detalhes das pendências
    html += `<div class="detail-section-title">📋 Detalhes das Pendências:</div>
    <div class="detail-list">`;
    
    pendencias.forEach(p => {
        const obraFormatada = formatarObraParaExibicao(p.obra);
        const dataFormatada = formatarData(p.data_programacao);
        const motivo = p.motivo_pendencia || 'Sem motivo';
        html += `
            <div class="list-row">
                <span>🏗️ ${obraFormatada} - 📅 ${dataFormatada}</span>
                <span style="font-size: 12px; color: #718096;">${motivo}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// ============================================
// GRÁFICOS
// ============================================

function renderizarGraficos(pendencias) {
    console.log('📊 Renderizando gráficos...');
    
    const total = pendencias.length || 1;
    
    // Gráfico 1: Distribuição por Encarregado (Top 10)
    const encarregadosCount = {};
    pendencias.forEach(p => {
        const nome = p.encarregado || 'NÃO INFORMADO';
        if (!encarregadosCount[nome]) encarregadosCount[nome] = 0;
        encarregadosCount[nome]++;
    });
    
    const sortedEncarregados = Object.entries(encarregadosCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const maxEncarregado = sortedEncarregados.length > 0 ? Math.max(...sortedEncarregados.map(s => s[1])) : 1;
    
    let htmlEncarregado = '';
    sortedEncarregados.forEach(([nome, count]) => {
        const percentual = (count / maxEncarregado) * 100;
        const percentualTotal = (count / total) * 100;
        htmlEncarregado += `
            <div class="chart-bar-indicator" style="margin-bottom: 6px;">
                <span class="label" style="min-width: 100px; font-size: 11px;">${nome}</span>
                <div class="bar-track" style="height: 22px;">
                    <div class="bar-fill bar-encarregados" style="width: ${percentual}%;">
                        <span class="value">${count}</span>
                    </div>
                </div>
                <span class="percent" style="font-size: 11px;">${percentualTotal.toFixed(0)}%</span>
            </div>
        `;
    });
    
    if (sortedEncarregados.length === 0) {
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
            <div class="top-item">
                <span class="rank" style="min-width: 25px;">#</span>
                <span class="name" style="min-width: 80px; font-size: 10px;">${obraFormatada}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentual}%;">
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
window.trocarAba = trocarAba;
window.selecionarObra = selecionarObra;
window.selecionarEncarregado = selecionarEncarregado;
window.renderizarDashboard = renderizarDashboard;

console.log('✅ dashboards-pendencia-devolucao.js inicializado!');