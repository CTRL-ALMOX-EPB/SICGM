// ============================================
// DASHBOARD FAROL DE OBRAS
// ============================================

let dadosCompletos = [];

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const dashboardContent = document.getElementById('dashboardContent');
    
    const sessao = getSessao();
    if (!sessao) return;
    
    document.getElementById('userName').textContent = sessao.nome || 'Usuário';
    document.getElementById('userMatricula').textContent = `Matrícula: ${sessao.matricula || '---'}`;
    document.getElementById('userPerfil').textContent = sessao.perfil || 'GESTÃO';
    
    try {
        // Busca todos os registros do farol
        const response = await fetch(`${API_URL}/farol-obras?limit=1000`);
        if (!response.ok) throw new Error('Erro ao buscar dados');
        
        const data = await response.json();
        dadosCompletos = data.data || [];
        
        console.log(`✅ ${dadosCompletos.length} obras carregadas`);
        
        renderizarDashboard(dadosCompletos);
        
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarToast('❌ Erro ao carregar dados', 'error');
        loadingOverlay.classList.remove('active');
        dashboardContent.style.display = 'block';
    }
});

// ============================================
// RENDERIZAÇÃO
// ============================================

function renderizarDashboard(obras) {
    const ativas = obras.filter(o => o.status !== 'FINALIZADO');
    
    renderizarFarolCards(ativas);
    renderizarListaObras(ativas);
}

// ============================================
// FAROL CARDS
// ============================================

function renderizarFarolCards(obras) {
    const total = obras.length;
    const canceladas = obras.filter(o => o.cancelada === 'SIM').length;
    const comAditivo = obras.filter(o => o.aditivo === 'SIM').length;
    const foraProgramacao = obras.filter(o => o.obra_programada === 'NÃO').length;
    const devolvidas = obras.filter(o => o.devolvida === 'SIM').length;
    
    // Contagem por encarregado
    const encarregados = {};
    obras.forEach(o => {
        const nome = o.encarregado || 'NÃO INFORMADO';
        if (!encarregados[nome]) encarregados[nome] = 0;
        encarregados[nome]++;
    });
    const totalEncarregados = Object.keys(encarregados).length;
    
    document.getElementById('farolGrid').innerHTML = `
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
        if (badges.length === 0) badges.push('<span class="badge-farol normal">✅ Normal</span>');
        
        html += `
            <div class="obra-farol-item">
                <div class="obra-info">
                    <span class="obra">${o.obra || 'SEM OBRA'}</span>
                    <span class="detalhes">
                        👤 ${o.encarregado || 'NÃO INFORMADO'} | 
                        📅 ${formatarData(o.data_programacao)} | 
                        ${o.setor || 'Sem setor'}
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