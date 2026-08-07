// ============================================
// S.A. EMERGENCIAL - SICGM (COMPLETO COM R2 CORRIGIDO)
// ============================================

const API_URL = 'https://fancy-unit-799b.alefe-gomes-72f.workers.dev/api';
const R2_BUCKET_URL = 'https://pub-8c9c377ceaa648c2ad535ea1abba45f8.r2.dev';
const R2_UPLOAD_URL = 'https://fancy-unit-799b.alefe-gomes-72f.workers.dev/upload';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let perfilUsuario = 'OPERACIONAL';
let dadosSessao = null;
let sasCarregadas = [];
let saAtual = null;
let usuariosAutorizados = [];
let colaboradoresCache = {};
let materiaisCache = {};
let popupTimeout = null;
let popupElement = null;
let overlayElement = null;

// Variáveis da câmera
let streamAtual = null;
let fotoCapturada = null;
let cameraAtiva = 'environment';

// ============================================
// FUNÇÃO PARA REDIRECIONAR PARA HOME
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

// ============================================
// TOAST DE NOTIFICAÇÃO
// ============================================

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
    
    toast.addEventListener('click', () => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
    });
}

// ============================================
// CARREGAR USUÁRIOS AUTORIZADOS
// ============================================

async function carregarUsuariosAutorizados() {
    try {
        const response = await fetch('../data/usuarios-autorizados.txt');
        
        if (!response.ok) {
            console.warn('⚠️ Arquivo usuarios-autorizados.txt não encontrado');
            return ['999999'];
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        
        usuariosAutorizados = [];
        
        linhas.forEach(linha => {
            linha = linha.trim();
            if (!linha) return;
            const partes = linha.split('\t');
            if (partes.length >= 1) {
                const matricula = partes[0].trim();
                if (matricula) {
                    usuariosAutorizados.push(matricula);
                }
            }
        });
        
        console.log('✅ Usuários autorizados a criar S.A.:', usuariosAutorizados);
        return usuariosAutorizados;
        
    } catch (error) {
        console.error('❌ Erro ao carregar usuários autorizados:', error);
        return ['999999'];
    }
}

function usuarioPodeCriarSA(matricula) {
    if (!matricula) return false;
    if (perfilUsuario === 'GESTAO') return true;
    return usuariosAutorizados.includes(matricula);
}

// ============================================
// CARREGAR COLABORADORES DO ARQUIVO
// ============================================

async function carregarColaboradoresSA() {
    try {
        const response = await fetch('../data/colaboradores-s-a.txt');
        
        if (!response.ok) {
            console.warn('⚠️ Arquivo colaboradores-s-a.txt não encontrado');
            return;
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        
        colaboradoresCache = {};
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const partes = linha.split('\t');
            if (partes.length >= 6) {
                const filial = partes[0].trim();
                const matricula = partes[1].trim();
                const colaborador = partes[2].trim();
                const cpf = partes[3].trim();
                const centroCusto = partes[4].trim();
                const funcao = partes[5].trim();
                
                if (matricula) {
                    colaboradoresCache[matricula] = {
                        filial: filial,
                        matricula: matricula,
                        nome: colaborador,
                        cpf: cpf,
                        centro_custo: centroCusto,
                        funcao: funcao
                    };
                    
                    const matriculaComZeros = String(matricula).padStart(6, '0');
                    if (matriculaComZeros !== matricula) {
                        colaboradoresCache[matriculaComZeros] = {
                            filial: filial,
                            matricula: matriculaComZeros,
                            nome: colaborador,
                            cpf: cpf,
                            centro_custo: centroCusto,
                            funcao: funcao
                        };
                    }
                }
            }
        }
        
        console.log('✅ Colaboradores S.A. carregados:', Object.keys(colaboradoresCache).length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar colaboradores:', error);
    }
}

// ============================================
// CARREGAR MATERIAIS DO ARQUIVO
// ============================================

async function carregarMateriaisSA() {
    try {
        const response = await fetch('../data/materiais-proprios.txt');
        
        if (!response.ok) {
            console.warn('⚠️ Arquivo materiais-proprios.txt não encontrado');
            return;
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        
        materiaisCache = {};
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const partes = linha.split('\t');
            if (partes.length >= 3) {
                const codigo = partes[0].trim();
                const descricao = partes[2].trim();
                
                if (codigo && descricao) {
                    materiaisCache[codigo] = {
                        codigo: codigo,
                        descricao: descricao
                    };
                }
            }
        }
        
        console.log('✅ Materiais S.A. carregados:', Object.keys(materiaisCache).length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar materiais:', error);
    }
}

// ============================================
// FUNÇÕES DE DATA
// ============================================

function getDataBrasil() {
    const agora = new Date();
    const offsetBrasil = -3;
    const horaUTC = agora.getTime() + (agora.getTimezoneOffset() * 60000);
    const dataBrasil = new Date(horaUTC + (offsetBrasil * 3600000));
    return dataBrasil.toISOString().split('T')[0];
}

function formatarDataHora(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dataString;
    }
}

// ============================================
// CARREGAR DADOS DO USUÁRIO
// ============================================

function carregarDadosUsuario() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    
    console.log('🔍 Verificando sessão S.A.:', sessao ? 'Sessão encontrada' : 'Sessão NÃO encontrada');
    
    if (!sessao) {
        console.log('❌ Sessão não encontrada, redirecionando para login');
        window.location.href = '../login.html';
        return null;
    }
    
    try {
        dadosSessao = JSON.parse(sessao);
        perfilUsuario = dadosSessao.perfil || 'OPERACIONAL';
        
        const timestamp = dadosSessao.timestamp || 0;
        const agora = Date.now();
        const oitoHoras = 8 * 60 * 60 * 1000;
        
        if (agora - timestamp > oitoHoras) {
            console.log('⚠️ Sessão expirada, redirecionando para login');
            sessionStorage.removeItem('sessaoSICGM');
            window.location.href = '../login.html';
            return null;
        }
        
        console.log('✅ Usuário autenticado S.A.:', dadosSessao.nome, '| Perfil:', perfilUsuario);
        
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
        console.error('❌ Erro ao carregar dados do usuário:', e);
        window.location.href = '../login.html';
        return null;
    }
}

// ============================================
// BUSCAR COLABORADOR POR MATRÍCULA
// ============================================

function buscarColaboradorArquivo(matricula) {
    matricula = matricula.trim();
    if (!matricula) return null;
    
    if (colaboradoresCache[matricula]) {
        return colaboradoresCache[matricula];
    }
    
    const matriculaComZeros = String(matricula).padStart(6, '0');
    if (colaboradoresCache[matriculaComZeros]) {
        return colaboradoresCache[matriculaComZeros];
    }
    
    for (const key of Object.keys(colaboradoresCache)) {
        if (key === matricula || key === matriculaComZeros) {
            return colaboradoresCache[key];
        }
    }
    
    return null;
}

async function buscarColaborador() {
    const matriculaInput = document.getElementById('matricula');
    const matricula = matriculaInput.value.trim();
    
    if (!matricula) {
        mostrarToast('⚠️ Digite uma matrícula', 'aviso');
        return;
    }
    
    const colaborador = buscarColaboradorArquivo(matricula);
    
    if (colaborador) {
        document.getElementById('colaborador').value = colaborador.nome || '';
        document.getElementById('cpf').value = colaborador.cpf || '';
        document.getElementById('funcao').value = colaborador.funcao || '';
        document.getElementById('filial').value = colaborador.filial || '';
        document.getElementById('centroCusto').value = colaborador.centro_custo || '';
        
        matriculaInput.value = colaborador.matricula;
        
        mostrarToast(`✅ ${colaborador.nome} encontrado!`, 'sucesso');
    } else {
        mostrarToast('❌ Colaborador não encontrado', 'erro');
        document.getElementById('colaborador').value = '';
        document.getElementById('cpf').value = '';
        document.getElementById('funcao').value = '';
        document.getElementById('filial').value = '';
        document.getElementById('centroCusto').value = '';
    }
}

window.buscarColaborador = buscarColaborador;

// ============================================
// OBTER TIPO DE S.A. SELECIONADO
// ============================================

function getTipoSASelecionado() {
    const radios = document.querySelectorAll('input[name="tipo_sa"]');
    for (const radio of radios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return 'EMERGENCIAL';
}

window.getTipoSASelecionado = getTipoSASelecionado;

// ============================================
// OBTER GERAR DESCONTO SELECIONADO
// ============================================

function getGerarDescontoSelecionado() {
    const radios = document.querySelectorAll('input[name="gerar_desconto"]');
    for (const radio of radios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return 'NAO';
}

window.getGerarDescontoSelecionado = getGerarDescontoSelecionado;

// ============================================
// BUSCAR MATERIAL POR CÓDIGO (CASE-INSENSITIVE)
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
        mostrarToast('✅ Material encontrado!', 'sucesso');
    } else {
        mostrarToast('⚠️ Código não encontrado', 'aviso');
        descInput.value = '';
        undInput.value = '';
    }
}

window.buscarMaterial = buscarMaterial;

// ============================================
// POP-UP DE DESCRIÇÃO DO MATERIAL
// ============================================

function inicializarPopup() {
    popupElement = document.getElementById('descricao-popup');
    overlayElement = document.getElementById('popup-overlay');
    
    if (!popupElement || !overlayElement) return;
    
    overlayElement.addEventListener('click', function() {
        fecharPopup();
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            fecharPopup();
        }
    });
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
    
    const material = buscarMaterialArquivo(codigo);
    
    let html = `
        <span class="popup-titulo">📦 ${codigo}</span>
        <span class="popup-texto">${descricao}</span>
    `;
    
    if (material) {
        html += `<span class="popup-codigo">UND: ${material.unidade || unidade || '-'}</span>`;
    } else if (unidade && unidade !== '-') {
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
    if (popupTimeout) {
        clearTimeout(popupTimeout);
        popupTimeout = null;
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
    
    window.addEventListener('scroll', function() {
        if (popupElement && popupElement.classList.contains('show')) {
            fecharPopup();
        }
    });
}

// ============================================
// FUNÇÃO PARA UPLOAD DIRETO PARA O R2 (CORRIGIDA)
// ============================================

async function uploadParaR2(imagemDataURL, pasta, nomeArquivo) {
    try {
        console.log('📤 Iniciando upload direto para R2...');
        console.log('📤 Pasta:', pasta);
        console.log('📤 Arquivo:', nomeArquivo);
        
        // Converte DataURL para Blob
        const response = await fetch(imagemDataURL);
        const blob = await response.blob();
        
        console.log('📤 Tamanho do blob:', blob.size, 'bytes');
        
        // Gera nome único se não fornecido
        if (!nomeArquivo) {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            nomeArquivo = `${timestamp}_${random}.jpg`;
        }
        
        // Garante extensão correta
        if (!nomeArquivo.endsWith('.jpg') && !nomeArquivo.endsWith('.jpeg') && !nomeArquivo.endsWith('.png')) {
            nomeArquivo = nomeArquivo + '.jpg';
        }
        
        // Constrói o caminho completo
        const path = `${pasta}/${nomeArquivo}`;
        
        // UPLOAD DIRETO PARA O R2 (SEM PROXY)
        const url = `https://pub-8c9c377ceaa648c2ad535ea1abba45f8.r2.dev/${path}`;
        
        console.log(`📤 Upload direto para: ${url}`);
        
        // Detecta o Content-Type
        let contentType = 'image/jpeg';
        if (imagemDataURL.startsWith('data:image/png')) {
            contentType = 'image/png';
        } else if (imagemDataURL.startsWith('data:image/webp')) {
            contentType = 'image/webp';
        }
        
        // Faz o upload direto
        const uploadResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType
            },
            body: blob
        });
        
        console.log('📤 Status do upload direto:', uploadResponse.status);
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('❌ Erro no upload direto:', errorText);
            throw new Error(`Erro ao fazer upload: ${uploadResponse.status} - ${errorText}`);
        }
        
        // A URL pública é a mesma
        const publicUrl = `https://pub-8c9c377ceaa648c2ad535ea1abba45f8.r2.dev/${path}`;
        
        console.log(`✅ Upload direto concluído: ${publicUrl}`);
        
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
// COMPRIMIR IMAGEM ANTES DO UPLOAD
// ============================================

async function comprimirImagem(dataURL, qualidade = 0.7) {
    return new Promise((resolve, reject) => {
        try {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = height * (MAX_WIDTH / width);
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = width * (MAX_HEIGHT / height);
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', qualidade));
            };
            img.onerror = reject;
            img.src = dataURL;
        } catch (error) {
            reject(error);
        }
    });
}

// ============================================
// CRIAR NOVA S.A.
// ============================================

async function criarNovaSA() {
    if (!dadosSessao) {
        mostrarToast('⚠️ Sessão inválida. Faça login novamente.', 'erro');
        return;
    }
    
    const podeCriar = usuarioPodeCriarSA(dadosSessao.matricula);
    
    if (!podeCriar) {
        mostrarToast('🔒 Você não tem permissão para criar novas S.A.', 'aviso');
        return;
    }
    
    const dataAtual = getDataBrasil();
    
    try {
        mostrarToast('⏳ Criando nova S.A...', 'info');
        
        const data = {
            solicitante: dadosSessao.nome || 'Sistema',
            data_solicitacao: dataAtual,
            tipo_sa: 'EMERGENCIAL',
            gerar_desconto: 'NAO',
            colaborador: {
                matricula: '',
                nome: '',
                cpf: '',
                funcao: '',
                filial: '',
                centro_custo: ''
            },
            itens: [],
            status: 'PENDENTE',
            created_at: new Date().toISOString(),
            criado_por: dadosSessao.matricula || 'sistema'
        };
        
        const response = await fetch(`${API_URL}/sa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar S.A.');
        }
        
        const resultado = await response.json();
        const numero = resultado.numero;
        
        mostrarToast(`✅ S.A. #${String(numero).padStart(4, '0')} criada com sucesso!`, 'sucesso');
        await carregarListaSA();
        
    } catch (error) {
        console.error('❌ Erro ao criar S.A.:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.criarNovaSA = criarNovaSA;

// ============================================
// ADICIONAR LINHA DE ITEM
// ============================================

function adicionarLinhaItem() {
    const tbody = document.getElementById('itemsBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" placeholder="Código"></td>
        <td><input type="text" class="item-descricao input-descricao" readonly placeholder="Descrição"></td>
        <td><input type="text" class="item-unidade" readonly placeholder="Unid."></td>
        <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0"></td>
        <td>
            <select class="item-armazem">
                <option value="">Selecione</option>
                <option value="01">01</option><option value="02">02</option>
                <option value="03">03</option><option value="04">04</option>
                <option value="05">05</option><option value="06">06</option>
                <option value="07">07</option><option value="08">08</option>
                <option value="09">09</option><option value="10">10</option>
                <option value="11">11</option><option value="12">12</option>
            </select>
        </td>
        <td><input type="text" class="item-ca" placeholder="C.A"></td>
        <td><button class="remove-item" onclick="removerItem(this)">✕</button></td>
    `;
    tbody.appendChild(tr);
    
    setTimeout(configurarPopupDescricao, 100);
}

window.adicionarLinhaItem = adicionarLinhaItem;

// ============================================
// REMOVER ITEM
// ============================================

function removerItem(btn) {
    const tbody = document.getElementById('itemsBody');
    if (tbody.children.length <= 1) {
        mostrarToast('⚠️ Deve haver pelo menos um item', 'aviso');
        return;
    }
    const row = btn.closest('tr');
    row.remove();
}

window.removerItem = removerItem;

// ============================================
// OBTER ITENS DO FORMULÁRIO
// ============================================

function getItensFormulario() {
    const items = [];
    const rows = document.querySelectorAll('#itemsBody tr');
    rows.forEach(row => {
        const codigo = row.querySelector('.item-codigo')?.value.trim();
        const descricao = row.querySelector('.item-descricao')?.value.trim();
        const unidade = row.querySelector('.item-unidade')?.value.trim();
        const quantidade = parseFloat(row.querySelector('.item-quantidade')?.value) || 0;
        const armazem = row.querySelector('.item-armazem')?.value || '';
        const ca = row.querySelector('.item-ca')?.value.trim() || '';
        
        if (codigo && quantidade > 0) {
            items.push({ codigo, descricao, unidade, quantidade, armazem, ca });
        }
    });
    return items;
}

// ============================================
// SALVAR S.A.
// ============================================

async function salvarSA() {
    if (!dadosSessao) {
        const sessao = sessionStorage.getItem('sessaoSICGM');
        if (!sessao) {
            mostrarToast('⚠️ Sessão expirada. Faça login novamente.', 'erro');
            setTimeout(() => { window.location.href = '../login.html'; }, 1500);
            return;
        }
        try {
            dadosSessao = JSON.parse(sessao);
        } catch (e) {
            window.location.href = '../login.html';
            return;
        }
    }
    
    const solicitante = document.getElementById('solicitante').value.trim();
    const matricula = document.getElementById('matricula').value.trim();
    const colaborador = document.getElementById('colaborador').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const funcao = document.getElementById('funcao').value.trim();
    const filial = document.getElementById('filial').value.trim();
    const centroCusto = document.getElementById('centroCusto').value.trim();
    
    const tipoSA = getTipoSASelecionado();
    const gerarDesconto = getGerarDescontoSelecionado();
    
    if (!solicitante) {
        mostrarToast('⚠️ Solicitante não identificado', 'erro');
        return;
    }
    
    if (!matricula || !colaborador) {
        mostrarToast('⚠️ Preencha os dados do colaborador', 'aviso');
        return;
    }
    
    const itens = getItensFormulario();
    if (itens.length === 0) {
        mostrarToast('⚠️ Adicione pelo menos um item com quantidade', 'aviso');
        return;
    }
    
    const numero = document.getElementById('saNumero').textContent.replace('#', '');
    
    try {
        const data = {
            numero: numero,
            solicitante: solicitante,
            data_solicitacao: document.getElementById('dataSolicitacao').value,
            tipo_sa: tipoSA,
            gerar_desconto: gerarDesconto,
            colaborador: {
                matricula: matricula,
                nome: colaborador,
                cpf: cpf,
                funcao: funcao,
                filial: filial,
                centro_custo: centroCusto
            },
            itens: itens,
            status: 'PENDENTE',
            updated_at: new Date().toISOString(),
            criado_por: dadosSessao?.matricula || 'sistema'
        };
        
        console.log('📤 Salvando S.A.:', data);
        
        const response = await fetch(`${API_URL}/sa/${numero}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao salvar S.A.');
        }
        
        mostrarToast('✅ S.A. salva com sucesso!', 'sucesso');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erro ao salvar S.A.:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.salvarSA = salvarSA;

// ============================================
// FINALIZAR S.A.
// ============================================

async function finalizarSA() {
    if (!confirm('⚠️ Tem certeza que deseja FINALIZAR esta S.A.?')) return;
    
    const numero = document.getElementById('saNumero').textContent.replace('#', '');
    
    try {
        const response = await fetch(`${API_URL}/sa/${numero}/finalizar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                finalizado_por: dadosSessao?.matricula || 'sistema',
                finalizado_em: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (error.error && error.error.includes('assinado')) {
                mostrarToast('⚠️ Aguarde as duas assinaturas serem concluídas.', 'aviso');
                return;
            }
            throw new Error(error.error || 'Erro ao finalizar S.A.');
        }
        
        mostrarToast('✅ S.A. finalizada com sucesso!', 'sucesso');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('❌ Erro ao finalizar S.A.:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.finalizarSA = finalizarSA;

// ============================================
// MARCAR S.A. COMO ATENDIDA NO PROTHEUS
// ============================================

async function marcarAtendidaProtheus() {
    const numero = document.getElementById('saNumero').textContent.replace('#', '');
    
    if (!confirm(`⚠️ Confirma que a S.A. #${String(numero).padStart(4, '0')} foi ATENDIDA no sistema Protheus?`)) return;
    
    try {
        mostrarToast('⏳ Atualizando status...', 'info');
        
        const response = await fetch(`${API_URL}/sa/${numero}/atendida-protheus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                atendido_por: dadosSessao?.matricula || 'sistema',
                atendido_em: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao atualizar status');
        }
        
        mostrarToast('✅ S.A. marcada como ATENDIDA NO PROTHEUS!', 'sucesso');
        
        await carregarSAFormulario();
        await carregarListaSA();
        
    } catch (error) {
        console.error('❌ Erro ao marcar como atendida:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.marcarAtendidaProtheus = marcarAtendidaProtheus;

// ============================================
// ABRIR PÁGINA DE ASSINATURA
// ============================================

function abrirPaginaAssinatura(tipo) {
    if (window.event) {
        window.event.preventDefault();
        window.event.stopPropagation();
    }
    
    const numero = document.getElementById('saNumero').textContent.replace('#', '');
    
    let nome = '';
    
    if (tipo === 'entregue') {
        nome = dadosSessao?.nome || document.getElementById('solicitante')?.value || '';
    } else {
        nome = document.getElementById('colaborador')?.value || '';
    }
    
    if (!nome) {
        mostrarToast(`⚠️ ${tipo === 'entregue' ? 'Identifique o atendente' : 'Preencha o colaborador'} antes de assinar.`, 'aviso');
        return false;
    }
    
    const url = `assinar.html?tipo=${tipo}&numero=${numero}&nome=${encodeURIComponent(nome)}`;
    
    const janela = window.open(
        url, 
        'AssinaturaSA', 
        'width=500,height=650,resizable=yes,scrollbars=yes,menubar=no,status=no'
    );
    
    if (!janela) {
        mostrarToast('⚠️ Permita pop-ups para realizar a assinatura.', 'aviso');
    }
    
    return false;
}

window.abrirPaginaAssinatura = abrirPaginaAssinatura;

// ============================================
// VERIFICAR ASSINATURA CONCLUÍDA
// ============================================

function verificarAssinaturaConcluida() {
    if (!saAtual) return;
    
    const chave = 'assinatura_concluida_' + saAtual.numero;
    const dados = sessionStorage.getItem(chave);
    
    if (dados) {
        try {
            const info = JSON.parse(dados);
            const agora = Date.now();
            if (agora - info.timestamp < 30000) {
                console.log(`✅ Assinatura ${info.tipo} concluída detectada!`);
                sessionStorage.removeItem(chave);
                
                setTimeout(() => {
                    carregarSAFormulario();
                    mostrarToast(`✅ Assinatura ${info.tipo === 'entregue' ? 'de entrega' : 'de recebimento'} concluída!`, 'sucesso');
                }, 500);
            } else {
                sessionStorage.removeItem(chave);
            }
        } catch (e) {
            sessionStorage.removeItem(chave);
        }
    }
}

// ============================================
// ATUALIZAR UI DE ASSINATURA
// ============================================

function atualizarAssinaturaUI(tipo, dados) {
    console.log(`🔄 Atualizando UI para ${tipo}:`, dados);
    
    const box = document.querySelector(`.assinatura-box[data-tipo="${tipo}"]`);
    if (!box) {
        console.warn(`⚠️ Box de assinatura não encontrada para ${tipo}`);
        return;
    }
    
    const nomeEl = box.querySelector('.signatario-nome');
    const dataEl = box.querySelector('.signatario-data');
    const preview = box.querySelector('.signature-preview');
    const img = box.querySelector('.signature-img');
    const btnAssinar = box.querySelector('.btn-assinar');
    const btnReassinar = box.querySelector('.btn-reassinar');
    
    if (nomeEl) nomeEl.textContent = dados.nome || '-';
    if (dataEl) dataEl.textContent = dados.data ? formatarDataHora(dados.data) : '-';
    
    if (dados.assinatura && img && preview) {
        img.src = dados.assinatura;
        preview.style.display = 'block';
        if (btnAssinar) btnAssinar.style.display = 'none';
        if (btnReassinar) btnReassinar.style.display = 'inline-flex';
        box.classList.add('has-signature');
        console.log(`✅ Assinatura ${tipo} renderizada com sucesso`);
    } else {
        if (preview) preview.style.display = 'none';
        if (btnAssinar) btnAssinar.style.display = 'inline-flex';
        if (btnReassinar) btnReassinar.style.display = 'none';
        box.classList.remove('has-signature');
        console.log(`⚠️ Nenhuma imagem de assinatura para ${tipo}`);
    }
}

// ============================================
// ATUALIZAR UI DE FOTO
// ============================================

function atualizarFotoUI(fotoData) {
    const preview = document.getElementById('fotoPreviewRecebido');
    const img = document.getElementById('fotoImgRecebido');
    const btnExcluir = document.getElementById('btnExcluirFoto');
    
    if (fotoData && fotoData.url) {
        img.src = fotoData.url;
        preview.style.display = 'block';
        if (btnExcluir) btnExcluir.style.display = 'inline-block';
        console.log('✅ Foto do colaborador carregada');
    } else {
        preview.style.display = 'none';
        if (btnExcluir) btnExcluir.style.display = 'none';
        console.log('ℹ️ Nenhuma foto disponível');
    }
}

// ============================================
// FUNÇÕES DE CÂMERA
// ============================================

function capturarFoto(tipo) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        mostrarToast('❌ Seu navegador não suporta acesso à câmera.', 'erro');
        return;
    }
    
    if (fotoCapturada) {
        if (!confirm('⚠️ Você já tirou uma foto. Deseja tirar outra?')) {
            return;
        }
        fotoCapturada = null;
        const preview = document.getElementById('fotoPreviewRecebido');
        const img = document.getElementById('fotoImgRecebido');
        if (preview) preview.style.display = 'none';
        if (img) img.src = '';
        const btnExcluir = document.getElementById('btnExcluirFoto');
        if (btnExcluir) btnExcluir.style.display = 'none';
    }
    
    const modal = document.createElement('div');
    modal.className = 'camera-modal active';
    modal.id = 'cameraModal';
    modal.innerHTML = `
        <div class="camera-container">
            <video id="cameraVideo" autoplay playsinline></video>
            <div class="camera-controls">
                <button class="btn-switch-camera" onclick="trocarCamera()" title="Trocar câmera">
                    🔄 Trocar Câmera
                </button>
                <button class="btn-capturar" onclick="capturarFotoFrame()">📸 Capturar</button>
                <button class="btn-fechar-camera" onclick="fecharCamera()">✕ Fechar</button>
            </div>
            <div class="camera-status" id="cameraStatus">🔄 Iniciando câmera...</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const video = document.getElementById('cameraVideo');
    const status = document.getElementById('cameraStatus');
    
    iniciarCamera(video, status);
}

function iniciarCamera(video, status) {
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
        streamAtual = null;
    }
    
    const constraints = {
        video: {
            facingMode: cameraAtiva,
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
        },
        audio: false
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            streamAtual = stream;
            video.srcObject = stream;
            if (status) {
                status.textContent = '📷 Câmera pronta. Clique em Capturar para tirar a foto.';
                status.style.color = '#48BB78';
            }
            console.log(`✅ Câmera iniciada (${cameraAtiva})`);
        })
        .catch(function(error) {
            console.error('❌ Erro ao acessar câmera:', error);
            
            let mensagem = '❌ Não foi possível acessar a câmera. ';
            if (error.name === 'NotAllowedError') {
                mensagem += 'Permissão negada. Autorize o acesso à câmera.';
            } else if (error.name === 'NotFoundError') {
                mensagem += 'Nenhuma câmera encontrada.';
            } else if (error.name === 'NotReadableError') {
                mensagem += 'A câmera está sendo usada por outro aplicativo.';
            } else if (error.name === 'OverconstrainedError') {
                const facing = cameraAtiva === 'environment' ? 'user' : 'environment';
                mensagem = `🔄 Tentando câmera ${facing === 'environment' ? 'traseira' : 'frontal'}...`;
                if (status) {
                    status.textContent = mensagem;
                    status.style.color = '#ED8936';
                }
                cameraAtiva = facing;
                setTimeout(() => iniciarCamera(video, status), 500);
                return;
            } else {
                mensagem += error.message;
            }
            
            if (status) {
                status.textContent = mensagem;
                status.style.color = '#FC8181';
            }
            mostrarToast(mensagem, 'erro');
            
            setTimeout(() => {
                fecharCamera();
            }, 3000);
        });
}

function trocarCamera() {
    cameraAtiva = cameraAtiva === 'environment' ? 'user' : 'environment';
    const video = document.getElementById('cameraVideo');
    const status = document.getElementById('cameraStatus');
    const nomeCamera = cameraAtiva === 'environment' ? 'traseira' : 'frontal';
    
    if (status) {
        status.textContent = `🔄 Mudando para câmera ${nomeCamera}...`;
        status.style.color = '#ED8936';
    }
    
    iniciarCamera(video, status);
}

function capturarFotoFrame() {
    const video = document.getElementById('cameraVideo');
    const status = document.getElementById('cameraStatus');
    
    if (!video || !video.srcObject) {
        mostrarToast('❌ Câmera não está disponível.', 'erro');
        return;
    }
    
    let width = Math.min(video.videoWidth || 640, 640);
    let height = Math.min(video.videoHeight || 480, 480);
    
    const aspectRatio = (video.videoWidth || 640) / (video.videoHeight || 480);
    if (width / height > aspectRatio) {
        width = Math.round(height * aspectRatio);
    } else {
        height = Math.round(width / aspectRatio);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    
    const qualidade = 0.6;
    const imagemDataURL = canvas.toDataURL('image/jpeg', qualidade);
    
    console.log(`📸 Foto capturada: ${Math.round(imagemDataURL.length / 1024)} KB`);
    
    fotoCapturada = imagemDataURL;
    
    const preview = document.getElementById('fotoPreviewRecebido');
    const img = document.getElementById('fotoImgRecebido');
    if (preview && img) {
        img.src = imagemDataURL;
        preview.style.display = 'block';
        
        const btnExcluir = document.getElementById('btnExcluirFoto');
        if (btnExcluir) {
            btnExcluir.style.display = 'inline-block';
        }
    }
    
    if (status) {
        status.textContent = '✅ Foto capturada! Enviando...';
        status.style.color = '#48BB78';
    }
    
    setTimeout(() => {
        fecharCamera();
        enviarFotoParaR2(imagemDataURL);
    }, 1000);
}

function fecharCamera() {
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
        streamAtual = null;
    }
    
    const modal = document.getElementById('cameraModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
    
    console.log('🔒 Câmera fechada');
}

function excluirFoto() {
    if (!confirm('⚠️ Tem certeza que deseja excluir esta foto?')) {
        return;
    }
    
    fotoCapturada = null;
    
    const preview = document.getElementById('fotoPreviewRecebido');
    const img = document.getElementById('fotoImgRecebido');
    const btnExcluir = document.getElementById('btnExcluirFoto');
    
    if (preview) preview.style.display = 'none';
    if (img) img.src = '';
    if (btnExcluir) btnExcluir.style.display = 'none';
    
    mostrarToast('🗑️ Foto excluída com sucesso.', 'info');
}

// ============================================
// ENVIAR FOTO PARA O R2 (CORRIGIDA)
// ============================================

async function enviarFotoParaR2(imagemDataURL) {
    const numero = document.getElementById('saNumero')?.textContent?.replace('#', '') || '0000';
    
    console.log('📸 Iniciando envio de foto para S.A.', numero);
    
    if (!imagemDataURL || imagemDataURL.length < 100) {
        mostrarToast('❌ Imagem inválida ou muito pequena', 'erro');
        return;
    }
    
    try {
        mostrarToast('⏳ Enviando foto...', 'info');
        
        const imagemComprimida = await comprimirImagem(imagemDataURL, 0.7);
        
        const nomeArquivo = `foto_${numero}_${Date.now()}.jpg`;
        console.log('📸 Nome do arquivo:', nomeArquivo);
        
        const resultadoUpload = await uploadParaR2(imagemComprimida, 'fotos', nomeArquivo);
        
        if (!resultadoUpload.success) {
            console.error('❌ Falha no upload:', resultadoUpload.error);
            throw new Error(resultadoUpload.error || 'Erro ao fazer upload da foto');
        }
        
        const urlFoto = resultadoUpload.url;
        console.log('✅ Foto enviada para R2:', urlFoto);
        
        console.log('📤 Salvando URL no banco...');
        
        const response = await fetch(`${API_URL}/sa/${numero}/foto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                foto_url: urlFoto,
                data_captura: new Date().toISOString()
            })
        });
        
        console.log('📤 Resposta do servidor:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Erro do servidor:', error);
            throw new Error(error.error || 'Erro ao salvar foto');
        }
        
        const result = await response.json();
        console.log('✅ Resposta do servidor:', result);
        
        mostrarToast('✅ Foto salva com sucesso!', 'sucesso');
        
        const preview = document.getElementById('fotoPreviewRecebido');
        const img = document.getElementById('fotoImgRecebido');
        if (preview && img) {
            img.src = urlFoto;
            preview.style.display = 'block';
            document.getElementById('btnExcluirFoto').style.display = 'inline-block';
        }
        
    } catch (error) {
        console.error('❌ Erro ao enviar foto:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

// ============================================
// VERIFICAR ASSINATURAS
// ============================================

async function verificarAssinaturas() {
    const saNumeroEl = document.getElementById('saNumero');
    if (!saNumeroEl) return;
    
    const numero = saNumeroEl.textContent.replace('#', '');
    if (!numero || numero === '0000') return;
    
    try {
        const response = await fetch(`${API_URL}/sa/${numero}`);
        if (!response.ok) {
            console.warn('⚠️ Erro ao buscar S.A. para verificar assinaturas');
            return;
        }
        
        const sa = await response.json();
        saAtual = sa;
        
        console.log(`🔄 Verificando assinaturas para S.A. ${numero}. Status atual: ${sa.status}`);
        
        if (sa.assinaturas) {
            if (sa.assinaturas.entregue) {
                atualizarAssinaturaUI('entregue', sa.assinaturas.entregue);
            }
            if (sa.assinaturas.recebido) {
                atualizarAssinaturaUI('recebido', sa.assinaturas.recebido);
            }
        }
        
        if (sa.foto) {
            atualizarFotoUI(sa.foto);
        }
        
        atualizarBotoesAcao(sa);
        
        if (sa.status === 'assinado' || sa.status === 'ASSINADO') {
            console.log('✅ Status atualizado para ASSINADO!');
        }
        
    } catch (error) {
        console.error('❌ Erro ao verificar assinaturas:', error);
    }
}

// ============================================
// ATUALIZAR BOTÕES DE AÇÃO
// ============================================

function atualizarBotoesAcao(sa) {
    const btnFinalizar = document.querySelector('.btn-finalizar');
    const btnContainer = btnFinalizar?.parentNode;
    
    if (!btnFinalizar || !btnContainer) return;
    
    const btnAntigo = btnContainer.querySelector('.btn-atendida-protheus');
    if (btnAntigo) btnAntigo.remove();
    
    console.log(`🔄 Atualizando botões para status: ${sa.status}`);
    
    btnFinalizar.style.display = 'block';
    btnFinalizar.style.width = '100%';
    btnFinalizar.style.maxWidth = '400px';
    btnFinalizar.style.margin = '10px auto';
    btnFinalizar.style.padding = '14px 30px';
    btnFinalizar.style.border = 'none';
    btnFinalizar.style.borderRadius = '10px';
    btnFinalizar.style.fontWeight = '700';
    btnFinalizar.style.fontSize = 'clamp(14px, 2vw, 16px)';
    btnFinalizar.style.cursor = 'pointer';
    btnFinalizar.style.transition = 'all 0.3s ease';
    btnFinalizar.style.textTransform = 'uppercase';
    btnFinalizar.style.letterSpacing = '1px';
    btnFinalizar.style.boxSizing = 'border-box';
    btnFinalizar.style.textAlign = 'center';
    
    if (sa.status === 'ATENDIDA_PROTHEUS' || sa.status === 'atendida_protheus') {
        btnFinalizar.textContent = '✅ ATENDIDA NO PROTHEUS';
        btnFinalizar.disabled = true;
        btnFinalizar.style.opacity = '0.6';
        btnFinalizar.style.cursor = 'not-allowed';
        btnFinalizar.style.background = '#4299E1';
        btnFinalizar.style.color = 'white';
        btnFinalizar.style.boxShadow = '0 4px 15px rgba(66, 153, 225, 0.3)';
        btnFinalizar.style.transform = 'none';
        return;
    }
    
    if (sa.status === 'FINALIZADA' || sa.status === 'finalizado') {
        btnFinalizar.textContent = '✅ S.A. FINALIZADA';
        btnFinalizar.disabled = true;
        btnFinalizar.style.opacity = '0.6';
        btnFinalizar.style.cursor = 'not-allowed';
        btnFinalizar.style.background = '#48BB78';
        btnFinalizar.style.color = 'white';
        btnFinalizar.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.3)';
        btnFinalizar.style.transform = 'none';
        
        const btnAtendida = document.createElement('button');
        btnAtendida.className = 'btn-atendida-protheus';
        btnAtendida.textContent = '🔄 Atendida no Protheus';
        btnAtendida.style.cssText = `
            width: 100%;
            max-width: 400px;
            display: block;
            margin: 10px auto;
            padding: 14px 30px;
            border: none;
            border-radius: 10px;
            background: #4299E1;
            color: white;
            cursor: pointer;
            font-weight: 700;
            font-size: clamp(14px, 2vw, 16px);
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            box-sizing: border-box;
            box-shadow: 0 4px 15px rgba(66, 153, 225, 0.3);
        `;
        btnAtendida.onclick = marcarAtendidaProtheus;
        
        btnAtendida.addEventListener('mouseenter', function() {
            this.style.background = '#3182CE';
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 25px rgba(66, 153, 225, 0.4)';
        });
        
        btnAtendida.addEventListener('mouseleave', function() {
            this.style.background = '#4299E1';
            this.style.transform = 'none';
            this.style.boxShadow = '0 4px 15px rgba(66, 153, 225, 0.3)';
        });
        
        btnContainer.appendChild(btnAtendida);
        return;
    }
    
    if (sa.status === 'ASSINADO' || sa.status === 'assinado') {
        console.log('✅ S.A. assinada, habilitando botão finalizar');
        btnFinalizar.textContent = '✅ FINALIZAR S.A.';
        btnFinalizar.disabled = false;
        btnFinalizar.style.opacity = '1';
        btnFinalizar.style.cursor = 'pointer';
        btnFinalizar.style.background = '#48BB78';
        btnFinalizar.style.color = 'white';
        btnFinalizar.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.3)';
        btnFinalizar.style.transform = 'none';
        return;
    }
    
    const temAssinaturas = sa.assinaturas?.entregue && sa.assinaturas?.recebido;
    
    if (temAssinaturas) {
        console.log('✅ Ambas assinaturas presentes, habilitando finalizar');
        btnFinalizar.textContent = '✅ FINALIZAR S.A.';
        btnFinalizar.disabled = false;
        btnFinalizar.style.opacity = '1';
        btnFinalizar.style.cursor = 'pointer';
        btnFinalizar.style.background = '#48BB78';
        btnFinalizar.style.color = 'white';
        btnFinalizar.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.3)';
        btnFinalizar.style.transform = 'none';
    } else {
        console.log('⏳ Aguardando assinaturas');
        btnFinalizar.textContent = '⏳ Aguardando assinaturas';
        btnFinalizar.disabled = true;
        btnFinalizar.style.opacity = '0.6';
        btnFinalizar.style.cursor = 'not-allowed';
        btnFinalizar.style.background = '#A0AEC0';
        btnFinalizar.style.color = 'white';
        btnFinalizar.style.boxShadow = 'none';
        btnFinalizar.style.transform = 'none';
    }
}

// ============================================
// EXPORTAR PDF DO PAINEL
// ============================================

let saSelecionadaParaExportar = null;

function selecionarSAExportar(numero) {
    saSelecionadaParaExportar = numero;
    const btnExportar = document.getElementById('btnExportarPDFPainel');
    if (btnExportar) {
        btnExportar.style.display = 'inline-flex';
        btnExportar.textContent = `📄 Exportar PDF #${String(numero).padStart(4, '0')}`;
    }
}

async function exportarSAPainel() {
    if (!saSelecionadaParaExportar) {
        mostrarToast('⚠️ Selecione uma S.A. para exportar.', 'aviso');
        return;
    }
    
    const numero = saSelecionadaParaExportar;
    
    try {
        mostrarToast('⏳ Gerando PDF...', 'info');
        
        const response = await fetch(`${API_URL}/sa/${numero}`);
        if (!response.ok) throw new Error('Erro ao carregar S.A.');
        
        const sa = await response.json();
        
        if (sa.status !== 'ATENDIDA_PROTHEUS' && sa.status !== 'atendida_protheus') {
            mostrarToast('⚠️ A S.A. precisa estar com status ATENDIDA PROTHEUS para exportar.', 'aviso');
            return;
        }
        
        const conteudoPDF = gerarConteudoPDF(sa);
        
        const janela = window.open('', '_blank', 'width=800,height=600');
        if (!janela) {
            mostrarToast('⚠️ Permita pop-ups para exportar o PDF.', 'aviso');
            return;
        }
        
        janela.document.write(conteudoPDF);
        janela.document.close();
        
        setTimeout(function() {
            janela.print();
        }, 500);
        
        mostrarToast('✅ PDF gerado com sucesso!', 'sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.exportarSAPainel = exportarSAPainel;
window.selecionarSAExportar = selecionarSAExportar;

// ============================================
// GERAR CONTEÚDO DO PDF
// ============================================

function gerarConteudoPDF(sa) {
    const dataAtual = new Date().toLocaleString('pt-BR');
    const numeroFormatado = String(sa.numero).padStart(4, '0');
    
    const tipoMap = {
        'EMERGENCIAL': { label: '🚨 Emergencial' },
        'EMPRESTIMO': { label: '🔄 Empréstimo' },
        'AGUARDANDO_NOTA': { label: '⏳ Aguardando Nota' }
    };
    const tipoInfo = tipoMap[sa.tipo_sa] || tipoMap['EMERGENCIAL'];
    
    let itensHTML = '';
    if (sa.itens && sa.itens.length > 0) {
        sa.itens.forEach((item, index) => {
            itensHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.codigo || '-'}</td>
                    <td>${item.descricao || '-'}</td>
                    <td>${item.unidade || '-'}</td>
                    <td style="text-align: center;">${item.quantidade || 0}</td>
                    <td style="text-align: center;">${item.armazem || '-'}</td>
                    <td style="text-align: center;">${item.ca || '-'}</td>
                </tr>
            `;
        });
    } else {
        itensHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #999;">Nenhum item cadastrado</td>
            </tr>
        `;
    }
    
    const entregue = sa.assinaturas?.entregue || null;
    const recebido = sa.assinaturas?.recebido || null;
    
    let assinaturasHTML = '';
    if (entregue && recebido) {
        assinaturasHTML = `
            <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 2px solid #333;">
                <div style="text-align: center; width: 45%;">
                    <p style="font-weight: bold; margin-bottom: 5px;">📤 ENTREGUE POR</p>
                    <p style="font-size: 16px; font-weight: bold;">${entregue.nome || '-'}</p>
                    <p style="font-size: 12px; color: #666;">${entregue.data ? formatarDataHora(entregue.data) : '-'}</p>
                    ${entregue.assinatura ? `<img src="${entregue.assinatura}" style="max-width: 150px; max-height: 60px; border: 1px solid #ddd; border-radius: 4px; padding: 5px; margin-top: 5px;" />` : ''}
                </div>
                <div style="text-align: center; width: 45%;">
                    <p style="font-weight: bold; margin-bottom: 5px;">📥 RECEBIDO POR</p>
                    <p style="font-size: 16px; font-weight: bold;">${recebido.nome || '-'}</p>
                    <p style="font-size: 12px; color: #666;">${recebido.data ? formatarDataHora(recebido.data) : '-'}</p>
                    ${recebido.assinatura ? `<img src="${recebido.assinatura}" style="max-width: 150px; max-height: 60px; border: 1px solid #ddd; border-radius: 4px; padding: 5px; margin-top: 5px;" />` : ''}
                </div>
            </div>
        `;
    } else {
        assinaturasHTML = `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #333; text-align: center; color: #999;">
                <p>⚠️ Assinaturas pendentes</p>
            </div>
        `;
    }
    
    const descontoLabel = sa.gerar_desconto === 'SIM' 
        ? '✅ SIM - Será descontado em folha' 
        : '❌ NÃO - Não será descontado';
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>S.A. Emergencial #${numeroFormatado}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Arial', sans-serif; 
                    padding: 40px; 
                    color: #333;
                    background: #fff;
                }
                .documento {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 30px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background: #fff;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 3px solid #1a237e;
                    padding-bottom: 20px;
                    margin-bottom: 25px;
                }
                .header h1 {
                    font-size: 24px;
                    color: #1a237e;
                    margin: 0;
                }
                .header .numero {
                    background: #1a237e;
                    color: white;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 18px;
                }
                .status-badge {
                    display: inline-block;
                    padding: 4px 16px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 14px;
                    background: #EBF8FF;
                    color: #2A69AC;
                    border: 1px solid #90CDF4;
                }
                .status-badge.atendida {
                    background: #E8F4FD;
                    color: #1a56a0;
                    border-color: #7ec8e3;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 25px;
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                }
                .info-grid .item {
                    display: flex;
                    flex-direction: column;
                }
                .info-grid .item .label {
                    font-size: 11px;
                    text-transform: uppercase;
                    color: #666;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }
                .info-grid .item .value {
                    font-size: 15px;
                    font-weight: 600;
                    margin-top: 2px;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #1a237e;
                    margin: 20px 0 10px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #eee;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    margin: 10px 0 20px;
                }
                table th {
                    background: #1a237e;
                    color: white;
                    padding: 10px 12px;
                    text-align: left;
                    font-weight: 600;
                }
                table td {
                    padding: 8px 12px;
                    border-bottom: 1px solid #eee;
                }
                table tr:nth-child(even) {
                    background: #f8f9fa;
                }
                .termo {
                    background: #f8f9fa;
                    padding: 15px 20px;
                    border-radius: 8px;
                    font-size: 12px;
                    line-height: 1.6;
                    margin: 20px 0;
                    border-left: 4px solid #1a237e;
                }
                .termo p {
                    margin: 5px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #eee;
                    text-align: center;
                    font-size: 11px;
                    color: #999;
                }
                .assinaturas-container {
                    margin-top: 25px;
                }
                @media print {
                    body { padding: 20px; }
                    .documento { border: none; padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="documento">
                <div class="header">
                    <div>
                        <h1>📋 S.A. Emergencial</h1>
                        <p style="color: #666; font-size: 14px; margin-top: 5px;">Solicitação de Atendimento</p>
                    </div>
                    <div class="numero">#${numeroFormatado}</div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <span class="status-badge atendida">🔄 ATENDIDA PROTHEUS</span>
                    <span style="font-size: 13px; color: #1a237e; font-weight: 600;">${tipoInfo.label}</span>
                    <span style="font-size: 12px; color: #666;">Gerado em: ${dataAtual}</span>
                </div>
                
                <div class="info-grid">
                    <div class="item">
                        <span class="label">Solicitante</span>
                        <span class="value">${sa.solicitante || '-'}</span>
                    </div>
                    <div class="item">
                        <span class="label">Data da Solicitação</span>
                        <span class="value">${formatarDataHora(sa.data_solicitacao)}</span>
                    </div>
                    <div class="item">
                        <span class="label">💰 Gerar Desconto</span>
                        <span class="value">${descontoLabel}</span>
                    </div>
                    <div class="item">
                        <span class="label">Colaborador</span>
                        <span class="value">${sa.colaborador?.nome || 'Aguardando'}</span>
                    </div>
                    <div class="item">
                        <span class="label">Matrícula</span>
                        <span class="value">${sa.colaborador?.matricula || '-'}</span>
                    </div>
                    <div class="item">
                        <span class="label">CPF</span>
                        <span class="value">${sa.colaborador?.cpf || '-'}</span>
                    </div>
                    <div class="item">
                        <span class="label">Função</span>
                        <span class="value">${sa.colaborador?.funcao || '-'}</span>
                    </div>
                    <div class="item">
                        <span class="label">Filial</span>
                        <span class="value">${sa.colaborador?.filial || '-'}</span>
                    </div>
                    <div class="item">
                        <span class="label">Centro de Custo</span>
                        <span class="value">${sa.colaborador?.centro_custo || '-'}</span>
                    </div>
                </div>
                
                <div class="section-title">📦 Itens Solicitados</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 8%;">#</th>
                            <th style="width: 15%;">Código</th>
                            <th style="width: 30%;">Descrição</th>
                            <th style="width: 10%;">UND</th>
                            <th style="width: 10%;">QTD</th>
                            <th style="width: 10%;">Armazém</th>
                            <th style="width: 12%;">C.A</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itensHTML}
                    </tbody>
                </table>
                
                <div class="section-title">📜 Termo de Responsabilidade</div>
                <div class="termo">
                    <p><strong>NR 06</strong> - 6.7. CABE AO EMPREGADO QUANTO AO EPI: USAR, UTILIZANDO-O APENAS PARA A FINALIDADE A QUE SE DESTINA; RESPONSABILIZAR-SE PELA GUARDA E CONSERVAÇÃO; COMUNICAR AO EMPREGADOR QUALQUER ALTERAÇÃO QUE O TORNE IMPRÓPRIO PARA USO.</p>
                    <p><strong>NR 01</strong> - 1.8. CABE AO EMPREGADO: CUMPRIR AS DISPOSIÇÕES LEGAIS E REGULAMENTARES SOBRE SEGURANÇA E MEDICINA DO TRABALHO; USAR O EPI FORNECIDO PELO EMPREGADOR; SUBMETER-SE AOS EXAMES MÉDICOS PREVISTOS.</p>
                    <p><strong>CLT</strong> - ART. 462, § 1º - EM CASO DE DANO CAUSADO PELO EMPREGADO, O DESCONTO SERÁ LÍCITO, DESDE QUE ESTA POSSIBILIDADE TENHA SIDO ACORDADA OU NA OCORRÊNCIA DE DOLO DO EMPREGADO.</p>
                    <p style="margin-top: 10px; font-weight: bold;">Declaro que recebi os equipamentos acima descritos e estou ciente das obrigações contidas na NR 06 e NR 01.</p>
                </div>
                
                <div class="assinaturas-container">
                    <div class="section-title">✍️ Assinaturas</div>
                    ${assinaturasHTML}
                </div>
                
                <div class="footer">
                    <p>Documento gerado automaticamente pelo sistema SICGM - S.A. Emergencial</p>
                    <p>Este documento é uma via válida para comprovação de atendimento</p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;" class="no-print">
                <button onclick="window.print()" style="background: #1a237e; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">
                    🖨️ Imprimir / Salvar PDF
                </button>
                <button onclick="window.close()" style="background: #718096; color: white; border: none; padding: 12px 30px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; margin-left: 10px;">
                    ✕ Fechar
                </button>
            </div>
        </body>
        </html>
    `;
}

// ============================================
// CARREGAR LISTA DE S.A.
// ============================================

async function carregarListaSA() {
    const container = document.getElementById('saList');
    if (!container) return;
    
    container.innerHTML = '<div class="sa-list-loading"><div class="spinner"></div><p>⏳ Carregando S.A. Emergenciais...</p></div>';
    
    try {
        const response = await fetch(`${API_URL}/sa`);
        if (!response.ok) throw new Error('Erro ao carregar S.A.');
        
        const sas = await response.json();
        sasCarregadas = sas;
        
        console.log('📋 S.A. carregadas:', sas.length);
        
        for (const sa of sas) {
            try {
                const detalhesResponse = await fetch(`${API_URL}/sa/${sa.numero}`);
                if (detalhesResponse.ok) {
                    const detalhes = await detalhesResponse.json();
                    sa._itensCount = detalhes.itens ? detalhes.itens.length : 0;
                    sa._itens = detalhes.itens || [];
                } else {
                    sa._itensCount = 0;
                    sa._itens = [];
                }
            } catch (e) {
                sa._itensCount = 0;
                sa._itens = [];
            }
        }
        
        console.log('📊 S.A. com contagem de itens:', sas.map(s => `${s.numero}: ${s._itensCount} itens`));
        
        const podeCriar = usuarioPodeCriarSA(dadosSessao?.matricula);
        
        if (sas.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📭 Nenhuma S.A. Emergencial encontrada</p>
                    ${podeCriar ? `
                        <button class="btn-primary" onclick="criarNovaSA()" style="margin-top: 10px;">
                            ➕ Criar Nova S.A.
                        </button>
                    ` : `
                        <p style="font-size: 0.9em; color: #718096; margin-top: 10px;">
                            🔒 Você não tem permissão para criar S.A. Aguarde uma ser criada.
                        </p>
                    `}
                </div>
            `;
            return;
        }
        
        renderizarListaSA(sas);
        configurarFiltros(sas);
        
        const btnNovaSA = document.getElementById('btnNovaSA');
        if (btnNovaSA) {
            if (podeCriar) {
                btnNovaSA.style.display = 'inline-flex';
                btnNovaSA.textContent = '➕ Nova S.A.';
                btnNovaSA.onclick = criarNovaSA;
            } else {
                btnNovaSA.style.display = 'none';
            }
        }
        
        const btnExportar = document.getElementById('btnExportarPDFPainel');
        if (btnExportar) {
            btnExportar.style.display = 'none';
            saSelecionadaParaExportar = null;
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar S.A.:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p>❌ Erro ao carregar S.A. Emergenciais</p>
                <button onclick="carregarListaSA()" style="margin-top: 10px;">🔄 Tentar novamente</button>
            </div>
        `;
    }
}

window.carregarListaSA = carregarListaSA;

// ============================================
// RENDERIZAR LISTA DE S.A. COM FILTROS
// ============================================

function renderizarListaSA(sas, filtros = {}) {
    const container = document.getElementById('saList');
    if (!container) return;
    
    let sasFiltradas = sas;
    
    if (filtros.numero) {
        const num = filtros.numero.toString().trim();
        sasFiltradas = sasFiltradas.filter(sa => 
            sa.numero.toString().includes(num)
        );
    }
    
    if (filtros.solicitante) {
        const termo = filtros.solicitante.toLowerCase().trim();
        sasFiltradas = sasFiltradas.filter(sa => 
            (sa.solicitante || '').toLowerCase().includes(termo)
        );
    }
    
    if (filtros.matriculaSolicitante) {
        const termo = filtros.matriculaSolicitante.toLowerCase().trim();
        sasFiltradas = sasFiltradas.filter(sa => 
            (sa.criado_por || '').toLowerCase().includes(termo)
        );
    }
    
    if (filtros.colaborador) {
        const termo = filtros.colaborador.toLowerCase().trim();
        sasFiltradas = sasFiltradas.filter(sa => 
            (sa.colaborador?.nome || '').toLowerCase().includes(termo) ||
            (sa.colaborador_nome || '').toLowerCase().includes(termo)
        );
    }
    
    if (filtros.matriculaColaborador) {
        const termo = filtros.matriculaColaborador.toLowerCase().trim();
        sasFiltradas = sasFiltradas.filter(sa => 
            (sa.colaborador?.matricula || '').toLowerCase().includes(termo) ||
            (sa.colaborador_matricula || '').toLowerCase().includes(termo)
        );
    }
    
    if (filtros.status) {
        sasFiltradas = sasFiltradas.filter(sa => 
            (sa.status || '').toLowerCase() === filtros.status.toLowerCase()
        );
    }
    
    if (filtros.tipo_sa) {
        sasFiltradas = sasFiltradas.filter(sa => 
            (sa.tipo_sa || 'EMERGENCIAL') === filtros.tipo_sa
        );
    }
    
    if (filtros.desconto) {
        sasFiltradas = sasFiltradas.filter(sa => 
            (sa.gerar_desconto || 'NAO') === filtros.desconto
        );
    }
    
    if (filtros.dataInicio) {
        sasFiltradas = sasFiltradas.filter(sa => {
            const data = sa.data_solicitacao || sa.criado_em || '';
            return data >= filtros.dataInicio;
        });
    }
    
    if (filtros.dataFim) {
        sasFiltradas = sasFiltradas.filter(sa => {
            const data = sa.data_solicitacao || sa.criado_em || '';
            return data <= filtros.dataFim;
        });
    }
    
    const contador = document.getElementById('filtro-contador');
    if (contador) {
        contador.textContent = `Mostrando ${sasFiltradas.length} de ${sas.length} S.A.`;
    }
    
    if (sasFiltradas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>🔍 Nenhuma S.A. encontrada com os filtros aplicados</p>
                <button class="btn-limpar-filtros" onclick="limparFiltrosSA()" style="margin-top: 10px;">
                    ✕ Limpar Filtros
                </button>
            </div>
        `;
        return;
    }
    
    const tipoMap = {
        'EMERGENCIAL': { icone: '🚨', cor: '#E53E3E', label: 'Emergencial' },
        'EMPRESTIMO': { icone: '🔄', cor: '#4299E1', label: 'Empréstimo' },
        'AGUARDANDO_NOTA': { icone: '⏳', cor: '#ED8936', label: 'Aguardando Nota' }
    };
    
    let html = '';
    sasFiltradas.forEach(sa => {
        let statusClass = 'status-pendente';
        let statusIcon = '⏳';
        let statusText = sa.status || 'PENDENTE';
        
        if (sa.status === 'FINALIZADA' || sa.status === 'finalizado') {
            statusClass = 'status-finalizada';
            statusIcon = '✅';
            statusText = 'FINALIZADA';
        } else if (sa.status === 'ATENDIDA_PROTHEUS' || sa.status === 'atendida_protheus') {
            statusClass = 'status-atendida-protheus';
            statusIcon = '🔄';
            statusText = 'ATENDIDA PROTHEUS';
        } else if (sa.status === 'ASSINADO' || sa.status === 'assinado') {
            statusClass = 'status-assinada';
            statusIcon = '✍️';
            statusText = 'ASSINADA';
        }
        
        const qtdItens = sa._itensCount || 0;
        
        const tipo = sa.tipo_sa || 'EMERGENCIAL';
        const tipoInfo = tipoMap[tipo] || tipoMap['EMERGENCIAL'];
        
        let nomeColaborador = 'Aguardando';
        let matriculaColaborador = '-';
        if (sa.colaborador && sa.colaborador.nome) {
            nomeColaborador = sa.colaborador.nome;
            matriculaColaborador = sa.colaborador.matricula || '-';
        } else if (sa.colaborador_nome) {
            nomeColaborador = sa.colaborador_nome;
            matriculaColaborador = sa.colaborador_matricula || '-';
        }
        
        const temMatricula = sa.colaborador_matricula || sa.colaborador?.matricula || false;
        if (!temMatricula || nomeColaborador === 'Aguardando') {
            nomeColaborador = 'Aguardando';
            matriculaColaborador = '-';
        }
        
        const nomeSolicitante = sa.solicitante || '-';
        const matriculaSolicitante = sa.criado_por || '-';
        
        const descontoLabel = sa.gerar_desconto === 'SIM' ? '💰 SIM' : '💰 NÃO';
        
        const podeExcluir = perfilUsuario === 'GESTAO' && 
            sa.status !== 'FINALIZADA' && 
            sa.status !== 'finalizado' && 
            sa.status !== 'ATENDIDA_PROTHEUS' && 
            sa.status !== 'atendida_protheus';
        
        const podeExportar = sa.status === 'ATENDIDA_PROTHEUS' || sa.status === 'atendida_protheus';
        
        html += `
            <div class="sa-card" onclick="abrirSA('${sa.numero}')" 
                 onmouseenter="${podeExportar ? `selecionarSAExportar('${sa.numero}')` : ''}"
                 onmouseleave="${podeExportar ? `document.getElementById('btnExportarPDFPainel').style.display = 'none'; saSelecionadaParaExportar = null;` : ''}">
                <div class="sa-card-header">
                    <span class="sa-card-numero">#${String(sa.numero).padStart(4, '0')}</span>
                    <span class="sa-card-status ${statusClass}">${statusIcon} ${statusText}</span>
                    ${podeExportar ? `<button class="btn-exportar-pequeno" onclick="event.stopPropagation(); exportarSAPainel();" title="Exportar PDF">📄</button>` : ''}
                </div>
                <div class="sa-card-body">
                    <p><strong>Tipo:</strong> <span style="color: ${tipoInfo.cor}; font-weight: 600;">${tipoInfo.icone} ${tipoInfo.label}</span></p>
                    <p><strong>💰 Desconto:</strong> <span>${descontoLabel}</span></p>
                    <p><strong>Solicitante:</strong> <span>${nomeSolicitante}</span></p>
                    <p><strong>Matr. Sol.:</strong> <span>${matriculaSolicitante}</span></p>
                    <p><strong>Colaborador:</strong> <span>${nomeColaborador}</span></p>
                    <p><strong>Matr. Colab.:</strong> <span>${matriculaColaborador}</span></p>
                    <p><strong>Itens:</strong> <span>${qtdItens} item(ns)</span></p>
                </div>
                <div class="sa-card-footer">
                    <span class="sa-card-data">${formatarDataHora(sa.criado_em || sa.created_at)}</span>
                    ${podeExcluir ? `<button class="btn-remover" onclick="event.stopPropagation(); removerSA('${sa.numero}')">🗑️</button>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

window.renderizarListaSA = renderizarListaSA;

// ============================================
// CONFIGURAR FILTROS
// ============================================

function configurarFiltros(sas) {
    let filtrosContainer = document.getElementById('filtros-container');
    
    if (!filtrosContainer) {
        const saListContainer = document.querySelector('.sa-list-container');
        if (!saListContainer) return;
        
        filtrosContainer = document.createElement('div');
        filtrosContainer.id = 'filtros-container';
        filtrosContainer.className = 'filtros-sa-container';
        
        saListContainer.insertBefore(filtrosContainer, saListContainer.firstChild);
    }
    
    const statusOptions = ['Todos', 'PENDENTE', 'ASSINADO', 'FINALIZADA', 'ATENDIDA_PROTHEUS'];
    const tipoOptions = [
        { value: '', label: 'Todos os Tipos' },
        { value: 'EMERGENCIAL', label: '🚨 Emergencial' },
        { value: 'EMPRESTIMO', label: '🔄 Empréstimo' },
        { value: 'AGUARDANDO_NOTA', label: '⏳ Aguardando Nota' }
    ];
    const descontoOptions = [
        { value: '', label: 'Todos' },
        { value: 'SIM', label: '💰 SIM - Com desconto' },
        { value: 'NAO', label: '💰 NÃO - Sem desconto' }
    ];
    
    filtrosContainer.innerHTML = `
        <div class="filtro-item">
            <label>🔢 Nº S.A.</label>
            <input type="text" id="filtro-numero" placeholder="Ex: 1234" oninput="aplicarFiltrosSA()">
        </div>
        <div class="filtro-item">
            <label>👤 Solicitante</label>
            <input type="text" id="filtro-solicitante" placeholder="Digite o nome..." oninput="aplicarFiltrosSA()">
        </div>
        <div class="filtro-item">
            <label>🆔 Matr. Solicitante</label>
            <input type="text" id="filtro-matricula-solicitante" placeholder="Digite a matrícula..." oninput="aplicarFiltrosSA()">
        </div>
        <div class="filtro-item">
            <label>👥 Colaborador</label>
            <input type="text" id="filtro-colaborador" placeholder="Digite o nome..." oninput="aplicarFiltrosSA()">
        </div>
        <div class="filtro-item">
            <label>🆔 Matr. Colaborador</label>
            <input type="text" id="filtro-matricula-colaborador" placeholder="Digite a matrícula..." oninput="aplicarFiltrosSA()">
        </div>
        <div class="filtro-item">
            <label>📌 Status</label>
            <select id="filtro-status" onchange="aplicarFiltrosSA()">
                ${statusOptions.map(s => `<option value="${s === 'Todos' ? '' : s}">${s}</option>`).join('')}
            </select>
        </div>
        <div class="filtro-item">
            <label>📋 Tipo S.A.</label>
            <select id="filtro-tipo" onchange="aplicarFiltrosSA()">
                ${tipoOptions.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
            </select>
        </div>
        <div class="filtro-item">
            <label>💰 Desconto</label>
            <select id="filtro-desconto" onchange="aplicarFiltrosSA()">
                ${descontoOptions.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
            </select>
        </div>
        <div class="filtro-item">
            <label>📅 Data Início</label>
            <input type="date" id="filtro-data-inicio" onchange="aplicarFiltrosSA()">
        </div>
        <div class="filtro-item">
            <label>📅 Data Fim</label>
            <input type="date" id="filtro-data-fim" onchange="aplicarFiltrosSA()">
        </div>
        <div class="filtro-item filtro-acoes">
            <button class="btn-limpar-filtros" onclick="limparFiltrosSA()">✕ Limpar Filtros</button>
        </div>
        <div class="filtro-item filtro-contador">
            <span id="filtro-contador">Mostrando ${sas.length} de ${sas.length} S.A.</span>
        </div>
    `;
}

window.configurarFiltros = configurarFiltros;

// ============================================
// APLICAR FILTROS
// ============================================

function aplicarFiltrosSA() {
    const filtros = {
        numero: document.getElementById('filtro-numero')?.value || '',
        solicitante: document.getElementById('filtro-solicitante')?.value || '',
        matriculaSolicitante: document.getElementById('filtro-matricula-solicitante')?.value || '',
        colaborador: document.getElementById('filtro-colaborador')?.value || '',
        matriculaColaborador: document.getElementById('filtro-matricula-colaborador')?.value || '',
        status: document.getElementById('filtro-status')?.value || '',
        tipo_sa: document.getElementById('filtro-tipo')?.value || '',
        desconto: document.getElementById('filtro-desconto')?.value || '',
        dataInicio: document.getElementById('filtro-data-inicio')?.value || '',
        dataFim: document.getElementById('filtro-data-fim')?.value || ''
    };
    
    renderizarListaSA(sasCarregadas, filtros);
}

window.aplicarFiltrosSA = aplicarFiltrosSA;

// ============================================
// LIMPAR FILTROS
// ============================================

function limparFiltrosSA() {
    const inputs = document.querySelectorAll('#filtros-container input');
    inputs.forEach(input => {
        if (input.type === 'text' || input.type === 'number') {
            input.value = '';
        } else if (input.type === 'date') {
            input.value = '';
        }
    });
    
    const selects = document.querySelectorAll('#filtros-container select');
    selects.forEach(select => {
        select.value = '';
    });
    
    aplicarFiltrosSA();
}

window.limparFiltrosSA = limparFiltrosSA;

// ============================================
// ABRIR S.A. PARA EDIÇÃO/VISUALIZAÇÃO
// ============================================

function abrirSA(numero) {
    try {
        sessionStorage.setItem('sa_atual', numero);
        window.location.href = `formulario.html?numero=${numero}`;
    } catch (error) {
        console.error('❌ Erro ao abrir S.A.:', error);
        mostrarToast('❌ Erro ao abrir S.A.', 'erro');
    }
}

window.abrirSA = abrirSA;

// ============================================
// REMOVER S.A.
// ============================================

async function removerSA(numero) {
    if (!confirm(`⚠️ Tem certeza que deseja REMOVER a S.A. #${String(numero).padStart(4, '0')}?`)) return;
    
    try {
        const response = await fetch(`${API_URL}/sa/${numero}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao remover S.A.');
        }
        
        mostrarToast('✅ S.A. removida com sucesso!', 'sucesso');
        carregarListaSA();
    } catch (error) {
        console.error('❌ Erro ao remover S.A.:', error);
        mostrarToast('❌ ' + error.message, 'erro');
    }
}

window.removerSA = removerSA;

// ============================================
// CARREGAR S.A. NO FORMULÁRIO
// ============================================

async function carregarSAFormulario() {
    if (!dadosSessao) {
        const sessao = sessionStorage.getItem('sessaoSICGM');
        if (!sessao) {
            window.location.href = '../login.html';
            return;
        }
        try {
            dadosSessao = JSON.parse(sessao);
            perfilUsuario = dadosSessao.perfil || 'OPERACIONAL';
        } catch (e) {
            window.location.href = '../login.html';
            return;
        }
    }
    
    const params = new URLSearchParams(window.location.search);
    const numero = params.get('numero');
    
    if (!numero) {
        mostrarToast('⚠️ Use o botão "Nova S.A." para criar', 'aviso');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/sa/${numero}`);
        if (!response.ok) throw new Error('S.A. não encontrada');
        
        const sa = await response.json();
        saAtual = sa;
        
        console.log('📋 S.A. carregada:', sa.numero, '| Status:', sa.status, '| Tipo:', sa.tipo_sa);
        
        document.getElementById('saNumero').textContent = `#${sa.numero}`;
        
        if (sa.status !== 'FINALIZADA' && sa.status !== 'ATENDIDA_PROTHEUS' && sa.status !== 'finalizado' && sa.status !== 'atendida_protheus' && dadosSessao) {
            document.getElementById('solicitante').value = dadosSessao.nome || '';
        } else {
            document.getElementById('solicitante').value = sa.solicitante || '';
        }
        
        document.getElementById('dataSolicitacao').value = sa.data_solicitacao || getDataBrasil();
        
        if (sa.tipo_sa) {
            const radios = document.querySelectorAll('input[name="tipo_sa"]');
            radios.forEach(radio => {
                radio.checked = (radio.value === sa.tipo_sa);
            });
        }
        
        if (sa.gerar_desconto) {
            const radios = document.querySelectorAll('input[name="gerar_desconto"]');
            radios.forEach(radio => {
                radio.checked = (radio.value === sa.gerar_desconto);
            });
        } else {
            const radios = document.querySelectorAll('input[name="gerar_desconto"]');
            radios.forEach(radio => {
                if (radio.value === 'NAO') {
                    radio.checked = true;
                }
            });
        }
        
        if (sa.colaborador) {
            document.getElementById('matricula').value = sa.colaborador.matricula || '';
            document.getElementById('colaborador').value = sa.colaborador.nome || '';
            document.getElementById('cpf').value = sa.colaborador.cpf || '';
            document.getElementById('funcao').value = sa.colaborador.funcao || '';
            document.getElementById('filial').value = sa.colaborador.filial || '';
            document.getElementById('centroCusto').value = sa.colaborador.centro_custo || '';
        }
        
        if (sa.itens && sa.itens.length > 0) {
            const tbody = document.getElementById('itemsBody');
            tbody.innerHTML = '';
            
            sa.itens.forEach((item) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" value="${(item.codigo || '').toUpperCase()}" placeholder="Código"></td>
                    <td><input type="text" class="item-descricao input-descricao" readonly value="${item.descricao || ''}" placeholder="Descrição"></td>
                    <td><input type="text" class="item-unidade" readonly value="${item.unidade || ''}" placeholder="Unid."></td>
                    <td><input type="number" class="item-quantidade" value="${item.quantidade || 0}" placeholder="Qtd." min="0"></td>
                    <td>
                        <select class="item-armazem">
                            <option value="">Selecione</option>
                            ${['01','02','03','04','05','06','07','08','09','10','11','12'].map(a => 
                                `<option value="${a}" ${item.armazem === a ? 'selected' : ''}>${a}</option>`
                            ).join('')}
                        </select>
                    </td>
                    <td><input type="text" class="item-ca" value="${item.ca || ''}" placeholder="C.A"></td>
                    <td><button class="remove-item" onclick="removerItem(this)">✕</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        const entreguePorNome = document.getElementById('entreguePorNome');
        const recebidoPorNome = document.getElementById('recebidoPorNome');
        
        if (entreguePorNome) {
            entreguePorNome.innerHTML = `<strong>${dadosSessao?.nome || 'Aguardando'}</strong>`;
        }
        
        if (recebidoPorNome) {
            const nomeColab = document.getElementById('colaborador')?.value || 'Aguardando';
            recebidoPorNome.innerHTML = `<strong>${nomeColab}</strong>`;
        }
        
        if (sa.assinaturas) {
            if (sa.assinaturas.entregue) {
                atualizarAssinaturaUI('entregue', sa.assinaturas.entregue);
            }
            if (sa.assinaturas.recebido) {
                atualizarAssinaturaUI('recebido', sa.assinaturas.recebido);
            }
        }
        
        if (sa.foto) {
            atualizarFotoUI(sa.foto);
        }
        
        atualizarBotoesAcao(sa);
        
        const botoesAssinar = document.querySelectorAll('.btn-assinar');
        botoesAssinar.forEach(btn => {
            if (perfilUsuario === 'VISUALIZACAO') {
                btn.disabled = true;
                btn.textContent = '🔒 Apenas Visualização';
            }
        });
        
        configurarPopupDescricao();
        
        if (!window._verificadorAssinaturas) {
            window._verificadorAssinaturas = setInterval(verificarAssinaturas, 3000);
            setTimeout(verificarAssinaturas, 1000);
        }
        
        setTimeout(verificarAssinaturaConcluida, 500);
        
    } catch (error) {
        console.error('❌ Erro ao carregar S.A.:', error);
        mostrarToast('❌ Erro ao carregar S.A.', 'erro');
    }
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
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
// CONFIGURAR BOTÕES DE ASSINATURA
// ============================================

function configurarBotoesAssinatura() {
    document.querySelectorAll('.btn-assinar, .btn-reassinar').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
    });
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando S.A. Emergencial...');
    
    await Promise.all([
        carregarUsuariosAutorizados(),
        carregarColaboradoresSA(),
        carregarMateriaisSA()
    ]);
    
    const sessao = carregarDadosUsuario();
    if (!sessao) {
        console.log('❌ Falha ao carregar sessão, redirecionando...');
        return;
    }
    
    inicializarPopup();
    configurarBotoesAssinatura();
    
    const pathname = window.location.pathname;
    const isFormulario = pathname.includes('formulario.html');
    const isIndex = pathname.includes('index.html') || pathname.endsWith('/sa-emergencial/');
    
    console.log('📍 Página atual:', pathname, '| IsFormulario:', isFormulario, '| IsIndex:', isIndex);
    
    if (isIndex) {
        console.log('📋 Carregando lista de S.A.');
        await carregarListaSA();
        
        const btnNovaSA = document.getElementById('btnNovaSA');
        if (btnNovaSA) {
            const podeCriar = usuarioPodeCriarSA(dadosSessao.matricula);
            if (podeCriar) {
                btnNovaSA.style.display = 'inline-flex';
                btnNovaSA.textContent = '➕ Nova S.A.';
                btnNovaSA.onclick = criarNovaSA;
            } else {
                btnNovaSA.style.display = 'none';
            }
        }
        
    } else if (isFormulario) {
        console.log('📝 Carregando formulário de S.A.');
        await carregarSAFormulario();
        configurarPopupDescricao();
    }
    
    window.addEventListener('scroll', controlarBotoesNavegacao);
    window.addEventListener('load', function() {
        setTimeout(controlarBotoesNavegacao, 500);
    });
    window.addEventListener('resize', controlarBotoesNavegacao);
    
    document.addEventListener('click', function(e) {
        if (e.target.closest('.add-item-btn')) {
            setTimeout(configurarPopupDescricao, 100);
        }
    });
});

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================

window.redirecionarParaHome = redirecionarParaHome;
window.irParaTopo = irParaTopo;
window.irParaFim = irParaFim;
window.carregarListaSA = carregarListaSA;
window.verificarAssinaturas = verificarAssinaturas;
window.verificarAssinaturaConcluida = verificarAssinaturaConcluida;
window.criarNovaSA = criarNovaSA;
window.usuarioPodeCriarSA = usuarioPodeCriarSA;
window.mostrarPopup = mostrarPopup;
window.fecharPopup = fecharPopup;
window.configurarPopupDescricao = configurarPopupDescricao;
window.atualizarAssinaturaUI = atualizarAssinaturaUI;
window.atualizarFotoUI = atualizarFotoUI;
window.capturarFoto = capturarFoto;
window.capturarFotoFrame = capturarFotoFrame;
window.fecharCamera = fecharCamera;
window.trocarCamera = trocarCamera;
window.excluirFoto = excluirFoto;
window.enviarFotoParaR2 = enviarFotoParaR2;
window.uploadParaR2 = uploadParaR2;
window.marcarAtendidaProtheus = marcarAtendidaProtheus;
window.atualizarBotoesAcao = atualizarBotoesAcao;
window.exportarSAPainel = exportarSAPainel;
window.selecionarSAExportar = selecionarSAExportar;
window.gerarConteudoPDF = gerarConteudoPDF;
window.renderizarListaSA = renderizarListaSA;
window.configurarFiltros = configurarFiltros;
window.aplicarFiltrosSA = aplicarFiltrosSA;
window.limparFiltrosSA = limparFiltrosSA;
window.getTipoSASelecionado = getTipoSASelecionado;
window.getGerarDescontoSelecionado = getGerarDescontoSelecionado;
window.abrirPaginaAssinatura = abrirPaginaAssinatura;