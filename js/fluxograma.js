// ============================================
// FLUXOGRAMA - LÓGICA COMPLETA (ÁRVORE VERTICAL)
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
            
            if (partes.length >= 2 && partes[0].match(/^P\d{3}/) && !partes[0].startsWith(' ')) {
                if (processoAtual) {
                    processos.push(processoAtual);
                }
                processoAtual = {
                    id: partes[0],
                    nome: partes[1],
                    nodes: []
                };
            } else if (processoAtual && partes.length >= 5) {
                const [id, tipo, titulo, descricao, ...conexoes] = partes;
                processoAtual.nodes.push({
                    id: id,
                    tipo: tipo,
                    titulo: titulo || id,
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
// RENDERIZAR SVG DO FLUXOGRAMA (ÁRVORE VERTICAL)
// ============================================

function renderizarFluxograma(nodes) {
    if (!nodes || nodes.length === 0) {
        return `
            <div style="padding: 20px; text-align: center; color: #A0AEC0; font-size: 14px;">
                📭 Este processo não possui fluxograma.
            </div>
        `;
    }

    // Layout em árvore vertical
    const larguraNo = 160;
    const alturaNo = 50;
    const espacamentoX = 40;
    const espacamentoY = 70;
    const posicoes = {};
    let larguraMax = 0;
    let alturaMax = 0;

    // Encontra o nó raiz
    const root = nodes.find(n => n.tipo === 'start' || n.tipo === 'inicio');
    if (!root) {
        return `<p style="padding: 20px; color: #A0AEC0; text-align: center;">Nó inicial não encontrado.</p>`;
    }

    // Posiciona em árvore (vertical)
    function posicionar(node, x, y, nivel) {
        if (posicoes[node.id]) return;
        posicoes[node.id] = { x, y, nivel: nivel || 0 };
        if (x + larguraNo > larguraMax) larguraMax = x + larguraNo;
        if (y + alturaNo > alturaMax) alturaMax = y + alturaNo;

        if (node.conexoes && node.conexoes.length > 0) {
            const numFilhos = node.conexoes.length;
            const larguraTotal = numFilhos * (larguraNo + espacamentoX);
            const inicioX = x - (larguraTotal / 2) + (larguraNo + espacamentoX) / 2;

            node.conexoes.forEach((destinoId, index) => {
                const destino = nodes.find(n => n.id === destinoId);
                if (destino) {
                    const filhoX = inicioX + index * (larguraNo + espacamentoX);
                    const filhoY = y + alturaNo + espacamentoY;
                    posicionar(destino, filhoX, filhoY, (nivel || 0) + 1);
                }
            });
        }
    }

    // Posiciona a partir da raiz, centralizando
    const larguraTotal = nodes.reduce((acc, node) => {
        if (node.conexoes) return acc + node.conexoes.length;
        return acc;
    }, 0) * (larguraNo + espacamentoX);

    const inicioX = Math.max(20, (larguraTotal || 800) / 2 - larguraNo / 2);
    posicionar(root, inicioX, 20, 0);

    // Ajusta largura e altura
    const totalLargura = Math.max(800, larguraMax + 100);
    const totalAltura = Math.max(400, alturaMax + 80);

    let svg = `
        <div style="overflow-x: auto; overflow-y: auto; max-height: 500px; width: 100%;">
        <svg viewBox="0 0 ${totalLargura} ${totalAltura}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; background: #FAFAFA; border-radius: 8px; min-height: 400px;">
            <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#A0AEC0" />
                </marker>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.1"/>
                </filter>
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
                const label = index === 0 ? 'SIM' : index === 1 ? 'NÃO' : '';

                // Seta com curva
                svg += `
                    <path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" 
                          stroke="#A0AEC0" stroke-width="1.5" fill="none" marker-end="url(#arrowhead)" />
                    ${label ? `<rect x="${(x1 + x2) / 2 - 14}" y="${midY - 10}" width="28" height="16" rx="4" fill="white" stroke="#E2E8F0" stroke-width="1"/>` : ''}
                    ${label ? `<text x="${(x1 + x2) / 2}" y="${midY + 1}" fill="#ED8936" font-size="9" font-weight="700" text-anchor="middle">${label}</text>` : ''}
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

        // Cores por tipo
        const cores = {
            'start': { fill: '#EBF8FF', stroke: '#4299E1', rx: 20, textColor: '#2B6CB0', icon: '📧' },
            'acao': { fill: '#F7FAFC', stroke: '#4A5568', rx: 8, textColor: '#2D3748', icon: '⚡' },
            'decisao': { fill: '#FFFAF0', stroke: '#ED8936', rx: 0, textColor: '#C05621', icon: '🔍', losango: true },
            'inicio': { fill: '#F0FFF4', stroke: '#48BB78', rx: 20, textColor: '#276749', icon: '✅' },
            'fim': { fill: '#FFF5F5', stroke: '#FC8181', rx: 20, textColor: '#9B2C2C', icon: '🏁' },
            'call': { fill: '#EBF8FF', stroke: '#4299E1', rx: 8, textColor: '#2B6CB0', icon: '📞', strokeWidth: 3 },
            'rma': { fill: '#EBF8FF', stroke: '#4299E1', rx: 8, textColor: '#2B6CB0', icon: '📦' },
            'dma': { fill: '#E6FFFA', stroke: '#38B2AC', rx: 8, textColor: '#234E52', icon: '📋' }
        };

        const cor = cores[node.tipo] || cores['acao'];
        const icone = cor.icon || '📌';
        const titulo = node.titulo || node.id;

        // Conteúdo do nó
        let nodeContent = '';

        if (cor.losango) {
            // Losango para decisão
            const cx = x + w / 2;
            const cy = y + h / 2;
            const metade = Math.min(w, h) / 2 - 2;
            nodeContent = `
                <polygon points="${cx - metade},${cy} ${cx},${cy - metade} ${cx + metade},${cy} ${cx},${cy + metade}"
                         fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="2" filter="url(#shadow)" />
                <text x="${cx}" y="${cy - 5}" font-size="11" font-weight="700" fill="${cor.textColor}" text-anchor="middle">${titulo}</text>
                <text x="${cx}" y="${cy + 12}" font-size="8" fill="#718096" text-anchor="middle">${node.descricao || ''}</text>
            `;
        } else {
            // Retângulo
            const rx = cor.rx || 8;
            const strokeWidth = cor.strokeWidth || 2;
            nodeContent = `
                <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="${strokeWidth}" filter="url(#shadow)" />
                <text x="${x + 12}" y="${y + h / 2 - 4}" font-size="13" font-weight="700" fill="${cor.textColor}">${icone}</text>
                <text x="${x + 32}" y="${y + h / 2 - 4}" font-size="11" font-weight="600" fill="${cor.textColor}">${titulo}</text>
                <text x="${x + 32}" y="${y + h / 2 + 14}" font-size="8" fill="#718096">${node.descricao || ''}</text>
            `;
        }

        svg += `
            <g class="fluxo-node" data-id="${node.id}">
                ${nodeContent}
            </g>
        `;
    });

    svg += `</svg></div>`;

    // Legenda
    svg += `
        <div style="display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: white; border-radius: 6px; margin-top: 8px; border: 1px solid #E2E8F0;">
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #EBF8FF; border: 2px solid #4299E1; border-radius: 50%;"></span> Início
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #F7FAFC; border: 2px solid #4A5568; border-radius: 4px;"></span> Ação
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #FFFAF0; border: 2px solid #ED8936; transform: rotate(45deg);"></span> Decisão
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #F0FFF4; border: 2px solid #48BB78; border-radius: 50%;"></span> Fim
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #EBF8FF; border: 3px solid #4299E1; border-radius: 4px;"></span> Call
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 10px; color: #4A5568;">
                <span style="display: inline-block; width: 12px; height: 12px; background: #E6FFFA; border: 2px solid #38B2AC; border-radius: 4px;"></span> RMA/DMA
            </span>
        </div>
    `;

    return svg;
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================

window.carregarFluxograma = carregarFluxograma;
window.renderizarFluxograma = renderizarFluxograma;

console.log('✅ fluxograma.js carregado!');