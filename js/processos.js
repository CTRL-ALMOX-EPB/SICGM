// ============================================
// PROCESSOS - LÓGICA COMPLETA (PASSO A PASSO + FLUXOGRAMA)
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
// DADOS DE FALLBACK - Com etapas BONITAS
// ============================================

const DADOS_FALLBACK = {
    'DCMD': [
        {
            id: 'P001',
            nome: 'POP - 01 Processos de Obras Emergenciais "SS"',
            descricao: 'Processo completo para gerenciamento de Solicitações de Serviço (SS) emergenciais, desde o recebimento até a baixa de materiais no sistema.',
            status: 'EM_ANDAMENTO',
            expanded: false,
            etapaAtual: 0,
            etapas: [
                { titulo: '📧 1. Verificar E-mails', descricao: 'Verificar e-mails que Maria Clara envia diariamente com os números das SS\'s atendidas. Procurar no Drive pelo número da SS na pasta da Área Técnica.' },
                { titulo: '📧 2. Verificar E-mails e Drive', descricao: 'Verificar e-mails de Maria Clara diariamente. Procurar no Drive pelo número da SS na pasta da Área Técnica.' },
                { titulo: '🔍 3. SS encontrada no Drive?', descricao: 'Procurar no Drive pelo número da SS. Se encontrada, verificar se a ficha já está com a gente.' },
                { titulo: '📋 4. Ficha está conosco (casada)?', descricao: 'Se a ficha já está com a gente (casada) -> conferir se os materiais da ficha batem com os do Drive. Caso não estejam compatíveis, verificar com Rafael (Supervisor) ou Maria Clara.' },
                { titulo: '⚠️ 5. Materiais batem com o Drive?', descricao: 'Conferir se os materiais da ficha batem com os do Drive. Caso não estejam compatíveis verificar com Rafael ou Maria Clara. Documento assinado não pode ser alterado!' },
                { titulo: '📊 6. Lançar na Planilha', descricao: 'Passar materiais e quantidades para a planilha (Almoxarifado -> 15- Gestão de indicadores -> "06 - CONTROLE DE SS EMERGENCIAL 2024"), preenchendo todos os dados.' },
                { titulo: '🔍 7. SS já tem obra?', descricao: 'Verificar na planilha da Energisa "Acionamento Control 2024 1", filtrar número da SS e procurar a coluna "Nº Obra".' },
                { titulo: '📦 8. Realizar RMA dos Materiais', descricao: 'SIAGO -> Movimentos -> 4 -> 3 -> 2. Depósito: 1853, 1854 ou 1855. Verificar se materiais e quantidades disponíveis estão condizentes.' },
                { titulo: '📋 9. Realizar DMA da Obra', descricao: 'SIAGO -> Movimentos -> 4 -> 4 -> 1. Desativação: depósito 1050. Clicar em SUCATA. Transformadores: marcar REFORMA.' },
                { titulo: '📊 10. Atualizar Planilhas', descricao: 'Atualizar planilha de SS. Ir para planilha Energisa, preencher coluna "dt RMA/DMA" com data da baixa. Senha: 784224.' },
                { titulo: '⚡ 11. SS com TRANSFORMADORES?', descricao: 'Verificar fotos no Drive. Imprimir ficha com dados dos transformadores.' },
                { titulo: '🔄 12. Processar Transformadores', descricao: 'Passar dados do transformador de REFORMA para planilha "19 - Controle de Transformadores de Reforma".' },
                { titulo: '📊 13. Falta de saldo?', descricao: 'Verificar saldo em outras bases. Se não houver, informar na coluna "OBSERVAÇÃO DA RMA" que está sem saldo.' },
                { titulo: '🔄 14. Realizar Transferência', descricao: 'SIAGO -> Movimentos -> 4 -> 5 -> 1. Permitido pois SS tem prioridade.' },
                { titulo: '✅ 15. Finalizar e Guardar SS\'s', descricao: 'Guardar SS\'s em ordem numérica na pasta "Solicitação de Serviço Emergencial (SS) 2024". Materiais não baixados devem ser informados na coluna de observação.' }
            ],
            fluxo: {
                nodes: [
                    { id: 'INICIO', tipo: 'start', titulo: '📧 Início', descricao: 'Verificar e-mails', conexoes: ['VERIFICAR'] },
                    { id: 'VERIFICAR', tipo: 'acao', titulo: '📧 Verificar', descricao: 'Verificar e-mails e Drive', conexoes: ['SS_DRIVE'] },
                    { id: 'SS_DRIVE', tipo: 'decisao', titulo: '🔍 SS no Drive?', descricao: 'Procurar SS', conexoes: ['FICHA_CASADA', 'AGUARDAR'] },
                    { id: 'FICHA_CASADA', tipo: 'decisao', titulo: '📋 Ficha Casada?', descricao: 'Verificar ficha', conexoes: ['MATERIAIS_BATEM', 'IMPRIMIR'] },
                    { id: 'MATERIAIS_BATEM', tipo: 'decisao', titulo: '⚠️ Batem?', descricao: 'Conferir materiais', conexoes: ['LANCAR', 'CONSULTAR'] },
                    { id: 'LANCAR', tipo: 'acao', titulo: '📊 Lançar', descricao: 'Lançar na planilha', conexoes: ['VERIFICAR_OBRA'] },
                    { id: 'CONSULTAR', tipo: 'call', titulo: '📞 Consultar', descricao: 'Consultar Rafael', conexoes: ['VERIFICAR'] },
                    { id: 'IMPRIMIR', tipo: 'acao', titulo: '🖨️ Imprimir', descricao: 'Imprimir ficha', conexoes: ['LANCAR'] },
                    { id: 'VERIFICAR_OBRA', tipo: 'decisao', titulo: '🔍 Tem obra?', descricao: 'Verificar obra', conexoes: ['RMA', 'AGUARDAR'] },
                    { id: 'AGUARDAR', tipo: 'acao', titulo: '⏳ Aguardar', descricao: 'Aguardar obra', conexoes: ['RMA'] },
                    { id: 'RMA', tipo: 'rma', titulo: '📦 RMA', descricao: 'Realizar RMA', conexoes: ['DMA'] },
                    { id: 'DMA', tipo: 'dma', titulo: '📋 DMA', descricao: 'Realizar DMA', conexoes: ['ATUALIZAR'] },
                    { id: 'ATUALIZAR', tipo: 'acao', titulo: '📊 Atualizar', descricao: 'Atualizar planilhas', conexoes: ['TRANSFORMADOR'] },
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
        window.location.href = homeMap[perfil] || '/SICGM/home-gestao.html';
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
                    etapaAtual: 0,
                    etapas: [],
                    fluxo: { nodes: [] }
                };

                // Extrai etapas do passo a passo
                if (partes.length > 3) {
                    const etapasRaw = partes.slice(3).filter(e => e);
                    etapasRaw.forEach(etapa => {
                        const parts = etapa.split(':');
                        const titulo = parts[0].trim();
                        const descricao = parts.slice(1).join(':').trim();
                        if (titulo && descricao) {
                            processoAtual.etapas.push({ titulo, descricao });
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
// PASSO A PASSO (CORRIGIDO)
// ============================================

function renderizarPassoAPasso(processo, index) {
    const { etapas, etapaAtual } = processo;
    const totalEtapas = etapas.length;
    
    if (totalEtapas === 0) {
        return `<p style="padding: 20px; color: #A0AEC0; text-align: center;">📭 Este processo não possui etapas detalhadas.</p>`;
    }

    const etapa = etapas[etapaAtual] || etapas[0];

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 15px 0; overflow-x: auto; gap: 3px; position: relative; width: 100%;">
    `;

    etapas.forEach((e, idx) => {
        let stepClass = 'pending';
        let bgColor = '#F7FAFC';
        let borderColor = '#E2E8F0';
        let textColor = '#A0AEC0';
        
        if (idx < etapaAtual) {
            stepClass = 'completed';
            bgColor = '#48BB78';
            borderColor = '#48BB78';
            textColor = 'white';
        } else if (idx === etapaAtual) {
            stepClass = 'active';
            bgColor = '#ED8936';
            borderColor = '#ED8936';
            textColor = 'white';
        }
        
        // Pega apenas o número e o ícone para exibir no círculo
        const tituloCurto = e.titulo.replace(/^\d+\.\s*/, '').substring(0, 2);
        
        html += `
            <div onclick="irParaEtapa(${index}, ${idx})" 
                 style="cursor: pointer; display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 50px; position: relative; z-index: 1;">
                <div style="width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; background: ${bgColor}; border: 3px solid ${borderColor}; color: ${textColor}; transition: all 0.3s; box-shadow: ${idx === etapaAtual ? '0 0 0 4px rgba(237, 137, 54, 0.2)' : 'none'};">
                    ${idx + 1}
                </div>
                <div style="font-size: 8px; color: ${idx === etapaAtual ? '#ED8936' : '#A0AEC0'}; text-align: center; margin-top: 4px; font-weight: ${idx === etapaAtual ? '700' : '400'}; max-width: 55px; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${e.titulo.replace(/^\d+\.\s*/, '').substring(0, 12)}
                </div>
            </div>
        `;
    });

    html += `
        </div>
        
        <div style="background: white; border-radius: 10px; padding: 18px; margin-top: 5px; border: 1px solid #E2E8F0; min-height: 120px;">
            <div style="font-size: 16px; font-weight: 700; color: #2D3748; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span>${etapa.titulo}</span>
                <span style="background: #ED8936; color: white; padding: 2px 12px; border-radius: 12px; font-size: 11px;">${etapaAtual + 1} de ${totalEtapas}</span>
            </div>
            <div style="color: #4A5568; line-height: 1.7; font-size: 14px; background: #F7FAFC; padding: 14px; border-radius: 8px; border-left: 4px solid #ED8936; max-height: 150px; overflow-y: auto;">
                ${formatarDescricao(etapa.descricao)}
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #E2E8F0; flex-wrap: wrap; gap: 8px;">
                <button onclick="irParaEtapa(${index}, ${etapaAtual - 1})" 
                        ${etapaAtual === 0 ? 'disabled' : ''}
                        style="padding: 6px 16px; border: 2px solid #E2E8F0; border-radius: 6px; background: white; color: #4A5568; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 12px; ${etapaAtual === 0 ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                    ← Anterior
                </button>
                <span style="color: #718096; font-size: 12px; font-weight: 500;">${etapaAtual + 1} de ${totalEtapas}</span>
                <button onclick="irParaEtapa(${index}, ${etapaAtual + 1})" 
                        ${etapaAtual === totalEtapas - 1 ? 'disabled' : ''}
                        style="padding: 6px 16px; border: 2px solid #ED8936; border-radius: 6px; background: #ED8936; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 12px; ${etapaAtual === totalEtapas - 1 ? 'opacity: 0.4; cursor: not-allowed;' : ''}">
                    Próximo →
                </button>
            </div>
        </div>
    `;

    return html;
}

// ============================================
// FLUXOGRAMA HORIZONTAL
// ============================================

function renderizarFluxogramaHorizontal(nodes) {
    if (!nodes || nodes.length === 0) {
        return `
            <div style="padding: 15px; text-align: center; color: #A0AEC0; font-size: 13px;">
                📭 Este processo não possui fluxograma.
            </div>
        `;
    }

    const larguraNo = 110;
    const alturaNo = 38;
    const espacamentoX = 35;
    const espacamentoY = 65;
    const posicoes = {};
    let larguraMax = 0;
    let alturaMax = 0;

    const root = nodes.find(n => n.tipo === 'start' || n.tipo === 'inicio');
    if (!root) return '<p style="padding: 20px; color: #A0AEC0; text-align: center;">Nó inicial não encontrado.</p>';

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

    const totalLargura = Math.max(700, larguraMax + 40);
    const totalAltura = Math.max(350, alturaMax + 40);

    let svg = `
        <svg viewBox="0 0 ${totalLargura} ${totalAltura}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; background: #FAFAFA; border-radius: 8px; max-height: 400px; min-height: 200px;">
            <defs>
                <marker id="arrowhead3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#A0AEC0" />
                </marker>
            </defs>
    `;

    // Conexões
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
                    <path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" stroke="#A0AEC0" stroke-width="1.5" fill="none" marker-end="url(#arrowhead3)" />
                    ${label ? `<text x="${midX - 6}" y="${(y1 + y2) / 2 - 6}" fill="#718096" font-size="9" font-weight="700">${label}</text>` : ''}
                `;
            });
        }
    });

    // Nós
    Object.keys(posicoes).forEach(nodeId => {
        const pos = posicoes[nodeId];
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        const x = pos.x;
        const y = pos.y;
        const w = larguraNo;
        const h = alturaNo;

        const cores = {
            'start': { fill: '#EBF8FF', stroke: '#4299E1', rx: 18 },
            'acao': { fill: '#F7FAFC', stroke: '#4A5568', rx: 5 },
            'decisao': { fill: '#FFFAF0', stroke: '#ED8936', rx: 0, losango: true },
            'inicio': { fill: '#F0FFF4', stroke: '#48BB78', rx: 18 },
            'fim': { fill: '#FFF5F5', stroke: '#FC8181', rx: 18 },
            'call': { fill: '#EBF8FF', stroke: '#4299E1', rx: 5, strokeWidth: 2.5 },
            'rma': { fill: '#EBF8FF', stroke: '#4299E1', rx: 5 },
            'dma': { fill: '#E6FFFA', stroke: '#38B2AC', rx: 5 }
        };

        const cor = cores[node.tipo] || cores['acao'];

        if (cor.losango) {
            const cx = x + w / 2;
            const cy = y + h / 2;
            const metade = Math.min(w, h) / 2 - 4;
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

    // Legenda
    svg += `
        <div style="display: flex; flex-wrap: wrap; gap: 6px; padding: 5px 10px; background: white; border-radius: 6px; margin-top: 6px; border: 1px solid #E2E8F0;">
            <span style="display: flex; align-items: center; gap: 4px; font-size: 9px; color: #4A5568;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #EBF8FF; border: 1.5px solid #4299E1; border-radius: 50%;"></span> Início
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 9px; color: #4A5568;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #F7FAFC; border: 1.5px solid #4A5568; border-radius: 3px;"></span> Ação
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 9px; color: #4A5568;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #FFFAF0; border: 1.5px solid #ED8936; transform: rotate(45deg);"></span> Decisão
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 9px; color: #4A5568;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #F0FFF4; border: 1.5px solid #48BB78; border-radius: 50%;"></span> Fim
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 9px; color: #4A5568;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #EBF8FF; border: 2.5px solid #4299E1; border-radius: 3px;"></span> Call
            </span>
            <span style="display: flex; align-items: center; gap: 4px; font-size: 9px; color: #4A5568;">
                <span style="display: inline-block; width: 10px; height: 10px; background: #E6FFFA; border: 1.5px solid #38B2AC; border-radius: 3px;"></span> RMA/DMA
            </span>
        </div>
    `;

    return svg;
}

// ============================================
// FORMATAÇÃO DE DESCRIÇÃO
// ============================================

function formatarDescricao(texto) {
    if (!texto) return 'Descrição não disponível.';
    texto = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    texto = texto.replace(/(?:^|\n)\s*[•\-]\s*(.*?)(?=\n|$)/g, '<li>$1</li>');
    if (texto.includes('<li>')) {
        texto = texto.replace(/(<li>.*?<\/li>\s*)+/g, '<ul style="margin: 8px 0; padding-left: 18px;">$&</ul>');
    }
    texto = texto.replace(/\n/g, '<br>');
    return texto;
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
                    
                    <div class="processo-descricao">
                        <span>${processo.descricao}</span>
                        <span class="expand-hint ${isExpanded ? 'rotated' : ''}">▼</span>
                    </div>
                    
                    <div class="workflow-container ${isExpanded ? 'open' : ''}" id="workflow-${index}">
                        <!-- PASSO A PASSO -->
                        <div style="margin-bottom: 15px;">
                            <h4 style="color: #2D3748; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                📋 Passo a Passo
                                <span style="font-size: 10px; color: #718096; font-weight: 400;">(clique nos números para navegar)</span>
                            </h4>
                            ${renderizarPassoAPasso(processo, index)}
                        </div>
                        
                        <!-- FLUXOGRAMA -->
                        <div style="margin-top: 10px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
                            <h4 style="color: #2D3748; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                🗺️ Fluxograma Visual
                                <span style="font-size: 10px; color: #718096; font-weight: 400;">(visão geral do processo)</span>
                            </h4>
                            ${processo.fluxo && processo.fluxo.nodes.length > 0 ? 
                                renderizarFluxogramaHorizontal(processo.fluxo.nodes) : 
                                `<p style="padding: 12px; color: #A0AEC0; text-align: center; font-size: 12px;">📭 Este processo não possui fluxograma.</p>`
                            }
                        </div>
                        
                        <!-- CONTATOS -->
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

function irParaEtapa(index, novaEtapa) {
    if (!window.processos || !window.processos[index]) return;
    
    const processo = window.processos[index];
    const totalEtapas = processo.etapas.length;
    
    if (novaEtapa < 0 || novaEtapa >= totalEtapas) return;
    
    processo.etapaAtual = novaEtapa;
    
    // Re-renderiza o passo a passo
    const container = document.getElementById(`workflow-${index}`);
    if (container) {
        // Encontra a seção do passo a passo e substitui
        const passoContainer = container.querySelector('.passo-a-passo-container');
        if (passoContainer) {
            passoContainer.innerHTML = renderizarPassoAPasso(processo, index);
        } else {
            // Se não encontrou o container específico, recria a estrutura
            const passoSection = container.querySelector('div[style*="margin-bottom: 15px;"]');
            if (passoSection) {
                passoSection.innerHTML = `
                    <h4 style="color: #2D3748; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        📋 Passo a Passo
                        <span style="font-size: 10px; color: #718096; font-weight: 400;">(clique nos números para navegar)</span>
                    </h4>
                    ${renderizarPassoAPasso(processo, index)}
                `;
            }
        }
        
        // Scroll para o detalhe
        setTimeout(() => {
            const detail = container.querySelector('.workflow-detail');
            if (detail) {
                detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 200);
    }
}

// ============================================
// EXPORTA FUNÇÕES
// ============================================

window.redirecionarParaHome = redirecionarParaHome;
window.toggleProcesso = toggleProcesso;
window.irParaEtapa = irParaEtapa;
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