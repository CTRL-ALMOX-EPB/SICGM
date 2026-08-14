// ============================================
// PROCESSOS - LÓGICA COMPLETA COM FLUXOGRAMA COMPACTO
// ============================================

// ============================================
// CONFIGURAÇÃO
// ============================================

const DEPARTAMENTOS_DATA = {
    'DCMD': '../data/processos-dcmd.txt',
    'DMPC': '../data/processos-dmpc.txt',
    'DECP': '../data/processos-decp.txt',
    'DEOP': '../data/processos-deop.txt'
};

const DEPARTAMENTOS_NOMES = {
    'DCMD': 'DCMD - Construção e Manutenção da Distribuição',
    'DMPC': 'DMPC - Materiais Próprios Control',
    'DECP': 'DECP - Combate a Perdas',
    'DEOP': 'DEOP - Operacional'
};

// ============================================
// DADOS DE FALLBACK
// ============================================

const DADOS_FALLBACK = {
    'DCMD': [
        {
            id: 'P001',
            nome: 'POP - 01 Processos de Obras Emergenciais "SS"',
            descricao: 'Processo completo para gerenciamento de Solicitações de Serviço (SS) emergenciais, desde o recebimento até a baixa de materiais no sistema.',
            status: 'EM_ANDAMENTO',
            expanded: false,
            fluxo: {
                nodes: [
                    { id: 'INICIO', tipo: 'start', titulo: '📧 Início', descricao: 'Verificar e-mails de Maria Clara', conexoes: ['VERIFICAR_EMAILS'] },
                    { id: 'VERIFICAR_EMAILS', tipo: 'acao', titulo: '📧 Verificar', descricao: 'Verificar e-mails e Drive', conexoes: ['SS_ENCONTRADA'] },
                    { id: 'SS_ENCONTRADA', tipo: 'decisao', titulo: '🔍 SS no Drive?', descricao: 'Procurar SS', conexoes: ['FICHA_CASADA', 'AGUARDAR_OBRA'] },
                    { id: 'FICHA_CASADA', tipo: 'decisao', titulo: '📋 Ficha Casada?', descricao: 'Verificar ficha', conexoes: ['MATERIAIS_BATEM', 'IMPRIMIR_FICHA'] },
                    { id: 'MATERIAIS_BATEM', tipo: 'decisao', titulo: '⚠️ Batem?', descricao: 'Conferir materiais', conexoes: ['LANCAR_PLANILHA', 'CONSULTAR_RAFAEL'] },
                    { id: 'LANCAR_PLANILHA', tipo: 'acao', titulo: '📊 Lançar', descricao: 'Lançar na planilha', conexoes: ['VERIFICAR_OBRA'] },
                    { id: 'CONSULTAR_RAFAEL', tipo: 'call', titulo: '📞 Consultar', descricao: 'Consultar Rafael', conexoes: ['VERIFICAR_EMAILS'] },
                    { id: 'IMPRIMIR_FICHA', tipo: 'acao', titulo: '🖨️ Imprimir', descricao: 'Imprimir ficha', conexoes: ['LANCAR_PLANILHA'] },
                    { id: 'VERIFICAR_OBRA', tipo: 'decisao', titulo: '🔍 Tem obra?', descricao: 'Verificar obra', conexoes: ['RMA', 'AGUARDAR_OBRA'] },
                    { id: 'AGUARDAR_OBRA', tipo: 'acao', titulo: '⏳ Aguardar', descricao: 'Aguardar obra', conexoes: ['RMA'] },
                    { id: 'RMA', tipo: 'rma', titulo: '📦 RMA', descricao: 'Realizar RMA', conexoes: ['DMA'] },
                    { id: 'DMA', tipo: 'dma', titulo: '📋 DMA', descricao: 'Realizar DMA', conexoes: ['ATUALIZAR_PLANILHA'] },
                    { id: 'ATUALIZAR_PLANILHA', tipo: 'acao', titulo: '📊 Atualizar', descricao: 'Atualizar planilhas', conexoes: ['TRANSFORMADOR'] },
                    { id: 'TRANSFORMADOR', tipo: 'decisao', titulo: '⚡ Transformador?', descricao: 'Verificar transformador', conexoes: ['PROCESSAR_TRANSF', 'CONTINUAR'] },
                    { id: 'PROCESSAR_TRANSF', tipo: 'acao', titulo: '🔄 Processar', descricao: 'Processar transformador', conexoes: ['CONTINUAR'] },
                    { id: 'CONTINUAR', tipo: 'decisao', titulo: '📊 Falta saldo?', descricao: 'Verificar saldo', conexoes: ['TRANSFERIR', 'FINALIZAR'] },
                    { id: 'TRANSFERIR', tipo: 'acao', titulo: '🔄 Transferir', descricao: 'Realizar transferência', conexoes: ['FINALIZAR'] },
                    { id: 'FINALIZAR', tipo: 'acao', titulo: '✅ Finalizar', descricao: 'Guardar SS\'s', conexoes: ['FIM'] },
                    { id: 'FIM', tipo: 'fim', titulo: '🏁 Fim', descricao: 'Processo concluído', conexoes: [] }
                ]
            }
        }
    ]
};

// ============================================
// FUNÇÃO DE NAVEGAÇÃO
// ============================================

function redirecionarParaHome() {
    try {
        const sessao = window.verificarSessao();
        if (!sessao) {
            window.location.href = '/SICGM/login.html';
            return;
        }
        
        const perfil = sessao.perfil || 'GESTAO';
        const homeMap = {
            'OPERACIONAL': '/SICGM/home-operacional.html',
            'GESTAO': '/SICGM/home-gestao.html',
            'VISUALIZACAO': '/SICGM/home-visualizacao.html'
        };
        
        const homePage = homeMap[perfil] || '/SICGM/home-gestao.html';
        window.location.href = homePage;
    } catch (e) {
        window.location.href = '/SICGM/index.html';
    }
}

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

async function carregarProcessos(depto) {
    try {
        const filePath = DEPARTAMENTOS_DATA[depto];
        if (!filePath) {
            return DADOS_FALLBACK[depto] || [];
        }

        const response = await fetch(filePath);
        if (!response.ok) {
            return DADOS_FALLBACK[depto] || [];
        }

        const text = await response.text();
        const linhas = text.split('\n')
            .filter(line => line.trim() && !line.startsWith('#'));

        if (linhas.length === 0) {
            return DADOS_FALLBACK[depto] || [];
        }

        const processos = [];
        let processoAtual = null;

        linhas.forEach(line => {
            const partes = line.split('|').map(p => p.trim());
            
            if (partes.length >= 2 && partes[0].match(/^P\d{3}/)) {
                if (processoAtual) {
                    processos.push(processoAtual);
                }
                processoAtual = {
                    id: partes[0],
                    nome: partes[1],
                    descricao: partes[2] || 'Processo sem descrição',
                    status: 'EM_ANDAMENTO',
                    expanded: false,
                    fluxo: { nodes: [] }
                };

                if (partes.length > 3) {
                    const nodesRaw = partes.slice(3).filter(e => e);
                    nodesRaw.forEach(nodeStr => {
                        const [id, tipo, titulo, descricao, ...conexoes] = nodeStr.split(':').map(p => p.trim());
                        if (id && tipo) {
                            processoAtual.fluxo.nodes.push({
                                id,
                                tipo,
                                titulo: titulo || id,
                                descricao: descricao || '',
                                conexoes: conexoes.filter(c => c && c !== 'FIM')
                            });
                        }
                    });
                }
            }
        });

        if (processoAtual) {
            processos.push(processoAtual);
        }

        return processos.length > 0 ? processos : (DADOS_FALLBACK[depto] || []);
    } catch (error) {
        console.error('Erro ao carregar processos:', error);
        return DADOS_FALLBACK[depto] || [];
    }
}

// ============================================
// RENDERIZA FLUXOGRAMA COMPACTO (SVG)
// ============================================

function renderizarFluxogramaCompacto(nodes) {
    if (!nodes || nodes.length === 0) {
        return `
            <div style="padding: 20px; text-align: center; color: #A0AEC0;">
                <p>📭 Este processo não possui fluxograma.</p>
            </div>
        `;
    }

    // Layout compacto
    const larguraNo = 130;
    const alturaNo = 44;
    const espacamentoX = 50;
    const espacamentoY = 60;
    const posicoes = {};
    let larguraMax = 0;
    let alturaMax = 0;

    const root = nodes.find(n => n.tipo === 'start' || n.tipo === 'inicio');
    if (!root) return '<p style="padding: 20px; color: #A0AEC0;">Nó inicial não encontrado.</p>';

    function posicionar(node, x, y) {
        if (posicoes[node.id]) return;
        posicoes[node.id] = { x, y };
        if (x + larguraNo > larguraMax) larguraMax = x + larguraNo;
        if (y + alturaNo > alturaMax) alturaMax = y + alturaNo;

        if (node.conexoes && node.conexoes.length > 0) {
            const numFilhos = node.conexoes.length;
            const totalLargura = numFilhos * (larguraNo + espacamentoX) - espacamentoX;
            const inicioX = x + larguraNo / 2 - totalLargura / 2;

            node.conexoes.forEach((destinoId, index) => {
                const destino = nodes.find(n => n.id === destinoId);
                if (destino) {
                    const filhoX = inicioX + index * (larguraNo + espacamentoX);
                    const filhoY = y + alturaNo + espacamentoY;
                    posicionar(destino, filhoX, filhoY);
                }
            });
        }
    }

    posicionar(root, 20, 20);

    const totalLargura = Math.max(600, larguraMax + 80);
    const totalAltura = Math.max(300, alturaMax + 80);

    let svg = `
        <svg class="fluxograma-svg" viewBox="0 0 ${totalLargura} ${totalAltura}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; background: #FAFAFA; border-radius: 8px; max-height: 500px;">
            <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#A0AEC0" />
                </marker>
            </defs>
    `;

    // Desenha conexões
    nodes.forEach(node => {
        if (node.conexoes && node.conexoes.length > 0) {
            const origem = posicoes[node.id];
            if (!origem) return;

            node.conexoes.forEach((destinoId, index) => {
                const destino = posicoes[destinoId];
                if (!destino) return;

                const x1 = origem.x + larguraNo / 2;
                const y1 = origem.y + alturaNo;
                const x2 = destino.x + larguraNo / 2;
                const y2 = destino.y;
                const midY = (y1 + y2) / 2;
                const label = index === 0 ? 'S' : index === 1 ? 'N' : '';

                svg += `
                    <path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" stroke="#A0AEC0" stroke-width="1.5" fill="none" marker-end="url(#arrowhead)" />
                    ${label ? `<text x="${(x1 + x2) / 2 - 6}" y="${midY - 6}" fill="#718096" font-size="9" font-weight="700">${label}</text>` : ''}
                `;
            });
        }
    });

    // Desenha nós
    Object.keys(posicoes).forEach(nodeId => {
        const pos = posicoes[nodeId];
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const x = pos.x;
        const y = pos.y;
        const w = larguraNo;
        const h = alturaNo;

        const cores = {
            'start': { fill: '#EBF8FF', stroke: '#4299E1', rx: 20 },
            'acao': { fill: '#F7FAFC', stroke: '#4A5568', rx: 6 },
            'decisao': { fill: '#FFFAF0', stroke: '#ED8936', rx: 0, losango: true },
            'inicio': { fill: '#F0FFF4', stroke: '#48BB78', rx: 20 },
            'fim': { fill: '#FFF5F5', stroke: '#FC8181', rx: 20 },
            'call': { fill: '#EBF8FF', stroke: '#4299E1', rx: 6, strokeWidth: 2.5 },
            'rma': { fill: '#EBF8FF', stroke: '#4299E1', rx: 6 },
            'dma': { fill: '#E6FFFA', stroke: '#38B2AC', rx: 6 }
        };

        const cor = cores[node.tipo] || cores['acao'];

        if (cor.losango) {
            const cx = x + w / 2;
            const cy = y + h / 2;
            const metade = Math.min(w, h) / 2 - 4;
            svg += `
                <polygon points="${cx - metade},${cy} ${cx},${cy - metade} ${cx + metade},${cy} ${cx},${cy + metade}"
                         fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="1.5" />
                <text x="${cx}" y="${cy}" font-size="10" font-weight="600" fill="#2D3748" text-anchor="middle" dominant-baseline="central">${node.titulo}</text>
            `;
        } else {
            const rx = cor.rx || 6;
            const strokeWidth = cor.strokeWidth || 1.5;
            svg += `
                <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="${strokeWidth}" />
                <text x="${x + w / 2}" y="${y + h / 2}" font-size="10" font-weight="600" fill="#2D3748" text-anchor="middle" dominant-baseline="central">${node.titulo}</text>
            `;
        }
    });

    svg += `</svg>`;

    // Legenda compacta
    svg += `
        <div style="display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: white; border-radius: 6px; margin-top: 8px; border: 1px solid #E2E8F0;">
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #EBF8FF; border: 1.5px solid #4299E1; border-radius: 50%;"></span> Início
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #F7FAFC; border: 1.5px solid #4A5568; border-radius: 3px;"></span> Ação
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #FFFAF0; border: 1.5px solid #ED8936; transform: rotate(45deg);"></span> Decisão
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #F0FFF4; border: 1.5px solid #48BB78; border-radius: 50%;"></span> Fim
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #EBF8FF; border: 2.5px solid #4299E1; border-radius: 3px;"></span> Call
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #E6FFFA; border: 1.5px solid #38B2AC; border-radius: 3px;"></span> RMA/DMA
            </span>
        </div>
    `;

    return svg;
}

// ============================================
// RENDERIZAÇÃO PRINCIPAL
// ============================================

function renderizarProcessos(depto, processos) {
    const container = document.getElementById('processosContent');

    let html = `
        <div class="processos-header">
            <h1>
                📚 Workflow dos Processos
                <span class="depto-badge">${depto}</span>
            </h1>
            <button class="btn-voltar" onclick="redirecionarParaHome()">← Voltar</button>
        </div>
        <div class="processos-list">
    `;

    if (processos.length === 0) {
        html += `
            <div class="depto-empty">
                <div class="empty-icon">📭</div>
                <h3>Nenhum processo encontrado</h3>
                <p>Não há processos cadastrados para este departamento.</p>
            </div>
        `;
    } else {
        processos.forEach((processo, index) => {
            const isExpanded = processo.expanded || false;
            
            html += `
                <div class="processo-card" data-id="${processo.id}" data-index="${index}">
                    <div class="processo-header" onclick="toggleProcesso(${index})">
                        <div class="processo-info">
                            <span class="processo-id">${processo.id}</span>
                            <span class="processo-nome">${processo.nome}</span>
                        </div>
                        <button class="expand-btn" onclick="event.stopPropagation(); toggleProcesso(${index})">
                            ${isExpanded ? 'Fechar' : 'Ver Workflow'}
                            <span class="arrow ${isExpanded ? 'open' : ''}">▼</span>
                        </button>
                    </div>
                    
                    <!-- DESCRIÇÃO COMPLETA (mantida como estava) -->
                    <div class="processo-descricao">
                        <span>${processo.descricao}</span>
                        <span class="expand-hint ${isExpanded ? 'rotated' : ''}">▼</span>
                    </div>
                    
                    <!-- FLUXOGRAMA COMPACTO (adição) -->
                    <div class="workflow-container ${isExpanded ? 'open' : ''}" id="workflow-${index}">
                        ${processo.fluxo && processo.fluxo.nodes.length > 0 ? 
                            renderizarFluxogramaCompacto(processo.fluxo.nodes) : 
                            `<p style="padding: 20px; color: #A0AEC0; text-align: center;">📭 Este processo não possui fluxograma.</p>`
                        }
                        
                        <!-- Contatos -->
                        ${processo.id === 'P001' ? `
                        <div class="contatos-box">
                            <h4>📞 Contatos para Dúvidas</h4>
                            <div class="contato-item">
                                <span class="contato-icon">👤</span>
                                <span class="contato-nome">Francisco Davi</span>
                                <span class="contato-setor">- Pendências de obras (Energisa)</span>
                            </div>
                            <div class="contato-item">
                                <span class="contato-icon">👤</span>
                                <span class="contato-nome">Elissandra Maria Barbosa</span>
                                <span class="contato-setor">- Pendências de reserva (Energisa)</span>
                            </div>
                            <div class="contato-item">
                                <span class="contato-icon">👤</span>
                                <span class="contato-nome">Maria Clara</span>
                                <span class="contato-setor">- Demais dúvidas sobre SS (Control)</span>
                            </div>
                            <div class="contato-item">
                                <span class="contato-icon">👤</span>
                                <span class="contato-nome">Rafael</span>
                                <span class="contato-setor">- Supervisor (divergências em fichas)</span>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    container.innerHTML = html;
}

// ============================================
// INTERAÇÃO
// ============================================

function toggleProcesso(index) {
    if (!window.processos || !window.processos[index]) return;
    
    const processo = window.processos[index];
    processo.expanded = !processo.expanded;
    
    const container = document.getElementById(`workflow-${index}`);
    if (!container) return;
    
    document.querySelectorAll('.workflow-container.open').forEach(el => {
        if (el.id !== `workflow-${index}`) {
            el.classList.remove('open');
            const idx = parseInt(el.id.split('-')[1]);
            if (window.processos && window.processos[idx]) {
                window.processos[idx].expanded = false;
                const btn = document.querySelector(`.processo-card[data-index="${idx}"] .expand-btn`);
                if (btn) btn.innerHTML = 'Ver Workflow <span class="arrow">▼</span>';
            }
        }
    });
    
    container.classList.toggle('open');
    
    const btn = document.querySelector(`.processo-card[data-index="${index}"] .expand-btn`);
    if (btn) {
        if (processo.expanded) {
            btn.innerHTML = 'Fechar <span class="arrow open">▼</span>';
        } else {
            btn.innerHTML = 'Ver Workflow <span class="arrow">▼</span>';
        }
    }
    
    const hint = document.querySelector(`.processo-card[data-index="${index}"] .expand-hint`);
    if (hint) hint.classList.toggle('rotated');
}

// ============================================
// EXPORTA FUNÇÕES
// ============================================

window.redirecionarParaHome = redirecionarParaHome;
window.toggleProcesso = toggleProcesso;
window.carregarProcessos = carregarProcessos;
window.renderizarProcessos = renderizarProcessos;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando página de processos...');
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const content = document.getElementById('processosContent');
    
    loadingOverlay.style.display = 'flex';
    loadingOverlay.classList.add('active');
    content.style.display = 'none';
    
    const sessao = window.verificarSessao();
    if (!sessao) {
        window.location.href = '/SICGM/login.html';
        return;
    }

    if (sessao.perfil !== 'GESTAO') {
        alert('Acesso restrito a usuários de gestão.');
        redirecionarParaHome();
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const depto = urlParams.get('depto') || 'DCMD';

    const processos = await carregarProcessos(depto);
    window.processos = processos;
    
    renderizarProcessos(depto, processos);
    
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('active');
        content.style.display = 'block';
        console.log('✅ Página carregada com sucesso!');
    }, 500);
});