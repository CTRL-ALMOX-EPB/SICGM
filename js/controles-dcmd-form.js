// ============================================
// CONTROLES DCMD - FORMULÁRIO UNIFICADO
// ============================================

console.log('🚀 Iniciando Controles DCMD - Formulário...');

const API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';

// URL do Cloudflare R2
const R2_URL = 'https://pub-b5fbd1ddaff14047bf16aef93e8886dd.r2.dev';

// ============================================
// MAPEAMENTO DOS TIPOS
// ============================================

const TIPOS = {
    'pendencia': {
        label: 'Pendência de Baixa',
        icon: '📌',
        endpoint: '/pendencia-baixa',
        tabela: 'pendencia_baixa',
        temItens: true,
        temAditivoSistemico: false,
        temAditivoFisico: false
    },
    'aditivo': {
        label: 'Aditivo Sistêmico',
        icon: '📝',
        endpoint: '/aditivo-sistemico',
        tabela: 'aditivo_sistemico',
        temItens: true,
        temAditivoSistemico: true,
        temAditivoFisico: false
    },
    'aditivo-fisico': {
        label: 'Aditivo Físico',
        icon: '🔧',
        endpoint: '/aditivo-fisico',
        tabela: 'aditivo_fisico',
        temItens: true,
        temAditivoSistemico: false,
        temAditivoFisico: true
    },
    'farol': {
        label: 'Farol de Obras',
        icon: '🚦',
        endpoint: '/farol-obras',
        tabela: 'farol_obras',
        temItens: false,
        temAditivoSistemico: false,
        temAditivoFisico: false
    },
    'devolucao': {
        label: 'Pendências de Devolução',
        icon: '📦',
        endpoint: '/pendencia-devolucao',
        tabela: 'pendencia_devolucao',
        temItens: false,
        temAditivoSistemico: false,
        temAditivoFisico: false
    },
    'movimento': {
        label: 'Controle de Movimentações',
        icon: '📄',
        endpoint: '/movimento',
        tabela: 'movimento',
        temItens: false,
        temAditivoSistemico: false,
        temAditivoFisico: false
    }
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let perfilUsuario = 'OPERACIONAL';
let dadosSessao = null;
let controleAtual = null;
let tipoAtual = 'pendencia';
let materiaisCache = {};
let popupElement = null;
let overlayElement = null;
let linhasDocumentosMultiplos = [];
let tipoMgmSelecionado = 'UNICO';

// ============================================
// FUNÇÕES DE UTILIDADE
// ============================================

function redirecionarParaHome() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (sessao) {
        try {
            const dados = JSON.parse(sessao);
            const homeMap = {
                'OPERACIONAL': '../home-operacional.html',
                'GESTAO': '../home-gestao.html',
                'VISUALIZACAO': '../home-visualizacao.html'
            };
            const homePage = homeMap[dados.perfil] || '../index.html';
            window.location.href = homePage;
        } catch (e) {
            window.location.href = '../index.html';
        }
    } else {
        window.location.href = '../index.html';
    }
}

window.redirecionarParaHome = redirecionarParaHome;

function mostrarToast(mensagem, tipo = 'info') {
    const toastExistente = document.querySelector('.toast-notificacao');
    if (toastExistente) toastExistente.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notificacao toast-${tipo}`;
    toast.innerHTML = mensagem;
    
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        zIndex: '9999',
        maxWidth: '400px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
        transform: 'translateX(120%)',
        transition: 'transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        border: '1px solid rgba(255,255,255,0.2)',
        backdropFilter: 'blur(10px)'
    });
    
    const cores = {
        sucesso: { background: 'linear-gradient(135deg, #48bb78, #38a169)', color: '#ffffff' },
        erro: { background: 'linear-gradient(135deg, #fc8181, #e53e3e)', color: '#ffffff' },
        info: { background: 'linear-gradient(135deg, #63b3ed, #4299e1)', color: '#ffffff' },
        aviso: { background: 'linear-gradient(135deg, #f6ad55, #ed8936)', color: '#ffffff' }
    };
    
    const cor = cores[tipo] || cores.info;
    toast.style.background = cor.background;
    toast.style.color = cor.color;
    
    document.body.appendChild(toast);
    toast.offsetHeight;
    toast.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
    }, 4000);
}

function carregarDadosUsuario() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    
    if (!sessao) {
        window.location.href = '../login.html';
        return null;
    }
    
    try {
        dadosSessao = JSON.parse(sessao);
        perfilUsuario = dadosSessao.perfil || 'OPERACIONAL';
        
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userMatriculaEl = document.getElementById('userMatricula');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) userNameEl.textContent = dadosSessao.nome || 'Usuário';
        if (userRoleEl) userRoleEl.textContent = dadosSessao.perfil || 'OPERACIONAL';
        if (userMatriculaEl) userMatriculaEl.textContent = `Matrícula: ${dadosSessao.matricula || '---'}`;
        if (userAvatarEl) userAvatarEl.textContent = (dadosSessao.nome || 'U')[0].toUpperCase();
        
        return dadosSessao;
    } catch (e) {
        window.location.href = '../login.html';
        return null;
    }
}

// ============================================
// CARREGAR MATERIAIS - DO R2 (POR DEPÓSITO)
// ============================================

async function carregarMateriais() {
    try {
        const params = new URLSearchParams(window.location.search);
        const tipo = params.get('tipo') || 'pendencia';
        
        const tipoDepositoMap = {
            'pendencia': '1050',
            'aditivo': '1050',
            'aditivo-fisico': '1050',
            'farol': '1050',
            'devolucao': '1050',
            'movimento': '1050'
        };
        
        const depositoAtual = tipoDepositoMap[tipo] || '1050';
        
        console.log(`🔄 Carregando materiais do R2 para depósito ${depositoAtual}...`);
        
        const response = await fetch(`${R2_URL}/posicacao-de-estoque/posicao-de-estoque-${depositoAtual}.txt`);
        
        if (!response.ok) {
            console.warn(`⚠️ Arquivo posicao-de-estoque-${depositoAtual}.txt não encontrado no R2`);
            mostrarToast(`⚠️ Posição de estoque do depósito ${depositoAtual} não encontrada`, 'aviso');
            return;
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        
        materiaisCache = {};
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const partes = linha.split('\t');
            
            if (partes.length >= 6) {
                const codigo = partes[0].trim();
                const codreg = partes[1]?.trim() || '';
                const descricao = partes[2]?.trim() || '';
                const unidade = partes[3]?.trim() || 'UN';
                
                if (codigo && descricao) {
                    materiaisCache[codigo] = {
                        codigo: codigo,
                        codreg: codreg,
                        descricao: descricao,
                        unidade: unidade,
                        vlrult_cot: parseFloat(partes[4]?.trim().replace(',', '.') || '0') || 0,
                        saldo_oper: parseFloat(partes[5]?.trim().replace(',', '.') || '0') || 0
                    };
                }
            }
        }
        
        console.log(`✅ ${Object.keys(materiaisCache).length} materiais carregados do R2 para depósito ${depositoAtual}`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar materiais:', error);
        mostrarToast('❌ Erro ao carregar posição de estoque', 'erro');
    }
}

// ============================================
// BUSCAR MATERIAL
// ============================================

function buscarMaterialArquivo(codigo) {
    codigo = codigo.trim();
    if (!codigo) return null;
    
    const codigoUpper = codigo.toUpperCase();
    
    for (const key of Object.keys(materiaisCache)) {
        if (key.toUpperCase() === codigoUpper) {
            return {
                ...materiaisCache[key],
                codigo: key
            };
        }
    }
    
    return null;
}

// ============================================
// VALIDAÇÃO DE CÓDIGOS DUPLICADOS
// ============================================

function verificarCodigoDuplicado(codigo, linhaAtual) {
    if (!codigo || codigo.trim() === '') return false;
    
    if (tipoAtual === 'aditivo') {
        return false;
    }
    
    const codigoUpper = codigo.trim().toUpperCase();
    const todasLinhas = document.querySelectorAll('#itemsBody tr');
    let duplicado = false;
    
    todasLinhas.forEach(linha => {
        if (linha === linhaAtual) return;
        
        const codigoInput = linha.querySelector('.item-codigo');
        if (!codigoInput) return;
        
        const codigoLinha = codigoInput.value.trim().toUpperCase();
        if (codigoLinha === codigoUpper) {
            duplicado = true;
        }
    });
    
    return duplicado;
}

function marcarCampoDuplicado(input, isDuplicado) {
    const isAditivoSistemico = tipoAtual === 'aditivo';
    
    if (isDuplicado && !isAditivoSistemico) {
        input.style.borderColor = '#FC8181';
        input.style.backgroundColor = '#FFF5F5';
        input.style.boxShadow = '0 0 0 3px rgba(252, 129, 129, 0.2)';
        
        const codigo = input.value.trim().toUpperCase();
        input.title = `⚠️ Código "${codigo}" duplicado!`;
        
        let aviso = input.parentNode.querySelector('.duplicado-aviso');
        if (!aviso) {
            aviso = document.createElement('span');
            aviso.className = 'duplicado-aviso';
            aviso.textContent = '⚠️';
            aviso.style.cssText = `
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 14px;
                cursor: help;
                color: #FC8181;
            `;
            aviso.title = `Código "${codigo}" duplicado!`;
            input.parentNode.style.position = 'relative';
            input.parentNode.appendChild(aviso);
        }
    } else if (isDuplicado && isAditivoSistemico) {
        input.style.borderColor = '#F6AD55';
        input.style.backgroundColor = '#FFFAF0';
        input.style.boxShadow = '0 0 0 3px rgba(246, 173, 85, 0.15)';
        input.title = `ℹ️ Código "${input.value.trim().toUpperCase()}" duplicado (permitido em Aditivo Sistêmico)`;
        
        let aviso = input.parentNode.querySelector('.duplicado-aviso');
        if (!aviso) {
            aviso = document.createElement('span');
            aviso.className = 'duplicado-aviso';
            aviso.textContent = 'ℹ️';
            aviso.style.cssText = `
                position: absolute;
                right: 4px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 14px;
                cursor: help;
                color: #F6AD55;
            `;
            aviso.title = `Código "${input.value.trim().toUpperCase()}" duplicado (permitido)`;
            input.parentNode.style.position = 'relative';
            input.parentNode.appendChild(aviso);
        }
    } else {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
        input.style.boxShadow = '';
        input.title = '';
        
        const aviso = input.parentNode.querySelector('.duplicado-aviso');
        if (aviso) aviso.remove();
    }
}

function validarTodosCodigos() {
    const codigosMap = new Map();
    const linhas = document.querySelectorAll('#itemsBody tr');
    let todosValidos = true;
    
    linhas.forEach(linha => {
        const codigoInput = linha.querySelector('.item-codigo');
        if (!codigoInput) return;
        
        const codigo = codigoInput.value.trim().toUpperCase();
        if (codigo === '') return;
        
        if (!codigosMap.has(codigo)) {
            codigosMap.set(codigo, []);
        }
        codigosMap.get(codigo).push(codigoInput);
    });
    
    codigosMap.forEach((inputs) => {
        if (inputs.length > 1) {
            todosValidos = false;
            inputs.forEach(input => {
                marcarCampoDuplicado(input, true);
            });
        } else {
            inputs.forEach(input => {
                marcarCampoDuplicado(input, false);
            });
        }
    });
    
    return todosValidos;
}

function verificarECorrigirDuplicados() {
    const codigosMap = new Map();
    const linhas = document.querySelectorAll('#itemsBody tr');
    let temDuplicado = false;
    
    linhas.forEach(linha => {
        const codigoInput = linha.querySelector('.item-codigo');
        if (!codigoInput) return;
        
        const codigo = codigoInput.value.trim().toUpperCase();
        if (codigo === '') {
            marcarCampoDuplicado(codigoInput, false);
            return;
        }
        
        if (!codigosMap.has(codigo)) {
            codigosMap.set(codigo, []);
        }
        codigosMap.get(codigo).push(codigoInput);
    });
    
    codigosMap.forEach((inputs) => {
        if (inputs.length > 1) {
            temDuplicado = true;
            inputs.forEach(input => {
                marcarCampoDuplicado(input, true);
            });
        } else {
            inputs.forEach(input => {
                marcarCampoDuplicado(input, false);
            });
        }
    });
    
    return temDuplicado;
}

function validarDuplicadosAntesDeSalvar() {
    if (tipoAtual === 'aditivo') {
        const codigosMap = new Map();
        const linhas = document.querySelectorAll('#itemsBody tr');
        
        linhas.forEach(linha => {
            const codigoInput = linha.querySelector('.item-codigo');
            if (!codigoInput) return;
            
            const codigo = codigoInput.value.trim().toUpperCase();
            if (codigo === '') {
                marcarCampoDuplicado(codigoInput, false);
                return;
            }
            
            if (!codigosMap.has(codigo)) {
                codigosMap.set(codigo, []);
            }
            codigosMap.get(codigo).push(codigoInput);
        });
        
        codigosMap.forEach((inputs) => {
            if (inputs.length > 1) {
                inputs.forEach(input => {
                    marcarCampoDuplicado(input, true);
                });
            } else {
                inputs.forEach(input => {
                    marcarCampoDuplicado(input, false);
                });
            }
        });
        
        return false;
    }
    
    const codigosMap = new Map();
    const linhas = document.querySelectorAll('#itemsBody tr');
    let duplicadoEncontrado = false;
    let duplicadosLista = [];
    
    linhas.forEach(linha => {
        const codigoInput = linha.querySelector('.item-codigo');
        if (!codigoInput) return;
        
        const codigo = codigoInput.value.trim().toUpperCase();
        if (codigo === '') return;
        
        if (!codigosMap.has(codigo)) {
            codigosMap.set(codigo, []);
        }
        codigosMap.get(codigo).push(codigoInput);
    });
    
    codigosMap.forEach((inputs, codigo) => {
        if (inputs.length > 1) {
            duplicadoEncontrado = true;
            duplicadosLista.push(codigo);
            inputs.forEach(input => {
                marcarCampoDuplicado(input, true);
            });
        } else {
            inputs.forEach(input => {
                marcarCampoDuplicado(input, false);
            });
        }
    });
    
    if (duplicadoEncontrado) {
        mostrarToast(`⚠️ Códigos duplicados: ${duplicadosLista.join(', ')}`, 'erro');
    }
    
    return duplicadoEncontrado;
}

function validarDuplicadosNoPaste(linhas, elementoAlvo) {
    const codigosExistentes = [];
    const linhasExistentes = document.querySelectorAll('#itemsBody tr');
    
    linhasExistentes.forEach(linha => {
        const codigoInput = linha.querySelector('.item-codigo');
        if (codigoInput) {
            const codigo = codigoInput.value.trim().toUpperCase();
            if (codigo) codigosExistentes.push(codigo);
        }
    });
    
    const duplicados = [];
    const novosCodigos = [];
    
    linhas.forEach(linha => {
        const codigo = linha.trim().toUpperCase();
        if (!codigo) return;
        
        if (codigosExistentes.includes(codigo) || novosCodigos.includes(codigo)) {
            if (!duplicados.includes(codigo)) {
                duplicados.push(codigo);
            }
        } else {
            novosCodigos.push(codigo);
        }
    });
    
    if (duplicados.length > 0) {
        linhasExistentes.forEach(linha => {
            const codigoInput = linha.querySelector('.item-codigo');
            if (!codigoInput) return;
            const codigo = codigoInput.value.trim().toUpperCase();
            if (duplicados.includes(codigo)) {
                marcarCampoDuplicado(codigoInput, true);
            }
        });
        
        setTimeout(() => {
            verificarECorrigirDuplicados();
        }, 100);
    }
    
    return duplicados;
}

function configurarValidacaoDuplicados() {
    const codigosInputs = document.querySelectorAll('.item-codigo');
    
    codigosInputs.forEach(input => {
        input.removeEventListener('blur', handleValidacaoDuplicado);
        input.removeEventListener('input', handleValidacaoDuplicadoInput);
        
        input.addEventListener('blur', handleValidacaoDuplicado);
        input.addEventListener('input', handleValidacaoDuplicadoInput);
    });
}

function handleValidacaoDuplicado(e) {
    const input = e.target;
    const codigo = input.value.trim().toUpperCase();
    
    if (codigo === '') {
        marcarCampoDuplicado(input, false);
        verificarECorrigirDuplicados();
        return;
    }
    
    verificarECorrigirDuplicados();
}

function handleValidacaoDuplicadoInput(e) {
    const input = e.target;
    const codigo = input.value.trim().toUpperCase();
    
    if (codigo === '') {
        marcarCampoDuplicado(input, false);
        verificarECorrigirDuplicados();
        return;
    }
    
    verificarECorrigirDuplicados();
}

// ============================================
// BUSCAR MATERIAL COM VALIDAÇÃO DE DUPLICADOS
// ============================================

async function buscarMaterial(input) {
    const codigo = input.value.trim();
    if (!codigo) {
        mostrarToast('⚠️ Digite um código', 'aviso');
        return;
    }
    
    const row = input.closest('tr');
    const descInput = row.querySelector('.item-descricao');
    const undInput = row.querySelector('.item-unidade');
    
    input.value = codigo.toUpperCase();
    
    const isAditivoSistemico = tipoAtual === 'aditivo';
    
    const material = buscarMaterialArquivo(input.value);
    
    if (!material) {
        mostrarToast('⚠️ Código não encontrado', 'aviso');
        descInput.value = '';
        undInput.value = '';
        marcarCampoDuplicado(input, false);
        verificarECorrigirDuplicados();
        return;
    }
    
    descInput.value = material.descricao || '';
    undInput.value = material.unidade || 'UN';
    
    const isDuplicado = verificarCodigoDuplicado(input.value, row);
    
    if (isDuplicado && !isAditivoSistemico) {
        verificarECorrigirDuplicados();
        mostrarToast(`⚠️ Código "${input.value}" já adicionado neste controle!`, 'aviso');
        return;
    }
    
    if (isDuplicado && isAditivoSistemico) {
        verificarECorrigirDuplicados();
        mostrarToast(`ℹ️ Código "${input.value}" duplicado (permitido em Aditivo Sistêmico)`, 'info');
        return;
    }
    
    marcarCampoDuplicado(input, false);
    verificarECorrigirDuplicados();
    
    mostrarToast(`✅ ${material.descricao}`, 'sucesso');
}

window.buscarMaterial = buscarMaterial;

// ============================================
// VOLTAR PARA O PAINEL COM A ABA CORRETA
// ============================================

function voltarParaPainel() {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo') || 'pendencia';
    window.location.href = `index.html?tipo=${tipo}`;
}

window.voltarParaPainel = voltarParaPainel;

// ============================================
// FUNÇÃO PARA VERIFICAR SE UM CAMPO É EDITÁVEL
// ============================================

function isCampoEditavel(elemento) {
    if (!elemento) return false;
    return elemento.offsetParent !== null && 
           !elemento.disabled && 
           !elemento.readOnly;
}

function getElementosEditaveis(container) {
    const elementos = container.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    return Array.from(elementos).filter(el => el.offsetParent !== null);
}

// ============================================
// FUNÇÃO PARA OBTER NOME DO USUÁRIO LOGADO
// ============================================

function getNomeUsuarioLogado() {
    return dadosSessao?.nome || 'Usuário';
}

function getMatriculaUsuarioLogado() {
    return dadosSessao?.matricula || '---';
}

// ============================================
// FUNÇÃO AUXILIAR PARA FORMATAR NÚMERO
// ============================================

function formatarNumero(valor) {
    if (valor === undefined || valor === null || valor === '') return '';
    
    let valorStr = String(valor).trim();
    
    if (typeof valor === 'number' && !isNaN(valor)) {
        return valor;
    }
    
    valorStr = valorStr.replace(',', '.');
    valorStr = valorStr.replace(/[^0-9.-]/g, '');
    
    const numero = parseFloat(valorStr);
    return isNaN(numero) ? valor : numero;
}

// ============================================
// FOCAR NO CAMPO OBRA AO CARREGAR O FORMULÁRIO
// ============================================

function focarCampoObra() {
    const params = new URLSearchParams(window.location.search);
    const focarObra = params.get('focarObra') === 'true';
    
    if (!focarObra) {
        const isNovo = !controleAtual || Object.keys(controleAtual).length === 0 || 
                       (controleAtual.obra === '' && controleAtual.itens?.length === 0);
        if (!isNovo) return;
    }
    
    console.log('🎯 Focando no campo "Nº Obra"...');
    
    const tentarFocar = function(tentativa = 0) {
        const campoObra = document.getElementById('formObra');
        if (campoObra && isCampoEditavel(campoObra)) {
            campoObra.focus();
            campoObra.select();
            console.log('✅ Campo "Nº Obra" focado com sucesso!');
            
            const url = new URL(window.location);
            url.searchParams.delete('focarObra');
            window.history.replaceState({}, '', url);
            return true;
        }
        
        if (tentativa < 10) {
            setTimeout(() => tentarFocar(tentativa + 1), 100);
            return false;
        }
        
        console.warn('⚠️ Campo "Nº Obra" não encontrado após várias tentativas');
        return false;
    };
    
    setTimeout(() => tentarFocar(), 200);
}

// ============================================
// NAVEGAÇÃO POR TECLADO EM SELECTS (NÚMEROS)
// ============================================

function configurarNavegacaoSelectPorNumero() {
    const selects = document.querySelectorAll('#itemsBody select:not([disabled])');
    
    selects.forEach(select => {
        if (select._navNumeroConfigurado) return;
        select._navNumeroConfigurado = true;
        
        select.removeEventListener('keydown', handleSelectNumeroTeclado);
        select.addEventListener('keydown', handleSelectNumeroTeclado);
    });
}

function handleSelectNumeroTeclado(e) {
    const select = e.target;
    
    if (select.tagName !== 'SELECT' || select.disabled) return;
    
    const key = e.key;
    
    if (/^[1-9]$/.test(key)) {
        e.preventDefault();
        e.stopPropagation();
        
        const numero = parseInt(key);
        const options = Array.from(select.options);
        const targetIndex = numero - 1;
        
        if (targetIndex < options.length) {
            select.selectedIndex = targetIndex;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            
            const optionText = options[targetIndex].text;
            console.log(`🔢 Select navegado: ${numero} → "${optionText}"`);
            
            select.style.borderColor = '#48BB78';
            select.style.boxShadow = '0 0 0 3px rgba(72, 187, 120, 0.2)';
            setTimeout(() => {
                select.style.borderColor = '';
                select.style.boxShadow = '';
            }, 300);
        } else {
            select.style.borderColor = '#FC8181';
            select.style.boxShadow = '0 0 0 3px rgba(252, 129, 129, 0.2)';
            setTimeout(() => {
                select.style.borderColor = '';
                select.style.boxShadow = '';
            }, 500);
            console.log(`⚠️ Apenas ${options.length} opções disponíveis`);
        }
    }
}

function atualizarNavegacaoSelects() {
    setTimeout(() => {
        configurarNavegacaoSelectPorNumero();
    }, 100);
}

// ============================================
// CONTROLAR VISIBILIDADE DA DATA DE PROGRAMAÇÃO
// ============================================

function controlarVisibilidadeDataProgramacao() {
    const isMovimento = tipoAtual === 'movimento';
    const campoDataProgramacao = document.getElementById('campoDataProgramacao');
    const campoDataUnica = document.getElementById('campoDataUnica');
    const secaoDocumentosMultiplos = document.getElementById('secaoDocumentosMultiplos');
    
    if (!campoDataProgramacao) return;
    
    // Se NÃO for movimento, mostrar o campo normal
    if (!isMovimento) {
        campoDataProgramacao.style.display = '';
        return;
    }
    
    // Se FOR movimento, verificar o tipo MGM
    const radios = document.querySelectorAll('input[name="tipoMgm"]');
    let tipoMgm = 'UNICO';
    radios.forEach(r => {
        if (r.checked) tipoMgm = r.value;
    });
    
    // MOVIMENTO: Esconder data_programacao quando MGM Múltipla
    if (tipoMgm === 'MULTIPLO') {
        campoDataProgramacao.style.display = 'none';
        if (secaoDocumentosMultiplos) {
            secaoDocumentosMultiplos.style.display = 'block';
        }
        if (campoDataUnica) {
            campoDataUnica.style.display = 'none';
        }
    } else {
        // MGM Única: esconder data_programacao comum, mostrar a específica
        campoDataProgramacao.style.display = 'none';
        if (secaoDocumentosMultiplos) {
            secaoDocumentosMultiplos.style.display = 'none';
        }
        if (campoDataUnica) {
            campoDataUnica.style.display = 'block';
        }
    }
}

// ============================================
// FUNÇÕES PARA MÚLTIPLOS DOCUMENTOS
// ============================================

function toggleTipoMgm() {
    const radios = document.querySelectorAll('input[name="tipoMgm"]');
    let selecionado = 'UNICO';
    radios.forEach(r => {
        if (r.checked) selecionado = r.value;
    });
    
    tipoMgmSelecionado = selecionado;
    
    const campoDataUnica = document.getElementById('campoDataUnica');
    const secaoDocumentosMultiplos = document.getElementById('secaoDocumentosMultiplos');
    const campoDataProgramacao = document.getElementById('campoDataProgramacao');
    const formDataUnica = document.getElementById('formDataUnica');
    
    if (selecionado === 'UNICO') {
        // MGM Única: mostrar campo único
        if (campoDataUnica) campoDataUnica.style.display = 'block';
        if (secaoDocumentosMultiplos) secaoDocumentosMultiplos.style.display = 'none';
        
        // DATA DE PROGRAMAÇÃO COMUM: esconder (pois movimento tem seu próprio campo)
        if (campoDataProgramacao) campoDataProgramacao.style.display = 'none';
        
        linhasDocumentosMultiplos = [];
        const container = document.getElementById('containerDocumentosMultiplos');
        if (container) container.innerHTML = '';
        
        if (formDataUnica) formDataUnica.disabled = false;
        
    } else {
        // MGM Múltipla: esconder campo único
        if (campoDataUnica) campoDataUnica.style.display = 'none';
        if (secaoDocumentosMultiplos) secaoDocumentosMultiplos.style.display = 'block';
        
        // DATA DE PROGRAMAÇÃO COMUM: esconder TAMBÉM (pois cada linha tem sua data)
        if (campoDataProgramacao) campoDataProgramacao.style.display = 'none';
        
        if (formDataUnica) formDataUnica.disabled = true;
        
        const container = document.getElementById('containerDocumentosMultiplos');
        const linhasExistentes = container ? container.querySelectorAll('.linha-documento-multiplo') : [];
        
        if (linhasExistentes.length === 0) {
            adicionarLinhaDocumentoMultiplo();
        }
        
        setTimeout(() => {
            configurarNavegacaoDocumentosMultiplos();
            configurarPasteDocumentosMultiplos();
        }, 100);
    }
}

window.toggleTipoMgm = toggleTipoMgm;

function adicionarLinhaDocumentoMultiplo(codigo = '', data = '') {
    const container = document.getElementById('containerDocumentosMultiplos');
    if (!container) return;
    
    const id = Date.now() + Math.random();
    const linha = {
        id: id,
        codigo: codigo,
        data: data
    };
    linhasDocumentosMultiplos.push(linha);
    
    const div = document.createElement('div');
    div.className = 'linha-documento-multiplo';
    div.dataset.id = id;
    
    div.innerHTML = `
        <input type="text" class="input-doc-codigo" 
               placeholder="Ex: 2601509345"
               value="${codigo}"
               data-id="${id}">
        <input type="date" class="input-doc-data" 
               value="${data}"
               data-id="${id}">
        <button type="button" class="btn-remover-doc" onclick="removerLinhaDocumentoMultiplo(${id})" title="Remover linha">
            ✕
        </button>
    `;
    
    container.appendChild(div);
    
    setTimeout(() => {
        configurarNavegacaoDocumentosMultiplos();
        configurarPasteDocumentosMultiplos();
        
        const primeiroInput = div.querySelector('.input-doc-codigo');
        if (primeiroInput && !codigo) {
            setTimeout(() => primeiroInput.focus(), 100);
        }
    }, 50);
}

window.adicionarLinhaDocumentoMultiplo = adicionarLinhaDocumentoMultiplo;

function atualizarDocumentoMultiplo(id, campo, valor) {
    const linha = linhasDocumentosMultiplos.find(l => l.id === id);
    if (linha) {
        linha[campo] = valor;
    }
}

window.atualizarDocumentoMultiplo = atualizarDocumentoMultiplo;

function removerLinhaDocumentoMultiplo(id) {
    if (linhasDocumentosMultiplos.length <= 1) {
        mostrarToast('⚠️ É necessário ter pelo menos um documento', 'aviso');
        return;
    }
    
    linhasDocumentosMultiplos = linhasDocumentosMultiplos.filter(l => l.id !== id);
    
    const container = document.getElementById('containerDocumentosMultiplos');
    if (container) {
        const div = container.querySelector(`.linha-documento-multiplo[data-id="${id}"]`);
        if (div) div.remove();
    }
    
    setTimeout(() => {
        configurarNavegacaoDocumentosMultiplos();
        configurarPasteDocumentosMultiplos();
    }, 50);
}

window.removerLinhaDocumentoMultiplo = removerLinhaDocumentoMultiplo;

function obterDocumentosMultiplos() {
    const linhas = document.querySelectorAll('#containerDocumentosMultiplos .linha-documento-multiplo');
    const documentos = [];
    
    linhas.forEach(linha => {
        const codigoInput = linha.querySelector('.input-doc-codigo');
        const dataInput = linha.querySelector('.input-doc-data');
        
        const codigo = codigoInput ? codigoInput.value.trim() : '';
        const data = dataInput ? dataInput.value.trim() : '';
        
        if (codigo && data) {
            documentos.push({ codigo, data });
        }
    });
    
    return documentos;
}

window.obterDocumentosMultiplos = obterDocumentosMultiplos;

function carregarDocumentosMultiplos(dados) {
    linhasDocumentosMultiplos = [];
    const container = document.getElementById('containerDocumentosMultiplos');
    if (container) container.innerHTML = '';
    
    if (dados.tipo_mgm === 'MULTIPLO' && dados.documentos) {
        dados.documentos.forEach(doc => {
            if (doc.codigo || doc.data) {
                const id = Date.now() + Math.random();
                linhasDocumentosMultiplos.push({ 
                    id, 
                    codigo: doc.codigo || '', 
                    data: doc.data || '' 
                });
                
                const div = document.createElement('div');
                div.className = 'linha-documento-multiplo';
                div.dataset.id = id;
                div.innerHTML = `
                    <input type="text" class="input-doc-codigo" 
                           placeholder="Ex: 2601509345"
                           value="${doc.codigo || ''}"
                           data-id="${id}">
                    <input type="date" class="input-doc-data" 
                           value="${doc.data || ''}"
                           data-id="${id}">
                    <button type="button" class="btn-remover-doc" onclick="removerLinhaDocumentoMultiplo(${id})" title="Remover linha">
                        ✕
                    </button>
                `;
                container.appendChild(div);
            }
        });
    }
    
    if (linhasDocumentosMultiplos.length === 0) {
        adicionarLinhaDocumentoMultiplo();
    }
    
    setTimeout(() => {
        configurarNavegacaoDocumentosMultiplos();
        configurarPasteDocumentosMultiplos();
    }, 100);
}

// ============================================
// NAVEGAÇÃO PARA DOCUMENTOS MÚLTIPLOS
// ============================================

function configurarNavegacaoDocumentosMultiplos() {
    const inputs = document.querySelectorAll('#containerDocumentosMultiplos input:not([readonly]):not([disabled])');
    const botoes = document.querySelectorAll('.btn-remover-doc');
    
    inputs.forEach(input => {
        input.removeEventListener('keydown', handleDocumentoTecladoGlobal);
        input.addEventListener('keydown', handleDocumentoTecladoGlobal);
    });
    
    botoes.forEach(btn => {
        btn.removeEventListener('keydown', handleDocumentoTecladoGlobal);
        btn.addEventListener('keydown', handleDocumentoTecladoGlobal);
    });
}

function handleDocumentoTecladoGlobal(e) {
    const target = e.target;
    const key = e.key;
    
    const container = document.getElementById('containerDocumentosMultiplos');
    if (!container || !container.contains(target)) return;
    
    if (key === 'Enter' || key === 'ArrowDown' || key === 'ArrowUp' || key === 'Tab') {
        const isDocInput = target.classList.contains('input-doc-codigo') || 
                          target.classList.contains('input-doc-data');
        if (!isDocInput) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const isCodigo = target.classList.contains('input-doc-codigo');
        const isData = target.classList.contains('input-doc-data');
        const row = target.closest('.linha-documento-multiplo');
        if (!row) return;
        
        const rows = container.querySelectorAll('.linha-documento-multiplo');
        const currentIndex = Array.from(rows).indexOf(row);
        
        if (key === 'Enter') {
            if (isCodigo) {
                const dataInput = row.querySelector('.input-doc-data');
                if (dataInput) {
                    dataInput.focus();
                    dataInput.select();
                    return;
                }
            }
            
            if (isData) {
                const nextRow = rows[currentIndex + 1];
                if (nextRow) {
                    const nextCodigo = nextRow.querySelector('.input-doc-codigo');
                    if (nextCodigo) {
                        nextCodigo.focus();
                        nextCodigo.select();
                        return;
                    }
                } else {
                    const codigoAtual = row.querySelector('.input-doc-codigo')?.value || '';
                    const dataAtual = row.querySelector('.input-doc-data')?.value || '';
                    if (codigoAtual && dataAtual) {
                        adicionarLinhaDocumentoMultiplo();
                        setTimeout(() => {
                            const novasRows = container.querySelectorAll('.linha-documento-multiplo');
                            const ultimaRow = novasRows[novasRows.length - 1];
                            if (ultimaRow) {
                                const novoCodigo = ultimaRow.querySelector('.input-doc-codigo');
                                if (novoCodigo) {
                                    novoCodigo.focus();
                                    novoCodigo.select();
                                }
                            }
                        }, 100);
                    }
                }
            }
            return;
        }
        
        if (key === 'ArrowDown' || key === 'ArrowUp') {
            const direction = key === 'ArrowDown' ? 1 : -1;
            const targetIndex = currentIndex + direction;
            
            if (targetIndex < 0 || targetIndex >= rows.length) return;
            
            const targetRow = rows[targetIndex];
            let targetInput = null;
            
            if (isCodigo) {
                targetInput = targetRow.querySelector('.input-doc-codigo');
            } else if (isData) {
                targetInput = targetRow.querySelector('.input-doc-data');
            }
            
            if (!targetInput) {
                targetInput = targetRow.querySelector('input:not([readonly]):not([disabled])');
            }
            
            if (targetInput) {
                targetInput.focus();
                if (targetInput.type === 'text' || targetInput.type === 'date') {
                    targetInput.select();
                }
            }
            return;
        }
        
        if (key === 'Tab') {
            if (isCodigo && !e.shiftKey) {
                const dataInput = row.querySelector('.input-doc-data');
                if (dataInput) {
                    dataInput.focus();
                    dataInput.select();
                }
                return;
            }
            
            if (isData && !e.shiftKey) {
                const nextRow = rows[currentIndex + 1];
                if (nextRow) {
                    const nextCodigo = nextRow.querySelector('.input-doc-codigo');
                    if (nextCodigo) {
                        nextCodigo.focus();
                        nextCodigo.select();
                    }
                } else {
                    const codigoAtual = row.querySelector('.input-doc-codigo')?.value || '';
                    const dataAtual = row.querySelector('.input-doc-data')?.value || '';
                    if (codigoAtual && dataAtual) {
                        adicionarLinhaDocumentoMultiplo();
                        setTimeout(() => {
                            const novasRows = container.querySelectorAll('.linha-documento-multiplo');
                            const ultimaRow = novasRows[novasRows.length - 1];
                            if (ultimaRow) {
                                const novoCodigo = ultimaRow.querySelector('.input-doc-codigo');
                                if (novoCodigo) {
                                    novoCodigo.focus();
                                    novoCodigo.select();
                                }
                            }
                        }, 100);
                    }
                }
                return;
            }
            
            if (isCodigo && e.shiftKey) {
                const btnRemover = row.querySelector('.btn-remover-doc');
                if (btnRemover) {
                    btnRemover.focus();
                }
                return;
            }
            
            if (isData && e.shiftKey) {
                const codigoInput = row.querySelector('.input-doc-codigo');
                if (codigoInput) {
                    codigoInput.focus();
                    codigoInput.select();
                }
                return;
            }
            
            return;
        }
    }
}

// ============================================
// BULK PASTE PARA DOCUMENTOS MÚLTIPLOS
// ============================================

function configurarPasteDocumentosMultiplos() {
    const codigos = document.querySelectorAll('.input-doc-codigo');
    
    codigos.forEach(el => {
        if (el._pasteConfigurado) return;
        el._pasteConfigurado = true;
        
        el.removeEventListener('paste', handleDocumentoPasteGlobal);
        el.addEventListener('paste', handleDocumentoPasteGlobal);
    });
}

function handleDocumentoPasteGlobal(e) {
    const target = e.target;
    if (!target.classList.contains('input-doc-codigo')) return;
    
    const dados = e.clipboardData || window.clipboardData;
    if (!dados) return;
    
    const texto = dados.getData('text/plain');
    if (!texto || texto.trim() === '') return;
    
    const linhas = texto.split('\n').filter(line => line.trim() !== '');
    
    if (linhas.length <= 1) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    processarPasteDocumentosMultiplos(linhas, target);
}

function processarPasteDocumentosMultiplos(linhas, elementoAlvo) {
    const container = document.getElementById('containerDocumentosMultiplos');
    if (!container) return;
    
    const rowAtual = elementoAlvo.closest('.linha-documento-multiplo');
    const rows = container.querySelectorAll('.linha-documento-multiplo');
    let currentIndex = Array.from(rows).indexOf(rowAtual);
    
    const codigoAtual = rowAtual.querySelector('.input-doc-codigo')?.value || '';
    const dataAtual = rowAtual.querySelector('.input-doc-data')?.value || '';
    const linhaVazia = !codigoAtual && !dataAtual;
    
    let startIndex = linhaVazia ? currentIndex : currentIndex + 1;
    
    if (!linhaVazia) {
        adicionarLinhaDocumentoMultiplo();
        setTimeout(() => {
            processarPasteDocumentosLinhas(linhas, startIndex);
        }, 50);
    } else {
        processarPasteDocumentosLinhas(linhas, startIndex);
    }
}

function processarPasteDocumentosLinhas(linhas, startIndex) {
    const container = document.getElementById('containerDocumentosMultiplos');
    let rows = container.querySelectorAll('.linha-documento-multiplo');
    let index = startIndex;
    let linhasProcessadas = 0;
    
    const hoje = new Date();
    const dataAtual = hoje.toISOString().split('T')[0];
    
    const mesesAbreviados = {
        'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
        'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
        'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };
    
    function converterData(dataStr) {
        if (!dataStr) return null;
        
        dataStr = dataStr.trim().toLowerCase();
        
        const dataNumMatch = dataStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (dataNumMatch) {
            const dia = dataNumMatch[1].padStart(2, '0');
            const mes = dataNumMatch[2].padStart(2, '0');
            let ano = dataNumMatch[3];
            if (ano.length === 2) ano = '20' + ano;
            return `${ano}-${mes}-${dia}`;
        }
        
        const dataAbrevMatch = dataStr.match(/^(\d{1,2})\/([a-z]{3})(?:\/(\d{2,4}))?$/);
        if (dataAbrevMatch) {
            const dia = dataAbrevMatch[1].padStart(2, '0');
            const mesAbrev = dataAbrevMatch[2];
            const mes = mesesAbreviados[mesAbrev];
            if (mes) {
                let ano = dataAbrevMatch[3] || hoje.getFullYear().toString();
                if (ano.length === 2) ano = '20' + ano;
                return `${ano}-${mes}-${dia}`;
            }
        }
        
        const dataAbrevMatch2 = dataStr.match(/^([a-z]{3})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (dataAbrevMatch2) {
            const mesAbrev = dataAbrevMatch2[1];
            const dia = dataAbrevMatch2[2].padStart(2, '0');
            const mes = mesesAbreviados[mesAbrev];
            if (mes) {
                let ano = dataAbrevMatch2[3] || hoje.getFullYear().toString();
                if (ano.length === 2) ano = '20' + ano;
                return `${ano}-${mes}-${dia}`;
            }
        }
        
        const dataIsoMatch = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dataIsoMatch) {
            return dataStr;
        }
        
        const dataExtensoMatch = dataStr.match(/^(\d{1,2})\s*de\s*([a-z]+)\s*de\s*(\d{2,4})$/i);
        if (dataExtensoMatch) {
            const dia = dataExtensoMatch[1].padStart(2, '0');
            const mesExtenso = dataExtensoMatch[2].toLowerCase();
            const mesesCompletos = {
                'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
                'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
                'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
            };
            const mes = mesesCompletos[mesExtenso] || mesesAbreviados[mesExtenso.substring(0, 3)];
            if (mes) {
                let ano = dataExtensoMatch[3];
                if (ano.length === 2) ano = '20' + ano;
                return `${ano}-${mes}-${dia}`;
            }
        }
        
        const dataGenericaMatch = dataStr.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
        if (dataGenericaMatch) {
            const dia = dataGenericaMatch[1].padStart(2, '0');
            const mes = dataGenericaMatch[2].padStart(2, '0');
            let ano = dataGenericaMatch[3];
            if (ano.length === 2) ano = '20' + ano;
            return `${ano}-${mes}-${dia}`;
        }
        
        return dataAtual;
    }
    
    for (let i = 0; i < linhas.length; i++) {
        let valor = linhas[i].trim();
        if (!valor) continue;
        
        let codigo = valor;
        let data = '';
        
        const dataPatterns = [
            /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
            /(\d{1,2}\/[a-z]{3}(?:\/\d{2,4})?)/i,
            /([a-z]{3}\/\d{1,2}(?:\/\d{2,4})?)/i,
            /(\d{4}-\d{2}-\d{2})/,
            /(\d{1,2}\s*de\s*[a-z]+\s*de\s*\d{2,4})/i
        ];
        
        let dataEncontrada = null;
        
        for (const pattern of dataPatterns) {
            const match = valor.match(pattern);
            if (match) {
                dataEncontrada = match[1];
                break;
            }
        }
        
        if (dataEncontrada) {
            codigo = valor.replace(dataEncontrada, '').trim();
            data = dataEncontrada;
        }
        
        if (valor.includes('\t')) {
            const partes = valor.split('\t');
            codigo = partes[0].trim();
            data = partes[1]?.trim() || '';
        }
        
        if (!data) {
            const palavras = codigo.split(' ');
            for (let p = palavras.length - 1; p >= 0; p--) {
                const testStr = palavras[p];
                const testData = converterData(testStr);
                if (testData && testData !== dataAtual) {
                    data = testData;
                    codigo = palavras.slice(0, p).join(' ');
                    break;
                }
            }
        }
        
        let dataConvertida = '';
        if (data) {
            const converted = converterData(data);
            if (converted) {
                dataConvertida = converted;
            }
        }
        
        if (!dataConvertida) {
            dataConvertida = dataAtual;
        }
        
        codigo = codigo.trim();
        
        rows = container.querySelectorAll('.linha-documento-multiplo');
        if (index >= rows.length) {
            const id = Date.now() + Math.random() + i;
            linhasDocumentosMultiplos.push({
                id: id,
                codigo: codigo,
                data: dataConvertida
            });
            
            const div = document.createElement('div');
            div.className = 'linha-documento-multiplo';
            div.dataset.id = id;
            div.innerHTML = `
                <input type="text" class="input-doc-codigo" 
                       placeholder="Ex: 2601509345"
                       value="${codigo}"
                       data-id="${id}">
                <input type="date" class="input-doc-data" 
                       value="${dataConvertida}"
                       data-id="${id}">
                <button type="button" class="btn-remover-doc" onclick="removerLinhaDocumentoMultiplo(${id})" title="Remover linha">
                    ✕
                </button>
            `;
            container.appendChild(div);
        } else {
            const row = rows[index];
            const rowId = parseInt(row.dataset.id);
            
            const codigoInput = row.querySelector('.input-doc-codigo');
            const dataInput = row.querySelector('.input-doc-data');
            
            if (codigoInput) {
                codigoInput.value = codigo;
                const linha = linhasDocumentosMultiplos.find(l => l.id === rowId);
                if (linha) linha.codigo = codigo;
            }
            if (dataInput) {
                dataInput.value = dataConvertida;
                const linha = linhasDocumentosMultiplos.find(l => l.id === rowId);
                if (linha) linha.data = dataConvertida;
            }
        }
        
        linhasProcessadas++;
        index++;
    }
    
    rows = container.querySelectorAll('.linha-documento-multiplo');
    for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        const codigo = row.querySelector('.input-doc-codigo')?.value || '';
        const data = row.querySelector('.input-doc-data')?.value || '';
        if (!codigo && !data && i > 0) {
            const rowId = parseInt(row.dataset.id);
            linhasDocumentosMultiplos = linhasDocumentosMultiplos.filter(l => l.id !== rowId);
            row.remove();
        }
    }
    
    setTimeout(() => {
        configurarNavegacaoDocumentosMultiplos();
        configurarPasteDocumentosMultiplos();
        
        const ultimaRow = container.querySelectorAll('.linha-documento-multiplo:last-child');
        if (ultimaRow.length > 0) {
            const ultimoCodigo = ultimaRow[0].querySelector('.input-doc-codigo');
            if (ultimoCodigo) {
                ultimoCodigo.focus();
                ultimoCodigo.select();
            }
        }
    }, 100);
    
    mostrarToast(`✅ ${linhasProcessadas} documentos colados com sucesso!`, 'sucesso');
}

// ============================================
// CARREGAR CONTROLE NO FORMULÁRIO
// ============================================

async function carregarControleFormulario() {
    const params = new URLSearchParams(window.location.search);
    const numero = params.get('numero');
    const tipo = params.get('tipo') || 'pendencia';
    
    tipoAtual = tipo;
    
    if (!numero) {
        mostrarToast('⚠️ Controle não encontrado', 'erro');
        window.location.href = 'index.html';
        return;
    }
    
    console.log(`📋 Carregando controle #${numero} (${tipoAtual})`);
    
    const tipoInfo = TIPOS[tipoAtual];
    
    const tituloEl = document.getElementById('formTitulo');
    if (tituloEl) {
        tituloEl.textContent = `${tipoInfo.icon} ${tipoInfo.label}`;
    }
    
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isFarol = tipoAtual === 'farol';
    const isDevolucao = tipoAtual === 'devolucao';
    const isPendencia = tipoAtual === 'pendencia';
    const isMovimento = tipoAtual === 'movimento';
    const temItens = tipoInfo.temItens;
    
    const camposComuns = document.getElementById('camposComuns');
    if (camposComuns) camposComuns.style.display = '';
    
    // Mostrar campo data_programacao para todos, exceto movimento
    const campoDataProgramacao = document.getElementById('campoDataProgramacao');
    if (campoDataProgramacao) {
        if (!isMovimento) {
            campoDataProgramacao.style.display = '';
        } else {
            campoDataProgramacao.style.display = 'none';
        }
    }
    
    const camposAditivoFisico = document.getElementById('camposAditivoFisico');
    if (camposAditivoFisico) camposAditivoFisico.style.display = isAditivoFisico ? '' : 'none';
    
    const camposFarol = document.getElementById('camposFarol');
    if (camposFarol) camposFarol.style.display = isFarol ? '' : 'none';
    
    const camposDevolucao = document.getElementById('camposDevolucao');
    if (camposDevolucao) camposDevolucao.style.display = isDevolucao ? '' : 'none';
    
    const camposMovimento = document.getElementById('camposMovimento');
    if (camposMovimento) camposMovimento.style.display = isMovimento ? '' : 'none';
    
    const campoObservacaoGeral = document.getElementById('campoObservacaoGeral');
    if (campoObservacaoGeral) campoObservacaoGeral.style.display = isFarol ? '' : 'none';
    
    const secaoItens = document.getElementById('secaoItens');
    if (secaoItens) {
        secaoItens.style.display = temItens ? '' : 'none';
    }
    
    const tituloItens = document.getElementById('tituloItens');
    if (tituloItens) {
        if (isAditivoFisico) {
            tituloItens.textContent = '🔧 Itens do Aditivo Físico';
        } else if (isAditivo) {
            tituloItens.textContent = '📝 Itens do Aditivo Sistêmico';
        } else if (isPendencia) {
            tituloItens.textContent = '📦 Itens Pendentes';
        } else {
            tituloItens.textContent = '📦 Itens';
        }
    }
    
    document.querySelectorAll('.col-status-aditivo').forEach(el => {
        if (el) el.style.display = isAditivo ? '' : 'none';
    });
    document.querySelectorAll('.col-num-doc').forEach(el => {
        if (el) el.style.display = isAditivo ? '' : 'none';
    });
    document.querySelectorAll('.col-usuario').forEach(el => {
        if (el) el.style.display = isAditivo ? '' : 'none';
    });
    document.querySelectorAll('.col-observacao').forEach(el => {
        if (el) el.style.display = isAditivo ? '' : 'none';
    });
    
    const thStatus = document.getElementById('thStatusAditivo');
    const thNumDoc = document.getElementById('thNumDoc');
    const thUsuario = document.getElementById('thUsuario');
    const thObservacao = document.getElementById('thObservacao');
    
    if (thStatus) thStatus.style.display = isAditivo ? '' : 'none';
    if (thNumDoc) thNumDoc.style.display = isAditivo ? '' : 'none';
    if (thUsuario) thUsuario.style.display = isAditivo ? '' : 'none';
    if (thObservacao) thObservacao.style.display = isAditivo ? '' : 'none';
    
    document.querySelectorAll('.col-aplicado').forEach(el => {
        if (el) el.style.display = isAditivoFisico ? '' : 'none';
    });
    document.querySelectorAll('.col-colaborador').forEach(el => {
        if (el) el.style.display = isAditivoFisico ? '' : 'none';
    });
    document.querySelectorAll('.col-encarregado').forEach(el => {
        if (el) el.style.display = isAditivoFisico ? '' : 'none';
    });
    
    const thAplicado = document.getElementById('thAplicado');
    const thColaborador = document.getElementById('thColaborador');
    const thEncarregado = document.getElementById('thEncarregado');
    
    if (thAplicado) thAplicado.style.display = isAditivoFisico ? '' : 'none';
    if (thColaborador) thColaborador.style.display = isAditivoFisico ? '' : 'none';
    if (thEncarregado) thEncarregado.style.display = isAditivoFisico ? '' : 'none';
    
    document.querySelectorAll('.col-data-baixa').forEach(el => {
        if (el) el.style.display = isPendencia ? '' : 'none';
    });
    document.querySelectorAll('.col-baixado').forEach(el => {
        if (el) el.style.display = isPendencia ? '' : 'none';
    });
    document.querySelectorAll('.col-motivo').forEach(el => {
        if (el) el.style.display = isPendencia ? '' : 'none';
    });
    document.querySelectorAll('.col-colaborador-item').forEach(el => {
        if (el) el.style.display = isPendencia ? '' : 'none';
    });
    document.querySelectorAll('.col-observacao-item').forEach(el => {
        if (el) el.style.display = isPendencia ? '' : 'none';
    });
    
    const thDataBaixa = document.getElementById('thDataBaixa');
    const thBaixado = document.getElementById('thBaixado');
    const thMotivo = document.getElementById('thMotivo');
    const thColaboradorItem = document.getElementById('thColaboradorItem');
    const thObservacaoItem = document.getElementById('thObservacaoItem');
    
    if (thDataBaixa) thDataBaixa.style.display = isPendencia ? '' : 'none';
    if (thBaixado) thBaixado.style.display = isPendencia ? '' : 'none';
    if (thMotivo) thMotivo.style.display = isPendencia ? '' : 'none';
    if (thColaboradorItem) thColaboradorItem.style.display = isPendencia ? '' : 'none';
    if (thObservacaoItem) thObservacaoItem.style.display = isPendencia ? '' : 'none';
    
    const formTipo = document.getElementById('formTipo');
    if (formTipo) formTipo.value = tipoInfo.label;
    
    try {
        const url = `${API_URL}${tipoInfo.endpoint}/${numero}`;
        console.log(`🌐 Buscando: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Controle não encontrado');
        }
        
        const data = await response.json();
        controleAtual = data;
        
        console.log('📋 Controle carregado:', data);
        
        const controleNumero = document.getElementById('controleNumero');
        const controleStatus = document.getElementById('controleStatus');
        
        if (controleNumero) controleNumero.textContent = `#${String(data.numero).padStart(4, '0')}`;
        if (controleStatus) {
            controleStatus.textContent = data.status === 'FINALIZADO' ? '✅ FINALIZADO' : '⏳ PENDENTE';
            controleStatus.style.color = data.status === 'FINALIZADO' ? '#48BB78' : '#ED8936';
        }
        
        const formObra = document.getElementById('formObra');
        const formDataProgramacao = document.getElementById('formDataProgramacao');
        
        if (formObra) formObra.value = data.obra || '';
        
        // CARREGAR DATA DE PROGRAMAÇÃO PARA TODOS OS TIPOS (EXCETO MOVIMENTO)
        if (formDataProgramacao && !isMovimento) {
            formDataProgramacao.value = data.data_programacao || '';
        }
        
        if (isAditivoFisico) {
            const formTipoAditivoFisico = document.getElementById('formTipoAditivoFisico');
            const formDataExecucao = document.getElementById('formDataExecucao');
            
            if (formTipoAditivoFisico) {
                formTipoAditivoFisico.value = data.tipo || 'SAÍDA';
            }
            
            if (formDataExecucao) {
                let dataExecucao = '';
                if (data.itens && data.itens.length > 0 && data.itens[0].data_execucao) {
                    dataExecucao = data.itens[0].data_execucao;
                }
                formDataExecucao.value = dataExecucao.split(' ')[0] || '';
            }
        }
        
        if (isFarol) {
            const formSetor = document.getElementById('formSetor');
            const formDataRecebimento = document.getElementById('formDataRecebimento');
            const formSeparador = document.getElementById('formSeparador');
            const formDataSeparacao = document.getElementById('formDataSeparacao');
            const formObraTeveSaida = document.getElementById('formObraTeveSaida');
            const formDataSaida = document.getElementById('formDataSaida');
            const formAditivo = document.getElementById('formAditivo');
            const formObraProgramada = document.getElementById('formObraProgramada');
            const formDevolvida = document.getElementById('formDevolvida');
            const formCancelada = document.getElementById('formCancelada');
            const formObservacaoGeral = document.getElementById('formObservacaoGeral');
            
            if (formSetor) formSetor.value = data.setor || '';
            if (formDataRecebimento) formDataRecebimento.value = data.data_recebimento || '';
            if (formSeparador) formSeparador.value = data.separador || '';
            if (formDataSeparacao) formDataSeparacao.value = data.data_separacao || '';
            if (formObraTeveSaida) formObraTeveSaida.value = data.obra_teve_saida || 'NÃO';
            if (formDataSaida) formDataSaida.value = data.data_saida || '';
            if (formAditivo) formAditivo.value = data.aditivo || 'NÃO';
            if (formObraProgramada) formObraProgramada.value = data.obra_programada || 'NÃO';
            if (formDevolvida) formDevolvida.value = data.devolvida || 'NÃO';
            if (formCancelada) formCancelada.value = data.cancelada || 'NÃO';
            if (formObservacaoGeral) formObservacaoGeral.value = data.observacao || '';
        }
        
        if (isDevolucao) {
            const formDataDescarga = document.getElementById('formDataDescarga');
            const formEncarregado = document.getElementById('formEncarregado');
            const formDataDevolucaoFisica = document.getElementById('formDataDevolucaoFisica');
            const formMotivoPendencia = document.getElementById('formMotivoPendencia');
            const formSolucaoPendencia = document.getElementById('formSolucaoPendencia');
            const formPendenciaPor = document.getElementById('formPendenciaPor');
            const formObservacaoDevolucao = document.getElementById('formObservacaoDevolucao');
            
            if (formDataDescarga) formDataDescarga.value = data.data_descarga || '';
            if (formEncarregado) formEncarregado.value = data.encarregado || '';
            if (formDataDevolucaoFisica) formDataDevolucaoFisica.value = data.data_devolucao_fisica || '';
            if (formMotivoPendencia) formMotivoPendencia.value = data.motivo_pendencia || '';
            if (formSolucaoPendencia) formSolucaoPendencia.value = data.solucao_pendencia || '';
            if (formPendenciaPor) formPendenciaPor.value = data.pendencia_por || '';
            if (formObservacaoDevolucao) formObservacaoDevolucao.value = data.observacao || '';
        }
        
        // ============================================
        // MOVIMENTO
        // ============================================
        if (isMovimento) {
            const formTipoMovimento = document.getElementById('formTipoMovimento');
            const formCodMovimentacao = document.getElementById('formCodMovimentacao');
            const formDataUnica = document.getElementById('formDataUnica');
            
            if (formTipoMovimento) formTipoMovimento.value = data.tipo_movimento || 'RMA';
            
            const tipoMgm = data.tipo_mgm || 'UNICO';
            const radios = document.querySelectorAll('input[name="tipoMgm"]');
            radios.forEach(r => {
                r.checked = r.value === tipoMgm;
            });
            
            const container = document.getElementById('containerDocumentosMultiplos');
            if (container) container.innerHTML = '';
            linhasDocumentosMultiplos = [];
            
            if (tipoMgm === 'MULTIPLO') {
                let documentos = [];
                const documentosSet = new Set();
                
                if (data.documentos && Array.isArray(data.documentos) && data.documentos.length > 0) {
                    data.documentos.forEach(doc => {
                        const chave = `${doc.cod_movimentacao || doc.codigo || ''}|${doc.data_programacao || doc.data || ''}`;
                        if (!documentosSet.has(chave)) {
                            documentosSet.add(chave);
                            documentos.push({
                                cod_movimentacao: doc.cod_movimentacao || doc.codigo || '',
                                data_programacao: doc.data_programacao || doc.data || ''
                            });
                        }
                    });
                } else if (data._linhas && Array.isArray(data._linhas) && data._linhas.length > 0) {
                    data._linhas.forEach(doc => {
                        const chave = `${doc.cod_movimentacao || doc.codigo || ''}|${doc.data_programacao || doc.data || ''}`;
                        if (!documentosSet.has(chave)) {
                            documentosSet.add(chave);
                            documentos.push({
                                cod_movimentacao: doc.cod_movimentacao || doc.codigo || '',
                                data_programacao: doc.data_programacao || doc.data || ''
                            });
                        }
                    });
                } else if (data.datas_programacao && Array.isArray(data.datas_programacao) && data.datas_programacao.length > 0) {
                    const codMov = data.cod_movimentacao || '';
                    data.datas_programacao.forEach(d => {
                        const chave = `${codMov}|${d}`;
                        if (!documentosSet.has(chave)) {
                            documentosSet.add(chave);
                            documentos.push({
                                cod_movimentacao: codMov,
                                data_programacao: d
                            });
                        }
                    });
                } else if (data.data_programacao) {
                    const codMov = data.cod_movimentacao || '';
                    const chave = `${codMov}|${data.data_programacao}`;
                    if (!documentosSet.has(chave)) {
                        documentosSet.add(chave);
                        documentos.push({
                            cod_movimentacao: codMov,
                            data_programacao: data.data_programacao
                        });
                    }
                } else if (data.cod_movimentacao) {
                    const hoje = new Date().toISOString().split('T')[0];
                    const chave = `${data.cod_movimentacao}|${hoje}`;
                    if (!documentosSet.has(chave)) {
                        documentosSet.add(chave);
                        documentos.push({
                            cod_movimentacao: data.cod_movimentacao,
                            data_programacao: hoje
                        });
                    }
                }
                
                if (documentos.length > 0) {
                    documentos.forEach(doc => {
                        const codigo = doc.cod_movimentacao || '';
                        const dataDoc = doc.data_programacao || '';
                        
                        if (codigo || dataDoc) {
                            const id = Date.now() + Math.random();
                            linhasDocumentosMultiplos.push({ id, codigo, data: dataDoc });
                            
                            const div = document.createElement('div');
                            div.className = 'linha-documento-multiplo';
                            div.dataset.id = id;
                            div.innerHTML = `
                                <input type="text" class="input-doc-codigo" 
                                       placeholder="Ex: 2601509345"
                                       value="${codigo}"
                                       data-id="${id}">
                                <input type="date" class="input-doc-data" 
                                       value="${dataDoc}"
                                       data-id="${id}">
                                <button type="button" class="btn-remover-doc" onclick="removerLinhaDocumentoMultiplo(${id})" title="Remover linha">
                                    ✕
                                </button>
                            `;
                            container.appendChild(div);
                        }
                    });
                }
                
                if (linhasDocumentosMultiplos.length === 0) {
                    adicionarLinhaDocumentoMultiplo();
                }
                
                const secao = document.getElementById('secaoDocumentosMultiplos');
                if (secao) secao.style.display = 'block';
                const campoDataUnica = document.getElementById('campoDataUnica');
                if (campoDataUnica) campoDataUnica.style.display = 'none';
                
                if (formCodMovimentacao) formCodMovimentacao.value = '';
                if (formDataUnica) formDataUnica.value = '';
                
            } else {
                if (formCodMovimentacao) formCodMovimentacao.value = data.cod_movimentacao || '';
                if (formDataUnica) formDataUnica.value = data.data_programacao || '';
                
                const secao = document.getElementById('secaoDocumentosMultiplos');
                if (secao) secao.style.display = 'none';
                const campoDataUnica = document.getElementById('campoDataUnica');
                if (campoDataUnica) campoDataUnica.style.display = 'block';
            }
            
            toggleTipoMgm();
            
            setTimeout(() => {
                configurarNavegacaoDocumentosMultiplos();
                configurarPasteDocumentosMultiplos();
                controlarVisibilidadeDataProgramacao();
            }, 200);
        }
        
        if (data.status === 'FINALIZADO') {
            document.querySelectorAll('#controleForm input, #controleForm select, #controleForm textarea').forEach(el => {
                if (el) el.disabled = true;
            });
            const addItemBtn = document.querySelector('.add-item-btn');
            if (addItemBtn) addItemBtn.style.display = 'none';
            document.querySelectorAll('.remove-item').forEach(el => {
                if (el) el.style.display = 'none';
            });
            const btnSalvar = document.querySelector('.btn-salvar');
            const btnFinalizar = document.querySelector('.btn-finalizar');
            if (btnSalvar) btnSalvar.style.display = 'none';
            if (btnFinalizar) btnFinalizar.style.display = 'none';
        }
        
        if (temItens) {
            carregarItens(data.itens || []);
        } else {
            const tbody = document.getElementById('itemsBody');
            if (tbody) tbody.innerHTML = '';
        }
        
        configurarPopupDescricao();
        configurarNavegacaoTeclado();
        configurarPasteEmMassa();
        adicionarBotoesAcoesMassa();
        setTimeout(configurarValidacaoDuplicados, 200);
        setTimeout(verificarECorrigirDuplicados, 250);
        
    } catch (error) {
        console.error('❌ Erro ao carregar controle:', error);
        mostrarToast('❌ Erro ao carregar controle', 'erro');
    }
}

// ============================================
// NAVEGAÇÃO POR TECLADO (ENTER E SETAS)
// ============================================

function configurarNavegacaoTeclado() {
    const elementos = document.querySelectorAll('#controleForm input:not([readonly]):not([disabled]), #controleForm select:not([disabled]), #controleForm textarea:not([disabled])');
    
    elementos.forEach(function(el) {
        el.removeEventListener('keydown', handleTeclado);
        el.addEventListener('keydown', handleTeclado);
    });
}

function handleTeclado(e) {
    const key = e.key;
    const target = e.target;
    
    if (!isCampoEditavel(target)) return;
    
    const isInTable = target.closest('table');
    const isSelect = target.tagName === 'SELECT';
    
    if (isSelect && /^[1-9]$/.test(key)) {
        e.preventDefault();
        e.stopPropagation();
        
        const numero = parseInt(key);
        const options = Array.from(target.options);
        const targetIndex = numero - 1;
        
        if (targetIndex < options.length) {
            target.selectedIndex = targetIndex;
            target.dispatchEvent(new Event('change', { bubbles: true }));
            
            const optionText = options[targetIndex].text;
            console.log(`🔢 Select navegado: ${numero} → "${optionText}"`);
            
            target.style.borderColor = '#48BB78';
            target.style.boxShadow = '0 0 0 3px rgba(72, 187, 120, 0.2)';
            setTimeout(() => {
                target.style.borderColor = '';
                target.style.boxShadow = '';
            }, 300);
        } else {
            target.style.borderColor = '#FC8181';
            target.style.boxShadow = '0 0 0 3px rgba(252, 129, 129, 0.2)';
            setTimeout(() => {
                target.style.borderColor = '';
                target.style.boxShadow = '';
            }, 500);
            console.log(`⚠️ Apenas ${options.length} opções disponíveis`);
        }
        return;
    }
    
    if (key === 'Enter') {
        e.preventDefault();
        
        if (target.tagName === 'TEXTAREA') {
            if (e.shiftKey) {
                return;
            }
        }
        
        if (isInTable) {
            const proximo = navegarParaProximoCampoAbaixo(target);
            if (!proximo) {
                adicionarLinhaItem();
                setTimeout(() => {
                    const novasLinhas = document.querySelectorAll('#itemsBody tr');
                    const ultimaLinha = novasLinhas[novasLinhas.length - 1];
                    if (ultimaLinha) {
                        const primeiroCampo = ultimaLinha.querySelector('.item-codigo');
                        if (primeiroCampo && isCampoEditavel(primeiroCampo)) {
                            primeiroCampo.focus();
                            primeiroCampo.select();
                        }
                    }
                }, 50);
            }
            return;
        }
        
        navegarVerticalFormulario(target, 1);
        return;
    }
    
    if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        const direcao = key === 'ArrowDown' ? 1 : -1;
        
        if (isInTable) {
            navegarVerticalTabela(target, direcao);
            return;
        }
        
        navegarVerticalFormulario(target, direcao);
        return;
    }
    
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
        if (isInTable) {
            e.preventDefault();
            navegarHorizontalTabela(target, key === 'ArrowRight' ? 1 : -1);
        }
        return;
    }
}

// ============================================
// NAVEGAÇÃO PARA O CAMPO ABAIXO (ENTER)
// ============================================

function navegarParaProximoCampoAbaixo(element) {
    const row = element.closest('tr');
    if (!row) return null;
    
    const table = element.closest('table');
    if (!table) return null;
    
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const currentRowIndex = rows.indexOf(row);
    if (currentRowIndex === -1) return null;
    
    const cells = Array.from(row.querySelectorAll('td'));
    let targetCellIndex = -1;
    
    cells.forEach((cell, idx) => {
        const inputs = cell.querySelectorAll('input, select, textarea');
        inputs.forEach(inp => {
            if (inp === element) {
                targetCellIndex = idx;
            }
        });
    });
    
    if (targetCellIndex === -1) return null;
    
    const nextRowIndex = currentRowIndex + 1;
    if (nextRowIndex >= rows.length) return null;
    
    const nextRow = rows[nextRowIndex];
    const nextCells = nextRow.querySelectorAll('td');
    
    if (targetCellIndex >= nextCells.length) return null;
    
    const targetCell = nextCells[targetCellIndex];
    const targetInput = targetCell.querySelector('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    
    if (targetInput && isCampoEditavel(targetInput)) {
        targetInput.focus();
        if (targetInput.tagName === 'INPUT' && targetInput.type === 'text') {
            targetInput.select();
        }
        return targetInput;
    }
    
    const allInputs = nextRow.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    if (allInputs.length > 0) {
        const firstEditable = allInputs[0];
        if (isCampoEditavel(firstEditable)) {
            firstEditable.focus();
            if (firstEditable.tagName === 'INPUT' && firstEditable.type === 'text') {
                firstEditable.select();
            }
            return firstEditable;
        }
    }
    
    return null;
}

function avancarParaProximoCampo(currentElement) {
    const visiveis = getElementosEditaveis(document.getElementById('controleForm'));
    const currentIndex = visiveis.indexOf(currentElement);
    
    if (currentIndex === -1 || currentIndex === visiveis.length - 1) {
        return;
    }
    
    const proximo = visiveis[currentIndex + 1];
    if (proximo) {
        proximo.focus();
        if (proximo.tagName === 'INPUT' && proximo.type === 'text') {
            proximo.select();
        }
    }
}

function navegarVerticalFormulario(element, direcao) {
    const visiveis = getElementosEditaveis(document.getElementById('controleForm'));
    const currentIndex = visiveis.indexOf(element);
    if (currentIndex === -1) return;
    
    const rect = element.getBoundingClientRect();
    const centroY = rect.top + rect.height / 2;
    
    let melhorElemento = null;
    let melhorDistancia = Infinity;
    
    for (let i = 0; i < visiveis.length; i++) {
        if (i === currentIndex) continue;
        
        const outroRect = visiveis[i].getBoundingClientRect();
        const outroCentroY = outroRect.top + outroRect.height / 2;
        
        if (direcao === 1 && outroCentroY <= centroY + 5) continue;
        if (direcao === -1 && outroCentroY >= centroY - 5) continue;
        
        const diffY = Math.abs(outroCentroY - centroY);
        const diffX = Math.abs(outroRect.left - rect.left);
        const distancia = diffY * 2 + diffX * 0.5;
        
        if (distancia < melhorDistancia) {
            melhorDistancia = distancia;
            melhorElemento = visiveis[i];
        }
    }
    
    if (melhorElemento) {
        melhorElemento.focus();
        if (melhorElemento.tagName === 'INPUT' && melhorElemento.type === 'text') {
            melhorElemento.select();
        }
    }
}

function navegarVerticalTabela(element, direcao) {
    const row = element.closest('tr');
    if (!row) return;
    
    const table = element.closest('table');
    if (!table) return;
    
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const currentRowIndex = rows.indexOf(row);
    if (currentRowIndex === -1) return;
    
    const targetRowIndex = currentRowIndex + direcao;
    if (targetRowIndex < 0 || targetRowIndex >= rows.length) return;
    
    const targetRow = rows[targetRowIndex];
    
    const cells = Array.from(row.querySelectorAll('td'));
    let targetCellIndex = -1;
    
    cells.forEach((cell, idx) => {
        const inputs = cell.querySelectorAll('input, select, textarea');
        inputs.forEach(inp => {
            if (inp === element) {
                targetCellIndex = idx;
            }
        });
    });
    
    if (targetCellIndex === -1) {
        const firstInput = targetRow.querySelector('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (firstInput && isCampoEditavel(firstInput)) {
            firstInput.focus();
        }
        return;
    }
    
    const targetCells = targetRow.querySelectorAll('td');
    if (targetCellIndex >= targetCells.length) {
        const firstInput = targetRow.querySelector('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (firstInput && isCampoEditavel(firstInput)) {
            firstInput.focus();
        }
        return;
    }
    
    const targetCell = targetCells[targetCellIndex];
    const targetInput = targetCell.querySelector('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    
    if (targetInput && isCampoEditavel(targetInput)) {
        targetInput.focus();
        if (targetInput.tagName === 'INPUT' && targetInput.type === 'text') {
            targetInput.select();
        }
    } else {
        const allInputs = targetRow.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (allInputs.length > 0) {
            allInputs[0].focus();
        }
    }
}

function navegarHorizontalTabela(element, direcao) {
    const row = element.closest('tr');
    if (!row) return;
    
    const celulasEditaveis = [];
    const cells = Array.from(row.querySelectorAll('td'));
    
    cells.forEach((cell) => {
        const inputs = cell.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        inputs.forEach(inp => {
            if (isCampoEditavel(inp)) {
                celulasEditaveis.push({
                    elemento: inp,
                    celula: cell,
                    indice: celulasEditaveis.length
                });
            }
        });
    });
    
    let currentIndex = -1;
    celulasEditaveis.forEach((item, idx) => {
        if (item.elemento === element) {
            currentIndex = idx;
        }
    });
    
    if (currentIndex === -1) return;
    
    const targetIndex = currentIndex + direcao;
    if (targetIndex < 0 || targetIndex >= celulasEditaveis.length) return;
    
    const target = celulasEditaveis[targetIndex].elemento;
    if (target && isCampoEditavel(target)) {
        target.focus();
        if (target.tagName === 'INPUT' && target.type === 'text') {
            target.select();
        }
    }
}

// ============================================
// COLEÇÃO EM MASSA (BULK PASTE) - POR COLUNA
// ============================================

function configurarPasteEmMassa() {
    const campos = document.querySelectorAll('#itemsBody input:not([readonly]):not([disabled]), #itemsBody select:not([disabled])');
    
    campos.forEach(function(campo) {
        if (campo.classList.contains('item-descricao') || campo.classList.contains('item-unidade')) {
            return;
        }
        
        if (campo.classList.contains('item-colaborador-item')) {
            return;
        }
        
        if (campo._pasteConfigurado) return;
        campo._pasteConfigurado = true;
        
        campo.removeEventListener('paste', handlePasteEmMassa);
        campo.addEventListener('paste', handlePasteEmMassa);
    });
}

function handlePasteEmMassa(e) {
    const target = e.target;
    
    if (!isCampoEditavel(target)) return;
    
    if (target.classList.contains('item-descricao') || target.classList.contains('item-unidade')) {
        return;
    }
    
    if (target.classList.contains('item-colaborador-item')) {
        return;
    }
    
    const dados = e.clipboardData || window.clipboardData;
    if (!dados) return;
    
    const texto = dados.getData('text/plain');
    if (!texto || texto.trim() === '') return;
    
    const linhas = texto.split('\n').filter(line => line.trim() !== '');
    
    if (linhas.length <= 1) {
        return;
    }
    
    e.preventDefault();
    processarPasteEmMassa(linhas, target);
}

function processarPasteEmMassa(linhas, elementoAlvo) {
    console.log(`📋 Processando ${linhas.length} linhas coladas na coluna:`, elementoAlvo);
    
    const isCodigoColumn = elementoAlvo.classList.contains('item-codigo');
    const isAditivoSistemico = tipoAtual === 'aditivo';
    
    if (isCodigoColumn && !isAditivoSistemico) {
        const duplicados = validarDuplicadosNoPaste(linhas, elementoAlvo);
        if (duplicados.length > 0) {
            mostrarToast(`⚠️ Códigos duplicados encontrados: ${duplicados.join(', ')}`, 'erro');
            return;
        }
    }
    
    if (isCodigoColumn && isAditivoSistemico) {
        const duplicados = validarDuplicadosNoPaste(linhas, elementoAlvo);
        if (duplicados.length > 0) {
            mostrarToast(`ℹ️ Códigos duplicados: ${duplicados.join(', ')} (permitido em Aditivo Sistêmico)`, 'info');
        }
    }
    
    const classesAlvo = Array.from(elementoAlvo.classList);
    let classeAlvo = '';
    
    const mapeamentoColunas = {
        'item-codigo': 'codigo',
        'item-quantidade': 'quantidade',
        'item-motivo': 'motivo',
        'item-observacao-item': 'observacao_item',
        'item-baixado': 'baixado',
        'item-data-baixa': 'data_baixa',
        'item-status-aditivo': 'status_aditivo',
        'item-num-doc': 'numero_documento',
        'item-usuario': 'usuario',
        'item-observacao': 'observacao',
        'item-aplicado': 'aplicado',
        'item-colaborador': 'colaborador_solicitante',
        'item-encarregado': 'encarregado_obra'
    };
    
    for (const classe of classesAlvo) {
        if (mapeamentoColunas[classe]) {
            classeAlvo = classe;
            break;
        }
    }
    
    if (!classeAlvo) {
        console.warn('⚠️ Coluna não identificada para:', elementoAlvo);
        return;
    }
    
    const linhaAtual = elementoAlvo.closest('tr');
    const tbody = document.getElementById('itemsBody');
    const todasLinhas = tbody.querySelectorAll('tr');
    
    const codigoAtual = linhaAtual.querySelector('.item-codigo').value.trim();
    const descricaoAtual = linhaAtual.querySelector('.item-descricao').value.trim();
    const quantidadeAtual = linhaAtual.querySelector('.item-quantidade').value.trim();
    
    const linhaVazia = codigoAtual === '' && descricaoAtual === '' && quantidadeAtual === '';
    
    let indiceAtual = Array.from(todasLinhas).indexOf(linhaAtual);
    if (indiceAtual === -1) indiceAtual = todasLinhas.length - 1;
    
    let primeiroIndice = indiceAtual;
    
    if (!linhaVazia) {
        const campoAtual = linhaAtual.querySelector(`.${classeAlvo}`);
        const valorAtual = campoAtual ? campoAtual.value.trim() : '';
        
        if (valorAtual === '' && codigoAtual !== '') {
            primeiroIndice = indiceAtual;
        } else {
            primeiroIndice = indiceAtual + 1;
            adicionarLinhaItem();
            const novasLinhas = tbody.querySelectorAll('tr');
            linhaAtual = novasLinhas[primeiroIndice];
        }
    }
    
    let linhaAtualIndex = primeiroIndice;
    
    for (let i = 0; i < linhas.length; i++) {
        let valor = linhas[i].trim();
        if (valor === '') continue;
        
        const linhasAtuais = tbody.querySelectorAll('tr');
        if (linhaAtualIndex >= linhasAtuais.length) {
            adicionarLinhaItem();
        }
        
        const linha = tbody.querySelectorAll('tr')[linhaAtualIndex];
        if (!linha) continue;
        
        const campo = linha.querySelector(`.${classeAlvo}`);
        
        if (campo && isCampoEditavel(campo)) {
            if (campo.tagName === 'SELECT') {
                const opcoes = Array.from(campo.options).map(opt => opt.value);
                if (opcoes.includes(valor)) {
                    campo.value = valor;
                } else {
                    const opcaoPorTexto = Array.from(campo.options).find(opt => 
                        opt.text.trim().toUpperCase() === valor.toUpperCase() ||
                        opt.text.trim().includes(valor)
                    );
                    if (opcaoPorTexto) {
                        campo.value = opcaoPorTexto.value;
                    }
                }
            } else {
                if (campo.type === 'number') {
                    let valorNumerico = valor.replace(',', '.');
                    valorNumerico = valorNumerico.replace(/[^0-9.-]/g, '');
                    const numero = parseFloat(valorNumerico);
                    if (!isNaN(numero)) {
                        campo.value = numero;
                    } else {
                        campo.value = valor;
                    }
                } else if (campo.type === 'date') {
                    const dataFormatada = formatarData(valor);
                    campo.value = dataFormatada;
                } else {
                    campo.value = valor;
                }
            }
            
            campo.dispatchEvent(new Event('change', { bubbles: true }));
            
            if (classeAlvo === 'item-codigo') {
                buscarMaterial(campo);
            }
        }
        
        linhaAtualIndex++;
    }
    
    const linhasFinais = tbody.querySelectorAll('tr');
    for (let i = linhasFinais.length - 1; i >= linhaAtualIndex; i--) {
        const linha = linhasFinais[i];
        const codigo = linha.querySelector('.item-codigo').value.trim();
        const descricao = linha.querySelector('.item-descricao').value.trim();
        const quantidade = linha.querySelector('.item-quantidade').value.trim();
        
        if (codigo === '' && descricao === '' && quantidade === '') {
            if (tbody.children.length > 1) {
                linha.remove();
            }
        }
    }
    
    setTimeout(configurarNavegacaoTeclado, 100);
    setTimeout(configurarPopupDescricao, 100);
    setTimeout(configurarPasteEmMassa, 100);
    setTimeout(adicionarBotoesAcoesMassa, 100);
    setTimeout(configurarValidacaoDuplicados, 150);
    setTimeout(verificarECorrigirDuplicados, 200);
    setTimeout(atualizarNavegacaoSelects, 150);
    
    setTimeout(() => {
        elementoAlvo.focus();
        if (elementoAlvo.tagName === 'INPUT' && elementoAlvo.type === 'text') {
            elementoAlvo.select();
        }
    }, 200);
    
    mostrarToast(`✅ ${linhas.length} valores aplicados na coluna`, 'sucesso');
}

// ============================================
// FUNÇÃO AUXILIAR PARA FORMATAR DATA
// ============================================

function formatarData(valor) {
    const data = new Date(valor);
    if (!isNaN(data.getTime())) {
        return data.toISOString().split('T')[0];
    }
    
    const partes = valor.split('/');
    if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const ano = partes[2];
        if (ano.length === 4) {
            return `${ano}-${mes}-${dia}`;
        }
    }
    
    const partes2 = valor.split('-');
    if (partes2.length === 3) {
        const dia = partes2[0].padStart(2, '0');
        const mes = partes2[1].padStart(2, '0');
        const ano = partes2[2];
        if (ano.length === 4) {
            return `${ano}-${mes}-${dia}`;
        }
    }
    
    return valor;
}

// ============================================
// AÇÕES EM MASSA (BULK ACTIONS)
// ============================================

function adicionarBotoesAcoesMassa() {
    let container = document.getElementById('bulkActionsContainer');
    if (container) {
        container.remove();
    }
    
    const secaoItens = document.getElementById('secaoItens');
    if (!secaoItens) return;
    
    const tipoInfo = TIPOS[tipoAtual];
    if (!tipoInfo || !tipoInfo.temItens) return;
    
    const isPendencia = tipoAtual === 'pendencia';
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    
    const isFinalizado = controleAtual?.status === 'FINALIZADO';
    if (isFinalizado) return;
    
    container = document.createElement('div');
    container.id = 'bulkActionsContainer';
    container.className = 'bulk-actions-container';
    container.style.cssText = `
        background: linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%);
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 16px 24px;
        margin: 15px 0 20px 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    `;
    
    const titulo = document.createElement('span');
    titulo.style.cssText = `
        font-weight: 700;
        color: #2D3748;
        font-size: 0.85em;
        margin-right: 4px;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 6px;
    `;
    titulo.innerHTML = '⚡ Ações em Massa';
    container.appendChild(titulo);
    
    const separadorInicial = document.createElement('span');
    separadorInicial.style.cssText = `
        width: 1px;
        height: 28px;
        background: #CBD5E0;
        display: inline-block;
        margin: 0 4px;
    `;
    container.appendChild(separadorInicial);
    
    if (isPendencia) {
        const grupoBaixar = document.createElement('span');
        grupoBaixar.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        
        const btnBaixarTodos = criarBotaoMassa('✅ Baixar Todos', '#48BB78', function(e) {
            e.preventDefault();
            e.stopPropagation();
            aplicarEmMassaSelect('item-baixado', 'SIM');
        });
        grupoBaixar.appendChild(btnBaixarTodos);
        
        const btnDesbaixarTodos = criarBotaoMassa('⬜ Desbaixar', '#ED8936', function(e) {
            e.preventDefault();
            e.stopPropagation();
            aplicarEmMassaSelect('item-baixado', 'NÃO');
        });
        grupoBaixar.appendChild(btnDesbaixarTodos);
        container.appendChild(grupoBaixar);
        
        container.appendChild(criarSeparadorPequeno());
        
        const grupoMotivo = document.createElement('span');
        grupoMotivo.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const motivoContainer = criarCampoMassa(
            '📝 Motivo:',
            'item-motivo',
            'text',
            'Digite o motivo...',
            function(valor) {
                aplicarEmMassa('item-motivo', valor);
            }
        );
        grupoMotivo.appendChild(motivoContainer);
        container.appendChild(grupoMotivo);
        
        container.appendChild(criarSeparadorPequeno());
        
        const grupoDataBaixa = document.createElement('span');
        grupoDataBaixa.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const dataBaixaContainer = criarCampoMassa(
            '📅 Data Baixa:',
            'item-data-baixa',
            'date',
            'Data...',
            function(valor) {
                aplicarEmMassa('item-data-baixa', valor);
            }
        );
        grupoDataBaixa.appendChild(dataBaixaContainer);
        container.appendChild(grupoDataBaixa);
    }
    
    if (isAditivo) {
        const grupoStatus = document.createElement('span');
        grupoStatus.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const statusContainer = criarSelectMassa(
            '📊 Status:',
            'item-status-aditivo',
            ['ANALISE', 'APROVADO', 'REPROVADO', 'S/ SOLICITAÇÃO'],
            function(valor) {
                aplicarEmMassaSelect('item-status-aditivo', valor);
            },
            {
                'ANALISE': '📊 Análise',
                'APROVADO': '✅ Aprovado',
                'REPROVADO': '❌ Reprovado',
                'S/ SOLICITAÇÃO': '📋 Sem Solicitação'
            }
        );
        grupoStatus.appendChild(statusContainer);
        container.appendChild(grupoStatus);
        
        container.appendChild(criarSeparadorPequeno());
        
        const grupoNumDoc = document.createElement('span');
        grupoNumDoc.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const numDocContainer = criarCampoMassa(
            '📄 Nº Documento:',
            'item-num-doc',
            'text',
            'Digite o número...',
            function(valor) {
                aplicarEmMassa('item-num-doc', valor);
            }
        );
        grupoNumDoc.appendChild(numDocContainer);
        container.appendChild(grupoNumDoc);
        
        container.appendChild(criarSeparadorPequeno());
        
        const grupoObs = document.createElement('span');
        grupoObs.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const obsContainer = criarCampoMassa(
            '📝 Observação:',
            'item-observacao',
            'text',
            'Digite a observação...',
            function(valor) {
                aplicarEmMassa('item-observacao', valor);
            }
        );
        grupoObs.appendChild(obsContainer);
        container.appendChild(grupoObs);
    }
    
    if (isAditivoFisico) {
        const grupoAplicado = document.createElement('span');
        grupoAplicado.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const aplicadoContainer = criarSelectMassa(
            '🔧 Aplicado:',
            'item-aplicado',
            ['PENDENTE', 'NÃO', 'SIM', 'PARCIAL'],
            function(valor) {
                aplicarEmMassaSelect('item-aplicado', valor);
            }
        );
        grupoAplicado.appendChild(aplicadoContainer);
        container.appendChild(grupoAplicado);
        
        container.appendChild(criarSeparadorPequeno());
        
        const grupoSolicitante = document.createElement('span');
        grupoSolicitante.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const colaboradorContainer = criarSelectMassa(
            '👤 Solicitante:',
            'item-colaborador',
            ['', 'MATEUS SANTANA', 'SALES JUNIOR', 'VALENTIM', 'SIVANILDO', 'ERICK VEGA', 'JOSÉ JORDAN', 'ALCIDES', 'FRANCINALDO (DEDÉ)', 'ROMARIO', 'BRENO', 'MAYKE', 'MARIO J.', 'MEYDSON', 'WALISSON'],
            function(valor) {
                aplicarEmMassaSelect('item-colaborador', valor);
            }
        );
        grupoSolicitante.appendChild(colaboradorContainer);
        container.appendChild(grupoSolicitante);
        
        container.appendChild(criarSeparadorPequeno());
        
        const grupoEncarregado = document.createElement('span');
        grupoEncarregado.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const encarregadoContainer = criarSelectMassa(
            '👔 Encarregado:',
            'item-encarregado',
            ['', 'ROMARIO', 'ERIVANIO', 'RIUSTON', 'E. MARCELO', 'BRENO M.', 'FRANCINALDO(DEDÉ)', 'WALISSON', 'VALENTIM', 'LUCIANO', 'MEYDSON', 'PAULÃO', 'DAMIÃO(MIMA)', 'DEMILSON(PIM)', 'JOSÉ JORDAN', 'ALCIDES', 'EDILSON', 'ANTONIO', 'JUNIOR C.', 'MARCOS', 'ANTONIO D.', 'ANDERSON', 'LEANDRO', 'ROBSON', 'MANOEL C.', 'MARCELO (ERITON)'],
            function(valor) {
                aplicarEmMassaSelect('item-encarregado', valor);
            }
        );
        grupoEncarregado.appendChild(encarregadoContainer);
        container.appendChild(grupoEncarregado);
    }
    
    container.appendChild(criarSeparadorPequeno());
    
    const btnLimpar = document.createElement('button');
    btnLimpar.textContent = '🧹 Limpar Qtds';
    btnLimpar.className = 'btn-bulk-action';
    btnLimpar.type = 'button';
    btnLimpar.style.cssText = `
        background: #FC8181;
        color: white;
        border: none;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8em;
        transition: all 0.3s ease;
        white-space: nowrap;
    `;
    btnLimpar.onmouseover = function() {
        this.style.background = '#E53E3E';
        this.style.transform = 'translateY(-1px)';
        this.style.boxShadow = '0 4px 12px rgba(229,62,62,0.3)';
    };
    btnLimpar.onmouseout = function() {
        this.style.background = '#FC8181';
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
    };
    btnLimpar.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('⚠️ Tem certeza que deseja limpar todas as quantidades?')) {
            aplicarEmMassa('item-quantidade', '');
            mostrarToast('🧹 Quantidades limpas!', 'sucesso');
        }
    };
    container.appendChild(btnLimpar);
    
    const table = document.querySelector('.table-responsive');
    if (table) {
        table.parentNode.insertBefore(container, table);
    }
    
    setTimeout(atualizarNavegacaoSelects, 150);
}

function criarSeparadorPequeno() {
    const sep = document.createElement('span');
    sep.style.cssText = `
        width: 1px;
        height: 26px;
        background: #CBD5E0;
        display: inline-block;
        margin: 0 2px;
    `;
    return sep;
}

function criarBotaoMassa(texto, cor, acao) {
    const btn = document.createElement('button');
    btn.textContent = texto;
    btn.className = 'btn-bulk-action';
    btn.type = 'button';
    btn.style.cssText = `
        background: ${cor};
        color: white;
        border: none;
        padding: 5px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8em;
        transition: all 0.3s ease;
        white-space: nowrap;
    `;
    btn.onmouseover = function() {
        this.style.transform = 'translateY(-1px)';
        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    };
    btn.onmouseout = function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
    };
    btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        acao(e);
    };
    return btn;
}

function criarCampoMassa(label, classe, tipo, placeholder, acao) {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
    `;
    
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = `
        font-size: 0.75em;
        font-weight: 600;
        color: #4A5568;
        white-space: nowrap;
    `;
    container.appendChild(lbl);
    
    const input = document.createElement('input');
    input.type = tipo;
    input.placeholder = placeholder;
    input.className = 'bulk-input';
    input.style.cssText = `
        padding: 4px 10px;
        border: 2px solid #E2E8F0;
        border-radius: 6px;
        font-size: 0.8em;
        width: 130px;
        transition: all 0.3s ease;
        background: white;
        height: 30px;
        box-sizing: border-box;
    `;
    
    if (classe === 'item-quantidade') {
        input.step = 'any';
        input.inputMode = 'decimal';
        input.placeholder = 'Ex: 1,25 ou 0,75';
    }
    
    input.onfocus = function() {
        this.style.borderColor = '#4299E1';
        this.style.boxShadow = '0 0 0 3px rgba(66,153,225,0.1)';
    };
    input.onblur = function() {
        this.style.borderColor = '#E2E8F0';
        this.style.boxShadow = 'none';
    };
    
    const btn = document.createElement('button');
    btn.textContent = 'Aplicar';
    btn.type = 'button';
    btn.style.cssText = `
        background: #4299E1;
        color: white;
        border: none;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.75em;
        transition: all 0.3s ease;
        white-space: nowrap;
        height: 30px;
    `;
    btn.onmouseover = function() {
        this.style.background = '#3182CE';
    };
    btn.onmouseout = function() {
        this.style.background = '#4299E1';
    };
    btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        let valor = input.value.trim();
        if (valor !== '') {
            if (classe === 'item-quantidade') {
                valor = valor.replace(',', '.');
            }
            acao(valor);
            input.value = '';
            mostrarToast(`✅ Aplicado "${valor}" para todos`, 'sucesso');
        } else {
            mostrarToast('⚠️ Digite um valor', 'aviso');
        }
    };
    
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            btn.click();
        }
    });
    
    container.appendChild(input);
    container.appendChild(btn);
    
    return container;
}

function criarSelectMassa(label, classe, opcoes, acao, labelsPersonalizados) {
    const container = document.createElement('div');
    container.style.cssText = `
        display: flex;
        align-items: center;
        gap: 4px;
    `;
    
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = `
        font-size: 0.75em;
        font-weight: 600;
        color: #4A5568;
        white-space: nowrap;
    `;
    container.appendChild(lbl);
    
    const select = document.createElement('select');
    select.className = 'bulk-select';
    select.style.cssText = `
        padding: 2px 8px;
        border: 2px solid #E2E8F0;
        border-radius: 6px;
        font-size: 0.8em;
        min-width: 100px;
        background: white;
        transition: all 0.3s ease;
        height: 30px;
        box-sizing: border-box;
    `;
    select.onfocus = function() {
        this.style.borderColor = '#4299E1';
        this.style.boxShadow = '0 0 0 3px rgba(66,153,225,0.1)';
    };
    select.onblur = function() {
        this.style.borderColor = '#E2E8F0';
        this.style.boxShadow = 'none';
    };
    
    opcoes.forEach(opcao => {
        const opt = document.createElement('option');
        opt.value = opcao;
        if (labelsPersonalizados && labelsPersonalizados[opcao]) {
            opt.textContent = labelsPersonalizados[opcao];
        } else {
            opt.textContent = opcao || '(vazio)';
        }
        select.appendChild(opt);
    });
    
    const btn = document.createElement('button');
    btn.textContent = 'Aplicar';
    btn.type = 'button';
    btn.style.cssText = `
        background: #4299E1;
        color: white;
        border: none;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.75em;
        transition: all 0.3s ease;
        white-space: nowrap;
        height: 30px;
    `;
    btn.onmouseover = function() {
        this.style.background = '#3182CE';
    };
    btn.onmouseout = function() {
        this.style.background = '#4299E1';
    };
    btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const valor = select.value;
        acao(valor);
        const labelSelecionada = select.options[select.selectedIndex].text;
        mostrarToast(`✅ Aplicado "${labelSelecionada}" para todos`, 'sucesso');
    };
    
    container.appendChild(select);
    container.appendChild(btn);
    
    return container;
}

// ============================================
// FUNÇÕES DE APLICAÇÃO EM MASSA
// ============================================

function aplicarEmMassa(classe, valor) {
    const elementos = document.querySelectorAll(`.${classe}`);
    let contador = 0;
    
    elementos.forEach(el => {
        if (isCampoEditavel(el)) {
            if (el.type === 'number') {
                let valorNumerico = valor.replace(',', '.');
                valorNumerico = valorNumerico.replace(/[^0-9.-]/g, '');
                const numero = parseFloat(valorNumerico);
                if (!isNaN(numero)) {
                    el.value = numero;
                } else {
                    el.value = valor !== '' ? parseFloat(valor) : '';
                }
            } else if (el.type === 'date') {
                const dataFormatada = formatarData(valor);
                el.value = dataFormatada;
            } else {
                el.value = valor;
            }
            el.dispatchEvent(new Event('change', { bubbles: true }));
            contador++;
        }
    });
    
    if (contador > 0) {
        mostrarToast(`✅ ${contador} campos atualizados com "${valor || '(vazio)'}"`, 'sucesso');
    } else {
        mostrarToast('⚠️ Nenhum campo editável encontrado', 'aviso');
    }
    
    console.log(`✅ Aplicado "${valor}" para ${contador} campos da classe "${classe}"`);
}

function aplicarEmMassaSelect(classe, valor) {
    const elementos = document.querySelectorAll(`.${classe}`);
    let contador = 0;
    
    elementos.forEach(el => {
        if (isCampoEditavel(el)) {
            el.value = valor;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            contador++;
        }
    });
    
    if (contador > 0) {
        const labelExibicao = valor || '(vazio)';
        mostrarToast(`✅ ${contador} campos atualizados para "${labelExibicao}"`, 'sucesso');
    } else {
        mostrarToast('⚠️ Nenhum campo editável encontrado', 'aviso');
    }
    
    console.log(`✅ Aplicado "${valor}" para ${contador} selects da classe "${classe}"`);
}

// ============================================
// ADICIONAR LINHA DE ITEM
// ============================================

function adicionarLinhaItem() {
    const tbody = document.getElementById('itemsBody');
    if (!tbody) return;
    
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isPendencia = tipoAtual === 'pendencia';
    const nomeUsuario = getNomeUsuarioLogado();
    
    const tr = document.createElement('tr');
    
    let html = `
        <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" placeholder="Código"></td>
        <td><input type="text" class="item-descricao input-descricao" readonly placeholder="Descrição"></td>
        <td><input type="text" class="item-unidade" readonly placeholder="Unid."></td>
        <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0" step="any"></td>
    `;
    
    if (isPendencia) {
        html += `
            <td class="col-data-baixa">
                <input type="date" class="item-data-baixa">
            </td>
            <td class="col-baixado">
                <select class="item-baixado">
                    <option value="NÃO">NÃO</option>
                    <option value="SIM">SIM</option>
                </select>
            </td>
            <td class="col-motivo">
                <input type="text" class="item-motivo" placeholder="Motivo">
            </td>
            <td class="col-colaborador-item">
                <input type="text" class="item-colaborador-item" value="${nomeUsuario}" readonly style="background-color:#f7fafc;color:#4A5568;cursor:default;">
            </td>
            <td class="col-observacao-item">
                <input type="text" class="item-observacao-item" placeholder="Observação">
            </td>
        `;
    }
    
    if (isAditivo) {
        html += `
            <td class="col-status-aditivo">
                <select class="item-status-aditivo">
                    <option value="ANALISE">📊 Análise</option>
                    <option value="APROVADO">✅ Aprovado</option>
                    <option value="REPROVADO">❌ Reprovado</option>
                    <option value="S/ SOLICITAÇÃO">📋 Sem Solicitação</option>
                </select>
            </td>
            <td class="col-num-doc">
                <input type="text" class="item-num-doc" placeholder="Nº Documento">
            </td>
            <td class="col-usuario">
                <input type="text" class="item-usuario" placeholder="Usuário" value="${nomeUsuario}">
            </td>
            <td class="col-observacao">
                <input type="text" class="item-observacao" placeholder="Observação">
            </td>
        `;
    }
    
    if (isAditivoFisico) {
        html += `
            <td class="col-aplicado">
                <select class="item-aplicado">
                    <option value="PENDENTE" selected>PENDENTE</option>
                    <option value="NÃO">NÃO</option>
                    <option value="SIM">SIM</option>
                    <option value="PARCIAL">PARCIAL</option>
                </select>
            </td>
            <td class="col-colaborador">
                <select class="item-colaborador">
                    <option value="">Selecione...</option>
                    <option value="MATEUS SANTANA">MATEUS SANTANA</option>
                    <option value="SALES JUNIOR">SALES JUNIOR</option>
                    <option value="VALENTIM">VALENTIM</option>
                    <option value="SIVANILDO">SIVANILDO</option>
                    <option value="ERICK VEGA">ERICK VEGA</option>
                    <option value="JOSÉ JORDAN">JOSÉ JORDAN</option>
                    <option value="ALCIDES">ALCIDES</option>
                    <option value="FRANCINALDO (DEDÉ)">FRANCINALDO (DEDÉ)</option>
                    <option value="ROMARIO">ROMARIO</option>
                    <option value="BRENO">BRENO</option>
                    <option value="MAYKE">MAYKE</option>
                    <option value="MARIO J.">MARIO J.</option>
                    <option value="MEYDSON">MEYDSON</option>
                    <option value="WALISSON">WALISSON</option>
                </select>
            </td>
            <td class="col-encarregado">
                <select class="item-encarregado">
                    <option value="">Selecione...</option>
                    <option value="ROMARIO">ROMARIO</option>
                    <option value="ERIVANIO">ERIVANIO</option>
                    <option value="RIUSTON">RIUSTON</option>
                    <option value="E. MARCELO">E. MARCELO</option>
                    <option value="BRENO M.">BRENO M.</option>
                    <option value="FRANCINALDO(DEDÉ)">FRANCINALDO(DEDÉ)</option>
                    <option value="WALISSON">WALISSON</option>
                    <option value="VALENTIM">VALENTIM</option>
                    <option value="LUCIANO">LUCIANO</option>
                    <option value="MEYDSON">MEYDSON</option>
                    <option value="PAULÃO">PAULÃO</option>
                    <option value="DAMIÃO(MIMA)">DAMIÃO(MIMA)</option>
                    <option value="DEMILSON(PIM)">DEMILSON(PIM)</option>
                    <option value="JOSÉ JORDAN">JOSÉ JORDAN</option>
                    <option value="ALCIDES">ALCIDES</option>
                    <option value="EDILSON">EDILSON</option>
                    <option value="ANTONIO">ANTONIO</option>
                    <option value="JUNIOR C.">JUNIOR C.</option>
                    <option value="MARCOS">MARCOS</option>
                    <option value="ANTONIO D.">ANTONIO D.</option>
                    <option value="ANDERSON">ANDERSON</option>
                    <option value="LEANDRO">LEANDRO</option>
                    <option value="ROBSON">ROBSON</option>
                    <option value="MANOEL C.">MANOEL C.</option>
                    <option value="MARCELO (ERITON)">MARCELO (ERITON)</option>
                </select>
            </td>
        `;
    }
    
    html += `
        <td><button class="remove-item" onclick="removerItem(this)" title="Remover item">✕</button></td>
    `;
    
    tr.innerHTML = html;
    tbody.appendChild(tr);
    
    const primeiroInput = tr.querySelector('.item-codigo');
    if (primeiroInput) {
        setTimeout(() => primeiroInput.focus(), 100);
    }
    
    setTimeout(configurarNavegacaoTeclado, 50);
    setTimeout(configurarPopupDescricao, 100);
    setTimeout(configurarPasteEmMassa, 100);
    setTimeout(adicionarBotoesAcoesMassa, 100);
    setTimeout(configurarValidacaoDuplicados, 150);
    setTimeout(atualizarNavegacaoSelects, 150);
}

window.adicionarLinhaItem = adicionarLinhaItem;

// ============================================
// REMOVER ITEM
// ============================================

function removerItem(btn) {
    const tbody = document.getElementById('itemsBody');
    if (!tbody) return;
    if (tbody.children.length <= 1) {
        mostrarToast('⚠️ Deve haver pelo menos um item', 'aviso');
        return;
    }
    const row = btn.closest('tr');
    if (row) row.remove();
    
    setTimeout(configurarNavegacaoTeclado, 50);
    setTimeout(configurarPasteEmMassa, 50);
    setTimeout(adicionarBotoesAcoesMassa, 50);
    setTimeout(configurarValidacaoDuplicados, 100);
    setTimeout(verificarECorrigirDuplicados, 150);
    setTimeout(atualizarNavegacaoSelects, 150);
}

window.removerItem = removerItem;

// ============================================
// CARREGAR ITENS
// ============================================

function carregarItens(itens) {
    const tbody = document.getElementById('itemsBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!itens || itens.length === 0) {
        adicionarLinhaItem();
        return;
    }
    
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isPendencia = tipoAtual === 'pendencia';
    const isFinalizado = controleAtual?.status === 'FINALIZADO';
    const nomeUsuario = getNomeUsuarioLogado();
    
    itens.forEach(item => {
        const tr = document.createElement('tr');
        
        let html = `
            <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" value="${item.codigo || ''}" placeholder="Código" ${isFinalizado ? 'disabled' : ''}></td>
            <td><input type="text" class="item-descricao input-descricao" readonly value="${item.descricao || ''}" placeholder="Descrição"></td>
            <td><input type="text" class="item-unidade" readonly value="${item.unidade || ''}" placeholder="Unid."></td>
            <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0" step="any" value="${item.quantidade || ''}" ${isFinalizado ? 'disabled' : ''}></td>
        `;
        
        if (isPendencia) {
            const colaboradorValue = item.colaborador || nomeUsuario;
            
            html += `
                <td class="col-data-baixa">
                    <input type="date" class="item-data-baixa" value="${item.data_baixa || ''}" ${isFinalizado ? 'disabled' : ''}>
                </td>
                <td class="col-baixado">
                    <select class="item-baixado" ${isFinalizado ? 'disabled' : ''}>
                        <option value="NÃO" ${item.baixado === 'NÃO' ? 'selected' : ''}>NÃO</option>
                        <option value="SIM" ${item.baixado === 'SIM' ? 'selected' : ''}>SIM</option>
                    </select>
                </td>
                <td class="col-motivo">
                    <input type="text" class="item-motivo" value="${item.motivo || ''}" placeholder="Motivo" ${isFinalizado ? 'disabled' : ''}>
                </td>
                <td class="col-colaborador-item">
                    <input type="text" class="item-colaborador-item" value="${colaboradorValue}" readonly style="background-color:#f7fafc;color:#4A5568;cursor:default;">
                </td>
                <td class="col-observacao-item">
                    <input type="text" class="item-observacao-item" value="${item.observacao_item || ''}" placeholder="Observação" ${isFinalizado ? 'disabled' : ''}>
                </td>
            `;
        }
        
        if (isAditivo) {
            const statusValue = item.status_aditivo || 'ANALISE';
            const usuarioItem = item.usuario || nomeUsuario;
            
            html += `
                <td class="col-status-aditivo">
                    <select class="item-status-aditivo" ${isFinalizado ? 'disabled' : ''}>
                        <option value="ANALISE" ${statusValue === 'ANALISE' ? 'selected' : ''}>📊 Análise</option>
                        <option value="APROVADO" ${statusValue === 'APROVADO' ? 'selected' : ''}>✅ Aprovado</option>
                        <option value="REPROVADO" ${statusValue === 'REPROVADO' ? 'selected' : ''}>❌ Reprovado</option>
                        <option value="S/ SOLICITAÇÃO" ${statusValue === 'S/ SOLICITAÇÃO' ? 'selected' : ''}>📋 Sem Solicitação</option>
                    </select>
                </td>
                <td class="col-num-doc">
                    <input type="text" class="item-num-doc" value="${item.numero_documento || ''}" placeholder="Nº Documento" ${isFinalizado ? 'disabled' : ''}>
                </td>
                <td class="col-usuario">
                    <input type="text" class="item-usuario" value="${usuarioItem}" placeholder="Usuário" ${isFinalizado ? 'disabled' : ''}>
                </td>
                <td class="col-observacao">
                    <input type="text" class="item-observacao" value="${item.observacao || ''}" placeholder="Observação" ${isFinalizado ? 'disabled' : ''}>
                </td>
            `;
        }
        
        if (isAditivoFisico) {
            html += `
                <td class="col-aplicado">
                    <select class="item-aplicado" ${isFinalizado ? 'disabled' : ''}>
                        <option value="PENDENTE" ${item.aplicado === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
                        <option value="NÃO" ${item.aplicado === 'NÃO' ? 'selected' : ''}>NÃO</option>
                        <option value="SIM" ${item.aplicado === 'SIM' ? 'selected' : ''}>SIM</option>
                        <option value="PARCIAL" ${item.aplicado === 'PARCIAL' ? 'selected' : ''}>PARCIAL</option>
                    </select>
                </td>
                <td class="col-colaborador">
                    <select class="item-colaborador" ${isFinalizado ? 'disabled' : ''}>
                        <option value="">Selecione...</option>
                        <option value="MATEUS SANTANA" ${item.colaborador_solicitante === 'MATEUS SANTANA' ? 'selected' : ''}>MATEUS SANTANA</option>
                        <option value="SALES JUNIOR" ${item.colaborador_solicitante === 'SALES JUNIOR' ? 'selected' : ''}>SALES JUNIOR</option>
                        <option value="VALENTIM" ${item.colaborador_solicitante === 'VALENTIM' ? 'selected' : ''}>VALENTIM</option>
                        <option value="SIVANILDO" ${item.colaborador_solicitante === 'SIVANILDO' ? 'selected' : ''}>SIVANILDO</option>
                        <option value="ERICK VEGA" ${item.colaborador_solicitante === 'ERICK VEGA' ? 'selected' : ''}>ERICK VEGA</option>
                        <option value="JOSÉ JORDAN" ${item.colaborador_solicitante === 'JOSÉ JORDAN' ? 'selected' : ''}>JOSÉ JORDAN</option>
                        <option value="ALCIDES" ${item.colaborador_solicitante === 'ALCIDES' ? 'selected' : ''}>ALCIDES</option>
                        <option value="FRANCINALDO (DEDÉ)" ${item.colaborador_solicitante === 'FRANCINALDO (DEDÉ)' ? 'selected' : ''}>FRANCINALDO (DEDÉ)</option>
                        <option value="ROMARIO" ${item.colaborador_solicitante === 'ROMARIO' ? 'selected' : ''}>ROMARIO</option>
                        <option value="BRENO" ${item.colaborador_solicitante === 'BRENO' ? 'selected' : ''}>BRENO</option>
                        <option value="MAYKE" ${item.colaborador_solicitante === 'MAYKE' ? 'selected' : ''}>MAYKE</option>
                        <option value="MARIO J." ${item.colaborador_solicitante === 'MARIO J.' ? 'selected' : ''}>MARIO J.</option>
                        <option value="MEYDSON" ${item.colaborador_solicitante === 'MEYDSON' ? 'selected' : ''}>MEYDSON</option>
                        <option value="WALISSON" ${item.colaborador_solicitante === 'WALISSON' ? 'selected' : ''}>WALISSON</option>
                    </select>
                </td>
                <td class="col-encarregado">
                    <select class="item-encarregado" ${isFinalizado ? 'disabled' : ''}>
                        <option value="">Selecione...</option>
                        <option value="ROMARIO" ${item.encarregado_obra === 'ROMARIO' ? 'selected' : ''}>ROMARIO</option>
                        <option value="ERIVANIO" ${item.encarregado_obra === 'ERIVANIO' ? 'selected' : ''}>ERIVANIO</option>
                        <option value="RIUSTON" ${item.encarregado_obra === 'RIUSTON' ? 'selected' : ''}>RIUSTON</option>
                        <option value="E. MARCELO" ${item.encarregado_obra === 'E. MARCELO' ? 'selected' : ''}>E. MARCELO</option>
                        <option value="BRENO M." ${item.encarregado_obra === 'BRENO M.' ? 'selected' : ''}>BRENO M.</option>
                        <option value="FRANCINALDO(DEDÉ)" ${item.encarregado_obra === 'FRANCINALDO(DEDÉ)' ? 'selected' : ''}>FRANCINALDO(DEDÉ)</option>
                        <option value="WALISSON" ${item.encarregado_obra === 'WALISSON' ? 'selected' : ''}>WALISSON</option>
                        <option value="VALENTIM" ${item.encarregado_obra === 'VALENTIM' ? 'selected' : ''}>VALENTIM</option>
                        <option value="LUCIANO" ${item.encarregado_obra === 'LUCIANO' ? 'selected' : ''}>LUCIANO</option>
                        <option value="MEYDSON" ${item.encarregado_obra === 'MEYDSON' ? 'selected' : ''}>MEYDSON</option>
                        <option value="PAULÃO" ${item.encarregado_obra === 'PAULÃO' ? 'selected' : ''}>PAULÃO</option>
                        <option value="DAMIÃO(MIMA)" ${item.encarregado_obra === 'DAMIÃO(MIMA)' ? 'selected' : ''}>DAMIÃO(MIMA)</option>
                        <option value="DEMILSON(PIM)" ${item.encarregado_obra === 'DEMILSON(PIM)' ? 'selected' : ''}>DEMILSON(PIM)</option>
                        <option value="JOSÉ JORDAN" ${item.encarregado_obra === 'JOSÉ JORDAN' ? 'selected' : ''}>JOSÉ JORDAN</option>
                        <option value="ALCIDES" ${item.encarregado_obra === 'ALCIDES' ? 'selected' : ''}>ALCIDES</option>
                        <option value="EDILSON" ${item.encarregado_obra === 'EDILSON' ? 'selected' : ''}>EDILSON</option>
                        <option value="ANTONIO" ${item.encarregado_obra === 'ANTONIO' ? 'selected' : ''}>ANTONIO</option>
                        <option value="JUNIOR C." ${item.encarregado_obra === 'JUNIOR C.' ? 'selected' : ''}>JUNIOR C.</option>
                        <option value="MARCOS" ${item.encarregado_obra === 'MARCOS' ? 'selected' : ''}>MARCOS</option>
                        <option value="ANTONIO D." ${item.encarregado_obra === 'ANTONIO D.' ? 'selected' : ''}>ANTONIO D.</option>
                        <option value="ANDERSON" ${item.encarregado_obra === 'ANDERSON' ? 'selected' : ''}>ANDERSON</option>
                        <option value="LEANDRO" ${item.encarregado_obra === 'LEANDRO' ? 'selected' : ''}>LEANDRO</option>
                        <option value="ROBSON" ${item.encarregado_obra === 'ROBSON' ? 'selected' : ''}>ROBSON</option>
                        <option value="MANOEL C." ${item.encarregado_obra === 'MANOEL C.' ? 'selected' : ''}>MANOEL C.</option>
                        <option value="MARCELO (ERITON)" ${item.encarregado_obra === 'MARCELO (ERITON)' ? 'selected' : ''}>MARCELO (ERITON)</option>
                    </select>
                </td>
            `;
        }
        
        html += `
            <td><button class="remove-item" onclick="removerItem(this)" ${isFinalizado ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} title="Remover item">✕</button></td>
        `;
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
    
    setTimeout(configurarNavegacaoTeclado, 50);
    setTimeout(configurarPopupDescricao, 100);
    setTimeout(configurarPasteEmMassa, 100);
    setTimeout(adicionarBotoesAcoesMassa, 100);
    setTimeout(configurarValidacaoDuplicados, 150);
    setTimeout(verificarECorrigirDuplicados, 200);
    setTimeout(atualizarNavegacaoSelects, 150);
}

// ============================================
// GET ITENS DO FORMULÁRIO
// ============================================

function getItensFormulario() {
    const items = [];
    const rows = document.querySelectorAll('#itemsBody tr');
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isPendencia = tipoAtual === 'pendencia';
    
    rows.forEach(row => {
        const codigoInput = row.querySelector('.item-codigo');
        const descricaoInput = row.querySelector('.item-descricao');
        const unidadeInput = row.querySelector('.item-unidade');
        const quantidadeInput = row.querySelector('.item-quantidade');
        
        if (!codigoInput || !quantidadeInput) return;
        
        const codigo = codigoInput.value.trim();
        const descricao = descricaoInput ? descricaoInput.value.trim() : '';
        const unidade = unidadeInput ? unidadeInput.value.trim() : '';
        const quantidade = parseFloat(quantidadeInput.value) || 0;
        
        if (codigo && quantidade > 0) {
            const item = { 
                codigo, 
                descricao, 
                unidade, 
                quantidade 
            };
            
            if (isAditivo) {
                const statusSelect = row.querySelector('.item-status-aditivo');
                const numDoc = row.querySelector('.item-num-doc');
                const usuario = row.querySelector('.item-usuario');
                const observacao = row.querySelector('.item-observacao');
                
                const statusValue = statusSelect ? statusSelect.value : 'ANALISE';
                
                item.status_aditivo = statusValue;
                item.numero_documento = numDoc?.value || '';
                item.usuario = usuario?.value || '';
                item.observacao = observacao?.value || '';
            }
            
            if (isAditivoFisico) {
                const aplicado = row.querySelector('.item-aplicado');
                const colaborador = row.querySelector('.item-colaborador');
                const encarregado = row.querySelector('.item-encarregado');
                
                item.aplicado = aplicado?.value || 'PENDENTE';
                item.colaborador_solicitante = colaborador?.value || '';
                item.encarregado_obra = encarregado?.value || '';
                
                const formTipoAditivoFisico = document.getElementById('formTipoAditivoFisico');
                const formDataExecucao = document.getElementById('formDataExecucao');
                item.tipo = formTipoAditivoFisico?.value || 'SAÍDA';
                item.data_execucao = formDataExecucao?.value || '';
            }
            
            if (isPendencia) {
                const dataBaixa = row.querySelector('.item-data-baixa');
                const baixado = row.querySelector('.item-baixado');
                const motivo = row.querySelector('.item-motivo');
                const colaboradorItem = row.querySelector('.item-colaborador-item');
                const observacaoItem = row.querySelector('.item-observacao-item');
                
                item.data_baixa = dataBaixa?.value || '';
                item.baixado = baixado?.value || 'NÃO';
                item.motivo = motivo?.value || '';
                item.colaborador = colaboradorItem?.value || '';
                item.observacao_item = observacaoItem?.value || '';
            }
            
            items.push(item);
        }
    });
    
    return items;
}

// ============================================
// SALVAR CONTROLE
// ============================================

async function salvarControle() {
    if (!controleAtual) {
        mostrarToast('⚠️ Nenhum controle carregado', 'erro');
        return;
    }
    
    if (controleAtual.status === 'FINALIZADO') {
        mostrarToast('⚠️ Este controle já foi finalizado', 'aviso');
        return;
    }
    
    const tipoInfo = TIPOS[tipoAtual];
    const isFarol = tipoAtual === 'farol';
    const isDevolucao = tipoAtual === 'devolucao';
    const isPendencia = tipoAtual === 'pendencia';
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isMovimento = tipoAtual === 'movimento';
    const temItens = tipoInfo.temItens;
    
    const formObra = document.getElementById('formObra');
    const formDataProgramacao = document.getElementById('formDataProgramacao');
    const formDataUnica = document.getElementById('formDataUnica');
    
    let formTipoMovimento = null;
    let formCodMovimentacao = null;
    
    if (isMovimento) {
        formTipoMovimento = document.getElementById('formTipoMovimento');
        formCodMovimentacao = document.getElementById('formCodMovimentacao');
    }
    
    const obra = formObra ? formObra.value.trim() : '';
    
    if (!obra) {
        mostrarToast('⚠️ Preencha o número da obra', 'aviso');
        return;
    }
    
    let data_programacao = '';
    
    // ============================================
    // SE FOR MOVIMENTO
    // ============================================
    if (isMovimento) {
        const numeroControle = controleAtual.numero;
        const radios = document.querySelectorAll('input[name="tipoMgm"]');
        let tipoMgm = 'UNICO';
        radios.forEach(r => {
            if (r.checked) tipoMgm = r.value;
        });
        
        if (tipoMgm === 'UNICO') {
            const codMovimentacao = formCodMovimentacao ? formCodMovimentacao.value.trim() : '';
            data_programacao = formDataUnica ? formDataUnica.value : '';
            
            if (!codMovimentacao) {
                mostrarToast('⚠️ Preencha o código da movimentação', 'aviso');
                return;
            }
            if (!data_programacao) {
                mostrarToast('⚠️ Preencha a data de programação', 'aviso');
                return;
            }
            
            const dadosUnico = {
                obra: obra,
                data_programacao: data_programacao,
                tipo_movimento: formTipoMovimento ? formTipoMovimento.value : 'RMA',
                cod_movimentacao: codMovimentacao,
                tipo_mgm: 'UNICO',
                criado_por: dadosSessao.matricula || 'Sistema'
            };
            
            try {
                const urlLinhas = `${API_URL}/movimento-linhas`;
                const responseLinhas = await fetch(urlLinhas, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        numero: numeroControle,
                        linhas: [{ codigo: codMovimentacao, data: data_programacao }],
                        tipo_mgm: 'UNICO'
                    })
                });
                
                if (!responseLinhas.ok) {
                    const error = await responseLinhas.json();
                    throw new Error(error.error || 'Erro ao converter para UNICO');
                }
                
                const urlPrincipal = `${API_URL}${tipoInfo.endpoint}/${numeroControle}`;
                await fetch(urlPrincipal, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosUnico)
                });
                
                mostrarToast('✅ Salvo com sucesso!', 'sucesso');
                await carregarControleFormulario();
                
            } catch (error) {
                console.error('❌ Erro ao salvar:', error);
                mostrarToast('❌ ' + error.message, 'erro');
            }
            
            return;
            
        } else {
            // MGM Múltipla
            const documentosValidos = obterDocumentosMultiplos();
            
            if (documentosValidos.length === 0) {
                mostrarToast('⚠️ Adicione pelo menos um documento com código e data', 'aviso');
                return;
            }
            
            const dadosPrincipal = {
                obra: obra,
                data_programacao: documentosValidos[0].data || '',
                tipo_movimento: formTipoMovimento ? formTipoMovimento.value : 'RMA',
                cod_movimentacao: documentosValidos[0].codigo || '',
                tipo_mgm: 'MULTIPLO',
                criado_por: dadosSessao.matricula || 'Sistema'
            };
            
            try {
                const urlPrincipal = `${API_URL}${tipoInfo.endpoint}/${numeroControle}`;
                await fetch(urlPrincipal, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosPrincipal)
                });
                
                const urlLinhas = `${API_URL}/movimento-linhas`;
                const response = await fetch(urlLinhas, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        numero: numeroControle,
                        linhas: documentosValidos,
                        tipo_mgm: 'MULTIPLO'
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Erro ao sincronizar linhas');
                }
                
                const resultado = await response.json();
                mostrarToast(`✅ ${resultado.adicionadas || 0} adicionadas, ${resultado.removidas || 0} removidas`, 'sucesso');
                await carregarControleFormulario();
                
            } catch (error) {
                console.error('❌ Erro ao salvar:', error);
                mostrarToast('❌ ' + error.message, 'erro');
            }
            
            return;
        }
    }
    
    // ============================================
    // PARA OUTROS TIPOS (PENDÊNCIA, ADITIVO, ETC)
    // ============================================
    data_programacao = formDataProgramacao ? formDataProgramacao.value : '';
    
    if (!data_programacao) {
        mostrarToast('⚠️ Preencha a data de programação', 'aviso');
        if (formDataProgramacao) {
            formDataProgramacao.style.borderColor = '#FC8181';
            formDataProgramacao.style.backgroundColor = '#FFF5F5';
            setTimeout(() => {
                formDataProgramacao.style.borderColor = '';
                formDataProgramacao.style.backgroundColor = '';
            }, 3000);
        }
        return;
    }
    
    if (temItens) {
        const temDuplicado = validarDuplicadosAntesDeSalvar();
        if (temDuplicado) {
            const tabela = document.querySelector('.table-responsive');
            if (tabela) {
                tabela.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }
    }
    
    let itens = [];
    if (temItens) {
        itens = getItensFormulario();
        if (itens.length === 0) {
            mostrarToast('⚠️ Adicione pelo menos um item', 'aviso');
            return;
        }
    }
    
    const data = {
        obra: obra,
        data_programacao: data_programacao,
        criado_por: dadosSessao.matricula || 'Sistema'
    };
    
    if (temItens) {
        data.itens = itens;
    }
    
    if (isAditivoFisico) {
        const formTipoAditivoFisico = document.getElementById('formTipoAditivoFisico');
        const formDataExecucao = document.getElementById('formDataExecucao');
        data.tipo = formTipoAditivoFisico?.value || 'SAÍDA';
        data.data_execucao = formDataExecucao?.value || '';
    }
    
    if (isFarol) {
        const formSetor = document.getElementById('formSetor');
        const formDataRecebimento = document.getElementById('formDataRecebimento');
        const formSeparador = document.getElementById('formSeparador');
        const formDataSeparacao = document.getElementById('formDataSeparacao');
        const formObraTeveSaida = document.getElementById('formObraTeveSaida');
        const formDataSaida = document.getElementById('formDataSaida');
        const formAditivo = document.getElementById('formAditivo');
        const formObraProgramada = document.getElementById('formObraProgramada');
        const formDevolvida = document.getElementById('formDevolvida');
        const formCancelada = document.getElementById('formCancelada');
        const formObservacaoGeral = document.getElementById('formObservacaoGeral');
        
        data.setor = formSetor?.value || '';
        data.data_recebimento = formDataRecebimento?.value || '';
        data.separador = formSeparador?.value || '';
        data.data_separacao = formDataSeparacao?.value || '';
        data.obra_teve_saida = formObraTeveSaida?.value || 'NÃO';
        data.data_saida = formDataSaida?.value || '';
        data.aditivo = formAditivo?.value || 'NÃO';
        data.obra_programada = formObraProgramada?.value || 'NÃO';
        data.devolvida = formDevolvida?.value || 'NÃO';
        data.cancelada = formCancelada?.value || 'NÃO';
        data.observacao = formObservacaoGeral?.value || '';
    }
    
    if (isDevolucao) {
        const formDataDescarga = document.getElementById('formDataDescarga');
        const formEncarregado = document.getElementById('formEncarregado');
        const formDataDevolucaoFisica = document.getElementById('formDataDevolucaoFisica');
        const formMotivoPendencia = document.getElementById('formMotivoPendencia');
        const formSolucaoPendencia = document.getElementById('formSolucaoPendencia');
        const formPendenciaPor = document.getElementById('formPendenciaPor');
        const formObservacaoDevolucao = document.getElementById('formObservacaoDevolucao');
        
        data.data_descarga = formDataDescarga?.value || '';
        data.encarregado = formEncarregado?.value || '';
        data.data_devolucao_fisica = formDataDevolucaoFisica?.value || '';
        data.motivo_pendencia = formMotivoPendencia?.value || '';
        data.solucao_pendencia = formSolucaoPendencia?.value || '';
        data.pendencia_por = formPendenciaPor?.value || '';
        data.observacao = formObservacaoDevolucao?.value || '';
    }
    
    const url = `${API_URL}${tipoInfo.endpoint}/${controleAtual.numero}`;
    
    try {
        mostrarToast('⏳ Salvando...', 'info');
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao salvar');
        }
        
        mostrarToast('✅ Salvo com sucesso!', 'sucesso');
        await carregarControleFormulario();
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.salvarControle = salvarControle;

// ============================================
// FINALIZAR CONTROLE
// ============================================

async function finalizarControle() {
    if (!controleAtual) {
        mostrarToast('⚠️ Nenhum controle carregado', 'erro');
        return;
    }
    
    if (controleAtual.status === 'FINALIZADO') {
        mostrarToast('⚠️ Este controle já foi finalizado', 'aviso');
        return;
    }
    
    const isMovimento = tipoAtual === 'movimento';
    const numeroControle = controleAtual.numero;
    
    let isMultiplo = false;
    if (isMovimento) {
        const radios = document.querySelectorAll('input[name="tipoMgm"]');
        radios.forEach(r => {
            if (r.checked && r.value === 'MULTIPLO') {
                isMultiplo = true;
            }
        });
        if (!isMultiplo && controleAtual.tipo_mgm === 'MULTIPLO') {
            isMultiplo = true;
        }
    }
    
    // ============================================
    // SE FOR MÚLTIPLAS MGM
    // ============================================
    if (isMovimento && isMultiplo) {
        const tipoInfo = TIPOS[tipoAtual];
        const urlBusca = `${API_URL}${tipoInfo.endpoint}?numero=${numeroControle}`;
        
        try {
            mostrarToast('⏳ Buscando linhas para finalizar...', 'info');
            
            const response = await fetch(urlBusca);
            if (!response.ok) {
                throw new Error('Erro ao buscar linhas do movimento');
            }
            
            const data = await response.json();
            
            let linhas = [];
            if (Array.isArray(data)) {
                linhas = data;
            } else if (data.data && Array.isArray(data.data)) {
                linhas = data.data;
            } else if (data._linhas && Array.isArray(data._linhas)) {
                linhas = data._linhas;
            } else if (data.documentos && Array.isArray(data.documentos)) {
                linhas = data.documentos;
            } else {
                if (data.id) {
                    linhas = [data];
                }
            }
            
            linhas = linhas.filter(item => item.numero === numeroControle || item.numero_controle === numeroControle);
            
            if (linhas.length === 0) {
                mostrarToast('⚠️ Nenhuma linha encontrada para finalizar', 'aviso');
                return;
            }
            
            if (!confirm(`⚠️ Tem certeza que deseja FINALIZAR todas as ${linhas.length} linhas do movimento #${String(numeroControle).padStart(4, '0')}?`)) {
                return;
            }
            
            mostrarToast(`⏳ Finalizando ${linhas.length} linhas...`, 'info');
            
            let sucessos = 0;
            let erros = [];
            
            for (const linha of linhas) {
                try {
                    const urlFinalizar = `${API_URL}${tipoInfo.endpoint}/${numeroControle}/finalizar`;
                    
                    const response = await fetch(urlFinalizar, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Erro ao finalizar linha');
                    }
                    
                    sucessos++;
                    console.log(`✅ Linha ${linha.id} finalizada com sucesso usando numero ${numeroControle}`);
                    
                } catch (error) {
                    erros.push({ id: linha.id, error: error.message });
                    console.error(`❌ Erro ao finalizar linha ${linha.id}:`, error);
                }
            }
            
            if (erros.length === 0) {
                mostrarToast(`✅ ${sucessos} linhas finalizadas com sucesso!`, 'sucesso');
                await carregarControleFormulario();
                setTimeout(() => {
                    window.location.href = `index.html?tipo=${tipoAtual}`;
                }, 1500);
            } else {
                mostrarToast(`⚠️ ${sucessos} finalizadas, ${erros.length} falhas`, 'erro');
            }
            
        } catch (error) {
            console.error('❌ Erro ao finalizar múltiplas MGM:', error);
            mostrarToast('❌ ' + error.message, 'erro');
        }
        
        return;
    }
    
    // ============================================
    // SE FOR ÚNICO (MODO NORMAL)
    // ============================================
    if (!confirm(`⚠️ Tem certeza que deseja FINALIZAR o controle #${String(controleAtual.numero).padStart(4, '0')}?`)) return;
    
    const tipoInfo = TIPOS[tipoAtual];
    const url = `${API_URL}${tipoInfo.endpoint}/${controleAtual.numero}/finalizar`;
    
    try {
        mostrarToast('⏳ Finalizando...', 'info');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao finalizar');
        }
        
        mostrarToast('✅ Finalizado com sucesso!', 'sucesso');
        await carregarControleFormulario();
        
        setTimeout(() => {
            window.location.href = `index.html?tipo=${tipoAtual}`;
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erro ao finalizar:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.finalizarControle = finalizarControle;

// ============================================
// POP-UP DE DESCRIÇÃO
// ============================================

function inicializarPopup() {
    popupElement = document.getElementById('descricao-popup');
    overlayElement = document.getElementById('popup-overlay');
}

function mostrarPopup(input) {
    if (!popupElement || !overlayElement) {
        inicializarPopup();
        popupElement = document.getElementById('descricao-popup');
        overlayElement = document.getElementById('popup-overlay');
    }
    
    if (!popupElement || !overlayElement) return;
    
    const row = input.closest('tr');
    if (!row) return;
    
    const codigoInput = row.querySelector('.item-codigo');
    const descInput = row.querySelector('.item-descricao');
    const undInput = row.querySelector('.item-unidade');
    
    if (!codigoInput || !descInput) return;
    
    const codigo = codigoInput.value.trim();
    const descricao = descInput.value.trim();
    const unidade = undInput ? undInput.value.trim() : '-';
    
    if (!codigo || !descricao) {
        fecharPopup();
        return;
    }
    
    let html = `
        <span class="popup-titulo">📦 ${codigo}</span>
        <span class="popup-texto">${descricao}</span>
    `;
    
    if (unidade && unidade !== '-') {
        html += `<span class="popup-codigo">UND: ${unidade}</span>`;
    }
    
    popupElement.innerHTML = html;
    
    const rect = input.getBoundingClientRect();
    const popupWidth = Math.min(400, window.innerWidth - 40);
    const popupHeight = popupElement.offsetHeight || 100;
    
    let top = rect.bottom + 10;
    let left = rect.left + (rect.width / 2);
    
    if (top + popupHeight > window.innerHeight - 20) {
        top = rect.top - popupHeight - 10;
        popupElement.classList.add('popup-bottom');
    } else {
        popupElement.classList.remove('popup-bottom');
    }
    
    if (left - popupWidth / 2 < 10) {
        left = 10 + popupWidth / 2;
    } else if (left + popupWidth / 2 > window.innerWidth - 10) {
        left = window.innerWidth - 10 - popupWidth / 2;
    }
    
    popupElement.style.left = left + 'px';
    popupElement.style.top = top + 'px';
    popupElement.style.maxWidth = popupWidth + 'px';
    
    popupElement.classList.add('show');
    overlayElement.classList.add('active');
}

function fecharPopup() {
    if (popupElement) {
        popupElement.classList.remove('show');
    }
    if (overlayElement) {
        overlayElement.classList.remove('active');
    }
}

function configurarPopupDescricao() {
    const descricoes = document.querySelectorAll('.item-descricao');
    descricoes.forEach(function(descInput) {
        if (descInput._popupConfigurado) return;
        descInput._popupConfigurado = true;
        
        descInput.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (popupElement && popupElement.classList.contains('show')) {
                fecharPopup();
                return;
            }
            
            mostrarPopup(this);
        });
    });
    
    document.addEventListener('click', function(e) {
        const descInput = e.target.closest('.item-descricao');
        const popup = e.target.closest('.descricao-popup');
        
        if (!descInput && !popup && popupElement && popupElement.classList.contains('show')) {
            fecharPopup();
        }
    });
}

// ============================================
// NAVEGAÇÃO
// ============================================

function irParaTopo() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function irParaFim() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function controlarBotoesNavegacao() {
    const btnTopo = document.getElementById('btnTopo');
    const btnFim = document.getElementById('btnFim');
    if (!btnTopo || !btnFim) return;
    
    const scrollY = window.scrollY;
    const alturaTotal = document.body.scrollHeight;
    const alturaVisivel = window.innerHeight;
    
    btnTopo.classList.toggle('visivel', scrollY > 200);
    btnFim.classList.toggle('visivel', scrollY + alturaVisivel < alturaTotal - 100);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando Controles DCMD - Formulário...');
    
    const sessao = carregarDadosUsuario();
    if (!sessao) return;
    
    await carregarMateriais();
    await carregarControleFormulario();
    
    focarCampoObra();
    
    setTimeout(() => {
        configurarNavegacaoDocumentosMultiplos();
        configurarPasteDocumentosMultiplos();
    }, 500);
    
    window.addEventListener('scroll', controlarBotoesNavegacao);
    window.addEventListener('load', function() {
        setTimeout(controlarBotoesNavegacao, 500);
        setTimeout(configurarNavegacaoTeclado, 300);
        setTimeout(configurarPasteEmMassa, 300);
        setTimeout(adicionarBotoesAcoesMassa, 300);
        setTimeout(configurarValidacaoDuplicados, 400);
        setTimeout(verificarECorrigirDuplicados, 450);
        setTimeout(configurarNavegacaoSelectPorNumero, 300);
        setTimeout(() => {
            configurarNavegacaoDocumentosMultiplos();
            configurarPasteDocumentosMultiplos();
        }, 500);
    });
    window.addEventListener('resize', controlarBotoesNavegacao);
    
    console.log('✅ Inicialização concluída!');
});

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================

window.redirecionarParaHome = redirecionarParaHome;
window.voltarParaPainel = voltarParaPainel;
window.irParaTopo = irParaTopo;
window.irParaFim = irParaFim;
window.buscarMaterial = buscarMaterial;
window.adicionarLinhaItem = adicionarLinhaItem;
window.removerItem = removerItem;
window.salvarControle = salvarControle;
window.finalizarControle = finalizarControle;
window.mostrarPopup = mostrarPopup;
window.fecharPopup = fecharPopup;
window.configurarPopupDescricao = configurarPopupDescricao;
window.configurarNavegacaoTeclado = configurarNavegacaoTeclado;
window.configurarPasteEmMassa = configurarPasteEmMassa;
window.adicionarBotoesAcoesMassa = adicionarBotoesAcoesMassa;
window.aplicarEmMassa = aplicarEmMassa;
window.aplicarEmMassaSelect = aplicarEmMassaSelect;
window.isCampoEditavel = isCampoEditavel;
window.getElementosEditaveis = getElementosEditaveis;
window.formatarData = formatarData;
window.formatarNumero = formatarNumero;
window.getNomeUsuarioLogado = getNomeUsuarioLogado;
window.getMatriculaUsuarioLogado = getMatriculaUsuarioLogado;
window.verificarCodigoDuplicado = verificarCodigoDuplicado;
window.marcarCampoDuplicado = marcarCampoDuplicado;
window.validarTodosCodigos = validarTodosCodigos;
window.verificarECorrigirDuplicados = verificarECorrigirDuplicados;
window.validarDuplicadosAntesDeSalvar = validarDuplicadosAntesDeSalvar;
window.configurarValidacaoDuplicados = configurarValidacaoDuplicados;
window.validarDuplicadosNoPaste = validarDuplicadosNoPaste;
window.focarCampoObra = focarCampoObra;
window.configurarNavegacaoSelectPorNumero = configurarNavegacaoSelectPorNumero;
window.atualizarNavegacaoSelects = atualizarNavegacaoSelects;
window.toggleTipoMgm = toggleTipoMgm;
window.adicionarLinhaDocumentoMultiplo = adicionarLinhaDocumentoMultiplo;
window.removerLinhaDocumentoMultiplo = removerLinhaDocumentoMultiplo;
window.atualizarDocumentoMultiplo = atualizarDocumentoMultiplo;
window.carregarDocumentosMultiplos = carregarDocumentosMultiplos;
window.configurarNavegacaoDocumentosMultiplos = configurarNavegacaoDocumentosMultiplos;
window.configurarPasteDocumentosMultiplos = configurarPasteDocumentosMultiplos;
window.obterDocumentosMultiplos = obterDocumentosMultiplos;
window.controlarVisibilidadeDataProgramacao = controlarVisibilidadeDataProgramacao;