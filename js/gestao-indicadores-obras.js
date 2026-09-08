// ============================================
// GESTÃO INDICADORES - OBRAS MOVIMENTADAS
// ============================================

// Usar nome único para evitar conflito com WORKER_URL do outro arquivo
const WORKER_URL_OBRAS = 'https://gestao-xd-almox.alefe-gomes-72f.workers.dev';

let dadosObras = {
    programacao: [],
    devolucao: [],
    movimentos: [],
    obrasProgramacao: new Set(),
    obrasDevolucao: new Set(),
    obrasMovimentos: new Set(),
    obrasProgramacaoDevolucao: new Set(),
    obrasPendentes: new Set(),
    obrasAntigas: new Set(),
    obrasMensal: {},
    detalhesObrasMensal: {}
};

let graficoObrasMensal = null;
let detalhesObrasAtuais = [];

// ============================================
// SWITCH TABS (SOBRESCREVE A FUNÇÃO DO OUTRO JS)
// ============================================
function switchTab(tabId) {
    console.log('🔄 Trocando para aba: ' + tabId);
    
    // Esconder todas as abas
    var tabs = document.querySelectorAll('.tab-content');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    var btns = document.querySelectorAll('.tab-btn');
    for (var j = 0; j < btns.length; j++) {
        btns[j].classList.remove('active');
    }
    
    // Mostrar a aba selecionada
    var targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Ativar o botão correspondente
    var targetBtn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
    
    // Se for a aba de obras, carregar os dados
    if (tabId === 'tab-obras') {
        // Pequeno delay para garantir que a DOM foi atualizada
        setTimeout(function() {
            carregarDadosObras();
        }, 100);
    }
}

// ============================================
// EVENT LISTENERS PARA AS ABAS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado (Obras)');
    
    // Definir datas padrão
    var dataInicioMov = document.getElementById('dataInicioObras');
    var dataFimMov = document.getElementById('dataFimObras');
    var dataInicioProg = document.getElementById('dataInicioProgObras');
    
    if (dataInicioMov) dataInicioMov.value = '2026-08-01';
    if (dataFimMov) dataFimMov.value = '2026-09-08';
    if (dataInicioProg) dataInicioProg.value = '2026-08-01';
    
    // Adicionar event listeners para as abas
    var tabBtns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < tabBtns.length; i++) {
        tabBtns[i].addEventListener('click', function() {
            var tabId = this.getAttribute('data-tab');
            if (typeof switchTab === 'function') {
                switchTab(tabId);
            }
        });
    }
    
    // Se a aba obras estiver ativa, carregar dados
    var tabObras = document.getElementById('tab-obras');
    if (tabObras && tabObras.classList.contains('active')) {
        carregarDadosObras();
    }
});

// ============================================
// CARREGAR DADOS DAS OBRAS
// ============================================
async function carregarDadosObras() {
    var loadingEl = document.getElementById('loadingObras');
    if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = '<div class="spinner"></div><div>⏳ Carregando dados das obras...</div>';
    }
    
    try {
        var dataInicioMov = document.getElementById('dataInicioObras')?.value || '2026-08-01';
        var dataFimMov = document.getElementById('dataFimObras')?.value || '2026-09-08';
        var dataInicioProg = document.getElementById('dataInicioProgObras')?.value || '2026-08-01';
        
        console.log('📡 Carregando dados das obras...');
        console.log('📅 Movimentos: ' + dataInicioMov + ' a ' + dataFimMov);
        console.log('📅 Programação a partir de: ' + dataInicioProg);
        
        // Buscar arquivos
        var programacaoTexto = await fetchArquivoObras('programacao_siago.txt');
        var devolucaoTexto = await fetchArquivoObras('devolucao_compilada.txt');
        var movimentosTexto = await fetchArquivoObras('movimentos_siago.txt');
        
        // Processar dados
        processarProgramacao(programacaoTexto, dataInicioProg);
        processarDevolucao(devolucaoTexto);
        processarMovimentos(movimentosTexto, dataInicioMov, dataFimMov);
        
        // Calcular métricas
        calcularMetricasObras();
        
        // Atualizar visuais
        atualizarIndicadoresObras();
        gerarGraficoObrasMensal();
        atualizarTabelasObras();
        
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        
        console.log('✅ Dados das obras carregados com sucesso!');
        console.log('📊 Total Obras: ' + dadosObras.obrasProgramacaoDevolucao.size);
        console.log('⏳ Pendentes: ' + dadosObras.obrasPendentes.size);
        console.log('🔄 Antigas: ' + dadosObras.obrasAntigas.size);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados das obras:', error);
        if (loadingEl) {
            loadingEl.innerHTML = '<div style="color:#C53030;padding:20px;">❌ Erro ao carregar dados: ' + error.message + '<br><br><button onclick="carregarDadosObras()" style="padding:10px 20px;background:#4299E1;color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Tentar Novamente</button></div>';
            loadingEl.style.display = 'block';
        }
    }
}

// ============================================
// BUSCAR ARQUIVO
// ============================================
async function fetchArquivoObras(nome) {
    try {
        // Tenta buscar via Worker
        var response = await fetch(WORKER_URL_OBRAS + '/api/teste-arquivo?arquivo=' + encodeURIComponent(nome) + '&bucket=movimentos');
        if (response.ok) {
            var data = await response.json();
            if (data.existe && data.primeirasLinhas) {
                if (nome === 'programacao_siago.txt') {
                    return await fetchArquivoSimuladoProgramacao();
                } else if (nome === 'devolucao_compilada.txt') {
                    return await fetchArquivoSimuladoDevolucao();
                } else if (nome === 'movimentos_siago.txt') {
                    return await fetchArquivoSimuladoMovimentos();
                }
                return data.primeirasLinhas.join('\n');
            }
        }
        
        // Fallback: simular com dados de exemplo
        console.log('⚠️ Usando dados simulados para ' + nome);
        if (nome === 'programacao_siago.txt') {
            return await fetchArquivoSimuladoProgramacao();
        } else if (nome === 'devolucao_compilada.txt') {
            return await fetchArquivoSimuladoDevolucao();
        } else if (nome === 'movimentos_siago.txt') {
            return await fetchArquivoSimuladoMovimentos();
        }
        return '';
    } catch (error) {
        console.error('❌ Erro ao buscar ' + nome + ':', error);
        throw error;
    }
}

// ============================================
// DADOS SIMULADOS (para testes)
// ============================================
async function fetchArquivoSimuladoProgramacao() {
    return 'num_obra\tdth_programacao_inicial\tdsc_status\n' +
        '12301540\t20/02/2024 09:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12401974\t21/01/2025 09:30\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12301855\t01/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12401398\t21/01/2025 09:30\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12302071\t01/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12302103\t01/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12302240\t01/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12401222\t23/01/2025 09:30\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12301414\t02/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12401798\t25/01/2025 10:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12302146\t02/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12201694\t03/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12402270\t27/01/2025 09:30\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12301800\t03/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12302147\t03/03/2024 08:00\t17-ENCERRAMENTO:ENCERRAMENTO TÉCNICO\n' +
        '12401816\t27/01/2025 10:00\t21-CONSTRUÇÃO:SUSPENSÃO DA OBRA';
}

async function fetchArquivoSimuladoDevolucao() {
    return 'OBRA\tDATA\tCÓDIGO\tDESCRIÇÃO\tQTD. APLICADA\tQTD. DMA NOVO\tARQUIVO\n' +
        '0012201025\t17.08.2026\t90396\tABRACADEIRA CINTA AUTOTRAV POLIAM 225X7X1,5MM LETRA A PRT\t3\t17\tDevolução Ex - Obra 0012201025.xlsx\n' +
        '0012201025\t17.08.2026\t90397\tABRACADEIRA CINTA AUTOTRAV POLIAM 225X7X1,5MM LETRA B PRT\t13\t7\tDevolução Ex - Obra 0012201025.xlsx\n' +
        '0012400765\t01.07.2026\t90683\tALCA PREF DISTR ACO-ZINC 5,70-6,45MM 430MM LRJ\t6\t0\tDevolução Ex - Obra 0012400765.xlsx\n' +
        '0012400765\t01.07.2026\t90306\tALCA PREF DISTR ACO-ZINC 7,30-8,20MM 610MM VRM\t12\t6\tDevolução Ex - Obra 0012400765.xlsx\n' +
        '0012400768\t01.07.2026\t90267\tCABO ALUM PROT SPL XLPE 1F 15,0KV 120MM2 BLOQ CNZ\t21\t12\tDevolução Ex - Obra 0012400768.xlsx\n' +
        '0012401090\t21.07.2026\t90251\tPINO ISOLADOR AUTOTRAVANTE ACO M20/M16 168,5MM\t21\t12\tDevolução Ex - Obra 0012401090.xlsx\n' +
        '0012401099\t06.08.2026\t90307\tALCA PREF DISTR ACO-ZINC 9,15-10,25MM 670MM AMR\t0\t24\tDevolução Ex - Obra 0012401099.xlsx';
}

async function fetchArquivoSimuladoMovimentos() {
    return 'num_obra\tdatamov\n' +
        '0012501556\t05/01/2026\n' +
        '0012500447\t13/01/2026\n' +
        '0012501367\t13/01/2026\n' +
        '0012500486\t13/01/2026\n' +
        '0012501172\t13/01/2026\n' +
        '0012501569\t13/01/2026\n' +
        '0012501899\t13/01/2026\n' +
        '0012501918\t13/01/2026\n' +
        '0012301311\t13/01/2026\n' +
        '0012301937\t13/01/2026\n' +
        '0012302021\t13/01/2026\n' +
        '0012401564\t13/01/2026\n' +
        '0012401698\t13/01/2026\n' +
        '0012402380\t13/01/2026\n' +
        '0012500358\t13/01/2026\n' +
        '0012500440\t13/01/2026\n' +
        '0012500673\t13/01/2026\n' +
        '0012500843\t13/01/2026\n' +
        '0012500848\t13/01/2026\n' +
        '0012500960\t13/01/2026\n' +
        '0012500987\t13/01/2026\n' +
        '0012501054\t13/01/2026\n' +
        '0012501077\t13/01/2026\n' +
        '0012501082\t13/01/2026\n' +
        '0012501114\t13/01/2026\n' +
        '0012501146\t13/01/2026\n' +
        '0012501197\t13/01/2026\n' +
        '0012201025\t17.08.2026\n' +
        '0012401090\t26.08.2026\n' +
        '0012401099\t06.08.2026';
}

// ============================================
// PROCESSAR PROGRAMAÇÃO
// ============================================
function processarProgramacao(texto, dataInicio) {
    dadosObras.programacao = [];
    dadosObras.obrasProgramacao = new Set();
    
    if (!texto) return;
    
    var linhas = texto.trim().split('\n');
    if (linhas.length < 2) return;
    
    var cabecalho = linhas[0].split('\t').map(function(h) { return h.trim().toLowerCase(); });
    var idxObra = cabecalho.indexOf('num_obra');
    var idxData = cabecalho.indexOf('dth_programacao_inicial');
    var idxStatus = cabecalho.indexOf('dsc_status');
    
    var dataInicioObj = new Date(dataInicio + 'T00:00:00');
    
    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].trim().split('\t');
        if (partes.length < Math.max(idxObra, idxData) + 1) continue;
        
        var obra = partes[idxObra]?.trim() || '';
        if (!obra) continue;
        
        var dataRaw = partes[idxData]?.trim() || '';
        var dataObj = null;
        
        if (dataRaw) {
            var match = dataRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
                dataObj = new Date(match[3] + '-' + match[2] + '-' + match[1] + 'T00:00:00');
            } else {
                var match2 = dataRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (match2) {
                    dataObj = new Date(match2[1] + '-' + match2[2] + '-' + match2[3] + 'T00:00:00');
                }
            }
        }
        
        if (dataObj && dataObj >= dataInicioObj) {
            var status = partes[idxStatus]?.trim() || 'N/A';
            dadosObras.programacao.push({ obra: obra, status: status, data: dataRaw });
            dadosObras.obrasProgramacao.add(obra);
        }
    }
    
    console.log('📋 Programação: ' + dadosObras.obrasProgramacao.size + ' obras únicas (após ' + dataInicio + ')');
}

// ============================================
// PROCESSAR DEVOLUÇÃO
// ============================================
function processarDevolucao(texto) {
    dadosObras.devolucao = [];
    dadosObras.obrasDevolucao = new Set();
    
    if (!texto) return;
    
    var linhas = texto.trim().split('\n');
    if (linhas.length < 2) return;
    
    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].trim().split('\t');
        if (partes.length < 1) continue;
        
        var obra = partes[0]?.trim() || '';
        if (!obra) continue;
        
        dadosObras.devolucao.push({ obra: obra });
        dadosObras.obrasDevolucao.add(obra);
    }
    
    console.log('📦 Devolução: ' + dadosObras.obrasDevolucao.size + ' obras únicas');
}

// ============================================
// PROCESSAR MOVIMENTOS
// ============================================
function processarMovimentos(texto, dataInicio, dataFim) {
    dadosObras.movimentos = [];
    dadosObras.obrasMovimentos = new Set();
    dadosObras.obrasMensal = {};
    dadosObras.detalhesObrasMensal = {};
    
    if (!texto) return;
    
    var linhas = texto.trim().split('\n');
    if (linhas.length < 2) return;
    
    var cabecalho = linhas[0].split('\t').map(function(h) { return h.trim().toLowerCase(); });
    var idxObra = cabecalho.indexOf('num_obra');
    var idxData = cabecalho.indexOf('datamov');
    
    var dataInicioObj = new Date(dataInicio + 'T00:00:00');
    var dataFimObj = new Date(dataFim + 'T23:59:59');
    
    for (var i = 1; i < linhas.length; i++) {
        var partes = linhas[i].trim().split('\t');
        if (partes.length < Math.max(idxObra, idxData) + 1) continue;
        
        var obra = partes[idxObra]?.trim() || '';
        if (!obra) continue;
        
        var dataRaw = partes[idxData]?.trim() || '';
        var dataObj = null;
        var mesAno = '';
        
        if (dataRaw) {
            var match = dataRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
                var dia = match[1];
                var mes = match[2];
                var ano = match[3];
                dataObj = new Date(ano + '-' + mes + '-' + dia + 'T00:00:00');
                mesAno = ano + '-' + mes;
            } else {
                var match2 = dataRaw.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (match2) {
                    var ano2 = match2[1];
                    var mes2 = match2[2];
                    var dia2 = match2[3];
                    dataObj = new Date(ano2 + '-' + mes2 + '-' + dia2 + 'T00:00:00');
                    mesAno = ano2 + '-' + mes2;
                }
            }
        }
        
        if (dataObj && dataObj >= dataInicioObj && dataObj <= dataFimObj) {
            dadosObras.movimentos.push({ obra: obra, data: dataRaw, mesAno: mesAno });
            dadosObras.obrasMovimentos.add(obra);
            
            if (mesAno) {
                if (!dadosObras.obrasMensal[mesAno]) {
                    dadosObras.obrasMensal[mesAno] = new Set();
                    dadosObras.detalhesObrasMensal[mesAno] = [];
                }
                dadosObras.obrasMensal[mesAno].add(obra);
                dadosObras.detalhesObrasMensal[mesAno].push({ obra: obra, data: dataRaw });
            }
        }
    }
    
    console.log('📊 Movimentos: ' + dadosObras.obrasMovimentos.size + ' obras únicas (' + dataInicio + ' a ' + dataFim + ')');
}

// ============================================
// CALCULAR MÉTRICAS
// ============================================
function calcularMetricasObras() {
    dadosObras.obrasProgramacaoDevolucao = new Set();
    dadosObras.obrasProgramacao.forEach(function(obra) { dadosObras.obrasProgramacaoDevolucao.add(obra); });
    dadosObras.obrasDevolucao.forEach(function(obra) { dadosObras.obrasProgramacaoDevolucao.add(obra); });
    
    dadosObras.obrasPendentes = new Set();
    dadosObras.obrasProgramacaoDevolucao.forEach(function(obra) {
        if (!dadosObras.obrasMovimentos.has(obra)) {
            dadosObras.obrasPendentes.add(obra);
        }
    });
    
    dadosObras.obrasAntigas = new Set();
    dadosObras.obrasMovimentos.forEach(function(obra) {
        if (!dadosObras.obrasProgramacaoDevolucao.has(obra)) {
            dadosObras.obrasAntigas.add(obra);
        }
    });
    
    console.log('📊 Métricas calculadas:');
    console.log('   Total: ' + dadosObras.obrasProgramacaoDevolucao.size);
    console.log('   Pendentes: ' + dadosObras.obrasPendentes.size);
    console.log('   Antigas: ' + dadosObras.obrasAntigas.size);
}

// ============================================
// ATUALIZAR INDICADORES
// ============================================
function atualizarIndicadoresObras() {
    var total = dadosObras.obrasProgramacaoDevolucao.size;
    var pendentes = dadosObras.obrasPendentes.size;
    var antigas = dadosObras.obrasAntigas.size;
    
    var totalEl = document.getElementById('totalObras');
    var pendentesEl = document.getElementById('obrasPendentes');
    var antigasEl = document.getElementById('obrasAntigas');
    
    if (totalEl) totalEl.textContent = total;
    if (pendentesEl) pendentesEl.textContent = pendentes;
    if (antigasEl) antigasEl.textContent = antigas;
}

// ============================================
// GERAR GRÁFICO DE OBRAS REQUISITADAS POR MÊS
// ============================================
function gerarGraficoObrasMensal() {
    var canvas = document.getElementById('graficoObrasMensal');
    if (!canvas) {
        console.warn('⚠️ Canvas graficoObrasMensal não encontrado');
        return;
    }
    
    var mesesOrdenados = Object.keys(dadosObras.obrasMensal).sort();
    var labels = mesesOrdenados.map(function(m) {
        var partes = m.split('-');
        if (partes.length === 2) {
            var meses = {
                '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
                '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
                '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
            };
            return (meses[partes[1]] || partes[1]) + '/' + partes[0];
        }
        return m;
    });
    
    var valores = mesesOrdenados.map(function(m) {
        return dadosObras.obrasMensal[m]?.size || 0;
    });
    
    if (graficoObrasMensal) {
        graficoObrasMensal.destroy();
        graficoObrasMensal = null;
    }
    
    try {
        graficoObrasMensal = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Obras Requisitadas',
                    data: valores,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3B82F6',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#94A3B8',
                            font: { size: 12, weight: 'bold' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' obra(s)';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: '#94A3B8'
                        },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    x: {
                        ticks: {
                            color: '#94A3B8',
                            font: { size: 11 }
                        },
                        grid: { color: 'rgba(148, 163, 184, 0.05)' }
                    }
                },
                onClick: function(event, elements) {
                    if (elements.length > 0) {
                        var index = elements[0].index;
                        var mesKey = mesesOrdenados[index];
                        if (mesKey && dadosObras.detalhesObrasMensal[mesKey]) {
                            mostrarDetalhesObrasMensal(mesKey);
                        }
                    }
                }
            }
        });
        
        console.log('✅ Gráfico de obras mensal gerado');
    } catch (error) {
        console.error('❌ Erro ao gerar gráfico de obras:', error);
    }
}

// ============================================
// MOSTRAR DETALHES DAS OBRAS POR MÊS
// ============================================
function mostrarDetalhesObrasMensal(mesKey) {
    var container = document.getElementById('detalhesObrasMensal');
    var titulo = document.getElementById('detalhesObrasTitulo');
    var conteudo = document.getElementById('detalhesObrasConteudo');
    
    if (!container || !titulo || !conteudo) return;
    
    var itens = dadosObras.detalhesObrasMensal[mesKey] || [];
    var meses = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março',
        '04': 'Abril', '05': 'Maio', '06': 'Junho',
        '07': 'Julho', '08': 'Agosto', '09': 'Setembro',
        '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    var partes = mesKey.split('-');
    var mesNome = meses[partes[1]] || partes[1];
    var label = mesNome + '/' + partes[0];
    
    dadosObrasAtuais = itens;
    
    titulo.textContent = '📋 Obras Requisitadas em ' + label + ' (' + itens.length + ' obras)';
    container.classList.add('visible');
    
    var searchInput = document.getElementById('searchObrasDetalhes');
    if (searchInput) searchInput.value = '';
    
    renderizarDetalhesObras(itens);
    
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderizarDetalhesObras(itens) {
    var conteudo = document.getElementById('detalhesObrasConteudo');
    if (!conteudo) return;
    
    var searchInput = document.getElementById('searchObrasDetalhes');
    var termo = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    var itensFiltrados = itens;
    if (termo) {
        itensFiltrados = itens.filter(function(item) {
            return item.obra.toLowerCase().includes(termo);
        });
    }
    
    if (itensFiltrados.length === 0) {
        conteudo.innerHTML = '<p style="color:#A0AEC0; text-align:center; padding:20px;">' +
            (termo ? 'Nenhuma obra encontrada para "' + termo + '"' : 'Nenhuma obra registrada') +
            '</p>';
        return;
    }
    
    var html = '<table class="tabela-obras-detalhes"><thead><tr><th>Obra</th><th>Data da Movimentação</th></tr></thead><tbody>';
    
    itensFiltrados.forEach(function(item) {
        html += '<tr><td><strong>' + item.obra + '</strong></td><td>' + (item.data || '-') + '</td></tr>';
    });
    
    html += '</tbody></table>';
    conteudo.innerHTML = html;
}

function filtrarDetalhesObras() {
    renderizarDetalhesObras(dadosObrasAtuais);
}

function fecharDetalhesObras() {
    var container = document.getElementById('detalhesObrasMensal');
    if (container) {
        container.classList.remove('visible');
    }
    dadosObrasAtuais = [];
}

window.filtrarDetalhesObras = filtrarDetalhesObras;
window.fecharDetalhesObras = fecharDetalhesObras;

// ============================================
// ATUALIZAR TABELAS DE OBRAS
// ============================================
function atualizarTabelasObras() {
    // Tabela de obras pendentes
    var tbodyPendentes = document.getElementById('tabelaPendentesBody');
    if (tbodyPendentes) {
        var pendentes = Array.from(dadosObras.obrasPendentes);
        
        if (pendentes.length === 0) {
            tbodyPendentes.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#48BB78;padding:20px;">✅ Todas as obras têm movimentação!</td></tr>';
        } else {
            var html = '';
            pendentes.forEach(function(obra) {
                var status = 'N/A';
                var origem = 'Devolução';
                
                var prog = dadosObras.programacao.find(function(p) { return p.obra === obra; });
                if (prog) {
                    status = prog.status || 'N/A';
                    origem = 'Programação';
                } else {
                    var dev = dadosObras.devolucao.find(function(d) { return d.obra === obra; });
                    if (dev) {
                        origem = 'Devolução';
                    }
                }
                
                var statusClass = getStatusClass(status);
                html += '<tr><td><strong>' + obra + '</strong></td><td><span class="status-badge ' + statusClass + '">' + status + '</span></td><td>' + origem + '</td></tr>';
            });
            tbodyPendentes.innerHTML = html;
        }
    }
    
    // Tabela de obras antigas corrigidas
    var tbodyAntigas = document.getElementById('tabelaAntigasBody');
    if (tbodyAntigas) {
        var antigas = Array.from(dadosObras.obrasAntigas);
        
        if (antigas.length === 0) {
            tbodyAntigas.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#48BB78;padding:20px;">✅ Nenhuma obra antiga corrigida!</td></tr>';
        } else {
            var html = '';
            antigas.forEach(function(obra) {
                var movs = dadosObras.movimentos.filter(function(m) { return m.obra === obra; });
                var ultimaData = movs.length > 0 ? movs[movs.length - 1].data : '-';
                
                html += '<tr><td><strong>' + obra + '</strong></td><td>' + ultimaData + '</td></tr>';
            });
            tbodyAntigas.innerHTML = html;
        }
    }
}

// ============================================
// UTILITÁRIOS
// ============================================
function getStatusClass(status) {
    if (!status) return 'status-default';
    var s = status.toLowerCase();
    if (s.includes('concluída') || s.includes('concluido')) return 'status-concluida';
    if (s.includes('cancelada') || s.includes('cancelado')) return 'status-cancelada';
    if (s.includes('programada') || s.includes('programado')) return 'status-programada';
    if (s.includes('reprovada') || s.includes('reprovado')) return 'status-reprovada';
    if (s.includes('suspensão') || s.includes('suspensa')) return 'status-suspensa';
    if (s.includes('pendente')) return 'status-pendente';
    return 'status-default';
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.carregarDadosObras = carregarDadosObras;
window.switchTab = switchTab;