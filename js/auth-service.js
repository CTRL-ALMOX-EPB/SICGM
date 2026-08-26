// ============================================
// AUTH-SERVICE.JS - SERVIÇO DE AUTENTICAÇÃO
// ============================================

class AuthService {
    constructor() {
        this.auth = firebase.auth();
        this.currentUser = null;
        this.usersCache = new Map();
        
        // 🔥 SUA API URL
        this.WORKER_URL = 'https://polished-salad-1dbe.alefe-gomes-72f.workers.dev/api';
    }

    // ============================================
    // LOGIN
    // ============================================
    async login(email, senha) {
        try {
            this.showLoading(true);
            
            console.log(`🔐 Tentando login para: ${email}`);

            const userCredential = await this.auth.signInWithEmailAndPassword(email, senha);
            this.currentUser = userCredential.user;

            console.log('✅ Firebase autenticou');

            const userData = await this.fetchUserData(email);

            if (!userData) {
                throw new Error('Dados do usuário não encontrados');
            }

            if (userData.ativo === false) {
                await this.auth.signOut();
                throw new Error('Conta desativada. Entre em contato com o administrador.');
            }

            this.createSession(userData);
            await this.registerActiveSession(userData);

            console.log('✅ Sessão criada com sucesso');
            return { success: true, user: userData };

        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { 
                success: false, 
                error: this.handleError(error) 
            };
        } finally {
            this.showLoading(false);
        }
    }

    // ============================================
    // BUSCAR DADOS DO USUÁRIO
    // ============================================
    async fetchUserData(email) {
        try {
            if (this.usersCache.has(email)) {
                console.log('📦 Usando cache');
                return this.usersCache.get(email);
            }

            const response = await fetch(`${this.WORKER_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                if (response.status === 403) {
                    const data = await response.json();
                    if (data.revogado) {
                        throw new Error('Conta desativada');
                    }
                }
                throw new Error('Erro ao buscar dados');
            }

            const userData = await response.json();
            this.usersCache.set(email, userData);
            
            return userData;

        } catch (error) {
            console.error('❌ Erro ao buscar dados:', error);
            throw error;
        }
    }

    // ============================================
    // REGISTRAR SESSÃO ATIVA
    // ============================================
    async registerActiveSession(userData) {
        try {
            const response = await fetch(`${this.WORKER_URL}/sessions/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userData.email,
                    nome: userData.nome,
                    perfil: userData.perfil,
                    exp: Date.now() + 1800000
                })
            });

            return response.ok;

        } catch (error) {
            console.warn('⚠️ Não foi possível registrar sessão:', error);
            return false;
        }
    }

    // ============================================
    // CRIAR SESSÃO (30 MINUTOS)
    // ============================================
    createSession(userData) {
        const payload = {
            email: userData.email,
            nome: userData.nome,
            matricula: userData.matricula,
            perfil: userData.perfil,
            exp: Date.now() + 1800000
        };
        
        const token = btoa(JSON.stringify(payload));
        sessionStorage.setItem('auth_token', token);
        sessionStorage.setItem('session_expiry', Date.now() + 1800000);
    }

    // ============================================
    // LISTAR USUÁRIOS (ADMIN)
    // ⭐ VALIDAÇÃO VIA PERFIL ⭐
    // ============================================
    async listUsers() {
        try {
            const user = this.getUserData();
            
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            const response = await fetch(`${this.WORKER_URL}/users/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': user.email
                }
            });

            if (response.status === 403) {
                throw new Error('Acesso negado. Apenas usuários GESTAO podem listar usuários.');
            }

            if (!response.ok) {
                throw new Error('Erro ao listar usuários');
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Erro ao listar usuários:', error);
            throw error;
        }
    }

    // ============================================
    // REVOGAR USUÁRIO (ADMIN)
    // ⭐ VALIDAÇÃO VIA PERFIL ⭐
    // ============================================
    async revokeUser(email) {
        try {
            const user = this.getUserData();
            
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            const response = await fetch(`${this.WORKER_URL}/users/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': user.email
                },
                body: JSON.stringify({ email })
            });

            if (response.status === 403) {
                throw new Error('Acesso negado. Apenas usuários GESTAO podem revogar usuários.');
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao revogar usuário');
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Erro ao revogar:', error);
            throw error;
        }
    }

    // ============================================
    // REATIVAR USUÁRIO (ADMIN)
    // ⭐ VALIDAÇÃO VIA PERFIL ⭐
    // ============================================
    async reactivateUser(email) {
        try {
            const user = this.getUserData();
            
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            const response = await fetch(`${this.WORKER_URL}/users/reactivate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': user.email
                },
                body: JSON.stringify({ email })
            });

            if (response.status === 403) {
                throw new Error('Acesso negado. Apenas usuários GESTAO podem reativar usuários.');
            }

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao reativar usuário');
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Erro ao reativar:', error);
            throw error;
        }
    }

    // ============================================
    // VER SESSÕES ATIVAS (ADMIN)
    // ⭐ VALIDAÇÃO VIA PERFIL ⭐
    // ============================================
    async getActiveSessions() {
        try {
            const user = this.getUserData();
            
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            const response = await fetch(`${this.WORKER_URL}/sessions/active`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': user.email
                }
            });

            if (response.status === 403) {
                throw new Error('Acesso negado. Apenas usuários GESTAO podem ver sessões ativas.');
            }

            if (!response.ok) {
                throw new Error('Erro ao buscar sessões ativas');
            }

            return await response.json();

        } catch (error) {
            console.error('❌ Erro ao buscar sessões:', error);
            throw error;
        }
    }

    // ============================================
    // RECUPERAR SENHA
    // ============================================
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { 
                success: true, 
                message: '📧 E-mail de recuperação enviado! Verifique sua caixa de entrada.' 
            };
        } catch (error) {
            return { 
                success: false, 
                error: this.handleError(error) 
            };
        }
    }

    // ============================================
    // VERIFICAR SESSÃO
    // ============================================
    isLoggedIn() {
        try {
            const token = sessionStorage.getItem('auth_token');
            if (!token) return false;

            const payload = JSON.parse(atob(token));
            
            if (payload.exp < Date.now()) {
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('session_expiry');
                return false;
            }

            return true;
        } catch (e) {
            return false;
        }
    }

    // ============================================
    // PEGAR DADOS DO USUÁRIO LOGADO
    // ============================================
    getUserData() {
        try {
            const token = sessionStorage.getItem('auth_token');
            if (!token) return null;

            const payload = JSON.parse(atob(token));
            
            if (payload.exp < Date.now()) {
                sessionStorage.removeItem('auth_token');
                sessionStorage.removeItem('session_expiry');
                return null;
            }

            return payload;
        } catch (e) {
            return null;
        }
    }

    // ============================================
    // SAIR
    // ============================================
    async logout() {
        try {
            const userData = this.getUserData();
            if (userData) {
                await fetch(`${this.WORKER_URL}/sessions/remove`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: userData.email })
                });
            }
            
            await this.auth.signOut();
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('session_expiry');
            
            console.log('👋 Usuário desconectado');
            return true;
        } catch (error) {
            console.error('❌ Erro ao sair:', error);
            return false;
        }
    }

    // ============================================
    // TRATAMENTO DE ERROS
    // ============================================
    handleError(error) {
        const errorMap = {
            'auth/user-not-found': '❌ Usuário não encontrado. Verifique seu e-mail.',
            'auth/wrong-password': '❌ Senha incorreta. Tente novamente.',
            'auth/too-many-requests': '⚠️ Muitas tentativas. Tente em alguns minutos.',
            'auth/invalid-email': '❌ E-mail inválido.',
            'auth/user-disabled': '❌ Conta desativada. Entre em contato com o administrador.',
            'auth/network-request-failed': '⚠️ Erro de rede. Verifique sua conexão.',
            'auth/email-already-in-use': '❌ E-mail já em uso.',
            'auth/weak-password': '❌ Senha deve ter pelo menos 6 caracteres.'
        };

        if (error.message === 'Conta desativada') {
            return '❌ Conta desativada. Entre em contato com o administrador.';
        }

        return errorMap[error.code] || `❌ Erro: ${error.message}`;
    }

    // ============================================
    // LOADING
    // ============================================
    showLoading(show) {
        const btnLogin = document.getElementById('btnLogin');
        if (btnLogin) {
            btnLogin.disabled = show;
            btnLogin.textContent = show ? '⏳ Entrando...' : 'Entrar';
        }
    }
}

// Criar instância global
const authService = new AuthService();