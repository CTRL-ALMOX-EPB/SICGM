// ============================================
// AUTH-SERVICE.JS - v6
// - sessionStorage como cache local (segurança)
// - KV do Worker como fonte da verdade da sessão
// - Compat: perfil (string) + perfis[] (array)
// - WORKER_URL preservado do original
// ============================================

class AuthService {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        this.usersCache = new Map();
        this.ready = false;

        this.WORKER_URL = 'https://polished-salad-1dbe.alefe-gomes-72f.workers.dev/api';

        this.SESSION_DURATION = 30 * 60 * 1000;
        this.RENEW_THRESHOLD = 5 * 60 * 1000;

        this.KEY_TOKEN = 'auth_token';
        this.KEY_EXPIRY = 'session_expiry';
        this.KEY_LAST_EMAIL = 'auth_last_email';

        this._logoutInProgress = false;
        this._initPromise = this._init();
    }

    async _init() {
        const start = Date.now();
        while (!window.__FIREBASE_INITIALIZED__) {
            if (Date.now() - start > 8000) {
                console.error('❌ Timeout esperando Firebase.');
                return false;
            }
            await new Promise(r => setTimeout(r, 50));
        }
        if (typeof firebase === 'undefined' || !firebase.apps.length) return false;

        this.auth = firebase.auth();
        this.ready = true;
        this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            if (user) console.log('🔥 Firebase ativo:', user.email);
        });
        console.log('✅ AuthService pronto.');
        return true;
    }

    async waitForInit() { await this._initPromise; return this.ready; }

    // ============================================
    // sessionStorage (cache)
    // ============================================
    _saveLocal(payload) {
        try {
            sessionStorage.setItem(this.KEY_TOKEN, btoa(JSON.stringify(payload)));
            sessionStorage.setItem(this.KEY_EXPIRY, String(payload.exp));
            if (payload.email) {
                try { localStorage.setItem(this.KEY_LAST_EMAIL, payload.email); } catch (_) {}
            }
            return true;
        } catch (e) {
            console.error('❌ _saveLocal:', e);
            return false;
        }
    }

    _readLocal() {
        try {
            const t = sessionStorage.getItem(this.KEY_TOKEN);
            if (!t) return null;
            const parsed = JSON.parse(atob(t));
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch (e) {
            this._clearLocal();
            return null;
        }
    }

    _clearLocal() {
        try { sessionStorage.removeItem(this.KEY_TOKEN); } catch (_) {}
        try { sessionStorage.removeItem(this.KEY_EXPIRY); } catch (_) {}
    }

    // ============================================
    // LOGIN
    // ============================================
    async login(email, senha) {
        await this.waitForInit();
        try {
            this.showLoading(true);
            const cred = await this.auth.signInWithEmailAndPassword(email, senha);
            this.currentUser = cred.user;

            const userData = await this.fetchUserData(email);
            if (!userData) throw new Error('Dados do usuário não encontrados');
            if (userData.ativo === false) {
                await this.auth.signOut();
                throw new Error('Conta desativada. Entre em contato com o administrador.');
            }

            // Validação especial: TECNICA requer DCMD
            const perfis = Array.isArray(userData.perfis) ? userData.perfis : [];
            const temTecnica = perfis.some(p => p.perfil === 'TECNICA');
            const temTecnicaDcmd = perfis.some(p => p.perfil === 'TECNICA' && (p.departamentos || []).includes('DCMD'));
            if (temTecnica && !temTecnicaDcmd) {
                await this.auth.signOut();
                throw new Error('Perfil TÉCNICA requer o departamento DCMD. Contate a Gestão.');
            }

            await this.registerActiveSession(userData);
            this.createSession(userData);
            return { success: true, user: userData };
        } catch (error) {
            console.error('❌ Login:', error);
            return { success: false, error: this.handleError(error) };
        } finally {
            this.showLoading(false);
        }
    }

    createSession(userData) {
        const perfis = Array.isArray(userData.perfis) && userData.perfis.length > 0
            ? userData.perfis
            : (userData.perfil
                ? [{ perfil: userData.perfil, departamentos: ['DCMD','DMPC','DECP','DEOP'] }]
                : []);

        const payload = {
            email: userData.email,
            nome: userData.nome,
            matricula: userData.matricula,
            perfil: userData.perfil || perfis[0]?.perfil || 'VISUALIZACAO',
            perfis,
            departamentos: userData.departamentos || [],
            exp: Date.now() + this.SESSION_DURATION
        };
        return this._saveLocal(payload);
    }

    renewSession() {
        const p = this._readLocal();
        if (!p) return false;
        return this._saveLocal({ ...p, exp: Date.now() + this.SESSION_DURATION });
    }

    // ============================================
    // RESTAURAR A PARTIR DO KV
    // ============================================
    async restoreSessionFromKV() {
        let email = null;
        if (this.auth && this.auth.currentUser && this.auth.currentUser.email) {
            email = this.auth.currentUser.email;
        } else {
            try {
                const lastEmail = localStorage.getItem(this.KEY_LAST_EMAIL);
                if (lastEmail) email = lastEmail;
            } catch (_) {}
        }
        if (!email) return false;

        try {
            const r = await fetch(`${this.WORKER_URL}/sessions/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!r.ok) return false;

            const data = await r.json();
            if (!data.active || !data.sessao) {
                if (this.auth && this.auth.currentUser) {
                    try { await this.auth.signOut(); } catch (_) {}
                }
                return false;
            }

            const s = data.sessao;
            const perfis = s.perfis || (s.perfil ? [{ perfil: s.perfil, departamentos: [] }] : []);
            const payload = {
                email: s.email || email,
                nome: s.nome,
                matricula: s.matricula,
                perfil: s.perfil || perfis[0]?.perfil || 'VISUALIZACAO',
                perfis,
                departamentos: s.departamentos || [],
                exp: Date.now() + this.SESSION_DURATION
            };
            this._saveLocal(payload);
            await this.registerActiveSession(payload);
            console.log('✅ Sessão restaurada do KV.');
            return true;
        } catch (e) {
            console.warn('⚠️ restoreSessionFromKV:', e);
            return false;
        }
    }

    // ============================================
    // SESSÃO
    // ============================================
    isLoggedIn() {
        try {
            const p = this._readLocal();
            if (!p) return false;
            if (!p.exp) return this.renewSession();
            if (p.exp < Date.now()) {
                if (this.auth && this.auth.currentUser) return this.renewSession();
                return false;
            }
            if (p.exp - Date.now() < this.RENEW_THRESHOLD) this.renewSession();
            return true;
        } catch (e) {
            return false;
        }
    }

    getUserData() {
        try {
            if (!this.isLoggedIn()) return null;
            const p = this._readLocal();
            if (!p) return null;
            const perfis = p.perfis || (p.perfil ? [{ perfil: p.perfil, departamentos: [] }] : []);
            return {
                email: p.email || '',
                nome: p.nome || '',
                matricula: p.matricula || '',
                perfil: p.perfil || perfis[0]?.perfil || 'VISUALIZACAO',
                perfis,
                departamentos: p.departamentos || [],
                exp: p.exp || 0
            };
        } catch (e) {
            return null;
        }
    }

    clearSession() { this._clearLocal(); }

    // ============================================
    // HELPERS NOVOS (perfis/departamentos)
    // ============================================
    getPerfis() {
        const u = this.getUserData();
        return u?.perfis || [];
    }

    getDepartamentos() {
        const u = this.getUserData();
        return u?.departamentos || [];
    }

    temPerfil(perfilId) {
        return this.getPerfis().some(p => p.perfil === perfilId);
    }

    temPerfilEm(perfilId, deptoId) {
        return this.getPerfis().some(p => p.perfil === perfilId && (p.departamentos || []).includes(deptoId));
    }

    temDepartamento(deptoId) {
        return this.getDepartamentos().includes(deptoId);
    }

    ehGestao() { return this.temPerfil('GESTAO'); }

    ehVisualizacao() {
        const perfis = this.getPerfis();
        return perfis.length === 1 && perfis[0].perfil === 'VISUALIZACAO';
    }

    podeAcessar(modulo) {
        const perfis = this.getPerfis();
        if (perfis.length === 0) return false;
        return perfis.some(p => {
            const m = window.MATRIZ_ACESSO_SICGM?.[modulo];
            return m && m[p.perfil];
        });
    }

    podeEditar(modulo) {
        const perfis = this.getPerfis();
        if (perfis.length === 0) return false;
        return perfis.some(p => {
            const m = window.MATRIZ_ACESSO_SICGM?.[modulo];
            return m && m[p.perfil] === 'edita';
        });
    }

    // ============================================
    // LOGOUT
    // ============================================
    async logout() {
        this._logoutInProgress = true;
        try {
            const p = this._readLocal();
            let emailToRemove = null;
            if (p && p.email) emailToRemove = p.email;
            else {
                try { emailToRemove = localStorage.getItem(this.KEY_LAST_EMAIL); } catch (_) {}
            }
            if (emailToRemove) {
                try {
                    await fetch(`${this.WORKER_URL}/sessions/remove`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: emailToRemove })
                    });
                } catch (e) { console.warn('⚠️ Erro KV remove:', e); }
            }
            this._clearLocal();
            try {
                try { localStorage.removeItem(this.KEY_LAST_EMAIL); } catch (_) {}
                if (this.auth) await this.auth.signOut();
            } catch (_) {}
            return true;
        } catch (error) {
            console.error('❌ logout:', error);
            this._clearLocal();
            return false;
        } finally {
            this._logoutInProgress = false;
        }
    }

    // ============================================
    // WORKER
    // ============================================
    async fetchUserData(email) {
        if (this.usersCache.has(email)) return this.usersCache.get(email);
        const r = await fetch(`${this.WORKER_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!r.ok) {
            if (r.status === 403) {
                const d = await r.json().catch(() => ({}));
                if (d.revogado) throw new Error('Conta desativada');
            }
            throw new Error('Erro ao buscar dados');
        }
        const data = await r.json();
        this.usersCache.set(email, data);
        return data;
    }

    async emailExists(email) {
        try { return !!(await this.fetchUserData(email)); } catch { return false; }
    }

    async registerActiveSession(userData) {
        try {
            const perfis = Array.isArray(userData.perfis) && userData.perfis.length > 0
                ? userData.perfis
                : (userData.perfil ? [{ perfil: userData.perfil, departamentos: [] }] : []);

            const r = await fetch(`${this.WORKER_URL}/sessions/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userData.email,
                    nome: userData.nome,
                    matricula: userData.matricula,
                    perfil: userData.perfil || perfis[0]?.perfil,
                    perfis,
                    exp: Date.now() + this.SESSION_DURATION
                })
            });
            return r.ok;
        } catch { return false; }
    }

    // ============================================
    // ADMIN (mantém nomes originais)
    // ============================================
    async resetPassword() {
        return { success: false, error: 'ℹ️ A senha é gerada automaticamente a partir da matrícula.' };
    }

    async listUsers() {
        const u = this.getUserData(); if (!u) throw new Error('Não autenticado');
        const r = await fetch(`${this.WORKER_URL}/usuarios`, {
            headers: { 'Content-Type': 'application/json', 'X-User-Email': u.email }
        });
        if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            throw new Error(d.error || 'Erro');
        }
        return r.json();
    }

    async criarUsuario(payload) {
        const u = this.getUserData(); if (!u) throw new Error('Não autenticado');
        const r = await fetch(`${this.WORKER_URL}/usuarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Email': u.email },
            body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Erro ao criar');
        return d;
    }

    async atualizarUsuario(email, payload) {
        const u = this.getUserData(); if (!u) throw new Error('Não autenticado');
        const r = await fetch(`${this.WORKER_URL}/usuarios/${encodeURIComponent(email)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-User-Email': u.email },
            body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Erro ao atualizar');
        return d;
    }

    // Nomes originais (compat admin.js antigo)
    async revokeUser(email) {
        const u = this.getUserData(); if (!u) throw new Error('Não autenticado');
        const r = await fetch(`${this.WORKER_URL}/users/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Email': u.email },
            body: JSON.stringify({ email })
        });
        if (!r.ok) { const d = await r.json().catch(()=>({})); throw new Error(d.error || 'Erro'); }
        return r.json();
    }

    async reactivateUser(email) {
        const u = this.getUserData(); if (!u) throw new Error('Não autenticado');
        const r = await fetch(`${this.WORKER_URL}/users/reactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Email': u.email },
            body: JSON.stringify({ email })
        });
        if (!r.ok) { const d = await r.json().catch(()=>({})); throw new Error(d.error || 'Erro'); }
        return r.json();
    }

    async getActiveSessions() {
        const u = this.getUserData(); if (!u) throw new Error('Não autenticado');
        const r = await fetch(`${this.WORKER_URL}/sessions/active`, {
            headers: { 'Content-Type': 'application/json', 'X-User-Email': u.email }
        });
        if (!r.ok) throw new Error('Erro');
        return r.json();
    }

    // ============================================
    // ERROS / LOADING
    // ============================================
    handleError(error) {
        const map = {
            'auth/user-not-found': '❌ Usuário não encontrado. Verifique seu e-mail.',
            'auth/wrong-password': '❌ Matrícula inválida. Verifique e tente novamente.',
            'auth/too-many-requests': '⚠️ Muitas tentativas. Tente em alguns minutos.',
            'auth/invalid-email': '❌ E-mail inválido.',
            'auth/user-disabled': '❌ Conta desativada.',
            'auth/network-request-failed': '⚠️ Erro de rede.',
        };
        if (error.message === 'Conta desativada') {
            return '❌ Conta desativada. Entre em contato com o administrador.';
        }
        if (error.message && error.message.includes('TÉCNICA')) return `❌ ${error.message}`;
        return map[error.code] || `❌ Erro: ${error.message}`;
    }

    showLoading(show) {
        const btn = document.getElementById('btnLogin');
        if (btn) { btn.disabled = show; btn.textContent = show ? '⏳ Entrando...' : 'Entrar'; }
    }
}

const authService = new AuthService();
window.authService = authService;