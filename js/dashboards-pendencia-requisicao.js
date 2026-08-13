// ============================================
// DASHBOARD PENDÊNCIA DE REQUISIÇÃO
// ============================================

console.log('🚀 dashboards-pendencia-requisicao.js carregado!');

// URL do Cloudflare R2 - USANDO PROXY DO WORKER
const R2_URL = `${API_URL}/proxy/posicao-estoque`;

// URLs R2 para a nova funcionalidade - USANDO PROXY DO WORKER
const ARQUIVOS_R2_NOVO = {
    movimentosSiago: `${API_URL}/proxy/movimentos-siago`,
    devolucaoCompilada: `${API_URL}/proxy/devolucao-compilada`
};

console.log('📡 URLs R2 configuradas via proxy:');
console.log(`   📄 Movimentos Siago: ${ARQUIVOS_R2_NOVO.movimentosSiago}`);
console.log(`   📄 Devolução Compilada: ${ARQUIVOS_R2_NOVO.devolucaoCompilada}`);
console.log(`   📄 Posição Estoque: ${R2_URL}`);

// ============================================
// VARIÁVEIS GLOBAIS - DASHBOARD ORIGINAL
// ============================================

let dadosCompletos = [];
let dadosFiltrados = [];
let dadosExibidos = [];
let itemSelecionado = null;
let abaAtual = 'materiais';
let mesSelecionado = null;
let filtroAtivo = null;
let posicaoEstoque = {};

// ============================================
// VARIÁVEIS PARA A NOVA FUNCIONALIDADE (MGM)
// ============================================

let dadosMovimentosSiagoNovo = {};
let dadosDevolucaoCompiladaNovo = [];
let movimentosDoBancoNovo = [];
let pendenciasConsolidadasNovo = [];
let dadosFiltradosNovo = [];

let abaAtualNovo = 'mgm';
let itemSelecionadoNovo = null;
let dadosCarregadosNovo = false;

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
// FUNÇÃO: FORMATAR VALOR PARA MOEDA
// ============================================

function formatarValor(valor) {
    if (!valor || valor === 0) return 'R$ 0,00';
    return 'R$ ' + valor.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ============================================
// FUNÇÃO: BUSCAR VALOR DO ITEM NO R2
// ============================================

function buscarValorItem(codigo) {
    if (!codigo) return 0;
    const item = posicaoEstoque[codigo];
    if (item && item.valor_unitario) {
        return item.valor_unitario;
    }
    return 0;
}

// ============================================
// FUNÇÃO: CARREGAR POSIÇÃO DE ESTOQUE DO R2
// ============================================

async function carregarPosicaoEstoque() {
    try {
        console.log('🔄 Carregando posição de estoque do R2 via proxy...');
        
        const response = await fetch(R2_URL);
        
        if (!response.ok) {
            console.warn(`⚠️ Arquivo posicao-de-estoque-1050.txt não encontrado (Status: ${response.status})`);
            return;
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        
        if (linhas.length === 0) {
            console.warn('⚠️ Arquivo posicao-de-estoque.txt vazio');
            return;
        }
        
        console.log(`📄 Arquivo carregado: ${linhas.length} linhas`);
        
        posicaoEstoque = {};
        let linhasProcessadas = 0;
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const partes = linha.split('\t');
            
            if (partes.length >= 6) {
                const codmat = partes[0].trim();
                const dscmat = partes[2]?.trim() || '';
                const codund = partes[3]?.trim() || '';
                
                let vlrultCot = 0;
                try {
                    const valorStr = partes[4]?.trim().replace(',', '.') || '0';
                    vlrultCot = parseFloat(valorStr) || 0;
                } catch (e) {
                    vlrultCot = 0;
                }
                
                if (codmat) {
                    posicaoEstoque[codmat] = {
                        codmat: codmat,
                        descricao: dscmat,
                        und: codund,
                        valor_unitario: vlrultCot
                    };
                    linhasProcessadas++;
                }
            }
        }
        
        console.log(`📦 Posição de estoque carregada: ${linhasProcessadas} códigos`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar posição de estoque:', error);
        mostrarToast('❌ Erro ao carregar valores dos itens', 'erro');
    }
}

// ============================================
// FUNÇÕES PARA A NOVA FUNCIONALIDADE (MGM)
// ============================================

function normalizarObraNovo(obra) {
    if (!obra) return '';
    let limpo = obra.trim().replace(/[^0-9]/g, '');
    if (limpo.length === 10) return limpo;
    if (limpo.length === 9) return '0' + limpo;
    if (limpo.length < 9) {
        const padStart = 10 - limpo.length;
        return '0'.repeat(padStart) + limpo;
    }
    return obra;
}

function formatarObraNovo(obra) {
    if (!obra) return '';
    let limpo = obra.trim().replace(/[^0-9]/g, '');
    if (limpo.length !== 10) return obra;
    return limpo.substring(0, 3) + '-' + 
           limpo.substring(3, 5) + '-' + 
           limpo.substring(5, 10);
}

async function buscarMovimentosDoBancoNovo() {
    console.log('📡 Buscando movimentos do banco de dados...');
    try {
        const response = await fetch(`${API_URL}/movimento?limit=1000`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        movimentosDoBancoNovo = data.data || [];
        console.log(`✅ ${movimentosDoBancoNovo.length} movimentos carregados do banco`);
        return movimentosDoBancoNovo;
    } catch (error) {
        console.error('❌ Erro ao buscar movimentos:', error);
        return [];
    }
}

async function carregarArquivoR2Novo(url, nomeArquivo) {
    console.log(`📥 Carregando ${nomeArquivo} via proxy...`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const texto = await response.text();
        console.log(`✅ ${nomeArquivo} carregado (${texto.split('\n').length} linhas)`);
        return texto;
    } catch (error) {
        console.error(`❌ Erro ao carregar ${nomeArquivo}:`, error);
        throw error;
    }
}

function parsearMovimentosSiagoNovo(texto) {
    console.log('🔄 Parseando movimentos_siago.txt...');
    const linhas = texto.trim().split('\n');
    
    if (linhas.length < 2) {
        console.warn('⚠️ Arquivo vazio ou com apenas cabeçalho');
        return {};
    }
    
    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    console.log(`📋 Cabeçalho: ${cabecalho.length} colunas`);
    
    const indices = {
        numdoc_mov: cabecalho.indexOf('numdoc_mov'),
        orgmov: cabecalho.indexOf('orgmov'),
        sigla_mov_mat: cabecalho.indexOf('sigla_mov_mat'),
        dscmat: cabecalho.indexOf('dscmat'),
        qtdmov: cabecalho.indexOf('qtdmov'),
        nummov: cabecalho.indexOf('nummov'),
        codmat_mov: cabecalho.indexOf('codmat_mov'),
        datamov: cabecalho.indexOf('datamov'),
        codreg: cabecalho.indexOf('codreg'),
        nomereg: cabecalho.indexOf('nomereg')
    };
    
    const movimentos = {};
    let linhasProcessadas = 0;
    
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const partes = linha.split('\t');
        const numdocMov = partes[indices.numdoc_mov]?.trim() || '';
        
        if (!numdocMov) continue;
        
        if (!movimentos[numdocMov]) {
            movimentos[numdocMov] = {
                numdoc_mov: numdocMov,
                orgmov: partes[indices.orgmov]?.trim() || '',
                sigla_mov_mat: partes[indices.sigla_mov_mat]?.trim() || '',
                nummov: partes[indices.nummov]?.trim() || '',
                datamov: partes[indices.datamov]?.trim() || '',
                codreg: partes[indices.codreg]?.trim() || '',
                nomereg: partes[indices.nomereg]?.trim() || '',
                itens: []
            };
        }
        
        const item = {
            codmat_mov: partes[indices.codmat_mov]?.trim() || '',
            dscmat: partes[indices.dscmat]?.trim() || '',
            qtdmov: parseFloat(partes[indices.qtdmov]?.trim().replace(',', '.') || '0')
        };
        
        if (item.codmat_mov && item.dscmat) {
            movimentos[numdocMov].itens.push(item);
            linhasProcessadas++;
        }
    }
    
    console.log(`✅ ${Object.keys(movimentos).length} movimentos processados com ${linhasProcessadas} itens`);
    return movimentos;
}

function parsearDevolucaoCompiladaNovo(texto) {
    console.log('🔄 Parseando devolucao_compilada.txt...');
    const linhas = texto.trim().split('\n');
    
    if (linhas.length < 2) {
        console.warn('⚠️ Arquivo vazio ou com apenas cabeçalho');
        return [];
    }
    
    const cabecalho = linhas[0].split('\t').map(h => h.trim());
    console.log(`📋 Cabeçalho: ${cabecalho.length} colunas`);
    
    const indices = {
        obra: cabecalho.indexOf('OBRA'),
        data: cabecalho.indexOf('DATA'),
        codigo: cabecalho.indexOf('CÓDIGO'),
        descricao: cabecalho.indexOf('DESCRIÇÃO'),
        qtdAplicada: cabecalho.indexOf('QTD. APLICADA'),
        qtdDma: cabecalho.indexOf('QTD. DMA NOVO'),
        arquivo: cabecalho.indexOf('ARQUIVO')
    };
    
    const itens = [];
    let linhasProcessadas = 0;
    
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;
        
        const partes = linha.split('\t');
        if (partes.length < 7) continue;
        
        const item = {
            obra: partes[indices.obra]?.trim() || '',
            data: partes[indices.data]?.trim() || '',
            codigo: partes[indices.codigo]?.trim() || '',
            descricao: partes[indices.descricao]?.trim() || '',
            qtdAplicada: parseFloat(partes[indices.qtdAplicada]?.trim().replace(',', '.') || '0'),
            qtdDma: parseFloat(partes[indices.qtdDma]?.trim().replace(',', '.') || '0'),
            arquivo: partes[indices.arquivo]?.trim() || ''
        };
        
        if (item.obra && item.codigo) {
            itens.push(item);
            linhasProcessadas++;
        }
    }
    
    console.log(`✅ ${linhasProcessadas} itens processados`);
    return itens;
}

function consolidarPendenciasNovo(devolucaoItens, movimentosSiago, movimentosBanco) {
    console.log('🔄 Consolidando pendências MGM...');
    
    const pendencias = [];
    
    const bancoPorCodMov = {};
    movimentosBanco.forEach(m => {
        if (m.cod_movimentacao) {
            bancoPorCodMov[m.cod_movimentacao] = m;
        }
    });
    
    const gruposPorObra = {};
    devolucaoItens.forEach(item => {
        const obraNorm = normalizarObraNovo(item.obra);
        if (!gruposPorObra[obraNorm]) {
            gruposPorObra[obraNorm] = {
                obra: obraNorm,
                data: item.data,
                itens: []
            };
        }
        gruposPorObra[obraNorm].itens.push(item);
    });
    
    console.log(`📊 ${Object.keys(gruposPorObra).length} grupos de obra encontrados`);
    
    for (const obraNorm in gruposPorObra) {
        const grupo = gruposPorObra[obraNorm];
        const { obra, data, itens } = grupo;
        
        const movimentosRelacionados = movimentosBanco.filter(m => {
            const obraMov = normalizarObraNovo(m.obra);
            return obraMov === obraNorm;
        });
        
        itens.forEach(itemDev => {
            const qtdEsperada = itemDev.qtdAplicada > 0 ? itemDev.qtdAplicada : itemDev.qtdDma;
            
            let encontrado = false;
            let qtdEncontrada = 0;
            let movimentoEncontrado = null;
            let tipoMovimento = null;
            let siglaMovimento = null;
            let statusBanco = null;
            
            for (const movBanco of movimentosRelacionados) {
                const codMov = movBanco.cod_movimentacao;
                const movimentoSiago = movimentosSiago[codMov];
                
                if (movimentoSiago) {
                    const itemMov = movimentoSiago.itens.find(i => 
                        i.codmat_mov === itemDev.codigo || 
                        i.dscmat === itemDev.descricao
                    );
                    
                    if (itemMov) {
                        encontrado = true;
                        qtdEncontrada += itemMov.qtdmov || 0;
                        if (!movimentoEncontrado) {
                            movimentoEncontrado = codMov;
                            tipoMovimento = movimentoSiago.orgmov || 'DESCONHECIDO';
                            siglaMovimento = movimentoSiago.sigla_mov_mat || '';
                            statusBanco = movBanco.status;
                        }
                    }
                }
            }
            
            let status = 'PENDENTE';
            let motivo = '';
            
            if (encontrado) {
                if (qtdEncontrada >= qtdEsperada) {
                    status = 'ATENDIDO';
                } else if (qtdEncontrada > 0 && qtdEncontrada < qtdEsperada) {
                    status = 'PARCIAL';
                    motivo = `Atendido ${qtdEncontrada.toFixed(2)} de ${qtdEsperada.toFixed(2)}`;
                } else {
                    status = 'PENDENTE';
                    motivo = 'Quantidade zero no movimento';
                }
            } else {
                status = 'PENDENTE';
                motivo = 'Nenhum movimento encontrado para esta obra';
            }
            
            if (statusBanco === 'FINALIZADO' && status === 'PENDENTE') {
                motivo = 'Movimento finalizado mas item não encontrado';
            }
            
            pendencias.push({
                obra: obraNorm,
                obraFormatada: formatarObraNovo(obraNorm),
                data: data,
                codigo: itemDev.codigo,
                descricao: itemDev.descricao,
                qtdAplicada: itemDev.qtdAplicada,
                qtdDma: itemDev.qtdDma,
                qtdEsperada: qtdEsperada,
                qtdEncontrada: qtdEncontrada,
                status: status,
                motivo: motivo,
                movimentoEncontrado: movimentoEncontrado,
                tipoMovimento: tipoMovimento,
                siglaMovimento: siglaMovimento,
                statusBanco: statusBanco,
                arquivo: itemDev.arquivo
            });
        });
    }
    
    console.log(`✅ ${pendencias.length} pendências MGM consolidadas`);
    return pendencias;
}

async function carregarDadosCompletosNovo() {
    console.log('🚀 Iniciando carregamento completo da visão MGM...');
    
    try {
        const [textoMovimentos, textoDevolucao, movimentosBanco] = await Promise.all([
            carregarArquivoR2Novo(ARQUIVOS_R2_NOVO.movimentosSiago, 'movimentos_siago.txt'),
            carregarArquivoR2Novo(ARQUIVOS_R2_NOVO.devolucaoCompilada, 'devolucao_compilada.txt'),
            buscarMovimentosDoBancoNovo()
        ]);
        
        dadosMovimentosSiagoNovo = parsearMovimentosSiagoNovo(textoMovimentos);
        dadosDevolucaoCompiladaNovo = parsearDevolucaoCompiladaNovo(textoDevolucao);
        movimentosDoBancoNovo = movimentosBanco;
        
        pendenciasConsolidadasNovo = consolidarPendenciasNovo(
            dadosDevolucaoCompiladaNovo, 
            dadosMovimentosSiagoNovo, 
            movimentosDoBancoNovo
        );
        dadosFiltradosNovo = [...pendenciasConsolidadasNovo];
        
        dadosCarregadosNovo = true;
        
        console.log(`📊 Dados carregados (visão MGM):`);
        console.log(`   - Movimentos Siago: ${Object.keys(dadosMovimentosSiagoNovo).length}`);
        console.log(`   - Itens Devolução: ${dadosDevolucaoCompiladaNovo.length}`);
        console.log(`   - Movimentos Banco: ${movimentosDoBancoNovo.length}`);
        console.log(`   - Pendências Consolidadas: ${pendenciasConsolidadasNovo.length}`);
        
        const loadingElement = document.getElementById('loadingNovo');
        if (loadingElement) loadingElement.style.display = 'none';
        
        atualizarDashboardNovo();
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados (visão MGM):', error);
        const loadingElement = document.getElementById('loadingNovo');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="color: #FC8181; text-align: center; padding: 20px;">
                    <div style="font-size: 36px;">❌</div>
                    <p style="margin-top: 10px;">Erro ao carregar dados MGM</p>
                    <p style="font-size: 12px; color: #718096;">${error.message}</p>
                    <button onclick="carregarDadosCompletosNovo()" style="margin-top: 10px; padding: 8px 20px; background: #4299E1; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Tentar novamente
                    </button>
                </div>
            `;
        }
        return false;
    }
}

function atualizarDashboardNovo() {
    console.log('🔄 Atualizando dashboard (visão MGM)...');
    
    const containerNovo = document.getElementById('dashboardNovo');
    if (!containerNovo) {
        console.warn('⚠️ Container da visão MGM não encontrado');
        return;
    }
    
    const dadosExibir = abaAtualNovo === 'mgm' 
        ? dadosFiltradosNovo 
        : dadosFiltradosNovo.filter(p => p.status === 'PENDENTE' || p.status === 'PARCIAL');
    
    atualizarKPIsNovo(dadosExibir);
    renderizarListaPendenciasNovo(dadosExibir);
    renderizarGraficosNovo(dadosExibir);
    
    const totalRegistros = document.getElementById('totalRegistrosNovo');
    if (totalRegistros) {
        totalRegistros.textContent = `${dadosExibir.length} pendências`;
    }
    
    console.log(`✅ Dashboard MGM atualizado com ${dadosExibir.length} registros`);
}

function atualizarKPIsNovo(pendencias) {
    const container = document.getElementById('kpiGridNovo');
    if (!container) return;
    
    const total = pendencias.length;
    const pendentes = pendencias.filter(p => p.status === 'PENDENTE').length;
    const parciais = pendencias.filter(p => p.status === 'PARCIAL').length;
    const atendidos = pendencias.filter(p => p.status === 'ATENDIDO').length;
    
    const obrasSet = new Set(pendencias.map(p => p.obra));
    const totalObras = obrasSet.size;
    
    let totalQuantidade = 0;
    pendencias.forEach(p => {
        totalQuantidade += p.qtdEsperada || 0;
    });
    
    let totalAtendida = 0;
    pendencias.forEach(p => {
        totalAtendida += p.qtdEncontrada || 0;
    });
    
    container.innerHTML = `
        <div class="kpi-card status-total" style="cursor: default;">
            <div class="kpi-icon">📦</div>
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Total de Pendências</div>
        </div>
        <div class="kpi-card status-pendente" style="cursor: default;">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value">${pendentes + parciais}</div>
            <div class="kpi-label">Abertas (${parciais} parciais)</div>
        </div>
        <div class="kpi-card status-baixado" style="cursor: default;">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${atendidos}</div>
            <div class="kpi-label">Atendidas</div>
        </div>
        <div class="kpi-card" style="cursor: default;">
            <div class="kpi-icon">🏗️</div>
            <div class="kpi-value">${totalObras}</div>
            <div class="kpi-label">Obras Impactadas</div>
        </div>
        <div class="kpi-card status-valor" style="border-color: #48BB78; cursor: default;">
            <div class="kpi-icon">📊</div>
            <div class="kpi-value" style="color: #48BB78; font-size: 20px;">${totalQuantidade.toFixed(0)}</div>
            <div class="kpi-label">Qtd. Total Pendente</div>
        </div>
        <div class="kpi-card status-total" style="border-color: #4299E1; cursor: default;">
            <div class="kpi-icon">📈</div>
            <div class="kpi-value" style="color: #4299E1; font-size: 20px;">${totalAtendida.toFixed(0)}</div>
            <div class="kpi-label">Qtd. Atendida</div>
        </div>
    `;
}

function renderizarListaPendenciasNovo(pendencias) {
    const container = document.getElementById('itemListNovo');
    if (!container) return;
    
    if (!pendencias || pendencias.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma pendência MGM encontrada</p>
                <p class="sub">Tente ajustar os filtros</p>
            </div>
        `;
        return;
    }
    
    const gruposPorObra = {};
    pendencias.forEach(p => {
        const obra = p.obraFormatada || p.obra;
        if (!gruposPorObra[obra]) {
            gruposPorObra[obra] = {
                obra: obra,
                obraRaw: p.obra,
                itens: [],
                totalPendentes: 0,
                totalAtendidos: 0,
                totalParciais: 0
            };
        }
        gruposPorObra[obra].itens.push(p);
        if (p.status === 'PENDENTE') gruposPorObra[obra].totalPendentes++;
        else if (p.status === 'PARCIAL') gruposPorObra[obra].totalParciais++;
        else if (p.status === 'ATENDIDO') gruposPorObra[obra].totalAtendidos++;
    });
    
    let html = `
        <div class="list-header" style="display: grid; grid-template-columns: 120px 1fr 80px 90px 100px; gap: 8px; padding: 8px 12px; background: #F7FAFC; border-radius: 6px; font-weight: 600; font-size: 12px; color: #4A5568; border-bottom: 2px solid #E2E8F0; margin-bottom: 4px;">
            <span>Obra</span>
            <span>Descrição / Status</span>
            <span style="text-align: right;">Qtd</span>
            <span style="text-align: center;">Status</span>
            <span style="text-align: right;">Movimento</span>
        </div>
    `;
    
    for (const obra in gruposPorObra) {
        const grupo = gruposPorObra[obra];
        const isActive = itemSelecionadoNovo && itemSelecionadoNovo.obra === obra;
        const totalPend = grupo.totalPendentes + grupo.totalParciais;
        
        let statusBadgeObra = '';
        if (totalPend > 0) {
            statusBadgeObra = grupo.totalParciais > 0 
                ? '<span class="badge-status" style="background: #FEFCBF; color: #975A16;">⏳ Parcial</span>'
                : '<span class="badge-status pendente">⏳ Pendente</span>';
        } else {
            statusBadgeObra = '<span class="badge-status baixado">✅ Atendido</span>';
        }
        
        html += `
            <div class="item-group-item ${isActive ? 'active' : ''}" onclick="selecionarObraPendenciaNovo('${obra}')" style="display: grid; grid-template-columns: 120px 1fr 80px 90px 100px; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #F7FAFC; cursor: pointer; border-radius: 6px; transition: all 0.15s;">
                <span class="item-code">🏗️ ${obra}</span>
                <span class="item-desc">${grupo.itens.length} itens (${totalPend} pendentes)</span>
                <span style="text-align: right; font-weight: 700; color: #2B6CB0;">${grupo.itens.length}</span>
                <span style="text-align: center;">${statusBadgeObra}</span>
                <span style="text-align: right; font-size: 11px; color: #718096;">
                    ${totalPend > 0 ? 'Pendente' : 'Atendido'}
                </span>
            </div>
        `;
        
        if (isActive) {
            grupo.itens.forEach(item => {
                const statusBadge = item.status === 'ATENDIDO' 
                    ? '<span class="badge-status baixado">✅ Atendido</span>'
                    : item.status === 'PARCIAL'
                    ? '<span class="badge-status" style="background: #FEFCBF; color: #975A16;">⏳ Parcial</span>'
                    : '<span class="badge-status pendente">⏳ Pendente</span>';
                
                const movInfo = item.movimentoEncontrado 
                    ? `${item.movimentoEncontrado} (${item.tipoMovimento || '?'})`
                    : 'Nenhum';
                
                const qtdInfo = `${item.qtdEncontrada.toFixed(2)}/${item.qtdEsperada.toFixed(2)}`;
                
                html += `
                    <div style="display: grid; grid-template-columns: 120px 1fr 80px 90px 100px; gap: 8px; padding: 6px 12px 6px 30px; border-bottom: 1px solid #EDF2F7; font-size: 12px; background: #F7FAFC;">
                        <span style="color: #718096; font-size: 11px;">${item.codigo}</span>
                        <span style="color: #4A5568; font-size: 11px;">${item.descricao}</span>
                        <span style="text-align: right; font-weight: 500; font-size: 11px;">${qtdInfo}</span>
                        <span style="text-align: center;">${statusBadge}</span>
                        <span style="text-align: right; font-size: 10px; color: #718096;">${movInfo}</span>
                    </div>
                `;
            });
        }
    }
    
    container.innerHTML = html;
}

function renderizarGraficosNovo(pendencias) {
    const statusCount = {
        'PENDENTE': 0,
        'PARCIAL': 0,
        'ATENDIDO': 0
    };
    
    pendencias.forEach(p => {
        if (statusCount[p.status] !== undefined) {
            statusCount[p.status]++;
        }
    });
    
    const total = Object.values(statusCount).reduce((a, b) => a + b, 0) || 1;
    
    const statusLabels = {
        'PENDENTE': 'Pendentes',
        'PARCIAL': 'Parciais',
        'ATENDIDO': 'Atendidos'
    };
    
    const statusColors = {
        'PENDENTE': 'bar-pendente',
        'PARCIAL': 'bar-parcial',
        'ATENDIDO': 'bar-baixado'
    };
    
    let htmlStatus = '';
    for (const status in statusCount) {
        const value = statusCount[status];
        const percentual = (value / total) * 100;
        const colorClass = statusColors[status];
        
        htmlStatus += `
            <div class="chart-bar-indicator">
                <span class="label">${statusLabels[status]}</span>
                <div class="bar-track">
                    <div class="bar-fill ${colorClass}" style="width: ${percentual}%;">
                        <span class="value">${value}</span>
                    </div>
                </div>
                <span class="percent">${percentual.toFixed(0)}%</span>
            </div>
        `;
    }
    
    document.getElementById('statusChartNovo').innerHTML = htmlStatus;
    
    const obrasSet = new Set(pendencias.map(p => p.obra));
    const obrasComPendencia = new Set(
        pendencias.filter(p => p.status === 'PENDENTE' || p.status === 'PARCIAL')
            .map(p => p.obra)
    );
    
    const obrasAtendidas = new Set(
        pendencias.filter(p => p.status === 'ATENDIDO')
            .map(p => p.obra)
    );
    
    const totalObras = obrasSet.size || 1;
    const obrasPendentes = obrasComPendencia.size;
    const obrasAtendidasCount = obrasAtendidas.size;
    
    let htmlObras = `
        <div class="chart-bar-indicator">
            <span class="label">Com Pendência</span>
            <div class="bar-track">
                <div class="bar-fill bar-pendente" style="width: ${(obrasPendentes / totalObras) * 100}%;">
                    <span class="value">${obrasPendentes}</span>
                </div>
            </div>
            <span class="percent">${((obrasPendentes / totalObras) * 100).toFixed(0)}%</span>
        </div>
        <div class="chart-bar-indicator">
            <span class="label">Atendidas</span>
            <div class="bar-track">
                <div class="bar-fill bar-baixado" style="width: ${(obrasAtendidasCount / totalObras) * 100}%;">
                    <span class="value">${obrasAtendidasCount}</span>
                </div>
            </div>
            <span class="percent">${((obrasAtendidasCount / totalObras) * 100).toFixed(0)}%</span>
        </div>
    `;
    
    document.getElementById('valorChartNovo').innerHTML = htmlObras;
}

function selecionarObraPendenciaNovo(obra) {
    console.log(`🔍 Selecionando obra MGM: ${obra}`);
    if (itemSelecionadoNovo && itemSelecionadoNovo.obra === obra) {
        itemSelecionadoNovo = null;
    } else {
        itemSelecionadoNovo = { obra: obra };
    }
    atualizarDashboardNovo();
}

function trocarAbaNovo(aba) {
    console.log(`🔄 Trocando para aba: ${aba} (visão MGM)`);
    abaAtualNovo = aba;
    itemSelecionadoNovo = null;
    
    document.querySelectorAll('.btn-aba-novo').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.aba === aba);
    });
    
    const listTitle = document.getElementById('listTitleNovo');
    if (listTitle) {
        const titles = {
            'mgm': '📌 Pendências MGM',
            'separacao': '📦 Pendências Separação'
        };
        listTitle.textContent = titles[aba] || '📌 Pendências MGM';
    }
    
    atualizarDashboardNovo();
}

function aplicarFiltrosNovo() {
    console.log('🔄 Aplicando filtros (visão MGM)...');
    const filtroStatus = document.getElementById('filterStatusNovo')?.value || 'todos';
    const buscaTexto = document.getElementById('filterBuscaNovo')?.value?.toLowerCase() || '';
    const buscaObra = document.getElementById('filterObraNovo')?.value || '';
    
    let filtrados = [...pendenciasConsolidadasNovo];
    
    if (filtroStatus !== 'todos') {
        filtrados = filtrados.filter(p => p.status === filtroStatus);
    }
    
    if (buscaTexto) {
        filtrados = filtrados.filter(p => 
            p.codigo.toLowerCase().includes(buscaTexto) || 
            p.descricao.toLowerCase().includes(buscaTexto)
        );
    }
    
    if (buscaObra) {
        const obraNorm = normalizarObraNovo(buscaObra);
        filtrados = filtrados.filter(p => 
            p.obra.includes(obraNorm) || 
            p.obraFormatada.includes(buscaObra)
        );
    }
    
    if (abaAtualNovo === 'separacao') {
        filtrados = filtrados.filter(p => p.status === 'PENDENTE' || p.status === 'PARCIAL');
    }
    
    dadosFiltradosNovo = filtrados;
    
    const totalRegistros = document.getElementById('totalRegistrosNovo');
    if (totalRegistros) {
        totalRegistros.textContent = `${filtrados.length} pendências`;
    }
    
    atualizarDashboardNovo();
}

function limparFiltrosNovo() {
    console.log('🧹 Limpando filtros (visão MGM)...');
    document.getElementById('filterStatusNovo').value = 'todos';
    document.getElementById('filterBuscaNovo').value = '';
    document.getElementById('filterObraNovo').value = '';
    dadosFiltradosNovo = [...pendenciasConsolidadasNovo];
    aplicarFiltrosNovo();
}

function exportarPendenciasNovo() {
    console.log('📤 Exportando pendências (visão MGM)...');
    
    const dados = dadosFiltradosNovo.map(p => ({
        'Obra': p.obraFormatada || p.obra,
        'Data': p.data,
        'Código': p.codigo,
        'Descrição': p.descricao,
        'Qtd Esperada': p.qtdEsperada,
        'Qtd Encontrada': p.qtdEncontrada,
        'Status': p.status,
        'Motivo': p.motivo,
        'Movimento': p.movimentoEncontrado || '',
        'Tipo': p.tipoMovimento || '',
        'Sigla': p.siglaMovimento || ''
    }));
    
    if (dados.length === 0) {
        mostrarToast('⚠️ Nenhum dado MGM para exportar', 'warning');
        return;
    }
    
    const headers = Object.keys(dados[0]);
    let csv = headers.join(';') + '\n';
    dados.forEach(row => {
        csv += headers.map(h => {
            let val = row[h] || '';
            if (typeof val === 'string' && val.includes(';')) {
                val = `"${val}"`;
            }
            return val;
        }).join(';') + '\n';
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pendencias_mgm_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    mostrarToast(`✅ ${dados.length} pendências MGM exportadas`, 'success');
}

function criarContainerNovo() {
    console.log('🔧 Criando container da visão MGM...');
    
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) {
        console.error('❌ Dashboard content não encontrado');
        return;
    }
    
    const containerNovo = document.createElement('div');
    containerNovo.id = 'dashboardNovo';
    containerNovo.style.display = 'block';
    
    containerNovo.innerHTML = `
        <div style="margin-top: 30px; border-top: 2px solid #E2E8F0; padding-top: 20px;">
            <h2 style="color: #2D3748; font-size: 18px; margin-bottom: 15px;">📊 Visão MGM - Pendências Integradas</h2>
        </div>
        
        <div class="abas-container" style="margin-top: 0;">
            <button class="btn-aba btn-aba-novo active" data-aba="mgm" onclick="trocarAbaNovo('mgm')">
                📌 Pendências MGM
            </button>
            <button class="btn-aba btn-aba-novo" data-aba="separacao" onclick="trocarAbaNovo('separacao')">
                📦 Pendências Separação
            </button>
        </div>

        <div class="filters-bar">
            <div class="filter-group">
                <label>📊 Status:</label>
                <select id="filterStatusNovo">
                    <option value="todos">Todos</option>
                    <option value="PENDENTE">⏳ Pendente</option>
                    <option value="PARCIAL">⏳ Parcial</option>
                    <option value="ATENDIDO">✅ Atendido</option>
                </select>
            </div>
            <div class="filter-group">
                <label>🔍 Buscar:</label>
                <input type="text" id="filterBuscaNovo" placeholder="Código ou descrição..." style="width: 180px;">
            </div>
            <div class="filter-group">
                <label>🏗️ Obra:</label>
                <input type="text" id="filterObraNovo" placeholder="Número da obra..." style="width: 140px;">
            </div>
            <button class="btn-filter primary" onclick="aplicarFiltrosNovo()">🔍 Filtrar</button>
            <button class="btn-filter secondary" onclick="limparFiltrosNovo()">🧹 Limpar</button>
            <button class="btn-filter primary" onclick="exportarPendenciasNovo()" style="background: #48BB78;">📤 Exportar</button>
            <span class="total-registros" id="totalRegistrosNovo">0 pendências</span>
        </div>

        <div id="loadingNovo" style="padding: 40px; text-align: center;">
            <div class="spinner" style="margin: 0 auto; width: 40px; height: 40px; border: 4px solid #E2E8F0; border-top-color: #ED8936; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p style="margin-top: 15px; color: #718096;">Carregando dados da visão MGM...</p>
        </div>

        <div class="kpi-grid" id="kpiGridNovo">
            <div class="loading-dashboard" style="min-height: 60px; grid-column: 1 / -1;">
                <div class="spinner"></div>
            </div>
        </div>

        <div class="dashboard-main">
            <div class="dashboard-card">
                <h3 id="listTitleNovo">📌 Pendências MGM</h3>
                <div id="itemListNovo" class="item-group-list">
                    <div class="loading-dashboard">
                        <div class="spinner"></div>
                        <p>Carregando itens...</p>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-card">
                <h3>📋 Detalhes</h3>
                <div id="itemDetailsNovo" class="item-details-panel">
                    <div class="empty-state-dashboard">
                        <div class="icon">👆</div>
                        <p>Selecione uma obra para ver os detalhes</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="dashboard-charts">
            <div class="dashboard-card">
                <h3>📊 Status das Pendências</h3>
                <div id="statusChartNovo" class="chart-container">
                    <div class="loading-dashboard" style="min-height: 100px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>

            <div class="dashboard-card">
                <h3>🏗️ Situação das Obras</h3>
                <div id="valorChartNovo" class="chart-container">
                    <div class="loading-dashboard" style="min-height: 100px;">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    dashboardContent.appendChild(containerNovo);
    console.log('✅ Container da visão MGM criado!');
}

// ============================================
// FUNÇÕES ORIGINAIS DO DASHBOARD (SEPARAÇÃO)
// ============================================

// ... (TODAS as funções originais do dashboard - criarMeses, filtrarPorMes, criarAbas, trocarAba, aplicarFiltros, limparFiltros, agruparItensPorCodigo, agruparPorObra, renderizarDashboard, renderizarKPIsMateriais, renderizarKPIsObras, renderizarListaItens, renderizarListaObras, selecionarObra, renderizarDetalhesObra, selecionarItem, renderizarDetalhes, renderizarGraficos)

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 DOM carregado, iniciando dashboard Pendência de Requisição...');
    
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
        await carregarPosicaoEstoque();
        
        console.log('📡 Iniciando busca de dados (Pendência de Baixa)...');
        
        const startTime = Date.now();
        
        dadosCompletos = await buscarPendenciasBaixa();
        
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} pendências carregadas em ${elapsed}ms`);
        
        let totalItens = 0;
        dadosCompletos.forEach(p => {
            if (p.itens) {
                totalItens += p.itens.length;
            }
        });
        console.log(`📦 Total de itens encontrados: ${totalItens}`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhuma pendência de requisição encontrada');
            mostrarToast('⚠️ Nenhuma pendência de requisição encontrada', 'warning');
        }
        
        criarAbas();
        criarMeses();
        aplicarFiltros();
        
        // ============================================
        // INICIALIZAR A VISÃO MGM
        // ============================================
        criarContainerNovo();
        
        setTimeout(() => {
            carregarDadosCompletosNovo();
        }, 500);
        
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
// EXPORTAR FUNÇÕES PARA USO GLOBAL
// ============================================

window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.selecionarItem = selecionarItem;
window.selecionarObra = selecionarObra;
window.trocarAba = trocarAba;
window.renderizarDashboard = renderizarDashboard;
window.filtrarPorMes = filtrarPorMes;
window.aplicarFiltroCard = aplicarFiltroCard;

window.trocarAbaNovo = trocarAbaNovo;
window.aplicarFiltrosNovo = aplicarFiltrosNovo;
window.limparFiltrosNovo = limparFiltrosNovo;
window.selecionarObraPendenciaNovo = selecionarObraPendenciaNovo;
window.exportarPendenciasNovo = exportarPendenciasNovo;
window.carregarDadosCompletosNovo = carregarDadosCompletosNovo;

console.log('✅ dashboards-pendencia-requisicao.js inicializado!');