// SITA v2 — despacho.js (separadores vêm do authService)
let listaSeparadores = [];
let obraArrastada = null;

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('despachoData').value = iso(new Date());
    await carregarSeparadores();
    render();
});

function iso(d) { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }

async function carregarSeparadores() {
    try {
        if (typeof authService === 'undefined' || !authService.listUsers) {
            console.warn('authService indisponível, usando fallback');
            listaSeparadores = [];
            return;
        }
        const res = await authService.listUsers();
        const usuarios = (res.usuarios || []).filter(u => u.ativo);
        // Filtra por perfil (quando SEPARADOR existir); fallback: OPERACIONAL
        const filtrados = usuarios.filter(u => {
            const p = (u.perfil || '').toUpperCase();
            return p === 'SEPARADOR' || p === 'OPERACIONAL' || p === 'GESTAO';
        });
        listaSeparadores = filtrados.map(u => ({
            nome: u.nome,
            matricula: u.matricula,
            perfil: u.perfil
        }));
        console.log(`✅ ${listaSeparadores.length} separadores carregados`);
    } catch (e) {
        console.warn('Erro ao carregar separadores:', e.message);
        listaSeparadores = [];
    }
}

async function render() {
    const data = document.getElementById('despachoData').value;
    const json = await SitaAPI.listarDespacho(data);
    const docs = json.data || [];
    document.getElementById('despachoTotal').textContent = `${docs.length} na etapa 2`;

    const lista = document.getElementById('despachoLista');
    if (docs.length === 0) {
        lista.innerHTML = '<div class="esteira-empty">Nenhum documento na etapa 2 nesta data.</div>';
    } else {
        lista.innerHTML = docs.map(d => `
            <div class="despacho-card" draggable="true" data-numero="${d.numero}">
                <div>
                    <div class="num">#${String(d.numero).padStart(4,'0')}</div>
                    <div class="obra">Obra ${d.obra}</div>
                </div>
                <span class="obra">${d.data_programacao}</span>
            </div>
        `).join('');
        lista.querySelectorAll('.despacho-card').forEach(card => {
            card.addEventListener('dragstart', e => {
                obraArrastada = parseInt(e.currentTarget.dataset.numero);
                e.currentTarget.classList.add('dragging');
            });
            card.addEventListener('dragend', e => e.currentTarget.classList.remove('dragging'));
        });
    }

    const seps = document.getElementById('despachoListaSeparadores');
    if (listaSeparadores.length === 0) {
        seps.innerHTML = '<div class="esteira-empty">Nenhum separador encontrado.</div>';
    } else {
        seps.innerHTML = listaSeparadores.map(s => `
            <div class="sep-item" data-matricula="${s.matricula || ''}" data-nome="${s.nome || ''}">
                <div>
                    <span class="nome">👷 ${s.nome}</span>
                    ${s.matricula ? `<span class="mat">Mat: ${s.matricula}</span>` : ''}
                </div>
            </div>
        `).join('');
        seps.querySelectorAll('.sep-item').forEach(el => {
            el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
            el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
            el.addEventListener('drop', async e => {
                e.preventDefault();
                el.classList.remove('drag-over');
                if (!obraArrastada) return;
                const sep = el.dataset.matricula || el.dataset.nome;
                if (!sep) { alert('Separador sem matrícula — não pode ser despachado'); return; }
                try {
                    await SitaAPI.despachar(obraArrastada, sep);
                    obraArrastada = null;
                    render();
                } catch (err) { alert(err.message); }
            });
        });
    }
}