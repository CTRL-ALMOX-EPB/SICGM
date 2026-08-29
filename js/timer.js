// ============================================
// TIMER.JS - GERENCIA O TIMER NO HEADER
// RESET APENAS NA NAVEGAÇÃO ENTRE PÁGINAS
// ============================================

(function() {
    'use strict';

    // Não carregar na página de login
    if (window.location.pathname.includes('login.html')) {
        console.log('⏭️ Timer ignorado na página de login');
        return;
    }

    // Verificar se authService existe
    if (typeof authService === 'undefined' || !authService) {
        console.warn('⏳ authService não disponível para o timer');
        return;
    }

    // Só inicia se estiver logado
    if (!authService.isLoggedIn()) {
        console.warn('⏳ Usuário não logado, timer não iniciado');
        return;
    }

    console.log('⏱️ Iniciando gerenciamento do timer...');

    let timerInterval = null;
    let timeLeft = 30 * 60; // 30 minutos em segundos
    let isTimerRunning = false;
    let currentPage = window.location.pathname;

    // ============================================
    // ATUALIZAR TIMER NO HTML
    // ============================================
    function updateTimerDisplay() {
        const timerElement = document.getElementById('sessionTimer');
        if (!timerElement) {
            console.warn('⚠️ Elemento sessionTimer não encontrado no HTML');
            return;
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            timerElement.textContent = '00:00';
            timerElement.className = 'danger';
            
            // Adicionar classe danger no wrapper
            const wrapper = document.querySelector('.session-timer-wrapper');
            if (wrapper) wrapper.className = 'session-timer-wrapper danger-mode';
            
            alert('⏰ Sua sessão expirou!');
            sessionStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Mudar cor quando próximo do fim
        const wrapper = document.querySelector('.session-timer-wrapper');
        if (timeLeft < 60) {
            timerElement.className = 'danger';
            if (wrapper) wrapper.className = 'session-timer-wrapper danger-mode';
        } else if (timeLeft < 300) {
            timerElement.className = 'warning';
            if (wrapper) wrapper.className = 'session-timer-wrapper warning-mode';
        } else {
            timerElement.className = 'normal';
            if (wrapper) wrapper.className = 'session-timer-wrapper';
        }

        timeLeft--;
    }

    // ============================================
    // RESETAR TIMER (APENAS NA NAVEGAÇÃO)
    // ============================================
    function resetTimer() {
        // Verifica se realmente mudou de página
        const newPage = window.location.pathname;
        if (newPage === currentPage) {
            // Se for a mesma página, não reseta
            return;
        }
        
        // Atualiza a página atual
        currentPage = newPage;
        
        // Reseta o timer
        timeLeft = 30 * 60;
        
        // Renovar sessão
        if (typeof authService !== 'undefined' && authService) {
            authService.renewSession().catch(() => {});
        }
        
        // Atualizar display imediatamente
        updateTimerDisplay();
        
        // Resetar o status visual
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            timerElement.className = 'normal';
        }
        const wrapper = document.querySelector('.session-timer-wrapper');
        if (wrapper) {
            wrapper.className = 'session-timer-wrapper';
        }
        
        console.log('🔄 Timer resetado (navegação para:', newPage, ')');
    }

    // ============================================
    // INICIAR TIMER
    // ============================================
    function initTimer() {
        // Verificar se o elemento existe
        const timerElement = document.getElementById('sessionTimer');
        if (!timerElement) {
            console.error('❌ Elemento sessionTimer não encontrado!');
            return;
        }

        // Se já estiver rodando, não iniciar novamente
        if (isTimerRunning) {
            console.log('⏹️ Timer já está rodando');
            return;
        }

        // Atualizar a página atual
        currentPage = window.location.pathname;

        // Atualizar a cada segundo
        timerInterval = setInterval(updateTimerDisplay, 1000);
        isTimerRunning = true;
        
        // Atualizar imediatamente
        updateTimerDisplay();
        
        console.log('✅ Timer integrado ao HTML iniciado!');
        console.log('📄 Página atual:', currentPage);
    }

    // ============================================
    // DETECTAR MUDANÇA DE PÁGINA
    // ============================================
    function detectPageChange() {
        // Verifica se a URL mudou
        const newPage = window.location.pathname;
        if (newPage !== currentPage) {
            resetTimer();
        }
    }

    // ============================================
    // INICIAR
    // ============================================
    // Aguardar o DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTimer);
    } else {
        // Se o DOM já estiver carregado, iniciar imediatamente
        setTimeout(initTimer, 100);
    }

    // ============================================
    // EVENTOS DE NAVEGAÇÃO (RESET APENAS AQUI)
    // ============================================
    
    // 1. Detectar navegação via links (clique em <a>)
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href) {
            // Verifica se é um link interno (mesmo domínio)
            const linkUrl = new URL(link.href);
            const currentUrl = new URL(window.location.href);
            
            if (linkUrl.origin === currentUrl.origin) {
                // É um link interno, vai mudar de página
                // O reset será feito quando a nova página carregar
                // Mas já podemos preparar
                console.log('🔗 Navegação detectada para:', linkUrl.pathname);
            }
        }
    }, { passive: true });

    // 2. Detectar navegação via popstate (voltar/avançar)
    window.addEventListener('popstate', function() {
        // Pequeno delay para garantir que a URL já mudou
        setTimeout(detectPageChange, 50);
    });

    // 3. Detectar navegação via hashchange
    window.addEventListener('hashchange', function() {
        // Pequeno delay para garantir que a URL já mudou
        setTimeout(detectPageChange, 50);
    });

    // 4. Detectar quando a página é carregada/recarregada
    window.addEventListener('load', function() {
        // Verifica se mudou de página (pode ter vindo de outra página)
        setTimeout(detectPageChange, 100);
    });

    // 5. Detectar mudanças na URL via MutationObserver (para SPAs)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(function() {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            setTimeout(detectPageChange, 50);
        }
    });
    
    // Observa mudanças no título (comum em SPAs)
    const titleElement = document.querySelector('title');
    if (titleElement) {
        observer.observe(titleElement, { 
            subtree: true, 
            characterData: true, 
            childList: true 
        });
    }

    // Também observa o body para mudanças (comum em SPAs)
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('✅ Timer gerenciador carregado!');
    console.log('📌 Reset apenas na navegação entre páginas');

    // ============================================
    // FUNÇÃO PARA RESET MANUAL (CASO NECESSÁRIO)
    // ============================================
    window.forceResetTimer = function() {
        timeLeft = 30 * 60;
        updateTimerDisplay();
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            timerElement.className = 'normal';
        }
        const wrapper = document.querySelector('.session-timer-wrapper');
        if (wrapper) {
            wrapper.className = 'session-timer-wrapper';
        }
        console.log('🔄 Timer resetado manualmente');
    };

})();