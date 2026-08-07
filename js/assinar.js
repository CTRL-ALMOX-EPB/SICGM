// ============================================
// ASSINATURA - JavaScript (COM R2 CORRIGIDO)
// ============================================

let signaturePad = null;
let dadosAssinatura = null;
let resizeTimeout = null;
let assinaturaConfirmada = false;

const API_URL = 'https://fancy-unit-799b.alefe-gomes-72f.workers.dev/api';
const R2_BUCKET_URL = 'https://pub-8c9c377ceaa648c2ad535ea1abba45f8.r2.dev';
const R2_UPLOAD_URL = 'https://fancy-unit-799b.alefe-gomes-72f.workers.dev/upload';

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
// FUNÇÃO PARA UPLOAD PARA O R2 (CORRIGIDA)
// ============================================

async function uploadParaR2(imagemDataURL, pasta, nomeArquivo) {
    try {
        console.log('📤 Iniciando upload para R2 (assinatura)...');
        console.log('📤 Pasta:', pasta);
        console.log('📤 Arquivo:', nomeArquivo);
        
        const response = await fetch(imagemDataURL);
        const blob = await response.blob();
        
        console.log('📤 Tamanho do blob:', blob.size, 'bytes');
        
        if (!nomeArquivo) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            nomeArquivo = `${timestamp}_${random}.png`;
        }
        
        const path = `${pasta}/${nomeArquivo}`;
        const url = `${R2_UPLOAD_URL}/${path}`;
        
        console.log(`📤 Upload para: ${url}`);
        
        const uploadResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'image/png'
            },
            body: blob
        });
        
        console.log('📤 Status do upload:', uploadResponse.status);
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Erro ao fazer upload: ${uploadResponse.status} - ${errorText}`);
        }
        
        const publicUrl = `${R2_BUCKET_URL}/${path}`;
        
        console.log(`✅ Upload concluído: ${publicUrl}`);
        
        return {
            success: true,
            url: publicUrl,
            path: path,
            nome: nomeArquivo
        };
        
    } catch (error) {
        console.error('❌ Erro no upload para R2:', error);
        return {
            success: false,
            error: error.message
        };
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
    if (nomeInput) {
        nomeInput.value = nome || '';
        nomeInput.placeholder = 'Digite seu nome completo';
    }
    
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

    if (nomeInput) {
        nomeInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmarAssinatura();
            }
        });
    }

    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
    }, { passive: false });

    if (nomeInput) {
        nomeInput.addEventListener('focus', function() {
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

// ============================================
// CONFIRMAR ASSINATURA COM R2
// ============================================

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
        if (nomeInput) {
            nomeInput.focus();
            nomeInput.style.borderColor = '#FC8181';
            setTimeout(() => { nomeInput.style.borderColor = ''; }, 3000);
        }
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
        btnConfirmar.style.opacity = '0.7';
    }

    const assinaturaDataURL = signaturePad.toDataURL();

    try {
        console.log('📤 Enviando assinatura para R2 e API...');
        
        const nomeArquivo = `assinatura_${dadosAssinatura.tipo}_${dadosAssinatura.numero}_${Date.now()}.png`;
        const resultadoUpload = await uploadParaR2(assinaturaDataURL, 'assinaturas', nomeArquivo);
        
        if (!resultadoUpload.success) {
            throw new Error(resultadoUpload.error || 'Erro ao fazer upload da assinatura');
        }
        
        const urlAssinatura = resultadoUpload.url;
        console.log(`✅ Assinatura enviada para R2: ${urlAssinatura}`);
        
        console.log('📤 Enviando URL da assinatura para API...');
        
        const response = await fetch(`${API_URL}/sa/${dadosAssinatura.numero}/assinatura`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: dadosAssinatura.tipo,
                nome: nome,
                assinatura_url: urlAssinatura
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

        try {
            sessionStorage.setItem('assinatura_concluida_' + dadosAssinatura.numero, JSON.stringify({
                tipo: dadosAssinatura.tipo,
                numero: dadosAssinatura.numero,
                concluido: true,
                timestamp: Date.now()
            }));
            console.log('✅ Notificação salva no sessionStorage');
        } catch (e) {
            console.warn('⚠️ Erro ao salvar no sessionStorage:', e);
        }

        setTimeout(function() {
            fecharJanelaAssinatura();
        }, 1500);

    } catch (error) {
        console.error('❌ Erro ao salvar assinatura:', error);
        mostrarStatus(`❌ ${error.message}`, 'error');
        
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = '✅ Confirmar';
            btnConfirmar.style.opacity = '1';
        }
    }
}

// ============================================
// FECHAR JANELA DE ASSINATURA
// ============================================

function fecharJanelaAssinatura() {
    console.log('🔒 Fechando janela de assinatura...');
    
    try {
        window.close();
        console.log('✅ window.close() executado');
    } catch (e) {
        console.warn('⚠️ window.close() falhou:', e);
    }
    
    setTimeout(function() {
        if (!window.closed) {
            console.log('ℹ️ Janela ainda aberta. O usuário pode fechá-la manualmente.');
            const status = document.getElementById('statusMessage');
            if (status) {
                status.textContent = '✅ Assinatura concluída! Você pode fechar esta janela.';
                status.className = 'assinatura-status success';
                status.style.display = 'block';
                status.style.fontSize = '16px';
                status.style.padding = '15px';
            }
            const actions = document.querySelector('.signature-actions');
            if (actions && !document.getElementById('btnFecharJanela')) {
                const btnFechar = document.createElement('button');
                btnFechar.id = 'btnFecharJanela';
                btnFechar.className = 'btn-cancelar';
                btnFechar.textContent = '✕ Fechar Janela';
                btnFechar.style.flex = '1';
                btnFechar.style.padding = '12px 20px';
                btnFechar.style.border = 'none';
                btnFechar.style.borderRadius = '10px';
                btnFechar.style.fontWeight = '700';
                btnFechar.style.fontSize = 'clamp(13px, 1.6vw, 15px)';
                btnFechar.style.cursor = 'pointer';
                btnFechar.style.background = '#FC8181';
                btnFechar.style.color = 'white';
                btnFechar.onclick = function() {
                    window.close();
                    if (!window.closed) {
                        document.body.innerHTML = `
                            <div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#1a237e;color:white;font-family:Arial,sans-serif;text-align:center;padding:20px;flex-direction:column;">
                                <h1 style="font-size:48px;margin-bottom:10px;">✅</h1>
                                <h2>Assinatura concluída!</h2>
                                <p style="opacity:0.8;">Você pode fechar esta aba manualmente.</p>
                            </div>
                        `;
                    }
                };
                actions.appendChild(btnFechar);
            }
        }
    }, 1500);
}

// ============================================
// CANCELAR/VOLTAR
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

// ============================================
// MOSTRAR STATUS
// ============================================

function mostrarStatus(mensagem, tipo) {
    const status = document.getElementById('statusMessage');
    if (!status) return;
    
    status.textContent = mensagem;
    status.className = 'assinatura-status ' + tipo;
    status.style.display = 'block';
    status.style.animation = 'fadeIn 0.3s ease';
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================

window.limparAssinatura = limparAssinatura;
window.confirmarAssinatura = confirmarAssinatura;
window.cancelarAssinatura = cancelarAssinatura;
window.voltarSemAssinar = voltarSemAssinar;
window.fecharJanelaAssinatura = fecharJanelaAssinatura;
window.uploadParaR2 = uploadParaR2;

console.log('✅ assinar.js carregado com sucesso');