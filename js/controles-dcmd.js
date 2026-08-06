// ============================================
// CONTROLES DCMD - PAINEL UNIFICADO
// ============================================

console.log('🚀 Iniciando Controles DCMD - Painel...');

const API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';

// ============================================
// MAPEAMENTO DOS TIPOS (6 opções)
// ============================================

const TIPOS = {
    'pendencia': {
        label: 'Pendência de Baixa',
        icon: '📌',
        endpoint: '/pendencia-baixa',
        tabela: 'pendencia_baixa'
    },
    'aditivo': {
        label: 'Aditivo Sistêmico',
        icon: '📝',
        endpoint: '/aditivo-sistemico',
        tabela: 'aditivo_sistemico'
    },
    'aditivo-fisico': {
        label: 'Aditivo Físico',
        icon: '🔧',
        endpoint: '/aditivo-fisico',
        tabela: 'aditivo_fisico'
    },
    'farol': {
        label: 'Farol de Obras',
        icon: '🚦',
        endpoint: '/farol-obras',
        tabela: 'farol_obras'
    },
    'devolucao': {
        label: 'Pendências de Devolução',
        icon: '📦',
        endpoint: '/pendencia-devolucao',
        tabela: 'pendencia_devolucao'
    },
    'movimento': {
        label: 'Controle de Movimentações',
        icon: '📄',
        endpoint: '/movimento',
        tabela: 'movimento'
    }
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let perfilUsuario = 'OPERACIONAL';
let dadosSessao = null;
let tipoAtual = 'pendencia';
let controlesCarregados = [];
let paginaAtual = 1;
let totalPaginas = 1;
let totalRegistros = 0;
let filtrosAplicados = {};
let abortController = null;
let ordenacaoAtual = 'data_desc';

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

function redirecionarParaHome() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (sessao) {
        try {
            const dados = JSON.parse(sessao);
            const homeMap = {
                'OPERACIONAL': '../home-operacional.html',
                'GESTAO': '../home-gestao.html',
                'VISUALIZACAO': '../home-visualizacao.html'
            };
            const homePage = homeMap[dados.perfil] || '../index.html';
            window.location.href = homePage;
        } catch (e) {
            window.location.href = '../index.html';
        }
    } else {
        window.location.href = '../index.html';
    }
}

window.redirecionarParaHome = redirecionarParaHome;

function mostrarToast(mensagem, tipo = 'info') {
    const toastExistente = document.querySelector('.toast-notificacao');
    if (toastExistente) toastExistente.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notificacao toast-${tipo}`;
    toast.innerHTML = mensagem;
    
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '9999',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        transform: 'translateX(120%)',
        transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)'
    });
    
    const cores = {
        sucesso: { background: 'linear-gradient(135deg, #48bb78, #38a169)', color: '#ffffff' },
        erro: { background: 'linear-gradient(135deg, #fc8181, #e53e3e)', color: '#ffffff' },
        info: { background: 'linear-gradient(135deg, #63b3ed, #4299e1)', color: '#ffffff' },
        aviso: { background: 'linear-gradient(135deg, #f6ad55, #ed8936)', color: '#ffffff' }
    };
    
    const cor = cores[tipo] || cores.info;
    toast.style.background = cor.background;
    toast.style.color = cor.color;
    
    document.body.appendChild(toast);
    toast.offsetHeight;
    toast.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
    }, 4000);
}

function carregarDadosUsuario() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (!sessao) {
        window.location.href = '../login.html';
        return null;
    }
    
    try {
        dadosSessao = JSON.parse(sessao);
        perfilUsuario = dadosSessao.perfil || 'OPERACIONAL';
        
        const timestamp = dadosSessao.timestamp || 0;
        const agora = Date.now();
        const oitoHoras = 8 * 60 * 60 * 1000;
        
        if (agora - timestamp > oitoHoras) {
            sessionStorage.removeItem('sessaoSICGM');
            window.location.href = '../login.html';
            return null;
        }
        
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userMatriculaEl = document.getElementById('userMatricula');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) userNameEl.textContent = dadosSessao.nome || 'Usuário';
        if (userRoleEl) userRoleEl.textContent = dadosSessao.perfil || 'OPERACIONAL';
        if (userMatriculaEl) userMatriculaEl.textContent = `Matrícula: ${dadosSessao.matricula || '---'}`;
        if (userAvatarEl) userAvatarEl.textContent = (dadosSessao.nome || 'U')[0].toUpperCase();
        
        return dadosSessao;
    } catch (e) {
        window.location.href = '../login.html';
        return null;
    }
}

// ============================================
// SELECIONAR TIPO
// ============================================

function selecionarTipo(tipo) {
    console.log(`🔄 Selecionando tipo: ${tipo}`);
    
    if (abortController) {
        abortController.abort();
        abortController = null;
        console.log('⛔ Requisição anterior cancelada');
    }
    
    tipoAtual = tipo;
    
    // Atualiza a URL sem recarregar a página
    const url = new URL(window.location);
    url.searchParams.set('tipo', tipo);
    window.history.pushState({}, '', url);
    
    controlesCarregados = [];
    paginaAtual = 1;
    totalPaginas = 1;
    totalRegistros = 0;
    
    document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });
    
    const container = document.getElementById('controlesList');
    if (container) {
        container.innerHTML = '<div class="controles-list-loading"><div class="spinner"></div><p>⏳ Carregando controles...</p></div>';
    }
    
    const paginacaoContainer = document.getElementById('paginacao-container');
    if (paginacaoContainer) {
        paginacaoContainer.innerHTML = '';
    }
    
    document.getElementById('filtro-numero').value = '';
    document.getElementById('filtro-obra').value = '';
    document.getElementById('filtro-data').value = '';
    document.getElementById('filtro-status').value = '';
    document.getElementById('filtro-ordenacao').value = 'data_desc';
    ordenacaoAtual = 'data_desc';
    
    carregarControles(1);
}

window.selecionarTipo = selecionarTipo;

// ============================================
// APLICAR ORDENAÇÃO
// ============================================

function aplicarOrdenacao() {
    const select = document.getElementById('filtro-ordenacao');
    if (select) {
        ordenacaoAtual = select.value;
        carregarControles(1);
    }
}

window.aplicarOrdenacao = aplicarOrdenacao;

// ============================================
// CRIAR NOVO CONTROLE - CORRIGIDO
// ============================================

async function criarNovoControle() {
    if (!dadosSessao) {
        mostrarToast('⚠️ Sessão inválida. Faça login novamente.', 'erro');
        return;
    }
    
    const tipoInfo = TIPOS[tipoAtual];
    console.log(`📝 Criando novo controle do tipo: ${tipoInfo.label}`);
    
    try {
        mostrarToast('⏳ Criando novo controle...', 'info');
        
        const dataAtual = new Date().toISOString().split('T')[0];
        
        const data = {
            obra: '',
            data_programacao: dataAtual,
            criado_por: dadosSessao.matricula || 'Sistema'
        };
        
        if (tipoAtual === 'farol') {
            data.setor = '';
            data.data_recebimento = '';
            data.separador = '';
            data.data_separacao = '';
            data.obra_teve_saida = 'NÃO';
            data.data_saida = '';
            data.aditivo = 'NÃO';
            data.obra_programada = 'NÃO';
            data.devolvida = 'NÃO';
            data.cancelada = 'NÃO';
            data.observacao = '';
        }
        
        if (tipoAtual === 'devolucao') {
            data.data_descarga = '';
            data.encarregado = '';
            data.data_devolucao_fisica = '';
            data.motivo_pendencia = '';
            data.pendencia_por = '';
            data.observacao = '';
        }
        
        if (tipoAtual === 'movimento') {
            data.tipo_movimento = 'RMA';
            data.cod_movimentacao = '';
        }
        
        const url = `${API_URL}${tipoInfo.endpoint}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar controle');
        }
        
        const resultado = await response.json();
        const numero = resultado.numero;
        
        mostrarToast(`✅ ${tipoInfo.icon} #${String(numero).padStart(4, '0')} criado com sucesso!`, 'sucesso');
        
        // Redireciona para o formulário criado
        setTimeout(() => {
            window.location.href = `formulario.html?numero=${numero}&tipo=${tipoAtual}`;
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro ao criar controle:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.criarNovoControle = criarNovoControle;

// ============================================
// CARREGAR CONTROLES - CORRIGIDO COM ORDENAÇÃO
// ============================================

async function carregarControles(pagina = 1) {
    if (abortController) {
        abortController.abort();
        abortController = null;
        console.log('⛔ Requisição anterior cancelada');
    }
    
    abortController = new AbortController();
    const signal = abortController.signal;
    
    const tipoInfo = TIPOS[tipoAtual];
    console.log(`📋 Carregando controles do tipo: ${tipoInfo.label} - Página ${pagina} - Ordenação: ${ordenacaoAtual}`);
    const container = document.getElementById('controlesList');
    if (!container) return;
    
    container.innerHTML = '<div class="controles-list-loading"><div class="spinner"></div><p>⏳ Carregando controles...</p></div>';
    
    const paginacaoContainer = document.getElementById('paginacao-container');
    if (paginacaoContainer) {
        paginacaoContainer.innerHTML = '';
    }
    
    filtrosAplicados = {
        numero: document.getElementById('filtro-numero')?.value || '',
        obra: document.getElementById('filtro-obra')?.value || '',
        data: document.getElementById('filtro-data')?.value || '',
        status: document.getElementById('filtro-status')?.value || ''
    };
    
    const params = new URLSearchParams();
    params.append('page', pagina);
    params.append('limit', 20);
    params.append('ordenacao', ordenacaoAtual);
    
    if (filtrosAplicados.numero) params.append('numero', filtrosAplicados.numero);
    if (filtrosAplicados.obra) params.append('obra', filtrosAplicados.obra);
    if (filtrosAplicados.data) params.append('data', filtrosAplicados.data);
    if (filtrosAplicados.status) params.append('status', filtrosAplicados.status);
    
    const url = `${API_URL}${tipoInfo.endpoint}?${params.toString()}`;
    
    try {
        const response = await fetch(url, { signal });
        
        if (signal.aborted) {
            console.log('⛔ Requisição abortada');
            return;
        }
        
        if (!response.ok) {
            throw new Error('Erro ao carregar controles');
        }
        
        const result = await response.json();
        
        if (signal.aborted) {
            console.log('⛔ Requisição abortada durante processamento');
            return;
        }
        
        let data = [];
        let pagination = { page: 1, limit: 20, total: 0, totalPages: 1 };
        
        if (result && typeof result === 'object') {
            if (Array.isArray(result)) {
                data = result;
                pagination.total = result.length;
                pagination.totalPages = 1;
            } else if (result.data && Array.isArray(result.data)) {
                data = result.data;
                pagination = result.pagination || pagination;
            } else {
                data = Object.values(result).filter(item => typeof item === 'object' && item !== null && item.numero !== undefined);
            }
        }
        
        paginaAtual = pagination.page || 1;
        totalPaginas = pagination.totalPages || 1;
        totalRegistros = pagination.total || data.length;
        
        console.log(`✅ ${data.length} controles carregados (Página ${paginaAtual}/${totalPaginas})`);
        
        controlesCarregados = data;
        renderizarControles(data);
        renderizarPaginacao();
        
        const contador = document.getElementById('filtro-contador');
        if (contador) {
            contador.textContent = `Mostrando ${data.length} de ${totalRegistros} registros`;
        }
        
    } catch (error) {
        if (error.name === 'AbortError' || signal.aborted) {
            console.log('⛔ Requisição cancelada');
            return;
        }
        
        console.error('❌ Erro ao carregar controles:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p>❌ Erro ao carregar controles</p>
                <p style="font-size: 12px; color: #FC8181;">${error.message}</p>
                <button onclick="carregarControles(1)" style="margin-top: 10px; padding: 8px 20px; background: #4299E1; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Tentar novamente
                </button>
            </div>
        `;
        document.getElementById('paginacao-container').innerHTML = '';
    }
}

// ============================================
// RENDERIZAR PAGINAÇÃO
// ============================================

function renderizarPaginacao() {
    const container = document.getElementById('paginacao-container');
    if (!container) return;
    
    if (totalPaginas <= 1 && totalRegistros <= 20) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <div class="paginacao-info">
            <span>Mostrando ${(paginaAtual - 1) * 20 + 1} - ${Math.min(paginaAtual * 20, totalRegistros)} de ${totalRegistros} registros</span>
        </div>
        <div class="paginacao-buttons">
            <button class="btn-paginacao" onclick="carregarControles(1)" ${paginaAtual <= 1 ? 'disabled' : ''}>
                ⏮
            </button>
            <button class="btn-paginacao" onclick="carregarControles(${paginaAtual - 1})" ${paginaAtual <= 1 ? 'disabled' : ''}>
                ◀
            </button>
    `;
    
    let startPage = Math.max(1, paginaAtual - 2);
    let endPage = Math.min(totalPaginas, paginaAtual + 2);
    
    if (startPage > 1) {
        html += `<button class="btn-paginacao" onclick="carregarControles(1)">1</button>`;
        if (startPage > 2) html += `<span class="paginacao-ellipsis">…</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button class="btn-paginacao ${i === paginaAtual ? 'active' : ''}" onclick="carregarControles(${i})">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPaginas) {
        if (endPage < totalPaginas - 1) html += `<span class="paginacao-ellipsis">…</span>`;
        html += `<button class="btn-paginacao" onclick="carregarControles(${totalPaginas})">${totalPaginas}</button>`;
    }
    
    html += `
            <button class="btn-paginacao" onclick="carregarControles(${paginaAtual + 1})" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>
                ▶
            </button>
            <button class="btn-paginacao" onclick="carregarControles(${totalPaginas})" ${paginaAtual >= totalPaginas ? 'disabled' : ''}>
                ⏭
            </button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================
// RENDERIZAR CONTROLES
// ============================================

function renderizarControles(controles) {
    const container = document.getElementById('controlesList');
    if (!container) return;
    
    if (!Array.isArray(controles)) {
        console.warn('⚠️ controles não é um array:', controles);
        container.innerHTML = `
            <div class="empty-state">
                <p style="font-size: 48px;">⚠️</p>
                <p>Erro ao carregar dados</p>
                <p style="font-size: 12px; color: #A0AEC0;">Formato de dados inválido</p>
            </div>
        `;
        return;
    }
    
    if (controles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p style="font-size: 48px;">📭</p>
                <p>Nenhum controle encontrado</p>
                <p style="font-size: 12px; color: #A0AEC0;">Clique em "Novo Controle" para criar um</p>
            </div>
        `;
        return;
    }
    
    const tipoInfo = TIPOS[tipoAtual];
    const isGestao = dadosSessao?.perfil === 'GESTAO';
    
    let html = '';
    controles.forEach((controle, index) => {
        const statusClass = controle.status === 'FINALIZADO' ? 'status-finalizado' : 'status-pendente';
        const statusIcon = controle.status === 'FINALIZADO' ? '✅' : '⏳';
        const qtdItens = controle._itensCount || 0;
        const isFinalizado = controle.status === 'FINALIZADO';
        const isNovo = index === 0 && controles.length > 0;
        
        let infoExtra = '';
        if (tipoAtual === 'movimento' && controle.tipo_movimento) {
            const tipoMap = {
                'RMA': 'RMA',
                'DMA': 'DMA',
                'DMA_SUCATA': 'SUCATA'
            };
            infoExtra = `<p><strong>📋 Tipo:</strong> ${tipoMap[controle.tipo_movimento] || controle.tipo_movimento}</p>`;
        }
        
        const isBranco = !controle.obra || controle.obra === '';
        const obraDisplay = isBranco ? '<span style="color: #FC8181;">⚠️ Em branco</span>' : controle.obra;
        
        const mostrarExcluir = isGestao && !isFinalizado;
        
        html += `
            <div class="controle-card ${isNovo ? 'novo' : ''}" onclick="abrirControle(${controle.numero})" data-numero="${controle.numero}">
                <div class="controle-card-header">
                    <span class="controle-card-numero">
                        ${tipoInfo.icon} #${String(controle.numero).padStart(4, '0')}
                        ${isNovo ? '<span class="card-badge-novo">NOVO</span>' : ''}
                        ${isBranco ? '<span class="card-badge-branco">⚠️</span>' : ''}
                    </span>
                    <span class="controle-card-status ${statusClass}">${statusIcon} ${controle.status || 'PENDENTE'}</span>
                </div>
                <div class="controle-card-body">
                    <p><strong>🏗️ Obra:</strong> ${obraDisplay}</p>
                    <p><strong>📅 Data:</strong> ${controle.data_programacao || '-'}</p>
                    ${tipoAtual === 'movimento' ? infoExtra : `<p><strong>📦 Itens:</strong> ${qtdItens}</p>`}
                </div>
                <div class="controle-card-footer">
                    <span class="controle-card-data">${formatarData(controle.criado_em)}</span>
                    ${mostrarExcluir ? `
                        <button class="btn-remover" onclick="event.stopPropagation(); excluirControle(${controle.numero})" title="Excluir">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    setTimeout(() => {
        const badges = document.querySelectorAll('.card-badge-novo');
        badges.forEach(badge => {
            badge.style.transition = 'opacity 0.5s ease';
            badge.style.opacity = '0';
            setTimeout(() => {
                badge.style.display = 'none';
            }, 500);
        });
        
        const cards = document.querySelectorAll('.controle-card.novo');
        cards.forEach(card => {
            card.classList.remove('novo');
        });
    }, 3000);
}

// ============================================
// ABRIR CONTROLE
// ============================================

function abrirControle(numero) {
    console.log(`📂 Abrindo controle #${numero}`);
    window.location.href = `formulario.html?numero=${numero}&tipo=${tipoAtual}`;
}

window.abrirControle = abrirControle;

// ============================================
// EXCLUIR CONTROLE
// ============================================

async function excluirControle(numero) {
    if (dadosSessao?.perfil !== 'GESTAO') {
        mostrarToast('🔒 Apenas usuários com perfil GESTÃO podem excluir registros.', 'aviso');
        return;
    }
    
    if (!confirm(`⚠️ Tem certeza que deseja EXCLUIR o controle #${String(numero).padStart(4, '0')}?`)) return;
    
    const tipoInfo = TIPOS[tipoAtual];
    const url = `${API_URL}${tipoInfo.endpoint}/${numero}`;
    
    try {
        const response = await fetch(url, { method: 'DELETE' });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao excluir');
        }
        
        mostrarToast('✅ Excluído com sucesso!', 'sucesso');
        carregarControles(paginaAtual);
        
    } catch (error) {
        console.error('❌ Erro ao excluir:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.excluirControle = excluirControle;

// ============================================
// FILTROS
// ============================================

function aplicarFiltros() {
    console.log('🔍 Aplicando filtros...');
    carregarControles(1);
}

window.aplicarFiltros = aplicarFiltros;

function limparFiltros() {
    console.log('🧹 Limpando filtros...');
    document.getElementById('filtro-numero').value = '';
    document.getElementById('filtro-obra').value = '';
    document.getElementById('filtro-data').value = '';
    document.getElementById('filtro-status').value = '';
    carregarControles(1);
}

window.limparFiltros = limparFiltros;

// ============================================
// FORMATAR DATA
// ============================================

function formatarData(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dataString;
    }
}

// ============================================
// NAVEGAÇÃO
// ============================================

function irParaTopo() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function irParaFim() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function controlarBotoesNavegacao() {
    const btnTopo = document.getElementById('btnTopo');
    const btnFim = document.getElementById('btnFim');
    if (!btnTopo || !btnFim) return;
    
    const scrollY = window.scrollY;
    const alturaTotal = document.body.scrollHeight;
    const alturaVisivel = window.innerHeight;
    
    btnTopo.classList.toggle('visivel', scrollY > 200);
    btnFim.classList.toggle('visivel', scrollY + alturaVisivel < alturaTotal - 100);
}

// ============================================
// INICIALIZAÇÃO - CORRIGIDA
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando Controles DCMD - Painel...');
    
    const sessao = carregarDadosUsuario();
    if (!sessao) return;
    
    const params = new URLSearchParams(window.location.search);
    const tipoURL = params.get('tipo');
    
    if (tipoURL && TIPOS[tipoURL]) {
        tipoAtual = tipoURL;
        document.querySelectorAll('.tipo-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tipo === tipoURL);
        });
    }
    
    const btnNovo = document.getElementById('btnNovoControle');
    if (btnNovo) {
        btnNovo.onclick = criarNovoControle;
    }
    
    await carregarControles(1);
    
    window.addEventListener('scroll', controlarBotoesNavegacao);
    window.addEventListener('load', function() {
        setTimeout(controlarBotoesNavegacao, 500);
    });
    window.addEventListener('resize', controlarBotoesNavegacao);
    
    console.log('✅ Inicialização concluída!');
});

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================

window.redirecionarParaHome = redirecionarParaHome;
window.irParaTopo = irParaTopo;
window.irParaFim = irParaFim;
window.carregarControles = carregarControles;
window.criarNovoControle = criarNovoControle;
window.selecionarTipo = selecionarTipo;
window.aplicarFiltros = aplicarFiltros;
window.limparFiltros = limparFiltros;
window.excluirControle = excluirControle;
window.abrirControle = abrirControle;
window.aplicarOrdenacao = aplicarOrdenacao;