// ============================================
// LOGIN.JS - PÁGINA DE LOGIN (v2)
// Mantém formato prefixo@dominio + ctrl-MATRICULA
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

    function getEmailCompleto() {
        const prefix = emailPrefix.value.trim();
        const domain = emailDomain.value;
        if (!prefix) return null;
        return `${prefix}@${domain}`;
    }

    function montarSenhaCompleta(matricula) {
        return `ctrl-${matricula.trim()}`;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        mensagemErro.textContent = '';
        mensagemErro.className = 'mensagem-erro';
        mensagemSucesso.style.display = 'none';

        const emailCompleto = getEmailCompleto();
        const matriculaDigitada = senhaInput.value.trim();

        if (!emailCompleto) {
            mensagemErro.textContent = '⚠️ Digite a primeira parte do seu e-mail.';
            emailPrefix.focus();
            return;
        }
        if (!matriculaDigitada) {
            mensagemErro.textContent = '⚠️ Digite sua matrícula.';
            senhaInput.focus();
            return;
        }

        const senhaCompleta = montarSenhaCompleta(matriculaDigitada);
        console.log(`🔐 Tentando login: ${matriculaDigitada}`);

        if (typeof authService === 'undefined' || !authService) {
            mensagemErro.textContent = '⚠️ Erro ao carregar auth-service.';
            return;
        }

        const result = await authService.login(emailCompleto, senhaCompleta);

        if (result.success) {
            mensagemSucesso.textContent = '✅ Login realizado! Redirecionando...';
            mensagemSucesso.style.display = 'block';

            const u = result.user;
            const perfis = u.perfis || (u.perfil ? [{ perfil: u.perfil, departamentos: [] }] : []);

            // Salva para a home unificada
            localStorage.setItem('nomeUsuario', u.nome || 'Usuário');
            localStorage.setItem('matriculaUsuario', u.matricula || matriculaDigitada);
            localStorage.setItem('perfilUsuario', u.perfil || perfis[0]?.perfil || 'VISUALIZACAO');
            localStorage.setItem('perfisUsuario', JSON.stringify(perfis));
            localStorage.setItem('departamentosUsuario', JSON.stringify(u.departamentos || []));
            localStorage.setItem('emailUsuario', emailCompleto);

            setTimeout(() => { window.location.href = 'home-unificada.html'; }, 600);
        } else {
            mensagemErro.textContent = result.error || '❌ Matrícula inválida.';
            senhaInput.value = '';
            senhaInput.focus();
        }
    });

    // Mostrar/ocultar senha
    const togglePassword = document.createElement('button');
    togglePassword.type = 'button';
    togglePassword.textContent = '👁️';
    togglePassword.style.cssText = `
        position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
        background: none; border: none; cursor: pointer; font-size: 18px; padding: 5px; opacity: 0.6;
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