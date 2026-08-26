// ============================================
// ESTRUTURA DO SETOR - PLANNER CONTROLLER
// ============================================

(function() {
    'use strict';

    console.log('🚀 Estrutura do Setor - Planner iniciando...');

    // ============================================
    // FUNÇÃO PARA VOLTAR - USANDO CAMINHO RELATIVO
    // ============================================
    
    function voltarParaHome() {
        console.log('🔙 Voltando para Home...');
        
        // CAMINHO RELATIVO - sobe um nível e vai para home-gestao.html
        // Como estamos em /gestao/estrutura-setor.html
        // Precisamos subir um nível: ../home-gestao.html
        window.location.href = '../home-gestao.html';
    }

    // ============================================
    // CONFIGURAÇÃO DO BOTÃO VOLTAR
    // ============================================
    
    function setupVoltarButton() {
        const btnVoltar = document.getElementById('btnVoltar');
        if (!btnVoltar) {
            console.warn('⚠️ Botão Voltar não encontrado');
            return;
        }

        console.log('🔧 Configurando botão Voltar...');

        // Remove qualquer listener antigo
        const newBtn = btnVoltar.cloneNode(true);
        btnVoltar.parentNode.replaceChild(newBtn, btnVoltar);

        // Adiciona o listener
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔘 Botão Voltar clicado - redirecionando para ../home-gestao.html');
            voltarParaHome();
        });

        console.log('✅ Botão Voltar configurado com sucesso!');
    }

    // ============================================
    // INICIALIZAÇÃO DO PLANNER
    // ============================================
    
    function initPlanner() {
        console.log('🔄 Inicializando Planner...');
        
        // Elementos
        const iframe = document.getElementById('miroPlanner');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusTime = document.getElementById('statusTime');
        const container = document.querySelector('.planner-container');

        // Estado
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 3;
        const HEARTBEAT_INTERVAL = 30000;

        // Setup dos listeners do iframe
        function setupIframeListeners() {
            iframe.addEventListener('load', function() {
                hideLoading();
                updateStatus('online', 'Conectado');
                reconnectAttempts = 0;
                console.log('✅ Iframe carregado com sucesso');
            });

            iframe.addEventListener('error', function() {
                handleConnectionError();
                console.error('❌ Erro ao carregar iframe');
            });
        }

        // Esconde overlay de loading
        function hideLoading() {
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 500);
            }
        }

        // Mostra overlay de loading
        function showLoading() {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
                loadingOverlay.classList.remove('hidden');
                updateStatus('loading', 'Carregando...');
            }
        }

        // Atualiza status
        function updateStatus(type, message) {
            if (!statusIndicator) return;
            
            const dot = statusIndicator.querySelector('.status-dot');
            const textNode = statusIndicator.childNodes[2];
            
            if (dot) {
                dot.className = 'status-dot ' + type;
            }
            if (textNode && textNode.nodeType === 3) {
                textNode.textContent = ' ' + message;
            }
        }

        // Atualiza timestamp
        function updateTimestamp() {
            if (!statusTime) return;
            
            const now = new Date();
            const options = { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            };
            statusTime.textContent = 'Última atualização: ' + now.toLocaleDateString('pt-BR', options);
        }

        // Verifica conexão
        function checkConnection() {
            if (!statusIndicator) return;
            
            if (statusIndicator.querySelector('.status-dot.offline')) {
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    showLoading();
                    iframe.src = iframe.src;
                } else {
                    updateStatus('offline', 'Falha na conexão - Clique em Atualizar');
                }
            }
            updateTimestamp();
        }

        // Handle erro de conexão
        function handleConnectionError() {
            updateStatus('offline', 'Desconectado');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }

        // Heartbeat
        function startHeartbeat() {
            setInterval(() => {
                if (document.hidden) return;
                try {
                    iframe.contentWindow.postMessage('ping', '*');
                } catch (e) {
                    checkConnection();
                }
            }, HEARTBEAT_INTERVAL);
        }

        // FUNÇÃO DE ATUALIZAR
        function atualizarPlanner() {
            console.log('🔄 Atualizando planner...');
            showLoading();
            reconnectAttempts = 0;
            updateStatus('loading', 'Atualizando...');
            
            setTimeout(() => {
                const currentSrc = iframe.src;
                iframe.src = '';
                setTimeout(() => {
                    iframe.src = currentSrc;
                }, 100);
            }, 300);

            updateTimestamp();
        }

        // Função de Tela Cheia
        function toggleFullscreen() {
            console.log('⛶ Alternando tela cheia...');
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.warn('Erro ao entrar em tela cheia:', err);
                    if (container) {
                        container.classList.add('fullscreen');
                    }
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(err => {
                        console.warn('Erro ao sair da tela cheia:', err);
                        if (container) {
                            container.classList.remove('fullscreen');
                        }
                    });
                } else {
                    if (container) {
                        container.classList.remove('fullscreen');
                    }
                }
            }
        }

        // CONFIGURAÇÃO DOS BOTÕES
        // Botão Atualizar
        const btnAtualizar = document.querySelector('.btn-atualizar');
        if (btnAtualizar) {
            const newAtualizar = btnAtualizar.cloneNode(true);
            btnAtualizar.parentNode.replaceChild(newAtualizar, btnAtualizar);
            newAtualizar.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                atualizarPlanner();
            });
            console.log('✅ Botão Atualizar configurado');
        }

        // Botão Tela Cheia
        const btnTelaCheia = document.querySelector('.btn-tela-cheia');
        if (btnTelaCheia) {
            const newTelaCheia = btnTelaCheia.cloneNode(true);
            btnTelaCheia.parentNode.replaceChild(newTelaCheia, btnTelaCheia);
            newTelaCheia.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleFullscreen();
            });
            console.log('✅ Botão Tela Cheia configurado');
        }

        // Inicializa
        setupIframeListeners();
        updateTimestamp();
        startHeartbeat();
        
        // Esconde loading após 5 segundos
        setTimeout(() => {
            hideLoading();
        }, 5000);

        // Verifica conexão periodicamente
        setInterval(checkConnection, HEARTBEAT_INTERVAL);

        console.log('✅ Planner inicializado com sucesso!');
    }

    // ============================================
    // INICIALIZAÇÃO PRINCIPAL
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM carregado, iniciando...');
            setupVoltarButton();
            initPlanner();
        });
    } else {
        console.log('📄 DOM já carregado, iniciando...');
        setupVoltarButton();
        initPlanner();
    }

    console.log('✅ Estrutura do Setor - carregado com sucesso!');

})();