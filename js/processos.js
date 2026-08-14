// ============================================
// PROCESSOS - PASSO A PASSO
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
            ]
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
                    etapas: []
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
// RENDERIZAR PASSO A PASSO
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
        let bgColor = '#F7FAFC';
        let borderColor = '#E2E8F0';
        let textColor = '#A0AEC0';
        
        if (idx < etapaAtual) {
            bgColor = '#48BB78';
            borderColor = '#48BB78';
            textColor = 'white';
        } else if (idx === etapaAtual) {
            bgColor = '#ED8936';
            borderColor = '#ED8936';
            textColor = 'white';
        }
        
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

function renderizarProcessos(depto, processos, fluxos) {
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
            
            // Busca o fluxograma correspondente
            const fluxo = fluxos ? fluxos.find(f => f.id === processo.id) : null;
            
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
                        
                        <!-- FLUXOGRAMA (usando o fluxograma.js) -->
                        <div style="margin-top: 10px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
                            <h4 style="color: #2D3748; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                🗺️ Fluxograma Visual
                                <span style="font-size: 10px; color: #718096; font-weight: 400;">(visão geral do processo)</span>
                            </h4>
                            ${fluxo && fluxo.nodes && fluxo.nodes.length > 0 ? 
                                window.renderizarFluxograma ? window.renderizarFluxograma(fluxo.nodes) : 
                                `<p style="padding: 12px; color: #A0AEC0; text-align: center; font-size: 12px;">⚠️ Função de fluxograma não disponível.</p>` :
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
    
    const container = document.getElementById(`workflow-${index}`);
    if (container) {
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

    // Carrega passo a passo
    const processos = await carregarProcessos(depto);
    window.processos = processos;
    
    // Carrega fluxograma (usando o fluxograma.js)
    let fluxos = [];
    if (typeof window.carregarFluxograma === 'function') {
        fluxos = await window.carregarFluxograma(depto);
        console.log(`📊 ${fluxos.length} fluxogramas carregados`);
    }
    
    renderizarProcessos(depto, processos, fluxos);
    
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('active');
        content.style.display = 'block';
        console.log('✅ Página carregada com sucesso!');
    }, 500);
});