// ============================================
// DASHBOARD ADITIVOS FÍSICOS
// ============================================

console.log('🚀 dashboards-aditivos-fisicos.js carregado!');

let dadosCompletos = [];
let dadosFiltrados = [];
let itemSelecionado = null;
let abaAtual = 'materiais';

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
        
        criarAbas();
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
    const mainContainer = document.querySelector('.dashboard-main');
    if (!mainContainer) return;
    
    const existingAbas = document.querySelector('.abas-container');
    if (existingAbas) existingAbas.remove();
    
    const abaContainer = document.createElement('div');
    abaContainer.className = 'abas-container';
    abaContainer.innerHTML = `
        <button class="btn-aba active" data-aba="materiais" onclick="trocarAba('materiais')">
            📦 Materiais
        </button>
        <button class="btn-aba" data-aba="obras" onclick="trocarAba('obras')">
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
    
    document.querySelectorAll('.btn-aba').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    const listTitle = document.getElementById('listTitle');
    if (listTitle) {
        const titles = {
            'materiais': '📦 Itens Aditivados',
            'obras': '🏗️ Obras com Aditivos',
            'encarregados': '👤 Encarregados'
        };
        listTitle.textContent = titles[aba] || '📦 Itens Aditivados';
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
    const filtroAplicacao = document.getElementById('filterAplicacao')?.value || 'todos';
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
        console.log(`📅 Após filtro de período: ${filtrados.length} aditivos`);
    }
    
    if (filtroAplicacao !== 'todos') {
        filtrados = filtrados.map(aditivo => ({
            ...aditivo,
            itens: (aditivo.itens || []).filter(item => 
                (item.aplicado || 'PENDENTE') === filtroAplicacao
            )
        })).filter(aditivo => aditivo.itens && aditivo.itens.length > 0);
        console.log(`🔄 Após filtro de aplicação: ${filtrados.length} aditivos`);
    }
    
    if (buscaTexto) {
        filtrados = filtrados.map(aditivo => ({
            ...aditivo,
            itens: (aditivo.itens || []).filter(item => {
                const codigo = (item.codigo || '').toLowerCase();
                const descricao = (item.descricao || '').toLowerCase();
                return codigo.includes(buscaTexto) || descricao.includes(buscaTexto);
            })
        })).filter(aditivo => aditivo.itens && aditivo.itens.length > 0);
        console.log(`🔍 Após filtro de busca: ${filtrados.length} aditivos`);
    }
    
    if (buscaObra) {
        filtrados = filtrados.filter(aditivo => {
            const obra = (aditivo.obra || '').toLowerCase();
            return obra.includes(buscaObra.toLowerCase());
        });
        console.log(`🏗️ Após filtro de obra: ${filtrados.length} aditivos`);
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
    document.getElementById('filterAplicacao').value = 'todos';
    document.getElementById('filterBusca').value = '';
    document.getElementById('filterObra').value = '';
    aplicarFiltros();
}

// ============================================
// AGRUPAMENTO DE ITENS FÍSICOS (COUNT de SKUs)
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
            
            if (!grupos[codigo]) {
                grupos[codigo] = {
                    codigo: codigo,
                    descricao: descricao,
                    unidade: unidade,
                    total: 0,
                    obras: [],
                    saidas: [],
                    itens: [],
                    aplicacaoCount: { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 },
                    obrasSet: new Set(),
                    saidasSet: new Set(),
                    encarregadosSet: new Set()
                };
            }
            
            if (!grupos[codigo].descricao || grupos[codigo].descricao === 'Sem descrição') {
                grupos[codigo].descricao = descricao;
            }
            
            // CONTAGEM: Cada ocorrência do SKU conta como 1 (COUNT)
            grupos[codigo].total += 1;
            
            const obra = controle.obra || 'SEM OBRA';
            const isSaida = obra.toUpperCase().includes('SAÍDA') || obra.toUpperCase().includes('SAIDA');
            
            const statusKey = aplicado === 'SIM' ? 'SIM' : 
                             aplicado === 'NÃO' ? 'NAO' : 
                             aplicado === 'PARCIAL' ? 'PARCIAL' : 'PENDENTE';
            
            // CONTAGEM por status
            if (grupos[codigo].aplicacaoCount[statusKey] !== undefined) {
                grupos[codigo].aplicacaoCount[statusKey] += 1;
            }
            
            const itemData = {
                obra: obra,
                quantidade: quantidade,
                aplicado: aplicado,
                encarregado: encarregado,
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
            if (encarregado) grupos[codigo].encarregadosSet.add(encarregado);
        });
    });
    
    const resultado = Object.values(grupos).sort((a, b) => b.total - a.total);
    console.log(`✅ ${resultado.length} grupos de itens criados a partir de ${totalItens} itens`);
    return resultado;
}

// ============================================
// AGRUPAR POR OBRA (COUNT de SKUs)
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
                skus: [],
                skusSet: new Set(),
                encarregadosSet: new Set()
            };
        }
        
        obras[obra].datas.add(dataProgramacao);
        
        itens.forEach(item => {
            obras[obra].itens.push({
                ...item,
                data: dataProgramacao,
                numero: controle.numero
            });
            const qtd = parseFloat(item.quantidade) || 0;
            obras[obra].totalItens += qtd;
            
            if (item.codigo) {
                obras[obra].skus.push(item.codigo);
                obras[obra].skusSet.add(item.codigo);
            }
            if (item.encarregado_obra) {
                obras[obra].encarregadosSet.add(item.encarregado_obra);
            }
        });
    });
    
    const resultado = Object.values(obras).map(obra => ({
        ...obra,
        datas: Array.from(obra.datas).sort(),
        skusCount: obra.skus.length,
        skusUnico: obra.skusSet.size,
        encarregadosCount: obra.encarregadosSet.size
    })).sort((a, b) => b.skusCount - a.skusCount);
    
    console.log(`✅ ${resultado.length} obras agrupadas`);
    return resultado;
}

// ============================================
// AGRUPAR POR ENCARREGADO (COUNT de SKUs)
// ============================================

function agruparPorEncarregado(controles) {
    console.log(`👤 Agrupando por encarregado...`);
    const encarregados = {};
    
    controles.forEach(controle => {
        const itens = controle.itens || [];
        const dataProgramacao = controle.data_programacao || '';
        
        itens.forEach(item => {
            const nome = item.encarregado_obra || 'NÃO INFORMADO';
            const obra = controle.obra || 'SEM OBRA';
            
            if (!encarregados[nome]) {
                encarregados[nome] = {
                    nome: nome,
                    obras: new Set(),
                    itens: [],
                    skus: [],
                    skusSet: new Set(),
                    aplicacaoCount: { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 }
                };
            }
            
            encarregados[nome].obras.add(obra);
            encarregados[nome].itens.push({
                ...item,
                data: dataProgramacao,
                numero: controle.numero,
                obra: obra
            });
            
            if (item.codigo) {
                encarregados[nome].skus.push(item.codigo);
                encarregados[nome].skusSet.add(item.codigo);
            }
            
            const aplicado = item.aplicado || 'PENDENTE';
            const key = aplicado === 'SIM' ? 'SIM' : 
                       aplicado === 'NÃO' ? 'NAO' : 
                       aplicado === 'PARCIAL' ? 'PARCIAL' : 'PENDENTE';
            encarregados[nome].aplicacaoCount[key] += 1;
        });
    });
    
    const resultado = Object.values(encarregados).map(enc => ({
        ...enc,
        obras: Array.from(enc.obras),
        skusCount: enc.skus.length,
        skusUnico: enc.skusSet.size
    })).sort((a, b) => b.skusCount - a.skusCount);
    
    console.log(`✅ ${resultado.length} encarregados agrupados`);
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
        document.getElementById('itemDetails').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">👆</div>
                <p>Nenhum dado para exibir</p>
            </div>
        `;
        return;
    }
    
    // Determina quais dados usar para o gráfico baseado na aba atual
    let dadosParaGrafico = [];
    
    if (abaAtual === 'materiais') {
        const itensAgrupados = agruparItensFisicos(aditivos);
        dadosParaGrafico = itensAgrupados;
        renderizarKPIsMateriais(itensAgrupados);
        renderizarListaItens(itensAgrupados);
        renderizarTopSkus(itensAgrupados);
        
        if (itemSelecionado && itemSelecionado.tipo === 'material') {
            const encontrado = itensAgrupados.find(i => i.codigo === itemSelecionado.codigo);
            if (encontrado) {
                renderizarDetalhes(encontrado);
            } else {
                document.getElementById('itemDetails').innerHTML = `
                    <div class="empty-state-dashboard">
                        <div class="icon">👆</div>
                        <p>Selecione um item para ver os detalhes</p>
                    </div>
                `;
            }
        }
    } else if (abaAtual === 'obras') {
        const obrasAgrupadas = agruparPorObra(aditivos);
        dadosParaGrafico = obrasAgrupadas;
        renderizarListaObras(obrasAgrupadas);
        renderizarKPIsObras(obrasAgrupadas);
        
        if (itemSelecionado && itemSelecionado.tipo === 'obra') {
            const encontrado = obrasAgrupadas.find(o => o.obra === itemSelecionado.obra);
            if (encontrado) {
                renderizarDetalhesObra(encontrado);
            }
        }
    } else if (abaAtual === 'encarregados') {
        const encarregadosAgrupados = agruparPorEncarregado(aditivos);
        dadosParaGrafico = encarregadosAgrupados;
        renderizarListaEncarregados(encarregadosAgrupados);
        renderizarKPIsEncarregados(encarregadosAgrupados);
        
        if (itemSelecionado && itemSelecionado.tipo === 'encarregado') {
            const encontrado = encarregadosAgrupados.find(e => e.nome === itemSelecionado.nome);
            if (encontrado) {
                renderizarDetalhesEncarregado(encontrado);
            }
        }
    }
    
    // Renderiza o gráfico com os dados da aba atual
    renderizarGraficoStatus(dadosParaGrafico);
}

// ============================================
// KPIs - MATERIAIS
// ============================================

function renderizarKPIsMateriais(itensAgrupados) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalSkus = itensAgrupados.reduce((sum, item) => sum + item.total, 0);
    const totalSkusUnicos = itensAgrupados.length;
    
    const obrasSet = new Set();
    itensAgrupados.forEach(item => {
        item.obras.forEach(o => obrasSet.add(o.obra));
        item.saidas.forEach(s => obrasSet.add(s.obra));
    });
    const totalObras = obrasSet.size;
    
    const aplicacaoCount = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    itensAgrupados.forEach(item => {
        Object.keys(aplicacaoCount).forEach(key => {
            aplicacaoCount[key] += item.aplicacaoCount[key] || 0;
        });
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalSkus}</div>
            <div class="kpi-label">Ocorrências de SKUs</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalSkusUnicos}</div>
            <div class="kpi-label">SKUs Únicos</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras com Aditivos</div>
        </div>
        <div class="kpi-card status-aplicado">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${aplicacaoCount.SIM}</div>
            <div class="kpi-label">Aplicados</div>
        </div>
        <div class="kpi-card status-nao-aplicado">
            <div class="kpi-icon">❌</div>
            <div class="kpi-value">${aplicacaoCount.NAO}</div>
            <div class="kpi-label">Não Aplicados</div>
        </div>
        <div class="kpi-card status-parcial">
            <div class="kpi-icon">🔄</div>
            <div class="kpi-value">${aplicacaoCount.PARCIAL}</div>
            <div class="kpi-label">Parcial</div>
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
    const totalSkusOcorrencias = obrasAgrupadas.reduce((sum, o) => sum + o.skusCount, 0);
    const totalSkusUnicos = obrasAgrupadas.reduce((sum, o) => sum + o.skusUnico, 0);
    const totalEncarregados = new Set();
    obrasAgrupadas.forEach(o => {
        o.itens.forEach(i => {
            if (i.encarregado_obra) totalEncarregados.add(i.encarregado_obra);
        });
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Total de Obras</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalSkusOcorrencias}</div>
            <div class="kpi-label">Ocorrências de SKUs</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalSkusUnicos}</div>
            <div class="kpi-label">SKUs Únicos</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${totalEncarregados.size}</div>
            <div class="kpi-label">Encarregados</div>
        </div>
    `;
}

// ============================================
// KPIs - ENCARREGADOS
// ============================================

function renderizarKPIsEncarregados(encarregadosAgrupados) {
    const container = document.getElementById('kpiGrid');
    if (!container) return;
    
    const totalEncarregados = encarregadosAgrupados.length;
    const totalSkusOcorrencias = encarregadosAgrupados.reduce((sum, e) => sum + e.skusCount, 0);
    const totalSkusUnicos = encarregadosAgrupados.reduce((sum, e) => sum + e.skusUnico, 0);
    const totalObras = new Set();
    encarregadosAgrupados.forEach(e => {
        e.obras.forEach(o => totalObras.add(o));
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total">
            <div class="kpi-icon">👤</div>
            <div class="kpi-value">${totalEncarregados}</div>
            <div class="kpi-label">Total de Encarregados</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${totalSkusOcorrencias}</div>
            <div class="kpi-label">Ocorrências de SKUs</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">📋</div>
            <div class="kpi-value">${totalSkusUnicos}</div>
            <div class="kpi-label">SKUs Únicos</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras.size}</div>
            <div class="kpi-label">Obras</div>
        </div>
    `;
}

// ============================================
// GRÁFICO DE STATUS (baseado na aba atual)
// ============================================

function renderizarGraficoStatus(dados) {
    console.log('📊 Renderizando gráfico de status baseado na aba:', abaAtual);
    
    // Calcula a contagem de status baseado nos dados atuais
    const aplicacaoCount = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    
    if (abaAtual === 'materiais') {
        // Para materiais, usa o aplicacaoCount já calculado
        dados.forEach(item => {
            Object.keys(aplicacaoCount).forEach(key => {
                aplicacaoCount[key] += item.aplicacaoCount[key] || 0;
            });
        });
    } else if (abaAtual === 'obras') {
        // Para obras, conta os itens de cada obra
        dados.forEach(obra => {
            obra.itens.forEach(item => {
                const status = item.aplicado || 'PENDENTE';
                const key = status === 'SIM' ? 'SIM' : 
                           status === 'NÃO' ? 'NAO' : 
                           status === 'PARCIAL' ? 'PARCIAL' : 'PENDENTE';
                aplicacaoCount[key] += 1;
            });
        });
    } else if (abaAtual === 'encarregados') {
        // Para encarregados, usa o aplicacaoCount já calculado
        dados.forEach(enc => {
            Object.keys(aplicacaoCount).forEach(key => {
                aplicacaoCount[key] += enc.aplicacaoCount[key] || 0;
            });
        });
    }
    
    const totalGeral = Object.values(aplicacaoCount).reduce((sum, v) => sum + v, 0);
    const maxValue = totalGeral > 0 ? totalGeral : 1;
    
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
        const percentual = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const colorClass = classes[key];
        
        html += `
            <div class="chart-bar-indicator">
                <span class="label">${labels[key]}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${percentual}%;">
                        <span class="value">${value}</span>
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
    
    let html = `
        <div style="display: grid; grid-template-columns: 80px 1fr 80px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Código</span>
            <span>Descrição</span>
            <span style="text-align: right;">Ocorr.</span>
        </div>
    `;
    
    itensAgrupados.forEach(item => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'material' && itemSelecionado.codigo === item.codigo;
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarItem('${item.codigo}')" style="display: grid; grid-template-columns: 80px 1fr 80px; gap: 8px; padding: 8px 12px;">
                <span class="item-code">${item.codigo}</span>
                <span class="item-desc">${item.descricao}</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${item.total}</span>
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
    
    let html = `
        <div style="display: grid; grid-template-columns: 100px 1fr 80px 80px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span>Descrição</span>
            <span style="text-align: right;">Ocorr.</span>
            <span style="text-align: right;">SKUs Ún.</span>
        </div>
    `;
    
    obrasAgrupadas.forEach(obra => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'obra' && itemSelecionado.obra === obra.obra;
        const obraFormatada = formatarObraParaExibicao(obra.obra);
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarObra('${obra.obra}')" style="display: grid; grid-template-columns: 100px 1fr 80px 80px; gap: 8px; padding: 8px 12px;">
                <span class="item-code">🏗️ ${obraFormatada}</span>
                <span class="item-desc">${obra.skusCount} SKUs • ${obra.encarregadosCount} encarregados</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${obra.skusCount}</span>
                <span style="text-align: right; font-weight: 600; color: #48BB78;">${obra.skusUnico}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// LISTA DE ENCARREGADOS
// ============================================

function renderizarListaEncarregados(encarregadosAgrupados) {
    const container = document.getElementById('itemList');
    if (!container) return;
    
    if (!encarregadosAgrupados || encarregadosAgrupados.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhum encarregado encontrado</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="display: grid; grid-template-columns: 1fr 80px 80px 80px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Encarregado</span>
            <span style="text-align: right;">Ocorr.</span>
            <span style="text-align: right;">SKUs Ún.</span>
            <span style="text-align: right;">Obras</span>
        </div>
    `;
    
    encarregadosAgrupados.forEach(enc => {
        const isActive = itemSelecionado && itemSelecionado.tipo === 'encarregado' && itemSelecionado.nome === enc.nome;
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarEncarregado('${enc.nome}')" style="display: grid; grid-template-columns: 1fr 80px 80px 80px; gap: 8px; padding: 8px 12px;">
                <span class="item-code">👤 ${enc.nome}</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${enc.skusCount}</span>
                <span style="text-align: right; font-weight: 600; color: #48BB78;">${enc.skusUnico}</span>
                <span style="text-align: right; font-weight: 600; color: #4299E1;">${enc.obras.length}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR ENCARREGADO
// ============================================

function selecionarEncarregado(nome) {
    console.log(`🔍 Selecionando encarregado: ${nome}`);
    const encarregadosAgrupados = agruparPorEncarregado(dadosFiltrados);
    const enc = encarregadosAgrupados.find(e => e.nome === nome);
    
    if (enc) {
        itemSelecionado = { nome: enc.nome, tipo: 'encarregado' };
        renderizarDetalhesEncarregado(enc);
        renderizarListaEncarregados(encarregadosAgrupados);
    }
}

// ============================================
// DETALHES DO ENCARREGADO
// ============================================

function renderizarDetalhesEncarregado(enc) {
    const container = document.getElementById('itemDetails');
    if (!container) return;
    
    // Ordena obras por nome
    const obrasOrdenadas = [...enc.obras].sort();
    
    // Ordena materiais por código
    const materiaisMap = {};
    enc.itens.forEach(item => {
        const codigo = item.codigo || 'SEM_CODIGO';
        if (!materiaisMap[codigo]) {
            materiaisMap[codigo] = {
                codigo: codigo,
                descricao: item.descricao || 'Sem descrição',
                ocorrencias: 0,
                aplicado: item.aplicado || 'PENDENTE'
            };
        }
        materiaisMap[codigo].ocorrencias += 1;
    });
    const materiaisOrdenados = Object.values(materiaisMap).sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    const aplicacaoCount = enc.aplicacaoCount || { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    
    let html = `
        <div class="detail-title">👤 ${enc.nome}</div>
        <div class="detail-row">
            <span class="label">Ocorrências de SKUs:</span>
            <span class="value">${enc.skusCount}</span>
        </div>
        <div class="detail-row">
            <span class="label">SKUs Únicos:</span>
            <span class="value">${enc.skusUnico}</span>
        </div>
        <div class="detail-row">
            <span class="label">Obras:</span>
            <span class="value">${obrasOrdenadas.length}</span>
        </div>
        <div class="detail-status-count">
            <span class="status-item"><span class="count status-aplicado">${aplicacaoCount.SIM}</span> ✅ Aplicado</span>
            <span class="status-item"><span class="count status-nao-aplicado">${aplicacaoCount.NAO}</span> ❌ Não Aplicado</span>
            <span class="status-item"><span class="count status-parcial">${aplicacaoCount.PARCIAL}</span> 🔄 Parcial</span>
            <span class="status-item"><span class="count status-pendente">${aplicacaoCount.PENDENTE}</span> ⏳ Pendente</span>
        </div>
        <div class="detail-section-title">🏗️ Obras:</div>
        <div class="item-detail-obras">
    `;
    
    obrasOrdenadas.forEach(obra => {
        const obraFormatada = formatarObraParaExibicao(obra);
        // Conta quantos SKUs tem nessa obra para este encarregado
        const count = enc.itens.filter(i => i.obra === obra).length;
        html += `
            <div class="obra-row">
                <span>🏗️ ${obraFormatada}</span>
                <span>${count} SKUs</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    html += `<div class="detail-section-title">📦 Materiais:</div>
    <div class="item-detail-obras">`;
    
    materiaisOrdenados.forEach(item => {
        const badge = getAplicacaoBadge(item.aplicado);
        html += `
            <div class="obra-row">
                <span><strong>${item.codigo}</strong> - ${item.descricao}</span>
                <span>${item.ocorrencias}x ${badge}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
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
    
    const obraFormatada = formatarObraParaExibicao(obra.obra);
    
    // Ordena materiais por código
    const itensPorCodigo = {};
    obra.itens.forEach(item => {
        const codigo = item.codigo || 'SEM_CODIGO';
        if (!itensPorCodigo[codigo]) {
            itensPorCodigo[codigo] = {
                codigo: codigo,
                descricao: item.descricao || 'Sem descrição',
                quantidade: 0,
                aplicado: item.aplicado || 'PENDENTE',
                ocorrencias: 0,
                encarregado: item.encarregado_obra || 'NÃO INFORMADO'
            };
        }
        itensPorCodigo[codigo].quantidade += parseFloat(item.quantidade) || 0;
        itensPorCodigo[codigo].ocorrencias += 1;
    });
    const materiaisOrdenados = Object.values(itensPorCodigo).sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    // Ordena datas
    const datasOrdenadas = [...obra.datas].sort();
    
    let html = `
        <div class="detail-title">🏗️ ${obraFormatada}</div>
        <div class="detail-row">
            <span class="label">Ocorrências de SKUs:</span>
            <span class="value">${obra.skusCount}</span>
        </div>
        <div class="detail-row">
            <span class="label">SKUs Únicos:</span>
            <span class="value">${obra.skusUnico}</span>
        </div>
        <div class="detail-row">
            <span class="label">Encarregados:</span>
            <span class="value">${obra.encarregadosCount}</span>
        </div>
        <div class="detail-section-title">📅 Datas de Programação:</div>
        <div class="item-detail-obras">
    `;
    
    datasOrdenadas.forEach(data => {
        html += `
            <div class="obra-row">
                <span>📅 ${formatarData(data)}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    html += `<div class="detail-section-title">📦 Materiais Aditivados:</div>
    <div class="item-detail-obras">`;
    
    materiaisOrdenados.forEach(item => {
        const qtdFormatada = Number.isInteger(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2);
        const badge = getAplicacaoBadge(item.aplicado);
        html += `
            <div class="obra-row">
                <span><strong>${item.codigo}</strong> - ${item.descricao} (${item.ocorrencias}x) 👤 ${item.encarregado}</span>
                <span>${qtdFormatada} ${badge}</span>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// ============================================
// SELECIONAR ITEM
// ============================================

function selecionarItem(codigo) {
    console.log(`🔍 Selecionando item: ${codigo}`);
    const itensAgrupados = agruparItensFisicos(dadosFiltrados);
    const item = itensAgrupados.find(i => i.codigo === codigo);
    
    if (item) {
        itemSelecionado = { codigo: item.codigo, tipo: 'material' };
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
    
    // Ordena obras por nome
    const obrasOrdenadas = [...item.obras].sort((a, b) => a.obra.localeCompare(b.obra));
    const saidasOrdenadas = [...item.saidas].sort((a, b) => a.obra.localeCompare(b.obra));
    
    const aplicacaoMap = { SIM: 0, NAO: 0, PARCIAL: 0, PENDENTE: 0 };
    item.itens.forEach(i => {
        const key = i.aplicado === 'SIM' ? 'SIM' : 
                   i.aplicado === 'NÃO' ? 'NAO' : 
                   i.aplicado === 'PARCIAL' ? 'PARCIAL' : 'PENDENTE';
        aplicacaoMap[key] += 1;
    });
    
    let html = `
        <div class="detail-title">🔧 ${item.codigo} - ${item.descricao}</div>
        <div class="detail-row">
            <span class="label">Ocorrências:</span>
            <span class="value">${item.total}</span>
        </div>
        <div class="detail-row">
            <span class="label">Obras:</span>
            <span class="value">${obrasOrdenadas.length}</span>
        </div>
        <div class="detail-row">
            <span class="label">Saídas:</span>
            <span class="value">${saidasOrdenadas.length}</span>
        </div>
        <div class="detail-row">
            <span class="label">Encarregados:</span>
            <span class="value">${item.encarregadosSet ? item.encarregadosSet.size : 0}</span>
        </div>
        <div class="detail-status-count">
            <span class="status-item"><span class="count status-aplicado">${aplicacaoMap.SIM}</span> ✅ Aplicado</span>
            <span class="status-item"><span class="count status-nao-aplicado">${aplicacaoMap.NAO}</span> ❌ Não Aplicado</span>
            <span class="status-item"><span class="count status-parcial">${aplicacaoMap.PARCIAL}</span> 🔄 Parcial</span>
            <span class="status-item"><span class="count status-pendente">${aplicacaoMap.PENDENTE}</span> ⏳ Pendente</span>
        </div>
    `;
    
    if (obrasOrdenadas.length > 0) {
        html += `<div class="detail-section-title">🏗️ Obras:</div>
        <div class="item-detail-obras">`;
        obrasOrdenadas.forEach(o => {
            const badge = getAplicacaoBadge(o.aplicado);
            const obraFormatada = formatarObraParaExibicao(o.obra);
            html += `
                <div class="obra-row">
                    <span>${obraFormatada}</span>
                    <span>${badge}</span>
                </div>
            `;
        });
        html += `</div>`;
    }
    
    if (saidasOrdenadas.length > 0) {
        html += `<div class="detail-section-title">🚚 Saídas:</div>
        <div class="item-detail-obras">`;
        saidasOrdenadas.forEach(o => {
            const badge = getAplicacaoBadge(o.aplicado);
            const obraFormatada = formatarObraParaExibicao(o.obra);
            html += `
                <div class="obra-row">
                    <span>${obraFormatada}</span>
                    <span>${badge}</span>
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
// TOP SKUs
// ============================================

function renderizarTopSkus(itensAgrupados) {
    const container = document.getElementById('topSkusChart');
    if (!container) return;
    
    const topSkus = [...itensAgrupados]
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    
    const maxTotal = topSkus.length > 0 ? Math.max(...topSkus.map(s => s.total)) : 1;
    
    let html = '';
    topSkus.forEach((item, index) => {
        const percentual = (item.total / maxTotal) * 100;
        html += `
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
        html = `<div class="empty-state-dashboard"><p>Nenhum SKU encontrado</p></div>`;
    }
    
    container.innerHTML = html;
}

// ============================================
// EXPORTAR
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarItem = selecionarItem;
window.selecionarObra = selecionarObra;
window.selecionarEncarregado = selecionarEncarregado;
window.trocarAba = trocarAba;
window.renderizarDashboard = renderizarDashboard;

console.log('✅ dashboards-aditivos-fisicos.js inicializado!');