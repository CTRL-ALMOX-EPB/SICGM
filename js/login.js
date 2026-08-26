// ============================================
// LOGIN.JS - PÁGINA DE LOGIN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de login seguro iniciado');

    // Elementos do DOM
    const form = document.getElementById('loginForm');
    const emailPrefix = document.getElementById('emailPrefix');
    const emailDomain = document.getElementById('emailDomain');
    const emailPreview = document.getElementById('emailPreview');
    const senhaInput = document.getElementById('senha');
    const mensagemErro = document.getElementById('mensagemErro');
    const mensagemSucesso = document.getElementById('mensagemSucesso');
    const btnForgotPassword = document.getElementById('btnForgotPassword');

    // ============================================
    // ATUALIZAR PREVIEW DO E-MAIL
    // ============================================
    function updateEmailPreview() {
        const prefix = emailPrefix.value.trim();
        const domain = emailDomain.value;
        
        if (prefix) {
            const emailCompleto = `${prefix}@${domain}`;
            emailPreview.innerHTML = `📧 E-mail: <strong>${emailCompleto}</strong>`;
            emailPreview.className = 'email-preview';
        } else {
            emailPreview.innerHTML = '📧 E-mail: seu.nome@control.eng.br';
            emailPreview.className = 'email-preview';
        }
    }

    emailPrefix.addEventListener('input', updateEmailPreview);
    emailDomain.addEventListener('change', updateEmailPreview);
    updateEmailPreview();

    // ============================================
    // OBTER E-MAIL COMPLETO
    // ============================================
    function getEmailCompleto() {
        const prefix = emailPrefix.value.trim();
        const domain = emailDomain.value;
        if (!prefix) return null;
        return `${prefix}@${domain}`;
    }

    // ============================================
    // SUBMIT DO FORMULÁRIO
    // ============================================
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        mensagemErro.textContent = '';
        mensagemErro.className = 'mensagem-erro';
        mensagemSucesso.style.display = 'none';

        const emailCompleto = getEmailCompleto();
        const senha = senhaInput.value.trim();

        if (!emailCompleto) {
            mensagemErro.textContent = '⚠️ Digite a primeira parte do seu e-mail.';
            mensagemErro.className = 'mensagem-erro';
            emailPrefix.focus();
            return;
        }

        if (!senha) {
            mensagemErro.textContent = '⚠️ Digite sua senha.';
            mensagemErro.className = 'mensagem-erro';
            senhaInput.focus();
            return;
        }

        // Tentar login
        const result = await authService.login(emailCompleto, senha);
        
        if (result.success) {
            mensagemSucesso.textContent = '✅ Login realizado com sucesso! Redirecionando...';
            mensagemSucesso.style.display = 'block';
            
            console.log('✅ Usuário logado:', result.user.nome);
            console.log('📝 Perfil:', result.user.perfil);
            
            // 🔥 FORÇAR O REDIRECIONAMENTO COM window.location.replace
            setTimeout(() => {
                redirectUser(result.user.perfil);
            }, 800);
            
        } else {
            mensagemErro.textContent = result.error || '❌ Falha no login. Tente novamente.';
            mensagemErro.className = 'mensagem-erro';
            senhaInput.value = '';
            senhaInput.focus();
        }
    });

    // ============================================
    // RECUPERAR SENHA
    // ============================================
    btnForgotPassword.addEventListener('click', async function() {
        const emailCompleto = getEmailCompleto();
        
        if (!emailCompleto) {
            mensagemErro.textContent = '⚠️ Digite a primeira parte do seu e-mail antes de recuperar a senha.';
            mensagemErro.className = 'mensagem-erro';
            emailPrefix.focus();
            return;
        }

        const result = await authService.resetPassword(emailCompleto);
        
        if (result.success) {
            mensagemSucesso.textContent = result.message;
            mensagemSucesso.style.display = 'block';
            mensagemErro.textContent = '';
            
            setTimeout(() => {
                mensagemSucesso.style.display = 'none';
            }, 10000);
        } else {
            mensagemErro.textContent = result.error || '❌ Erro ao enviar e-mail de recuperação.';
            mensagemErro.className = 'mensagem-erro';
        }
    });

    // ============================================
    // TECLA ENTER
    // ============================================
    emailPrefix.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            senhaInput.focus();
        }
    });

    senhaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });

    // ============================================
    // MOSTRAR/OCULTAR SENHA
    // ============================================
    const togglePassword = document.createElement('button');
    togglePassword.type = 'button';
    togglePassword.textContent = '👁️';
    togglePassword.style.cssText = `
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 18px;
        padding: 5px;
        opacity: 0.6;
        transition: opacity 0.3s;
    `;
    
    togglePassword.addEventListener('mouseenter', function() {
        this.style.opacity = '1';
    });
    togglePassword.addEventListener('mouseleave', function() {
        this.style.opacity = '0.6';
    });
    
    const passwordWrapper = senhaInput.parentElement;
    passwordWrapper.style.position = 'relative';
    passwordWrapper.appendChild(togglePassword);
    
    togglePassword.addEventListener('click', function() {
        const type = senhaInput.type === 'password' ? 'text' : 'password';
        senhaInput.type = type;
        this.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    // ============================================
    // VERIFICAR SESSÃO EXISTENTE
    // ============================================
    if (authService.isLoggedIn()) {
        const user = authService.getUserData();
        console.log('👤 Usuário já logado:', user.nome);
        
        // 🔥 JÁ ESTÁ LOGADO - REDIRECIONAR IMEDIATAMENTE
        redirectUser(user.perfil);
    }

    console.log('✅ Login carregado e pronto!');
});

// ============================================
// REDIRECIONAR POR PERFIL (VERSÃO MELHORADA)
// ============================================
function redirectUser(perfil) {
    const pages = {
        'GESTAO': 'home-gestao.html',
        'OPERACIONAL': 'home-operacional.html',
        'VISUALIZACAO': 'home-visualizacao.html'
    };
    
    const page = pages[perfil] || 'home-operacional.html';
    console.log(`🔀 Redirecionando para: ${page}`);
    
    // 🔥 USAR window.location.replace para evitar loop no histórico
    window.location.replace(page);
}