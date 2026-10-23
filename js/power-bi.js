// ============================================
// POWER BI - PÁGINA DE INDICADORES
// Controla abas, iframe, loading, fullscreen,
// status bar e validação de login.
// ============================================

console.log('📊 power-bi.js carregado');

// ============================================
// CATÁLOGO DE BIs DISPONÍVEIS
// Para adicionar um novo BI:
//   1. Inclua um objeto aqui com ativo: true e a URL
//   2. Adicione um botão no HTML com data-bi="chave"
// ============================================
const BIS = {
    'pendencia-requisicao': {
        titulo: 'Pendência de Requisição',
        url: 'https://app.powerbi.com/view?r=eyJrIjoiMzQyNTFkMjctN2U0My00Njk5LWEwMWItNDMwNGI3NmIyNjljIiwidCI6ImUyNjkyZjMyLTAwNzItNDY5Ni04Yjg0LWEzZjdkOGUxNWUxYSJ9',
        ativo: true
    },
    'aditivos': {
        titulo: 'Aditivos (Físicos e Sistêmicos)',
        url: '',
        ativo: false
    },
    'devolucao': {
        titulo: 'Pendência de Devolução Física',
        url: '',
        ativo: false
    },
    'farol': {
        titulo: 'Farol de Obras',
        url: '',
        ativo: false
    }
};

let biAtual = 'pendencia-requisicao';
let timerFallbackLoading = null;

// ============================================
// VALIDAÇÃO DE LOGIN
// ============================================
function validarLogin() {
    try {
        if (typeof authService === 'undefined' || !authService) {
            console.warn('⚠️ authService não disponível — redirecionando para login');
            window.location.href = '../login.html';
            return false;
        }
        if (!authService.isLoggedIn()) {
            console.warn('⚠️ Usuário não logado — redirecionando para login');
            window.location.href = '../login.html';
            return false;
        }
        return true;
    } catch (e) {
        console.error('❌ Erro na validação de login:', e);
        window.location.href = '../login.html';
        return false;
    }
}

// ============================================
// SELECIONAR BI (TROCA DE ABA)
// ============================================
function selecionarBI(chave) {
    const bi = BIS[chave];
    if (!bi) {
        console.warn(`⚠️ BI desconhecido: ${chave}`);
        return;
    }

    if (!bi.ativo || !bi.url) {
        mostrarEmBreve(bi.titulo);
        return;
    }

    biAtual = chave;

    // Atualiza abas visuais
    document.querySelectorAll('.bi-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.bi === chave);
    });

    // Re-renderiza o wrapper do iframe
    const wrapper = document.getElementById('biIframeWrapper');
    wrapper.innerHTML = `
        <div class="bi-loading-overlay" id="biLoading">
            <div class="spinner"></div>
            <p>⏳ Carregando o BI...</p>
        </div>
        <iframe 
            id="biFrame"
            title="${bi.titulo}"
            src="${bi.url}"
            frameborder="0"
            allowFullScreen="true"
            onload="onFrameLoad()">
        </iframe>
    `;

    atualizarStatus('online', 'Conectado');
    iniciarFallbackLoading();
}

// ============================================
// MOSTRAR "EM BREVE" (BI DESATIVADO)
// ============================================
function mostrarEmBreve(titulo) {
    const wrapper = document.getElementById('biIframeWrapper');
    wrapper.innerHTML = `
        <div class="bi-empty-state">
            <div class="icon">🚧</div>
            <h3>${titulo}</h3>
            <p>Este BI ainda está em desenvolvimento. Em breve estará disponível por aqui.</p>
            <span class="badge-em-breve">Em breve</span>
        </div>
    `;

    // Remove a aba ativa (nenhum BI selecionado enquanto mostra "em breve")
    document.querySelectorAll('.bi-tab-btn').forEach(btn => btn.classList.remove('active'));

    atualizarStatus('offline', 'Aguardando desenvolvimento');
}

// ============================================
// CONTROLE DO LOADING DO IFRAME
// ============================================
function onFrameLoad() {
    const loading = document.getElementById('biLoading');
    if (loading) {
        loading.classList.add('hidden');
        setTimeout(() => {
            if (loading.parentNode) loading.style.display = 'none';
        }, 400);
    }
    atualizarStatus('online', 'Conectado');
}

// Fallback: esconde o loading após 15s se o onload não disparar
function iniciarFallbackLoading() {
    if (timerFallbackLoading) clearTimeout(timerFallbackLoading);
    timerFallbackLoading = setTimeout(() => {
        const loading = document.getElementById('biLoading');
        if (loading && !loading.classList.contains('hidden')) {
            console.warn('⚠️ Timeout de carregamento do iframe — escondendo loading');
            loading.classList.add('hidden');
            setTimeout(() => {
                if (loading.parentNode) loading.style.display = 'none';
            }, 400);
        }
    }, 15000);
}

// ============================================
// RECARREGAR BI (BOTÃO ATUALIZAR)
// ============================================
function recarregarBI() {
    const bi = BIS[biAtual];
    if (!bi || !bi.url) {
        console.warn('⚠️ BI atual não tem URL para recarregar');
        return;
    }

    const wrapper = document.getElementById('biIframeWrapper');
    wrapper.innerHTML = `
        <div class="bi-loading-overlay" id="biLoading">
            <div class="spinner"></div>
            <p>⏳ Recarregando o BI...</p>
        </div>
        <iframe 
            id="biFrame"
            title="${bi.titulo}"
            src="${bi.url}"
            frameborder="0"
            allowFullScreen="true"
            onload="onFrameLoad()">
        </iframe>
    `;
    atualizarStatus('online', 'Conectado');
    iniciarFallbackLoading();
}

// ============================================
// TELA CHEIA
// ============================================
function abrirFullscreen() {
    const el = document.getElementById('biIframeWrapper');
    if (!el) return;

    if (el.requestFullscreen) {
        el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
    }
}

// ============================================
// REDIRECIONAR PARA HOME (baseado no perfil)
// ============================================
function redirecionarParaHome() {
    try {
        let perfil = 'GESTAO';

        if (typeof authService !== 'undefined' && authService) {
            const user = authService.getUserData();
            if (user && user.perfil) perfil = user.perfil;
        }

        const homeMap = {
            'OPERACIONAL': '../home-operacional.html',
            'GESTAO': '../home-gestao.html',
            'VISUALIZACAO': '../home-visualizacao.html'
        };

        window.location.href = homeMap[perfil] || '../home-gestao.html';
    } catch (e) {
        console.error('❌ Erro ao redirecionar:', e);
        window.location.href = '../home-gestao.html';
    }
}

// ============================================
// STATUS BAR
// ============================================
function atualizarStatus(estado, texto) {
    const dot = document.getElementById('biStatusDot');
    const txt = document.getElementById('biStatusText');
    const time = document.getElementById('biStatusTime');

    if (dot) {
        dot.classList.remove('online', 'offline');
        dot.classList.add(estado === 'online' ? 'online' : 'offline');
    }
    if (txt) txt.textContent = texto;
    if (time) {
        const agora = new Date();
        time.textContent = `Última atualização: ${agora.toLocaleTimeString('pt-BR')}`;
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (!validarLogin()) return;

    console.log('📊 Página de Indicadores (Power BI) inicializada');
    atualizarStatus('online', 'Conectado');
    iniciarFallbackLoading();
});

// ============================================
// EXPORTS GLOBAIS (usados nos onclick do HTML)
// ============================================
window.selecionarBI = selecionarBI;
window.recarregarBI = recarregarBI;
window.abrirFullscreen = abrirFullscreen;
window.redirecionarParaHome = redirecionarParaHome;
window.onFrameLoad = onFrameLoad;