// ============================================
// PROCESSOS - LÓGICA COMPLETA COM FLUXOGRAMA
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
// DADOS DE FALLBACK (usados se o arquivo não for encontrado)
// ============================================

const DADOS_FALLBACK = {
    'DCMD': [
        {
            id: 'P001',
            nome: 'POP - 01 Processos de Obras Emergenciais "SS"',
            descricao: 'Processo completo para gerenciamento de Solicitações de Serviço (SS) emergenciais.',
            status: 'EM_ANDAMENTO',
            expanded: false,
            // Dados do fluxograma
            fluxo: {
                nodes: [
                    { id: 'INICIO', tipo: 'start', titulo: '📧 Início do Processo', descricao: 'Verificar e-mails diários de Maria Clara com números das SS\'s atendidas.', conexoes: ['VERIFICAR_EMAILS'] },
                    { id: 'VERIFICAR_EMAILS', tipo: 'acao', titulo: '📧 Verificar E-mails', descricao: 'Verificar e-mails que Maria Clara envia diariamente com os números das SS\'s atendidas.', conexoes: ['SS_ENCONTRADA'] },
                    { id: 'SS_ENCONTRADA', tipo: 'decisao', titulo: '🔍 SS encontrada no Drive?', descricao: 'Procurar no Drive pelo número da SS na pasta da Área Técnica.', conexoes: ['FICHA_CASADA', 'AGUARDAR_OBRA'] },
                    { id: 'FICHA_CASADA', tipo: 'decisao', titulo: '📋 Ficha está conosco (casada)?', descricao: 'Verificar se a ficha já está com a gente (equipes próprias).', conexoes: ['MATERIAIS_BATEM', 'IMPRIMIR_FICHA'] },
                    { id: 'MATERIAIS_BATEM', tipo: 'decisao', titulo: '⚠️ Materiais batem com o Drive?', descricao: 'Conferir se os materiais da ficha são compatíveis com os do Drive.', conexoes: ['LANCAR_PLANILHA', 'CONSULTAR_RAFAEL'] },
                    { id: 'LANCAR_PLANILHA', tipo: 'acao', titulo: '📊 Lançar na Planilha', descricao: 'Passar materiais e quantidades para planilha de controle SS Emergencial.', conexoes: ['FIM'] },
                    { id: 'CONSULTAR_RAFAEL', tipo: 'call', titulo: '📞 Consultar Rafael', descricao: 'Verificar divergências com Rafael (Supervisor) ou Maria Clara.', conexoes: ['FIM'] },
                    { id: 'IMPRIMIR_FICHA', tipo: 'acao', titulo: '🖨️ Imprimir Ficha', descricao: 'Imprimir ficha das equipes noturnas/interior. Lançar na planilha.', conexoes: ['FIM'] },
                    { id: 'AGUARDAR_OBRA', tipo: 'acao', titulo: '⏳ Aguardar Obra', descricao: 'SS sem obra definida. Aguardar atribuição na planilha Energisa.', conexoes: ['FIM'] },
                    { id: 'FIM', tipo: 'fim', titulo: '🏁 Finalizar Processo', descricao: 'Guardar SS\'s em ordem numérica na pasta.', conexoes: [] }
                ]
            }
        }
    ]
};

// ============================================
// FUNÇÃO DE NAVEGAÇÃO CORRIGIDA
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
        console.log(`🏠 Redirecionando para: ${homePage}`);
        window.location.href = homePage;
    } catch (e) {
        console.error('Erro ao redirecionar:', e);
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
            console.warn('Departamento não encontrado, usando fallback:', depto);
            return DADOS_FALLBACK[depto] || [];
        }

        const response = await fetch(filePath);
        if (!response.ok) {
            console.warn(`Erro ao carregar dados (${response.status}), usando fallback para:`, depto);
            return DADOS_FALLBACK[depto] || [];
        }

        const text = await response.text();
        const linhas = text.split('\n')
            .filter(line => line.trim() && !line.startsWith('#'));

        if (linhas.length === 0) {
            console.warn('Arquivo vazio, usando fallback para:', depto);
            return DADOS_FALLBACK[depto] || [];
        }

        const processos = [];
        let processoAtual = null;

        linhas.forEach(line => {
            const partes = line.split('|').map(p => p.trim());
            
            // Verifica se é uma nova entrada de processo (começa com ID)
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
                    // Se tiver dados de fluxo (a partir da 4ª posição)
                    fluxo: partes.length > 3 ? {
                        nodes: []
                    } : null
                };

                // Se tiver dados de fluxo, processa os nós
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
        console.error('Erro ao carregar processos, usando fallback:', error);
        return DADOS_FALLBACK[depto] || [];
    }
}

// ============================================
// RENDERIZA O FLUXOGRAMA (SVG)
// ============================================

function renderizarFluxogramaSVG(nodes) {
    if (!nodes || nodes.length === 0) {
        return `
            <div style="padding: 20px; text-align: center; color: #A0AEC0;">
                <p>📭 Este processo não possui fluxograma detalhado.</p>
                <p style="font-size: 12px;">Utilize o formato: ID|NOME|DESCRICAO|NODE_ID:TIPO:TITULO:DESC:CONEXAO1:CONEXAO2</p>
            </div>
        `;
    }

    // Layout automático simples
    const larguraNo = 180;
    const alturaNo = 60;
    const espacamentoX = 80;
    const espacamentoY = 80;
    const posicoes = {};
    let larguraMax = 0;
    let alturaMax = 0;

    // Encontra o nó raiz
    const root = nodes.find(n => n.tipo === 'start' || n.tipo === 'inicio');
    if (!root) return '<p style="padding: 20px; color: #A0AEC0;">Nó inicial não encontrado.</p>';

    // Posiciona recursivamente
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

    posicionar(root, 50, 50);

    const totalLargura = larguraMax + 100;
    const totalAltura = alturaMax + 100;

    let svg = `
        <svg class="fluxograma-svg" viewBox="0 0 ${Math.max(600, totalLargura)} ${Math.max(400, totalAltura)}" xmlns="http://www.w3.org/2000/svg" style="width: 100%; background: #FAFAFA; border-radius: 8px;">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#A0AEC0" />
                </marker>
            </defs>
    `;

    // Desenha as conexões
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

                svg += `
                    <path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" stroke="#A0AEC0" stroke-width="2" fill="none" marker-end="url(#arrowhead)" />
                    ${label ? `<text x="${(x1 + x2) / 2 - 10}" y="${midY - 8}" fill="#718096" font-size="11" font-weight="600">${label}</text>` : ''}
                `;
            });
        }
    });

    // Desenha os nós
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
            'start': { fill: '#EBF8FF', stroke: '#4299E1', rx: 25 },
            'acao': { fill: '#F7FAFC', stroke: '#4A5568', rx: 8 },
            'decisao': { fill: '#FFFAF0', stroke: '#ED8936', rx: 0, losango: true },
            'inicio': { fill: '#F0FFF4', stroke: '#48BB78', rx: 25 },
            'fim': { fill: '#FFF5F5', stroke: '#FC8181', rx: 25 },
            'call': { fill: '#EBF8FF', stroke: '#4299E1', rx: 8, strokeWidth: 3 },
            'analisar': { fill: '#FFF5F5', stroke: '#FC8181', rx: 8, dashed: true }
        };

        const cor = cores[node.tipo] || cores['acao'];

        if (cor.losango) {
            // Losango para decisão
            const cx = x + w / 2;
            const cy = y + h / 2;
            const metade = Math.min(w, h) / 2;
            svg += `
                <polygon points="${cx - metade},${cy} ${cx},${cy - metade} ${cx + metade},${cy} ${cx},${cy + metade}"
                         fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="2" />
                <text x="${cx}" y="${cy}" font-size="12" font-weight="600" fill="#2D3748" text-anchor="middle" dominant-baseline="central">${node.titulo || node.id}</text>
            `;
        } else {
            // Retângulo
            const rx = cor.rx || 8;
            const strokeWidth = cor.strokeWidth || 2;
            const dashed = cor.dashed ? 'stroke-dasharray="6 4"' : '';
            svg += `
                <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${cor.fill}" stroke="${cor.stroke}" stroke-width="${strokeWidth}" ${dashed} />
                <text x="${x + w / 2}" y="${y + h / 2}" font-size="12" font-weight="600" fill="#2D3748" text-anchor="middle" dominant-baseline="central">${node.titulo || node.id}</text>
                ${node.descricao ? `<text x="${x + w / 2}" y="${y + h / 2 + 18}" font-size="10" fill="#718096" text-anchor="middle">${node.descricao}</text>` : ''}
            `;
        }
    });

    svg += `</svg>`;

    // Legenda
    svg += `
        <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 12px 16px; background: white; border-radius: 8px; margin-top: 12px; border: 1px solid #E2E8F0;">
            <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4A5568;">
                <span style="display: inline-block; width: 14px; height: 14px; background: #EBF8FF; border: 2px solid #4299E1; border-radius: 4px;"></span> Início
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4A5568;">
                <span style="display: inline-block; width: 14px; height: 14px; background: #F7FAFC; border: 2px solid #4A5568; border-radius: 4px;"></span> Ação
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4A5568;">
                <span style="display: inline-block; width: 14px; height: 14px; background: #FFFAF0; border: 2px solid #ED8936; transform: rotate(45deg);"></span> Decisão
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4A5568;">
                <span style="display: inline-block; width: 14px; height: 14px; background: #F0FFF4; border: 2px solid #48BB78; border-radius: 50%;"></span> Sucesso
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4A5568;">
                <span style="display: inline-block; width: 14px; height: 14px; background: #FFF5F5; border: 2px solid #FC8181; border-radius: 50%;"></span> Fim
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4A5568;">
                <span style="display: inline-block; width: 14px; height: 14px; background: #EBF8FF; border: 3px solid #4299E1; border-radius: 4px;"></span> Call
            </span>
            <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4A5568;">
                <span style="display: inline-block; width: 14px; height: 14px; background: #FFF5F5; border: 2px dashed #FC8181; border-radius: 4px;"></span> Analisar
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
        <!-- Cabeçalho -->
        <div class="processos-header">
            <h1>
                📚 Workflow dos Processos
                <span class="depto-badge">${depto}</span>
            </h1>
            <button class="btn-voltar" onclick="redirecionarParaHome()">← Voltar</button>
        </div>

        <!-- Lista de Processos -->
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
                    <!-- Header do Processo -->
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
                    
                    <!-- Descrição -->
                    <div class="processo-descricao">
                        <span>${processo.descricao || 'Sem descrição disponível'}</span>
                        <span class="expand-hint ${isExpanded ? 'rotated' : ''}">▼</span>
                    </div>
                    
                    <!-- Fluxograma -->
                    <div class="workflow-container ${isExpanded ? 'open' : ''}" id="workflow-${index}">
                        ${processo.fluxo ? renderizarFluxogramaSVG(processo.fluxo.nodes) : 
                          `<p style="padding: 20px; color: #A0AEC0; text-align: center;">📭 Este processo não possui workflow detalhado.</p>`}
                        
                        <!-- Contatos (se for P001) -->
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

    html += `
        </div>
    `;

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
    
    // Fecha todos os outros workflows
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
    
    // Alterna o atual
    container.classList.toggle('open');
    
    // Atualiza botão
    const btn = document.querySelector(`.processo-card[data-index="${index}"] .expand-btn`);
    if (btn) {
        if (processo.expanded) {
            btn.innerHTML = 'Fechar <span class="arrow open">▼</span>';
        } else {
            btn.innerHTML = 'Ver Workflow <span class="arrow">▼</span>';
        }
    }
    
    // Atualiza hint
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
    
    // Loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    const content = document.getElementById('processosContent');
    
    loadingOverlay.style.display = 'flex';
    loadingOverlay.classList.add('active');
    content.style.display = 'none';
    
    // Verifica sessão
    const sessao = window.verificarSessao();
    if (!sessao) {
        console.log('🔒 Sessão inválida - Redirecionando para login');
        window.location.href = '/SICGM/login.html';
        return;
    }

    if (sessao.perfil !== 'GESTAO') {
        console.log(`🔒 Perfil ${sessao.perfil} não autorizado`);
        alert('Acesso restrito a usuários de gestão.');
        redirecionarParaHome();
        return;
    }

    console.log(`✅ Usuário autenticado: ${sessao.nome} (${sessao.perfil})`);

    // Pega o departamento da URL
    const urlParams = new URLSearchParams(window.location.search);
    const depto = urlParams.get('depto') || 'DCMD';
    console.log(`📂 Departamento selecionado: ${depto}`);

    // Carrega e renderiza os processos
    const processos = await carregarProcessos(depto);
    window.processos = processos;
    console.log(`📋 ${processos.length} processos carregados`);
    
    renderizarProcessos(depto, processos);
    
    // Esconde loading
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('active');
        content.style.display = 'block';
        console.log('✅ Página de processos carregada com sucesso!');
    }, 500);
});