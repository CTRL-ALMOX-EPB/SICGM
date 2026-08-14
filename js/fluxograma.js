// ============================================
// FLUXOGRAMA - LÓGICA COMPLETA
// ============================================

// ============================================
// CONFIGURAÇÃO
// ============================================

const DADOS_FLUXO = {
    'DCMD': '../data/fluxos-dcmd.txt',
    'DMPC': '../data/fluxos-dmpc.txt',
    'DECP': '../data/fluxos-decp.txt',
    'DEOP': '../data/fluxos-deop.txt'
};

// ============================================
// CARREGAR DADOS DO FLUXOGRAMA
// ============================================

async function carregarFluxograma(depto) {
    try {
        const filePath = DADOS_FLUXO[depto];
        if (!filePath) {
            console.warn('Arquivo de fluxograma não encontrado para:', depto);
            return [];
        }

        const response = await fetch(filePath);
        if (!response.ok) {
            console.warn(`Erro ao carregar fluxograma (${response.status})`);
            return [];
        }

        const text = await response.text();
        const linhas = text.split('\n')
            .filter(line => line.trim() && !line.startsWith('#'));

        const processos = [];
        let processoAtual = null;

        linhas.forEach(line => {
            const partes = line.split('|').map(p => p.trim());
            
            if (partes.length >= 2 && !partes[0].startsWith(' ')) {
                // Nova entrada de processo
                if (processoAtual) {
                    processos.push(processoAtual);
                }
                processoAtual = {
                    id: partes[0],
                    nome: partes[1],
                    nodes: []
                };
            } else if (processoAtual && partes.length >= 6) {
                // Nó do fluxograma
                const [id, tipo, titulo, descricao, ...conexoes] = partes;
                processoAtual.nodes.push({
                    id,
                    tipo,
                    titulo: titulo || 'Nó',
                    descricao: descricao || '',
                    conexoes: conexoes.filter(c => c && c !== 'FIM')
                });
            }
        });

        if (processoAtual) {
            processos.push(processoAtual);
        }

        return processos;
    } catch (error) {
        console.error('Erro ao carregar fluxograma:', error);
        return [];
    }
}

// ============================================
// RENDERIZAR SVG DO FLUXOGRAMA
// ============================================

function renderizarFluxograma(nodes) {
    if (!nodes || nodes.length === 0) {
        return `
            <div class="depto-empty">
                <div class="empty-icon">📭</div>
                <h3>Nenhum fluxograma disponível</h3>
                <p>Não há fluxogramas cadastrados para este processo.</p>
            </div>
        `;
    }

    // Layout automático simples (posicionamento em árvore)
    const layout = calcularLayout(nodes);
    const largura = Math.max(800, layout.largura + 100);
    const altura = Math.max(400, layout.altura + 100);

    let svg = `
        <svg class="fluxograma-svg" viewBox="0 0 ${largura} ${altura}" xmlns="http://www.w3.org/2000/svg">
            <!-- Definição da seta -->
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#A0AEC0" />
                </marker>
                <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ED8936" />
                </marker>
            </defs>
    `;

    // Desenha as conexões (setas)
    nodes.forEach(node => {
        if (node.conexoes && node.conexoes.length > 0) {
            const origem = layout.posicoes[node.id];
            if (!origem) return;

            node.conexoes.forEach((destinoId, index) => {
                const destino = layout.posicoes[destinoId];
                if (!destino) return;

                // Calcula pontos para a seta
                const x1 = origem.x + origem.largura / 2;
                const y1 = origem.y + origem.altura;
                const x2 = destino.x + destino.largura / 2;
                const y2 = destino.y;

                // Desvia para criar curvas
                const midY = (y1 + y2) / 2;
                const label = index === 0 ? 'SIM' : index === 1 ? 'NÃO' : '';

                svg += `
                    <path class="fluxo-arrow" d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" />
                    ${label ? `<text class="arrow-label" x="${(x1 + x2) / 2 - 10}" y="${midY - 8}">${label}</text>` : ''}
                `;
            });
        }
    });

    // Desenha os nós
    Object.keys(layout.posicoes).forEach(nodeId => {
        const pos = layout.posicoes[nodeId];
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const tipo = node.tipo || 'acao';
        const cor = getCorTipo(tipo);
        const icone = getIconeTipo(tipo);
        const titulo = node.titulo || nodeId;

        // Posição do nó
        const x = pos.x;
        const y = pos.y;
        const w = pos.largura || 160;
        const h = pos.altura || 60;

        // Constrói o SVG do nó
        let nodeSvg = '';
        
        if (tipo === 'decisao') {
            // Losango
            const cx = x + w / 2;
            const cy = y + h / 2;
            const metade = Math.min(w, h) / 2;
            nodeSvg = `
                <polygon points="${cx - metade},${cy} ${cx},${cy - metade} ${cx + metade},${cy} ${cx},${cy + metade}"
                         fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="2" />
                <text x="${cx}" y="${cy - 8}" font-size="13" font-weight="600" fill="#2D3748" text-anchor="middle">${icone} ${titulo}</text>
                <text x="${cx}" y="${cy + 14}" font-size="11" fill="#718096" text-anchor="middle">${node.descricao || ''}</text>
            `;
        } else if (tipo === 'inicio' || tipo === 'fim') {
            // Elipse
            const cx = x + w / 2;
            const cy = y + h / 2;
            const rx = w / 2;
            const ry = h / 2;
            nodeSvg = `
                <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="2" />
                <text x="${cx}" y="${cy - 8}" font-size="13" font-weight="600" fill="#2D3748" text-anchor="middle">${icone} ${titulo}</text>
                <text x="${cx}" y="${cy + 14}" font-size="11" fill="#718096" text-anchor="middle">${node.descricao || ''}</text>
            `;
        } else {
            // Retângulo (padrão)
            nodeSvg = `
                <rect class="node-rect" x="${x}" y="${y}" width="${w}" height="${h}" rx="${tipo === 'start' ? 25 : 8}"
                      fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="2" />
                <text class="node-text" x="${x + w / 2}" y="${y + h / 2 - 8}">${icone} ${titulo}</text>
                <text class="node-subtext" x="${x + w / 2}" y="${y + h / 2 + 14}">${node.descricao || ''}</text>
            `;
        }

        svg += `
            <g class="fluxo-node type-${tipo}" data-id="${node.id}">
                ${nodeSvg}
            </g>
        `;
    });

    svg += `</svg>`;

    // Adiciona legenda
    svg += `
        <div class="fluxo-legenda">
            <span class="legenda-item"><span class="legenda-cor start"></span> Início</span>
            <span class="legenda-item"><span class="legenda-cor acao"></span> Ação</span>
            <span class="legenda-item"><span class="legenda-cor decisao"></span> Decisão</span>
            <span class="legenda-item"><span class="legenda-cor inicio"></span> Sucesso</span>
            <span class="legenda-item"><span class="legenda-cor fim"></span> Fim</span>
            <span class="legenda-item"><span class="legenda-cor flag"></span> Flag</span>
            <span class="legenda-item"><span class="legenda-cor call"></span> Call</span>
            <span class="legenda-item"><span class="legenda-cor analisar"></span> Analisar</span>
        </div>
    `;

    return svg;
}

// ============================================
// CALCULAR LAYOUT (POSICIONAMENTO)
// ============================================

function calcularLayout(nodes) {
    const posicoes = {};
    let larguraMax = 0;
    let alturaMax = 0;
    const larguraNo = 160;
    const alturaNo = 60;
    const espacamentoX = 80;
    const espacamentoY = 80;

    // Encontra o nó raiz
    const root = nodes.find(n => n.tipo === 'start' || n.tipo === 'inicio' || !n.conexoes || n.conexoes.length === 0);
    if (!root) return { posicoes: {}, largura: 800, altura: 500 };

    // Posiciona recursivamente
    function posicionar(node, x, y, nivel = 0) {
        if (posicoes[node.id]) return;

        const w = larguraNo;
        const h = alturaNo;
        posicoes[node.id] = { x, y, largura: w, altura: h };

        if (x + w > larguraMax) larguraMax = x + w;
        if (y + h > alturaMax) alturaMax = y + h;

        if (node.conexoes && node.conexoes.length > 0) {
            const numFilhos = node.conexoes.length;
            const totalLargura = numFilhos * (larguraNo + espacamentoX) - espacamentoX;
            const inicioX = x + w / 2 - totalLargura / 2;

            node.conexoes.forEach((destinoId, index) => {
                const destino = nodes.find(n => n.id === destinoId);
                if (destino) {
                    const filhoX = inicioX + index * (larguraNo + espacamentoX);
                    const filhoY = y + h + espacamentoY;
                    posicionar(destino, filhoX, filhoY, nivel + 1);
                }
            });
        }
    }

    posicionar(root, 50, 50);

    return {
        posicoes,
        largura: larguraMax + 100,
        altura: alturaMax + 100
    };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getCorTipo(tipo) {
    const cores = {
        'start': { fill: '#EBF8FF', stroke: '#4299E1' },
        'acao': { fill: '#F7FAFC', stroke: '#4A5568' },
        'decisao': { fill: '#FFFAF0', stroke: '#ED8936' },
        'inicio': { fill: '#F0FFF4', stroke: '#48BB78' },
        'fim': { fill: '#FFF5F5', stroke: '#FC8181' },
        'flag': { fill: '#FAF5FF', stroke: '#9F7AEA' },
        'call': { fill: '#EBF8FF', stroke: '#4299E1' },
        'analisar': { fill: '#FFF5F5', stroke: '#FC8181' }
    };
    return cores[tipo] || cores['acao'];
}

function getIconeTipo(tipo) {
    const icones = {
        'start': '📧',
        'acao': '⚡',
        'decisao': '🔍',
        'inicio': '✅',
        'fim': '🏁',
        'flag': '🚩',
        'call': '📞',
        'analisar': '📊'
    };
    return icones[tipo] || '📌';
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================

window.carregarFluxograma = carregarFluxograma;
window.renderizarFluxograma = renderizarFluxograma;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando fluxograma...');

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

    const urlParams = new URLSearchParams(window.location.search);
    const depto = urlParams.get('depto') || 'DCMD';

    const processos = await carregarFluxograma(depto);

    let html = `
        <div class="processos-header">
            <h1>
                📊 Fluxograma dos Processos
                <span class="depto-badge">${depto}</span>
            </h1>
            <button class="btn-voltar" onclick="window.redirecionarParaHome()">← Voltar</button>
        </div>
        <div class="processos-list">
    `;

    if (processos.length === 0) {
        html += `
            <div class="depto-empty">
                <div class="empty-icon">📭</div>
                <h3>Nenhum fluxograma encontrado</h3>
                <p>Não há fluxogramas cadastrados para este departamento.</p>
            </div>
        `;
    } else {
        processos.forEach((processo, index) => {
            const isExpanded = processo.expanded || false;
            
            html += `
                <div class="processo-card" data-id="${processo.id}">
                    <div class="processo-header" onclick="toggleFluxograma(${index})">
                        <div class="processo-info">
                            <span class="processo-id">${processo.id}</span>
                            <span class="processo-nome">${processo.nome}</span>
                        </div>
                        <button class="expand-btn" onclick="event.stopPropagation(); toggleFluxograma(${index})">
                            ${isExpanded ? 'Fechar' : 'Ver Fluxograma'}
                            <span class="arrow ${isExpanded ? 'open' : ''}">▼</span>
                        </button>
                    </div>
                    <div class="fluxograma-container ${isExpanded ? 'open' : ''}" id="fluxograma-${index}">
                        ${renderizarFluxograma(processo.nodes)}
                    </div>
                </div>
            `;
        });
    }

    html += `</div>`;
    content.innerHTML = html;

    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('active');
        content.style.display = 'block';
        console.log('✅ Fluxograma carregado com sucesso!');
    }, 500);
});

// ============================================
// TOGGLE DO FLUXOGRAMA
// ============================================

function toggleFluxograma(index) {
    const container = document.getElementById(`fluxograma-${index}`);
    if (!container) return;

    const isOpen = container.classList.contains('open');
    
    // Fecha todos
    document.querySelectorAll('.fluxograma-container.open').forEach(el => {
        if (el !== container) {
            el.classList.remove('open');
            const idx = parseInt(el.id.split('-')[1]);
            const btn = document.querySelector(`.processo-card[data-id="${window.processos?.[idx]?.id}"] .expand-btn`);
            if (btn) btn.innerHTML = 'Ver Fluxograma <span class="arrow">▼</span>';
        }
    });

    container.classList.toggle('open');
    
    const card = container.closest('.processo-card');
    const btn = card?.querySelector('.expand-btn');
    if (btn) {
        if (container.classList.contains('open')) {
            btn.innerHTML = 'Fechar <span class="arrow open">▼</span>';
        } else {
            btn.innerHTML = 'Ver Fluxograma <span class="arrow">▼</span>';
        }
    }
}

window.toggleFluxograma = toggleFluxograma;