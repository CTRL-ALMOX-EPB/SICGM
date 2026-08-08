// ============================================
// DASHBOARD FAROL DE OBRAS
// ============================================

console.log('🚀 dashboards-farol-obras.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let obraSelecionada = null;

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
    console.log('📋 DOM carregado, iniciando dashboard Farol de Obras...');
    
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
        dadosCompletos = await buscarFarolObrasCompleto();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} obras carregadas em ${elapsed}ms`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhuma obra encontrada no farol');
            mostrarToast('⚠️ Nenhuma obra encontrada no farol', 'warning');
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
        
        document.getElementById('obrasList').innerHTML = `
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
    const filtroStatus = document.getElementById('filterStatus')?.value || 'todos';
    
    let filtrados = [...dadosCompletos];
    
    // Filtro por período
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
        console.log(`📅 Após filtro de período: ${filtrados.length} obras`);
    }
    
    // Filtro por obra
    if (buscaObra) {
        filtrados = filtrados.filter(item => {
            const obra = (item.obra || '').toLowerCase();
            return obra.includes(buscaObra.toLowerCase());
        });
        console.log(`🏗️ Após filtro de obra: ${filtrados.length} obras`);
    }
    
    // Filtro por status
    if (filtroStatus !== 'todos') {
        filtrados = filtrados.filter(item => item.status === filtroStatus);
        console.log(`📊 Após filtro de status: ${filtrados.length} obras`);
    }
    
    dadosFiltrados = filtrados;
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        totalRegistros.textContent = `${filtrados.length} obras`;
    }
    
    renderizarDashboard(filtrados);
}

function limparFiltros() {
    console.log('🧹 Limpando filtros...');
    document.getElementById('filterDataInicio').value = '';
    document.getElementById('filterDataFim').value = '';
    document.getElementById('filterObra').value = '';
    document.getElementById('filterStatus').value = 'todos';
    aplicarFiltros();
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(obras) {
    if (!obras || obras.length === 0) {
        console.log('📭 Nenhuma obra para renderizar');
        document.getElementById('obrasList').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma obra encontrada</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        document.getElementById('obraDetails').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Selecione uma obra para ver os detalhes</p>
            </div>
        `;
        return;
    }
    
    renderizarKPIs(obras);
    renderizarListaObras(obras);
    renderizarGraficos(obras);
    
    if (obraSelecionada) {
        const encontrada = obras.find(o => o.obra === obraSelecionada.obra);
        if (encontrada) {
            renderizarDetalhesObra(encontrada);
        } else {
            document.getElementById('obraDetails').innerHTML = `
                <div class="empty-state-dashboard">
                    <div class="icon">👆</div>
                    <p>Obra não encontrada nos filtros atuais</p>
                </div>
            `;
        }
    }
}

// ============================================
// KPIs
// ============================================

function renderizarKPIs(obras) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const ativas = obras.filter(o => o.status !== 'FINALIZADO');
    const total = ativas.length;
    
    const canceladas = ativas.filter(o => o.cancelada === 'SIM').length;
    const comAditivo = ativas.filter(o => o.aditivo === 'SIM').length;
    const foraProgramacao = ativas.filter(o => o.obra_programada === 'NÃO').length;
    const devolvidas = ativas.filter(o => o.devolvida === 'SIM').length;
    const comSaida = ativas.filter(o => o.obra_teve_saida === 'SIM').length;
    
    const encarregados = new Set();
    ativas.forEach(o => {
        if (o.encarregado) encarregados.add(o.encarregado);
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total de Obras Ativas</div>
        </div>
        <div class="kpi-card status-cancelada">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${canceladas}</div>
            <div class="kpi-label">Canceladas</div>
        </div>
        <div class="kpi-card status-aditivo">
            <div class="kpi-icon">📝</div>
            <div class="kpi-value">${comAditivo}</div>
            <div class="kpi-label">Com Aditivo</div>
        </div>
        <div class="kpi-card status-programacao">
            <div class="kpi-icon">📅</div>
            <div class="kpi-value">${foraProgramacao}</div>
            <div class="kpi-label">Fora de Programação</div>
        </div>
        <div class="kpi-card status-devolvida">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${devolvidas}</div>
            <div class="kpi-label">Devolvidas</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🚚</div>
            <div class="kpi-value">${comSaida}</div>
            <div class="kpi-label">Com Saída</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${encarregados.size}</div>
            <div class="kpi-label">Encarregados</div>
        </div>
    `;
}

// ============================================
// LISTA DE OBRAS
// ============================================

function renderizarListaObras(obras) {
    const container = document.getElementById('obrasList');
    if (!container) return;
    
    if (!obras || obras.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma obra encontrada</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    // Ordena obras por número
    const obrasOrdenadas = [...obras].sort((a, b) => (a.obra || '').localeCompare(b.obra || ''));
    
    let html = `
        <div style="display: grid; grid-template-columns: 100px 1fr 80px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span>Informações</span>
            <span style="text-align: right;">Status</span>
        </div>
    `;
    
    obrasOrdenadas.forEach(obra => {
        const isActive = obraSelecionada && obraSelecionada.obra === obra.obra;
        const obraFormatada = formatarObraParaExibicao(obra.obra);
        
        // Monta badges de status
        let badges = [];
        if (obra.status === 'FINALIZADO') {
            badges.push('<span class="badge-status-farol finalizado">✅ Finalizado</span>');
        } else {
            badges.push('<span class="badge-status-farol pendente">⏳ Pendente</span>');
            if (obra.cancelada === 'SIM') {
                badges.push('<span class="badge-status-farol cancelada">❌ Cancelada</span>');
            }
            if (obra.aditivo === 'SIM') {
                badges.push('<span class="badge-status-farol com-aditivo">📝 Aditivo</span>');
            }
            if (obra.obra_programada === 'NÃO') {
                badges.push('<span class="badge-status-farol fora-programacao">📅 Fora Prog.</span>');
            }
            if (obra.devolvida === 'SIM') {
                badges.push('<span class="badge-status-farol devolvida">📦 Devolvida</span>');
            }
            if (obra.obra_teve_saida === 'SIM') {
                badges.push('<span class="badge-status-farol saida">🚚 Saída</span>');
            }
        }
        
        if (badges.length === 0) {
            badges.push('<span class="badge-status-farol" style="background: #E2E8F0; color: #4A5568;">✅ Normal</span>');
        }
        
        const infoText = obra.setor ? `📍 ${obra.setor}` : '';
        const encarregadoText = obra.encarregado ? `👤 ${obra.encarregado}` : '';
        const info = [infoText, encarregadoText].filter(Boolean).join(' • ');
        
        html += `
            <div class="obra-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${obra.obra}')" style="display: grid; grid-template-columns: 100px 1fr 80px; gap: 8px; padding: 10px 12px;">
                <span class="obra-numero">🏗️ ${obraFormatada}</span>
                <span class="obra-info">${info}</span>
                <span class="obra-badge">${badges.join(' ')}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR OBRA
// ============================================

function selecionarObra(obraNumero) {
    console.log(`🔍 Selecionando obra: ${obraNumero}`);
    const obra = dadosFiltrados.find(o => o.obra === obraNumero);
    
    if (obra) {
        obraSelecionada = { obra: obra.obra };
        renderizarDetalhesObra(obra);
        renderizarListaObras(dadosFiltrados);
    }
}

// ============================================
// DETALHES DA OBRA
// ============================================

function renderizarDetalhesObra(obra) {
    const container = document.getElementById('obraDetails');
    if (!container) return;
    
    const obraFormatada = formatarObraParaExibicao(obra.obra);
    
    // Status da obra
    let statusText = obra.status === 'FINALIZADO' ? '✅ Finalizado' : '⏳ Pendente';
    let statusColor = obra.status === 'FINALIZADO' ? '#48BB78' : '#ED8936';
    
    // Indicadores
    const indicadores = [];
    if (obra.cancelada === 'SIM') indicadores.push('❌ Cancelada');
    if (obra.aditivo === 'SIM') indicadores.push('📝 Com Aditivo');
    if (obra.obra_programada === 'NÃO') indicadores.push('📅 Fora de Programação');
    if (obra.devolvida === 'SIM') indicadores.push('📦 Devolvida');
    if (obra.obra_teve_saida === 'SIM') indicadores.push('🚚 Teve Saída');
    
    let html = `
        <div class="detail-title">🏗️ ${obraFormatada}</div>
        <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value" style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
        </div>
        <div class="detail-row">
            <span class="label">Setor:</span>
            <span class="value">${obra.setor || 'Não informado'}</span>
        </div>
        <div class="detail-row">
            <span class="label">Encarregado:</span>
            <span class="value">${obra.encarregado || 'Não informado'}</span>
        </div>
        <div class="detail-row">
            <span class="label">Data de Programação:</span>
            <span class="value">${formatarData(obra.data_programacao)}</span>
        </div>
        <div class="detail-row">
            <span class="label">Data de Recebimento:</span>
            <span class="value">${formatarData(obra.data_recebimento)}</span>
        </div>
    `;
    
    // Indicadores
    if (indicadores.length > 0) {
        html += `
            <div class="detail-row" style="grid-column: 1 / -1; border-bottom: none;">
                <span class="label">Indicadores:</span>
                <span class="value">${indicadores.join(' • ')}</span>
            </div>
        `;
    }
    
    // Separador
    if (obra.separador || obra.data_separacao) {
        html += `
            <div class="detail-section-title">📦 Separação</div>
            <div class="detail-row">
                <span class="label">Separador:</span>
                <span class="value">${obra.separador || 'Não informado'}</span>
            </div>
            <div class="detail-row">
                <span class="label">Data de Separação:</span>
                <span class="value">${formatarData(obra.data_separacao)}</span>
            </div>
        `;
    }
    
    // Saída
    if (obra.obra_teve_saida === 'SIM' && obra.data_saida) {
        html += `
            <div class="detail-section-title">🚚 Saída</div>
            <div class="detail-row">
                <span class="label">Data de Saída:</span>
                <span class="value">${formatarData(obra.data_saida)}</span>
            </div>
        `;
    }
    
    // Observação
    if (obra.observacao) {
        html += `
            <div class="detail-section-title">📝 Observação</div>
            <div class="detail-row" style="grid-column: 1 / -1;">
                <span class="value" style="font-size: 13px; color: #4A5568;">${obra.observacao}</span>
            </div>
        `;
    }
    
    // Itens da obra (se houver)
    if (obra.itens && obra.itens.length > 0) {
        html += `
            <div class="detail-section-title">📦 Itens da Obra (${obra.itens.length})</div>
            <div class="obra-detail-itens">
        `;
        
        // Ordena itens por código
        const itensOrdenados = [...obra.itens].sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
        
        itensOrdenados.forEach(item => {
            const qtdFormatada = Number.isInteger(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2);
            html += `
                <div class="item-row">
                    <span><strong>${item.codigo || 'SEM CÓDIGO'}</strong> - ${item.descricao || 'Sem descrição'}</span>
                    <span class="qtd">${qtdFormatada} ${item.unidade || 'UN'}</span>
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

// ============================================
// GRÁFICOS
// ============================================

function renderizarGraficos(obras) {
    console.log('📊 Renderizando gráficos...');
    
    const ativas = obras.filter(o => o.status !== 'FINALIZADO');
    const total = ativas.length || 1;
    
    // Gráfico 1: Distribuição de Obras
    const categorias = {
        canceladas: { count: ativas.filter(o => o.cancelada === 'SIM').length, label: 'Canceladas', class: 'bar-cancelada' },
        comAditivo: { count: ativas.filter(o => o.aditivo === 'SIM').length, label: 'Com Aditivo', class: 'bar-aditivo' },
        foraProgramacao: { count: ativas.filter(o => o.obra_programada === 'NÃO').length, label: 'Fora Programação', class: 'bar-programacao' },
        devolvidas: { count: ativas.filter(o => o.devolvida === 'SIM').length, label: 'Devolvidas', class: 'bar-devolvida' },
        comSaida: { count: ativas.filter(o => o.obra_teve_saida === 'SIM').length, label: 'Com Saída', class: 'bar-saida' }
    };
    
    // Obras normais (sem nenhum indicador)
    const normais = ativas.filter(o => 
        o.cancelada !== 'SIM' && 
        o.aditivo !== 'SIM' && 
        o.obra_programada !== 'NÃO' && 
        o.devolvida !== 'SIM' && 
        o.obra_teve_saida !== 'SIM'
    ).length;
    
    let htmlStatus = '';
    
    Object.keys(categorias).forEach(key => {
        const cat = categorias[key];
        const percentual = (cat.count / total) * 100;
        htmlStatus += `
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
    
    // Obras normais
    const percentualNormal = (normais / total) * 100;
    htmlStatus += `
        <div class="chart-bar-indicator">
            <span class="label">Normais</span>
            <div class="bar-track">
                <div class="bar-fill bar-normal" style="width: ${percentualNormal}%;">
                    <span class="value">${normais}</span>
                </div>
            </div>
            <span class="percent">${percentualNormal.toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #E2E8F0;">
            <span class="label" style="font-weight: 700;">Total</span>
            <div class="bar-track">
                <div class="bar-fill bar-total" style="width: 100%;">
                    <span class="value">${total}</span>
                </div>
            </div>
            <span class="percent" style="font-weight: 700;">100%</span>
        </div>
    `;
    
    document.getElementById('statusChart').innerHTML = htmlStatus;
    
    // Gráfico 2: Obras por Encarregado
    const encarregados = {};
    ativas.forEach(obra => {
        const nome = obra.encarregado || 'NÃO INFORMADO';
        if (!encarregados[nome]) encarregados[nome] = 0;
        encarregados[nome]++;
    });
    
    const sorted = Object.entries(encarregados)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
    
    const maxCount = sorted.length > 0 ? Math.max(...sorted.map(s => s[1])) : 1;
    
    let htmlEncarregado = '';
    sorted.forEach(([nome, count]) => {
        const percentual = (count / maxCount) * 100;
        htmlEncarregado += `
            <div class="encarregado-item-chart">
                <span class="name">${nome}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentual}%;">
                        <span class="value">${count}</span>
                    </div>
                </div>
                <span class="count">${count}</span>
            </div>
        `;
    });
    
    if (sorted.length === 0) {
        htmlEncarregado = `<div class="empty-state-dashboard"><p>Nenhum encarregado encontrado</p></div>`;
    }
    
    document.getElementById('encarregadoChart').innerHTML = htmlEncarregado;
}

// ============================================
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarObra = selecionarObra;
window.renderizarDashboard = renderizarDashboard;

console.log('✅ dashboards-farol-obras.js inicializado!');