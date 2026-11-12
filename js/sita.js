// ============================================================
// SITA v2 — JS CONSOLIDADO (arquivo único)
// Todas as páginas do SITA em um só arquivo.
// Auto-detecção via <body data-page="...">
// Páginas: index | esteira | despacho | documento | separacao | pendencias
// ============================================================

// ============================================================
// 1. CONFIGURAÇÃO GLOBAL
// ============================================================
window.SITA_CONFIG = {
    API_URL: 'https://sicgm-sita.alefe-gomes-72f.workers.dev',

    ETAPAS: {
        1: { nome: 'Programação',       cor: '#3d8bfd', icone: '📋', tag: 'PROGRAMADO'   },
        2: { nome: 'Lista de Separação', cor: '#7d5bbe', icone: '📝', tag: 'PROGRAMADO'   },
        3: { nome: 'Separado',          cor: '#ff9800', icone: '📦', tag: 'EM_SEPARACAO' },
        4: { nome: 'Conferência',       cor: '#f0ad4e', icone: '🔍', tag: 'SEPARADO'     },
        5: { nome: 'Expedido',          cor: '#28a745', icone: '🚚', tag: 'EXPEDIDO'     },
        6: { nome: 'Devolvido',         cor: '#6b7a8f', icone: '↩️', tag: 'DEVOLVIDO'   }
    },

    SUBETAPAS: {
        2: [
            { codigo: 'ET2_COMPARAR_ORCAMENTO', label: 'Comparar com orçamento original' },
            { codigo: 'ET2_TRATAR_FALTA',       label: 'Verificar e tratar falta de materiais' }
        ],
        3: [
            { codigo: 'ET3_REQUISITAR_SISTEMICO', label: 'Requisitar material sistêmico (RMA)' },
            { codigo: 'ET3_ADITIVO_SAIDA',        label: 'Aditivo de saída (opcional)' },
            { codigo: 'ET3_DEVOLVER_LISTA_SISTEMA', label: 'Devolver lista de separação' }
        ],
        5: [
            { codigo: 'ET5_ADITIVO_CAMPO', label: 'Aditivo de campo (opcional)' }
        ],
        6: [
            { codigo: 'ET6_DEVOLUCAO_FISICA',     label: 'Devolução física do material' },
            { codigo: 'ET6_VERIFICAR_APLICADO',   label: 'Verificar material aplicado' },
            { codigo: 'ET6_DEVOLUCAO_SISTEMICA',  label: 'Devolução sistêmica (DMA)' }
        ]
    }
};

// ============================================================
// 2. AUTH (adapta ao authService do SICGM)
// ============================================================
window.SitaAuth = {
    usuario() {
        try {
            if (typeof authService !== 'undefined' && authService?.getUserData) {
                return authService.getUserData();
            }
        } catch (_) {}
        return null;
    },
    headers() {
        const u = this.usuario();
        return {
            'Content-Type': 'application/json',
            'X-User-Email': u?.matricula || u?.nome || 'desconhecido',
            'X-User-Perfil': u?.perfil || 'desconhecido'
        };
    },
    nome() { return this.usuario()?.nome || 'Usuário'; },
    matricula() { return this.usuario()?.matricula || '---'; },
    perfil() { return this.usuario()?.perfil || '---'; }
};

// ============================================================
// 3. API
// ============================================================
window.SitaAPI = {
    async _fetch(path, opcoes = {}) {
        const url = `${SITA_CONFIG.API_URL}${path}`;
        let headers = { 'Content-Type': 'application/json' };
        try { headers = { ...headers, ...SitaAuth.headers() }; } catch (_) {}
        const res = await fetch(url, { ...opcoes, headers: { ...headers, ...(opcoes.headers || {}) } });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
    },

    listar:           (params = {}) => SitaAPI._fetch('/api/documentos?' + new URLSearchParams(params)),
    listarArquivados: (params = {}) => SitaAPI._fetch('/api/documentos/arquivados?' + new URLSearchParams(params)),
    buscar:           (numero)      => SitaAPI._fetch(`/api/documentos/${numero}`),
    criar:            (body)        => SitaAPI._fetch('/api/documentos', { method: 'POST', body: JSON.stringify(body) }),
    atualizar:        (numero, body)=> SitaAPI._fetch(`/api/documentos/${numero}`, { method: 'PUT', body: JSON.stringify(body) }),
    arquivar:         (numero)      => SitaAPI._fetch(`/api/documentos/${numero}`, { method: 'DELETE' }),
    restaurar:        (numero, motivo) => SitaAPI._fetch(`/api/documentos/${numero}/restaurar`, { method: 'POST', body: JSON.stringify({ motivo }) }),

    avancar:          (numero)      => SitaAPI._fetch(`/api/documentos/${numero}/avancar`, { method: 'POST' }),
    voltar:           (numero, motivo) => SitaAPI._fetch(`/api/documentos/${numero}/voltar`, { method: 'POST', body: JSON.stringify({ motivo }) }),
    concluir:         (numero)      => SitaAPI._fetch(`/api/documentos/${numero}/concluir`, { method: 'POST' }),
    confirmarConferencia: (numero)  => SitaAPI._fetch(`/api/documentos/${numero}/confirmar-conferencia`, { method: 'POST' }),

    concluirSubetapa: (numero, codigo, obs) => SitaAPI._fetch(`/api/documentos/${numero}/subetapas/${codigo}/concluir`, { method: 'POST', body: JSON.stringify({ observacao: obs }) }),
    reabrirSubetapa:  (numero, codigo)      => SitaAPI._fetch(`/api/documentos/${numero}/subetapas/${codigo}/reabrir`, { method: 'POST' }),
    ignorarSubetapa:  (numero, codigo)      => SitaAPI._fetch(`/api/documentos/${numero}/subetapas/${codigo}/ignorar`, { method: 'POST' }),

    listarItens:     (numero)        => SitaAPI._fetch(`/api/documentos/${numero}/itens`),
    criarItem:       (numero, body)  => SitaAPI._fetch(`/api/documentos/${numero}/itens`, { method: 'POST', body: JSON.stringify(body) }),
    atualizarItem:   (numero, id, body) => SitaAPI._fetch(`/api/documentos/${numero}/itens/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    removerItem:     (numero, id)    => SitaAPI._fetch(`/api/documentos/${numero}/itens/${id}`, { method: 'DELETE' }),
    criarItensBulk:  (numero, itens) => SitaAPI._fetch(`/api/documentos/${numero}/itens/bulk`, { method: 'POST', body: JSON.stringify({ itens }) }),

    listarSistemicos: (numero)       => SitaAPI._fetch(`/api/documentos/${numero}/sistemicos`),
    criarSistemico:   (numero, body) => SitaAPI._fetch(`/api/documentos/${numero}/sistemicos`, { method: 'POST', body: JSON.stringify(body) }),

    listarEventos: (numero) => SitaAPI._fetch(`/api/documentos/${numero}/eventos`),

    listarTratativas: (numero)              => SitaAPI._fetch(`/api/documentos/${numero}/tratativas`),
    criarTratativa:   (numero, item_id, observacao) => SitaAPI._fetch(`/api/documentos/${numero}/tratativas`, { method: 'POST', body: JSON.stringify({ item_id, observacao }) }),

    listarPendencias: (params = {})  => SitaAPI._fetch('/api/pendencias?' + new URLSearchParams(params)),
    resolverPendencia: (id, resolucao) => SitaAPI._fetch(`/api/pendencias/${id}/resolver`, { method: 'POST', body: JSON.stringify({ resolucao }) }),

    listarDespacho: (data) => SitaAPI._fetch(`/api/despacho?data=${data}`),
    despachar:      (numero, separador) => SitaAPI._fetch(`/api/despacho/${numero}`, { method: 'POST', body: JSON.stringify({ separador }) }),

    listarSeparacao: () => SitaAPI._fetch('/api/separacao'),
    adicionarAditivo: (numero, body) => SitaAPI._fetch(`/api/separacao/${numero}/aditivo`, { method: 'POST', body: JSON.stringify(body) }),
    adicionarAditivoCampo: (numero, body) => SitaAPI._fetch(`/api/separacao/${numero}/aditivo-campo`, { method: 'POST', body: JSON.stringify(body) }),

    esteira:    (data)          => SitaAPI._fetch(`/api/esteira?data=${data}`),
    calendario: (inicio, fim)   => SitaAPI._fetch(`/api/calendario?inicio=${inicio}&fim=${fim}`),

    importarLote: (linhas) => SitaAPI._fetch('/api/programacao/importar-lote', { method: 'POST', body: JSON.stringify({ linhas }) }),
    buscaProgramacao: (q)  => SitaAPI._fetch(`/api/programacao/busca?q=${encodeURIComponent(q)}`),

    posicaoEstoque:  () => fetch(`${SITA_CONFIG.API_URL}/api/proxy/posicao-estoque`).then(r => r.text()),
    movimentosSiago: () => fetch(`${SITA_CONFIG.API_URL}/api/proxy/movimentos-siago`).then(r => r.text()),
    aditivosRepApv:  () => fetch(`${SITA_CONFIG.API_URL}/api/proxy/aditivos-rep-apv`).then(r => r.text())
};

// ============================================================
// 4. NAVEGAÇÃO
// ============================================================
window.abrirSubSita = function(pagina, titulo, tabId) {
    const link = `sita/${pagina}`;
    const tab = tabId || `sita-${pagina.replace('.html','').replace(/[\/?=&]/g,'-')}`;

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'SICGM_ABRIR_ABA',
            link: link,
            titulo: titulo || 'SITA',
            tabId: tab
        }, '*');
    } else {
        window.location.href = pagina;
    }
};

window.abrirDocumentoSita = function(numero) {
    const pagina = `documento.html?numero=${numero}`;
    const titulo = `SITA · Doc #${String(numero).padStart(4, '0')}`;
    const tabId = `sita-doc-${numero}`;

    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'SICGM_ABRIR_ABA',
            link: `sita/${pagina}`,
            titulo: titulo,
            tabId: tabId
        }, '*');
    } else {
        window.location.href = pagina;
    }
};

// ============================================================
// 5. HELPERS GLOBAIS
// ============================================================
window.SitaHelpers = {
    iso(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    },
    br(d) { return d.toLocaleDateString('pt-BR'); },
    inicioSemana(d) {
        const dt = new Date(d);
        const dia = dt.getDay();
        dt.setDate(dt.getDate() - dia);
        dt.setHours(0, 0, 0, 0);
        return dt;
    },
    toast(msg, tipo = 'info') {
        let el = document.getElementById('sitaToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'sitaToast';
            el.className = 'sita-toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.className = `sita-toast ativo ${tipo}`;
        clearTimeout(el._t);
        el._t = setTimeout(() => { el.className = 'sita-toast'; }, 3500);
    },
    badgeStatus(st) {
        const map = {
            'OK':        { cls: 'badge-ok',     label: '✓ OK' },
            'EXCEDE':    { cls: 'badge-excede', label: '⚠ Excede' },
            'FORA':      { cls: 'badge-fora',   label: '🚨 Fora' },
            'FALTA':     { cls: 'badge-falta',  label: '❌ Falta' },
            'ADITIVADO': { cls: 'badge-adit',   label: '➕ Aditivo' }
        };
        const b = map[st] || { cls: 'badge-pend', label: '—' };
        return `<span class="badge-status ${b.cls}">${b.label}</span>`;
    }
};

// ============================================================
// 6. MÓDULO: INDEX (calendário)
// ============================================================
window.SitaIndex = {
    visaoAtual: 'semanal',
    dataRef: new Date(),

    init() {
        this.renderLegenda();
        this.render();
    },

    renderLegenda() {
        const cont = document.getElementById('sitaLegenda');
        if (!cont) return;
        cont.innerHTML = Object.entries(SITA_CONFIG.ETAPAS).map(([n, e]) =>
            `<span class="legenda-item"><span class="legenda-cor" style="background:${e.cor}"></span>${e.icone} ${e.nome}</span>`
        ).join('') + `<span class="legenda-item"><span class="legenda-cor" style="background:#94a3b8"></span>✅ Arquivado</span>`;
    },

    mudarVisao(v) {
        this.visaoAtual = v;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
        this.render();
    },

    navegar(dir) {
        if (this.visaoAtual === 'semanal') this.dataRef.setDate(this.dataRef.getDate() + dir * 7);
        else this.dataRef.setMonth(this.dataRef.getMonth() + dir);
        this.render();
    },

    irHoje() { this.dataRef = new Date(); this.render(); },

    ocultarArq() { return document.getElementById('sitaOcultarArq')?.checked || false; },

    async render() {
        if (this.visaoAtual === 'semanal') await this.renderSemanal();
        else await this.renderMensal();
    },

    async renderSemanal() {
        const iso = SitaHelpers.iso, br = SitaHelpers.br;
        const ini = SitaHelpers.inicioSemana(this.dataRef);
        const fim = new Date(ini); fim.setDate(fim.getDate() + 6);
        document.getElementById('sitaPeriodo').textContent = `${br(ini)} — ${br(fim)}`;
        const json = await SitaAPI.calendario(iso(ini), iso(fim));
        const porDia = json.por_dia || {};
        const hojeISO = iso(new Date());
        const filtroArq = this.ocultarArq();

        const cont = document.getElementById('sitaCalendario');
        let html = '<div class="cal-grid-semanal">';
        for (let i = 0; i < 7; i++) {
            const dia = new Date(ini); dia.setDate(dia.getDate() + i);
            const isoDia = iso(dia);
            const dados = porDia[isoDia] || { total: 0, docs: [] };
            const docs = (dados.docs || []).filter(d => !filtroArq || d.status !== 'ARQUIVADO');
            const isHoje = isoDia === hojeISO;
            html += `
                <div class="cal-day ${isHoje ? 'hoje' : ''}">
                    <div class="cal-day-header">
                        <div>
                            <div class="cal-day-name">${dia.toLocaleDateString('pt-BR',{weekday:'short'})}</div>
                            <div class="cal-day-num">${String(dia.getDate()).padStart(2,'0')}</div>
                        </div>
                        <div class="cal-day-count">${docs.length}</div>
                    </div>
                    <div class="cal-day-body">${docs.map(this.pillHTML).join('')}</div>
                </div>
            `;
        }
        html += '</div>';
        cont.innerHTML = html;
    },

    pillHTML(doc) {
        const arquivado = doc.status === 'ARQUIVADO';
        const e = SITA_CONFIG.ETAPAS[doc.etapa_atual] || { cor: '#64748b', icone: '📋' };
        const cor = arquivado ? '#94a3b8' : e.cor;
        const icone = arquivado ? '✅' : e.icone;
        const urgent = doc.is_urgente ? '🚨' : '';
        return `<div class="pill ${arquivado ? 'pill-arquivado' : ''}" style="background:${cor}" onclick="abrirDocumentoSita(${doc.numero})">
            <span>${urgent} ${doc.obra}</span>
            <span class="pill-dot">${icone}</span>
        </div>`;
    },

    async renderMensal() {
        const iso = SitaHelpers.iso, inicioSemana = SitaHelpers.inicioSemana;
        const ini = new Date(this.dataRef.getFullYear(), this.dataRef.getMonth(), 1);
        const fim = new Date(this.dataRef.getFullYear(), this.dataRef.getMonth()+1, 0);
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
            html += `<div class="cal-mes-dia ${fora ? 'fora' : ''} ${isHoje ? 'hoje' : ''}" onclick="SitaIndex.verDia('${isoDia}')">
                <div class="cal-mes-num">${dia.getDate()}</div>
                <div class="cal-mes-bars">${bars}</div>
            </div>`;
        }
        html += '</div>';
        cont.innerHTML = html;
    },

    verDia(isoDia) {
        this.dataRef = new Date(isoDia + 'T00:00:00');
        this.mudarVisao('semanal');
    },

    async buscar(termo) {
        const box = document.getElementById('sitaBuscaResultados');
        if (!termo || termo.length < 2) { box.classList.remove('ativo'); return; }
        try {
            const json = await SitaAPI.buscaProgramacao(termo);
            const arr = json.data || [];
            if (arr.length === 0) { box.classList.remove('ativo'); return; }
            box.innerHTML = arr.map(d => `
                <div class="busca-item" onclick="abrirDocumentoSita(${d.numero})">
                    <strong>${d.obra}</strong> · #${String(d.numero).padStart(4,'0')} · ${d.data_programacao} · ${d.status === 'ARQUIVADO' ? '✅ ARQUIVADO' : 'etapa ' + d.etapa_atual}
                </div>
            `).join('');
            box.classList.add('ativo');
        } catch (e) { console.error(e); }
    },

    abrirNovaObra() {
        document.getElementById('novaObraNumero').value = '';
        document.getElementById('novaObraData').value = SitaHelpers.iso(new Date());
        document.getElementById('novaObraEncarregado').value = '';
        document.getElementById('novaObraObs').value = '';
        document.getElementById('novaObraUrgente').checked = false;
        document.getElementById('modalNovaObra').classList.add('ativo');
    },

    fecharNovaObra() {
        document.getElementById('modalNovaObra').classList.remove('ativo');
    },

    async salvarNovaObra() {
        const obra = document.getElementById('novaObraNumero').value.trim();
        const data = document.getElementById('novaObraData').value;
        if (!obra || !data) return SitaHelpers.toast('Preencha obra e data', 'erro');
        try {
            await SitaAPI.criar({
                obra, data_programacao: data,
                encarregado: document.getElementById('novaObraEncarregado').value.trim(),
                obs_inicial: document.getElementById('novaObraObs').value.trim(),
                is_urgente: document.getElementById('novaObraUrgente').checked
            });
            SitaHelpers.toast('Obra criada!', 'sucesso');
            this.fecharNovaObra();
            this.render();
        } catch (e) { SitaHelpers.toast(e.message, 'erro'); }
    }
};

// ============================================================
// 7. MÓDULO: ESTEIRA
// ============================================================
window.SitaEsteira = {
    init() {
        document.getElementById('diaInput').value = SitaHelpers.iso(new Date());
        this.render();
    },
    mudarDia(n) {
        const d = new Date(document.getElementById('diaInput').value + 'T00:00:00');
        d.setDate(d.getDate() + n);
        document.getElementById('diaInput').value = SitaHelpers.iso(d);
        this.render();
    },
    ocultarArq() {
        return document.getElementById('esteiraOcultarArq')?.checked || false;
    },
    async render() {
        const data = document.getElementById('diaInput').value;
        const json = await SitaAPI.esteira(data);
        const por = json.por_etapa || {};
        const filtro = this.ocultarArq();

        let totalVisivel = 0;
        for (let n = 1; n <= 6; n++) {
            const docs = (por[n] || []).filter(d => !filtro || d.status !== 'ARQUIVADO');
            totalVisivel += docs.length;
        }
        document.getElementById('esteiraTotal').textContent = `${totalVisivel} documentos`;

        const cont = document.getElementById('esteira');
        let html = '';
        for (let n = 1; n <= 6; n++) {
            const e = SITA_CONFIG.ETAPAS[n];
            const docs = (por[n] || []).filter(d => !filtro || d.status !== 'ARQUIVADO');
            html += `
                <div class="esteira-col">
                    <div class="esteira-col-header" style="background:${e.cor}">
                        <span>${e.icone} ${e.nome}</span>
                        <span>${docs.length}</span>
                    </div>
                    <div class="esteira-col-body">
                        ${docs.length === 0 ? '<div class="esteira-empty">—</div>' : docs.map(this.cardHTML).join('')}
                    </div>
                </div>
            `;
        }
        cont.innerHTML = html;
    },
    cardHTML(doc) {
        const arquivado = doc.status === 'ARQUIVADO';
        const subs = doc.subetapas || [];
        const subsHTML = subs.length > 0 ? `
            <div class="esteira-card-subs">
                ${subs.map(s => {
                    const def = (SITA_CONFIG.SUBETAPAS[s.etapa] || []).find(x => x.codigo === s.codigo);
                    const label = def ? def.label : s.codigo;
                    const icon = s.concluida ? '✓' : (s.ignorada ? '⏭' : '○');
                    const cls = s.concluida ? 'ok' : (s.ignorada ? 'ign' : 'pend');
                    return `<div class="esteira-card-sub-item ${cls}">${icon} ${label}</div>`;
                }).join('')}
            </div>
        ` : '';
        return `
            <div class="esteira-card ${arquivado ? 'esteira-card-arq' : ''}" onclick="abrirDocumentoSita(${doc.numero})">
                <div class="esteira-card-num">
                    ${doc.obra} ${doc.is_urgente ? '🚨' : ''}
                    ${arquivado ? '✅' : ''}
                </div>
                <div class="esteira-card-sub">#${String(doc.numero).padStart(4,'0')} · ${doc.data_programacao}</div>
                ${subsHTML}
            </div>
        `;
    }
};

// ============================================================
// 8. MÓDULO: DESPACHO
// ============================================================
window.SitaDespacho = {
    listaSeparadores: [],
    obraArrastada: null,

    async init() {
        document.getElementById('despachoData').value = SitaHelpers.iso(new Date());
        await this.carregarSeparadores();
        this.render();
    },

    async carregarSeparadores() {
        try {
            if (typeof authService === 'undefined' || !authService.listUsers) {
                this.listaSeparadores = [];
                return;
            }
            const res = await authService.listUsers();
            const usuarios = (res.usuarios || []).filter(u => u.ativo);
            const filtrados = usuarios.filter(u => {
                const p = (u.perfil || '').toUpperCase();
                return p === 'SEPARADOR' || p === 'OPERACIONAL' || p === 'GESTAO';
            });
            this.listaSeparadores = filtrados.map(u => ({
                nome: u.nome, matricula: u.matricula, perfil: u.perfil
            }));
        } catch (e) {
            this.listaSeparadores = [];
        }
    },

    async render() {
        const data = document.getElementById('despachoData').value;
        const json = await SitaAPI.listarDespacho(data);
        const docs = json.data || [];
        document.getElementById('despachoTotal').textContent = `${docs.length} na etapa 2`;

        const lista = document.getElementById('despachoLista');
        if (docs.length === 0) {
            lista.innerHTML = '<div class="empty-state">📭 Nenhum documento na etapa 2 nesta data.</div>';
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
                    this.obraArrastada = parseInt(e.currentTarget.dataset.numero);
                    e.currentTarget.classList.add('dragging');
                });
                card.addEventListener('dragend', e => e.currentTarget.classList.remove('dragging'));
            });
        }

        const seps = document.getElementById('despachoListaSeparadores');
        if (this.listaSeparadores.length === 0) {
            seps.innerHTML = '<div class="empty-state">Nenhum separador encontrado.</div>';
        } else {
            seps.innerHTML = this.listaSeparadores.map(s => `
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
                    if (!this.obraArrastada) return;
                    const sep = el.dataset.matricula || el.dataset.nome;
                    if (!sep) { alert('Separador sem matrícula'); return; }
                    try {
                        await SitaAPI.despachar(this.obraArrastada, sep);
                        this.obraArrastada = null;
                        this.render();
                    } catch (err) { alert(err.message); }
                });
            });
        }
    }
};

// ============================================================
// 9. MÓDULO: SEPARAÇÃO
// ============================================================
window.SitaSeparacao = {
    docAtual: null,

    async init() { this.carregarLista(); },

    async carregarLista() {
        const cont = document.getElementById('sepLista');
        cont.innerHTML = '<div class="empty-state">⏳ Carregando...</div>';
        try {
            const json = await SitaAPI.listarSeparacao();
            const docs = json.data || [];
            if (docs.length === 0) {
                cont.innerHTML = '<div class="empty-state">📭 Nenhuma lista atribuída a você no momento.</div>';
                return;
            }
            cont.innerHTML = docs.map(d => {
                const itens = d.itens || [];
                const separados = itens.filter(i => (i.qtd_separada || 0) > 0).length;
                const pct = itens.length > 0 ? Math.round((separados / itens.length) * 100) : 0;
                const devolvida = (d.subetapas || []).some(s => s.codigo === 'ET3_DEVOLVER_LISTA_SISTEMA' && s.concluida);
                return `
                    <div class="sep-card" onclick="SitaSeparacao.abrirDrawer(${d.numero})">
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
                        <div style="font-size:.75rem;color:var(--texto-secundario)">${separados} / ${itens.length} separados (${pct}%)</div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            cont.innerHTML = `<div class="empty-state" style="color:var(--cor-erro)">❌ ${e.message}</div>`;
        }
    },

    async abrirDrawer(numero) {
        try { this.docAtual = await SitaAPI.buscar(numero); }
        catch (e) { alert(e.message); return; }

        const drawer = document.getElementById('sepDrawer');
        const inner = document.getElementById('sepDrawerInner');
        drawer.style.display = 'block';

        const itens = this.docAtual.itens || [];
        const devolvida = (this.docAtual.subetapas || []).some(s => s.codigo === 'ET3_DEVOLVER_LISTA_SISTEMA' && s.concluida);

        inner.innerHTML = `
            <div class="sep-drawer-header">
                <div class="sep-drawer-title">#${String(this.docAtual.numero).padStart(4,'0')} — Obra ${this.docAtual.obra}</div>
                <button class="sep-drawer-close" onclick="SitaSeparacao.fecharDrawer()">✕</button>
            </div>
            <div class="sep-drawer-meta">
                <span>📅 ${this.docAtual.data_programacao}</span>
                <span>👷 ${this.docAtual.separador || '—'}</span>
                ${devolvida ? `<span class="text-success">✅ Lista já devolvida</span>` : ''}
            </div>
            <div class="tabela-wrapper">
                <table class="relatorio-tabela">
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
                                <td class="text-center text-muted">${idx + 1}</td>
                                <td>${it.codigo}</td>
                                <td>${(it.descricao || '').replace(/</g, '&lt;')}</td>
                                <td class="text-center">${it.unidade || ''}</td>
                                <td class="text-right">${it.qtd_programada || 0}</td>
                                <td class="text-right">${it.qtd_aditivo_saida || 0}</td>
                                <td>
                                    <input type="number" class="input-tabela num" value="${it.qtd_separada || 0}" step="any" min="0"
                                        ${devolvida ? 'disabled' : ''}
                                        onchange="SitaSeparacao.salvarSeparada(${it.id}, parseFloat(this.value)||0)">
                                </td>
                                <td>
                                    <input type="number" class="input-tabela num" value="${it.qtd_pendente || 0}" step="any" min="0"
                                        ${devolvida ? 'disabled' : ''}
                                        onchange="SitaSeparacao.salvarPendente(${it.id}, parseFloat(this.value)||0)">
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="sep-footer">
                ${!devolvida ? `
                    <button class="btn-filtrar" onclick="SitaSeparacao.devolverLista()">↩️ Devolver como Separada</button>
                ` : `<span class="text-success text-bold">✅ Lista devolvida — aguardando backoffice</span>`}
            </div>
        `;
    },

    fecharDrawer() {
        document.getElementById('sepDrawer').style.display = 'none';
        this.docAtual = null;
        this.carregarLista();
    },

    async salvarSeparada(itemId, valor) {
        try { await SitaAPI.atualizarItem(this.docAtual.numero, itemId, { qtd_separada: valor }); }
        catch (e) { alert(e.message); }
    },

    async salvarPendente(itemId, valor) {
        try { await SitaAPI.atualizarItem(this.docAtual.numero, itemId, { qtd_pendente: valor }); }
        catch (e) { alert(e.message); }
    },

    async devolverLista() {
        if (!confirm('Confirmar devolução da lista como SEPARADA?')) return;
        try {
            await SitaAPI.concluirSubetapa(this.docAtual.numero, 'ET3_DEVOLVER_LISTA_SISTEMA');
            alert('✅ Lista devolvida como Separada');
            this.abrirDrawer(this.docAtual.numero);
        } catch (e) { alert(e.message); }
    }
};

// ============================================================
// 10. MÓDULO: PENDÊNCIAS
// ============================================================
window.SitaPendencias = {
    debounceTimer: null,

    init() { this.carregar(); },

    carregarDebounced() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.carregar(), 400);
    },

    limpar() {
        document.getElementById('penObra').value = '';
        document.getElementById('penDataIni').value = '';
        document.getElementById('penDataFim').value = '';
        document.getElementById('penBusca').value = '';
        document.getElementById('penStatus').value = 'ABERTA';
        this.carregar();
    },

    async carregar() {
        const params = new URLSearchParams();
        params.set('status', document.getElementById('penStatus').value);
        const obra = document.getElementById('penObra').value.trim();
        const dataIni = document.getElementById('penDataIni').value;
        const dataFim = document.getElementById('penDataFim').value;
        const busca = document.getElementById('penBusca').value.trim();
        if (obra) params.set('obra', obra);
        if (dataIni) params.set('data_inicio', dataIni);
        if (dataFim) params.set('data_fim', dataFim);
        if (busca) params.set('busca', busca);

        const cont = document.getElementById('penLista');
        cont.innerHTML = '<div class="empty-state">⏳ Carregando...</div>';

        try {
            const json = await SitaAPI._fetch(`/api/pendencias?${params.toString()}`);
            const lista = json.data || [];
            document.getElementById('penInfo').textContent = `${lista.length} pendência(s)`;

            if (lista.length === 0) {
                cont.innerHTML = '<div class="empty-state">📭 Nenhuma pendência encontrada.</div>';
                return;
            }

            cont.innerHTML = lista.map(t => {
                const resolvida = t.status === 'RESOLVIDA';
                return `
                    <div class="pen-card ${resolvida ? 'resolvida' : 'aberta'}">
                        <div class="pen-card-header">
                            <div>
                                <div class="pen-card-title">${t.codigo} · ${t.descricao || ''}</div>
                                <div class="pen-card-obra">Obra ${t.doc_obra} · Doc #${String(t.doc_numero).padStart(4, '0')} · ${t.doc_data}</div>
                            </div>
                            <div class="pen-card-badges">
                                <span class="pen-badge qtd">Não devolvido: ${t.qtd_nao_devolvida} ${t.unidade || ''}</span>
                                <span class="pen-badge ${resolvida ? 'resolvida' : 'aberta'}">${resolvida ? '🟢 Resolvida' : '🔴 Aberta'}</span>
                            </div>
                        </div>
                        <div class="pen-card-body">
                            <div class="full">
                                <div class="pen-card-label">Observação</div>
                                <div class="pen-card-value">${(t.observacao || '—').replace(/</g, '&lt;')}</div>
                            </div>
                            <div>
                                <div class="pen-card-label">Criada por</div>
                                <div class="pen-card-value">${t.criado_por} · ${new Date(t.criado_em).toLocaleString('pt-BR')}</div>
                            </div>
                            ${resolvida ? `
                                <div>
                                    <div class="pen-card-label">Resolvida por</div>
                                    <div class="pen-card-value">${t.resolvido_por} · ${new Date(t.resolvido_em).toLocaleString('pt-BR')}</div>
                                </div>
                            ` : ''}
                        </div>
                        ${resolvida ? `
                            <div class="pen-card-resolucao">
                                <strong>Resolução:</strong> ${(t.resolucao || '').replace(/</g, '&lt;')}
                            </div>
                        ` : `
                            <div class="pen-card-actions">
                                <button class="btn-filtrar" onclick="SitaPendencias.abrirResolver(${t.id})">✅ Marcar como resolvida</button>
                                <button class="btn-limpar-filtros" onclick="abrirDocumentoSita(${t.doc_numero})">📋 Abrir documento</button>
                            </div>
                        `}
                    </div>
                `;
            }).join('');
        } catch (e) {
            cont.innerHTML = `<div class="empty-state" style="color:var(--cor-erro)">❌ ${e.message}</div>`;
        }
    },

    abrirResolver(id) {
        const antigo = document.getElementById('penModalResolver');
        if (antigo) antigo.remove();
        const modal = document.createElement('div');
        modal.id = 'penModalResolver';
        modal.className = 'modal-overlay ativo';
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-head">
                    <h3>✅ Resolver pendência</h3>
                    <button class="btn-fechar" onclick="document.getElementById('penModalResolver').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <label>Como foi resolvida? *</label>
                    <textarea id="penResolucao" rows="3" placeholder="Ex: Material devolvido em 20/03 / baixa aplicada / sinistro registrado"></textarea>
                </div>
                <div class="modal-foot">
                    <button class="btn-limpar-filtros" onclick="document.getElementById('penModalResolver').remove()">Cancelar</button>
                    <button class="btn-filtrar" onclick="SitaPendencias.resolver(${id})">💾 Resolver</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('penResolucao')?.focus(), 100);
    },

    async resolver(id) {
        const resolucao = document.getElementById('penResolucao')?.value.trim();
        if (!resolucao) { alert('Digite o texto da resolução'); return; }
        try {
            await SitaAPI.resolverPendencia(id, resolucao);
            document.getElementById('penModalResolver')?.remove();
            this.carregar();
        } catch (e) { alert(e.message); }
    }
};

// ============================================================
// 11. MÓDULO: DOCUMENTO
// ============================================================
window.SitaDocumento = {
    numeroDoc: null,
    docAtual: null,

    async init() {
        const params = new URLSearchParams(location.search);
        this.numeroDoc = parseInt(params.get('numero'));
        if (!this.numeroDoc) { alert('Número ausente'); abrirSubSita('index.html', 'SITA'); return; }
        await this.render();
    },

    async render() {
        try { this.docAtual = await SitaAPI.buscar(this.numeroDoc); }
        catch (e) { alert(e.message); return; }

        const arquivado = this.docAtual.status === 'ARQUIVADO';
        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();

        document.getElementById('docNumero').textContent = `#${String(this.docAtual.numero).padStart(4,'0')}`;

        const banner = document.getElementById('docBannerArq');
        if (arquivado) {
            const dt = this.docAtual.atualizado_em ? new Date(this.docAtual.atualizado_em).toLocaleString('pt-BR') : '—';
            banner.style.display = 'block';
            banner.innerHTML = `
                <div class="banner-arq-content">
                    <div><strong>✅ Documento arquivado</strong> em ${dt} — somente consulta.</div>
                    <div class="banner-arq-actions">
                        <button class="btn-limpar-filtros" onclick="SitaDocumento.abrirModalEtapas()">📋 Ver etapas concluídas</button>
                        ${(perfilUser === 'GESTAO' || perfilUser === 'BACKOFFICE') ? `<button class="btn-warning" onclick="SitaDocumento.restaurarDocumento()">🔄 Restaurar</button>` : ''}
                    </div>
                </div>
            `;
        } else {
            banner.style.display = 'none';
        }

        const etapa = SITA_CONFIG.ETAPAS[this.docAtual.etapa_atual] || SITA_CONFIG.ETAPAS[1];

        document.getElementById('docHeader').innerHTML = `
            <div class="doc-header-obra">
                <span class="doc-obra-num">${this.docAtual.obra} ${this.docAtual.is_urgente ? '🚨' : ''} ${arquivado ? '✅' : ''}</span>
                <span class="doc-etapa-tag" style="background:${arquivado ? '#94a3b8' : etapa.cor}">${arquivado ? '✅ Arquivado' : etapa.icone + ' ' + etapa.nome}</span>
            </div>
            <div class="doc-header-meta">
                <span>📅 ${this.docAtual.data_programacao}</span>
                <span>👤 ${this.docAtual.encarregado || '—'}</span>
                <span>👷 ${this.docAtual.separador || '—'}</span>
            </div>
        `;

        let stepper = '';
        for (let n = 1; n <= 6; n++) {
            const e = SITA_CONFIG.ETAPAS[n];
            const cls = n === this.docAtual.etapa_atual ? 'ativo' : (n < this.docAtual.etapa_atual ? 'completo' : '');
            const style = n === this.docAtual.etapa_atual ? `style="background:${arquivado ? '#94a3b8' : e.cor}"` : '';
            stepper += `<div class="step ${cls}" ${style}><span class="step-icon">${e.icone}</span>${e.nome}</div>`;
        }
        document.getElementById('docStepper').innerHTML = stepper;

        await this.renderEtapa();
        this.renderTimeline();
    },

    async renderEtapa() {
        const cont = document.getElementById('tab-etapa');
        const etapa = this.docAtual.etapa_atual;
        const e = SITA_CONFIG.ETAPAS[etapa];
        const arquivado = this.docAtual.status === 'ARQUIVADO';

        if (etapa === 1) {
            cont.innerHTML = `
                <h3 class="etapa-titulo">${e.icone} Etapa 1 — Programação</h3>
                <div class="etapa-form">
                    <div><label>Obra</label><input type="text" id="e1Obra" value="${this.docAtual.obra}" ${arquivado ? 'disabled' : ''}></div>
                    <div><label>Data</label><input type="date" id="e1Data" value="${this.docAtual.data_programacao}" ${arquivado ? 'disabled' : ''}></div>
                    <div><label>Encarregado</label><input type="text" id="e1Enc" value="${this.docAtual.encarregado || ''}" ${arquivado ? 'disabled' : ''}></div>
                </div>
                <div><label>Observação</label><textarea id="e1Obs" rows="3" style="width:100%" ${arquivado ? 'disabled' : ''}>${this.docAtual.obs_inicial || ''}</textarea></div>
                ${!arquivado ? `<div class="etapa-footer">
                    <button class="btn-filtrar" onclick="SitaDocumento.salvarEtapa1()">💾 Salvar</button>
                    <button class="btn-filtrar btn-success" onclick="SitaDocumento.avancar()">➡️ Avançar para Lista de Separação</button>
                </div>` : ''}
            `;
        } else if (etapa === 2) await Etapa2.render(cont, this.docAtual);
        else if (etapa === 3) await Etapa3.render(cont, this.docAtual);
        else if (etapa === 4) await Etapa4.render(cont, this.docAtual);
        else if (etapa === 5) await Etapa5.render(cont, this.docAtual);
        else if (etapa === 6) await Etapa6.render(cont, this.docAtual);
    },

    async salvarEtapa1() {
        try {
            await SitaAPI.atualizar(this.numeroDoc, {
                obra: document.getElementById('e1Obra').value.trim(),
                data_programacao: document.getElementById('e1Data').value,
                encarregado: document.getElementById('e1Enc').value.trim(),
                obs_inicial: document.getElementById('e1Obs').value.trim()
            });
            alert('Salvo!');
            this.render();
        } catch (e) { alert(e.message); }
    },

    async avancar() {
        try { await SitaAPI.avancar(this.numeroDoc); this.render(); }
        catch (e) { alert(e.message); }
    },

    async restaurarDocumento() {
        const motivo = prompt('Motivo da restauração (obrigatório para auditoria):');
        if (!motivo || !motivo.trim()) return;
        try {
            await SitaAPI.restaurar(this.numeroDoc, motivo.trim());
            alert('✅ Documento restaurado.');
            this.render();
        } catch (e) { alert('❌ ' + e.message); }
    },

    renderTimeline() {
        const ev = this.docAtual.eventos || [];
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
    },

    abrirModalEtapas() {
        const ev = this.docAtual.eventos || [];
        const porEtapa = {};
        ev.forEach(e => { (porEtapa[e.etapa || 0] ||= []).push(e); });
        let html = '<div class="e6-etapas-lista">';
        for (let n = 1; n <= 6; n++) {
            const e = SITA_CONFIG.ETAPAS[n];
            const eventos = porEtapa[n] || [];
            const concluiu = eventos.some(x => x.tipo === 'AVANCO_ETAPA' || x.tipo === 'CONFERENCIA_CONFIRMADA' || x.tipo === 'DOCUMENTO_CONCLUIDO');
            html += `
                <div class="e6-etapa-item ${concluiu ? 'ok' : ''}">
                    <div class="e6-etapa-head">
                        <span class="e6-etapa-icon">${e.icone}</span>
                        <span class="e6-etapa-nome">${n}. ${e.nome}</span>
                        <span class="e6-etapa-badge">${concluiu ? '✓ Concluída' : '○ Pendente'}</span>
                    </div>
                    ${eventos.length > 0 ? `
                        <div class="e6-etapa-eventos">
                            ${eventos.slice(0, 5).map(evt => `
                                <div class="e6-etapa-evt">
                                    <span class="e6-etapa-evt-tipo">${evt.tipo}</span>
                                    <span class="e6-etapa-evt-user">${evt.usuario}</span>
                                    <span class="e6-etapa-evt-data">${new Date(evt.criado_em).toLocaleString('pt-BR')}</span>
                                </div>
                            `).join('')}
                            ${eventos.length > 5 ? `<div class="e6-etapa-evt text-muted">+ ${eventos.length - 5} evento(s)</div>` : ''}
                        </div>
                    ` : '<div class="e6-etapa-vazia">Sem eventos registrados</div>'}
                </div>
            `;
        }
        html += '</div>';
        document.getElementById('modalEtapasBody').innerHTML = html;
        document.getElementById('modalEtapas').classList.add('ativo');
    },

    fecharModalEtapas() { document.getElementById('modalEtapas').classList.remove('ativo'); },

    mudarAba(tab) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
    }
};

// ============================================================
// 12. ETAPA 2 — LISTA DE SEPARAÇÃO
// ============================================================
window.Etapa2 = {
    doc: null, itens: [], codigosValidos: null, popupEl: null, nomeUsuario: '',

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];
        this.nomeUsuario = SitaAuth.nome();

        container.innerHTML = `
            <h3 class="etapa-titulo">📝 Etapa 2 — Lista de Separação</h3>

            <div class="mgm-cabecalho">
                <div class="mgm-cab-row">
                    <div class="mgm-cab-col"><label>👤 Separador</label><input type="text" id="e2Separador" value="${docAtual.separador || ''}" placeholder="Nome do separador"></div>
                    <div class="mgm-cab-col"><label>📅 Data de Separação</label><input type="date" id="e2DataSeparacao" value="${docAtual.data_separacao || ''}"></div>
                    <div class="mgm-cab-col"><label>🚚 Caminhão</label><input type="text" id="e2Caminhao" value="${docAtual.caminhao || ''}" placeholder="Placa ou identificação"></div>
                </div>
                <div class="mgm-cab-row">
                    <div class="mgm-cab-col"><label>👔 Encarregado</label><input type="text" id="e2Encarregado" value="${docAtual.encarregado || ''}" placeholder="Nome do encarregado"></div>
                    <div class="mgm-cab-col"><label>🆔 Matrícula</label><input type="text" id="e2Matricula" value="${docAtual.matricula_encarregado || ''}" placeholder="Matrícula" readonly></div>
                    <div class="mgm-cab-col"><label>👥 Equipe</label><input type="text" id="e2Equipe" value="${docAtual.equipe_encarregado || ''}" placeholder="Equipe" readonly></div>
                </div>
                <div class="mgm-cab-row full">
                    <div class="mgm-cab-col"><label>📝 Observação</label><textarea id="e2Observacao" rows="2" placeholder="Ex: Conferido por: João">${docAtual.obs_inicial || ''}</textarea></div>
                </div>
            </div>

            <div class="e2-actions">
                <input type="file" id="e2FileExcel" accept=".xlsx,.xls,.csv" style="display:none" onchange="Etapa2.importarExcel(event)">
                <button class="btn-filtrar" onclick="document.getElementById('e2FileExcel').click()">📥 Importar Excel</button>
                <button class="btn-limpar-filtros" onclick="Etapa2.adicionarLinha()">➕ Adicionar Item</button>
                <button class="btn-limpar-filtros" onclick="Etapa2.compararOrcamento()">📊 Comparar com Orçamento</button>
                <span class="e2-info" id="e2Info">${this.itens.length} item(ns)</span>
            </div>

            <div class="bulk-actions-container" id="e2BulkActions"></div>

            <div class="tabela-wrapper">
                <div class="table-responsive">
                    <table class="relatorio-tabela">
                        <thead>
                            <tr>
                                <th style="width:36px">#</th>
                                <th style="width:100px">Código</th>
                                <th>Descrição</th>
                                <th style="width:50px">UN</th>
                                <th style="width:70px">QTD</th>
                                <th style="width:80px">Aditivo Saída</th>
                                <th style="width:80px">Aditivo Campo</th>
                                <th style="width:70px">RMA</th>
                                <th style="width:80px">Separada</th>
                                <th style="width:80px">Aplicada</th>
                                <th style="width:70px">DMA</th>
                                <th style="width:80px">Pendente</th>
                                <th style="width:90px">Status</th>
                                <th style="width:40px"></th>
                            </tr>
                        </thead>
                        <tbody id="e2Body"></tbody>
                    </table>
                </div>
            </div>

            <div class="e2-subetapas" id="e2Subetapas"></div>
            <div class="e2-aviso" id="e2Aviso"></div>
        `;

        this.renderItens();
        this.renderSubetapas();
        this.renderBulkActions();
        this.configurarCabecalho();
        this.carregarCodigosValidos();
        this.inicializarPopup();
    },

    configurarCabecalho() {
        const campos = [['e2Separador','separador'],['e2DataSeparacao','data_separacao'],['e2Caminhao','caminhao'],['e2Encarregado','encarregado'],['e2Observacao','obs_inicial']];
        campos.forEach(([id, campo]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', async () => {
                try { await SitaAPI.atualizar(this.doc.numero, { [campo]: el.value.trim() }); }
                catch (e) { alert('Erro ao salvar cabeçalho: ' + e.message); }
            });
        });
    },

    renderItens() {
        const tbody = document.getElementById('e2Body');
        const arr = this.itens || [];
        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="14" class="text-center text-muted" style="padding:1.5rem">Nenhum item. Importe um Excel ou adicione manualmente.</td></tr>`;
            document.getElementById('e2Info').textContent = '0 itens';
            return;
        }
        tbody.innerHTML = arr.map((it, idx) => `
            <tr data-id="${it.id}">
                <td class="text-center text-muted">${idx + 1}</td>
                <td><input type="text" class="input-tabela" value="${it.codigo || ''}" oninput="Etapa2.aoDigitarCodigo(this, ${it.id})" onblur="Etapa2.aoSairCodigo(this, ${it.id})"></td>
                <td><input type="text" class="input-tabela" value="${(it.descricao || '').replace(/"/g, '&quot;')}" readonly onclick="Etapa2.mostrarPopup(this)"></td>
                <td><input type="text" class="input-tabela text-center" value="${it.unidade || ''}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_programada || 0}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_programada', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_aditivo_saida || 0}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_aditivo_saida', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_aditivo_campo || 0}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_aditivo_campo', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_rma || ''}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_rma', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_separada || ''}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_separada', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_aplicada || ''}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_aplicada', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_dma || ''}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_dma', parseFloat(this.value)||0)"></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_pendente || ''}" step="any" min="0" onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_pendente', parseFloat(this.value)||0)"></td>
                <td>${SitaHelpers.badgeStatus(it.status_item)}</td>
                <td><button class="btn-remove-item" onclick="Etapa2.removerItem(${it.id})" title="Remover">✕</button></td>
            </tr>
        `).join('');
        document.getElementById('e2Info').textContent = `${arr.length} item(ns)`;
        this.configurarNavegacaoTeclado();
        this.configurarPasteEmMassa();
    },

    async carregarCodigosValidos() {
        if (this.codigosValidos) return;
        try {
            const texto = await SitaAPI.posicaoEstoque();
            const linhas = texto.split('\n').slice(1);
            const set = new Set();
            for (const l of linhas) {
                const cod = (l.split('\t')[0] || '').trim();
                if (cod) set.add(cod);
            }
            this.codigosValidos = set;
        } catch (e) { console.warn('Posição de estoque indisponível:', e.message); }
    },

    aoDigitarCodigo(input, id) { input.classList.remove('input-erro', 'input-ok'); },

    async aoSairCodigo(input, id) {
        const cod = input.value.trim();
        const it = this.itens.find(x => x.id === id);
        if (!it) return;
        it.codigo = cod;
        if (!cod) { await this.salvarItem(id, { codigo: '' }); return; }
        if (this.codigosValidos && !this.codigosValidos.has(cod)) {
            input.classList.add('input-erro');
            alert(`❌ Código ${cod} não existe na posição de estoque`);
        } else {
            input.classList.add('input-ok');
            setTimeout(() => input.classList.remove('input-ok'), 1200);
        }
        await this.salvarItem(id, { codigo: cod });
    },

    aoEditarCampo(id, campo, valor) {
        const it = this.itens.find(x => x.id === id);
        if (!it) return;
        it[campo] = valor;
        this.salvarItem(id, { [campo]: valor });
    },

    async salvarItem(id, body) {
        try { await SitaAPI.atualizarItem(this.doc.numero, id, body); }
        catch (e) { alert('Erro ao salvar item: ' + e.message); }
    },

    async adicionarLinha() {
        try {
            await SitaAPI.criarItem(this.doc.numero, { codigo: '', descricao: '', unidade: '', qtd_programada: 0 });
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    async removerItem(id) {
        if (!confirm('Remover este item?')) return;
        try { await SitaAPI.removerItem(this.doc.numero, id); await this.recarregar(); }
        catch (e) { alert(e.message); }
    },

    async recarregar() {
        const doc = await SitaAPI.buscar(this.doc.numero);
        this.doc = doc;
        this.itens = doc.itens || [];
        this.renderItens();
        this.renderSubetapas();
        this.renderBulkActions();
    },

    configurarNavegacaoTeclado() {
        const tbody = document.getElementById('e2Body');
        if (!tbody) return;
        tbody.querySelectorAll('input, select').forEach(el => {
            el.removeEventListener('keydown', Etapa2._handleTeclado);
            el.addEventListener('keydown', Etapa2._handleTeclado);
        });
    },

    _handleTeclado(e) {
        const key = e.key;
        const target = e.target;
        if (!target || target.readOnly || target.disabled) return;
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;

        if (key === 'Enter') {
            e.preventDefault();
            const row = target.closest('tr');
            const nextRow = row.nextElementSibling;
            if (nextRow) {
                const cellIdx = Array.from(row.children).indexOf(target.closest('td'));
                const nextInput = nextRow.children[cellIdx]?.querySelector('input, select');
                if (nextInput) { nextInput.focus(); nextInput.select?.(); return; }
            }
            const currentCol = Array.from(row.children).indexOf(target.closest('td'));
            Etapa2.adicionarLinha().then(() => {
                setTimeout(() => {
                    const tbody = document.getElementById('e2Body');
                    const rows = tbody.querySelectorAll('tr');
                    const lastRow = rows[rows.length - 1];
                    const lastInput = lastRow?.children[currentCol]?.querySelector('input');
                    if (lastInput) { lastInput.focus(); lastInput.select?.(); }
                }, 250);
            });
            return;
        }

        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            if (target.tagName === 'INPUT') {
                try {
                    const start = target.selectionStart, end = target.selectionEnd, len = (target.value || '').length;
                    if (key === 'ArrowLeft' && start > 0) return;
                    if (key === 'ArrowRight' && end < len) return;
                } catch (_) {}
            }
            e.preventDefault();
            const row = target.closest('tr');
            const editaveis = Array.from(row.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled])'));
            const idx = editaveis.indexOf(target);
            if (idx === -1) return;
            const next = editaveis[idx + (key === 'ArrowRight' ? 1 : -1)];
            if (next) { next.focus(); next.select?.(); }
            return;
        }

        if (key === 'ArrowUp' || key === 'ArrowDown') {
            e.preventDefault();
            const row = target.closest('tr');
            const cellIdx = Array.from(row.children).indexOf(target.closest('td'));
            const targetRow = key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
            if (targetRow) {
                const nextInput = targetRow.children[cellIdx]?.querySelector('input, select');
                if (nextInput) { nextInput.focus(); nextInput.select?.(); }
            }
            return;
        }
    },

    configurarPasteEmMassa() {
        const tbody = document.getElementById('e2Body');
        if (!tbody) return;
        tbody.querySelectorAll('input').forEach(inp => {
            if (inp._pasteOk) return;
            inp._pasteOk = true;
            inp.addEventListener('paste', Etapa2._handlePasteMassa);
        });
    },

    _handlePasteMassa(e) {
        const target = e.target;
        if (!target || target.readOnly) return;
        const dados = e.clipboardData || window.clipboardData;
        if (!dados) return;
        const texto = dados.getData('text/plain');
        if (!texto || texto.trim() === '') return;
        const linhas = texto.split('\n').filter(l => l.trim() !== '');
        if (linhas.length <= 1) return;
        e.preventDefault();
        Etapa2._aplicarPaste(linhas, target);
    },

    async _aplicarPaste(linhas, elementoAlvo) {
        const tbody = document.getElementById('e2Body');
        const rowAlvo = elementoAlvo.closest('tr');
        const colIdx = Array.from(rowAlvo.children).indexOf(elementoAlvo.closest('td'));
        const mapColToField = { 1:'codigo', 4:'qtd_programada', 5:'qtd_aditivo_saida', 6:'qtd_aditivo_campo', 7:'qtd_rma', 8:'qtd_separada', 9:'qtd_aplicada', 10:'qtd_dma', 11:'qtd_pendente' };
        const campo = mapColToField[colIdx];
        if (!campo) { alert('Cole em uma coluna editável'); return; }

        let idxRow = Array.from(tbody.querySelectorAll('tr')).indexOf(rowAlvo);
        const valorAtual = elementoAlvo.value.trim();
        if (valorAtual !== '') idxRow++;

        const linhasAtuais = tbody.querySelectorAll('tr').length;
        const precisamos = (idxRow + linhas.length) - linhasAtuais;
        for (let k = 0; k < precisamos; k++) await this.adicionarLinha();

        await this.recarregar();
        const rows = document.getElementById('e2Body').querySelectorAll('tr');

        let cont = 0;
        for (let i = 0; i < linhas.length; i++) {
            const valor = linhas[i].trim();
            if (!valor) continue;
            const row = rows[idxRow + i];
            if (!row) continue;
            const itemId = parseInt(row.dataset.id);
            let valorFinal = valor;
            if (['qtd_programada','qtd_aditivo_saida','qtd_aditivo_campo','qtd_rma','qtd_separada','qtd_aplicada','qtd_dma','qtd_pendente'].includes(campo)) {
                const num = parseFloat(valor.replace(',', '.').replace(/[^\d.-]/g, ''));
                valorFinal = isNaN(num) ? 0 : num;
            } else if (campo === 'codigo') {
                valorFinal = valor.replace(/[^0-9]/g, '');
            }
            await SitaAPI.atualizarItem(this.doc.numero, itemId, { [campo]: valorFinal });
            cont++;
        }
        await this.recarregar();
        alert(`✅ ${cont} valor(es) colados`);
    },

    inicializarPopup() {
        let popup = document.getElementById('e2PopupDesc');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'e2PopupDesc';
            popup.className = 'e2-popup-desc';
            document.body.appendChild(popup);
        }
        this.popupEl = popup;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.input-tabela') && !e.target.closest('.e2-popup-desc')) this.fecharPopup();
        });
    },

    mostrarPopup(input) {
        const descricao = input.value.trim();
        if (!descricao) return;
        const rect = input.getBoundingClientRect();
        const popup = this.popupEl;
        popup.textContent = descricao;
        popup.style.left = Math.min(rect.left, window.innerWidth - 420) + 'px';
        popup.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        popup.style.display = 'block';
    },

    fecharPopup() { if (this.popupEl) this.popupEl.style.display = 'none'; },

    renderBulkActions() {
        const cont = document.getElementById('e2BulkActions');
        if (!cont) return;
        if (this.doc.etapa_atual !== 2) { cont.innerHTML = ''; return; }
        cont.innerHTML = `
            <span class="bulk-title">⚡ Ações em Massa</span>
            <div class="bulk-row"><label>RMA:</label><input type="number" id="e2BulkRma" step="any" min="0" placeholder="0"><button class="btn-filtrar btn-sm" onclick="Etapa2.aplicarBulk('qtd_rma', 'e2BulkRma')">Aplicar</button></div>
            <div class="bulk-row"><label>Separada:</label><input type="number" id="e2BulkSeparada" step="any" min="0" placeholder="0"><button class="btn-filtrar btn-sm" onclick="Etapa2.aplicarBulk('qtd_separada', 'e2BulkSeparada')">Aplicar</button></div>
            <div class="bulk-row"><label>Aplicada:</label><input type="number" id="e2BulkAplicada" step="any" min="0" placeholder="0"><button class="btn-filtrar btn-sm" onclick="Etapa2.aplicarBulk('qtd_aplicada', 'e2BulkAplicada')">Aplicar</button></div>
            <button class="btn-limpar-filtros btn-sm" onclick="Etapa2.limparQtds()">🧹 Limpar Qtds</button>
        `;
    },

    async aplicarBulk(campo, inputId) {
        const val = parseFloat(document.getElementById(inputId)?.value);
        if (isNaN(val)) { alert('Digite um valor'); return; }
        if (!confirm(`Aplicar ${val} em todos os itens?`)) return;
        for (const it of this.itens) await SitaAPI.atualizarItem(this.doc.numero, it.id, { [campo]: val });
        await this.recarregar();
    },

    async limparQtds() {
        if (!confirm('Limpar todas as quantidades?')) return;
        for (const it of this.itens) {
            await SitaAPI.atualizarItem(this.doc.numero, it.id, { qtd_rma: 0, qtd_separada: 0, qtd_aplicada: 0, qtd_dma: 0, qtd_pendente: 0 });
        }
        await this.recarregar();
    },

    async importarExcel(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (typeof XLSX === 'undefined') { alert('❌ Biblioteca de Excel não carregada.'); return; }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
            let sheetName = workbook.SheetNames.find(n => {
                const norm = n.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return norm.includes('MGM') || norm.includes('FORM');
            }) || workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
            if (!raw || raw.length < 3) { alert('❌ Planilha vazia.'); return; }

            const norm = (v) => String(v || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
            const cabecalho = this.extrairCabecalho(raw, norm);
            if (cabecalho.obra) {
                await SitaAPI.atualizar(this.doc.numero, {
                    obra: cabecalho.obra,
                    separador: cabecalho.separador || this.doc.separador,
                    data_separacao: cabecalho.data_separacao || this.doc.data_separacao,
                    encarregado: cabecalho.encarregado || this.doc.encarregado,
                    caminhao: cabecalho.caminhao || this.doc.caminhao,
                    obs_inicial: cabecalho.observacao || this.doc.obs_inicial
                });
            }

            let headerRow = -1, headerNorm = [];
            for (let i = 0; i < Math.min(raw.length, 20); i++) {
                const rn = (raw[i] || []).map(c => norm(c));
                if (rn.some(h => h === 'CODIGO' || h.startsWith('CODIGO'))) { headerRow = i; headerNorm = rn; break; }
            }
            if (headerRow === -1) { alert('❌ Cabeçalho (CÓDIGO) não encontrado.'); return; }

            const findCol = (preds) => { for (const p of preds) { const i = headerNorm.findIndex(h => p(h)); if (i !== -1) return i; } return -1; };
            const col = {
                codigo: findCol([h => h === 'CODIGO', h => h.startsWith('CODIGO')]),
                descricao: findCol([h => h.startsWith('DESCRI')]),
                unidade: findCol([h => h === 'UNIDADE', h => h.startsWith('UNIDADE'), h => h === 'UND', h => h === 'UN']),
                rma: findCol([h => h.includes('RMA')]),
                separada: findCol([h => h.includes('SEPARADA')]),
                aplicada: findCol([h => h.includes('APLICADA')]),
                aditivoSaida: findCol([h => h.includes('ADITIVO') && (h.includes('SAIDA') || h.includes('SA'))]),
                aditivoCampo: findCol([h => h.includes('ADITIVO') && h.includes('CAMPO')]),
                dma: findCol([h => h.includes('DMA') && !h.includes('SUCATA')]),
                pendente: findCol([h => h.includes('PENDENTE')])
            };
            if (col.codigo === -1) col.codigo = 1;

            const parseNum = (v) => { if (v === undefined || v === null || v === '') return 0; if (typeof v === 'number') return v; const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };

            const itens = [];
            for (let i = headerRow + 1; i < raw.length; i++) {
                const row = raw[i] || [];
                const codRaw = String(row[col.codigo] || '').trim();
                if (!codRaw || norm(codRaw) === 'CODIGO') continue;
                const cod = codRaw.replace(/[^0-9]/g, '');
                if (!cod) continue;
                itens.push({
                    codigo: cod,
                    descricao: col.descricao !== -1 ? String(row[col.descricao] || '').trim() : '',
                    unidade: col.unidade !== -1 ? String(row[col.unidade] || '').trim() : '',
                    qtd_programada: col.rma !== -1 ? parseNum(row[col.rma]) : 0,
                    qtd_rma: col.rma !== -1 ? parseNum(row[col.rma]) : 0,
                    qtd_separada: col.separada !== -1 ? parseNum(row[col.separada]) : 0,
                    qtd_aplicada: col.aplicada !== -1 ? parseNum(row[col.aplicada]) : 0,
                    qtd_aditivo_saida: col.aditivoSaida !== -1 ? parseNum(row[col.aditivoSaida]) : 0,
                    qtd_aditivo_campo: col.aditivoCampo !== -1 ? parseNum(row[col.aditivoCampo]) : 0,
                    qtd_dma: col.dma !== -1 ? parseNum(row[col.dma]) : 0,
                    qtd_pendente: col.pendente !== -1 ? parseNum(row[col.pendente]) : 0
                });
            }
            if (itens.length === 0) { alert('⚠️ Nenhum item válido.'); return; }
            await SitaAPI.criarItensBulk(this.doc.numero, itens);
            await this.recarregar();
            alert(`✅ ${itens.length} itens importados!`);
        } catch (e) { console.error(e); alert('❌ Erro ao importar: ' + e.message); }
    },

    extrairCabecalho(raw, norm) {
        const res = {};
        const isRotulo = (v) => /SEPARADOR|ENCARREGADO|CAMINHAO|PROGRAMACAO|OBRA|MATRICULA|CONFERIDO|EXPEDICAO|OBS/.test(norm(v));
        const isCabecalho = (v) => /^(ITEM|CODIGO|DESCRICAO|UNIDADE|ADITIVO|QTDRMA|QTDSEPARADA|QTDAPLICADA|QTDDMA|QTDPENDENTE)/.test(norm(v));
        for (let i = 0; i < Math.min(raw.length, 5); i++) {
            const row = raw[i] || [];
            for (let c = 0; c < row.length; c++) {
                const cel = String(row[c] || '').trim();
                const celN = norm(cel);
                if (celN.includes('SEPARADOR') && !res.separador) res.separador = this._proxValor(row, c, isRotulo, isCabecalho);
                if (celN.includes('ENCARREGADO') && !res.encarregado) res.encarregado = this._proxValor(row, c, isRotulo, isCabecalho);
                if (celN.includes('CAMINHAO') && !res.caminhao) res.caminhao = this._proxValor(row, c, isRotulo, isCabecalho);
                if (celN.includes('NROBRA') || celN.includes('NUMOBRA')) {
                    const v = this._proxValor(row, c, isRotulo, isCabecalho);
                    if (v && /^\d+$/.test(v)) res.obra = v;
                }
            }
        }
        return res;
    },

    _proxValor(row, colIdx, isRotulo, isCabecalho) {
        for (let d = 1; d <= 3; d++) {
            const v = String(row[colIdx + d] || '').trim();
            if (v && !isRotulo(v) && !isCabecalho(v)) return v;
        }
        return '';
    },

    async compararOrcamento() {
        if (this.itens.length === 0) { alert('Adicione itens antes de comparar.'); return; }
        try {
            const resp = await SitaAPI._fetch(`/api/documentos/${this.doc.numero}/comparar-orcamento`, { method: 'POST' });
            await this.recarregar();
            this.renderAvisoComparacao(resp.resumo);
        } catch (e) { alert(e.message); }
    },

    renderAvisoComparacao(r) {
        const av = document.getElementById('e2Aviso');
        if (!av) return;
        av.innerHTML = `
            <div class="e2-resumo">
                <strong>📊 Comparação com orçamento:</strong>
                <span class="badge-status badge-ok">✓ ${r.ok} OK</span>
                <span class="badge-status badge-excede">⚠ ${r.excede} excedem</span>
                <span class="badge-status badge-fora">🚨 ${r.fora} fora do orçamento</span>
            </div>
        `;
    },

    renderSubetapas() {
        const cont = document.getElementById('e2Subetapas');
        if (!cont) return;
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 2);
        if (subs.length === 0) { cont.innerHTML = ''; return; }
        cont.innerHTML = `
            <h4 class="subtitulo">⚙️ Subetapas</h4>
            ${subs.map(s => {
                const def = (SITA_CONFIG.SUBETAPAS[2] || []).find(x => x.codigo === s.codigo);
                const label = def?.label || s.codigo;
                return `
                    <div class="subetapa ${s.concluida ? 'ok' : ''}">
                        <input type="checkbox" ${s.concluida ? 'checked' : ''} onchange="Etapa2.toggleSubetapa('${s.codigo}', this.checked)">
                        <span class="subetapa-label">${label}</span>
                        ${s.concluida ? `<span class="subetapa-meta">✓ ${s.concluida_por}</span>` : ''}
                    </div>
                `;
            }).join('')}
        `;
    },

    async toggleSubetapa(codigo, marcar) {
        try {
            if (marcar) await SitaAPI.concluirSubetapa(this.doc.numero, codigo);
            else await SitaAPI.reabrirSubetapa(this.doc.numero, codigo);
            await this.recarregar();
        } catch (e) { alert(e.message); }
    }
};

// ============================================================
// 13. ETAPA 3 — SEPARADO
// ============================================================
window.Etapa3 = {
    doc: null, itens: [], nomeUsuario: '',

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];
        this.nomeUsuario = SitaAuth.nome();

        const tag = docAtual.tag || 'EM_SEPARACAO';
        const tagLabel = tag === 'SEPARADO' ? '✓ SEPARADO' : '⏳ EM SEPARAÇÃO';
        const tagCls = tag === 'SEPARADO' ? 'tag-separado' : 'tag-em-separacao';

        const sistemicos = docAtual.sistemicos || [];
        const rmaBase = sistemicos.find(s => s.tipo === 'RMA' && s.subtipo === 'BASE');

        const subs = (docAtual.subetapas || []).filter(s => s.etapa === 3);
        const pendentes = subs.filter(s => !s.concluida && !s.ignorada);
        const podeAvancar = pendentes.length === 0;

        container.innerHTML = `
            <div class="e3-tag-wrap">
                <span class="e3-tag ${tagCls}">${tagLabel}</span>
                ${docAtual.separador ? `<span class="e3-sep">👷 Separador (matrícula): <strong>${docAtual.separador}</strong></span>` : ''}
            </div>

            <h3 class="etapa-titulo">📦 Etapa 3 — Separado</h3>

            <div class="e3-rma-box ${rmaBase ? 'ok' : 'pendente'}">
                <div class="e3-rma-title">${rmaBase ? '✅ RMA Base registrado' : '⚠️ RMA Base obrigatório'}</div>
                ${rmaBase ? `
                    <div class="e3-rma-info">
                        <span><strong>Nº:</strong> ${rmaBase.numero_documento}</span>
                        <span><strong>Data:</strong> ${rmaBase.data_documento || '—'}</span>
                        <span><strong>Por:</strong> ${rmaBase.registrado_por}</span>
                    </div>
                ` : `<div class="e3-rma-hint">É necessário registrar o RMA base para avançar.</div>`}
            </div>

            <div class="tabela-wrapper">
                <div class="table-responsive">
                    <table class="relatorio-tabela">
                        <thead>
                            <tr>
                                <th style="width:36px">#</th>
                                <th style="width:110px">Código</th>
                                <th>Descrição</th>
                                <th style="width:50px">UN</th>
                                <th style="width:80px">QTD Base</th>
                                <th style="width:80px">Aditivo Saída</th>
                                <th style="width:90px">Separada</th>
                                <th style="width:90px">Pendente</th>
                                <th style="width:100px">Status</th>
                            </tr>
                        </thead>
                        <tbody id="e3Body"></tbody>
                    </table>
                </div>
            </div>

            <div class="e3-subetapas" id="e3Subetapas"></div>

            <div class="e3-footer">
                <button class="btn-filtrar btn-success" ${podeAvancar ? '' : 'disabled'} onclick="Etapa3.avancar()">➡️ Avançar para Conferência</button>
                ${!podeAvancar ? `<span class="e3-footer-hint">Conclua as subetapas obrigatórias.</span>` : ''}
            </div>
        `;

        this.renderItens();
        this.renderSubetapas();
    },

    renderItens() {
        const tbody = document.getElementById('e3Body');
        const arr = this.itens || [];
        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:1.5rem">Nenhum item.</td></tr>`;
            return;
        }
        tbody.innerHTML = arr.map((it, idx) => `
            <tr data-id="${it.id}">
                <td class="text-center text-muted">${idx + 1}</td>
                <td><input type="text" class="input-tabela" value="${it.codigo || ''}" readonly></td>
                <td><input type="text" class="input-tabela" value="${(it.descricao || '').replace(/"/g, '&quot;')}" readonly></td>
                <td><input type="text" class="input-tabela text-center" value="${it.unidade || ''}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_programada || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_aditivo_saida || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_separada || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_pendente || 0}" readonly></td>
                <td>${SitaHelpers.badgeStatus(it.status_item)}</td>
            </tr>
        `).join('');
    },

    renderSubetapas() {
        const cont = document.getElementById('e3Subetapas');
        if (!cont) return;
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 3);
        if (subs.length === 0) { cont.innerHTML = ''; return; }

        const labels = {
            'ET3_REQUISITAR_SISTEMICO': '🧾 Requisitar material sistêmico (RMA base) — obrigatória',
            'ET3_ADITIVO_SAIDA':        '➕ Aditivo de saída — opcional (só BACKOFFICE/GESTÃO)',
            'ET3_DEVOLVER_LISTA_SISTEMA': '↩️ Devolver lista de separação — obrigatória (só separador)'
        };
        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const ehBackoffice = perfilUser === 'BACKOFFICE' || perfilUser === 'GESTAO';

        cont.innerHTML = `
            <h4 class="subtitulo">⚙️ Subetapas</h4>
            ${subs.map(s => {
                const label = labels[s.codigo] || s.codigo;
                const restrita = s.codigo === 'ET3_DEVOLVER_LISTA_SISTEMA';
                const aditivoRestrito = s.codigo === 'ET3_ADITIVO_SAIDA' && !ehBackoffice;
                const bloqueada = restrita || aditivoRestrito;
                const opcional = s.codigo === 'ET3_ADITIVO_SAIDA';
                const ignorada = s.ignorada === 1;

                return `
                    <div class="subetapa ${s.concluida ? 'ok' : ''} ${ignorada ? 'ignorada' : ''} ${bloqueada ? 'restrita' : ''}">
                        <input type="checkbox" ${s.concluida ? 'checked' : ''} ${bloqueada ? 'disabled' : ''}
                            onchange="Etapa3.toggleSubetapa('${s.codigo}', this.checked)">
                        <span class="subetapa-label">${label}</span>
                        ${ignorada ? `<span class="subetapa-meta">⏭ Ignorada (não se aplica)</span>` : ''}
                        ${s.concluida ? `<span class="subetapa-meta">✓ ${s.concluida_por}</span>` : ''}
                        ${bloqueada && !s.concluida ? `<span class="subetapa-restrita">🔒 ${restrita ? 'Só separador' : 'Só backoffice'}</span>` : ''}
                        ${!s.concluida && !ignorada && !bloqueada && s.codigo === 'ET3_REQUISITAR_SISTEMICO' ? `<button class="subetapa-btn" onclick="Etapa3.abrirModalRMA()">Registrar</button>` : ''}
                        ${opcional && !s.concluida && !ignorada && ehBackoffice ? `
                            <button class="subetapa-btn" onclick="Etapa3.abrirModalAditivo()">Adicionar Aditivo</button>
                            <button class="subetapa-btn btn-ignorar" onclick="Etapa3.ignorar()">Não se aplica</button>
                        ` : ''}
                        ${ignorada ? `<button class="subetapa-btn btn-desfazer" onclick="Etapa3.reabrir('${s.codigo}')">Desfazer</button>` : ''}
                    </div>
                `;
            }).join('')}
        `;
    },

    async toggleSubetapa(codigo, marcar) {
        try {
            if (marcar) await SitaAPI.concluirSubetapa(this.doc.numero, codigo);
            else await SitaAPI.reabrirSubetapa(this.doc.numero, codigo);
            await this.recarregar();
        } catch (e) { alert(e.message); await this.recarregar(); }
    },

    async ignorar() {
        try {
            await SitaAPI.ignorarSubetapa(this.doc.numero, 'ET3_ADITIVO_SAIDA');
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    async reabrir(codigo) {
        try {
            await SitaAPI.reabrirSubetapa(this.doc.numero, codigo);
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    abrirModalRMA() {
        const sistemicos = this.doc.sistemicos || [];
        const rmaBase = sistemicos.find(s => s.tipo === 'RMA' && s.subtipo === 'BASE');
        if (rmaBase) { alert(`Já existe RMA base: ${rmaBase.numero_documento}`); return; }
        this._abrirModalSistemico('RMA', 'BASE', 'Registrar RMA Base (obrigatório)');
    },

    abrirModalAditivo() {
        this._abrirModalAditivoSaida();
    },

    _abrirModalSistemico(tipo, subtipo, titulo) {
        const antigo = document.getElementById('e3ModalSistemico');
        if (antigo) antigo.remove();

        const modal = document.createElement('div');
        modal.id = 'e3ModalSistemico';
        modal.className = 'modal-overlay ativo';
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-head">
                    <h3>${titulo}</h3>
                    <button class="btn-fechar" onclick="document.getElementById('e3ModalSistemico').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <label>Nº do Documento *</label>
                    <input type="text" id="e3SistNumero" placeholder="Ex: 2601509345">
                    <label>Data</label>
                    <input type="date" id="e3SistData">
                    <label>Observação</label>
                    <textarea id="e3SistObs" rows="2" placeholder="Opcional"></textarea>
                </div>
                <div class="modal-foot">
                    <button class="btn-limpar-filtros" onclick="document.getElementById('e3ModalSistemico').remove()">Cancelar</button>
                    <button class="btn-filtrar" onclick="Etapa3.salvarSistemico('${tipo}', '${subtipo}')">💾 Registrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('e3SistNumero')?.focus(), 100);
    },

    async salvarSistemico(tipo, subtipo) {
        const numero = document.getElementById('e3SistNumero')?.value.trim();
        const data = document.getElementById('e3SistData')?.value;
        const obs = document.getElementById('e3SistObs')?.value.trim();
        if (!numero) { alert('Informe o nº do documento'); return; }
        try {
            await SitaAPI.criarSistemico(this.doc.numero, {
                tipo, subtipo, numero_documento: numero, data_documento: data || null, observacao: obs
            });
            document.getElementById('e3ModalSistemico')?.remove();
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    _abrirModalAditivoSaida() {
        const antigo = document.getElementById('e3ModalAditivo');
        if (antigo) antigo.remove();

        const modal = document.createElement('div');
        modal.id = 'e3ModalAditivo';
        modal.className = 'modal-overlay ativo';
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-head">
                    <h3>➕ Adicionar Aditivo de Saída</h3>
                    <button class="btn-fechar" onclick="document.getElementById('e3ModalAditivo').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <label>Código do Material *</label>
                    <input type="text" id="e3AditCodigo" placeholder="Ex: 90395">
                    <label>Quantidade *</label>
                    <input type="number" id="e3AditQtd" step="any" min="0.01">
                    <label>Nº do Documento RMA *</label>
                    <input type="text" id="e3AditNumDoc" placeholder="Ex: 2601509345">
                    <label>Observação</label>
                    <textarea id="e3AditObs" rows="2" placeholder="Opcional"></textarea>
                </div>
                <div class="modal-foot">
                    <button class="btn-limpar-filtros" onclick="document.getElementById('e3ModalAditivo').remove()">Cancelar</button>
                    <button class="btn-filtrar" onclick="Etapa3.salvarAditivo()">💾 Adicionar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('e3AditCodigo')?.focus(), 100);
    },

    async salvarAditivo() {
        const codigo = document.getElementById('e3AditCodigo')?.value.trim();
        const quantidade = parseFloat(document.getElementById('e3AditQtd')?.value);
        const numero_documento = document.getElementById('e3AditNumDoc')?.value.trim();
        const observacao = document.getElementById('e3AditObs')?.value.trim();
        if (!codigo || !quantidade || !numero_documento) { alert('Preencha código, quantidade e nº do documento'); return; }
        try {
            const resp = await SitaAPI.adicionarAditivo(this.doc.numero, { codigo, quantidade, numero_documento, observacao });
            document.getElementById('e3ModalAditivo')?.remove();
            await this.recarregar();
            const msg = resp.acao === 'SOMADO' ? 'somado ao item existente' : 'novo item criado';
            alert(`✅ Aditivo registrado (${msg})`);
        } catch (e) { alert(e.message); }
    },

    async avancar() {
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 3);
        const pendentes = subs.filter(s => !s.concluida && !s.ignorada);
        if (pendentes.length > 0) { alert('Conclua as subetapas obrigatórias antes de avançar.'); return; }
        try { await SitaAPI.avancar(this.doc.numero); location.reload(); }
        catch (e) { alert(e.message); }
    },

    async recarregar() {
        const doc = await SitaAPI.buscar(this.doc.numero);
        this.doc = doc;
        this.itens = doc.itens || [];
        const cont = document.getElementById('tab-etapa');
        await this.render(cont, doc);
    }
};

// ============================================================
// 14. ETAPA 4 — CONFERÊNCIA
// ============================================================
window.Etapa4 = {
    doc: null, itens: [], nomeUsuario: '',

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];
        this.nomeUsuario = SitaAuth.nome();

        const jaConferido = !!(docAtual.conferente && docAtual.data_conferencia);
        const tagLabel = jaConferido ? '✓ CONFERIDO' : '🔍 AGUARDANDO CONFERÊNCIA';
        const tagCls = jaConferido ? 'tag-conferido' : 'tag-aguardando';

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const podeConferir = !jaConferido && (perfilUser === 'GESTAO' || perfilUser === 'CONFERENTE');

        const subs = (docAtual.subetapas || []).filter(s => s.etapa === 4);
        const todasOk = subs.length === 0 || subs.every(s => s.concluida);
        const podeAvancar = jaConferido && todasOk;

        container.innerHTML = `
            <div class="e3-tag-wrap">
                <span class="e3-tag ${tagCls}">${tagLabel}</span>
                ${docAtual.separador ? `<span class="e3-sep">👷 Separador: <strong>${docAtual.separador}</strong></span>` : ''}
            </div>

            <h3 class="etapa-titulo">🔍 Etapa 4 — Conferência</h3>

            ${jaConferido ? `
                <div class="e4-confirmado-box">
                    <div class="e4-confirmado-title">✅ Conferência confirmada</div>
                    <div class="e4-confirmado-info">
                        <span><strong>Conferente:</strong> ${docAtual.conferente}</span>
                        <span><strong>Data:</strong> ${new Date(docAtual.data_conferencia).toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            ` : podeConferir ? `
                <div class="e4-aguardando-box">
                    <div class="e4-aguardando-title">🔍 Conferência pendente</div>
                    <div class="e4-aguardando-hint">Confira os itens abaixo. Ao confirmar, o documento será marcado como <strong>CONFERIDO</strong> e ficará pronto para expedição.</div>
                    <button class="btn-filtrar e4-btn-confirmar" onclick="Etapa4.confirmar()">🔍 Confirmar Conferência</button>
                </div>
            ` : `
                <div class="e4-bloqueado-box">
                    <div class="e4-bloqueado-title">🔒 Aguardando o conferente</div>
                    <div class="e4-bloqueado-hint">Apenas o conferente responsável ou a GESTÃO podem confirmar esta etapa.</div>
                </div>
            `}

            <div class="tabela-wrapper">
                <div class="table-responsive">
                    <table class="relatorio-tabela">
                        <thead>
                            <tr>
                                <th style="width:36px">#</th>
                                <th style="width:110px">Código</th>
                                <th>Descrição</th>
                                <th style="width:50px">UN</th>
                                <th style="width:80px">QTD</th>
                                <th style="width:90px">RMA</th>
                                <th style="width:90px">Separada</th>
                                <th style="width:100px">Status</th>
                            </tr>
                        </thead>
                        <tbody id="e4Body"></tbody>
                    </table>
                </div>
            </div>

            <div class="e3-footer">
                <button class="btn-filtrar btn-success" ${podeAvancar ? '' : 'disabled'} onclick="Etapa4.avancar()">➡️ Avançar para Expedido</button>
                ${!podeAvancar ? `<span class="e3-footer-hint">Confirme a conferência primeiro.</span>` : ''}
            </div>
        `;

        this.renderItens();
    },

    renderItens() {
        const tbody = document.getElementById('e4Body');
        const arr = this.itens || [];
        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted" style="padding:1.5rem">Nenhum item.</td></tr>`;
            return;
        }
        tbody.innerHTML = arr.map((it, idx) => `
            <tr data-id="${it.id}">
                <td class="text-center text-muted">${idx + 1}</td>
                <td><input type="text" class="input-tabela" value="${it.codigo || ''}" readonly></td>
                <td><input type="text" class="input-tabela" value="${(it.descricao || '').replace(/"/g, '&quot;')}" readonly></td>
                <td><input type="text" class="input-tabela text-center" value="${it.unidade || ''}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_programada || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_rma || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_separada || 0}" readonly></td>
                <td>${SitaHelpers.badgeStatus(it.status_item)}</td>
            </tr>
        `).join('');
    },

    async confirmar() {
        if (!confirm('🔍 Confirmar a conferência deste documento?\n\nApós confirmar, o documento vai para EXPEDIDO e só a GESTÃO poderá reverter.')) return;
        try {
            const resp = await SitaAPI.confirmarConferencia(this.doc.numero);
            alert(`✅ Conferência confirmada por ${resp.conferente}`);
            await this.recarregar();
        } catch (e) { alert('❌ ' + e.message); }
    },

    async avancar() {
        if (!this.doc.conferente || !this.doc.data_conferencia) { alert('Confirme a conferência primeiro.'); return; }
        try { await SitaAPI.avancar(this.doc.numero); location.reload(); }
        catch (e) { alert(e.message); }
    },

    async recarregar() {
        const doc = await SitaAPI.buscar(this.doc.numero);
        this.doc = doc;
        this.itens = doc.itens || [];
        const cont = document.getElementById('tab-etapa');
        await this.render(cont, doc);
    }
};

// ============================================================
// 15. ETAPA 5 — EXPEDIDO
// ============================================================
window.Etapa5 = {
    doc: null, itens: [],

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const ehBackoffice = perfilUser === 'BACKOFFICE' || perfilUser === 'GESTAO';

        container.innerHTML = `
            <div class="e3-tag-wrap">
                <span class="e3-tag tag-expedido">🚚 EXPEDIDO</span>
                ${docAtual.separador ? `<span class="e3-sep">👷 Separador: <strong>${docAtual.separador}</strong></span>` : ''}
            </div>

            <h3 class="etapa-titulo">🚚 Etapa 5 — Expedido</h3>

            <div class="mgm-cabecalho">
                <div class="mgm-cab-row">
                    <div class="mgm-cab-col"><label>🚚 Caminhão</label><input type="text" id="e5Caminhao" value="${docAtual.caminhao || ''}" placeholder="Placa ou identificação"></div>
                    <div class="mgm-cab-col"><label>📅 Data de Expedição</label><input type="date" id="e5DataExpedicao" value="${docAtual.data_expedicao || ''}"></div>
                </div>
            </div>

            <div class="tabela-wrapper">
                <div class="table-responsive">
                    <table class="relatorio-tabela">
                        <thead>
                            <tr>
                                <th style="width:36px">#</th>
                                <th style="width:110px">Código</th>
                                <th>Descrição</th>
                                <th style="width:50px">UN</th>
                                <th style="width:80px">QTD Base</th>
                                <th style="width:80px">Aditivo Saída</th>
                                <th style="width:80px">Aditivo Campo</th>
                                <th style="width:90px">Separada</th>
                                <th style="width:100px">Status</th>
                            </tr>
                        </thead>
                        <tbody id="e5Body"></tbody>
                    </table>
                </div>
            </div>

            <div class="e3-subetapas" id="e5Subetapas"></div>

            <div class="e3-footer">
                <button class="btn-filtrar btn-success" onclick="Etapa5.avancar()">➡️ Avançar para Devolvido</button>
            </div>
        `;

        this.renderItens();
        this.renderSubetapas();
        this.configurarCabecalho();
    },

    configurarCabecalho() {
        ['e5Caminhao', 'e5DataExpedicao'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const campo = id === 'e5Caminhao' ? 'caminhao' : 'data_expedicao';
            el.addEventListener('change', async () => {
                try { await SitaAPI.atualizar(this.doc.numero, { [campo]: el.value.trim() }); }
                catch (e) { alert('Erro ao salvar: ' + e.message); }
            });
        });
    },

    renderItens() {
        const tbody = document.getElementById('e5Body');
        const arr = this.itens || [];
        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:1.5rem">Nenhum item.</td></tr>`;
            return;
        }
        tbody.innerHTML = arr.map((it, idx) => `
            <tr>
                <td class="text-center text-muted">${idx + 1}</td>
                <td><input type="text" class="input-tabela" value="${it.codigo || ''}" readonly></td>
                <td><input type="text" class="input-tabela" value="${(it.descricao || '').replace(/"/g, '&quot;')}" readonly></td>
                <td><input type="text" class="input-tabela text-center" value="${it.unidade || ''}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_programada || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_aditivo_saida || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_aditivo_campo || 0}" readonly></td>
                <td><input type="number" class="input-tabela num" value="${it.qtd_separada || 0}" readonly></td>
                <td>${SitaHelpers.badgeStatus(it.status_item)}</td>
            </tr>
        `).join('');
    },

    renderSubetapas() {
        const cont = document.getElementById('e5Subetapas');
        if (!cont) return;
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 5);
        if (subs.length === 0) { cont.innerHTML = ''; return; }

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const ehBackoffice = perfilUser === 'BACKOFFICE' || perfilUser === 'GESTAO';

        cont.innerHTML = `
            <h4 class="subtitulo">⚙️ Subetapas</h4>
            ${subs.map(s => {
                const ignorada = s.ignorada === 1;
                const bloqueada = !ehBackoffice;
                return `
                    <div class="subetapa ${s.concluida ? 'ok' : ''} ${ignorada ? 'ignorada' : ''} ${bloqueada ? 'restrita' : ''}">
                        <input type="checkbox" ${s.concluida ? 'checked' : ''} ${bloqueada ? 'disabled' : ''}
                            onchange="Etapa5.toggleSubetapa('${s.codigo}', this.checked)">
                        <span class="subetapa-label">➕ Aditivo de campo (opcional)</span>
                        ${ignorada ? `<span class="subetapa-meta">⏭ Ignorada</span>` : ''}
                        ${s.concluida ? `<span class="subetapa-meta">✓ ${s.concluida_por}</span>` : ''}
                        ${bloqueada && !s.concluida ? `<span class="subetapa-restrita">🔒 Só backoffice</span>` : ''}
                        ${!s.concluida && !ignorada && ehBackoffice ? `
                            <button class="subetapa-btn" onclick="Etapa5.abrirModalAditivo()">Adicionar Aditivo</button>
                            <button class="subetapa-btn btn-ignorar" onclick="Etapa5.ignorar()">Não se aplica</button>
                        ` : ''}
                        ${ignorada ? `<button class="subetapa-btn btn-desfazer" onclick="Etapa5.reabrir('${s.codigo}')">Desfazer</button>` : ''}
                    </div>
                `;
            }).join('')}
        `;
    },

    async toggleSubetapa(codigo, marcar) {
        try {
            if (marcar) await SitaAPI.concluirSubetapa(this.doc.numero, codigo);
            else await SitaAPI.reabrirSubetapa(this.doc.numero, codigo);
            await this.recarregar();
        } catch (e) { alert(e.message); await this.recarregar(); }
    },

    async ignorar() {
        try { await SitaAPI.ignorarSubetapa(this.doc.numero, 'ET5_ADITIVO_CAMPO'); await this.recarregar(); }
        catch (e) { alert(e.message); }
    },

    async reabrir(codigo) {
        try { await SitaAPI.reabrirSubetapa(this.doc.numero, codigo); await this.recarregar(); }
        catch (e) { alert(e.message); }
    },

    abrirModalAditivo() {
        const antigo = document.getElementById('e5ModalAditivo');
        if (antigo) antigo.remove();

        const modal = document.createElement('div');
        modal.id = 'e5ModalAditivo';
        modal.className = 'modal-overlay ativo';
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-head">
                    <h3>➕ Adicionar Aditivo de Campo</h3>
                    <button class="btn-fechar" onclick="document.getElementById('e5ModalAditivo').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <label>Código do Material *</label>
                    <input type="text" id="e5AditCodigo" placeholder="Ex: 90395">
                    <label>Quantidade *</label>
                    <input type="number" id="e5AditQtd" step="any" min="0.01">
                    <label>Nº do Documento RMA *</label>
                    <input type="text" id="e5AditNumDoc" placeholder="Ex: 2601509345">
                    <label>Observação</label>
                    <textarea id="e5AditObs" rows="2" placeholder="Opcional"></textarea>
                </div>
                <div class="modal-foot">
                    <button class="btn-limpar-filtros" onclick="document.getElementById('e5ModalAditivo').remove()">Cancelar</button>
                    <button class="btn-filtrar" onclick="Etapa5.salvarAditivo()">💾 Adicionar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('e5AditCodigo')?.focus(), 100);
    },

    async salvarAditivo() {
        const codigo = document.getElementById('e5AditCodigo')?.value.trim();
        const quantidade = parseFloat(document.getElementById('e5AditQtd')?.value);
        const numero_documento = document.getElementById('e5AditNumDoc')?.value.trim();
        const observacao = document.getElementById('e5AditObs')?.value.trim();
        if (!codigo || !quantidade || !numero_documento) { alert('Preencha código, quantidade e nº do documento'); return; }
        try {
            const resp = await SitaAPI.adicionarAditivoCampo(this.doc.numero, { codigo, quantidade, numero_documento, observacao });
            document.getElementById('e5ModalAditivo')?.remove();
            await this.recarregar();
            const msg = resp.acao === 'SOMADO' ? 'somado ao item existente' : 'novo item criado';
            alert(`✅ Aditivo de campo registrado (${msg})`);
        } catch (e) { alert(e.message); }
    },

    async avancar() {
        try { await SitaAPI.avancar(this.doc.numero); location.reload(); }
        catch (e) { alert(e.message); }
    },

    async recarregar() {
        const doc = await SitaAPI.buscar(this.doc.numero);
        this.doc = doc;
        this.itens = doc.itens || [];
        const cont = document.getElementById('tab-etapa');
        await this.render(cont, doc);
    }
};

// ============================================================
// 16. ETAPA 6 — DEVOLVIDO
// ============================================================
window.Etapa6 = {
    doc: null, itens: [], tratativas: [],

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];
        this.tratativas = docAtual.tratativas || [];

        const arquivado = docAtual.status === 'ARQUIVADO';
        const tagLabel = arquivado ? '✅ ARQUIVADO' : '↩️ DEVOLVIDO';
        const tagCls = arquivado ? 'tag-arquivado' : 'tag-devolvido';

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const ehDev = perfilUser === 'DEVOLUCAO' || perfilUser === 'GESTAO';

        const subs = (docAtual.subetapas || []).filter(s => s.etapa === 6);
        const todasOk = subs.length === 3 && subs.every(s => s.concluida);

        const naoDevolvidos = this.itens.filter(it => {
            const sep = parseFloat(it.qtd_separada) || 0;
            const apl = parseFloat(it.qtd_aplicada) || 0;
            const dev = parseFloat(it.qtd_devolvida) || 0;
            return (sep - apl - dev) > 0.01;
        });
        const tratativasOk = naoDevolvidos.every(it => {
            const t = this.tratativas.find(x => x.item_id === it.id);
            return t && t.observacao && t.observacao.trim();
        });
        const podeConcluir = todasOk && tratativasOk && !arquivado;

        container.innerHTML = `
            <div class="e3-tag-wrap">
                <span class="e3-tag ${tagCls}">${tagLabel}</span>
                ${arquivado ? `<span class="e3-sep text-success text-bold">📁 Documento concluído em ${docAtual.atualizado_em ? new Date(docAtual.atualizado_em).toLocaleDateString('pt-BR') : '—'}</span>` : ''}
            </div>

            <h3 class="etapa-titulo">↩️ Etapa 6 — Devolvido</h3>

            ${arquivado ? `
                <div class="e4-confirmado-box">
                    <div class="e4-confirmado-title">✅ Documento arquivado</div>
                    <div class="e4-confirmado-info">Todas as etapas foram concluídas. Este documento está apenas para consulta.</div>
                </div>
            ` : `
                <div class="mgm-cabecalho">
                    <div class="mgm-cab-row">
                        <div class="mgm-cab-col"><label>📅 Data da Devolução Física</label><input type="date" id="e6DataDevolucao" value="${docAtual.data_devolucao_fisica || ''}" ${!ehDev ? 'disabled' : ''}></div>
                    </div>
                </div>
            `}

            <div class="tabela-wrapper">
                <div class="table-responsive">
                    <table class="relatorio-tabela">
                        <thead>
                            <tr>
                                <th style="width:36px">#</th>
                                <th style="width:100px">Código</th>
                                <th>Descrição</th>
                                <th style="width:50px">UN</th>
                                <th style="width:70px">Separada</th>
                                <th style="width:80px">Aplicado</th>
                                <th style="width:80px">Devolvido</th>
                                <th style="width:90px">Não Devolvido</th>
                                <th style="width:80px">DMA</th>
                            </tr>
                        </thead>
                        <tbody id="e6Body"></tbody>
                    </table>
                </div>
            </div>

            ${naoDevolvidos.length > 0 && !arquivado ? `
                <div class="e6-tratativas-box">
                    <div class="e6-tratativas-title">⚠️ Tratativas pendentes (${naoDevolvidos.length} item(ns) não devolvido(s))</div>
                    <div class="e6-tratativas-hint">Cada item abaixo precisa de uma observação para auditoria. A tratativa real ocorre entre gestores por fora do sistema.</div>
                    <div id="e6Tratativas"></div>
                </div>
            ` : ''}

            <div class="e3-subetapas" id="e6Subetapas"></div>

            <div class="e3-footer">
                ${!arquivado ? `
                    <button class="btn-filtrar btn-success" ${podeConcluir ? '' : 'disabled'} onclick="Etapa6.concluir()">📁 Concluir Documento (Arquivar)</button>
                    ${!podeConcluir ? `<span class="e3-footer-hint">${!todasOk ? 'Conclua as 3 subetapas.' : 'Preencha as tratativas dos itens não devolvidos.'}</span>` : ''}
                ` : `<span class="text-success text-bold">✅ Documento arquivado</span>`}
            </div>
        `;

        this.renderItens();
        this.renderSubetapas();
        this.renderTratativas();
        this.configurarCabecalho();
    },

    configurarCabecalho() {
        const el = document.getElementById('e6DataDevolucao');
        if (!el || el.disabled) return;
        el.addEventListener('change', async () => {
            try { await SitaAPI.atualizar(this.doc.numero, { data_devolucao_fisica: el.value }); }
            catch (e) { alert('Erro: ' + e.message); }
        });
    },

    renderItens() {
        const tbody = document.getElementById('e6Body');
        const arr = this.itens || [];
        const arquivado = this.doc.status === 'ARQUIVADO';
        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:1.5rem">Nenhum item.</td></tr>`;
            return;
        }
        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const ehDev = perfilUser === 'DEVOLUCAO' || perfilUser === 'GESTAO';

        tbody.innerHTML = arr.map((it, idx) => {
            const sep = parseFloat(it.qtd_separada) || 0;
            const apl = parseFloat(it.qtd_aplicada) || 0;
            const dev = parseFloat(it.qtd_devolvida) || 0;
            const naoDev = Math.max(0, sep - apl - dev);

            return `
                <tr data-id="${it.id}">
                    <td class="text-center text-muted">${idx + 1}</td>
                    <td><input type="text" class="input-tabela" value="${it.codigo || ''}" readonly></td>
                    <td><input type="text" class="input-tabela" value="${(it.descricao || '').replace(/"/g, '&quot;')}" readonly></td>
                    <td><input type="text" class="input-tabela text-center" value="${it.unidade || ''}" readonly></td>
                    <td><input type="number" class="input-tabela num" value="${sep}" readonly></td>
                    <td><input type="number" class="input-tabela num" value="${apl}" step="any" min="0" ${(!ehDev || arquivado) ? 'disabled' : ''}
                        onchange="Etapa6.salvarQtd(${it.id}, 'qtd_aplicada', parseFloat(this.value)||0)"></td>
                    <td><input type="number" class="input-tabela num" value="${dev}" step="any" min="0" ${(!ehDev || arquivado) ? 'disabled' : ''}
                        onchange="Etapa6.salvarQtd(${it.id}, 'qtd_devolvida', parseFloat(this.value)||0)"></td>
                    <td><span class="e6-nao-dev ${naoDev > 0 ? 'alerta' : 'zero'}">${naoDev.toFixed(2)}</span></td>
                    <td><input type="number" class="input-tabela num" value="${it.qtd_dma || 0}" readonly></td>
                </tr>
            `;
        }).join('');
    },

    renderSubetapas() {
        const cont = document.getElementById('e6Subetapas');
        if (!cont) return;
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 6);
        if (subs.length === 0) { cont.innerHTML = ''; return; }

        const labels = {
            'ET6_DEVOLUCAO_FISICA': '📦 Devolução física do material',
            'ET6_VERIFICAR_APLICADO': '🔍 Verificar material aplicado',
            'ET6_DEVOLUCAO_SISTEMICA': '🧾 Devolução sistêmica (DMA)'
        };

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const ehDev = perfilUser === 'DEVOLUCAO' || perfilUser === 'GESTAO';
        const ehBackoffice = perfilUser === 'BACKOFFICE' || perfilUser === 'GESTAO';
        const arquivado = this.doc.status === 'ARQUIVADO';

        cont.innerHTML = `
            <h4 class="subtitulo">⚙️ Subetapas</h4>
            ${subs.map(s => {
                const label = labels[s.codigo] || s.codigo;
                let bloqueada = false;
                if ((s.codigo === 'ET6_DEVOLUCAO_FISICA' || s.codigo === 'ET6_VERIFICAR_APLICADO') && !ehDev) bloqueada = true;
                if (s.codigo === 'ET6_DEVOLUCAO_SISTEMICA' && !ehBackoffice) bloqueada = true;
                if (arquivado) bloqueada = true;
                const ehDMA = s.codigo === 'ET6_DEVOLUCAO_SISTEMICA';

                return `
                    <div class="subetapa ${s.concluida ? 'ok' : ''} ${bloqueada ? 'restrita' : ''}">
                        <input type="checkbox" ${s.concluida ? 'checked' : ''} ${bloqueada ? 'disabled' : ''}
                            onchange="Etapa6.toggleSubetapa('${s.codigo}', this.checked)">
                        <span class="subetapa-label">${label}</span>
                        ${s.concluida ? `<span class="subetapa-meta">✓ ${s.concluida_por}</span>` : ''}
                        ${bloqueada && !s.concluida && !arquivado ? `<span class="subetapa-restrita">🔒 ${ehDMA ? 'Só backoffice' : 'Só devolução'}</span>` : ''}
                        ${!s.concluida && !bloqueada && ehDMA ? `<button class="subetapa-btn" onclick="Etapa6.abrirModalDMA()">Registrar DMA</button>` : ''}
                    </div>
                `;
            }).join('')}
        `;
    },

    renderTratativas() {
        const cont = document.getElementById('e6Tratativas');
        if (!cont) return;
        const arquivado = this.doc.status === 'ARQUIVADO';
        const naoDevolvidos = this.itens.filter(it => {
            const sep = parseFloat(it.qtd_separada) || 0;
            const apl = parseFloat(it.qtd_aplicada) || 0;
            const dev = parseFloat(it.qtd_devolvida) || 0;
            return (sep - apl - dev) > 0.01;
        });

        if (naoDevolvidos.length === 0) { cont.innerHTML = ''; return; }

        cont.innerHTML = naoDevolvidos.map(it => {
            const trat = this.tratativas.find(x => x.item_id === it.id);
            const sep = parseFloat(it.qtd_separada) || 0;
            const apl = parseFloat(it.qtd_aplicada) || 0;
            const dev = parseFloat(it.qtd_devolvida) || 0;
            const naoDev = (sep - apl - dev).toFixed(2);
            const preenchido = trat && trat.observacao && trat.observacao.trim();

            return `
                <div class="e6-tratativa-item ${preenchido ? 'ok' : 'pendente'}">
                    <div class="e6-tratativa-head">
                        <span><strong>${it.codigo}</strong> · ${it.descricao || ''}</span>
                        <span class="e6-tratativa-qtd">Não devolvido: <strong>${naoDev}</strong> ${it.unidade || ''}</span>
                    </div>
                    <textarea placeholder="Observação obrigatória (ex: material será devolvido em 20/03, sinistro, etc.)"
                        ${arquivado ? 'disabled' : ''}
                        onchange="Etapa6.salvarTratativa(${it.id}, this.value)">${trat?.observacao || ''}</textarea>
                    ${preenchido ? '<span class="e6-tratativa-ok">✓ Observação registrada</span>' : '<span class="e6-tratativa-pend">⚠️ Preencha a observação</span>'}
                </div>
            `;
        }).join('');
    },

    async salvarQtd(itemId, campo, valor) {
        try { await SitaAPI.atualizarItem(this.doc.numero, itemId, { [campo]: valor }); await this.recarregar(); }
        catch (e) { alert(e.message); }
    },

    async salvarTratativa(itemId, obs) {
        if (!obs || !obs.trim()) return;
        try {
            await SitaAPI.criarTratativa(this.doc.numero, itemId, obs.trim());
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    async toggleSubetapa(codigo, marcar) {
        try {
            if (marcar) await SitaAPI.concluirSubetapa(this.doc.numero, codigo);
            else await SitaAPI.reabrirSubetapa(this.doc.numero, codigo);
            await this.recarregar();
        } catch (e) { alert(e.message); await this.recarregar(); }
    },

    abrirModalDMA() {
        const antigo = document.getElementById('e6ModalDMA');
        if (antigo) antigo.remove();
        const modal = document.createElement('div');
        modal.id = 'e6ModalDMA';
        modal.className = 'modal-overlay ativo';
        modal.innerHTML = `
            <div class="modal-box">
                <div class="modal-head">
                    <h3>🧾 Registrar DMA (Devolução Sistêmica)</h3>
                    <button class="btn-fechar" onclick="document.getElementById('e6ModalDMA').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <label>Nº do Documento DMA *</label>
                    <input type="text" id="e6DmaNum" placeholder="Ex: 2601509345">
                    <label>Data</label>
                    <input type="date" id="e6DmaData">
                    <label>Observação</label>
                    <textarea id="e6DmaObs" rows="2" placeholder="Opcional"></textarea>
                </div>
                <div class="modal-foot">
                    <button class="btn-limpar-filtros" onclick="document.getElementById('e6ModalDMA').remove()">Cancelar</button>
                    <button class="btn-filtrar" onclick="Etapa6.salvarDMA()">💾 Registrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('e6DmaNum')?.focus(), 100);
    },

    async salvarDMA() {
        const numero = document.getElementById('e6DmaNum')?.value.trim();
        const data = document.getElementById('e6DmaData')?.value;
        const obs = document.getElementById('e6DmaObs')?.value.trim();
        if (!numero) { alert('Informe o nº do documento'); return; }
        try {
            await SitaAPI.criarSistemico(this.doc.numero, {
                tipo: 'DMA', subtipo: null, numero_documento: numero, data_documento: data || null, observacao: obs
            });
            document.getElementById('e6ModalDMA')?.remove();
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    async concluir() {
        if (!confirm('📁 Concluir o documento e arquivar?\n\nApós isso, ele não poderá mais ser editado (só consulta).')) return;
        try {
            await SitaAPI.concluir(this.doc.numero);
            alert('✅ Documento arquivado com sucesso.');
            location.reload();
        } catch (e) { alert('❌ ' + e.message); }
    },

    async recarregar() {
        const doc = await SitaAPI.buscar(this.doc.numero);
        this.doc = doc;
        this.itens = doc.itens || [];
        this.tratativas = doc.tratativas || [];
        const cont = document.getElementById('tab-etapa');
        await this.render(cont, doc);
    }
};

// ============================================================
// 17. INICIALIZAÇÃO (auto-detecção via <body data-page="...">)
// ============================================================
(function initSita() {
    document.addEventListener('DOMContentLoaded', () => {
        const page = document.body.dataset.page;
        if (!page) return;
        const map = {
            'index':       () => SitaIndex.init(),
            'esteira':     () => SitaEsteira.init(),
            'despacho':    () => SitaDespacho.init(),
            'documento':   () => SitaDocumento.init(),
            'separacao':   () => SitaSeparacao.init(),
            'pendencias':  () => SitaPendencias.init()
        };
        if (map[page]) {
            try { map[page](); }
            catch (e) { console.error(`❌ SITA init (${page}):`, e); }
        }
    });
})();