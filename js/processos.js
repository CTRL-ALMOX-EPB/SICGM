// ============================================
// PROCESSOS - PASSO A PASSO SIMPLIFICADO
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
            etapaAtual: 0,
            etapas: [
                { titulo: '📧 1. Verificar E-mails e Drive', descricao: 'Verificar e-mails que Maria Clara envia diariamente com os números das SS\'s atendidas. Procurar no Drive pelo número da SS na pasta da Área Técnica.' },
                { titulo: '📋 2. Verificar Ficha e Materiais', descricao: 'Se a ficha já está com a gente (casada), conferir se os materiais batem com os do Drive. Caso não estejam compatíveis, consultar Rafael (Supervisor) ou Maria Clara. Se a ficha não estiver conosco (equipes noturnas/interior), imprimir diretamente.' },
                { titulo: '📊 3. Lançar na Planilha de SS', descricao: 'Passar materiais e quantidades para a planilha (Almoxarifado -> 15- Gestão de indicadores -> \'06 - CONTROLE DE SS EMERGENCIAL 2024\'), preenchendo todos os dados solicitados.' },
                { titulo: '🔍 4. Verificar Obra na Energisa', descricao: 'Verificar na planilha da Energisa \'Acionamento Control 2024 1\' se a SS já possui obra (coluna \'Nº Obra\'). Se tiver, preencher a planilha com o número da obra e prosseguir.' },
                { titulo: '📦 5. Realizar RMA e DMA', descricao: 'Acessar SIAGO -> Movimentos -> 4 -> 3 -> 2 para RMA (depósito 1853/1854/1855). Depois SIAGO -> Movimentos -> 4 -> 4 -> 1 para DMA (depósito 1050). Em transformadores, marcar REFORMA em vez de SUCATA. Salvar e atualizar planilha com data da baixa (senha: 784224).' },
                { titulo: '⚡ 6. Verificar Transformadores', descricao: 'Verificar fotos na pasta do Drive para confirmar se os transformadores (retirado e instalado) batem com os códigos da SS. Passar dados do transformador de REFORMA para a planilha \'19 - Controle de Transformadores de Reforma\'.' },
                { titulo: '🔄 7. Verificar Saldo e Transferir', descricao: 'Verificar saldo dos materiais em outras bases. Se houver saldo, realizar transferência (SIAGO -> Movimentos -> 4 -> 5 -> 1). Se não houver, informar na coluna \'OBSERVAÇÃO DA RMA\' que está sem saldo para baixa futura.' },
                { titulo: '✅ 8. RESUMO - Finalizar Processo', descricao: '📌 **Resumo do Processo de SS Emergencial:**\n\n• Verificar e-mails de Maria Clara e localizar SS no Drive\n• Conferir ficha (casada ou não) e materiais\n• Lançar dados na planilha de controle\n• Verificar se SS tem obra na Energisa\n• Realizar RMA e DMA no SIAGO\n• Verificar transformadores (fotos e planilha de reforma)\n• Verificar saldo e transferir se necessário\n• Guardar SS\'s em ordem numérica\n\n📞 **Contatos:**\n• Francisco Davi - Pendências de obras (Energisa)\n• Elissandra Maria - Pendências de reserva (Energisa)\n• Maria Clara - Demais dúvidas sobre SS (Control)\n• Rafael - Supervisor (divergências em fichas)' }
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
// FORMATAÇÃO DE DESCRIÇÃO
// ============================================

function formatarDescricao(texto) {
    if (!texto) return 'Descrição não disponível.';
    texto = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    texto = texto.replace(/\n/g, '<br>');
    return texto;
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
        
        // Extrai apenas o número para exibir no círculo
        const numero = e.titulo.match(/\d+/)?.[0] || (idx + 1);
        
        html += `
            <div onclick="irParaEtapa(${index}, ${idx})" 
                 style="cursor: pointer; display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 40px; position: relative; z-index: 1;">
                <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; background: ${bgColor}; border: 3px solid ${borderColor}; color: ${textColor}; transition: all 0.3s; box-shadow: ${idx === etapaAtual ? '0 0 0 4px rgba(237, 137, 54, 0.2)' : 'none'};">
                    ${numero}
                </div>
                <div style="font-size: 7px; color: ${idx === etapaAtual ? '#ED8936' : '#A0AEC0'}; text-align: center; margin-top: 3px; font-weight: ${idx === etapaAtual ? '700' : '400'}; max-width: 45px; line-height: 1.1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${e.titulo.replace(/^[📧📋📊🔍📦⚡🔄✅]\s*\d+\.\s*/, '').substring(0, 10)}
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
            <div style="color: #4A5568; line-height: 1.7; font-size: 14px; background: #F7FAFC; padding: 14px; border-radius: 8px; border-left: 4px solid ${etapaAtual === totalEtapas - 1 ? '#48BB78' : '#ED8936'}; max-height: 180px; overflow-y: auto;">
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
                            ${isExpanded ? 'Fechar' : 'Ver Passo a Passo'}
                            <span class="arrow ${isExpanded ? 'open' : ''}">▼</span>
                        </button>
                    </div>
                    
                    <div class="processo-descricao">
                        <span>${processo.descricao}</span>
                        <span class="expand-hint ${isExpanded ? 'rotated' : ''}">▼</span>
                    </div>
                    
                    <div class="workflow-container ${isExpanded ? 'open' : ''}" id="workflow-${index}">
                        <div style="margin-bottom: 5px;">
                            <h4 style="color: #2D3748; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                                📋 Passo a Passo
                                <span style="font-size: 10px; color: #718096; font-weight: 400;">(clique nos números para navegar)</span>
                            </h4>
                            ${renderizarPassoAPasso(processo, index)}
                        </div>
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
                if (btn) btn.innerHTML = 'Ver Passo a Passo <span class="arrow">▼</span>';
            }
        }
    });
    
    container.classList.toggle('open');
    
    const btn = document.querySelector(`.processo-card[data-index="${index}"] .expand-btn`);
    if (btn) {
        if (processo.expanded) {
            btn.innerHTML = 'Fechar <span class="arrow open">▼</span>';
        } else {
            btn.innerHTML = 'Ver Passo a Passo <span class="arrow">▼</span>';
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
        const passoSection = container.querySelector('div[style*="margin-bottom: 5px;"]');
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