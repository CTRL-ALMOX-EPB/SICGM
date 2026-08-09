// ============================================
// DASHBOARD FAROL DE OBRAS
// ============================================

console.log('🚀 dashboards-farol-obras.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let dadosExibidos = [];
let obraSelecionada = null;
let saidaSelecionada = null;
let abaAtual = 'obras';
let filtroAtivo = null;
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
        <button class="btn-aba" data-aba="separadores" onclick="trocarAba('separadores')">
            📦 Separadores
        </button>
    `;
    
    mainContainer.parentNode.insertBefore(abaContainer, mainContainer);
}

// ============================================
// TROCAR ABA
// ============================================

function trocarAba(aba) {
    abaAtual = aba;
    filtroAtivo = null;
    obraSelecionada = null;
    saidaSelecionada = null;
    mesSelecionado = null;
    
    document.querySelectorAll('.btn-aba').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    const listTitle = document.getElementById('listTitle');
    if (listTitle) {
        const titles = {
            'obras': '🏗️ Lista de Obras',
            'separadores': '📦 Separadores'
        };
        listTitle.textContent = titles[aba] || '🏗️ Lista de Obras';
    }
    
    const chartTitle = document.getElementById('chartSecondTitle');
    if (chartTitle) {
        const titles = {
            'obras': '📦 Top Separadores',
            'separadores': '📦 Top Separadores'
        };
        chartTitle.textContent = titles[aba] || '📦 Top Separadores';
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
    const buscaObra = document.getElementById('filterObra')?.value || '';
    const filtroStatus = document.getElementById('filterStatus')?.value || 'todos';
    
    let filtrados = [...dadosCompletos];
    
    if (mesSelecionado) {
        filtrados = filtrados.filter(item => {
            const mes = getMesAno(item.data_programacao);
            return mes === mesSelecionado;
        });
        console.log(`📅 Após filtro de mês: ${filtrados.length} obras`);
    }
    
    if (dataInicio || dataFim) {
        filtrados = filtrados.filter(item => {
            const dataItem = new Date(item.data_programacao);
            if (dataInicio && dataItem < new Date(dataInicio)) return false;
            if (dataFim && dataItem > new Date(dataFim)) return false;
            return true;
        });
        console.log(`📅 Após filtro de período: ${filtrados.length} obras`);
    }
    
    if (buscaObra) {
        filtrados = filtrados.filter(item => {
            const obra = (item.obra || '').toLowerCase();
            return obra.includes(buscaObra.toLowerCase());
        });
        console.log(`🏗️ Após filtro de obra: ${filtrados.length} obras`);
    }
    
    if (filtroStatus !== 'todos') {
        filtrados = filtrados.filter(item => item.status === filtroStatus);
        console.log(`📊 Após filtro de status: ${filtrados.length} obras`);
    }
    
    dadosFiltrados = filtrados;
    dadosExibidos = filtrados;
    filtroAtivo = null;
    obraSelecionada = null;
    saidaSelecionada = null;
    
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
    filtroAtivo = null;
    obraSelecionada = null;
    saidaSelecionada = null;
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
// APLICAR FILTRO DO CARD
// ============================================

function aplicarFiltroCard(tipo, valor) {
    console.log(`🔍 Aplicando filtro do card: ${tipo} = ${valor}`);
    
    if (filtroAtivo && filtroAtivo.tipo === tipo && filtroAtivo.valor === valor) {
        filtroAtivo = null;
        dadosExibidos = [...dadosFiltrados];
    } else {
        filtroAtivo = { tipo, valor };
        
        if (tipo === 'status') {
            dadosExibidos = dadosFiltrados.filter(o => o.status === valor);
        } else if (tipo === 'cancelada') {
            dadosExibidos = dadosFiltrados.filter(o => o.cancelada === valor);
        } else if (tipo === 'aditivo') {
            dadosExibidos = dadosFiltrados.filter(o => o.aditivo === valor);
        } else if (tipo === 'programacao') {
            dadosExibidos = dadosFiltrados.filter(o => o.obra_programada === valor);
        } else if (tipo === 'devolvida') {
            dadosExibidos = dadosFiltrados.filter(o => o.devolvida === valor);
        } else if (tipo === 'saida') {
            dadosExibidos = dadosFiltrados.filter(o => o.obra_teve_saida === valor);
        }
    }
    
    obraSelecionada = null;
    saidaSelecionada = null;
    
    const totalRegistros = document.getElementById('totalRegistros');
    if (totalRegistros) {
        const textoFiltro = filtroAtivo ? ` (filtrado: ${filtroAtivo.tipo})` : '';
        totalRegistros.textContent = `${dadosExibidos.length} obras${textoFiltro}`;
    }
    
    if (abaAtual === 'obras') {
        renderizarListaObras(dadosExibidos);
        document.getElementById('obraDetails').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Selecione uma obra para ver os detalhes</p>
            </div>
        `;
    } else if (abaAtual === 'separadores') {
        const separadores = agruparPorSeparador(dadosExibidos);
        renderizarListaSeparadores(separadores);
        document.getElementById('obraDetails').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Selecione um separador para ver os detalhes</p>
            </div>
        `;
    }
}

// ============================================
// AGRUPAR POR SEPARADOR
// ============================================

function agruparPorSeparador(obras) {
    console.log('📦 Agrupando por separador...');
    const separadores = {};
    
    obras.forEach(obra => {
        const nome = obra.separador || 'NÃO INFORMADO';
        if (!separadores[nome]) {
            separadores[nome] = {
                nome: nome,
                obras: [],
                totalObras: 0,
                finalizadas: 0,
                pendentes: 0,
                comAditivo: 0,
                canceladas: 0,
                devolvidas: 0,
                foraProgramacao: 0,
                comSaida: 0
            };
        }
        
        separadores[nome].obras.push(obra);
        separadores[nome].totalObras++;
        
        if (obra.status === 'FINALIZADO') {
            separadores[nome].finalizadas++;
        } else {
            separadores[nome].pendentes++;
        }
        
        if (obra.aditivo === 'SIM') separadores[nome].comAditivo++;
        if (obra.cancelada === 'SIM') separadores[nome].canceladas++;
        if (obra.devolvida === 'SIM') separadores[nome].devolvidas++;
        if (obra.obra_programada === 'NÃO') separadores[nome].foraProgramacao++;
        if (obra.obra_teve_saida === 'SIM') separadores[nome].comSaida++;
    });
    
    const resultado = Object.values(separadores).sort((a, b) => b.totalObras - a.totalObras);
    console.log(`✅ ${resultado.length} separadores agrupados`);
    return resultado;
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(obras) {
    dadosExibidos = [...obras];
    
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
                <p>Selecione uma obra ou separador para ver os detalhes</p>
            </div>
        `;
        return;
    }
    
    if (abaAtual === 'obras') {
        const ativas = obras.filter(o => o.status !== 'FINALIZADO');
        renderizarKPIsObras(ativas, obras);
        renderizarListaObras(obras);
        renderizarGraficosObras(ativas);
        
        if (obraSelecionada && obraSelecionada.tipo === 'obra') {
            const obra = obras.find(o => o.obra === obraSelecionada.obra);
            if (obra) {
                renderizarDetalhesObra(obra);
            }
        }
    } else if (abaAtual === 'separadores') {
        const separadores = agruparPorSeparador(obras);
        renderizarKPIsSeparadores(separadores);
        renderizarListaSeparadores(separadores);
        renderizarGraficosSeparadores(separadores);
        
        if (obraSelecionada && obraSelecionada.tipo === 'separador') {
            const encontrado = separadores.find(s => s.nome === obraSelecionada.nome);
            if (encontrado) {
                renderizarDetalhesSeparador(encontrado);
            }
        }
    }
}

// ============================================
// KPIs - OBRAS
// ============================================

function renderizarKPIsObras(obras, todasObras) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const total = obras.length;
    const canceladas = obras.filter(o => o.cancelada === 'SIM').length;
    const comAditivo = obras.filter(o => o.aditivo === 'SIM').length;
    const foraProgramacao = obras.filter(o => o.obra_programada === 'NÃO').length;
    const devolvidas = obras.filter(o => o.devolvida === 'SIM').length;
    const comSaida = obras.filter(o => o.obra_teve_saida === 'SIM').length;
    
    const encarregados = new Set();
    obras.forEach(o => {
        if (o.encarregado) encarregados.add(o.encarregado);
    });
    
    const separadores = new Set();
    obras.forEach(o => {
        if (o.separador) separadores.add(o.separador);
    });
    
    const isFilterActive = (tipo, valor) => {
        return filtroAtivo && filtroAtivo.tipo === tipo && filtroAtivo.valor === valor;
    };
    
    container.innerHTML = `
        <div class="kpi-card status-total ${isFilterActive('status', 'TOTAL') ? 'active' : ''}" onclick="aplicarFiltroCard('status', 'TOTAL')" style="cursor: pointer; ${isFilterActive('status', 'TOTAL') ? 'border: 2px solid #4299E1; background: #EBF8FF;' : ''}">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total</div>
        </div>
        <div class="kpi-card status-cancelada ${isFilterActive('cancelada', 'SIM') ? 'active' : ''}" onclick="aplicarFiltroCard('cancelada', 'SIM')" style="cursor: pointer; ${isFilterActive('cancelada', 'SIM') ? 'border: 2px solid #FC8181; background: #FFF5F5;' : ''}">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${canceladas}</div>
            <div class="kpi-label">Canceladas</div>
        </div>
        <div class="kpi-card status-aditivo ${isFilterActive('aditivo', 'SIM') ? 'active' : ''}" onclick="aplicarFiltroCard('aditivo', 'SIM')" style="cursor: pointer; ${isFilterActive('aditivo', 'SIM') ? 'border: 2px solid #ED8936; background: #FFFAF0;' : ''}">
            <div class="kpi-icon">📝</div>
            <div class="kpi-value">${comAditivo}</div>
            <div class="kpi-label">Com Aditivo</div>
        </div>
        <div class="kpi-card status-programacao ${isFilterActive('programacao', 'NÃO') ? 'active' : ''}" onclick="aplicarFiltroCard('programacao', 'NÃO')" style="cursor: pointer; ${isFilterActive('programacao', 'NÃO') ? 'border: 2px solid #ED8936; background: #FFFAF0;' : ''}">
            <div class="kpi-icon">📅</div>
            <div class="kpi-value">${foraProgramacao}</div>
            <div class="kpi-label">Fora Prog.</div>
        </div>
        <div class="kpi-card status-devolvida ${isFilterActive('devolvida', 'SIM') ? 'active' : ''}" onclick="aplicarFiltroCard('devolvida', 'SIM')" style="cursor: pointer; ${isFilterActive('devolvida', 'SIM') ? 'border: 2px solid #48BB78; background: #F0FFF4;' : ''}">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${devolvidas}</div>
            <div class="kpi-label">Devolvidas</div>
        </div>
        <div class="kpi-card ${isFilterActive('saida', 'SIM') ? 'active' : ''}" onclick="aplicarFiltroCard('saida', 'SIM')" style="cursor: pointer; ${isFilterActive('saida', 'SIM') ? 'border: 2px solid #4299E1; background: #EBF8FF;' : ''}">
            <div class="kpi-icon">🚚</div>
            <div class="kpi-value">${comSaida}</div>
            <div class="kpi-label">Com Saída</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${encarregados.size}</div>
            <div class="kpi-label">Encarregados</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${separadores.size}</div>
            <div class="kpi-label">Separadores</div>
        </div>
    `;
}

// ============================================
// KPIs - SEPARADORES
// ============================================

function renderizarKPIsSeparadores(separadores) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalSeparadores = separadores.length;
    const totalObras = separadores.reduce((sum, s) => sum + s.totalObras, 0);
    const totalFinalizadas = separadores.reduce((sum, s) => sum + s.finalizadas, 0);
    const totalPendentes = separadores.reduce((sum, s) => sum + s.pendentes, 0);
    const totalComAditivo = separadores.reduce((sum, s) => sum + s.comAditivo, 0);
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalSeparadores}</div>
            <div class="kpi-label">Separadores</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Total Obras</div>
        </div>
        <div class="kpi-card" style="border-color: #48BB78;">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value" style="color: #48BB78;">${totalFinalizadas}</div>
            <div class="kpi-label">Finalizadas</div>
        </div>
        <div class="kpi-card" style="border-color: #ED8936;">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value" style="color: #ED8936;">${totalPendentes}</div>
            <div class="kpi-label">Pendentes</div>
        </div>
        <div class="kpi-card status-aditivo">
            <div class="kpi-icon">📝</div>
            <div class="kpi-value">${totalComAditivo}</div>
            <div class="kpi-label">Com Aditivo</div>
        </div>
        <div class="kpi-card" style="visibility: hidden;"></div>
        <div class="kpi-card" style="visibility: hidden;"></div>
        <div class="kpi-card" style="visibility: hidden;"></div>
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
    
    const obrasAgrupadas = {};
    obras.forEach(obra => {
        const key = obra.obra || 'SEM OBRA';
        if (!obrasAgrupadas[key]) {
            obrasAgrupadas[key] = [];
        }
        obrasAgrupadas[key].push(obra);
    });
    
    const keys = Object.keys(obrasAgrupadas).sort();
    
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span style="text-align: right;">Saídas</span>
        </div>
    `;
    
    keys.forEach(key => {
        const saidas = obrasAgrupadas[key];
        const isActive = obraSelecionada && obraSelecionada.obra === key;
        const obraFormatada = formatarObraParaExibicao(key);
        const qtdSaidas = saidas.length;
        
        html += `
            <div class="obra-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${key}')" style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="obra-numero">🏗️ ${obraFormatada}</span>
                <span style="text-align: right; font-weight: 600; color: #4299E1; font-size: 13px;">${qtdSaidas}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// LISTA DE SEPARADORES
// ============================================

function renderizarListaSeparadores(separadores) {
    const container = document.getElementById('obrasList');
    if (!container) return;
    
    if (!separadores || separadores.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhum separador encontrado</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Separador</span>
            <span style="text-align: right;">Obras</span>
        </div>
    `;
    
    separadores.forEach(sep => {
        const isActive = obraSelecionada && obraSelecionada.tipo === 'separador' && obraSelecionada.nome === sep.nome;
        html += `
            <div class="obra-item ${isActive ? 'active' : ''}" onclick="selecionarSeparador('${sep.nome}')" style="display: grid; grid-template-columns: 1fr 60px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="obra-numero" style="font-weight: 500; color: #2D3748; font-size: 14px;">📦 ${sep.nome}</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${sep.totalObras}</span>
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
    
    const saidas = dadosExibidos.filter(o => o.obra === obraNumero);
    
    if (saidas && saidas.length > 0) {
        obraSelecionada = { obra: obraNumero, tipo: 'obra' };
        saidaSelecionada = saidas[0];
        renderizarDetalhesObra(saidas);
        renderizarListaObras(dadosExibidos);
    }
}

// ============================================
// SELECIONAR SAÍDA
// ============================================

function selecionarSaida(saida) {
    console.log(`🔍 Selecionando saída: ${saida.data_programacao}`);
    saidaSelecionada = saida;
    
    const saidas = dadosExibidos.filter(o => o.obra === obraSelecionada.obra);
    renderizarDetalhesObra(saidas);
}

// ============================================
// SELECIONAR SEPARADOR
// ============================================

function selecionarSeparador(nome) {
    console.log(`🔍 Selecionando separador: ${nome}`);
    const separadores = agruparPorSeparador(dadosExibidos);
    const separador = separadores.find(s => s.nome === nome);
    
    if (separador) {
        obraSelecionada = { nome: separador.nome, tipo: 'separador' };
        renderizarDetalhesSeparador(separador);
        renderizarListaSeparadores(separadores);
    }
}

// ============================================
// DETALHES DA OBRA (COM SELETOR DE SAÍDAS)
// ============================================

function renderizarDetalhesObra(saidas) {
    const container = document.getElementById('obraDetails');
    if (!container) return;
    
    if (!saidas || saidas.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma saída encontrada para esta obra</p>
            </div>
        `;
        return;
    }
    
    if (!saidaSelecionada || !saidas.some(s => s.id === saidaSelecionada.id)) {
        saidaSelecionada = saidas[0];
    }
    
    const obra = saidaSelecionada;
    const obraFormatada = formatarObraParaExibicao(obra.obra);
    
    let selectorHtml = `
        <div class="saidas-selector">
            <span style="font-size: 12px; font-weight: 600; color: #4A5568; margin-right: 4px;">📅 Saídas:</span>
    `;
    
    saidas.forEach((s, index) => {
        const isActive = s.id === saidaSelecionada.id;
        const dataFormatada = formatarData(s.data_programacao);
        const label = `#${index + 1} ${dataFormatada}`;
        selectorHtml += `
            <button class="btn-saida ${isActive ? 'active' : ''}" onclick="selecionarSaida(${JSON.stringify(s).replace(/"/g, '&quot;')})">
                ${label}
            </button>
        `;
    });
    
    selectorHtml += `</div>`;
    
    let statusText = obra.status === 'FINALIZADO' ? '✅ Finalizado' : '⏳ Pendente';
    let statusColor = obra.status === 'FINALIZADO' ? '#48BB78' : '#ED8936';
    
    const indicadores = [];
    if (obra.cancelada === 'SIM') indicadores.push('❌ Cancelada');
    if (obra.aditivo === 'SIM') indicadores.push('📝 Com Aditivo');
    if (obra.obra_programada === 'NÃO') indicadores.push('📅 Fora de Programação');
    if (obra.devolvida === 'SIM') indicadores.push('📦 Devolvida');
    if (obra.obra_teve_saida === 'SIM') indicadores.push('🚚 Teve Saída');
    
    let html = `
        <div class="detail-title">🏗️ ${obraFormatada}</div>
        ${selectorHtml}
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
            <span class="label">Separador:</span>
            <span class="value">${obra.separador || 'Não informado'}</span>
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
    
    if (indicadores.length > 0) {
        html += `
            <div class="detail-row" style="grid-column: 1 / -1; border-bottom: none;">
                <span class="label">Indicadores:</span>
                <span class="value">${indicadores.join(' • ')}</span>
            </div>
        `;
    }
    
    if (obra.data_separacao) {
        html += `
            <div class="detail-section-title">📅 Data de Separação</div>
            <div class="detail-row">
                <span class="label">Data:</span>
                <span class="value">${formatarData(obra.data_separacao)}</span>
            </div>
        `;
    }
    
    if (obra.obra_teve_saida === 'SIM' && obra.data_saida) {
        html += `
            <div class="detail-section-title">🚚 Saída</div>
            <div class="detail-row">
                <span class="label">Data de Saída:</span>
                <span class="value">${formatarData(obra.data_saida)}</span>
            </div>
        `;
    }
    
    if (obra.observacao) {
        html += `
            <div class="detail-section-title">📝 Observação</div>
            <div class="detail-row" style="grid-column: 1 / -1;">
                <span class="value" style="font-size: 13px; color: #4A5568; word-wrap: break-word;">${obra.observacao}</span>
            </div>
        `;
    }
    
    const itens = saidaSelecionada.itens || [];
    if (itens.length > 0) {
        html += `
            <div class="detail-section-title">📦 Itens da Saída (${itens.length})</div>
            <div class="obra-detail-itens">
        `;
        
        const itensOrdenados = [...itens].sort((a, b) => (a.codigo || '').localeCompare(b.codigo || ''));
        
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
// DETALHES DO SEPARADOR
// ============================================

function renderizarDetalhesSeparador(separador) {
    const container = document.getElementById('obraDetails');
    if (!container) return;
    
    const obras = separador.obras || [];
    const obrasOrdenadas = [...obras].sort((a, b) => (a.obra || '').localeCompare(b.obra || ''));
    
    let html = `
        <div class="detail-title">📦 ${separador.nome}</div>
        <div class="detail-row">
            <span class="label">Total de Obras:</span>
            <span class="value" style="font-weight: 700; color: #2B6CB0;">${separador.totalObras}</span>
        </div>
        <div class="detail-row">
            <span class="label">Finalizadas:</span>
            <span class="value" style="color: #48BB78;">✅ ${separador.finalizadas}</span>
        </div>
        <div class="detail-row">
            <span class="label">Pendentes:</span>
            <span class="value" style="color: #ED8936;">⏳ ${separador.pendentes}</span>
        </div>
        <div class="detail-row">
            <span class="label">Com Aditivo:</span>
            <span class="value" style="color: #ED8936;">📝 ${separador.comAditivo}</span>
        </div>
        <div class="detail-row">
            <span class="label">Canceladas:</span>
            <span class="value" style="color: #FC8181;">❌ ${separador.canceladas}</span>
        </div>
        <div class="detail-row">
            <span class="label">Devolvidas:</span>
            <span class="value" style="color: #48BB78;">📦 ${separador.devolvidas}</span>
        </div>
        <div class="detail-row">
            <span class="label">Fora de Programação:</span>
            <span class="value" style="color: #ED8936;">📅 ${separador.foraProgramacao}</span>
        </div>
        <div class="detail-row">
            <span class="label">Com Saída:</span>
            <span class="value" style="color: #4299E1;">🚚 ${separador.comSaida}</span>
        </div>
    `;
    
    if (obrasOrdenadas.length > 0) {
        html += `
            <div class="detail-section-title">🏗️ Obras do Separador (${obrasOrdenadas.length})</div>
            <div class="obra-detail-itens">
        `;
        
        obrasOrdenadas.forEach(obra => {
            const obraFormatada = formatarObraParaExibicao(obra.obra);
            const statusIcon = obra.status === 'FINALIZADO' ? '✅' : '⏳';
            const encarregado = obra.encarregado || 'N/I';
            html += `
                <div class="item-row">
                    <span>🏗️ ${obraFormatada} ${statusIcon}</span>
                    <span class="qtd" style="font-weight: 400; color: #718096;">👤 ${encarregado}</span>
                </div>
            `;
        });
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

// ============================================
// GRÁFICOS - OBRAS
// ============================================

function renderizarGraficosObras(obras) {
    console.log('📊 Renderizando gráficos de obras...');
    
    const total = obras.length || 1;
    
    const categorias = {
        canceladas: { count: obras.filter(o => o.cancelada === 'SIM').length, label: 'Canceladas', class: 'bar-cancelada' },
        comAditivo: { count: obras.filter(o => o.aditivo === 'SIM').length, label: 'Com Aditivo', class: 'bar-aditivo' },
        foraProgramacao: { count: obras.filter(o => o.obra_programada === 'NÃO').length, label: 'Fora Programação', class: 'bar-programacao' },
        devolvidas: { count: obras.filter(o => o.devolvida === 'SIM').length, label: 'Devolvidas', class: 'bar-devolvida' },
        comSaida: { count: obras.filter(o => o.obra_teve_saida === 'SIM').length, label: 'Com Saída', class: 'bar-saida' }
    };
    
    const normais = obras.filter(o => 
        o.cancelada !== 'SIM' && 
        o.aditivo !== 'SIM' && 
        o.obra_programada !== 'NÃO' && 
        o.devolvida !== 'SIM' && 
        o.obra_teve_saida !== 'SIM'
    ).length;
    
    let html = '';
    
    Object.keys(categorias).forEach(key => {
        const cat = categorias[key];
        const percentual = (cat.count / total) * 100;
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
    
    const percentualNormal = (normais / total) * 100;
    html += `
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
    
    document.getElementById('statusChart').innerHTML = html;
    
    const separadoresMap = {};
    obras.forEach(obra => {
        const nome = obra.separador || 'NÃO INFORMADO';
        if (!separadoresMap[nome]) separadoresMap[nome] = 0;
        separadoresMap[nome]++;
    });
    
    const sorted = Object.entries(separadoresMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);
    
    const maxCount = sorted.length > 0 ? Math.max(...sorted.map(s => s[1])) : 1;
    
    let htmlSep = '';
    sorted.forEach(([nome, count]) => {
        const percentual = (count / maxCount) * 100;
        htmlSep += `
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
        htmlSep = `<div class="empty-state-dashboard"><p>Nenhum separador encontrado</p></div>`;
    }
    
    document.getElementById('encarregadoChart').innerHTML = htmlSep;
}

// ============================================
// GRÁFICOS - SEPARADORES
// ============================================

function renderizarGraficosSeparadores(separadores) {
    console.log('📊 Renderizando gráficos de separadores...');
    
    const totalObras = separadores.reduce((sum, s) => sum + s.totalObras, 0) || 1;
    
    const statusCount = {
        finalizadas: separadores.reduce((sum, s) => sum + s.finalizadas, 0),
        pendentes: separadores.reduce((sum, s) => sum + s.pendentes, 0),
        comAditivo: separadores.reduce((sum, s) => sum + s.comAditivo, 0),
        canceladas: separadores.reduce((sum, s) => sum + s.canceladas, 0),
        devolvidas: separadores.reduce((sum, s) => sum + s.devolvidas, 0)
    };
    
    const categorias = [
        { key: 'finalizadas', label: 'Finalizadas', class: 'bar-devolvida' },
        { key: 'pendentes', label: 'Pendentes', class: 'bar-programacao' },
        { key: 'comAditivo', label: 'Com Aditivo', class: 'bar-aditivo' },
        { key: 'canceladas', label: 'Canceladas', class: 'bar-cancelada' },
        { key: 'devolvidas', label: 'Devolvidas', class: 'bar-saida' }
    ];
    
    let html = '';
    categorias.forEach(cat => {
        const count = statusCount[cat.key] || 0;
        const percentual = (count / totalObras) * 100;
        html += `
            <div class="chart-bar-indicator">
                <span class="label">${cat.label}</span>
                <div class="bar-track">
                    <div class="bar-fill ${cat.class}" style="width: ${percentual}%;">
                        <span class="value">${count}</span>
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
                    <span class="value">${totalObras}</span>
                </div>
            </div>
            <span class="percent" style="font-weight: 700;">100%</span>
        </div>
    `;
    
    document.getElementById('statusChart').innerHTML = html;
    
    const sorted = [...separadores]
        .sort((a, b) => b.totalObras - a.totalObras)
        .slice(0, 15);
    
    const maxCount = sorted.length > 0 ? Math.max(...sorted.map(s => s.totalObras)) : 1;
    
    let htmlSep = '';
    sorted.forEach(sep => {
        const percentual = (sep.totalObras / maxCount) * 100;
        htmlSep += `
            <div class="encarregado-item-chart">
                <span class="name">${sep.nome}</span>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percentual}%;">
                        <span class="value">${sep.totalObras}</span>
                    </div>
                </div>
                <span class="count">${sep.totalObras}</span>
            </div>
        `;
    });
    
    if (sorted.length === 0) {
        htmlSep = `<div class="empty-state-dashboard"><p>Nenhum separador encontrado</p></div>`;
    }
    
    document.getElementById('encarregadoChart').innerHTML = htmlSep;
}

// ============================================
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarObra = selecionarObra;
window.selecionarSaida = selecionarSaida;
window.selecionarSeparador = selecionarSeparador;
window.trocarAba = trocarAba;
window.renderizarDashboard = renderizarDashboard;
window.aplicarFiltroCard = aplicarFiltroCard;
window.filtrarPorMes = filtrarPorMes;

console.log('✅ dashboards-farol-obras.js inicializado!');