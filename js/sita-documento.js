let numeroDoc = null;
let docAtual = null;

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    numeroDoc = parseInt(params.get('numero'));
    if (!numeroDoc) { alert('Número ausente'); abrirSubSita('index.html', 'SITA'); return; }
    render();
});

async function render() {
    try {
        docAtual = await SitaAPI.buscar(numeroDoc);
    } catch (e) { alert(e.message); return; }

    document.getElementById('docNumero').textContent = `#${String(docAtual.numero).padStart(4,'0')}`;

    const etapa = SITA_CONFIG.ETAPAS[docAtual.etapa_atual] || SITA_CONFIG.ETAPAS[1];

    document.getElementById('docHeader').innerHTML = `
        <div class="obra">${docAtual.obra} ${docAtual.is_urgente ? '🚨' : ''}</div>
        <span class="tag" style="background:${etapa.cor}">${etapa.icone} ${etapa.nome}</span>
        <div class="meta">
            <span>📅 ${docAtual.data_programacao}</span>
            <span>👤 ${docAtual.encarregado || '—'}</span>
            <span>👷 ${docAtual.separador || '—'}</span>
        </div>
    `;

    let stepper = '';
    for (let n = 1; n <= 7; n++) {
        const e = SITA_CONFIG.ETAPAS[n];
        const cls = n === docAtual.etapa_atual ? 'ativo' : (n < docAtual.etapa_atual ? 'completo' : '');
        const style = n === docAtual.etapa_atual ? `style="background:${e.cor}"` : '';
        stepper += `<div class="step ${cls}" ${style}><span class="step-icon">${e.icone}</span>${e.nome}</div>`;
    }
    document.getElementById('docStepper').innerHTML = stepper;

    await renderEtapa();
    renderTimeline();
}

async function renderEtapa() {
    const cont = document.getElementById('tab-etapa');
    const etapa = docAtual.etapa_atual;
    const e = SITA_CONFIG.ETAPAS[etapa];

    if (etapa === 1) {
        cont.innerHTML = `
            <h3 class="etapa-titulo">${e.icone} Etapa 1 — Programação</h3>
            <div class="etapa-form">
                <div><label>Obra</label><input type="text" id="e1Obra" value="${docAtual.obra}"></div>
                <div><label>Data</label><input type="date" id="e1Data" value="${docAtual.data_programacao}"></div>
                <div><label>Encarregado</label><input type="text" id="e1Enc" value="${docAtual.encarregado || ''}"></div>
            </div>
            <div><label>Observação</label><textarea id="e1Obs" rows="3" style="width:100%">${docAtual.obs_inicial || ''}</textarea></div>
            <div style="margin-top:1rem; display:flex; gap:.5rem;">
                <button class="btn-acao btn-primary" onclick="salvarEtapa1()">💾 Salvar</button>
                <button class="btn-acao btn-success" onclick="avancar()">➡️ Avançar para Lista de Separação</button>
            </div>
        `;
    } else if (etapa === 2) {
        await Etapa2.render(cont, docAtual);
    } else if (etapa === 3) {
        await Etapa3.render(cont, docAtual);
    } else if (etapa === 4) {
        await Etapa4.render(cont, docAtual);
    } else {
        cont.innerHTML = `
            <h3 class="etapa-titulo">${e.icone} Etapa ${etapa} — ${e.nome}</h3>
            <p style="color:#6b7280">Esta etapa será implementada no próximo bloco.</p>
            ${renderSubetapasAtuais()}
            <button class="btn-acao btn-success" onclick="avancar()">➡️ Avançar</button>
        `;
    }
}

function renderSubetapasAtuais() {
    const subs = (docAtual.subetapas || []).filter(s => s.etapa === docAtual.etapa_atual);
    if (subs.length === 0) return '';
    return `<div class="subetapas">
        ${subs.map(s => {
            const def = (SITA_CONFIG.SUBETAPAS[s.etapa] || []).find(x => x.codigo === s.codigo);
            return `<div class="subetapa ${s.concluida ? 'ok' : ''}">
                <input type="checkbox" ${s.concluida ? 'checked' : ''} onchange="toggleSubetapa('${s.codigo}', this.checked)">
                <span class="subetapa-label">${def?.label || s.codigo}</span>
                ${s.concluida ? `<span class="subetapa-meta">✓ ${s.concluida_por}</span>` : ''}
            </div>`;
        }).join('')}
    </div>`;
}

async function toggleSubetapa(codigo, marcar) {
    try {
        if (marcar) await SitaAPI.concluirSubetapa(numeroDoc, codigo);
        else await SitaAPI.reabrirSubetapa(numeroDoc, codigo);
        render();
    } catch (e) { alert(e.message); }
}

async function salvarEtapa1() {
    try {
        await SitaAPI.atualizar(numeroDoc, {
            obra: document.getElementById('e1Obra').value.trim(),
            data_programacao: document.getElementById('e1Data').value,
            encarregado: document.getElementById('e1Enc').value.trim(),
            obs_inicial: document.getElementById('e1Obs').value.trim()
        });
        alert('Salvo!');
        render();
    } catch (e) { alert(e.message); }
}

async function avancar() {
    try {
        await SitaAPI.avancar(numeroDoc);
        render();
    } catch (e) { alert(e.message); }
}

function renderTimeline() {
    const ev = docAtual.eventos || [];
    document.getElementById('tab-timeline').innerHTML = `
        <h3 class="etapa-titulo">🕓 Timeline (${ev.length})</h3>
        <div class="timeline">
            ${ev.map(e => `
                <div class="evento">
                    <div class="evento-dot"></div>
                    <div class="evento-body">
                        <div class="evento-titulo">${e.tipo}</div>
                        <div class="evento-meta">${e.usuario} · ${new Date(e.criado_em).toLocaleString('pt-BR')}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function mudarAba(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
}