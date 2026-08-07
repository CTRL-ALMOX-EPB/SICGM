// ============================================
// DASHBOARD PENDÊNCIA DE DEVOLUÇÃO (OTIMIZADO)
// ============================================

console.log('🚀 dashboards-pendencia-devolucao.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let encarregadoSelecionado = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 DOM carregado, iniciando dashboard...');
    
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
    
    // Atualiza informações do usuário
    document.getElementById('userName').textContent = sessao.nome || 'Usuário';
    document.getElementById('userMatricula').textContent = `Matrícula: ${sessao.matricula || '---'}`;
    document.getElementById('userPerfil').textContent = sessao.perfil || 'GESTÃO';
    
    try {
        console.log('📡 Iniciando busca de dados...');
        
        // Usa o cache para buscar todos os dados
        const startTime = Date.now();
        dadosCompletos = await buscarPendenciasDevolucao();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} pendências carregadas em ${elapsed}ms`);
        
        renderizarDashboard(dadosCompletos);
        
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        console.log('✅ Dashboard renderizado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarToast(`❌ Erro ao carregar dados: ${error.message}`, 'error');
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
    }
});

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(pendencias) {
    const pendentes = pendencias.filter(p => p.status !== 'FINALIZADO');
    dadosFiltrados = pendentes;
    
    renderizarKPIs(pendentes);
    renderizarEncarregados(pendentes);
    renderizarListaPendencias(pendentes);
}

// ============================================
// KPIs
// ============================================

function renderizarKPIs(pendencias) {
    const totalPendentes = pendencias.length;
    const obrasComPendencia = new Set(pendencias.map(p => p.obra)).size;
    const encarregadosComPendencia = new Set(pendencias.map(p => p.encarregado).filter(e => e)).size;
    
    document.getElementById('kpiGrid').innerHTML = `
        <div class="kpi-card pendente">
            <div class="kpi-icon">🔴</div>
            <div class="kpi-value">${totalPendentes}</div>
            <div class="kpi-label">Total de Pendências</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${obrasComPendencia}</div>
            <div class="kpi-label">Obras com Pendência</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${encarregadosComPendencia}</div>
            <div class="kpi-label">Encarregados com Pendência</div>
        </div>
    `;
}

// ============================================
// ENCARREGADOS (FILTRO)
// ============================================

function renderizarEncarregados(pendencias) {
    const container = document.getElementById('encarregadoFilterList');
    if (!container) return;
    
    const encarregados = {};
    
    pendencias.forEach(p => {
        const nome = p.encarregado || 'NÃO INFORMADO';
        if (!encarregados[nome]) {
            encarregados[nome] = 0;
        }
        encarregados[nome]++;
    });
    
    const sorted = Object.entries(encarregados)
        .sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">✅</div>
                <p>Nenhuma pendência encontrada</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    sorted.forEach(([nome, count]) => {
        const isActive = encarregadoSelecionado === nome;
        html += `
            <div class="encarregado-filter-item ${isActive ? 'active' : ''}" onclick="filtrarPorEncarregado('${nome}')">
                <span class="name">${nome}</span>
                <span class="count pendente">${count}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// FILTRO POR ENCARREGADO
// ============================================

function filtrarPorEncarregado(nome) {
    if (encarregadoSelecionado === nome) {
        encarregadoSelecionado = null;
    } else {
        encarregadoSelecionado = nome;
    }
    
    const pendentes = dadosCompletos.filter(p => p.status !== 'FINALIZADO');
    let filtrados = pendentes;
    
    if (encarregadoSelecionado) {
        filtrados = filtrados.filter(p => (p.encarregado || 'NÃO INFORMADO') === encarregadoSelecionado);
    }
    
    dadosFiltrados = filtrados;
    
    renderizarEncarregados(pendentes);
    renderizarListaPendencias(filtrados);
    renderizarKPIs(filtrados);
}

function limparFiltroEncarregado() {
    encarregadoSelecionado = null;
    const pendentes = dadosCompletos.filter(p => p.status !== 'FINALIZADO');
    dadosFiltrados = pendentes;
    
    renderizarEncarregados(pendentes);
    renderizarListaPendencias(pendentes);
    renderizarKPIs(pendentes);
}

// ============================================
// LISTA DE PENDÊNCIAS
// ============================================

function renderizarListaPendencias(pendencias) {
    const container = document.getElementById('pendenciaList');
    const countEl = document.getElementById('pendenciaCount');
    
    if (!container) return;
    
    if (countEl) countEl.textContent = `(${pendencias.length})`;
    
    if (pendencias.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">✅</div>
                <p>Nenhuma pendência encontrada</p>
                <p style="font-size: 12px; color: #a0aec0;">Todas as devoluções estão em dia!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    pendencias.forEach(p => {
        html += `
            <div class="pendencia-item">
                <div class="obra-info">
                    <span class="obra">${p.obra || 'SEM OBRA'}</span>
                    <span class="encarregado">👤 ${p.encarregado || 'NÃO INFORMADO'}</span>
                    <span class="detalhes">📅 ${formatarData(p.data_programacao)} | ${p.motivo_pendencia || 'Sem motivo'}</span>
                </div>
                <span class="status-pendente">Pendente</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// EXPORTAR
// ============================================

window.filtrarPorEncarregado = filtrarPorEncarregado;
window.limparFiltroEncarregado = limparFiltroEncarregado;

console.log('✅ dashboards-pendencia-devolucao.js inicializado!');