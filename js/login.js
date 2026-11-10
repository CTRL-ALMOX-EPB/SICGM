// ============================================
// LOGIN.JS - PÁGINA DE LOGIN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Página de login carregada');

    const form = document.getElementById('loginForm');
    const emailPrefix = document.getElementById('emailPrefix');
    const emailDomain = document.getElementById('emailDomain');
    const emailPreview = document.getElementById('emailPreview');
    const senhaInput = document.getElementById('senha');
    const mensagemErro = document.getElementById('mensagemErro');
    const mensagemSucesso = document.getElementById('mensagemSucesso');

    // ============================================
    // PREVIEW DO E-MAIL
    // ============================================
    function updateEmailPreview() {
        const prefix = emailPrefix.value.trim();
        const domain = emailDomain.value;

        if (prefix) {
            emailPreview.innerHTML = `📧 E-mail: <strong>${prefix}@${domain}</strong>`;
        } else {
            emailPreview.innerHTML = '📧 E-mail: seu.nome@control.eng.br';
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
    // MONTAR SENHA COMPLETA
    // ============================================
    function montarSenhaCompleta(matricula) {
        return `ctrl-${matricula.trim()}`;
    }

    // ============================================
    // SUBMIT
    // ============================================
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        mensagemErro.textContent = '';
        mensagemErro.className = 'mensagem-erro';
        mensagemSucesso.style.display = 'none';

        const emailCompleto = getEmailCompleto();
        const matriculaDigitada = senhaInput.value.trim();

        if (!emailCompleto) {
            mensagemErro.textContent = '⚠️ Digite a primeira parte do seu e-mail.';
            mensagemErro.className = 'mensagem-erro';
            emailPrefix.focus();
            return;
        }

        if (!matriculaDigitada) {
            mensagemErro.textContent = '⚠️ Digite sua matrícula.';
            mensagemErro.className = 'mensagem-erro';
            senhaInput.focus();
            return;
        }

        const senhaCompleta = montarSenhaCompleta(matriculaDigitada);
        console.log(`🔐 Tentando login: ${matriculaDigitada}`);

        if (typeof authService === 'undefined' || !authService) {
            mensagemErro.textContent = '⚠️ Erro ao carregar o serviço de autenticação.';
            mensagemErro.className = 'mensagem-erro';
            return;
        }

        const result = await authService.login(emailCompleto, senhaCompleta);

        if (result.success) {
            mensagemSucesso.textContent = '✅ Login realizado! Redirecionando...';
            mensagemSucesso.style.display = 'block';

            console.log(`✅ Usuário: ${result.user.nome} | Perfil: ${result.user.perfil}`);

            // Salva dados no localStorage para a home unificada ler
            localStorage.setItem('nomeUsuario', result.user.nome || 'Usuário');
            localStorage.setItem('matriculaUsuario', result.user.matricula || matriculaDigitada);
            localStorage.setItem('perfilUsuario', result.user.perfil || 'GESTAO');
            localStorage.setItem('emailUsuario', emailCompleto);

            // 🔥 REDIRECIONA TODOS PARA A HOME UNIFICADA
            setTimeout(() => {
                window.location.href = 'home-unificada.html';
            }, 600);
        } else {
            mensagemErro.textContent = result.error || '❌ Matrícula inválida.';
            mensagemErro.className = 'mensagem-erro';
            senhaInput.value = '';
            senhaInput.focus();
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
    `;

    const passwordWrapper = senhaInput.parentElement;
    passwordWrapper.style.position = 'relative';
    passwordWrapper.appendChild(togglePassword);

    togglePassword.addEventListener('click', function() {
        senhaInput.type = senhaInput.type === 'password' ? 'text' : 'password';
        this.textContent = senhaInput.type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    console.log('✅ Login pronto!');
});