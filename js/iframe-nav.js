// ============================================
// IFRAME-NAV.JS v9
// - Normaliza caminhos
// - 🔥 Usa "numero=" (não "id=") para o formulário
// - Deduplica segmentos (controles/controles/)
// ============================================

(function() {
    'use strict';

    if (window.self === window.top) {
        console.log('ℹ️ iframe-nav.js: não está em iframe, saindo');
        return;
    }

    console.log('🔗 iframe-nav.js v9 carregado em:', window.location.pathname);

    // ============================================
    // BASE PATH
    // ============================================
    function getBasePath() {
        if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.BASE_PATH) {
            let bp = String(CONFIG.BASE_PATH);
            if (!bp.endsWith('/')) bp += '/';
            return bp;
        }
        const path = window.location.pathname;
        const partes = path.split('/').filter(Boolean);
        if (window.location.hostname.includes('github.io') && partes.length > 0) {
            return `/${partes[0]}/`;
        }
        return '/';
    }

    // ============================================
    // NORMALIZA LINK (dedupe de segmentos, remove basePath)
    // ============================================
    function normalizarLink(linkOriginal) {
        try {
            const url = new URL(linkOriginal, window.location.href);
            if (url.hostname !== window.location.hostname) return null;

            let pathname = url.pathname;

            const basePath = getBasePath();
            if (basePath && pathname.startsWith(basePath)) {
                pathname = pathname.substring(basePath.length);
            } else {
                const segs = pathname.split('/').filter(Boolean);
                if (segs.length > 0 && window.location.hostname.includes('github.io')) {
                    segs.shift();
                    pathname = '/' + segs.join('/');
                }
            }

            // Deduplica segmentos consecutivos
            let segmentos = pathname.split('/').filter(Boolean);
            const unicos = [];
            for (let i = 0; i < segmentos.length; i++) {
                if (i > 0 && segmentos[i] === segmentos[i - 1]) continue;
                unicos.push(segmentos[i]);
            }
            pathname = '/' + unicos.join('/');
            pathname = pathname.replace(/\/+/g, '/');
            pathname = pathname.replace(/^\//, '');

            return pathname + url.search + url.hash;
        } catch (err) {
            console.error('❌ Erro ao normalizar link:', err);
            return null;
        }
    }

    // ============================================
    // PEDIR PARA ABRIR ABA
    // ============================================
    function pedirAbrirAba(linkOriginal, titulo, tabId) {
        const linkNormalizado = normalizarLink(linkOriginal);
        if (!linkNormalizado) {
            console.warn('⚠️ Link inválido:', linkOriginal);
            return;
        }

        console.log('📨 Pedindo para abrir aba:', { linkOriginal, linkNormalizado, titulo });

        try {
            window.parent.postMessage({
                type: 'SICGM_ABRIR_ABA',
                link: linkNormalizado,
                titulo: titulo || 'Nova Aba',
                tabId: tabId || ('iframe-' + Date.now())
            }, '*');
        } catch (err) {
            console.error('❌ Erro no postMessage:', err);
        }
    }

    // ============================================
    // INTERCEPTA CLIQUES EM LINKS <a>
    // ============================================
    document.addEventListener('click', function(e) {
        const alvo = e.target.closest('[data-abrir-nova-aba]') || e.target.closest('a[href]');
        if (!alvo) return;

        const link = alvo.getAttribute('href') || alvo.dataset.link;
        if (!link || link === '#' || link.startsWith('javascript:') || link.startsWith('mailto:')) return;
        if (alvo.target === '_blank') return;
        if (link.startsWith('#')) return;

        const linkNorm = normalizarLink(link);
        if (!linkNorm) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const titulo = alvo.dataset.titulo || alvo.textContent.trim().substring(0, 40) || 'Nova Aba';
        pedirAbrirAba(link, titulo);
    }, true);

    // ============================================
    // OVERRIDE DO BOTÃO btnNovoControle
    // ============================================
    function interceptarBotaoNovoControle() {
        const btn = document.getElementById('btnNovoControle');
        if (!btn) return;
        if (btn.dataset.__iframeNavDone) return;
        btn.dataset.__iframeNavDone = '1';

        const btnClone = btn.cloneNode(true);
        btn.parentNode.replaceChild(btnClone, btn);

        btnClone.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const tipoAtivo = document.querySelector('.tipo-btn.active')?.dataset.tipo || 'aditivo';
            const link = `controles/formulario.html?tipo=${tipoAtivo}`;

            console.log('🎯 Novo Controle interceptado:', link);
            pedirAbrirAba(link, 'Novo Controle');
        }, true);

        console.log('✅ Botão Novo Controle interceptado');
    }

    // ============================================
    // 🔥 OVERRIDE DE abrirControle() — USA "numero=" (não "id=")
    // ============================================
    function sobrescreverFuncoes() {
        ['abrirControle', 'abrirFormulario', 'abrirEdicao', 'novoControle',
         'irParaFormulario', 'abrirNovoControle'].forEach(nome => {
            if (typeof window[nome] === 'function' && !window[nome].__iframeNavOverride) {
                window[nome] = function(...args) {
                    // Procura um número (id do controle)
                    const numero = args.find(a => typeof a === 'number' || (typeof a === 'string' && /^\d+$/.test(a)));
                    const tipo = document.querySelector('.tipo-btn.active')?.dataset.tipo || 'aditivo';

                    // 🔥 USA "numero=" (o formulário espera esse parâmetro)
                    let link = `controles/formulario.html?tipo=${tipo}`;
                    if (numero) link += `&numero=${numero}`;

                    console.log(`🎯 ${nome}() interceptado → pedindo aba:`, link);
                    pedirAbrirAba(link, `Controle ${numero || 'Novo'}`);
                };
                window[nome].__iframeNavOverride = true;
                console.log(`✅ Função ${nome}() sobrescrita (usa numero=)`);
            }
        });
    }

    // ============================================
    // OVERRIDE window.open
    // ============================================
    const _openOriginal = window.open;
    window.open = function(url, target, features) {
        if (url && (!target || target === '_self' || target === '_top')) {
            const linkNorm = normalizarLink(url);
            if (linkNorm) {
                console.log('🎯 window.open interceptado:', linkNorm);
                pedirAbrirAba(url, 'Nova Aba');
                return null;
            }
        }
        return _openOriginal.call(window, url, target, features);
    };

    // ============================================
    // APLICA
    // ============================================
    function aplicar() {
        sobrescreverFuncoes();
        interceptarBotaoNovoControle();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', aplicar);
    } else {
        aplicar();
    }
    setTimeout(aplicar, 300);
    setTimeout(aplicar, 1000);
    setTimeout(aplicar, 2500);

    window.navegarNoIframe = pedirAbrirAba;

    console.log('✅ iframe-nav.js v9 pronto');
})();