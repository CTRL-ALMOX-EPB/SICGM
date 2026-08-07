// ============================================
// DASHBOARDS INDEX - SCRIPT DA PÁGINA INICIAL
// ============================================

console.log('🚀 dashboards-index.js carregado!');

// ============================================
// CARREGAR INFORMAÇÕES DO USUÁRIO
// ============================================

function carregarDadosUsuario() {
    try {
        const sessao = sessionStorage.getItem('sessaoSICGM');
        if (sessao) {
            const dados = JSON.parse(sessao);
            
            // Atualiza o avatar com a primeira letra do nome
            const avatar = document.getElementById('userAvatar');
            if (avatar && dados.nome) {
                avatar.textContent = dados.nome.charAt(0).toUpperCase();
            }
            
            // Atualiza o nome
            const nomeEl = document.getElementById('userName');
            if (nomeEl && dados.nome) {
                nomeEl.textContent = dados.nome;
            }
            
            // Atualiza a matrícula
            const matriculaEl = document.getElementById('userMatricula');
            if (matriculaEl && dados.matricula) {
                matriculaEl.textContent = `Matrícula: ${dados.matricula}`;
            }
            
            // Atualiza o perfil
            const perfilEl = document.getElementById('userPerfil');
            if (perfilEl && dados.perfil) {
                perfilEl.textContent = dados.perfil;
            }
            
            return dados;
        }
    } catch (e) {
        console.warn('⚠️ Erro ao carregar dados do usuário:', e);
    }
    return null;
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
            preloadText.textContent = 'Pré-carregando dados dos dashboards...';
            if (preloadSpinner) preloadSpinner.style.display = 'inline-block';
            
            const startTime = Date.now();
            const results = await window.preCarregarDashboards();
            const elapsed = Date.now() - startTime;
            
            if (results && results.length > 0) {
                const names = ['Aditivos Sistêmicos', 'Aditivos Físicos', 'Farol de Obras', 'Pendências Devolução'];
                const badgeKeys = ['sistemicos', 'fisicos', 'farol', 'devolucao'];
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
                    preloadText.innerHTML = `<span class="check">✅</span> Todos os dashboards pré-carregados (${totalRegistros} registros em ${elapsed}ms)`;
                    if (preloadSpinner) preloadSpinner.style.display = 'none';
                    if (preloadStatus) preloadStatus.style.color = '#48bb78';
                } else if (successCount > 0) {
                    preloadText.innerHTML = `<span class="check">⚠️</span> ${successCount}/${results.length} dashboards pré-carregados (${elapsed}ms)`;
                    if (preloadSpinner) preloadSpinner.style.display = 'none';
                    if (preloadStatus) preloadStatus.style.color = '#ed8936';
                } else {
                    preloadText.innerHTML = `<span class="error">❌</span> Erro ao pré-carregar dados (${elapsed}ms)`;
                    if (preloadSpinner) preloadSpinner.style.display = 'none';
                    if (preloadStatus) preloadStatus.style.color = '#fc8181';
                }
            } else {
                preloadText.textContent = '⚠️ Nenhum dado retornado';
                if (preloadSpinner) preloadSpinner.style.display = 'none';
                if (preloadStatus) preloadStatus.style.color = '#ed8936';
            }
        } else {
            console.warn('⚠️ Função preCarregarDashboards não disponível');
            preloadText.textContent = '⚠️ Carregamento automático indisponível';
            if (preloadSpinner) preloadSpinner.style.display = 'none';
            if (preloadStatus) preloadStatus.style.color = '#ed8936';
            
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
        preloadText.innerHTML = `<span class="error">❌</span> Erro: ${error.message || 'Desconhecido'}`;
        if (preloadSpinner) preloadSpinner.style.display = 'none';
        if (preloadStatus) preloadStatus.style.color = '#fc8181';
        
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