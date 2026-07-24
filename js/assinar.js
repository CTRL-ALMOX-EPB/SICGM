// ============================================
// ASSINATURA - JavaScript
// ============================================

let signaturePad = null;
let dadosAssinatura = null;
let resizeTimeout = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo') || 'entregue';
    const nome = params.get('nome') || '';
    const numero = params.get('numero') || '';

    dadosAssinatura = {
        tipo: tipo,
        nome: nome,
        numero: numero
    };

    const tipoLabel = tipo === 'entregue' ? '📤 ENTREGUE POR' : '📥 RECEBIDO POR';
    document.getElementById('tipoAssinatura').textContent = tipoLabel;
    document.getElementById('nomeSignatario').textContent = nome || 'Aguardando...';
    document.getElementById('nomeInput').value = nome || '';
    document.getElementById('infoAdicional').textContent = `S.A. Emergencial #${String(numero).padStart(4, '0')}`;

    // Inicializar Signature Pad
    const canvas = document.getElementById('signatureCanvas');
    const container = document.getElementById('signatureArea');
    
    // Função para redimensionar o canvas
    function resizeCanvas() {
        if (!container || !canvas) return;
        
        const rect = container.getBoundingClientRect();
        const width = rect.width - 4;
        const height = Math.max(rect.height - 4, 150);
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        if (signaturePad) {
            signaturePad.resizeCanvas();
            signaturePad._ctx.scale(dpr, dpr);
        }
    }

    // Criar o Signature Pad
    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: '#1a237e',
        minWidth: 2,
        maxWidth: 4,
        throttle: 16
    });

    // Redimensionar inicial
    setTimeout(resizeCanvas, 100);

    // Redimensionar ao mudar orientação ou redimensionar
    const handleResize = function() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(function() {
            resizeCanvas();
            resizeTimeout = null;
        }, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', function() {
        setTimeout(resizeCanvas, 300);
    });

    // Observer para mudanças de tamanho do container
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(function() {
            handleResize();
        });
        resizeObserver.observe(container);
    }

    // Enter para confirmar
    document.getElementById('nomeInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            confirmarAssinatura();
        }
    });

    // Prevenir scroll ao tocar no canvas
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
    }, { passive: false });

    // Ajustar ao focar no input (teclado sobe)
    document.getElementById('nomeInput').addEventListener('focus', function() {
        setTimeout(function() {
            const container = document.querySelector('.assinatura-container');
            container.scrollTop = container.scrollHeight;
        }, 300);
    });
});

// ============================================
// FUNÇÕES DE ASSINATURA
// ============================================

/**
 * Limpa a assinatura do canvas
 */
function limparAssinatura() {
    if (signaturePad) {
        signaturePad.clear();
    }
    document.getElementById('statusMessage').className = 'assinatura-status';
    document.getElementById('statusMessage').style.display = 'none';
}

/**
 * Confirma a assinatura e salva no sessionStorage
 */
function confirmarAssinatura() {
    const nome = document.getElementById('nomeInput').value.trim();
    
    if (!nome) {
        mostrarStatus('⚠️ Por favor, informe o nome do signatário.', 'error');
        return;
    }

    if (!signaturePad || signaturePad.isEmpty()) {
        mostrarStatus('⚠️ Por favor, assine no campo acima.', 'error');
        return;
    }

    const assinaturaData = signaturePad.toDataURL();

    // Salvar no sessionStorage para o formulário recuperar
    const dados = {
        tipo: dadosAssinatura.tipo,
        nome: nome,
        assinatura: assinaturaData,
        numero: dadosAssinatura.numero,
        concluido: true
    };

    sessionStorage.setItem('assinatura_temp', JSON.stringify(dados));

    mostrarStatus('✅ Assinatura realizada com sucesso! Fechando...', 'success');

    // Tentar fechar a janela após 1 segundo
    setTimeout(function() {
        // Tentar fechar a janela
        window.close();
        
        // Se não fechou (popup bloqueado), redirecionar para o formulário
        if (!window.closed) {
            window.location.href = 'formulario.html?numero=' + dadosAssinatura.numero + '&assinatura=ok';
        }
    }, 1000);
}

/**
 * Cancela a assinatura e fecha a janela
 */
function cancelarAssinatura() {
    if (confirm('❌ Tem certeza que deseja cancelar a assinatura?')) {
        window.close();
    }
}

/**
 * Volta sem assinar e fecha a janela
 */
function voltarSemAssinar() {
    if (confirm('⚠️ Você vai voltar sem assinar. Tem certeza?')) {
        window.close();
    }
}

/**
 * Mostra uma mensagem de status na tela
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da mensagem ('success' ou 'error')
 */
function mostrarStatus(mensagem, tipo) {
    const status = document.getElementById('statusMessage');
    status.textContent = mensagem;
    status.className = 'assinatura-status ' + tipo;
    status.style.display = 'block';
}

// ============================================
// EXPORTA FUNÇÕES PARA USO NO HTML
// ============================================

window.limparAssinatura = limparAssinatura;
window.confirmarAssinatura = confirmarAssinatura;
window.cancelarAssinatura = cancelarAssinatura;
window.voltarSemAssinar = voltarSemAssinar;