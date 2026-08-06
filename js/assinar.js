// ============================================
// ASSINATURA - JavaScript (CORRIGIDO)
// ============================================

let signaturePad = null;
let dadosAssinatura = null;
let resizeTimeout = null;
let assinaturaConfirmada = false;

const API_URL = 'https://fancy-unit-799b.alefe-gomes-72f.workers.dev/api';

// ============================================
// FUNÇÃO PARA VERIFICAR SESSÃO
// ============================================

function verificarSessaoAssinatura() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (!sessao) {
        alert('⚠️ Sua sessão expirou. Faça login novamente.');
        window.location.href = '../login.html';
        return false;
    }
    
    try {
        const dados = JSON.parse(sessao);
        console.log('✅ Sessão válida para:', dados.nome);
        return true;
    } catch (e) {
        window.location.href = '../login.html';
        return false;
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando página de assinatura...');
    
    if (!verificarSessaoAssinatura()) return;
    
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo') || 'entregue';
    const nome = params.get('nome') || '';
    const numero = params.get('numero') || '';

    dadosAssinatura = {
        tipo: tipo,
        nome: nome,
        numero: numero
    };

    console.log('📝 Dados da assinatura:', dadosAssinatura);

    const tipoLabel = tipo === 'entregue' ? '📤 ENTREGUE POR' : '📥 RECEBIDO POR';
    const tipoElement = document.getElementById('tipoAssinatura');
    if (tipoElement) tipoElement.textContent = tipoLabel;
    
    const nomeElement = document.getElementById('nomeSignatario');
    if (nomeElement) nomeElement.textContent = nome || 'Aguardando...';
    
    const nomeInput = document.getElementById('nomeInput');
    if (nomeInput) nomeInput.value = nome || '';
    
    const infoElement = document.getElementById('infoAdicional');
    if (infoElement) infoElement.textContent = `S.A. Emergencial #${String(numero).padStart(4, '0')}`;

    const canvas = document.getElementById('signatureCanvas');
    const container = document.getElementById('signatureArea');
    
    if (!canvas || !container) {
        console.error('❌ Elementos de assinatura não encontrados');
        return;
    }
    
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

    signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: '#1a237e',
        minWidth: 2,
        maxWidth: 4,
        throttle: 16
    });

    setTimeout(resizeCanvas, 100);

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

    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(function() {
            handleResize();
        });
        resizeObserver.observe(container);
    }

    const inputNome = document.getElementById('nomeInput');
    if (inputNome) {
        inputNome.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                confirmarAssinatura();
            }
        });
    }

    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
    }, { passive: false });

    if (inputNome) {
        inputNome.addEventListener('focus', function() {
            setTimeout(function() {
                const container = document.querySelector('.assinatura-container');
                if (container) container.scrollTop = container.scrollHeight;
            }, 300);
        });
    }
    
    console.log('✅ Página de assinatura inicializada');
});

// ============================================
// FUNÇÕES DE ASSINATURA
// ============================================

function limparAssinatura() {
    if (signaturePad) {
        signaturePad.clear();
    }
    const status = document.getElementById('statusMessage');
    if (status) {
        status.className = 'assinatura-status';
        status.style.display = 'none';
    }
}

async function confirmarAssinatura() {
    console.log('🔄 Confirmando assinatura...');
    
    if (assinaturaConfirmada) {
        console.log('⚠️ Assinatura já confirmada, aguarde...');
        return;
    }
    
    const nomeInput = document.getElementById('nomeInput');
    const nome = nomeInput ? nomeInput.value.trim() : '';
    
    if (!nome) {
        mostrarStatus('⚠️ Por favor, informe o nome do signatário.', 'error');
        return;
    }

    if (!signaturePad || signaturePad.isEmpty()) {
        mostrarStatus('⚠️ Por favor, assine no campo acima.', 'error');
        return;
    }

    const btnConfirmar = document.querySelector('.btn-confirmar');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = '⏳ Salvando...';
    }

    const assinaturaData = signaturePad.toDataURL();

    try {
        console.log('📤 Enviando assinatura para:', `${API_URL}/sa/${dadosAssinatura.numero}/assinatura`);
        
        const response = await fetch(`${API_URL}/sa/${dadosAssinatura.numero}/assinatura`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: dadosAssinatura.tipo,
                nome: nome,
                assinatura: assinaturaData
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao salvar assinatura');
        }

        const result = await response.json();
        console.log('✅ Resposta da API:', result);

        assinaturaConfirmada = true;
        
        mostrarStatus('✅ Assinatura salva com sucesso! Fechando...', 'success');

        // Salvar no sessionStorage para notificar a página principal
        sessionStorage.setItem('assinatura_concluida_' + dadosAssinatura.numero, JSON.stringify({
            tipo: dadosAssinatura.tipo,
            numero: dadosAssinatura.numero,
            concluido: true,
            timestamp: Date.now()
        }));

        // Fechar a janela após 1 segundo
        setTimeout(function() {
            fecharJanelaAssinatura();
        }, 1000);

    } catch (error) {
        console.error('❌ Erro ao salvar assinatura:', error);
        mostrarStatus('❌ ' + error.message, 'error');
        
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = '✅ Confirmar';
        }
    }
}

// ============================================
// FECHAR JANELA DE ASSINATURA (CORRIGIDO)
// ============================================

function fecharJanelaAssinatura() {
    console.log('🔒 Fechando janela de assinatura...');
    
    // Tentar fechar a janela
    try {
        window.close();
        console.log('✅ window.close() executado');
    } catch (e) {
        console.warn('⚠️ window.close() falhou:', e);
    }
    
    // Não redirecionar para index.html - apenas tenta fechar
    // Se não fechar, o usuário pode fechar manualmente
    setTimeout(function() {
        if (!window.closed) {
            console.log('ℹ️ Janela ainda aberta. O usuário pode fechá-la manualmente.');
            // Mostrar mensagem para o usuário
            const status = document.getElementById('statusMessage');
            if (status) {
                status.textContent = '✅ Assinatura concluída! Você pode fechar esta janela.';
                status.className = 'assinatura-status success';
                status.style.display = 'block';
            }
        }
    }, 1500);
}

// ============================================
// CANCELAR/VOLTAR (CORRIGIDO)
// ============================================

function cancelarAssinatura() {
    if (confirm('❌ Tem certeza que deseja cancelar a assinatura?')) {
        fecharJanelaAssinatura();
    }
}

function voltarSemAssinar() {
    if (confirm('⚠️ Você vai voltar sem assinar. Tem certeza?')) {
        fecharJanelaAssinatura();
    }
}

function mostrarStatus(mensagem, tipo) {
    const status = document.getElementById('statusMessage');
    if (!status) return;
    
    status.textContent = mensagem;
    status.className = 'assinatura-status ' + tipo;
    status.style.display = 'block';
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================

window.limparAssinatura = limparAssinatura;
window.confirmarAssinatura = confirmarAssinatura;
window.cancelarAssinatura = cancelarAssinatura;
window.voltarSemAssinar = voltarSemAssinar;
window.fecharJanelaAssinatura = fecharJanelaAssinatura;

console.log('✅ assinar.js carregado com sucesso');