// ============================================
// DASHBOARDS INDEX - SCRIPT DA PÁGINA INICIAL
// ============================================

console.log('🚀 dashboards-index.js carregado!');

// ============================================
// 🔥 CARREGAR INFORMAÇÕES DO USUÁRIO (NOVA VERSÃO)
// ============================================

function carregarDadosUsuario() {
    try {
        // 🔥 USAR authService EM VEZ DA SESSÃO ANTIGA
        if (typeof authService === 'undefined' || !authService) {
            console.warn('⚠️ authService não disponível');
            return null;
        }

        if (!authService.isLoggedIn()) {
            console.warn('⚠️ Usuário não logado');
            return null;
        }

        const user = authService.getUserData();
        if (!user) {
            console.warn('⚠️ Dados do usuário não encontrados');
            return null;
        }

        // Atualiza o nome
        const nomeEl = document.getElementById('userName');
        if (nomeEl && user.nome) {
            nomeEl.textContent = user.nome;
        }
        
        // Atualiza a matrícula
        const matriculaEl = document.getElementById('userMatricula');
        if (matriculaEl && user.matricula) {
            matriculaEl.textContent = `Matrícula: ${user.matricula}`;
        }
        
        // Atualiza o perfil
        const perfilEl = document.getElementById('userPerfil');
        if (perfilEl && user.perfil) {
            perfilEl.textContent = user.perfil;
        }
        
        console.log(`✅ Usuário carregado: ${user.nome} (${user.perfil})`);
        return user;
        
    } catch (e) {
        console.warn('⚠️ Erro ao carregar dados do usuário:', e);
        return null;
    }
}

// ============================================
// PRÉ-CARREGAMENTO DOS DASHBOARDS
// ============================================

async function preCarregarDashboardsIndex() {
    console.log('🚀 Iniciando pré-carregamento dos dashboards...');
    
    const preloadText = document.getElementById('preloadText');
    const preloadSpinner = document.getElementById('preloadSpinner');
    const preloadStatus = document.getElementById('preloadStatus');
    
    const badges = {
        requisicao: document.getElementById('badgeRequisicao'),
        sistemicos: document.getElementById('badgeSistemicos'),
        fisicos: document.getElementById('badgeFisicos'),
        devolucao: document.getElementById('badgeDevolucao'),
        farol: document.getElementById('badgeFarol')
    };
    
    // Aguarda um pouco para garantir que todos os scripts foram carregados
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verifica se a API_URL está disponível
    if (typeof window.API_URL === 'undefined') {
        console.warn('⚠️ API_URL não definida, usando fallback');
        window.API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';
    }
    
    console.log('📡 API_URL:', window.API_URL);
    
    try {
        // Verifica se a função de pré-carregamento está disponível
        if (typeof window.preCarregarDashboards === 'function') {
            preloadText.textContent = 'Pré-carregando dados...';
            if (preloadSpinner) preloadSpinner.style.display = 'inline-block';
            
            const startTime = Date.now();
            const results = await window.preCarregarDashboards();
            const elapsed = Date.now() - startTime;
            
            if (results && results.length > 0) {
                const names = ['Aditivos Sistêmicos', 'Aditivos Físicos', 'Farol de Obras', 'Pendências Devolução', 'Pendência de Requisição'];
                const badgeKeys = ['sistemicos', 'fisicos', 'farol', 'devolucao', 'requisicao'];
                let successCount = 0;
                let totalRegistros = 0;
                
                results.forEach((result, index) => {
                    const badge = badges[badgeKeys[index]];
                    if (badge) {
                        if (result.status === 'fulfilled') {
                            const count = result.value?.length || 0;
                            totalRegistros += count;
                            badge.textContent = `✓ ${count} registros`;
                            badge.className = 'badge disponivel';
                            successCount++;
                        } else {
                            badge.textContent = '⚠️ Erro';
                            badge.className = 'badge erro';
                        }
                    }
                });
                
                if (successCount === results.length) {
                    preloadText.innerHTML = `<span class="check">✅</span> ${totalRegistros} registros carregados (${elapsed}ms)`;
                    if (preloadSpinner) preloadSpinner.style.display = 'none';
                    if (preloadStatus) {
                        preloadStatus.style.borderColor = '#48BB78';
                        preloadStatus.style.background = '#F0FFF4';
                    }
                } else if (successCount > 0) {
                    preloadText.innerHTML = `<span class="check">⚠️</span> ${successCount}/${results.length} carregados (${elapsed}ms)`;
                    if (preloadSpinner) preloadSpinner.style.display = 'none';
                    if (preloadStatus) {
                        preloadStatus.style.borderColor = '#ED8936';
                        preloadStatus.style.background = '#FFFAF0';
                    }
                } else {
                    preloadText.innerHTML = `<span class="error">❌</span> Erro ao carregar (${elapsed}ms)`;
                    if (preloadSpinner) preloadSpinner.style.display = 'none';
                    if (preloadStatus) {
                        preloadStatus.style.borderColor = '#FC8181';
                        preloadStatus.style.background = '#FFF5F5';
                    }
                }
            } else {
                preloadText.textContent = '⚠️ Nenhum dado retornado';
                if (preloadSpinner) preloadSpinner.style.display = 'none';
            }
        } else {
            console.warn('⚠️ Função preCarregarDashboards não disponível');
            preloadText.textContent = '⚠️ Carregamento automático indisponível';
            if (preloadSpinner) preloadSpinner.style.display = 'none';
            
            // Marca todos como disponíveis mesmo sem pré-carregamento
            Object.values(badges).forEach(badge => {
                if (badge) {
                    badge.textContent = '✓ Disponível';
                    badge.className = 'badge disponivel';
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Erro no pré-carregamento:', error);
        preloadText.innerHTML = `<span class="error">❌</span> ${error.message || 'Erro desconhecido'}`;
        if (preloadSpinner) preloadSpinner.style.display = 'none';
        if (preloadStatus) {
            preloadStatus.style.borderColor = '#FC8181';
            preloadStatus.style.background = '#FFF5F5';
        }
        
        // Marca todos como disponíveis mesmo com erro
        Object.values(badges).forEach(badge => {
            if (badge) {
                badge.textContent = '✓ Disponível';
                badge.className = 'badge disponivel';
            }
        });
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM carregado, inicializando página de dashboards...');
    
    // Carrega os dados do usuário
    carregarDadosUsuario();
    
    // Inicia o pré-carregamento
    preCarregarDashboardsIndex();
});

// ============================================
// EXPORTAR
// ============================================

window.carregarDadosUsuario = carregarDadosUsuario;
window.preCarregarDashboardsIndex = preCarregarDashboardsIndex;

console.log('✅ dashboards-index.js inicializado!');