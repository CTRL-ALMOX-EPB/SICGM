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
    
    const material = buscarMaterialArquivo(input.value);
    
    if (material) {
        descInput.value = material.descricao || '';
        undInput.value = material.unidade || 'UN';
        mostrarToast(`✅ ${material.descricao}`, 'sucesso');
    } else {
        mostrarToast('⚠️ Código não encontrado', 'aviso');
        descInput.value = '';
        undInput.value = '';
    }
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
    
    // Colunas do Aditivo Sistêmico
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
    
    // Colunas do Aditivo Físico
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
    
    // Colunas da Pendência de Baixa
    document.querySelectorAll('.col-pendente-aditivo').forEach(el => {
        if (el) el.style.display = isPendencia ? '' : 'none';
    });
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
    
    const thPendenteAditivo = document.getElementById('thPendenteAditivo');
    const thDataBaixa = document.getElementById('thDataBaixa');
    const thBaixado = document.getElementById('thBaixado');
    const thMotivo = document.getElementById('thMotivo');
    const thColaboradorItem = document.getElementById('thColaboradorItem');
    const thObservacaoItem = document.getElementById('thObservacaoItem');
    
    if (thPendenteAditivo) thPendenteAditivo.style.display = isPendencia ? '' : 'none';
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
        const formData = document.getElementById('formData');
        if (formObra) formObra.value = data.obra || '';
        if (formData) formData.value = data.data_programacao || '';
        
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
        
        if (isMovimento) {
            const formTipoMovimento = document.getElementById('formTipoMovimento');
            const formCodMovimentacao = document.getElementById('formCodMovimentacao');
            if (formTipoMovimento) formTipoMovimento.value = data.tipo_movimento || 'RMA';
            if (formCodMovimentacao) formCodMovimentacao.value = data.cod_movimentacao || '';
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
    
    if (key === 'Enter') {
        e.preventDefault();
        
        if (target.tagName === 'TEXTAREA') {
            if (e.shiftKey) {
                return;
            }
        }
        
        avancarParaProximoCampo(target);
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
    
    const classesAlvo = Array.from(elementoAlvo.classList);
    let classeAlvo = '';
    
    const mapeamentoColunas = {
        'item-codigo': 'codigo',
        'item-quantidade': 'quantidade',
        'item-motivo': 'motivo',
        'item-observacao-item': 'observacao_item',
        'item-pendente-aditivo': 'pendente_aditivo',
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
        const valor = linhas[i].trim();
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
                    campo.value = parseFloat(valor) || '';
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
// AÇÕES EM MASSA (BULK ACTIONS) - ORGANIZADO E HARMONIOSO
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
        // Grupo 1: Baixar/Desbaixar
        const grupoBaixar = document.createElement('span');
        grupoBaixar.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        
        const btnBaixarTodos = criarBotaoMassa('✅ Baixar Todos', '#48BB78', function() {
            aplicarEmMassaSelect('item-baixado', 'SIM');
        });
        grupoBaixar.appendChild(btnBaixarTodos);
        
        const btnDesbaixarTodos = criarBotaoMassa('⬜ Desbaixar', '#ED8936', function() {
            aplicarEmMassaSelect('item-baixado', 'NÃO');
        });
        grupoBaixar.appendChild(btnDesbaixarTodos);
        container.appendChild(grupoBaixar);
        
        container.appendChild(criarSeparadorPequeno());
        
        // Grupo 2: Motivo
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
        
        // Grupo 3: Pendente Aditivo
        const grupoPendente = document.createElement('span');
        grupoPendente.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        const pendenteContainer = criarSelectMassa(
            '📌 Pend. Aditivo:',
            'item-pendente-aditivo',
            ['', 'SIM', 'NÃO'],
            function(valor) {
                aplicarEmMassaSelect('item-pendente-aditivo', valor);
            }
        );
        grupoPendente.appendChild(pendenteContainer);
        container.appendChild(grupoPendente);
        
        container.appendChild(criarSeparadorPequeno());
        
        // Grupo 4: Data Baixa
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
        // Grupo: Status
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
        
        // Grupo: Observação
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
        // Grupo 1: Aplicado
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
        
        // Grupo 2: Solicitante
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
        
        // Grupo 3: Encarregado
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
    
    // Separador antes do botão limpar
    container.appendChild(criarSeparadorPequeno());
    
    // Botão Limpar Quantidades
    const btnLimpar = document.createElement('button');
    btnLimpar.textContent = '🧹 Limpar Qtds';
    btnLimpar.className = 'btn-bulk-action';
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
    btnLimpar.onclick = function() {
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
    btn.onclick = acao;
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
    btn.onclick = function() {
        const valor = input.value.trim();
        if (valor !== '') {
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
    btn.onclick = function() {
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
                el.value = valor !== '' ? parseFloat(valor) : '';
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
    const matriculaUsuario = getMatriculaUsuarioLogado();
    
    const tr = document.createElement('tr');
    
    let html = `
        <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" placeholder="Código"></td>
        <td><input type="text" class="item-descricao input-descricao" readonly placeholder="Descrição"></td>
        <td><input type="text" class="item-unidade" readonly placeholder="Unid."></td>
        <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0"></td>
    `;
    
    if (isPendencia) {
        html += `
            <td class="col-pendente-aditivo">
                <select class="item-pendente-aditivo">
                    <option value="">-</option>
                    <option value="SIM">SIM</option>
                    <option value="NÃO">NÃO</option>
                </select>
            </td>
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
        <td><button class="remove-item" onclick="removerItem(this)">✕</button></td>
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
            <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0" value="${item.quantidade || ''}" ${isFinalizado ? 'disabled' : ''}></td>
        `;
        
        if (isPendencia) {
            // Colaborador: se já tiver valor, mantém; senão, usa o usuário logado
            const colaboradorValue = item.colaborador || nomeUsuario;
            
            html += `
                <td class="col-pendente-aditivo">
                    <select class="item-pendente-aditivo" ${isFinalizado ? 'disabled' : ''}>
                        <option value="" ${item.pendente_aditivo === '' ? 'selected' : ''}>-</option>
                        <option value="SIM" ${item.pendente_aditivo === 'SIM' ? 'selected' : ''}>SIM</option>
                        <option value="NÃO" ${item.pendente_aditivo === 'NÃO' ? 'selected' : ''}>NÃO</option>
                    </select>
                </td>
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
            <td><button class="remove-item" onclick="removerItem(this)" ${isFinalizado ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>✕</button></td>
        `;
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
    
    setTimeout(configurarNavegacaoTeclado, 50);
    setTimeout(configurarPopupDescricao, 100);
    setTimeout(configurarPasteEmMassa, 100);
    setTimeout(adicionarBotoesAcoesMassa, 100);
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
                const pendenteAditivo = row.querySelector('.item-pendente-aditivo');
                const dataBaixa = row.querySelector('.item-data-baixa');
                const baixado = row.querySelector('.item-baixado');
                const motivo = row.querySelector('.item-motivo');
                const colaboradorItem = row.querySelector('.item-colaborador-item');
                const observacaoItem = row.querySelector('.item-observacao-item');
                
                item.pendente_aditivo = pendenteAditivo?.value || '';
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
    const formData = document.getElementById('formData');
    
    const obra = formObra ? formObra.value.trim() : '';
    const data_programacao = formData ? formData.value : '';
    
    if (!obra) {
        mostrarToast('⚠️ Preencha o número da obra', 'aviso');
        return;
    }
    
    if (!data_programacao) {
        mostrarToast('⚠️ Preencha a data de programação', 'aviso');
        return;
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
    
    if (isMovimento) {
        const formTipoMovimento = document.getElementById('formTipoMovimento');
        const formCodMovimentacao = document.getElementById('formCodMovimentacao');
        data.tipo_movimento = formTipoMovimento?.value || 'RMA';
        data.cod_movimentacao = formCodMovimentacao?.value || '';
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
            window.location.href = 'index.html';
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
    
    window.addEventListener('scroll', controlarBotoesNavegacao);
    window.addEventListener('load', function() {
        setTimeout(controlarBotoesNavegacao, 500);
        setTimeout(configurarNavegacaoTeclado, 300);
        setTimeout(configurarPasteEmMassa, 300);
        setTimeout(adicionarBotoesAcoesMassa, 300);
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
window.getNomeUsuarioLogado = getNomeUsuarioLogado;
window.getMatriculaUsuarioLogado = getMatriculaUsuarioLogado;