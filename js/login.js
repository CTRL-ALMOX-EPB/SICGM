// ============================================
// LOGIN.JS - PÁGINA DE LOGIN
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Página de login carregada');

    // ============================================
    // VERIFICAR SE JÁ ESTÁ LOGADO
    // ============================================
    if (typeof authService !== 'undefined' && authService && authService.isLoggedIn()) {
        const user = authService.getUserData();
        if (user) {
            console.log(`👤 Usuário já logado: ${user.nome}`);
            redirecionarPorPerfil(user.perfil);
            return;
        }
    }

    // ============================================
    // ELEMENTOS DO DOM
    // ============================================
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
    // 🔥 FUNÇÃO: MONTAR SENHA COMPLETA
    // ============================================
    function montarSenhaCompleta(matricula) {
        // Remove espaços extras
        const matriculaLimpa = matricula.trim();
        // 🔥 Adiciona "ctrl-" na frente
        return `ctrl-${matriculaLimpa}`;
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

        // 🔥 MONTAR SENHA COMPLETA
        const senhaCompleta = montarSenhaCompleta(matriculaDigitada);
        console.log(`🔐 Tentando login com matrícula: ${matriculaDigitada}`);
        console.log(`🔑 Senha gerada: ${senhaCompleta}`);

        // 🔥 VERIFICAR SE authService ESTÁ DISPONÍVEL
        if (typeof authService === 'undefined' || !authService) {
            mensagemErro.textContent = '⚠️ Erro ao carregar o serviço de autenticação. Recarregue a página.';
            mensagemErro.className = 'mensagem-erro';
            return;
        }

        // 🔥 TENTAR LOGIN COM A SENHA MONTADA
        const result = await authService.login(emailCompleto, senhaCompleta);
        
        if (result.success) {
            mensagemSucesso.textContent = '✅ Login realizado! Redirecionando...';
            mensagemSucesso.style.display = 'block';
            
            console.log(`✅ Usuário logado: ${result.user.nome}`);
            console.log(`📝 Perfil: ${result.user.perfil}`);
            
            // 🔥 VERIFICAR SE A SESSÃO FOI SALVA
            setTimeout(() => {
                if (authService.isLoggedIn()) {
                    redirecionarPorPerfil(result.user.perfil);
                } else {
                    mensagemErro.textContent = '❌ Erro ao salvar sessão. Tente novamente.';
                    mensagemErro.className = 'mensagem-erro';
                    mensagemSucesso.style.display = 'none';
                }
            }, 1000);
            
        } else {
            mensagemErro.textContent = result.error || '❌ Matrícula inválida. Verifique e tente novamente.';
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
        transition: opacity 0.3s;
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

// ============================================
// REDIRECIONAR POR PERFIL
// ============================================
function redirecionarPorPerfil(perfil) {
    const pages = {
        'GESTAO': 'home-gestao.html',
        'OPERACIONAL': 'home-operacional.html',
        'VISUALIZACAO': 'home-visualizacao.html'
    };
    
    const page = pages[perfil] || 'home-operacional.html';
    console.log(`🔀 Redirecionando para: ${page}`);
    window.location.replace(page);
}