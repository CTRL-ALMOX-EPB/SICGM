// SITA v2 — index.js (calendário semanal/mensal)
let visaoAtual = 'semanal';
let dataRef = new Date();

document.addEventListener('DOMContentLoaded', async () => {
    renderLegenda();
    await render();
});

function toast(msg, tipo = 'info') {
    const el = document.getElementById('sitaToast');
    el.textContent = msg;
    el.className = `sita-toast ativo ${tipo}`;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = 'sita-toast'; }, 3000);
}

function renderLegenda() {
    const cont = document.getElementById('sitaLegenda');
    cont.innerHTML = Object.entries(SITA_CONFIG.ETAPAS).map(([n, e]) =>
        `<span class="legenda-item"><span class="legenda-cor" style="background:${e.cor}"></span>${e.icone} ${e.nome}</span>`
    ).join('');
}

function inicioSemana(d) {
    const dt = new Date(d); const dia = dt.getDay();
    dt.setDate(dt.getDate() - dia); dt.setHours(0,0,0,0);
    return dt;
}
function iso(d) {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
}
function br(d) { return d.toLocaleDateString('pt-BR'); }

function mudarVisao(v) {
    visaoAtual = v;
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    render();
}
function navegar(dir) {
    if (visaoAtual === 'semanal') dataRef.setDate(dataRef.getDate() + dir*7);
    else dataRef.setMonth(dataRef.getMonth() + dir);
    render();
}
function irHoje() { dataRef = new Date(); render(); }

async function render() {
    if (visaoAtual === 'semanal') await renderSemanal();
    else await renderMensal();
}

async function renderSemanal() {
    const ini = inicioSemana(dataRef);
    const fim = new Date(ini); fim.setDate(fim.getDate() + 6);
    document.getElementById('sitaPeriodo').textContent = `${br(ini)} — ${br(fim)}`;

    const json = await SitaAPI.calendario(iso(ini), iso(fim));
    const porDia = json.por_dia || {};
    const hojeISO = iso(new Date());

    const cont = document.getElementById('sitaCalendario');
    let html = '<div class="cal-grid-semanal">';
    for (let i = 0; i < 7; i++) {
        const dia = new Date(ini); dia.setDate(dia.getDate() + i);
        const isoDia = iso(dia);
        const dados = porDia[isoDia] || { total: 0, docs: [] };
        const isHoje = isoDia === hojeISO;

        html += `
            <div class="cal-day ${isHoje ? 'hoje' : ''}">
                <div class="cal-day-header">
                    <div>
                        <div class="cal-day-name">${dia.toLocaleDateString('pt-BR',{weekday:'short'})}</div>
                        <div class="cal-day-num">${String(dia.getDate()).padStart(2,'0')}</div>
                    </div>
                    <div class="cal-day-count">${dados.total}</div>
                </div>
                <div class="cal-day-body">
                    ${(dados.docs || []).map(d => pillHTML(d)).join('')}
                </div>
            </div>
        `;
    }
    html += '</div>';
    cont.innerHTML = html;
}

function pillHTML(doc) {
    const e = SITA_CONFIG.ETAPAS[doc.etapa_atual] || { cor: '#64748b', icone: '📋' };
    const urgent = doc.is_urgente ? '🚨' : '';
    return `<div class="pill" style="background:${e.cor}" onclick="abrirDocumento(${doc.numero})">
        <span>${urgent} ${doc.obra}</span>
        <span class="pill-dot">${e.icone}</span>
    </div>`;
}

async function renderMensal() {
    const ini = new Date(dataRef.getFullYear(), dataRef.getMonth(), 1);
    const fim = new Date(dataRef.getFullYear(), dataRef.getMonth()+1, 0);
    document.getElementById('sitaPeriodo').textContent = ini.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

    const json = await SitaAPI.calendario(iso(ini), iso(fim));
    const porDia = json.por_dia || {};
    const hojeISO = iso(new Date());
    const inicioGrid = inicioSemana(ini);

    const cont = document.getElementById('sitaCalendario');
    let html = '<div class="cal-grid-mensal">';
    ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].forEach(d => html += `<div class="cal-mes-dow">${d}</div>`);

    for (let i = 0; i < 42; i++) {
        const dia = new Date(inicioGrid); dia.setDate(dia.getDate() + i);
        const isoDia = iso(dia);
        const dados = porDia[isoDia] || { total: 0, por_etapa: {} };
        const fora = dia.getMonth() !== ini.getMonth();
        const isHoje = isoDia === hojeISO;

        let bars = '';
        if (dados.total > 0) {
            const totalEtapas = Object.values(dados.por_etapa || {}).reduce((a,b) => a+b, 0);
            bars = Object.entries(dados.por_etapa || {}).filter(([_,v]) => v > 0).map(([etapa, qtd]) => {
                const e = SITA_CONFIG.ETAPAS[etapa];
                const pct = (qtd / totalEtapas) * 100;
                return `<div class="cal-mes-bar" title="${e.nome}: ${qtd}"><div class="cal-mes-bar-fill" style="width:${pct}%;background:${e.cor}"></div></div>`;
            }).join('');
        }

        html += `
            <div class="cal-mes-dia ${fora ? 'fora' : ''} ${isHoje ? 'hoje' : ''}" onclick="verDia('${isoDia}')">
                <div class="cal-mes-num">${dia.getDate()}</div>
                <div class="cal-mes-bars">${bars}</div>
            </div>
        `;
    }
    html += '</div>';
    cont.innerHTML = html;
}

function verDia(isoDia) {
    dataRef = new Date(isoDia + 'T00:00:00');
    mudarVisao('semanal');
}

async function buscar(termo) {
    const box = document.getElementById('sitaBuscaResultados');
    if (!termo || termo.length < 2) { box.classList.remove('ativo'); return; }
    try {
        const json = await SitaAPI.buscaProgramacao(termo);
        const arr = json.data || [];
        if (arr.length === 0) { box.classList.remove('ativo'); return; }
        box.innerHTML = arr.map(d => `
            <div class="busca-item" onclick="abrirDocumento(${d.numero})">
                <strong>${d.obra}</strong> · #${String(d.numero).padStart(4,'0')} · ${d.data_programacao} · etapa ${d.etapa_atual}
            </div>
        `).join('');
        box.classList.add('ativo');
    } catch (e) { console.error(e); }
}

function abrirNovaObra() {
    document.getElementById('novaObraNumero').value = '';
    document.getElementById('novaObraData').value = iso(new Date());
    document.getElementById('novaObraEncarregado').value = '';
    document.getElementById('novaObraObs').value = '';
    document.getElementById('novaObraUrgente').checked = false;
    document.getElementById('modalNovaObra').classList.add('ativo');
}
function fecharNovaObra() { document.getElementById('modalNovaObra').classList.remove('ativo'); }

async function salvarNovaObra() {
    const obra = document.getElementById('novaObraNumero').value.trim();
    const data = document.getElementById('novaObraData').value;
    if (!obra || !data) return toast('Preencha obra e data', 'erro');

    try {
        await SitaAPI.criar({
            obra,
            data_programacao: data,
            encarregado: document.getElementById('novaObraEncarregado').value.trim(),
            obs_inicial: document.getElementById('novaObraObs').value.trim(),
            is_urgente: document.getElementById('novaObraUrgente').checked
        });
        toast('Obra criada!', 'sucesso');
        fecharNovaObra();
        render();
    } catch (e) { toast(e.message, 'erro'); }
}

function abrirDocumento(numero) {
    window.location.href = `documento.html?numero=${numero}`;
}