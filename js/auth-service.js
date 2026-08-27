// ============================================
// AUTH-SERVICE.JS - SERVIÇO DE AUTENTICAÇÃO
// ============================================

class AuthService {
    constructor() {
        // 🔥 Verificar se o Firebase está disponível
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase não encontrado! Verifique se o SDK foi carregado.');
            return;
        }
        
        if (firebase.apps.length === 0) {
            console.error('❌ Firebase não foi inicializado! Verifique o firebase-config.js');
            return;
        }
        
        this.auth = firebase.auth();
        this.currentUser = null;
        this.usersCache = new Map();
        
        // 🔥 SUA API URL
        this.WORKER_URL = 'https://polished-salad-1dbe.alefe-gomes-72f.workers.dev/api';
        
        console.log('✅ AuthService inicializado com sucesso!');
    }

    // ============================================
    // LOGIN
    // ============================================
    async login(email, senha) {
        try {
            this.showLoading(true);
            
            console.log(`🔐 Tentando login para: ${email}`);

            // 1. Autenticar no Firebase
            const userCredential = await this.auth.signInWithEmailAndPassword(email, senha);
            this.currentUser = userCredential.user;
            console.log('✅ Firebase autenticou');

            // 2. Buscar dados do usuário
            const userData = await this.fetchUserData(email);
            if (!userData) {
                throw new Error('Dados do usuário não encontrados');
            }

            // 3. Verificar se está ativo
            if (userData.ativo === false) {
                await this.auth.signOut();
                throw new Error('Conta desativada. Entre em contato com o administrador.');
            }

            // 4. Salvar sessão (COM VERIFICAÇÃO)
            const sessionSaved = this.createSession(userData);
            if (!sessionSaved) {
                throw new Error('Erro ao salvar sessão');
            }

            // 5. Registrar sessão ativa (opcional)
            await this.registerActiveSession(userData);

            console.log('✅ Login completo!');
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
    // CRIAR SESSÃO (COM RETORNO DE SUCESSO)
    // ============================================
    createSession(userData) {
        try {
            const payload = {
                email: userData.email,
                nome: userData.nome,
                matricula: userData.matricula,
                perfil: userData.perfil,
                exp: Date.now() + 1800000 // 30 minutos
            };
            
            const token = btoa(JSON.stringify(payload));
            sessionStorage.setItem('auth_token', token);
            sessionStorage.setItem('session_expiry', Date.now() + 1800000);
            
            // 🔥 VERIFICAR SE FOI SALVO
            const savedToken = sessionStorage.getItem('auth_token');
            if (savedToken === token) {
                console.log('✅ Sessão salva com sucesso!');
                return true;
            } else {
                console.error('❌ Falha ao salvar sessão');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao criar sessão:', error);
            return false;
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
    // VERIFICAR SE E-MAIL EXISTE NO SISTEMA
    // ============================================
    async emailExists(email) {
        try {
            // Buscar dados do usuário
            const userData = await this.fetchUserData(email);
            return userData !== null && userData !== undefined;
        } catch (error) {
            console.error('❌ Erro ao verificar e-mail:', error);
            return false;
        }
    }

    // ============================================
    // REGISTRAR SESSÃO ATIVA (OPCIONAL)
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
    // VERIFICAR SESSÃO
    // ============================================
    isLoggedIn() {
        try {
            const token = sessionStorage.getItem('auth_token');
            if (!token) {
                console.log('🔒 Nenhum token encontrado');
                return false;
            }

            const payload = JSON.parse(atob(token));
            
            if (!payload || !payload.email || !payload.exp) {
                console.log('🔒 Token inválido');
                this.clearSession();
                return false;
            }
            
            if (payload.exp < Date.now()) {
                console.log('⏰ Sessão expirada');
                this.clearSession();
                return false;
            }

            console.log('✅ Sessão válida');
            return true;
        } catch (e) {
            console.error('❌ Erro ao verificar sessão:', e);
            this.clearSession();
            return false;
        }
    }

    // ============================================
    // PEGAR DADOS DO USUÁRIO
    // ============================================
    getUserData() {
        try {
            if (!this.isLoggedIn()) {
                return null;
            }

            const token = sessionStorage.getItem('auth_token');
            if (!token) return null;

            const payload = JSON.parse(atob(token));
            return payload;
        } catch (e) {
            return null;
        }
    }

    // ============================================
    // LIMPAR SESSÃO LOCAL
    // ============================================
    clearSession() {
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('session_expiry');
        console.log('🧹 Sessão limpa localmente');
    }

    // ============================================
    // 🔥 LOGOUT - COMPLETO (IGUAL AO ADMIN)
    // ============================================
    async logout() {
        try {
            console.log('👋 Iniciando logout...');
            
            // 1. 🔥 PEGAR DADOS DO USUÁRIO ANTES DE LIMPAR
            const userData = this.getUserData();
            
            // 2. 🔥 REMOVER DO WORKER (KV) - ESSE É O PASSO CRÍTICO!
            if (userData && userData.email) {
                try {
                    const response = await fetch(`${this.WORKER_URL}/sessions/remove`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: userData.email })
                    });
                    
                    if (response.ok) {
                        console.log('✅ Sessão removida do Worker (KV)');
                    } else {
                        console.warn('⚠️ Resposta do Worker:', response.status);
                    }
                } catch (e) {
                    console.warn('⚠️ Erro ao remover sessão do Worker:', e);
                }
            } else {
                console.log('ℹ️ Nenhum usuário logado para remover do Worker');
            }
            
            // 3. 🔥 LIMPAR SESSIONSTORAGE
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('session_expiry');
            console.log('🧹 sessionStorage limpo');
            
            // 4. 🔥 RESETAR VARIÁVEIS GLOBAIS
            if (typeof sessionVerified !== 'undefined') {
                sessionVerified = false;
            }
            
            // 5. 🔥 DESLOGAR DO FIREBASE
            try {
                await this.auth.signOut();
                console.log('✅ Firebase signOut realizado');
            } catch (e) {
                console.warn('⚠️ Erro no signOut do Firebase:', e);
            }
            
            console.log('✅ Logout concluído!');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao sair:', error);
            // 🔥 EM CASO DE ERRO, LIMPAR MESMO ASSIM
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('session_expiry');
            if (typeof sessionVerified !== 'undefined') {
                sessionVerified = false;
            }
            return false;
        }
    }

    // ============================================
    // REDEFINIR SENHA (DESABILITADO)
    // ============================================
    async resetPassword(email) {
        return { 
            success: false, 
            error: 'ℹ️ A senha é gerada automaticamente a partir da matrícula. Entre em contato com o administrador para redefinir.' 
        };
    }

    // ============================================
    // LISTAR USUÁRIOS (ADMIN)
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
    // TRATAMENTO DE ERROS
    // ============================================
    handleError(error) {
        const errorMap = {
            'auth/user-not-found': '❌ Usuário não encontrado. Verifique seu e-mail.',
            'auth/wrong-password': '❌ Matrícula inválida. Verifique e tente novamente.',
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