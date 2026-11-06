// ============================================
// IFRAME-NAV.JS - v4 (normalização de URL)
// ============================================
(function () {
    if (window.self === window.top) return;

    function normalizarUrl(url) {
        if (!url) return url;
        try { return new URL(url, window.location.href).href; }
        catch { return url; }
    }

    function enviar(msg) {
        if (msg && msg.payload && msg.payload.url) {
            msg.payload.url = normalizarUrl(msg.payload.url);
        }
        try {
            window.top.postMessage(msg, '*');
        } catch (e) {
            try { window.parent.postMessage(msg, '*'); } catch (_) {}
        }
    }

    function abrirEmNovaAba(url, titulo) {
        enviar({ type: 'ABRIR_ABA', payload: { id: url, titulo: titulo || url, url } });
    }

    window.solicitarNovaAba = (id, titulo, url) => {
        enviar({ type: 'ABRIR_ABA', payload: { id, titulo, url } });
    };
    window.navegarNaAbaAtual = (url, titulo) => {
        enviar({ type: 'NAVEGAR_NA_ABA', payload: { url, titulo } });
    };

    document.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
        if (a.target === '_blank') return;
        if (/^https?:\/\//i.test(href)) return;
        if (/^mailto:|^tel:/i.test(href)) return;
        if (/login\.html$/i.test(href)) return;

        e.preventDefault();
        const titulo = (a.textContent || '').trim() || href;
        if (a.getAttribute('data-nav') === 'na-aba') {
            window.navegarNaAbaAtual(href, titulo);
        } else {
            abrirEmNovaAba(href, titulo);
        }
    }, true);

    function interceptarConfig() {
        if (typeof window.CONFIG === 'undefined'
            || typeof window.CONFIG.navigateTo !== 'function'
            || window.CONFIG._iframeNavInterceptado) return;

        const _orig = window.CONFIG.navigateTo.bind(window.CONFIG);
        window.CONFIG.navigateTo = function (page, params) {
            if (/login\.html$/i.test(page)) { _orig(page, params); return; }
            let url = window.CONFIG.getPageUrl(page);
            if (params) {
                const qs = new URLSearchParams(params).toString();
                url += url.includes('?') ? `&${qs}` : `?${qs}`;
            }
            const titulo = page.replace(/\.html?$/i, '').replace(/[\/_-]+/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            if (params && params._nav === 'na-aba') {
                window.navegarNaAbaAtual(url, titulo);
            } else {
                abrirEmNovaAba(url, titulo);
            }
        };
        window.CONFIG._iframeNavInterceptado = true;
    }
    interceptarConfig();
    setTimeout(interceptarConfig, 100);
    setTimeout(interceptarConfig, 500);

    const _origOpen = window.open;
    window.open = function (url, target, features) {
        if (!url) return null;
        if (/^https?:\/\//i.test(url) && !url.startsWith(window.location.origin)) {
            return _origOpen.call(window, url, target, features);
        }
        abrirEmNovaAba(url, '');
        return null;
    };

    console.log('✅ iframe-nav.js v4 ativo (em iframe).');
})();