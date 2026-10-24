// ============================================
// CONTROLES DCMD - FORMULÁRIO UNIFICADO
// Inclui MGM Online + Importação Excel
// v3 — com loading overlay + parser Excel robusto
// ============================================

console.log('🚀 Iniciando Controles DCMD - Formulário... (v3)');

const API_URL = 'https://hidden-truth-f37f.alefe-gomes-72f.workers.dev/api';
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
        temItens: true
    },
    'aditivo': {
        label: 'Aditivo Sistêmico',
        icon: '📝',
        endpoint: '/aditivo-sistemico',
        tabela: 'aditivo_sistemico',
        temItens: true
    },
    'aditivo-fisico': {
        label: 'Aditivo Físico',
        icon: '🔧',
        endpoint: '/aditivo-fisico',
        tabela: 'aditivo_fisico',
        temItens: true
    },
    'farol': {
        label: 'Farol de Obras',
        icon: '🚦',
        endpoint: '/farol-obras',
        tabela: 'farol_obras',
        temItens: false
    },
    'devolucao': {
        label: 'Pendências de Devolução',
        icon: '📦',
        endpoint: '/pendencia-devolucao',
        tabela: 'pendencia_devolucao',
        temItens: false
    },
    'movimento': {
        label: 'Controle de Movimentações',
        icon: '📄',
        endpoint: '/movimento',
        tabela: 'movimento',
        temItens: false
    },
    'mgm': {
        label: 'MGM Online',
        icon: '📋',
        endpoint: '/mgm-online',
        tabela: 'mgm_online',
        temItens: true
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
// HELPERS DE LOADING
// ============================================

function mostrarLoadingFormulario(texto) {
    const overlay = document.getElementById('loadingFormulario');
    const sub = document.getElementById('loadingSub');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    }
    if (sub && texto) sub.textContent = texto;
}

function esconderLoadingFormulario() {
    const overlay = document.getElementById('loadingFormulario');
    const form = document.getElementById('controleForm');
    
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            if (overlay.parentNode) overlay.style.display = 'none';
        }, 350);
    }
    
    if (form) {
        form.classList.add('pronto');
    }
}

// ============================================
// UTILIDADES
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
    if (typeof authService === 'undefined' || !authService) {
        console.error('❌ authService não disponível');
        window.location.href = '../login.html';
        return null;
    }
    if (!authService.isLoggedIn()) {
        console.error('❌ Usuário não logado');
        window.location.href = '../login.html';
        return null;
    }
    const user = authService.getUserData();
    if (!user) {
        console.error('❌ Dados do usuário não encontrados');
        window.location.href = '../login.html';
        return null;
    }
    
    dadosSessao = {
        nome: user.nome,
        matricula: user.matricula,
        perfil: user.perfil,
        timestamp: Date.now()
    };
    perfilUsuario = user.perfil || 'OPERACIONAL';
    
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    const userMatriculaEl = document.getElementById('userMatricula');
    const userAvatarEl = document.getElementById('userAvatar');
    
    if (userNameEl) userNameEl.textContent = user.nome || 'Usuário';
    if (userRoleEl) userRoleEl.textContent = user.perfil || 'OPERACIONAL';
    if (userMatriculaEl) userMatriculaEl.textContent = `Matrícula: ${user.matricula || '---'}`;
    if (userAvatarEl) userAvatarEl.textContent = (user.nome || 'U')[0].toUpperCase();
    
    console.log(`✅ Usuário autenticado: ${user.nome} (${user.perfil})`);
    return dadosSessao;
}

// ============================================
// CARREGAR MATERIAIS
// ============================================

async function carregarMateriais() {
    try {
        const params = new URLSearchParams(window.location.search);
        const tipo = params.get('tipo') || 'pendencia';
        
        console.log(`🔄 Carregando materiais do R2 para depósito 1050...`);
        
        const response = await fetch(`${R2_URL}/posicacao-de-estoque/posicao-de-estoque-1050.txt`);
        
        if (!response.ok) {
            console.warn(`⚠️ Posição de estoque não encontrada`);
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
                        codigo,
                        codreg,
                        descricao,
                        unidade,
                        vlrult_cot: parseFloat(partes[4]?.trim().replace(',', '.') || '0') || 0,
                        saldo_oper: parseFloat(partes[5]?.trim().replace(',', '.') || '0') || 0
                    };
                }
            }
        }
        
        console.log(`✅ ${Object.keys(materiaisCache).length} materiais carregados do R2`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar materiais:', error);
    }
}

function buscarMaterialArquivo(codigo) {
    codigo = String(codigo).trim();
    if (!codigo) return null;
    
    const codigoUpper = codigo.toUpperCase();
    
    for (const key of Object.keys(materiaisCache)) {
        if (key.toUpperCase() === codigoUpper) {
            return { ...materiaisCache[key], codigo: key };
        }
    }
    return null;
}

// ============================================
// NAVEGAÇÃO
// ============================================

function voltarParaPainel() {
    const params = new URLSearchParams(window.location.search);
    const tipo = params.get('tipo') || 'pendencia';
    window.location.href = `index.html?tipo=${tipo}`;
}

window.voltarParaPainel = voltarParaPainel;

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

function isCampoEditavel(elemento) {
    if (!elemento) return false;
    return elemento.offsetParent !== null && !elemento.disabled && !elemento.readOnly;
}

function getElementosEditaveis(container) {
    const elementos = container.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    return Array.from(elementos).filter(el => el.offsetParent !== null);
}

function getNomeUsuarioLogado() {
    return dadosSessao?.nome || 'Usuário';
}

function getMatriculaUsuarioLogado() {
    return dadosSessao?.matricula || '---';
}

function formatarNumero(valor) {
    if (valor === undefined || valor === null || valor === '') return '';
    if (typeof valor === 'number' && !isNaN(valor)) return valor;
    let s = String(valor).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? valor : n;
}

function formatarData(valor) {
    if (!valor) return '';
    
    const data = new Date(valor);
    if (!isNaN(data.getTime())) {
        return data.toISOString().split('T')[0];
    }
    
    const p1 = valor.split('/');
    if (p1.length === 3) {
        const dia = p1[0].padStart(2, '0');
        const mes = p1[1].padStart(2, '0');
        const ano = p1[2];
        if (ano.length === 4) return `${ano}-${mes}-${dia}`;
    }
    
    const p2 = valor.split('-');
    if (p2.length === 3) {
        const dia = p2[0].padStart(2, '0');
        const mes = p2[1].padStart(2, '0');
        const ano = p2[2];
        if (ano.length === 4) return `${ano}-${mes}-${dia}`;
    }
    
    return valor;
}

function normalizarDataExcel(valor) {
    if (!valor) return '';
    if (valor instanceof Date && !isNaN(valor)) {
        const y = valor.getFullYear();
        const m = String(valor.getMonth() + 1).padStart(2, '0');
        const d = String(valor.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    
    const s = String(valor).trim();
    if (!s) return '';
    
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m1) {
        const dia = m1[1].padStart(2, '0');
        const mes = m1[2].padStart(2, '0');
        let ano = m1[3];
        if (ano.length === 2) ano = '20' + ano;
        return `${ano}-${mes}-${dia}`;
    }
    
    const n = parseFloat(s);
    if (!isNaN(n) && n > 0 && n < 100000) {
        const epoch = new Date(1899, 11, 30);
        const d = new Date(epoch.getTime() + n * 86400000);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }
    
    return '';
}

function parseNumeroExcel(valor) {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const s = String(valor).trim().replace(',', '.').replace(/[^\d.-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

/**
 * Normaliza um cabeçalho de coluna:
 * - Maiúsculas
 * - Remove acentos
 * - Remove \n, \t, <br>, pontos, hífens, barras, parênteses
 * - Remove espaços extras
 */
function normalizarCabecalho(txt) {
    if (!txt) return '';
    return String(txt)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/[\s\n\t\r]+/g, '')
        .replace(/[.\-\/()_:]/g, '')
        .trim();
}

// ============================================
// VALIDAÇÃO DE DUPLICADOS
// ============================================

function verificarCodigoDuplicado(codigo, linhaAtual) {
    if (!codigo || codigo.trim() === '') return false;
    if (tipoAtual === 'aditivo') return false;
    
    const codigoUpper = codigo.trim().toUpperCase();
    const todasLinhas = document.querySelectorAll('#itemsBody tr');
    let duplicado = false;
    
    todasLinhas.forEach(linha => {
        if (linha === linhaAtual) return;
        const codigoInput = linha.querySelector('.item-codigo');
        if (!codigoInput) return;
        if (codigoInput.value.trim().toUpperCase() === codigoUpper) {
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
        input.title = `⚠️ Código duplicado!`;
        
        let aviso = input.parentNode.querySelector('.duplicado-aviso');
        if (!aviso) {
            aviso = document.createElement('span');
            aviso.className = 'duplicado-aviso';
            aviso.textContent = '⚠️';
            aviso.style.cssText = `position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:#FC8181;`;
            input.parentNode.style.position = 'relative';
            input.parentNode.appendChild(aviso);
        }
    } else if (isDuplicado && isAditivoSistemico) {
        input.style.borderColor = '#F6AD55';
        input.style.backgroundColor = '#FFFAF0';
        input.style.boxShadow = '0 0 0 3px rgba(246, 173, 85, 0.15)';
        input.title = `ℹ️ Código duplicado (permitido)`;
        
        let aviso = input.parentNode.querySelector('.duplicado-aviso');
        if (!aviso) {
            aviso = document.createElement('span');
            aviso.className = 'duplicado-aviso';
            aviso.textContent = 'ℹ️';
            aviso.style.cssText = `position:absolute;right:4px;top:50%;transform:translateY(-50%);font-size:14px;color:#F6AD55;`;
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

function verificarECorrigirDuplicados() {
    const codigosMap = new Map();
    const linhas = document.querySelectorAll('#itemsBody tr');
    let temDuplicado = false;
    
    linhas.forEach(linha => {
        const codigoInput = linha.querySelector('.item-codigo');
        if (!codigoInput) return;
        const codigo = codigoInput.value.trim().toUpperCase();
        if (codigo === '') { marcarCampoDuplicado(codigoInput, false); return; }
        if (!codigosMap.has(codigo)) codigosMap.set(codigo, []);
        codigosMap.get(codigo).push(codigoInput);
    });
    
    codigosMap.forEach((inputs) => {
        if (inputs.length > 1) {
            temDuplicado = true;
            inputs.forEach(input => marcarCampoDuplicado(input, true));
        } else {
            inputs.forEach(input => marcarCampoDuplicado(input, false));
        }
    });
    
    return temDuplicado;
}

function validarDuplicadosAntesDeSalvar() {
    if (tipoAtual === 'aditivo') {
        verificarECorrigirDuplicados();
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
        if (!codigosMap.has(codigo)) codigosMap.set(codigo, []);
        codigosMap.get(codigo).push(codigoInput);
    });
    
    codigosMap.forEach((inputs, codigo) => {
        if (inputs.length > 1) {
            duplicadoEncontrado = true;
            duplicadosLista.push(codigo);
            inputs.forEach(input => marcarCampoDuplicado(input, true));
        } else {
            inputs.forEach(input => marcarCampoDuplicado(input, false));
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
            if (!duplicados.includes(codigo)) duplicados.push(codigo);
        } else {
            novosCodigos.push(codigo);
        }
    });
    
    if (duplicados.length > 0) {
        setTimeout(() => verificarECorrigirDuplicados(), 100);
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
    verificarECorrigirDuplicados();
}

function handleValidacaoDuplicadoInput(e) {
    verificarECorrigirDuplicados();
}

// ============================================
// BUSCAR MATERIAL
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
        if (descInput) descInput.value = '';
        if (undInput) undInput.value = '';
        marcarCampoDuplicado(input, false);
        verificarECorrigirDuplicados();
        return;
    }
    
    if (descInput) descInput.value = material.descricao || '';
    if (undInput) undInput.value = material.unidade || 'UN';
    
    const isDuplicado = verificarCodigoDuplicado(input.value, row);
    
    if (isDuplicado && !isAditivoSistemico) {
        verificarECorrigirDuplicados();
        mostrarToast(`⚠️ Código "${input.value}" já adicionado neste controle!`, 'aviso');
        return;
    }
    
    if (isDuplicado && isAditivoSistemico) {
        verificarECorrigirDuplicados();
        mostrarToast(`ℹ️ Código "${input.value}" duplicado (permitido)`, 'info');
        return;
    }
    
    marcarCampoDuplicado(input, false);
    verificarECorrigirDuplicados();
    mostrarToast(`✅ ${material.descricao}`, 'sucesso');
}

window.buscarMaterial = buscarMaterial;

// ============================================
// NAVEGAÇÃO POR TECLADO EM SELECTS
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
            select.style.borderColor = '#48BB78';
            setTimeout(() => { select.style.borderColor = ''; }, 300);
        }
    }
}

function atualizarNavegacaoSelects() {
    setTimeout(() => configurarNavegacaoSelectPorNumero(), 100);
}

// ============================================
// MÚLTIPLOS DOCUMENTOS
// ============================================

function toggleTipoMgm() {
    const radios = document.querySelectorAll('input[name="tipoMgm"]');
    let selecionado = 'UNICO';
    radios.forEach(r => { if (r.checked) selecionado = r.value; });
    tipoMgmSelecionado = selecionado;
    
    const campoDataUnica = document.getElementById('campoDataUnica');
    const secaoDocumentosMultiplos = document.getElementById('secaoDocumentosMultiplos');
    const campoDataProgramacao = document.getElementById('campoDataProgramacao');
    const formDataUnica = document.getElementById('formDataUnica');
    
    if (selecionado === 'UNICO') {
        if (campoDataUnica) campoDataUnica.style.display = 'block';
        if (secaoDocumentosMultiplos) secaoDocumentosMultiplos.style.display = 'none';
        if (campoDataProgramacao) campoDataProgramacao.style.display = 'none';
        linhasDocumentosMultiplos = [];
        const container = document.getElementById('containerDocumentosMultiplos');
        if (container) container.innerHTML = '';
        if (formDataUnica) formDataUnica.disabled = false;
    } else {
        if (campoDataUnica) campoDataUnica.style.display = 'none';
        if (secaoDocumentosMultiplos) secaoDocumentosMultiplos.style.display = 'block';
        if (campoDataProgramacao) campoDataProgramacao.style.display = 'none';
        if (formDataUnica) formDataUnica.disabled = true;
        
        const container = document.getElementById('containerDocumentosMultiplos');
        const linhasExistentes = container ? container.querySelectorAll('.linha-documento-multiplo') : [];
        if (linhasExistentes.length === 0) adicionarLinhaDocumentoMultiplo();
        
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
    linhasDocumentosMultiplos.push({ id, codigo, data });
    
    const div = document.createElement('div');
    div.className = 'linha-documento-multiplo';
    div.dataset.id = id;
    div.innerHTML = `
        <input type="text" class="input-doc-codigo" placeholder="Ex: 2601509345" value="${codigo}" data-id="${id}">
        <input type="date" class="input-doc-data" value="${data}" data-id="${id}">
        <button type="button" class="btn-remover-doc" onclick="removerLinhaDocumentoMultiplo(${id})" title="Remover linha">✕</button>
    `;
    container.appendChild(div);
    
    setTimeout(() => {
        configurarNavegacaoDocumentosMultiplos();
        configurarPasteDocumentosMultiplos();
        const primeiroInput = div.querySelector('.input-doc-codigo');
        if (primeiroInput && !codigo) setTimeout(() => primeiroInput.focus(), 100);
    }, 50);
}

window.adicionarLinhaDocumentoMultiplo = adicionarLinhaDocumentoMultiplo;

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
        if (codigo && data) documentos.push({ codigo, data });
    });
    return documentos;
}

window.obterDocumentosMultiplos = obterDocumentosMultiplos;

function configurarNavegacaoDocumentosMultiplos() {
    const inputs = document.querySelectorAll('#containerDocumentosMultiplos input:not([readonly]):not([disabled])');
    inputs.forEach(input => {
        input.removeEventListener('keydown', handleDocumentoTecladoGlobal);
        input.addEventListener('keydown', handleDocumentoTecladoGlobal);
    });
}

function handleDocumentoTecladoGlobal(e) {
    const target = e.target;
    const key = e.key;
    const container = document.getElementById('containerDocumentosMultiplos');
    if (!container || !container.contains(target)) return;
    
    if (key === 'Enter') {
        const isCodigo = target.classList.contains('input-doc-codigo');
        const isData = target.classList.contains('input-doc-data');
        const row = target.closest('.linha-documento-multiplo');
        if (!row) return;
        const rows = container.querySelectorAll('.linha-documento-multiplo');
        const currentIndex = Array.from(rows).indexOf(row);
        
        e.preventDefault();
        e.stopPropagation();
        
        if (isCodigo) {
            const dataInput = row.querySelector('.input-doc-data');
            if (dataInput) { dataInput.focus(); dataInput.select(); return; }
        }
        
        if (isData) {
            const nextRow = rows[currentIndex + 1];
            if (nextRow) {
                const nextCodigo = nextRow.querySelector('.input-doc-codigo');
                if (nextCodigo) { nextCodigo.focus(); nextCodigo.select(); return; }
            } else {
                const cod = row.querySelector('.input-doc-codigo')?.value || '';
                const dat = row.querySelector('.input-doc-data')?.value || '';
                if (cod && dat) {
                    adicionarLinhaDocumentoMultiplo();
                    setTimeout(() => {
                        const novasRows = container.querySelectorAll('.linha-documento-multiplo');
                        const ultima = novasRows[novasRows.length - 1];
                        const novoCodigo = ultima?.querySelector('.input-doc-codigo');
                        if (novoCodigo) { novoCodigo.focus(); novoCodigo.select(); }
                    }, 100);
                }
            }
        }
    }
}

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
    const currentIndex = Array.from(rows).indexOf(rowAtual);
    const cod = rowAtual.querySelector('.input-doc-codigo')?.value || '';
    const dat = rowAtual.querySelector('.input-doc-data')?.value || '';
    const linhaVazia = !cod && !dat;
    const startIndex = linhaVazia ? currentIndex : currentIndex + 1;
    
    if (!linhaVazia) {
        adicionarLinhaDocumentoMultiplo();
        setTimeout(() => processarPasteDocumentosLinhas(linhas, startIndex), 50);
    } else {
        processarPasteDocumentosLinhas(linhas, startIndex);
    }
}

function processarPasteDocumentosLinhas(linhas, startIndex) {
    const container = document.getElementById('containerDocumentosMultiplos');
    let rows = container.querySelectorAll('.linha-documento-multiplo');
    let index = startIndex;
    let processadas = 0;
    const dataAtual = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < linhas.length; i++) {
        let valor = linhas[i].trim();
        if (!valor) continue;
        let codigo = valor;
        let data = '';
        if (valor.includes('\t')) {
            const partes = valor.split('\t');
            codigo = partes[0].trim();
            data = partes[1]?.trim() || '';
        }
        let dataConvertida = data ? normalizarDataExcel(data) : dataAtual;
        if (!dataConvertida) dataConvertida = dataAtual;
        
        rows = container.querySelectorAll('.linha-documento-multiplo');
        if (index >= rows.length) {
            const id = Date.now() + Math.random() + i;
            linhasDocumentosMultiplos.push({ id, codigo, data: dataConvertida });
            const div = document.createElement('div');
            div.className = 'linha-documento-multiplo';
            div.dataset.id = id;
            div.innerHTML = `
                <input type="text" class="input-doc-codigo" placeholder="Ex: 2601509345" value="${codigo}" data-id="${id}">
                <input type="date" class="input-doc-data" value="${dataConvertida}" data-id="${id}">
                <button type="button" class="btn-remover-doc" onclick="removerLinhaDocumentoMultiplo(${id})" title="Remover linha">✕</button>
            `;
            container.appendChild(div);
        } else {
            const row = rows[index];
            const c = row.querySelector('.input-doc-codigo');
            const d = row.querySelector('.input-doc-data');
            if (c) c.value = codigo;
            if (d) d.value = dataConvertida;
        }
        processadas++;
        index++;
    }
    
    setTimeout(() => {
        configurarNavegacaoDocumentosMultiplos();
        configurarPasteDocumentosMultiplos();
    }, 100);
    
    mostrarToast(`✅ ${processadas} documentos colados!`, 'sucesso');
}

// ============================================
// POP-UP DE DESCRIÇÃO
// ============================================

function inicializarPopup() {
    popupElement = document.getElementById('descricao-popup');
    overlayElement = document.getElementById('popup-overlay');
}

function mostrarPopup(input) {
    if (!popupElement || !overlayElement) inicializarPopup();
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
    if (!codigo || !descricao) { fecharPopup(); return; }
    
    popupElement.innerHTML = `
        <span class="popup-titulo">📦 ${codigo}</span>
        <span class="popup-texto">${descricao}</span>
        ${unidade && unidade !== '-' ? `<span class="popup-codigo">UND: ${unidade}</span>` : ''}
    `;
    
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
    if (left - popupWidth / 2 < 10) left = 10 + popupWidth / 2;
    else if (left + popupWidth / 2 > window.innerWidth - 10) left = window.innerWidth - 10 - popupWidth / 2;
    
    popupElement.style.left = left + 'px';
    popupElement.style.top = top + 'px';
    popupElement.style.maxWidth = popupWidth + 'px';
    popupElement.classList.add('show');
    overlayElement.classList.add('active');
}

function fecharPopup() {
    if (popupElement) popupElement.classList.remove('show');
    if (overlayElement) overlayElement.classList.remove('active');
}

function configurarPopupDescricao() {
    const descricoes = document.querySelectorAll('.item-descricao');
    descricoes.forEach(function(descInput) {
        if (descInput._popupConfigurado) return;
        descInput._popupConfigurado = true;
        descInput.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (popupElement && popupElement.classList.contains('show')) { fecharPopup(); return; }
            mostrarPopup(this);
        });
    });
    document.addEventListener('click', function(e) {
        const descInput = e.target.closest('.item-descricao');
        const popup = e.target.closest('.descricao-popup');
        if (!descInput && !popup && popupElement && popupElement.classList.contains('show')) fecharPopup();
    });
}

// ============================================
// NAVEGAÇÃO POR TECLADO NO FORMULÁRIO
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
        }
        return;
    }
    
    if (key === 'Enter') {
        if (target.tagName === 'TEXTAREA' && e.shiftKey) return;
        e.preventDefault();
        if (isInTable) {
            const proximo = navegarParaProximoCampoAbaixo(target);
            if (!proximo) {
                adicionarLinhaItem();
                setTimeout(() => {
                    const novas = document.querySelectorAll('#itemsBody tr');
                    const ultima = novas[novas.length - 1];
                    const primeiro = ultima?.querySelector('.item-codigo');
                    if (primeiro && isCampoEditavel(primeiro)) { primeiro.focus(); primeiro.select(); }
                }, 50);
            }
            return;
        }
        navegarVerticalFormulario(target, 1);
        return;
    }
    
    if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        const dir = key === 'ArrowDown' ? 1 : -1;
        if (isInTable) navegarVerticalTabela(target, dir);
        else navegarVerticalFormulario(target, dir);
        return;
    }
}

function navegarParaProximoCampoAbaixo(element) {
    const row = element.closest('tr');
    const table = element.closest('table');
    if (!row || !table) return null;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const idx = rows.indexOf(row);
    if (idx === -1 || idx === rows.length - 1) return null;
    const cells = Array.from(row.querySelectorAll('td'));
    let targetCellIdx = -1;
    cells.forEach((cell, i) => {
        if (cell.querySelector('input, select, textarea') === element ||
            Array.from(cell.querySelectorAll('input, select, textarea')).includes(element)) {
            targetCellIdx = i;
        }
    });
    if (targetCellIdx === -1) return null;
    const nextRow = rows[idx + 1];
    const nextCells = nextRow.querySelectorAll('td');
    if (targetCellIdx >= nextCells.length) return null;
    const target = nextCells[targetCellIdx].querySelector('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    if (target && isCampoEditavel(target)) { target.focus(); if (target.type === 'text') target.select(); return target; }
    return null;
}

function navegarVerticalFormulario(element, direcao) {
    const visiveis = getElementosEditaveis(document.getElementById('controleForm'));
    const idx = visiveis.indexOf(element);
    if (idx === -1) return;
    const rect = element.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    let melhor = null, dist = Infinity;
    for (let i = 0; i < visiveis.length; i++) {
        if (i === idx) continue;
        const r = visiveis[i].getBoundingClientRect();
        const cy = r.top + r.height / 2;
        if (direcao === 1 && cy <= y + 5) continue;
        if (direcao === -1 && cy >= y - 5) continue;
        const d = Math.abs(cy - y) * 2 + Math.abs(r.left - rect.left) * 0.5;
        if (d < dist) { dist = d; melhor = visiveis[i]; }
    }
    if (melhor) { melhor.focus(); if (melhor.type === 'text') melhor.select(); }
}

function navegarVerticalTabela(element, direcao) {
    const row = element.closest('tr');
    const table = element.closest('table');
    if (!row || !table) return;
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const idx = rows.indexOf(row);
    if (idx === -1) return;
    const targetIdx = idx + direcao;
    if (targetIdx < 0 || targetIdx >= rows.length) return;
    const targetRow = rows[targetIdx];
    const cells = Array.from(row.querySelectorAll('td'));
    let cellIdx = -1;
    cells.forEach((cell, i) => {
        if (Array.from(cell.querySelectorAll('input, select, textarea')).includes(element)) cellIdx = i;
    });
    if (cellIdx === -1) {
        const first = targetRow.querySelector('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        if (first && isCampoEditavel(first)) first.focus();
        return;
    }
    const targetCells = targetRow.querySelectorAll('td');
    if (cellIdx >= targetCells.length) return;
    const target = targetCells[cellIdx].querySelector('input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    if (target && isCampoEditavel(target)) { target.focus(); if (target.type === 'text') target.select(); }
}

// ============================================
// BULK PASTE (COLEÇÃO EM MASSA)
// ============================================

function configurarPasteEmMassa() {
    const campos = document.querySelectorAll('#itemsBody input:not([readonly]):not([disabled]), #itemsBody select:not([disabled])');
    campos.forEach(campo => {
        if (campo.classList.contains('item-descricao') || campo.classList.contains('item-unidade')) return;
        if (campo.classList.contains('item-colaborador-item')) return;
        if (campo._pasteConfigurado) return;
        campo._pasteConfigurado = true;
        campo.removeEventListener('paste', handlePasteEmMassa);
        campo.addEventListener('paste', handlePasteEmMassa);
    });
}

function handlePasteEmMassa(e) {
    const target = e.target;
    if (!isCampoEditavel(target)) return;
    if (target.classList.contains('item-descricao') || target.classList.contains('item-unidade')) return;
    if (target.classList.contains('item-colaborador-item')) return;
    const dados = e.clipboardData || window.clipboardData;
    if (!dados) return;
    const texto = dados.getData('text/plain');
    if (!texto || texto.trim() === '') return;
    const linhas = texto.split('\n').filter(line => line.trim() !== '');
    if (linhas.length <= 1) return;
    e.preventDefault();
    processarPasteEmMassa(linhas, target);
}

function processarPasteEmMassa(linhas, elementoAlvo) {
    const isCodigoColumn = elementoAlvo.classList.contains('item-codigo');
    const isAditivoSistemico = tipoAtual === 'aditivo';
    
    if (isCodigoColumn && !isAditivoSistemico) {
        const duplicados = validarDuplicadosNoPaste(linhas, elementoAlvo);
        if (duplicados.length > 0) {
            mostrarToast(`⚠️ Códigos duplicados: ${duplicados.join(', ')}`, 'erro');
            return;
        }
    }
    
    const classesAlvo = Array.from(elementoAlvo.classList);
    let classeAlvo = '';
    const mapeamento = {
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
        'item-encarregado': 'encarregado_obra',
        'item-aditivo-saida': 'qtd_aditivo_saida',
        'item-aditivo-campo': 'qtd_aditivo_campo',
        'item-rma': 'qtd_rma',
        'item-separada': 'qtd_separada',
        'item-aplicada-mgm': 'qtd_aplicada',
        'item-dma': 'qtd_dma',
        'item-pendente': 'qtd_pendente'
    };
    for (const c of classesAlvo) { if (mapeamento[c]) { classeAlvo = c; break; } }
    if (!classeAlvo) return;
    
    const linhaAtual = elementoAlvo.closest('tr');
    const tbody = document.getElementById('itemsBody');
    const todas = tbody.querySelectorAll('tr');
    const codigoAtual = linhaAtual.querySelector('.item-codigo')?.value.trim() || '';
    const descAtual = linhaAtual.querySelector('.item-descricao')?.value.trim() || '';
    const qtdAtual = linhaAtual.querySelector('.item-quantidade')?.value.trim() || '';
    const linhaVazia = codigoAtual === '' && descAtual === '' && qtdAtual === '';
    
    let idxAtual = Array.from(todas).indexOf(linhaAtual);
    if (idxAtual === -1) idxAtual = todas.length - 1;
    let primeiroIdx = idxAtual;
    
    if (!linhaVazia) {
        const campoAtual = linhaAtual.querySelector(`.${classeAlvo}`);
        const valorAtual = campoAtual ? campoAtual.value.trim() : '';
        if (valorAtual === '' && codigoAtual !== '') primeiroIdx = idxAtual;
        else { primeiroIdx = idxAtual + 1; adicionarLinhaItem(); }
    }
    
    let linhaIdx = primeiroIdx;
    for (let i = 0; i < linhas.length; i++) {
        const valor = linhas[i].trim();
        if (valor === '') continue;
        const linhasAtuais = tbody.querySelectorAll('tr');
        if (linhaIdx >= linhasAtuais.length) adicionarLinhaItem();
        const linha = tbody.querySelectorAll('tr')[linhaIdx];
        if (!linha) continue;
        const campo = linha.querySelector(`.${classeAlvo}`);
        if (campo && isCampoEditavel(campo)) {
            if (campo.tagName === 'SELECT') {
                const opcoes = Array.from(campo.options).map(o => o.value);
                if (opcoes.includes(valor)) campo.value = valor;
                else {
                    const byText = Array.from(campo.options).find(o => o.text.trim().toUpperCase() === valor.toUpperCase());
                    if (byText) campo.value = byText.value;
                }
            } else if (campo.type === 'number') {
                const num = parseFloat(valor.replace(',', '.').replace(/[^0-9.-]/g, ''));
                campo.value = isNaN(num) ? valor : num;
            } else if (campo.type === 'date') {
                campo.value = formatarData(valor);
            } else {
                campo.value = valor;
            }
            campo.dispatchEvent(new Event('change', { bubbles: true }));
            if (classeAlvo === 'item-codigo') buscarMaterial(campo);
        }
        linhaIdx++;
    }
    
    setTimeout(configurarNavegacaoTeclado, 100);
    setTimeout(configurarPopupDescricao, 100);
    setTimeout(configurarPasteEmMassa, 100);
    setTimeout(adicionarBotoesAcoesMassa, 100);
    setTimeout(configurarValidacaoDuplicados, 150);
    setTimeout(verificarECorrigirDuplicados, 200);
    setTimeout(atualizarNavegacaoSelects, 150);
    setTimeout(() => { elementoAlvo.focus(); if (elementoAlvo.type === 'text') elementoAlvo.select(); }, 200);
    
    mostrarToast(`✅ ${linhas.length} valores aplicados`, 'sucesso');
}

// ============================================
// AÇÕES EM MASSA (BOTÕES DE BULK)
// ============================================

function criarSeparadorPequeno() {
    const sep = document.createElement('span');
    sep.style.cssText = `width:1px;height:26px;background:#CBD5E0;display:inline-block;margin:0 2px;`;
    return sep;
}

function criarBotaoMassa(texto, cor, acao) {
    const btn = document.createElement('button');
    btn.textContent = texto;
    btn.className = 'btn-bulk-action';
    btn.type = 'button';
    btn.style.cssText = `background:${cor};color:white;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8em;transition:all 0.3s ease;white-space:nowrap;`;
    btn.onmouseover = function() { this.style.transform = 'translateY(-1px)'; this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
    btn.onmouseout = function() { this.style.transform = 'translateY(0)'; this.style.boxShadow = 'none'; };
    btn.onclick = function(e) { e.preventDefault(); e.stopPropagation(); acao(e); };
    return btn;
}

function criarCampoMassa(label, classe, tipo, placeholder, acao) {
    const container = document.createElement('div');
    container.style.cssText = `display:flex;align-items:center;gap:4px;`;
    
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = `font-size:0.75em;font-weight:600;color:#4A5568;white-space:nowrap;`;
    container.appendChild(lbl);
    
    const input = document.createElement('input');
    input.type = tipo;
    input.placeholder = placeholder;
    input.className = 'bulk-input';
    input.style.cssText = `padding:4px 10px;border:2px solid #E2E8F0;border-radius:6px;font-size:0.8em;width:110px;background:white;height:30px;box-sizing:border-box;`;
    if (tipo === 'number') { input.step = 'any'; input.inputMode = 'decimal'; }
    input.onfocus = function() { this.style.borderColor = '#4299E1'; };
    input.onblur = function() { this.style.borderColor = '#E2E8F0'; };
    
    const btn = document.createElement('button');
    btn.textContent = 'Aplicar';
    btn.type = 'button';
    btn.style.cssText = `background:#4299E1;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.75em;height:30px;`;
    btn.onclick = function(e) {
        e.preventDefault(); e.stopPropagation();
        let valor = input.value.trim();
        if (valor !== '') {
            if (tipo === 'number') valor = valor.replace(',', '.');
            acao(valor);
            input.value = '';
        } else mostrarToast('⚠️ Digite um valor', 'aviso');
    };
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); btn.click(); }
    });
    
    container.appendChild(input);
    container.appendChild(btn);
    return container;
}

function criarSelectMassa(label, classe, opcoes, acao, labels) {
    const container = document.createElement('div');
    container.style.cssText = `display:flex;align-items:center;gap:4px;`;
    
    const lbl = document.createElement('label');
    lbl.textContent = label;
    lbl.style.cssText = `font-size:0.75em;font-weight:600;color:#4A5568;white-space:nowrap;`;
    container.appendChild(lbl);
    
    const select = document.createElement('select');
    select.className = 'bulk-select';
    select.style.cssText = `padding:2px 8px;border:2px solid #E2E8F0;border-radius:6px;font-size:0.8em;min-width:100px;background:white;height:30px;box-sizing:border-box;`;
    opcoes.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        opt.textContent = labels && labels[o] ? labels[o] : (o || '(vazio)');
        select.appendChild(opt);
    });
    
    const btn = document.createElement('button');
    btn.textContent = 'Aplicar';
    btn.type = 'button';
    btn.style.cssText = `background:#4299E1;color:white;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.75em;height:30px;`;
    btn.onclick = function(e) {
        e.preventDefault(); e.stopPropagation();
        acao(select.value);
        mostrarToast(`✅ Aplicado "${select.options[select.selectedIndex].text}"`, 'sucesso');
    };
    
    container.appendChild(select);
    container.appendChild(btn);
    return container;
}

function aplicarEmMassa(classe, valor) {
    const elementos = document.querySelectorAll(`.${classe}`);
    let cont = 0;
    elementos.forEach(el => {
        if (isCampoEditavel(el)) {
            if (el.type === 'number') {
                const num = parseFloat(valor.replace(',', '.').replace(/[^0-9.-]/g, ''));
                el.value = isNaN(num) ? (valor !== '' ? parseFloat(valor) : '') : num;
            } else if (el.type === 'date') {
                el.value = formatarData(valor);
            } else {
                el.value = valor;
            }
            el.dispatchEvent(new Event('change', { bubbles: true }));
            cont++;
        }
    });
    if (cont > 0) mostrarToast(`✅ ${cont} campos atualizados`, 'sucesso');
    else mostrarToast('⚠️ Nenhum campo editável', 'aviso');
}

function aplicarEmMassaSelect(classe, valor) {
    const elementos = document.querySelectorAll(`.${classe}`);
    let cont = 0;
    elementos.forEach(el => {
        if (isCampoEditavel(el)) {
            el.value = valor;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            cont++;
        }
    });
    if (cont > 0) mostrarToast(`✅ ${cont} campos atualizados`, 'sucesso');
    else mostrarToast('⚠️ Nenhum campo editável', 'aviso');
}

function adicionarBotoesAcoesMassa() {
    let container = document.getElementById('bulkActionsContainer');
    if (container) container.remove();
    
    const secaoItens = document.getElementById('secaoItens');
    if (!secaoItens) return;
    
    const tipoInfo = TIPOS[tipoAtual];
    if (!tipoInfo || !tipoInfo.temItens) return;
    if (controleAtual?.status === 'FINALIZADO') return;
    
    const isPendencia = tipoAtual === 'pendencia';
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isMGM = tipoAtual === 'mgm';
    
    container = document.createElement('div');
    container.id = 'bulkActionsContainer';
    container.className = 'bulk-actions-container';
    container.style.cssText = `
        background: linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%);
        border: 1px solid #E2E8F0; border-radius: 12px;
        padding: 16px 24px; margin: 15px 0 20px 0;
        display: flex; flex-wrap: wrap; align-items: center;
        gap: 8px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    `;
    
    const titulo = document.createElement('span');
    titulo.style.cssText = `font-weight:700;color:#2D3748;font-size:0.85em;display:flex;align-items:center;gap:6px;`;
    titulo.innerHTML = '⚡ Ações em Massa';
    container.appendChild(titulo);
    container.appendChild(criarSeparadorPequeno());
    
    if (isPendencia) {
        container.appendChild(criarBotaoMassa('✅ Baixar Todos', '#48BB78', e => aplicarEmMassaSelect('item-baixado', 'SIM')));
        container.appendChild(criarBotaoMassa('⬜ Desbaixar', '#ED8936', e => aplicarEmMassaSelect('item-baixado', 'NÃO')));
        container.appendChild(criarSeparadorPequeno());
        container.appendChild(criarCampoMassa('📝 Motivo:', 'item-motivo', 'text', 'Motivo...', v => aplicarEmMassa('item-motivo', v)));
        container.appendChild(criarSeparadorPequeno());
        container.appendChild(criarCampoMassa('📅 Data Baixa:', 'item-data-baixa', 'date', 'Data...', v => aplicarEmMassa('item-data-baixa', v)));
    }
    
    if (isAditivo) {
        container.appendChild(criarSelectMassa('📊 Status:', 'item-status-aditivo', ['ANALISE','APROVADO','REPROVADO','S/ SOLICITAÇÃO'], v => aplicarEmMassaSelect('item-status-aditivo', v), {'ANALISE':'📊 Análise','APROVADO':'✅ Aprovado','REPROVADO':'❌ Reprovado','S/ SOLICITAÇÃO':'📋 Sem Solic.'}));
        container.appendChild(criarSeparadorPequeno());
        container.appendChild(criarCampoMassa('📄 Nº Doc:', 'item-num-doc', 'text', 'Nº...', v => aplicarEmMassa('item-num-doc', v)));
        container.appendChild(criarSeparadorPequeno());
        container.appendChild(criarCampoMassa('📝 Obs:', 'item-observacao', 'text', 'Obs...', v => aplicarEmMassa('item-observacao', v)));
    }
    
    if (isAditivoFisico) {
        container.appendChild(criarSelectMassa('🔧 Aplicado:', 'item-aplicado', ['PENDENTE','NÃO','SIM','PARCIAL'], v => aplicarEmMassaSelect('item-aplicado', v)));
        container.appendChild(criarSeparadorPequeno());
        container.appendChild(criarSelectMassa('👤 Solicitante:', 'item-colaborador', ['','MATEUS SANTANA','SALES JUNIOR','VALENTIM','SIVANILDO','ERICK VEGA','JOSÉ JORDAN','ALCIDES','FRANCINALDO (DEDÉ)','ROMARIO','BRENO','MAYKE','MARIO J.','MEYDSON','WALISSON'], v => aplicarEmMassaSelect('item-colaborador', v)));
    }
    
    if (isMGM) {
        container.appendChild(criarCampoMassa('RMA:', 'item-rma', 'number', '0', v => aplicarEmMassa('item-rma', v)));
        container.appendChild(criarSeparadorPequeno());
        container.appendChild(criarCampoMassa('Separada:', 'item-separada', 'number', '0', v => aplicarEmMassa('item-separada', v)));
        container.appendChild(criarSeparadorPequeno());
        container.appendChild(criarCampoMassa('Aplicada:', 'item-aplicada-mgm', 'number', '0', v => aplicarEmMassa('item-aplicada-mgm', v)));
    }
    
    container.appendChild(criarSeparadorPequeno());
    const btnLimpar = document.createElement('button');
    btnLimpar.textContent = '🧹 Limpar Qtds';
    btnLimpar.type = 'button';
    btnLimpar.style.cssText = `background:#FC8181;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.8em;`;
    btnLimpar.onclick = function(e) {
        e.preventDefault(); e.stopPropagation();
        if (confirm('⚠️ Limpar todas as quantidades?')) {
            aplicarEmMassa('item-quantidade', '');
            mostrarToast('🧹 Quantidades limpas!', 'sucesso');
        }
    };
    container.appendChild(btnLimpar);
    
    const table = document.querySelector('.table-responsive');
    if (table) table.parentNode.insertBefore(container, table);
    
    setTimeout(atualizarNavegacaoSelects, 150);
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
    const isMGM = tipoAtual === 'mgm';
    const nomeUsuario = getNomeUsuarioLogado();
    
    const tr = document.createElement('tr');
    
    let html = `
        <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" placeholder="Código"></td>
        <td><input type="text" class="item-descricao input-descricao" readonly placeholder="Descrição"></td>
        <td><input type="text" class="item-unidade" readonly placeholder="Unid."></td>
        <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0" step="any"></td>
    `;
    
    if (isMGM) {
        html += `
            <td class="col-mgm"><input type="number" class="item-aditivo-saida" placeholder="0" min="0" step="any"></td>
            <td class="col-mgm"><input type="number" class="item-aditivo-campo" placeholder="0" min="0" step="any"></td>
            <td class="col-mgm"><input type="number" class="item-rma" placeholder="0" min="0" step="any"></td>
            <td class="col-mgm"><input type="number" class="item-separada" placeholder="0" min="0" step="any"></td>
            <td class="col-mgm"><input type="number" class="item-aplicada-mgm" placeholder="0" min="0" step="any"></td>
            <td class="col-mgm"><input type="number" class="item-dma" placeholder="0" min="0" step="any"></td>
            <td class="col-mgm"><input type="number" class="item-pendente" placeholder="0" min="0" step="any"></td>
        `;
    }
    
    if (isPendencia) {
        html += `
            <td class="col-data-baixa"><input type="date" class="item-data-baixa"></td>
            <td class="col-baixado">
                <select class="item-baixado">
                    <option value="NÃO">NÃO</option>
                    <option value="SIM">SIM</option>
                </select>
            </td>
            <td class="col-motivo"><input type="text" class="item-motivo" placeholder="Motivo"></td>
            <td class="col-colaborador-item">
                <input type="text" class="item-colaborador-item" value="${nomeUsuario}" readonly style="background-color:#f7fafc;color:#4A5568;cursor:default;">
            </td>
            <td class="col-observacao-item"><input type="text" class="item-observacao-item" placeholder="Observação"></td>
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
            <td class="col-num-doc"><input type="text" class="item-num-doc" placeholder="Nº Documento"></td>
            <td class="col-usuario"><input type="text" class="item-usuario" placeholder="Usuário" value="${nomeUsuario}"></td>
            <td class="col-observacao"><input type="text" class="item-observacao" placeholder="Observação"></td>
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
        <td><button type="button" class="remove-item" onclick="removerItem(this)" title="Remover item">✕</button></td>
    `;
    
    tr.innerHTML = html;
    tbody.appendChild(tr);
    
    const primeiroInput = tr.querySelector('.item-codigo');
    if (primeiroInput) setTimeout(() => primeiroInput.focus(), 100);
    
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
// CARREGAR ITENS NO FORMULÁRIO
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
    const isMGM = tipoAtual === 'mgm';
    const isFinalizado = controleAtual?.status === 'FINALIZADO';
    const nomeUsuario = getNomeUsuarioLogado();
    
    itens.forEach(item => {
        const tr = document.createElement('tr');
        
        let html = `
            <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" value="${item.codigo || ''}" placeholder="Código" ${isFinalizado ? 'disabled' : ''}></td>
            <td><input type="text" class="item-descricao input-descricao" readonly value="${(item.descricao || '').replace(/"/g, '&quot;')}" placeholder="Descrição"></td>
            <td><input type="text" class="item-unidade" readonly value="${item.unidade || ''}" placeholder="Unid."></td>
            <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0" step="any" value="${item.quantidade || ''}" ${isFinalizado ? 'disabled' : ''}></td>
        `;
        
        if (isMGM) {
            html += `
                <td class="col-mgm"><input type="number" class="item-aditivo-saida" placeholder="0" min="0" step="any" value="${item.qtd_aditivo_saida || ''}" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-mgm"><input type="number" class="item-aditivo-campo" placeholder="0" min="0" step="any" value="${item.qtd_aditivo_campo || ''}" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-mgm"><input type="number" class="item-rma" placeholder="0" min="0" step="any" value="${item.qtd_rma || ''}" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-mgm"><input type="number" class="item-separada" placeholder="0" min="0" step="any" value="${item.qtd_separada || ''}" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-mgm"><input type="number" class="item-aplicada-mgm" placeholder="0" min="0" step="any" value="${item.qtd_aplicada || ''}" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-mgm"><input type="number" class="item-dma" placeholder="0" min="0" step="any" value="${item.qtd_dma || ''}" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-mgm"><input type="number" class="item-pendente" placeholder="0" min="0" step="any" value="${item.qtd_pendente || ''}" ${isFinalizado ? 'disabled' : ''}></td>
            `;
        }
        
        if (isPendencia) {
            const colaboradorValue = item.colaborador || nomeUsuario;
            html += `
                <td class="col-data-baixa"><input type="date" class="item-data-baixa" value="${item.data_baixa || ''}" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-baixado">
                    <select class="item-baixado" ${isFinalizado ? 'disabled' : ''}>
                        <option value="NÃO" ${item.baixado === 'NÃO' ? 'selected' : ''}>NÃO</option>
                        <option value="SIM" ${item.baixado === 'SIM' ? 'selected' : ''}>SIM</option>
                    </select>
                </td>
                <td class="col-motivo"><input type="text" class="item-motivo" value="${item.motivo || ''}" placeholder="Motivo" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-colaborador-item"><input type="text" class="item-colaborador-item" value="${colaboradorValue}" readonly style="background-color:#f7fafc;color:#4A5568;cursor:default;"></td>
                <td class="col-observacao-item"><input type="text" class="item-observacao-item" value="${item.observacao_item || ''}" placeholder="Observação" ${isFinalizado ? 'disabled' : ''}></td>
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
                <td class="col-num-doc"><input type="text" class="item-num-doc" value="${item.numero_documento || ''}" placeholder="Nº Documento" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-usuario"><input type="text" class="item-usuario" value="${usuarioItem}" placeholder="Usuário" ${isFinalizado ? 'disabled' : ''}></td>
                <td class="col-observacao"><input type="text" class="item-observacao" value="${item.observacao || ''}" placeholder="Observação" ${isFinalizado ? 'disabled' : ''}></td>
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
            <td><button type="button" class="remove-item" onclick="removerItem(this)" ${isFinalizado ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} title="Remover item">✕</button></td>
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
    const isMGM = tipoAtual === 'mgm';
    
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
        
        if (codigo && (quantidade > 0 || isMGM)) {
            const item = { codigo, descricao, unidade, quantidade };
            
            if (isAditivo) {
                const statusSelect = row.querySelector('.item-status-aditivo');
                const numDoc = row.querySelector('.item-num-doc');
                const usuario = row.querySelector('.item-usuario');
                const observacao = row.querySelector('.item-observacao');
                item.status_aditivo = statusSelect ? statusSelect.value : 'ANALISE';
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
            
            if (isMGM) {
                const aditivoSaida = row.querySelector('.item-aditivo-saida');
                const aditivoCampo = row.querySelector('.item-aditivo-campo');
                const rma = row.querySelector('.item-rma');
                const separada = row.querySelector('.item-separada');
                const aplicadaMGM = row.querySelector('.item-aplicada-mgm');
                const dma = row.querySelector('.item-dma');
                const pendente = row.querySelector('.item-pendente');
                item.qtd_aditivo_saida = parseFloat(aditivoSaida?.value) || 0;
                item.qtd_aditivo_campo = parseFloat(aditivoCampo?.value) || 0;
                item.qtd_rma = parseFloat(rma?.value) || 0;
                item.qtd_separada = parseFloat(separada?.value) || 0;
                item.qtd_aplicada = parseFloat(aplicadaMGM?.value) || 0;
                item.qtd_dma = parseFloat(dma?.value) || 0;
                item.qtd_pendente = parseFloat(pendente?.value) || 0;
            }
            
            items.push(item);
        }
    });
    
    return items;
}

// ============================================
// CARREGAR CONTROLE NO FORMULÁRIO (NOVA VERSÃO COM LOADING OVERLAY)
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
    
    // ============================================
    // 1. CONFIGURA O TIPO **ANTES** DO FETCH
    // ============================================
    const tituloEl = document.getElementById('formTitulo');
    if (tituloEl) tituloEl.textContent = `${tipoInfo.icon} ${tipoInfo.label}`;
    
    const isAditivo = tipoAtual === 'aditivo';
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isFarol = tipoAtual === 'farol';
    const isDevolucao = tipoAtual === 'devolucao';
    const isPendencia = tipoAtual === 'pendencia';
    const isMovimento = tipoAtual === 'movimento';
    const isMGM = tipoAtual === 'mgm';
    const temItens = tipoInfo.temItens;
    
    // Mostra/esconde BLOCOS
    const camposMGM = document.getElementById('camposMGM');
    if (camposMGM) camposMGM.style.display = isMGM ? '' : 'none';
    
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
    
    const campoDataProgramacao = document.getElementById('campoDataProgramacao');
    if (campoDataProgramacao) campoDataProgramacao.style.display = isMovimento ? 'none' : '';
    
    const btnImportarExcelContainer = document.getElementById('btnImportarExcelContainer');
    if (btnImportarExcelContainer) btnImportarExcelContainer.style.display = isMGM ? '' : 'none';
    
    const secaoItens = document.getElementById('secaoItens');
    if (secaoItens) secaoItens.style.display = temItens ? '' : 'none';
    
    const tituloItens = document.getElementById('tituloItens');
    if (tituloItens) {
        if (isAditivoFisico) tituloItens.textContent = '🔧 Itens do Aditivo Físico';
        else if (isAditivo) tituloItens.textContent = '📝 Itens do Aditivo Sistêmico';
        else if (isPendencia) tituloItens.textContent = '📦 Itens Pendentes';
        else if (isMGM) tituloItens.textContent = '📋 Itens da MGM';
        else tituloItens.textContent = '📦 Itens';
    }
    
    // Mostra/esconde COLUNAS (via classe)
    document.querySelectorAll('.col-mgm').forEach(el => { if (el) el.style.display = isMGM ? '' : 'none'; });
    document.querySelectorAll('.col-status-aditivo').forEach(el => { if (el) el.style.display = isAditivo ? '' : 'none'; });
    document.querySelectorAll('.col-num-doc').forEach(el => { if (el) el.style.display = isAditivo ? '' : 'none'; });
    document.querySelectorAll('.col-usuario').forEach(el => { if (el) el.style.display = isAditivo ? '' : 'none'; });
    document.querySelectorAll('.col-observacao').forEach(el => { if (el) el.style.display = isAditivo ? '' : 'none'; });
    document.querySelectorAll('.col-aplicado').forEach(el => { if (el) el.style.display = isAditivoFisico ? '' : 'none'; });
    document.querySelectorAll('.col-colaborador').forEach(el => { if (el) el.style.display = isAditivoFisico ? '' : 'none'; });
    document.querySelectorAll('.col-encarregado').forEach(el => { if (el) el.style.display = isAditivoFisico ? '' : 'none'; });
    document.querySelectorAll('.col-data-baixa').forEach(el => { if (el) el.style.display = isPendencia ? '' : 'none'; });
    document.querySelectorAll('.col-baixado').forEach(el => { if (el) el.style.display = isPendencia ? '' : 'none'; });
    document.querySelectorAll('.col-motivo').forEach(el => { if (el) el.style.display = isPendencia ? '' : 'none'; });
    document.querySelectorAll('.col-colaborador-item').forEach(el => { if (el) el.style.display = isPendencia ? '' : 'none'; });
    document.querySelectorAll('.col-observacao-item').forEach(el => { if (el) el.style.display = isPendencia ? '' : 'none'; });
    
    // Cabeçalhos (via ID — necessário porque o CSS as esconde por default)
    const thQuantidade = document.getElementById('thQuantidade');
    if (thQuantidade) thQuantidade.textContent = isMGM ? 'QTD (Base)' : 'QTD';
    
    const thStatus = document.getElementById('thStatusAditivo');
    const thNumDoc = document.getElementById('thNumDoc');
    const thUsuario = document.getElementById('thUsuario');
    const thObservacao = document.getElementById('thObservacao');
    const thAditivoSaida = document.getElementById('thAditivoSaida');
    const thAditivoCampo = document.getElementById('thAditivoCampo');
    const thRma = document.getElementById('thRma');
    const thSeparada = document.getElementById('thSeparada');
    const thAplicada = document.getElementById('thAplicada');
    const thDma = document.getElementById('thDma');
    const thPendente = document.getElementById('thPendente');
    const thAplicado = document.getElementById('thAplicado');
    const thColaborador = document.getElementById('thColaborador');
    const thEncarregado = document.getElementById('thEncarregado');
    const thDataBaixa = document.getElementById('thDataBaixa');
    const thBaixado = document.getElementById('thBaixado');
    const thMotivo = document.getElementById('thMotivo');
    const thColaboradorItem = document.getElementById('thColaboradorItem');
    const thObservacaoItem = document.getElementById('thObservacaoItem');
    
    if (thStatus) thStatus.style.display = isAditivo ? '' : 'none';
    if (thNumDoc) thNumDoc.style.display = isAditivo ? '' : 'none';
    if (thUsuario) thUsuario.style.display = isAditivo ? '' : 'none';
    if (thObservacao) thObservacao.style.display = isAditivo ? '' : 'none';
    if (thAditivoSaida) thAditivoSaida.style.display = isMGM ? '' : 'none';
    if (thAditivoCampo) thAditivoCampo.style.display = isMGM ? '' : 'none';
    if (thRma) thRma.style.display = isMGM ? '' : 'none';
    if (thSeparada) thSeparada.style.display = isMGM ? '' : 'none';
    if (thAplicada) thAplicada.style.display = isMGM ? '' : 'none';
    if (thDma) thDma.style.display = isMGM ? '' : 'none';
    if (thPendente) thPendente.style.display = isMGM ? '' : 'none';
    if (thAplicado) thAplicado.style.display = isAditivoFisico ? '' : 'none';
    if (thColaborador) thColaborador.style.display = isAditivoFisico ? '' : 'none';
    if (thEncarregado) thEncarregado.style.display = isAditivoFisico ? '' : 'none';
    if (thDataBaixa) thDataBaixa.style.display = isPendencia ? '' : 'none';
    if (thBaixado) thBaixado.style.display = isPendencia ? '' : 'none';
    if (thMotivo) thMotivo.style.display = isPendencia ? '' : 'none';
    if (thColaboradorItem) thColaboradorItem.style.display = isPendencia ? '' : 'none';
    if (thObservacaoItem) thObservacaoItem.style.display = isPendencia ? '' : 'none';
    
    const formTipo = document.getElementById('formTipo');
    if (formTipo) formTipo.value = tipoInfo.label;
    
    // ============================================
    // 2. BUSCA OS DADOS NO WORKER
    // ============================================
    try {
        mostrarLoadingFormulario(`Buscando controle #${String(numero).padStart(4, '0')}...`);
        
        const url = `${API_URL}${tipoInfo.endpoint}/${numero}`;
        console.log(`🌐 Buscando: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Controle não encontrado');
        
        const data = await response.json();
        controleAtual = data;
        
        console.log('📋 Controle carregado:', data);
        
        // ============================================
        // 3. PREENCHE CABEÇALHO
        // ============================================
        mostrarLoadingFormulario('Preenchendo dados...');
        
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
        if (formDataProgramacao && !isMovimento) {
            formDataProgramacao.value = data.data_programacao || '';
        }
        
        if (isAditivoFisico) {
            const formTipoAditivoFisico = document.getElementById('formTipoAditivoFisico');
            const formDataExecucao = document.getElementById('formDataExecucao');
            if (formTipoAditivoFisico) formTipoAditivoFisico.value = data.tipo || 'SAÍDA';
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
            const formDataSeparacaoFarol = document.getElementById('formDataSeparacaoFarol');
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
            if (formDataSeparacaoFarol) formDataSeparacaoFarol.value = data.data_separacao || '';
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
        
        if (isMGM) {
            const formSeparadorMGM = document.getElementById('formSeparadorMGM');
            const formDataSeparacaoMGM = document.getElementById('formDataSeparacaoMGM');
            const formEncarregadoMGM = document.getElementById('formEncarregadoMGM');
            const formCaminhao = document.getElementById('formCaminhao');
            const formObservacaoMGM = document.getElementById('formObservacaoMGM');
            
            if (formSeparadorMGM) formSeparadorMGM.value = data.separador || '';
            if (formDataSeparacaoMGM) formDataSeparacaoMGM.value = data.data_separacao || '';
            if (formEncarregadoMGM) formEncarregadoMGM.value = data.encarregado || '';
            if (formCaminhao) formCaminhao.value = data.caminhao || '';
            if (formObservacaoMGM) formObservacaoMGM.value = data.observacao || '';
        }
        
        if (isMovimento) {
            const formTipoMovimento = document.getElementById('formTipoMovimento');
            const formCodMovimentacao = document.getElementById('formCodMovimentacao');
            const formDataUnica = document.getElementById('formDataUnica');
            
            if (formTipoMovimento) formTipoMovimento.value = data.tipo_movimento || 'RMA';
            
            const tipoMgm = data.tipo_mgm || 'UNICO';
            const radios = document.querySelectorAll('input[name="tipoMgm"]');
            radios.forEach(r => { r.checked = r.value === tipoMgm; });
            
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
                                <input type="text" class="input-doc-codigo" placeholder="Ex: 2601509345" value="${codigo}" data-id="${id}">
                                <input type="date" class="input-doc-data" value="${dataDoc}" data-id="${id}">
                                <button type="button" class="btn-remover-doc" onclick="removerLinhaDocumentoMultiplo(${id})" title="Remover linha">✕</button>
                            `;
                            container.appendChild(div);
                        }
                    });
                }
                
                if (linhasDocumentosMultiplos.length === 0) adicionarLinhaDocumentoMultiplo();
                
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
        }
        
        // ============================================
        // 4. SE FINALIZADO, DESABILITA
        // ============================================
        if (data.status === 'FINALIZADO') {
            document.querySelectorAll('#controleForm input, #controleForm select, #controleForm textarea').forEach(el => { if (el) el.disabled = true; });
            const addItemBtn = document.querySelector('.add-item-btn');
            if (addItemBtn) addItemBtn.style.display = 'none';
            document.querySelectorAll('.remove-item').forEach(el => { if (el) el.style.display = 'none'; });
            const btnSalvar = document.querySelector('.btn-salvar');
            const btnFinalizar = document.querySelector('.btn-finalizar');
            if (btnSalvar) btnSalvar.style.display = 'none';
            if (btnFinalizar) btnFinalizar.style.display = 'none';
        }
        
        // ============================================
        // 5. CARREGA ITENS
        // ============================================
        mostrarLoadingFormulario('Carregando itens...');
        
        if (temItens) {
            carregarItens(data.itens || []);
        } else {
            const tbody = document.getElementById('itemsBody');
            if (tbody) tbody.innerHTML = '';
        }
        
        // ============================================
        // 6. CONFIGURA INTERAÇÕES
        // ============================================
        configurarPopupDescricao();
        configurarNavegacaoTeclado();
        configurarPasteEmMassa();
        adicionarBotoesAcoesMassa();
        setTimeout(configurarValidacaoDuplicados, 200);
        setTimeout(verificarECorrigirDuplicados, 250);
        
        // ============================================
        // 7. ESCONDE O LOADING (só agora!)
        // ============================================
        setTimeout(() => {
            esconderLoadingFormulario();
            if (!isMovimento) focarCampoObra();
            setTimeout(() => {
                configurarNavegacaoDocumentosMultiplos();
                configurarPasteDocumentosMultiplos();
            }, 300);
        }, 200);
        
    } catch (error) {
        console.error('❌ Erro ao carregar controle:', error);
        mostrarToast('❌ Erro ao carregar controle', 'erro');
        esconderLoadingFormulario();
    }
}

// ============================================
// FOCAR NO CAMPO OBRA
// ============================================

function focarCampoObra() {
    const params = new URLSearchParams(window.location.search);
    const focarObra = params.get('focarObra') === 'true';
    
    if (!focarObra) {
        const isNovo = !controleAtual || Object.keys(controleAtual).length === 0 ||
                       (controleAtual.obra === '' && (!controleAtual.itens || controleAtual.itens.length === 0));
        if (!isNovo) return;
    }
    
    const tentarFocar = function(tentativa = 0) {
        const campoObra = document.getElementById('formObra');
        if (campoObra && isCampoEditavel(campoObra)) {
            campoObra.focus();
            campoObra.select();
            console.log('✅ Campo "Nº Obra" focado');
            const url = new URL(window.location);
            url.searchParams.delete('focarObra');
            window.history.replaceState({}, '', url);
            return true;
        }
        if (tentativa < 10) {
            setTimeout(() => tentarFocar(tentativa + 1), 100);
            return false;
        }
        return false;
    };
    
    setTimeout(() => tentarFocar(), 200);
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
    const isAditivoFisico = tipoAtual === 'aditivo-fisico';
    const isMovimento = tipoAtual === 'movimento';
    const isMGM = tipoAtual === 'mgm';
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
    
    if (isMovimento) {
        const numeroControle = controleAtual.numero;
        const radios = document.querySelectorAll('input[name="tipoMgm"]');
        let tipoMgm = 'UNICO';
        radios.forEach(r => { if (r.checked) tipoMgm = r.value; });
        
        if (tipoMgm === 'UNICO') {
            const codMovimentacao = formCodMovimentacao ? formCodMovimentacao.value.trim() : '';
            data_programacao = formDataUnica ? formDataUnica.value : '';
            if (!codMovimentacao) { mostrarToast('⚠️ Preencha o código da movimentação', 'aviso'); return; }
            if (!data_programacao) { mostrarToast('⚠️ Preencha a data de programação', 'aviso'); return; }
            
            const dadosUnico = {
                obra, data_programacao,
                tipo_movimento: formTipoMovimento ? formTipoMovimento.value : 'RMA',
                cod_movimentacao: codMovimentacao,
                tipo_mgm: 'UNICO',
                criado_por: dadosSessao.matricula || 'Sistema'
            };
            
            try {
                const respLinhas = await fetch(`${API_URL}/movimento-linhas`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        numero: numeroControle,
                        linhas: [{ codigo: codMovimentacao, data: data_programacao }],
                        tipo_mgm: 'UNICO'
                    })
                });
                if (!respLinhas.ok) {
                    const e = await respLinhas.json();
                    throw new Error(e.error || 'Erro');
                }
                await fetch(`${API_URL}${tipoInfo.endpoint}/${numeroControle}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosUnico)
                });
                mostrarToast('✅ Salvo!', 'sucesso');
                await carregarControleFormulario();
            } catch (e) {
                console.error(e);
                mostrarToast('❌ ' + e.message, 'erro');
            }
            return;
        } else {
            const documentosValidos = obterDocumentosMultiplos();
            if (documentosValidos.length === 0) { mostrarToast('⚠️ Adicione ao menos 1 doc', 'aviso'); return; }
            
            const dadosPrincipal = {
                obra,
                data_programacao: documentosValidos[0].data || '',
                tipo_movimento: formTipoMovimento ? formTipoMovimento.value : 'RMA',
                cod_movimentacao: documentosValidos[0].codigo || '',
                tipo_mgm: 'MULTIPLO',
                criado_por: dadosSessao.matricula || 'Sistema'
            };
            
            try {
                await fetch(`${API_URL}${tipoInfo.endpoint}/${numeroControle}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosPrincipal)
                });
                const r = await fetch(`${API_URL}/movimento-linhas`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ numero: numeroControle, linhas: documentosValidos, tipo_mgm: 'MULTIPLO' })
                });
                if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Erro'); }
                const res = await r.json();
                mostrarToast(`✅ ${res.adicionadas || 0} adic, ${res.removidas || 0} remov`, 'sucesso');
                await carregarControleFormulario();
            } catch (e) {
                console.error(e);
                mostrarToast('❌ ' + e.message, 'erro');
            }
            return;
        }
    }
    
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
            if (tabela) tabela.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }
    
    let itens = [];
    if (temItens) {
        itens = getItensFormulario();
        if (itens.length === 0) { mostrarToast('⚠️ Adicione ao menos 1 item', 'aviso'); return; }
    }
    
    const data = { obra, data_programacao, criado_por: dadosSessao.matricula || 'Sistema' };
    if (temItens) data.itens = itens;
    
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
        const formDataSeparacaoFarol = document.getElementById('formDataSeparacaoFarol');
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
        data.data_separacao = formDataSeparacaoFarol?.value || '';
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
    
    if (isMGM) {
        const formSeparadorMGM = document.getElementById('formSeparadorMGM');
        const formDataSeparacaoMGM = document.getElementById('formDataSeparacaoMGM');
        const formEncarregadoMGM = document.getElementById('formEncarregadoMGM');
        const formCaminhao = document.getElementById('formCaminhao');
        const formObservacaoMGM = document.getElementById('formObservacaoMGM');
        data.separador = formSeparadorMGM?.value || '';
        data.data_separacao = formDataSeparacaoMGM?.value || '';
        data.encarregado = formEncarregadoMGM?.value || '';
        data.caminhao = formCaminhao?.value || '';
        data.observacao = formObservacaoMGM?.value || '';
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
        mostrarToast('⚠️ Já finalizado', 'aviso');
        return;
    }
    
    const isMovimento = tipoAtual === 'movimento';
    const numeroControle = controleAtual.numero;
    
    let isMultiplo = false;
    if (isMovimento) {
        const radios = document.querySelectorAll('input[name="tipoMgm"]');
        radios.forEach(r => { if (r.checked && r.value === 'MULTIPLO') isMultiplo = true; });
        if (!isMultiplo && controleAtual.tipo_mgm === 'MULTIPLO') isMultiplo = true;
    }
    
    if (isMovimento && isMultiplo) {
        const tipoInfo = TIPOS[tipoAtual];
        try {
            mostrarToast('⏳ Buscando linhas...', 'info');
            const resp = await fetch(`${API_URL}${tipoInfo.endpoint}?numero=${numeroControle}`);
            if (!resp.ok) throw new Error('Erro ao buscar linhas');
            const data = await resp.json();
            
            let linhas = [];
            if (Array.isArray(data)) linhas = data;
            else if (data.data && Array.isArray(data.data)) linhas = data.data;
            else if (data._linhas && Array.isArray(data._linhas)) linhas = data._linhas;
            else if (data.documentos && Array.isArray(data.documentos)) linhas = data.documentos;
            else if (data.id) linhas = [data];
            
            if (linhas.length === 0) { mostrarToast('⚠️ Nenhuma linha encontrada', 'aviso'); return; }
            if (!confirm(`⚠️ Finalizar ${linhas.length} linhas do movimento #${String(numeroControle).padStart(4, '0')}?`)) return;
            
            let sucessos = 0, erros = 0;
            for (const l of linhas) {
                try {
                    const r = await fetch(`${API_URL}${tipoInfo.endpoint}/${numeroControle}/finalizar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (!r.ok) throw new Error('Erro');
                    sucessos++;
                } catch (e) { erros++; }
            }
            
            if (erros === 0) {
                mostrarToast(`✅ ${sucessos} finalizadas!`, 'sucesso');
                setTimeout(() => window.location.href = `index.html?tipo=${tipoAtual}`, 1500);
            } else {
                mostrarToast(`⚠️ ${sucessos} ok, ${erros} falhas`, 'erro');
            }
        } catch (error) {
            console.error('❌ Erro:', error);
            mostrarToast('❌ ' + error.message, 'erro');
        }
        return;
    }
    
    if (!confirm(`⚠️ Finalizar o controle #${String(controleAtual.numero).padStart(4, '0')}?`)) return;
    
    const tipoInfo = TIPOS[tipoAtual];
    try {
        mostrarToast('⏳ Finalizando...', 'info');
        const resp = await fetch(`${API_URL}${tipoInfo.endpoint}/${controleAtual.numero}/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) { const e = await resp.json(); throw new Error(e.error || 'Erro'); }
        mostrarToast('✅ Finalizado!', 'sucesso');
        setTimeout(() => window.location.href = `index.html?tipo=${tipoAtual}`, 1500);
    } catch (error) {
        console.error('❌ Erro:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.finalizarControle = finalizarControle;

// ============================================
// IMPORTAÇÃO DE EXCEL (PARSER ROBUSTO)
// ============================================

async function handleArquivoExcel(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    
    if (tipoAtual !== 'mgm') {
        mostrarToast('⚠️ Importação disponível apenas para MGM Online', 'aviso');
        return;
    }
    
    if (typeof XLSX === 'undefined') {
        mostrarToast('❌ Biblioteca de Excel não carregada. Recarregue a página.', 'erro');
        return;
    }
    
    try {
        mostrarToast('⏳ Lendo arquivo Excel...', 'info');
        console.log('📂 Iniciando leitura do arquivo:', file.name);
        
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, cellNF: false });
        
        console.log('📚 Abas disponíveis:', workbook.SheetNames);
        
        // Localiza a aba "FORMULÁRIO MGM"
        let sheetName = workbook.SheetNames.find(n => 
            normalizarCabecalho(n).includes('FORMUL') && normalizarCabecalho(n).includes('MGM')
        );
        if (!sheetName) {
            sheetName = workbook.SheetNames.find(n => normalizarCabecalho(n).includes('MGM'));
        }
        if (!sheetName) sheetName = workbook.SheetNames[0];
        
        console.log(`📄 Aba selecionada: "${sheetName}"`);
        const sheet = workbook.Sheets[sheetName];
        
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
        console.log(`📊 Total de linhas na aba: ${raw.length}`);
        
        if (!raw || raw.length < 5) {
            mostrarToast('❌ Arquivo vazio ou inválido', 'erro');
            return;
        }
        
        // Localiza cabeçalho
        let headerRowIdx = -1;
        let headerRowNorm = [];
        
        for (let i = 0; i < Math.min(raw.length, 20); i++) {
            const row = raw[i] || [];
            const rowNorm = row.map(c => normalizarCabecalho(String(c || '')));
            if (rowNorm.some(h => h === 'CODIGO' || h.startsWith('CODIGO'))) {
                headerRowIdx = i;
                headerRowNorm = rowNorm;
                console.log(`📌 Cabeçalho na linha ${i + 1}:`, row);
                break;
            }
        }
        
        if (headerRowIdx === -1) {
            mostrarToast('❌ Não encontrei a linha de cabeçalho (CÓDIGO)', 'erro');
            console.error('❌ Cabeçalho não encontrado. Primeiras 3 linhas:', raw.slice(0, 3));
            return;
        }
        
        // Mapeia colunas
        function findCol(preds) {
            for (const p of preds) {
                const idx = headerRowNorm.findIndex(h => p(h));
                if (idx !== -1) return idx;
            }
            return -1;
        }
        
        const colIdx = {
            item: findCol([h => h === 'ITEM', h => h.startsWith('ITEM')]),
            codigo: findCol([h => h === 'CODIGO', h => h.startsWith('CODIGO')]),
            descricao: findCol([h => h.startsWith('DESCRI'), h => h.includes('DESCRI')]),
            unidade: findCol([h => h === 'UNIDADE', h => h.startsWith('UNIDADE'), h => h === 'UND', h => h === 'UN']),
            aditivo_saida: findCol([h => h.includes('ADITIVO') && (h.includes('SAIDA') || h.includes('SA')), h => h.includes('ADITIVO') && h.includes('S')]),
            aditivo_campo: findCol([h => h.includes('ADITIVO') && h.includes('CAMPO')]),
            rma: findCol([h => h.includes('RMA')]),
            separada: findCol([h => h.includes('SEPARADA')]),
            aplicada: findCol([h => h.includes('APLICADA')]),
            dma: findCol([h => h.includes('DMA') && !h.includes('SUCATA')]),
            pendente: findCol([h => h.includes('PENDENTE')])
        };
        
        console.log('📋 Índices mapeados:', colIdx);
        console.log('📋 Cabeçalho normalizado:', headerRowNorm);
        
        // Fallback para código
        if (colIdx.codigo === -1) {
            console.warn('⚠️ CÓDIGO não encontrado — usando coluna B (idx 1)');
            colIdx.codigo = 1;
        }
        
        // Cabeçalho da MGM
        const cabecalho = {
            obra: '', data_programacao: '', separador: '', data_separacao: '', encarregado: '', caminhao: ''
        };
        
        for (let i = 0; i < headerRowIdx; i++) {
            const row = raw[i] || [];
            for (let c = 0; c < row.length; c++) {
                const cell = String(row[c] || '').trim();
                const cellNorm = normalizarCabecalho(cell);
                
                if (cellNorm.includes('PROGRAMACAO')) {
                    const match = cell.match(/:\s*(.+)/);
                    if (match) cabecalho.data_programacao = normalizarDataExcel(match[1].trim());
                    else if (row[c + 1]) cabecalho.data_programacao = normalizarDataExcel(String(row[c + 1]));
                }
                if (cellNorm === 'NOBRA' || cellNorm === 'NOOBRA' || cellNorm === 'NUMEROOBRA' || cellNorm === 'OBRA') {
                    if (row[c + 1]) cabecalho.obra = String(row[c + 1]).trim();
                }
                if (cellNorm === 'SEPARADOR' || cellNorm.startsWith('SEPARADOR')) {
                    if (row[c + 1]) cabecalho.separador = String(row[c + 1]).trim();
                }
                if (cellNorm === 'ENCARREGADO' || cellNorm.startsWith('ENCARREGADO')) {
                    if (row[c + 1]) cabecalho.encarregado = String(row[c + 1]).trim();
                }
                if (cellNorm === 'CAMINHAO' || cellNorm.startsWith('CAMINHAO')) {
                    if (row[c + 1]) cabecalho.caminhao = String(row[c + 1]).trim();
                }
                if (cellNorm === 'DATASEP' || cellNorm === 'DATASEPARACAO') {
                    if (row[c + 1]) cabecalho.data_separacao = normalizarDataExcel(String(row[c + 1]));
                }
            }
        }
        
        // Fallback: número de obra pelo padrão
        if (!cabecalho.obra) {
            for (let i = 0; i < Math.min(headerRowIdx, 10); i++) {
                const row = raw[i] || [];
                for (let c = 0; c < row.length; c++) {
                    const cell = String(row[c] || '').trim();
                    if (/^\d{8,12}$/.test(cell)) { cabecalho.obra = cell; break; }
                }
                if (cabecalho.obra) break;
            }
        }
        
        console.log('📋 Cabeçalho MGM:', cabecalho);
        
        // Lê itens
        const itens = [];
        
        for (let i = headerRowIdx + 1; i < raw.length; i++) {
            const row = raw[i] || [];
            const codigoRaw = String(row[colIdx.codigo] || '').trim();
            if (!codigoRaw) continue;
            if (normalizarCabecalho(codigoRaw) === 'CODIGO') continue;
            
            const codigoLimpo = codigoRaw.replace(/[^0-9]/g, '');
            if (codigoLimpo.length === 0) continue;
            
            const item = {
                item: parseInt(row[colIdx.item]) || (itens.length + 1),
                codigo: codigoLimpo,
                descricao: colIdx.descricao !== -1 ? String(row[colIdx.descricao] || '').trim() : '',
                unidade: colIdx.unidade !== -1 ? String(row[colIdx.unidade] || '').trim() : '',
                qtd_aditivo_saida: colIdx.aditivo_saida !== -1 ? parseNumeroExcel(row[colIdx.aditivo_saida]) : 0,
                qtd_aditivo_campo: colIdx.aditivo_campo !== -1 ? parseNumeroExcel(row[colIdx.aditivo_campo]) : 0,
                qtd_rma: colIdx.rma !== -1 ? parseNumeroExcel(row[colIdx.rma]) : 0,
                qtd_separada: colIdx.separada !== -1 ? parseNumeroExcel(row[colIdx.separada]) : 0,
                qtd_aplicada: colIdx.aplicada !== -1 ? parseNumeroExcel(row[colIdx.aplicada]) : 0,
                qtd_dma: colIdx.dma !== -1 ? parseNumeroExcel(row[colIdx.dma]) : 0,
                qtd_pendente: colIdx.pendente !== -1 ? parseNumeroExcel(row[colIdx.pendente]) : 0
            };
            
            itens.push(item);
        }
        
        console.log(`✅ ${itens.length} itens extraídos`);
        if (itens.length > 0) console.log('Primeiro item:', itens[0]);
        
        if (itens.length === 0) {
            mostrarToast('⚠️ Nenhum item válido no Excel', 'aviso');
            return;
        }
        
        // Preenche cabeçalho
        if (cabecalho.obra) document.getElementById('formObra').value = cabecalho.obra;
        if (cabecalho.data_programacao) document.getElementById('formDataProgramacao').value = cabecalho.data_programacao;
        if (cabecalho.separador) document.getElementById('formSeparadorMGM').value = cabecalho.separador;
        if (cabecalho.data_separacao) document.getElementById('formDataSeparacaoMGM').value = cabecalho.data_separacao;
        if (cabecalho.encarregado) document.getElementById('formEncarregadoMGM').value = cabecalho.encarregado;
        if (cabecalho.caminhao) document.getElementById('formCaminhao').value = cabecalho.caminhao;
        
        // Preenche itens
        const tbody = document.getElementById('itemsBody');
        tbody.innerHTML = '';
        
        itens.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" value="${item.codigo}" placeholder="Código"></td>
                <td><input type="text" class="item-descricao input-descricao" readonly value="${(item.descricao || '').replace(/"/g, '&quot;')}" placeholder="Descrição"></td>
                <td><input type="text" class="item-unidade" readonly value="${item.unidade}" placeholder="Unid."></td>
                <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0" step="any" value="${item.qtd_rma || ''}"></td>
                <td class="col-mgm"><input type="number" class="item-aditivo-saida" placeholder="0" min="0" step="any" value="${item.qtd_aditivo_saida || ''}"></td>
                <td class="col-mgm"><input type="number" class="item-aditivo-campo" placeholder="0" min="0" step="any" value="${item.qtd_aditivo_campo || ''}"></td>
                <td class="col-mgm"><input type="number" class="item-rma" placeholder="0" min="0" step="any" value="${item.qtd_rma || ''}"></td>
                <td class="col-mgm"><input type="number" class="item-separada" placeholder="0" min="0" step="any" value="${item.qtd_separada || ''}"></td>
                <td class="col-mgm"><input type="number" class="item-aplicada-mgm" placeholder="0" min="0" step="any" value="${item.qtd_aplicada || ''}"></td>
                <td class="col-mgm"><input type="number" class="item-dma" placeholder="0" min="0" step="any" value="${item.qtd_dma || ''}"></td>
                <td class="col-mgm"><input type="number" class="item-pendente" placeholder="0" min="0" step="any" value="${item.qtd_pendente || ''}"></td>
                <td><button type="button" class="remove-item" onclick="removerItem(this)">✕</button></td>
            `;
            tbody.appendChild(tr);
        });
        
        setTimeout(() => {
            configurarNavegacaoTeclado();
            configurarPopupDescricao();
            configurarPasteEmMassa();
            configurarValidacaoDuplicados();
            verificarECorrigirDuplicados();
            adicionarBotoesAcoesMassa();
        }, 300);
        
        mostrarToast(`✅ ${itens.length} itens importados! Revise e clique em Salvar.`, 'sucesso');
        event.target.value = '';
        
    } catch (error) {
        console.error('❌ Erro ao importar Excel:', error);
        mostrarToast(`❌ Erro: ${error.message}`, 'erro');
    }
}

window.handleArquivoExcel = handleArquivoExcel;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando Controles DCMD - Formulário (v3)...');
    
    const sessao = carregarDadosUsuario();
    if (!sessao) return;
    
    await carregarMateriais();
    await carregarControleFormulario();
    
    window.addEventListener('scroll', controlarBotoesNavegacao);
    window.addEventListener('resize', controlarBotoesNavegacao);
    
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
    
    console.log('✅ Inicialização concluída!');
});

// ============================================
// EXPORTS GLOBAIS
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
window.configurarNavegacaoDocumentosMultiplos = configurarNavegacaoDocumentosMultiplos;
window.configurarPasteDocumentosMultiplos = configurarPasteDocumentosMultiplos;
window.obterDocumentosMultiplos = obterDocumentosMultiplos;
window.handleArquivoExcel = handleArquivoExcel;
window.mostrarLoadingFormulario = mostrarLoadingFormulario;
window.esconderLoadingFormulario = esconderLoadingFormulario;