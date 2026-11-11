// ============================================================
// SITA v2 — Navegação entre sub-páginas (compatível com iframe da home)
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
        if (pagina === 'index.html') {
            window.location.href = 'index.html';
        } else {
            window.location.href = pagina;
        }
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