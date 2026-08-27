// ============================================
// ESTRUTURA DO SETOR - PLANNER CONTROLLER
// ============================================

(function() {
    'use strict';

    console.log('🚀 Estrutura do Setor - Planner iniciando...');

    // ============================================
    // 🔥 VERIFICAR AUTENTICAÇÃO
    // ============================================
    
    function verificarAutenticacao() {
        console.log('🔍 Verificando autenticação...');
        
        if (typeof authService === 'undefined' || !authService) {
            console.error('❌ authService não disponível');
            window.location.href = '../login.html';
            return false;
        }

        if (!authService.isLoggedIn()) {
            console.error('❌ Usuário não logado');
            window.location.href = '../login.html';
            return false;
        }

        const user = authService.getUserData();
        if (!user) {
            console.error('❌ Dados do usuário não encontrados');
            window.location.href = '../login.html';
            return false;
        }

        if (user.perfil !== 'GESTAO') {
            console.error(`❌ Perfil ${user.perfil} não autorizado`);
            alert('🔒 Acesso restrito ao perfil GESTÃO.');
            window.location.href = '../home-gestao.html';
            return false;
        }

        console.log(`✅ Autenticado: ${user.nome} (${user.perfil})`);
        return true;
    }

    // ============================================
    // FUNÇÃO PARA VOLTAR - USANDO CAMINHO RELATIVO
    // ============================================
    
    function voltarParaHome() {
        console.log('🔙 Voltando para Home...');
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

        const newBtn = btnVoltar.cloneNode(true);
        btnVoltar.parentNode.replaceChild(newBtn, btnVoltar);

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
        
        const iframe = document.getElementById('miroPlanner');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusTime = document.getElementById('statusTime');
        const container = document.querySelector('.planner-container');

        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 3;
        const HEARTBEAT_INTERVAL = 30000;

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

        function hideLoading() {
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 500);
            }
        }

        function showLoading() {
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
                loadingOverlay.classList.remove('hidden');
                updateStatus('loading', 'Carregando...');
            }
        }

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

        function handleConnectionError() {
            updateStatus('offline', 'Desconectado');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        }

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

        setupIframeListeners();
        updateTimestamp();
        startHeartbeat();
        
        setTimeout(() => {
            hideLoading();
        }, 5000);

        setInterval(checkConnection, HEARTBEAT_INTERVAL);

        console.log('✅ Planner inicializado com sucesso!');
    }

    // ============================================
    // INICIALIZAÇÃO PRINCIPAL
    // ============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📄 DOM carregado, iniciando...');
            // 🔥 VERIFICAR AUTENTICAÇÃO PRIMEIRO
            if (!verificarAutenticacao()) return;
            setupVoltarButton();
            initPlanner();
        });
    } else {
        console.log('📄 DOM já carregado, iniciando...');
        if (!verificarAutenticacao()) return;
        setupVoltarButton();
        initPlanner();
    }

    console.log('✅ Estrutura do Setor - carregado com sucesso!');

})();