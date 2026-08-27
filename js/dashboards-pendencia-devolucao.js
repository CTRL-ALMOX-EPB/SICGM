// ============================================
// DASHBOARD PENDÊNCIA DE DEVOLUÇÃO
// ============================================

console.log('🚀 dashboards-pendencia-devolucao.js carregado!');

// ============================================
// 🔥 GET SESSÃO (NOVA VERSÃO - USANDO authService)
// ============================================

function getSessao() {
    console.log('🔍 Verificando autenticação...');
    
    if (typeof authService === 'undefined' || !authService) {
        console.error('❌ authService não disponível');
        window.location.href = '../login.html';
        return null;
    }

    if (!authService.isLoggedIn()) {
        console.error('❌ Usuário não logado');
        window.location.href = '../login.html';
        return null;
    }

    const user = authService.getUserData();
    if (!user) {
        console.error('❌ Dados do usuário não encontrados');
        window.location.href = '../login.html';
        return null;
    }

    console.log(`✅ Sessão válida: ${user.nome} (${user.perfil})`);
    return {
        nome: user.nome,
        matricula: user.matricula,
        perfil: user.perfil,
        timestamp: Date.now()
    };
}

function redirecionarParaHome() {
    const sessao = getSessao();
    if (sessao) {
        const homeMap = {
            'OPERACIONAL': '../home-operacional.html',
            'GESTAO': '../home-gestao.html',
            'VISUALIZACAO': '../home-visualizacao.html'
        };
        const homePage = homeMap[sessao.perfil] || '../index.html';
        console.log('🏠 Redirecionando para:', homePage);
        window.location.href = homePage;
    } else {
        window.location.href = '../index.html';
    }
}

let dadosCompletos = [];
let dadosFiltrados = [];
let itemSelecionado = null;
let abaAtual = 'obras';
let mesSelecionado = null;

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
        <button class="btn-aba active" data-aba="obras" onclick="trocarAba('obras')">
            🏗️ Obras
        </button>
        <button class="btn-aba" data-aba="encarregados" onclick="trocarAba('encarregados')">
            👤 Encarregados
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
    mesSelecionado = null;
    
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
// FILTROS
// ============================================

function aplicarFiltros() {
    console.log('🔄 Aplicando filtros...');
    const dataInicio = document.getElementById('filterDataInicio')?.value || '';
    const dataFim = document.getElementById('filterDataFim')?.value || '';
    const buscaTexto = document.getElementById('filterBusca')?.value?.toLowerCase() || '';
    const filtroStatus = document.getElementById('filterStatus')?.value || 'todos';
    
    let filtrados = [...dadosCompletos];
    
    if (mesSelecionado) {
        filtrados = filtrados.filter(item => {
            const mes = getMesAno(item.data_programacao);
            return mes === mesSelecionado;
        });
        console.log(`📅 Após filtro de mês: ${filtrados.length} pendências`);
    }
    
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
        console.log(`📅 Após filtro de período: ${filtrados.length} pendências`);
    }
    
    if (filtroStatus !== 'todos') {
        filtrados = filtrados.filter(item => item.status === filtroStatus);
        console.log(`📊 Após filtro de status: ${filtrados.length} pendências`);
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
    document.getElementById('filterStatus').value = 'todos';
    mesSelecionado = null;
    
    document.querySelectorAll('.btn-mes').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#F7FAFC';
        btn.style.color = '#4A5568';
        btn.style.borderColor = '#E2E8F0';
    });
    
    aplicarFiltros();
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
    
    const pendentes = pendencias.filter(p => p.status !== 'FINALIZADO');
    const finalizadas = pendencias.filter(p => p.status === 'FINALIZADO');
    
    const total = pendencias.length;
    const totalPendentes = pendentes.length;
    const totalFinalizadas = finalizadas.length;
    const totalObras = new Set(pendencias.map(p => p.obra)).size;
    const totalEncarregados = new Set(pendencias.map(p => p.encarregado).filter(e => e)).size;
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total de Registros</div>
        </div>
        <div class="kpi-card status-pendente">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value">${totalPendentes}</div>
            <div class="kpi-label">Pendentes</div>
        </div>
        <div class="kpi-card status-baixado">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${totalFinalizadas}</div>
            <div class="kpi-label">Devolvidas</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${totalEncarregados}</div>
            <div class="kpi-label">Encarregados</div>
        </div>
    `;
}

// ============================================
// LISTA DE OBRAS
// ============================================

function renderizarListaObras(pendencias) {
    const container = document.getElementById('itemList');
    if (!container) return;
    
    const obrasMap = {};
    pendencias.forEach(p => {
        const obra = p.obra || 'SEM OBRA';
        if (!obrasMap[obra]) {
            obrasMap[obra] = {
                obra: obra,
                count: 0,
                pendentes: 0,
                finalizadas: 0,
                pendencias: []
            };
        }
        obrasMap[obra].count++;
        obrasMap[obra].pendencias.push(p);
        if (p.status === 'FINALIZADO') {
            obrasMap[obra].finalizadas++;
        } else {
            obrasMap[obra].pendentes++;
        }
    });
    
    const obrasOrdenadas = Object.values(obrasMap).sort((a, b) => a.obra.localeCompare(b.obra));
    
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 1fr 60px 60px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span style="text-align: right;">⏳</span>
            <span style="text-align: right;">✅</span>
        </div>
    `;
    
    obrasOrdenadas.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'obra' && itemSelecionado.obra === item.obra;
        const obraFormatada = formatarObraParaExibicao(item.obra);
        html += `
            <div class="obra-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${item.obra}')" style="display: grid; grid-template-columns: 1fr 60px 60px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="obra-numero">🏗️ ${obraFormatada}</span>
                <span style="text-align: right; color: #ED8936; font-weight: 600;">${item.pendentes}</span>
                <span style="text-align: right; color: #48BB78; font-weight: 600;">${item.finalizadas}</span>
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
    
    const encarregadosMap = {};
    pendencias.forEach(p => {
        const nome = p.encarregado || 'NÃO INFORMADO';
        if (!encarregadosMap[nome]) {
            encarregadosMap[nome] = {
                nome: nome,
                count: 0,
                pendentes: 0,
                finalizadas: 0,
                pendencias: []
            };
        }
        encarregadosMap[nome].count++;
        encarregadosMap[nome].pendencias.push(p);
        if (p.status === 'FINALIZADO') {
            encarregadosMap[nome].finalizadas++;
        } else {
            encarregadosMap[nome].pendentes++;
        }
    });
    
    const encarregadosOrdenados = Object.values(encarregadosMap)
        .sort((a, b) => b.count - a.count);
    
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 1fr 60px 60px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Encarregado</span>
            <span style="text-align: right;">⏳</span>
            <span style="text-align: right;">✅</span>
        </div>
    `;
    
    encarregadosOrdenados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'encarregado' && itemSelecionado.nome === item.nome;
        html += `
            <div class="obra-item ${isActive ? 'active' : ''}" onclick="selecionarEncarregado('${item.nome}')" style="display: grid; grid-template-columns: 1fr 60px 60px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="obra-numero">👤 ${item.nome}</span>
                <span style="text-align: right; color: #ED8936; font-weight: 600;">${item.pendentes}</span>
                <span style="text-align: right; color: #48BB78; font-weight: 600;">${item.finalizadas}</span>
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
// DETALHES DA OBRA
// ============================================

function renderizarDetalhesObra(pendencias) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    const obraFormatada = formatarObraParaExibicao(pendencias[0].obra);
    const total = pendencias.length;
    
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
        const statusIcon = saida.pendencias[0].status === 'FINALIZADO' ? '✅' : '⏳';
        html += `
            <div class="list-row">
                <span>📅 ${dataFormatada} 👤 ${encarregado} ${statusIcon}</span>
                <span style="font-weight: 600; color: ${saida.pendencias[0].status === 'FINALIZADO' ? '#48BB78' : '#ED8936'};">${pendenteCount} pendências</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    html += `<div class="detail-section-title">📋 Detalhes das Pendências:</div>
    <div class="detail-list">`;
    
    pendencias.forEach(p => {
        const dataFormatada = formatarData(p.data_programacao);
        const motivo = p.motivo_pendencia || 'Sem motivo';
        const statusIcon = p.status === 'FINALIZADO' ? '✅' : '⏳';
        html += `
            <div class="list-row">
                <span>📅 ${dataFormatada} ${statusIcon} - ${motivo}</span>
                <span style="font-size: 12px; color: #718096;">${p.solucao_pendencia || 'Sem solução'}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// ============================================
// DETALHES DO ENCARREGADO
// ============================================

function renderizarDetalhesEncarregado(pendencias) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    const nome = pendencias[0].encarregado || 'NÃO INFORMADO';
    const total = pendencias.length;
    
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
        const pendentes = obra.pendencias.filter(p => p.status !== 'FINALIZADO').length;
        const finalizadas = obra.pendencias.filter(p => p.status === 'FINALIZADO').length;
        html += `
            <div class="list-row">
                <span>🏗️ ${obraFormatada}</span>
                <span style="font-weight: 600;">${count} pend. • ${saidasCount} saídas ⏳${pendentes} ✅${finalizadas}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    html += `<div class="detail-section-title">📋 Detalhes das Pendências:</div>
    <div class="detail-list">`;
    
    pendencias.forEach(p => {
        const obraFormatada = formatarObraParaExibicao(p.obra);
        const dataFormatada = formatarData(p.data_programacao);
        const motivo = p.motivo_pendencia || 'Sem motivo';
        const statusIcon = p.status === 'FINALIZADO' ? '✅' : '⏳';
        html += `
            <div class="list-row">
                <span>🏗️ ${obraFormatada} - 📅 ${dataFormatada} ${statusIcon}</span>
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
    
    const pendentes = pendencias.filter(p => p.status !== 'FINALIZADO');
    const finalizadas = pendencias.filter(p => p.status === 'FINALIZADO');
    const total = pendencias.length || 1;
    
    let htmlStatus = `
        <div class="chart-bar-indicator">
            <span class="label">⏳ Pendentes</span>
            <div class="bar-track">
                <div class="bar-fill bar-pendente" style="width: ${(pendentes.length / total) * 100}%;">
                    <span class="value">${pendentes.length}</span>
                </div>
            </div>
            <span class="percent">${((pendentes.length / total) * 100).toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator">
            <span class="label">✅ Devolvidas</span>
            <div class="bar-track">
                <div class="bar-fill bar-baixado" style="width: ${(finalizadas.length / total) * 100}%;">
                    <span class="value">${finalizadas.length}</span>
                </div>
            </div>
            <span class="percent">${((finalizadas.length / total) * 100).toFixed(0)}%</span>
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
    
    const encarregadosCount = {};
    pendencias.forEach(p => {
        const nome = p.encarregado || 'NÃO INFORMADO';
        if (!encarregadosCount[nome]) encarregadosCount[nome] = 0;
        encarregadosCount[nome]++;
    });
    
    const sorted = Object.entries(encarregadosCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const maxCount = sorted.length > 0 ? Math.max(...sorted.map(s => s[1])) : 1;
    
    let htmlEncarregado = '';
    sorted.forEach(([nome, count]) => {
        const percentual = (count / maxCount) * 100;
        htmlEncarregado += `
            <div class="top-sku-item">
                <span class="rank" style="min-width: 25px;">#</span>
                <span class="code" style="min-width: 80px; font-size: 10px;">${nome}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentual}%; background: linear-gradient(90deg, #ED8936, #C05621);">
                        <span class="value">${count}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (sorted.length === 0) {
        htmlEncarregado = `<div class="empty-state-dashboard"><p>Nenhum encarregado encontrado</p></div>`;
    }
    
    document.getElementById('topSkusChart').innerHTML = htmlEncarregado;
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
window.filtrarPorMes = filtrarPorMes;

console.log('✅ dashboards-pendencia-devolucao.js inicializado!');