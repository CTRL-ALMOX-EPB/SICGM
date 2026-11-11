// ============================================================
// SITA v2 — Separação (tela do separador)
// ============================================================
let docAtual = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarLista();
});

async function carregarLista() {
    const cont = document.getElementById('sepLista');
    cont.innerHTML = '<div style="padding:2rem;text-align:center;color:#6b7280">Carregando...</div>';

    try {
        const json = await SitaAPI._fetch('/api/separacao');
        const docs = json.data || [];

        if (docs.length === 0) {
            cont.innerHTML = `
                <div style="padding:2rem;text-align:center;color:#6b7280">
                    📭 Nenhuma lista atribuída a você no momento.
                </div>
            `;
            return;
        }

        cont.innerHTML = docs.map(d => {
            const itens = d.itens || [];
            const separados = itens.filter(i => (i.qtd_separada || 0) > 0).length;
            const pct = itens.length > 0 ? Math.round((separados / itens.length) * 100) : 0;
            const devolvida = (d.subetapas || []).some(s => s.codigo === 'ET3_DEVOLVER_LISTA_SISTEMA' && s.concluida);

            return `
                <div class="sep-card" onclick="abrirDrawer(${d.numero})">
                    <div class="sep-card-top">
                        <div>
                            <div class="sep-card-num">#${String(d.numero).padStart(4,'0')}</div>
                            <div class="sep-card-obra">Obra ${d.obra}</div>
                        </div>
                        <span class="sep-card-tag">${devolvida ? '✅ DEVOLVIDA' : '⏳ EM SEPARAÇÃO'}</span>
                    </div>
                    <div class="sep-card-meta">
                        <span>📅 ${d.data_programacao}</span>
                        <span>📦 ${itens.length} itens</span>
                    </div>
                    <div class="sep-card-progress">
                        <div class="sep-card-progress-fill" style="width:${pct}%"></div>
                    </div>
                    <div style="font-size:.75rem;color:#6b7280">${separados} / ${itens.length} separados (${pct}%)</div>
                </div>
            `;
        }).join('');
    } catch (e) {
        cont.innerHTML = `<div style="padding:2rem;text-align:center;color:#dc2626">❌ ${e.message}</div>`;
    }
}

async function abrirDrawer(numero) {
    try {
        docAtual = await SitaAPI.buscar(numero);
    } catch (e) { alert(e.message); return; }

    const drawer = document.getElementById('sepDrawer');
    const inner = document.getElementById('sepDrawerInner');
    drawer.style.display = 'block';

    const itens = docAtual.itens || [];
    const devolvida = (docAtual.subetapas || []).some(s => s.codigo === 'ET3_DEVOLVER_LISTA_SISTEMA' && s.concluida);

    inner.innerHTML = `
        <div class="sep-drawer-header">
            <div class="sep-drawer-title">#${String(docAtual.numero).padStart(4,'0')} — Obra ${docAtual.obra}</div>
            <button class="sep-drawer-close" onclick="fecharDrawer()">✕</button>
        </div>

        <div style="margin-bottom:1rem; display:flex; gap:1rem; flex-wrap:wrap; font-size:.85rem; color:#6b7280;">
            <span>📅 ${docAtual.data_programacao}</span>
            <span>👷 ${docAtual.separador || '—'}</span>
            ${devolvida ? `<span style="color:#16a34a;font-weight:700">✅ Lista já devolvida</span>` : ''}
        </div>

        <table class="sep-tabela">
            <thead>
                <tr>
                    <th style="width:36px">#</th>
                    <th style="width:100px">Código</th>
                    <th>Descrição</th>
                    <th style="width:50px">UN</th>
                    <th style="width:70px">Base</th>
                    <th style="width:70px">Aditivo</th>
                    <th style="width:90px">Separada</th>
                    <th style="width:80px">Pendente</th>
                </tr>
            </thead>
            <tbody>
                ${itens.map((it, idx) => `
                    <tr>
                        <td style="color:#9ca3af;text-align:center">${idx + 1}</td>
                        <td>${it.codigo}</td>
                        <td>${(it.descricao || '').replace(/</g, '&lt;')}</td>
                        <td style="text-align:center">${it.unidade || ''}</td>
                        <td style="text-align:right">${it.qtd_programada || 0}</td>
                        <td style="text-align:right">${it.qtd_aditivo_saida || 0}</td>
                        <td>
                            <input type="number" class="editable num" value="${it.qtd_separada || 0}" step="any" min="0"
                                ${devolvida ? 'disabled' : ''}
                                onchange="salvarSeparada(${it.id}, parseFloat(this.value)||0)">
                        </td>
                        <td>
                            <input type="number" class="editable num" value="${it.qtd_pendente || 0}" step="any" min="0"
                                ${devolvida ? 'disabled' : ''}
                                onchange="salvarPendente(${it.id}, parseFloat(this.value)||0)">
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="sep-footer">
            ${!devolvida ? `
                <button class="btn-acao btn-success" onclick="devolverLista()">
                    ↩️ Devolver como Separada
                </button>
            ` : `
                <span style="color:#16a34a;font-weight:700">✅ Lista devolvida — aguardando backoffice</span>
            `}
        </div>
    `;
}

function fecharDrawer() {
    document.getElementById('sepDrawer').style.display = 'none';
    docAtual = null;
    carregarLista();
}

async function salvarSeparada(itemId, valor) {
    try {
        await SitaAPI.atualizarItem(docAtual.numero, itemId, { qtd_separada: valor });
    } catch (e) { alert(e.message); }
}

async function salvarPendente(itemId, valor) {
    try {
        await SitaAPI.atualizarItem(docAtual.numero, itemId, { qtd_pendente: valor });
    } catch (e) { alert(e.message); }
}

async function devolverLista() {
    if (!confirm('Confirmar devolução da lista como SEPARADA?\n\nApós isso você não poderá mais editar as quantidades.')) return;
    try {
        await SitaAPI.concluirSubetapa(docAtual.numero, 'ET3_DEVOLVER_LISTA_SISTEMA');
        alert('✅ Lista devolvida como Separada');
        abrirDrawer(docAtual.numero);
    } catch (e) { alert(e.message); }
}