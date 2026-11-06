// ============================================
// GERENCIADOR DE ABAS - SICGM (v3)
// Aba fixa "Início" + iframes para as demais.
// Aceita abertura de abas vindas de iframes (inclusive aninhados).
// Normaliza IDs para evitar duplicação por causa de caminhos relativos.
// ============================================

(function () {
    'use strict';

    const abaInicioEl = document.querySelector('.aba-conteudo[data-aba-conteudo="inicio"]');
    const tabBar = document.getElementById('tab-bar');
    const contentArea = document.getElementById('content-area');

    if (!tabBar || !contentArea || !abaInicioEl) {
        console.warn('⚠️ gerenciador-abas.js: estrutura de abas não encontrada. Ignorando.');
        return;
    }

    // ============================================
    // ESTADO
    // ============================================
    const abasAbertas = new Map(); // idNormalizado -> { titulo, url, iframe, container, tab }
    let abaAtivaId = 'inicio';

    // ============================================
    // NORMALIZAÇÃO DE ID
    // - Resolve caminhos relativos para absolutos (evita "../chamados" vs "chamados")
    // - Mantém query string (para formulário?id=42 ser único)
    // ============================================
    function normalizarId(id) {
        if (!id) return id;
        if (id.startsWith('http://') || id.startsWith('https://')) return id;
        try {
            const abs = new URL(id, window.location.href).href;
            return abs;
        } catch {
            return id;
        }
    }

    function normalizarUrl(url) {
        if (!url) return url;
        try {
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }

    // ============================================
    // CRIA A ABA "INÍCIO"
    // ============================================
    const inicioTab = document.createElement('button');
    inicioTab.className = 'tab active';
    inicioTab.dataset.id = 'inicio';
    inicioTab.type = 'button';
    inicioTab.innerHTML = `<span>🏠 Início</span>`;
    inicioTab.addEventListener('click', () => focarAba('inicio'));
    tabBar.appendChild(inicioTab);

    // ============================================
    // ABRIR ABA
    // ============================================
    function abrirNovaAba(id, titulo, url) {
        if (!url) return;
        if (id === 'inicio') { focarAba('inicio'); return; }

        // login → fluxo normal fora das abas
        const urlAbs = normalizarUrl(url);
        if (urlAbs.endsWith('/login.html')) {
            window.location.href = url;
            return;
        }

        const idNorm = normalizarId(id || url);

        // Já existe? Só foca.
        if (abasAbertas.has(idNorm)) {
            focarAba(idNorm);
            return;
        }

        // Cria a aba
        const tab = document.createElement('button');
        tab.className = 'tab';
        tab.dataset.id = idNorm;
        tab.type = 'button';
        tab.innerHTML = `
            <span class="tab-titulo">${titulo || url}</span>
            <span class="tab-close" data-close="${idNorm}" title="Fechar aba">×</span>
        `;
        tab.addEventListener('click', (e) => {
            if (e.target.dataset.close) return;
            focarAba(idNorm);
        });
        tabBar.appendChild(tab);

        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            fecharAba(idNorm);
        });

        // Container + iframe
        const container = document.createElement('div');
        container.className = 'iframe-container';
        container.dataset.id = idNorm;

        const iframe = document.createElement('iframe');
        iframe.src = url; // usa a URL original (relativa já resolve contra a home)
        iframe.name = idNorm;
        iframe.setAttribute('allow', 'clipboard-write');
        container.appendChild(iframe);
        contentArea.appendChild(container);

        abasAbertas.set(idNorm, { titulo, url, iframe, container, tab });
        focarAba(idNorm);
    }

    // ============================================
    // FOCAR / FECHAR
    // ============================================
    function focarAba(id) {
        abaAtivaId = id;

        document.querySelectorAll('#tab-bar .tab').forEach(t => t.classList.remove('active'));
        const tabEl = document.querySelector(`#tab-bar .tab[data-id="${CSS.escape(id)}"]`);
        if (tabEl) tabEl.classList.add('active');

        document.querySelectorAll('.iframe-container').forEach(c => c.classList.remove('active'));

        if (id === 'inicio') {
            abaInicioEl.style.display = 'block';
            contentArea.classList.remove('tem-iframe-ativo');
        } else {
            abaInicioEl.style.display = 'none';
            const contEl = document.querySelector(`.iframe-container[data-id="${CSS.escape(id)}"]`);
            if (contEl) contEl.classList.add('active');
            contentArea.classList.add('tem-iframe-ativo');
        }
    }

    function fecharAba(id) {
        if (id === 'inicio') return;
        if (!abasAbertas.has(id)) return;

        const { tab, container } = abasAbertas.get(id);
        tab.remove();
        container.remove();
        abasAbertas.delete(id);

        if (abaAtivaId === id) {
            const restantes = Array.from(abasAbertas.keys());
            if (restantes.length > 0) {
                focarAba(restantes[restantes.length - 1]);
            } else {
                focarAba('inicio');
            }
        }
    }

    // ============================================
    // COMUNICAÇÃO COM IFRAMES
    // Aceita mensagens de iframes diretos E de iframes aninhados (via relay)
    // ============================================
    window.addEventListener('message', (event) => {
        // Aceita qualquer origem do próprio SICGM (mesma origem)
        if (event.origin !== window.location.origin) return;

        const { type, payload } = event.data || {};
        if (!type) return;

        if (type === 'ABRIR_ABA' && payload) {
            abrirNovaAba(payload.id, payload.titulo, payload.url);
            return;
        }

        if (type === 'NAVEGAR_NA_ABA' && payload) {
            const origem = event.source;
            for (const [id, dados] of abasAbertas.entries()) {
                if (dados.iframe.contentWindow === origem) {
                    dados.iframe.src = payload.url;
                    if (payload.titulo) {
                        const t = dados.tab.querySelector('.tab-titulo');
                        if (t) t.textContent = payload.titulo;
                    }
                    break;
                }
            }
            return;
        }

        if (type === 'PRECISA_LOGIN') {
            window.location.href = 'login.html';
            return;
        }
    });

    // ============================================
    // INTERCEPTA CLIQUES EM <a> NA HOME
    // ============================================
    document.addEventListener('click', (e) => {
        if (window.self !== window.top) return;
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        if (a.target === '_blank') return;
        if (/^https?:\/\//i.test(href)) return;
        if (href === 'login.html' || href.endsWith('/login.html')) return;

        e.preventDefault();
        const titulo = a.textContent.trim() || href;
        abrirNovaAba(href, titulo, href);
    }, true);

    // ============================================
    // SUBSTITUI CONFIG.navigateTo
    // ============================================
    if (typeof window.CONFIG !== 'undefined' && typeof window.CONFIG.navigateTo === 'function') {
        const _navigateToOriginal = window.CONFIG.navigateTo.bind(window.CONFIG);
        window.CONFIG.navigateTo = function (page, params) {
            let url = window.CONFIG.getPageUrl(page);
            if (params) {
                const qs = new URLSearchParams(params).toString();
                url += url.includes('?') ? `&${qs}` : `?${qs}`;
            }
            if (url === 'login.html' || url.endsWith('/login.html')) {
                _navigateToOriginal(page, params);
                return;
            }
            const titulo = page
                .replace(/\.html?$/i, '')
                .replace(/[\/_-]+/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
            abrirNovaAba(url, titulo, url);
        };
        console.log('✅ CONFIG.navigateTo interceptado.');
    }

    // ============================================
    // EXPOR GLOBAIS
    // ============================================
    window.abrirNovaAba = abrirNovaAba;
    window.focarAba = focarAba;
    window.fecharAba = fecharAba;

    console.log('✅ Gerenciador de abas pronto (v3).');
})();