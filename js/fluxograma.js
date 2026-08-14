// ============================================
// FLUXOGRAMA - LÓGICA COMPLETA (HORIZONTAL)
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
// RENDERIZAR SVG DO FLUXOGRAMA (HORIZONTAL)
// ============================================

function renderizarFluxograma(nodes) {
    if (!nodes || nodes.length === 0) {
        return `
            <div style="padding: 20px; text-align: center; color: #A0AEC0; font-size: 13px;">
                📭 Este processo não possui fluxograma.
            </div>
        `;
    }

    // Layout horizontal (esquerda → direita)
    const larguraNo = 110;
    const alturaNo = 38;
    const espacamentoX = 30;
    const espacamentoY = 60;
    const posicoes = {};
    let larguraMax = 0;
    let alturaMax = 0;

    // Encontra o nó raiz
    const root = nodes.find(n => n.tipo === 'start' || n.tipo === 'inicio');
    if (!root) {
        return `<p style="padding: 20px; color: #A0AEC0; text-align: center;">Nó inicial não encontrado.</p>`;
    }

    function posicionar(node, x, y) {
        if (posicoes[node.id]) return;
        posicoes[node.id] = { x, y };
        if (x + larguraNo > larguraMax) larguraMax = x + larguraNo;
        if (y + alturaNo > alturaMax) alturaMax = y + alturaNo;

        if (node.conexoes && node.conexoes.length > 0) {
            const numFilhos = node.conexoes.length;
            const inicioY = y - (numFilhos - 1) * (alturaNo + espacamentoY) / 2;

            node.conexoes.forEach((destinoId, index) => {
                const destino = nodes.find(n => n.id === destinoId);
                if (destino) {
                    const filhoX = x + larguraNo + espacamentoX;
                    const filhoY = inicioY + index * (alturaNo + espacamentoY);
                    posicionar(destino, filhoX, filhoY);
                }
            });
        }
    }

    posicionar(root, 15, 15);

    const totalLargura = Math.max(600, larguraMax + 30);
    const totalAltura = Math.max(300, alturaMax + 30);

    let svg = `
        <svg viewBox="0 0 ${totalLargura} ${totalAltura}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; background: #FAFAFA; border-radius: 8px; max-height: 380px; min-height: 180px; overflow: visible;">
            <defs>
                <marker id="arrowhead" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
                    <polygon points="0 0, 7 2.5, 0 5" fill="#A0AEC0" />
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

                const x1 = origem.x + larguraNo;
                const y1 = origem.y + alturaNo / 2;
                const x2 = destino.x;
                const y2 = destino.y + alturaNo / 2;
                const midX = (x1 + x2) / 2;
                const label = index === 0 ? 'S' : index === 1 ? 'N' : '';

                svg += `
                    <path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" stroke="#A0AEC0" stroke-width="1.5" fill="none" marker-end="url(#arrowhead)" />
                    ${label ? `<text x="${midX - 5}" y="${(y1 + y2) / 2 - 6}" fill="#718096" font-size="8" font-weight="700">${label}</text>` : ''}
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
            'start': { fill: '#EBF8FF', stroke: '#4299E1', rx: 16 },
            'acao': { fill: '#F7FAFC', stroke: '#4A5568', rx: 5 },
            'decisao': { fill: '#FFFAF0', stroke: '#ED8936', rx: 0, losango: true },
            'inicio': { fill: '#F0FFF4', stroke: '#48BB78', rx: 16 },
            'fim': { fill: '#FFF5F5', stroke: '#FC8181', rx: 16 },
            'call': { fill: '#EBF8FF', stroke: '#4299E1', rx: 5, strokeWidth: 2.5 },
            'rma': { fill: '#EBF8FF', stroke: '#4299E1', rx: 5 },
            'dma': { fill: '#E6FFFA', stroke: '#38B2AC', rx: 5 }
        };

        const cor = cores[node.tipo] || cores['acao'];

        if (cor.losango) {
            const cx = x + w / 2;
            const cy = y + h / 2;
            const metade = Math.min(w, h) / 2 - 3;
            svg += `
                <polygon points="${cx - metade},${cy} ${cx},${cy - metade} ${cx + metade},${cy} ${cx},${cy + metade}"
                         fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="1.5" />
                <text x="${cx}" y="${cy}" font-size="9" font-weight="600" fill="#2D3748" text-anchor="middle" dominant-baseline="central">${node.titulo}</text>
            `;
        } else {
            const rx = cor.rx || 5;
            const strokeWidth = cor.strokeWidth || 1.5;
            svg += `
                <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="${strokeWidth}" />
                <text x="${x + w / 2}" y="${y + h / 2}" font-size="9" font-weight="600" fill="#2D3748" text-anchor="middle" dominant-baseline="central">${node.titulo}</text>
            `;
        }
    });

    svg += `</svg>`;

    // Legenda compacta
    svg += `
        <div style="display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 8px; background: white; border-radius: 4px; margin-top: 4px; border: 1px solid #E2E8F0;">
            <span style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #4A5568;">
                <span style="display: inline-block; width: 9px; height: 9px; background: #EBF8FF; border: 1.5px solid #4299E1; border-radius: 50%;"></span> Início
            </span>
            <span style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #4A5568;">
                <span style="display: inline-block; width: 9px; height: 9px; background: #F7FAFC; border: 1.5px solid #4A5568; border-radius: 3px;"></span> Ação
            </span>
            <span style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #4A5568;">
                <span style="display: inline-block; width: 9px; height: 9px; background: #FFFAF0; border: 1.5px solid #ED8936; transform: rotate(45deg);"></span> Decisão
            </span>
            <span style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #4A5568;">
                <span style="display: inline-block; width: 9px; height: 9px; background: #F0FFF4; border: 1.5px solid #48BB78; border-radius: 50%;"></span> Fim
            </span>
            <span style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #4A5568;">
                <span style="display: inline-block; width: 9px; height: 9px; background: #EBF8FF; border: 2px solid #4299E1; border-radius: 3px;"></span> Call
            </span>
            <span style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #4A5568;">
                <span style="display: inline-block; width: 9px; height: 9px; background: #E6FFFA; border: 1.5px solid #38B2AC; border-radius: 3px;"></span> RMA/DMA
            </span>
            <span style="display: flex; align-items: center; gap: 3px; font-size: 8px; color: #4A5568; margin-left: auto;">
                S = SIM | N = NÃO
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