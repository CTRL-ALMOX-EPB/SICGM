// ============================================
// IFRAME-NAV.JS v5 — Normalização de caminho
// ============================================

(function() {
    'use strict';

    if (window.self === window.top) return;

    console.log('🔗 iframe-nav.js v5 carregado em:', window.location.pathname);

    // ============================================
    // NORMALIZA O CAMINHO:
    // - Remove "/" inicial
    // - Remove segmentos duplicados consecutivos (/controles/controles/ → /controles/)
    // ============================================
    function normalizarLink(linkOriginal) {
        try {
            const url = new URL(linkOriginal, window.location.href);
            if (url.hostname !== window.location.hostname) return null;

            // Pega o pathname absoluto: /controles/formulario.html
            let segmentos = url.pathname.split('/').filter(Boolean);

            // Remove duplicações consecutivas: ['controles', 'controles', 'formulario.html'] → ['controles', 'formulario.html']
            const unicos = [];
            for (let i = 0; i < segmentos.length; i++) {
                if (i === 0 || segmentos[i] !== segmentos[i - 1]) {
                    unicos.push(segmentos[i]);
                }
            }

            // Reconstrói: "controles/formulario.html"
            const linkRelativo = unicos.join('/') + url.search + url.hash;

            return linkRelativo;
        } catch (err) {
            console.error('❌ Erro ao normalizar link:', err);
            return null;
        }
    }

    // ============================================
    // FUNÇÃO CENTRAL: pedir para abrir nova aba
    // ============================================
    function pedirAbrirAba(linkOriginal, titulo, tabId) {
        const linkRelativo = normalizarLink(linkOriginal);
        if (!linkRelativo) {
            console.warn('⚠️ Link inválido, ignorando:', linkOriginal);
            return;
        }

        console.log('📨 Pedindo para abrir aba:', { linkOriginal, linkNormalizado: linkRelativo, titulo });

        window.parent.postMessage({
            type: 'SICGM_ABRIR_ABA',
            link: linkRelativo,
            titulo: titulo || 'Nova Aba',
            tabId: tabId || ('iframe-' + Date.now())
        }, '*');
    }

    // ============================================
    // OVERRIDE DE location.assign e location.replace
    // ============================================
    const originalAssign = window.location.assign.bind(window.location);
    const originalReplace = window.location.replace.bind(window.location);

    try {
        window.location.assign = function(url) {
            const linkRelativo = normalizarLink(url);
            if (linkRelativo) {
                console.log('🎯 location.assign interceptado:', linkRelativo);
                pedirAbrirAba(url, 'Nova Aba');
                return;
            }
            return originalAssign(url);
        };

        window.location.replace = function(url) {
            const linkRelativo = normalizarLink(url);
            if (linkRelativo) {
                console.log('🎯 location.replace interceptado:', linkRelativo);
                pedirAbrirAba(url, 'Nova Aba');
                return;
            }
            return originalReplace(url);
        };

        console.log('✅ location.assign e location.replace interceptados');
    } catch (e) {
        console.warn('⚠️ Não foi possível interceptar assign/replace:', e.message);
    }

    // ============================================
    // OVERRIDE DE window.open
    // ============================================
    const _openOriginal = window.open;
    window.open = function(url, target, features) {
        if (url && (!target || target === '_self' || target === '_top')) {
            const linkRelativo = normalizarLink(url);
            if (linkRelativo) {
                console.log('🎯 window.open interceptado:', linkRelativo);
                pedirAbrirAba(url, 'Nova Aba');
                return null;
            }
        }
        return _openOriginal.call(window, url, target, features);
    };

    // ============================================
    // INTERCEPTA CLIQUES EM <a href>
    // ============================================
    document.addEventListener('click', function(e) {
        const alvo = e.target.closest('[data-abrir-nova-aba]') || e.target.closest('a[href]');
        if (!alvo) return;

        const link = alvo.getAttribute('href') || alvo.dataset.link;
        if (!link || link === '#' || link.startsWith('javascript:') || link.startsWith('mailto:')) return;
        if (alvo.target === '_blank') return;
        if (link.startsWith('#')) return;

        const linkRelativo = normalizarLink(link);
        if (!linkRelativo) return;

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
            // IMPORTANTE: link relativo à pasta controles/ (não à raiz)
            // Normalizamos depois, então "formulario.html" vira "controles/formulario.html"
            const link = `formulario.html?tipo=${tipoAtivo}`;

            console.log('🎯 Novo Controle interceptado → pedindo aba:', link);
            pedirAbrirAba(link, 'Novo Controle');
        }, true);

        console.log('✅ Botão Novo Controle interceptado');
    }

    // ============================================
    // OVERRIDE DE FUNÇÕES GLOBAIS
    // ============================================
    function sobrescreverFuncoes() {
        ['abrirControle', 'abrirFormulario', 'abrirEdicao', 'novoControle',
         'irParaFormulario', 'abrirNovoControle'].forEach(nome => {
            if (typeof window[nome] === 'function' && !window[nome].__iframeNavOverride) {
                window[nome] = function(...args) {
                    const id = args.find(a => typeof a === 'number' || (typeof a === 'string' && /^\d+$/.test(a)));
                    const tipo = document.querySelector('.tipo-btn.active')?.dataset.tipo || 'aditivo';

                    // Link relativo à pasta atual (controles/)
                    let link = `formulario.html?tipo=${tipo}`;
                    if (id) link += `&id=${id}`;

                    console.log(`🎯 ${nome}() interceptado → pedindo aba:`, link);
                    pedirAbrirAba(link, `Controle ${id || 'Novo'}`);
                };
                window[nome].__iframeNavOverride = true;
                console.log(`✅ Função ${nome}() sobrescrita`);
            }
        });
    }

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

    console.log('✅ iframe-nav.js v5 pronto');
})();