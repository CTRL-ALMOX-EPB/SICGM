// ============================================================
// SITA v2 — Cliente HTTP do worker sicgm-sita
// ============================================================
window.SitaAPI = {
    async _fetch(path, opcoes = {}) {
        const url = `${SITA_CONFIG.API_URL}${path}`;
        const res = await fetch(url, {
            ...opcoes,
            headers: { ...SitaAuth.headers(), ...(opcoes.headers || {}) }
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return res.json();
    },

    // Documentos
    listar:          (params = {}) => SitaAPI._fetch('/api/documentos?' + new URLSearchParams(params)),
    buscar:          (numero)      => SitaAPI._fetch(`/api/documentos/${numero}`),
    criar:           (body)        => SitaAPI._fetch('/api/documentos', { method: 'POST', body: JSON.stringify(body) }),
    atualizar:       (numero, body)=> SitaAPI._fetch(`/api/documentos/${numero}`, { method: 'PUT', body: JSON.stringify(body) }),
    arquivar:        (numero)      => SitaAPI._fetch(`/api/documentos/${numero}`, { method: 'DELETE' }),
    restaurar:       (numero)      => SitaAPI._fetch(`/api/documentos/${numero}/restaurar`, { method: 'POST' }),

    avancar:         (numero)      => SitaAPI._fetch(`/api/documentos/${numero}/avancar`, { method: 'POST' }),
    voltar:          (numero, motivo) => SitaAPI._fetch(`/api/documentos/${numero}/voltar`, { method: 'POST', body: JSON.stringify({ motivo }) }),

    // Subetapas
    concluirSubetapa: (numero, codigo, obs) => SitaAPI._fetch(`/api/documentos/${numero}/subetapas/${codigo}/concluir`, { method: 'POST', body: JSON.stringify({ observacao: obs }) }),
    reabrirSubetapa:  (numero, codigo)      => SitaAPI._fetch(`/api/documentos/${numero}/subetapas/${codigo}/reabrir`, { method: 'POST' }),

    // Itens
    listarItens:   (numero)        => SitaAPI._fetch(`/api/documentos/${numero}/itens`),
    criarItem:     (numero, body)  => SitaAPI._fetch(`/api/documentos/${numero}/itens`, { method: 'POST', body: JSON.stringify(body) }),
    atualizarItem: (numero, id, body) => SitaAPI._fetch(`/api/documentos/${numero}/itens/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    removerItem:   (numero, id)    => SitaAPI._fetch(`/api/documentos/${numero}/itens/${id}`, { method: 'DELETE' }),
    criarItensBulk:(numero, itens) => SitaAPI._fetch(`/api/documentos/${numero}/itens/bulk`, { method: 'POST', body: JSON.stringify({ itens }) }),

    // Sistêmicos
    listarSistemicos: (numero)     => SitaAPI._fetch(`/api/documentos/${numero}/sistemicos`),
    criarSistemico:   (numero, body) => SitaAPI._fetch(`/api/documentos/${numero}/sistemicos`, { method: 'POST', body: JSON.stringify(body) }),

    // Eventos
    listarEventos: (numero) => SitaAPI._fetch(`/api/documentos/${numero}/eventos`),

    // Despacho
    listarDespacho:  (data)    => SitaAPI._fetch(`/api/despacho?data=${data}`),
    despachar:       (numero, separador) => SitaAPI._fetch(`/api/despacho/${numero}`, { method: 'POST', body: JSON.stringify({ separador }) }),

    // Esteira / calendário
    esteira:    (data)          => SitaAPI._fetch(`/api/esteira?data=${data}`),
    calendario: (inicio, fim)   => SitaAPI._fetch(`/api/calendario?inicio=${inicio}&fim=${fim}`),

    // Importação
    importarLote: (linhas) => SitaAPI._fetch('/api/programacao/importar-lote', { method: 'POST', body: JSON.stringify({ linhas }) }),
    buscaProgramacao: (q)  => SitaAPI._fetch(`/api/programacao/busca?q=${encodeURIComponent(q)}`),

    // Proxies R2
    posicaoEstoque:  () => fetch(`${SITA_CONFIG.API_URL}/api/proxy/posicao-estoque`).then(r => r.text()),
    movimentosSiago: () => fetch(`${SITA_CONFIG.API_URL}/api/proxy/movimentos-siago`).then(r => r.text()),
    aditivosRepApv:  () => fetch(`${SITA_CONFIG.API_URL}/api/proxy/aditivos-rep-apv`).then(r => r.text())
};