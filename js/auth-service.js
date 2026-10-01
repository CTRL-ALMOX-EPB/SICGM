// ============================================
// AUTH-SERVICE.JS - SESSÃO DURA VIA KV
// ============================================
// - sessionStorage como cache local (segurança)
// - KV do Worker como fonte da verdade da sessão
// - Firebase (LOCAL) como "quem sou eu" após fechar aba
// - Token só morre em logout explícito
// ============================================

class AuthService {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        this.usersCache = new Map();
        this.ready = false;

        this.WORKER_URL = 'https://polished-salad-1dbe.alefe-gomes-72f.workers.dev/api';

        this.SESSION_DURATION = 30 * 60 * 1000; // 30 min
        this.RENEW_THRESHOLD = 5 * 60 * 1000;   // renova 5 min antes

        this.KEY_TOKEN = 'auth_token';
        this.KEY_EXPIRY = 'session_expiry';

        this._logoutInProgress = false;
        this._initPromise = this._init();
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    async _init() {
        const start = Date.now();
        while (!window.__FIREBASE_INITIALIZED__) {
            if (Date.now() - start > 5000) {
                console.error('❌ Timeout esperando Firebase.');
                return false;
            }
            await new Promise(r => setTimeout(r, 50));
        }

        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.error('❌ Firebase indisponível.');
            return false;
        }

        this.auth = firebase.auth();
        this.ready = true;

        this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            if (!user && !this._logoutInProgress) {
                console.warn('⚠️ Firebase: usuário nulo (boot inicial ou deslogado).');
            } else if (user) {
                console.log('🔥 Firebase ativo:', user.email);
            }
        });

        console.log('✅ AuthService pronto.');
        return true;
    }

    async waitForInit() {
        await this._initPromise;
        return this.ready;
    }

    // ============================================
    // sessionStorage (cache local)
    // ============================================
    _saveLocal(payload) {
        try {
            sessionStorage.setItem(this.KEY_TOKEN, btoa(JSON.stringify(payload)));
            sessionStorage.setItem(this.KEY_EXPIRY, String(payload.exp));
            return true;
        } catch (e) {
            console.error('❌ Erro ao salvar sessão local:', e);
            return false;
        }
    }

    _readLocal() {
        try {
            const t = sessionStorage.getItem(this.KEY_TOKEN);
            if (!t) return null;
            return JSON.parse(atob(t));
        } catch {
            return null;
        }
    }

    _clearLocal() {
        sessionStorage.removeItem(this.KEY_TOKEN);
        sessionStorage.removeItem(this.KEY_EXPIRY);
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

            // 1) registra no KV
            await this.registerActiveSession(userData);

            // 2) salva local
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
        const payload = {
            email: userData.email,
            nome: userData.nome,
            matricula: userData.matricula,
            perfil: userData.perfil,
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
        if (!this.auth || !this.auth.currentUser) {
            console.log('ℹ️ Sem user do Firebase — impossível restaurar sem relogin.');
            return false;
        }

        const email = this.auth.currentUser.email;
        if (!email) return false;

        try {
            console.log(`🔄 Consultando KV para ${email}...`);
            const r = await fetch(`${this.WORKER_URL}/sessions/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!r.ok) {
                console.warn('⚠️ /sessions/check HTTP', r.status);
                return false;
            }

            const data = await r.json();

            if (!data.active || !data.sessao) {
                console.warn('⚠️ KV não reconhece sessão ativa — encerrando Firebase.');
                try { await this.auth.signOut(); } catch {}
                return false;
            }

            const s = data.sessao;

            const payload = {
                email: s.email || email,
                nome: s.nome,
                matricula: s.matricula,
                perfil: s.perfil,
                exp: Date.now() + this.SESSION_DURATION
            };
            this._saveLocal(payload);

            await this.registerActiveSession(payload);

            console.log('✅ Sessão restaurada do KV.');
            return true;
        } catch (e) {
            console.warn('⚠️ Erro ao restaurar do KV:', e);
            return false;
        }
    }

    // ============================================
    // isLoggedIn (tolerante)
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
            console.error('❌ isLoggedIn:', e);
            return false;
        }
    }

    getUserData() {
        if (!this.isLoggedIn()) return null;
        return this._readLocal();
    }

    clearSession() {
        this._clearLocal();
    }

    // ============================================
    // LOGOUT (único ponto que destrói de verdade)
    // ============================================
    async logout() {
        this._logoutInProgress = true;
        try {
            const p = this._readLocal();

            if (p && p.email) {
                try {
                    await fetch(`${this.WORKER_URL}/sessions/remove`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: p.email })
                    });
                    console.log('✅ Sessão removida do KV.');
                } catch (e) {
                    console.warn('⚠️ Erro ao remover do KV:', e);
                }
            }

            this._clearLocal();

            try { await this.auth.signOut(); } catch {}

            return true;
        } catch (error) {
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
            const r = await fetch(`${this.WORKER_URL}/sessions/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userData.email,
                    nome: userData.nome,
                    matricula: userData.matricula,
                    perfil: userData.perfil,
                    exp: Date.now() + this.SESSION_DURATION
                })
            });
            return r.ok;
        } catch { return false; }
    }

    // ============================================
    // ADMIN
    // ============================================
    async resetPassword() {
        return { success: false, error: 'ℹ️ A senha é gerada automaticamente a partir da matrícula.' };
    }
    async listUsers() {
        const u = this.getUserData(); if (!u) throw new Error('Não autenticado');
        const r = await fetch(`${this.WORKER_URL}/users/list`, {
            headers: { 'Content-Type': 'application/json', 'X-User-Email': u.email }
        });
        if (!r.ok) throw new Error('Erro');
        return r.json();
    }
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
        return map[error.code] || `❌ Erro: ${error.message}`;
    }

    showLoading(show) {
        const btn = document.getElementById('btnLogin');
        if (btn) {
            btn.disabled = show;
            btn.textContent = show ? '⏳ Entrando...' : 'Entrar';
        }
    }
}

const authService = new AuthService();
window.authService = authService;