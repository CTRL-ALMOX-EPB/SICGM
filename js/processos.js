// ============================================
// PROCESSOS - LÓGICA COMPLETA COM PASSO A PASSO
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
            descricao: 'Processo completo para gerenciamento de Solicitações de Serviço (SS) emergenciais.',
            status: 'EM_ANDAMENTO',
            etapas: [
                { titulo: '1. Verificar E-mails', descricao: 'Verificar e-mails que Maria Clara envia diariamente com os números das SS\'s atendidas. Procurar no Drive pelo número da SS na pasta da Área Técnica.' },
                { titulo: '2. Verificar Ficha Casada', descricao: 'Conferir se os materiais da ficha batem com os do Drive. Caso não estejam compatíveis, verificar com Rafael ou Maria Clara.' },
                { titulo: '3. Ficha não está Conosco', descricao: 'Imprimir a ficha e passar os materiais e quantidades para a planilha de controle.' },
                { titulo: '4. Verificar se SS tem Obra', descricao: 'Consultar planilha da Energisa "Acionamento Control 2024 1". Filtrar pelo número da SS e procurar a coluna "Nº Obra".' },
                { titulo: '5. Realizar RMA', descricao: 'Acessar SIAGO -> Movimentos -> 4 -> 3 -> 2. Preencher campos com dados da obra.' },
                { titulo: '6. Realizar DMA', descricao: 'Acessar SIAGO -> Movimentos -> 4 -> 4 -> 1. Preencher campos com dados da obra.' },
                { titulo: '7. Preencher Planilha Energisa', descricao: 'Preencher coluna "dt RMA/DMA" com a data da baixa. Senha: 784224.' },
                { titulo: '8. Transformadores', descricao: 'Verificar fotos no Drive. Passar dados do transformador para planilha de controle.' },
                { titulo: '9. Falta de Saldo', descricao: 'Verificar saldo em outras bases e realizar transferência (SIAGO -> Movimentos -> 4 -> 5 -> 1).' },
                { titulo: '10. Guardar SS\'s', descricao: 'Guardar SS\'s em ordem numérica na pasta "Solicitação de Serviço Emergencial (SS) 2024".' }
            ],
            expanded: false,
            etapaAtual: 0
        }
    ]
};

// ============================================
// FUNÇÃO DE NAVEGAÇÃO CORRIGIDA (CAMINHO ABSOLUTO)
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

        const processos = linhas.map(line => {
            const partes = line.split('|').map(p => p.trim());
            const id = partes[0];
            const nome = partes[1];
            const descricao = partes[2];
            const etapasRaw = partes.slice(3).filter(e => e);
            
            const etapas = etapasRaw.map(etapa => {
                const parts = etapa.split(':');
                const titulo = parts[0].trim();
                const descricao = parts.slice(1).join(':').trim();
                return { titulo, descricao };
            });
            
            return {
                id,
                nome,
                descricao,
                status: 'EM_ANDAMENTO',
                etapas,
                expanded: false,
                etapaAtual: 0
            };
        });

        return processos.length > 0 ? processos : (DADOS_FALLBACK[depto] || []);
    } catch (error) {
        console.error('Erro ao carregar processos, usando fallback:', error);
        return DADOS_FALLBACK[depto] || [];
    }
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarProcessos(depto, processos) {
    const container = document.getElementById('processosContent');

    let html = `
        <!-- Cabeçalho -->
        <div class="processos-header">
            <h1>
                📚 Passo a Passo dos Processos
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
            const isExpanded = processo.expanded ? 'open' : '';
            
            html += `
                <div class="processo-card" data-id="${processo.id}" data-index="${index}">
                    <!-- Header do Processo -->
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
                    
                    <!-- Descrição -->
                    <div class="processo-descricao">
                        <span>${processo.descricao}</span>
                        <span class="expand-hint ${isExpanded ? 'rotated' : ''}">▼</span>
                    </div>
                    
                    <!-- Workflow Detalhado -->
                    <div class="workflow-container ${isExpanded}" id="workflow-${index}">
                        ${renderizarWorkflow(processo, index)}
                    </div>
                </div>
            `;
        });
    }

    html += `
        </div>
    `;

    container.innerHTML = html;
    
    // Atualiza os estados dos botões após renderizar
    processos.forEach((p, i) => {
        if (p.expanded) {
            atualizarWorkflow(i);
        }
    });
}

// ============================================
// RENDERIZA WORKFLOW
// ============================================

function renderizarWorkflow(processo, index) {
    const { etapas, etapaAtual, id, nome } = processo;
    const totalEtapas = etapas.length;
    
    if (totalEtapas === 0) {
        return `<p style="padding: 20px; color: #A0AEC0;">Este processo não possui etapas detalhadas.</p>`;
    }

    const etapa = etapas[etapaAtual] || etapas[0];

    let html = `
        <!-- Timeline -->
        <div class="workflow-timeline">
    `;

    etapas.forEach((e, idx) => {
        let stepClass = 'pending';
        if (idx < etapaAtual) stepClass = 'completed';
        else if (idx === etapaAtual) stepClass = 'active';
        
        html += `
            <div class="workflow-step-indicator ${stepClass}" onclick="irParaEtapa(${index}, ${idx})" title="Ir para etapa ${idx + 1}">
                <div class="step-circle">${idx + 1}</div>
                <div class="step-label">${e.titulo}</div>
            </div>
        `;
    });

    html += `
        </div>
        
        <!-- Detalhe da Etapa -->
        <div class="workflow-detail" id="workflow-detail-${index}">
            <div class="step-title">
                <span>${etapa.titulo}</span>
                <span class="step-badge">Etapa ${etapaAtual + 1} de ${totalEtapas}</span>
            </div>
            <div class="step-description">
                ${formatarDescricao(etapa.descricao)}
            </div>
            
            <!-- Espaço para imagem futura -->
            <div class="step-image-container">
                <img src="" alt="Imagem da etapa" class="step-image" id="step-image-${index}">
            </div>
            
            <!-- Navegação -->
            <div class="workflow-nav">
                <button class="nav-btn" onclick="irParaEtapa(${index}, ${etapaAtual - 1})" ${etapaAtual === 0 ? 'disabled' : ''}>
                    ← Anterior
                </button>
                <span class="step-counter">${etapaAtual + 1} de ${totalEtapas}</span>
                <button class="nav-btn primary" onclick="irParaEtapa(${index}, ${etapaAtual + 1})" ${etapaAtual === totalEtapas - 1 ? 'disabled' : ''}>
                    Próximo →
                </button>
            </div>
        </div>
        
        <!-- Info adicional -->
        <div class="workflow-info">
            <div class="info-item">
                <div class="info-label">Processo</div>
                <div class="info-value">${id} - ${nome}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Progresso</div>
                <div class="info-value">${Math.round((etapaAtual + 1) / totalEtapas * 100)}%</div>
            </div>
            <div class="info-item">
                <div class="info-label">Etapas</div>
                <div class="info-value">${totalEtapas} etapas</div>
            </div>
        </div>
    `;

    // Adiciona contatos se for o processo específico
    if (id === 'P001') {
        html += `
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
            </div>
        `;
    }

    return html;
}

// ============================================
// FORMATAÇÃO DE DESCRIÇÃO
// ============================================

function formatarDescricao(texto) {
    if (!texto) return 'Descrição não disponível.';
    
    // Formata negritos
    texto = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Formata listas (itens com - ou •)
    texto = texto.replace(/(?:^|\n)\s*[•\-]\s*(.*?)(?=\n|$)/g, '<li>$1</li>');
    if (texto.includes('<li>')) {
        texto = texto.replace(/(<li>.*?<\/li>\s*)+/g, '<ul>$&</ul>');
    }
    
    // Quebras de linha
    texto = texto.replace(/\n/g, '<br>');
    
    return texto;
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
                if (btn) btn.innerHTML = 'Ver Passo a Passo <span class="arrow">▼</span>';
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
            btn.innerHTML = 'Ver Passo a Passo <span class="arrow">▼</span>';
        }
    }
    
    // Atualiza hint
    const hint = document.querySelector(`.processo-card[data-index="${index}"] .expand-hint`);
    if (hint) hint.classList.toggle('rotated');
    
    // Se abriu, reseta para a primeira etapa
    if (processo.expanded) {
        processo.etapaAtual = 0;
        atualizarWorkflow(index);
    }
}

function irParaEtapa(index, novaEtapa) {
    if (!window.processos || !window.processos[index]) return;
    
    const processo = window.processos[index];
    const totalEtapas = processo.etapas.length;
    
    if (novaEtapa < 0 || novaEtapa >= totalEtapas) return;
    
    processo.etapaAtual = novaEtapa;
    atualizarWorkflow(index);
}

function atualizarWorkflow(index) {
    if (!window.processos || !window.processos[index]) return;
    
    const processo = window.processos[index];
    const container = document.getElementById(`workflow-${index}`);
    if (!container) return;
    
    // Re-renderiza o workflow
    container.innerHTML = renderizarWorkflow(processo, index);
    
    // Rolagem suave para o detalhe
    setTimeout(() => {
        const detail = document.getElementById(`workflow-detail-${index}`);
        if (detail) {
            detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 200);
}

// ============================================
// FUNÇÃO PARA ADICIONAR IMAGENS FUTURAMENTE
// ============================================

function adicionarImagemEtapa(index, imagemUrl) {
    const img = document.getElementById(`step-image-${index}`);
    if (img) {
        img.src = imagemUrl;
        img.alt = `Imagem da etapa`;
        img.classList.add('show');
    }
}

// ============================================
// EXPORTA FUNÇÕES PARA USO GLOBAL
// ============================================

window.redirecionarParaHome = redirecionarParaHome;
window.toggleProcesso = toggleProcesso;
window.irParaEtapa = irParaEtapa;
window.atualizarWorkflow = atualizarWorkflow;
window.adicionarImagemEtapa = adicionarImagemEtapa;
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
    
    // Mostra loading
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

    // Verifica permissão
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
    
    // Esconde loading e mostra conteúdo
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('active');
        content.style.display = 'block';
        console.log('✅ Página de processos carregada com sucesso!');
    }, 500);
});