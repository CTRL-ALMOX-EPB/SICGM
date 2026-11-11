document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('diaInput').value = iso(new Date());
    render();
});

function iso(d) {
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
}
function mudarDia(n) {
    const d = new Date(document.getElementById('diaInput').value + 'T00:00:00');
    d.setDate(d.getDate() + n);
    document.getElementById('diaInput').value = iso(d);
    render();
}

async function render() {
    const data = document.getElementById('diaInput').value;
    const json = await SitaAPI.esteira(data);
    const por = json.por_etapa || {};
    document.getElementById('esteiraTotal').textContent = `${json.total} documentos`;

    const cont = document.getElementById('esteira');
    let html = '';
    for (let n = 1; n <= 7; n++) {
        const e = SITA_CONFIG.ETAPAS[n];
        const docs = por[n] || [];
        html += `
            <div class="esteira-col">
                <div class="esteira-col-header" style="background:${e.cor}">
                    <span>${e.icone} ${e.nome}</span>
                    <span>${docs.length}</span>
                </div>
                <div class="esteira-col-body">
                    ${docs.length === 0 ? '<div class="esteira-empty">—</div>' : docs.map(cardHTML).join('')}
                </div>
            </div>
        `;
    }
    cont.innerHTML = html;
}

function cardHTML(doc) {
    const subs = doc.subetapas || [];
    const subsHTML = subs.length > 0 ? `
        <div class="esteira-card-subs">
            ${subs.map(s => {
                const def = (SITA_CONFIG.SUBETAPAS[s.etapa] || []).find(x => x.codigo === s.codigo);
                const label = def ? def.label : s.codigo;
                return `<div class="esteira-card-sub-item ${s.concluida ? 'ok' : 'pend'}">${s.concluida ? '✓' : '○'} ${label}</div>`;
            }).join('')}
        </div>
    ` : '';
    return `
        <div class="esteira-card" onclick="window.location.href='documento.html?numero=${doc.numero}'">
            <div class="esteira-card-num">${doc.obra} ${doc.is_urgente ? '🚨' : ''}</div>
            <div class="esteira-card-sub">#${String(doc.numero).padStart(4,'0')} · ${doc.data_programacao}</div>
            ${subsHTML}
        </div>
    `;
}