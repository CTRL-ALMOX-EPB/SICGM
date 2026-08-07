// ============================================
// DASHBOARD FAROL DE OBRAS (OTIMIZADO)
// ============================================

console.log('🚀 dashboards-farol-obras.js carregado!');

let dadosCompletos = [];

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📋 DOM carregado, iniciando dashboard Farol de Obras...');
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    
    if (!loadingOverlay || !dashboardContent) {
        console.error('❌ Elementos não encontrados!');
        return;
    }
    
    const sessao = getSessao();
    if (!sessao) {
        console.log('❌ Sessão inválida');
        return;
    }
    
    console.log('👤 Usuário:', sessao.nome, '- Perfil:', sessao.perfil);
    
    document.getElementById('userName').textContent = sessao.nome || 'Usuário';
    document.getElementById('userMatricula').textContent = `Matrícula: ${sessao.matricula || '---'}`;
    document.getElementById('userPerfil').textContent = sessao.perfil || 'GESTÃO';
    
    try {
        console.log('📡 Iniciando busca de dados...');
        
        const startTime = Date.now();
        dadosCompletos = await buscarFarolObrasCompleto();
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ ${dadosCompletos.length} obras carregadas em ${elapsed}ms`);
        
        if (dadosCompletos.length === 0) {
            console.warn('⚠️ Nenhuma obra encontrada no farol');
            mostrarToast('⚠️ Nenhuma obra encontrada no farol', 'warning');
        }
        
        renderizarDashboard(dadosCompletos);
        
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        console.log('✅ Dashboard renderizado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarToast(`❌ Erro ao carregar dados: ${error.message}`, 'error');
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        
        document.getElementById('obrasList').innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">❌</div>
                <p>Erro ao carregar dados</p>
                <p style="font-size: 12px; color: #a0aec0;">${error.message}</p>
                <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 20px; background: #4299e1; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Tentar novamente
                </button>
            </div>
        `;
    }
});

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(obras) {
    console.log(`📊 Renderizando farol com ${obras.length} obras...`);
    const ativas = obras.filter(o => o.status !== 'FINALIZADO');
    
    renderizarFarolCards(ativas);
    renderizarListaObras(ativas);
}

// ============================================
// FAROL CARDS
// ============================================

function renderizarFarolCards(obras) {
    console.log('📊 Renderizando cards do farol...');
    const container = document.getElementById('farolGrid');
    if (!container) return;
    
    const total = obras.length;
    const canceladas = obras.filter(o => o.cancelada === 'SIM').length;
    const comAditivo = obras.filter(o => o.aditivo === 'SIM').length;
    const foraProgramacao = obras.filter(o => o.obra_programada === 'NÃO').length;
    const devolvidas = obras.filter(o => o.devolvida === 'SIM').length;
    const comSaida = obras.filter(o => o.obra_teve_saida === 'SIM').length;
    
    const encarregados = {};
    obras.forEach(o => {
        const nome = o.encarregado || 'NÃO INFORMADO';
        if (!encarregados[nome]) encarregados[nome] = 0;
        encarregados[nome]++;
    });
    const totalEncarregados = Object.keys(encarregados).length;
    
    container.innerHTML = `
        <div class="farol-card azul">
            <div class="farol-icon">🏗️</div>
            <div class="farol-value">${total}</div>
            <div class="farol-label">Total de Obras Ativas</div>
        </div>
        <div class="farol-card vermelho">
            <div class="farol-icon">❌</div>
            <div class="farol-value">${canceladas}</div>
            <div class="farol-label">Obras Canceladas</div>
        </div>
        <div class="farol-card amarelo">
            <div class="farol-icon">📝</div>
            <div class="farol-value">${comAditivo}</div>
            <div class="farol-label">Obras com Aditivo</div>
        </div>
        <div class="farol-card amarelo">
            <div class="farol-icon">📅</div>
            <div class="farol-value">${foraProgramacao}</div>
            <div class="farol-label">Fora de Programação</div>
        </div>
        <div class="farol-card verde">
            <div class="farol-icon">📦</div>
            <div class="farol-value">${devolvidas}</div>
            <div class="farol-label">Obras Devolvidas</div>
        </div>
        <div class="farol-card verde">
            <div class="farol-icon">🚚</div>
            <div class="farol-value">${comSaida}</div>
            <div class="farol-label">Obras com Saída</div>
        </div>
        <div class="farol-card azul">
            <div class="farol-icon">👤</div>
            <div class="farol-value">${totalEncarregados}</div>
            <div class="farol-label">Encarregados</div>
        </div>
    `;
}

// ============================================
// LISTA DE OBRAS
// ============================================

function renderizarListaObras(obras) {
    const container = document.getElementById('obrasList');
    if (!container) return;
    
    if (obras.length === 0) {
        container.innerHTML = `
            <div class="empty-state-dashboard">
                <div class="icon">📭</div>
                <p>Nenhuma obra encontrada</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    obras.forEach(o => {
        const badges = [];
        if (o.cancelada === 'SIM') badges.push('<span class="badge-farol cancelada">❌ Cancelada</span>');
        if (o.aditivo === 'SIM') badges.push('<span class="badge-farol com-aditivo">📝 Com Aditivo</span>');
        if (o.obra_programada === 'NÃO') badges.push('<span class="badge-farol fora-programacao">📅 Fora Programação</span>');
        if (o.devolvida === 'SIM') badges.push('<span class="badge-farol devolvida">📦 Devolvida</span>');
        if (o.obra_teve_saida === 'SIM') badges.push('<span class="badge-farol com-saida">🚚 Com Saída</span>');
        if (badges.length === 0) badges.push('<span class="badge-farol normal">✅ Normal</span>');
        
        const encarregado = o.encarregado || 'NÃO INFORMADO';
        const setor = o.setor || 'Sem setor';
        
        html += `
            <div class="obra-farol-item">
                <div class="obra-info">
                    <span class="obra">${o.obra || 'SEM OBRA'}</span>
                    <span class="detalhes">
                        👤 ${encarregado} | 
                        📅 ${formatarData(o.data_programacao)} | 
                        📍 ${setor}
                    </span>
                </div>
                <div>
                    ${badges.join(' ')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// EXPORTAR
// ============================================

console.log('✅ dashboards-farol-obras.js inicializado!');