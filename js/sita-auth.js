// ============================================================
// SITA v2 — Auth wrapper (NÃO altera perfis)
// Só consome o authService existente do SICGM.
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