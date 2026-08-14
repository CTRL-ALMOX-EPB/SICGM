// ============================================
// PROCESSOS - LÓGICA COMPLETA COM PASSO A PASSO
// ============================================

// ============================================
// CONFIGURAÇÃO
// ============================================

const DEPARTAMENTOS_DATA = {
    'DCMD': 'data/processos-dcmd.txt',
    'DMPC': 'data/processos-dmpc.txt',
    'DECP': 'data/processos-decp.txt',
    'DEOP': 'data/processos-deop.txt'
};

const DEPARTAMENTOS_NOMES = {
    'DCMD': 'DCMD - Construção e Manutenção da Distribuição',
    'DMPC': 'DMPC - Materiais Próprios Control',
    'DECP': 'DECP - Combate a Perdas',
    'DEOP': 'DEOP - Operacional'
};

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

async function carregarProcessos(depto) {
    try {
        const filePath = DEPARTAMENTOS_DATA[depto];
        if (!filePath) {
            console.error('Departamento não encontrado:', depto);
            return [];
        }

        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Erro ao carregar dados: ${response.status}`);
        }

        const text = await response.text();
        const linhas = text.split('\n')
            .filter(line => line.trim() && !line.startsWith('#'));

        const processos = linhas.map(line => {
            const partes = line.split('|').map(p => p.trim());
            const id = partes[0];
            const nome = partes[1];
            const descricao = partes[2];
            const etapasRaw = partes.slice(3).filter(e => e);
            
            const etapas = etapasRaw.map(etapa => {
                // Divide o título da descrição
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

        return processos;
    } catch (error) {
        console.error('Erro ao carregar processos:', error);
        return [];
    }
}

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarProcessos(depto, processos) {
    const container = document.getElementById('processosContent');
    const deptoNome = DEPARTAMENTOS_NOMES[depto] || depto;

    let html = `
        <!-- Cabeçalho -->
        <div class="processos-header">
            <h1>
                📚 Passo a Passo dos Processos
                <span class="depto-badge">${depto}</span>
            </h1>
            <a href="home-gestao.html" class="btn-voltar">← Voltar</a>
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
            <img src="" alt="Imagem da etapa" class="step-image" id="step-image-${index}">
            
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
    // Formata negritos
    texto = texto.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Formata listas (itens com - ou •)
    texto = texto.replace(/(?:^|\n)\s*[•\-]\s*(.*?)(?=\n|$)/g, '<li>$1</li>');
    if (texto.includes('<li>')) {
        texto = texto.replace(/<li>.*?<\/li>/g, (match) => {
            return match;
        });
        // Envolve listas em <ul>
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
                // Atualiza texto do botão
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
        img.alt = `Imagem da etapa ${index + 1}`;
        img.classList.add('show');
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    // Loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    const content = document.getElementById('processosContent');
    
    loadingOverlay.classList.add('active');
    content.style.display = 'none';
    
    // Verifica sessão
    const sessao = verificarSessao();
    if (!sessao) {
        window.location.href = 'index.html';
        return;
    }

    // Verifica permissão
    if (sessao.perfil !== 'GESTAO') {
        alert('Acesso restrito a usuários de gestão.');
        window.location.href = 'home-gestao.html';
        return;
    }

    // Pega o departamento da URL
    const urlParams = new URLSearchParams(window.location.search);
    const depto = urlParams.get('depto') || 'DCMD';

    // Carrega e renderiza os processos
    const processos = await carregarProcessos(depto);
    window.processos = processos;
    
    renderizarProcessos(depto, processos);
    
    // Esconde loading
    setTimeout(() => {
        loadingOverlay.classList.remove('active');
        content.style.display = 'block';
    }, 500);
});