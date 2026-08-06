// ============================================
// RELATÓRIOS - SICGM (VERSÃO COM SEGREGAÇÃO POR DEPÓSITO)
// ============================================

const API_URL = 'https://noisy-snow-0359.alefe-gomes-72f.workers.dev/api';

// URL do Cloudflare R2
const R2_URL = 'https://pub-b5fbd1ddaff14047bf16aef93e8886dd.r2.dev';

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let perfilUsuario = 'OPERACIONAL';
let dadosCompletos = [];
let dadosProcessados = [];
let posicaoEstoque = {};
let snapshotCarregado = false;
let depositoAtual = '1050';
let dadosPorDeposito = {};

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
// FUNÇÃO PARA OBTER DATA NO FUSO BRASIL (UTC-3)
// ============================================

function getDataBrasil() {
    const agora = new Date();
    const offsetBrasil = -3;
    const horaUTC = agora.getTime() + (agora.getTimezoneOffset() * 60000);
    const dataBrasil = new Date(horaUTC + (offsetBrasil * 3600000));
    return dataBrasil.toISOString().split('T')[0];
}

// ============================================
// FUNÇÃO PARA FORMATAR DATA
// ============================================

function formatarData(dataString) {
    if (!dataString) return '-';
    try {
        const data = new Date(dataString + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataString;
    }
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

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

// ============================================
// TOAST DE NOTIFICAÇÃO
// ============================================

function mostrarToast(mensagem, tipo) {
    const toastExistente = document.querySelector('.toast-notificacao');
    if (toastExistente) {
        toastExistente.remove();
    }
    
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
        sucesso: {
            background: 'linear-gradient(135deg, #48bb78, #38a169)',
            color: '#ffffff',
            borderColor: '#48bb78'
        },
        erro: {
            background: 'linear-gradient(135deg, #fc8181, #e53e3e)',
            color: '#ffffff',
            borderColor: '#fc8181'
        },
        info: {
            background: 'linear-gradient(135deg, #63b3ed, #4299e1)',
            color: '#ffffff',
            borderColor: '#63b3ed'
        },
        aviso: {
            background: 'linear-gradient(135deg, #f6ad55, #ed8936)',
            color: '#ffffff',
            borderColor: '#f6ad55'
        }
    };
    
    const cor = cores[tipo] || cores.info;
    toast.style.background = cor.background;
    toast.style.color = cor.color;
    toast.style.borderColor = cor.borderColor;
    
    document.body.appendChild(toast);
    
    toast.offsetHeight;
    toast.style.transform = 'translateX(0)';
    
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 400);
    }, 4000);
    
    toast.addEventListener('click', () => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 400);
    });
}

// ============================================
// FUNÇÃO ATIVAR DEPÓSITO
// ============================================

function ativarDeposito(deposito) {
    if (deposito === depositoAtual) return;
    
    depositoAtual = deposito;
    
    document.querySelectorAll('.tab-deposito-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.deposito === deposito) {
            btn.classList.add('active');
        }
    });
    
    carregarPosicaoEstoque();
    carregarRelatorios();
    
    const config = DEPOSITOS_CONFIG[deposito];
    mostrarToast(`📦 Mudando para ${config?.nome || deposito}`, 'info');
}

// ============================================
// CARREGAR POSIÇÃO DE ESTOQUE - DO R2 (POR DEPÓSITO)
// ============================================

async function carregarPosicaoEstoque() {
    try {
        console.log(`🔄 Carregando posição de estoque para depósito ${depositoAtual}...`);
        
        const response = await fetch(`${R2_URL}/posicacao-de-estoque/posicao-de-estoque-${depositoAtual}.txt`);
        
        if (!response.ok) {
            console.warn(`⚠️ Arquivo posicao-de-estoque-${depositoAtual}.txt não encontrado no R2`);
            mostrarToast(`⚠️ Posição de estoque do depósito ${depositoAtual} não encontrada`, 'aviso');
            return;
        }
        
        const texto = await response.text();
        const linhas = texto.trim().split('\n');
        
        if (linhas.length === 0) {
            console.warn('⚠️ Arquivo posicao-de-estoque.txt vazio');
            return;
        }
        
        console.log(`📄 Arquivo carregado: ${linhas.length} linhas`);
        
        let linhasProcessadas = 0;
        
        posicaoEstoque = {};
        
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            
            const partes = linha.split('\t');
            
            // Estrutura: codmat | codreg | dscmat | codund_mda_mat | vlrult_cot | saldo_oper
            if (partes.length >= 6) {
                const codmat = partes[0].trim();
                const codreg = partes[1]?.trim() || '';
                const dscmat = partes[2]?.trim() || '';
                const codund = partes[3]?.trim() || '';
                
                let vlrultCot = 0;
                try {
                    const valorStr = partes[4]?.trim().replace(',', '.') || '0';
                    vlrultCot = parseFloat(valorStr) || 0;
                } catch (e) {
                    vlrultCot = 0;
                }
                
                let saldoOper = 0;
                try {
                    const saldoStr = partes[5]?.trim().replace(',', '.') || '0';
                    saldoOper = parseFloat(saldoStr) || 0;
                } catch (e) {
                    saldoOper = 0;
                }
                
                if (codmat) {
                    posicaoEstoque[codmat] = {
                        codmat: codmat,
                        codreg: codreg,
                        descricao: dscmat,
                        und: codund,
                        valor_unitario: vlrultCot,
                        saldo_sistemico: saldoOper,
                        deposito: depositoAtual
                    };
                    linhasProcessadas++;
                }
            }
        }
        
        console.log(`📦 Posição de estoque carregada: ${linhasProcessadas} códigos para depósito ${depositoAtual}`);
        
        if (linhasProcessadas === 0) {
            console.warn(`⚠️ Nenhum item encontrado para o depósito ${depositoAtual}`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar posição de estoque:', error);
        mostrarToast('❌ Erro ao carregar posição de estoque', 'erro');
    }
}

function getPosicaoEstoque(codigo) {
    if (!codigo) return null;
    return posicaoEstoque[codigo] || null;
}

// ============================================
// CARREGAR DADOS DO D1 (COM FILTRO POR DEPÓSITO)
// ============================================

async function carregarDados() {
    try {
        mostrarToast('⏳ Carregando dados do banco...', 'info');
        
        const url = `${API_URL}/dados?deposito=${depositoAtual}`;
        console.log(`🌐 Buscando dados: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dados');
        }
        
        const dados = await response.json();
        console.log(`📊 Dados carregados: ${dados.length} registros para depósito ${depositoAtual}`);
        return dados;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarToast('❌ Erro ao carregar dados do servidor', 'erro');
        return [];
    }
}

// ============================================
// LISTA COMPLETA DE TODOS OS CÓDIGOS DAS CONTAGENS
// ============================================

function getTodosCodigosContagens() {
    const codigos = new Set();
    
    const config = DEPOSITOS_CONFIG[depositoAtual];
    
    // Códigos específicos por depósito
    if (depositoAtual === '1050') {
        const concretos = [
            '90405', '91073', '90662', '90400', '91074',
            '22817', '37745', '90570', '629476', '91020',
            '91021', '91022', '91019', '91023', '91024',
            '90186', '90187', '90193', '90194', '91044',
            '90195', '91045', '90196', '90668', '90197',
            '90667', '91046', '90198', '90665', '90199',
            '90200', '90671', '90201', '91047', '90202',
            '90669', '90203', '90670', '645570', '90206',
            '90204', '90673', '90205', '645572', '626201',
            '690288', '670162', '690842', '645573'
        ];
        concretos.forEach(c => codigos.add(c));
        
        const medidores = ['3225', '42821', '42825', '42826', '42840'];
        medidores.forEach(c => codigos.add(c));
        
        const especificos = [
            '690916', '690917', '690001', '690403', 
            '690312', '616033', '617640', '618660','602826'
        ];
        especificos.forEach(c => codigos.add(c));
        
        const miscelaneas = [
            '90395', '90013', '90306', '90307', '90701',
            '90487', '90551', '90547', '90479', '90480',
            '90481', '90341', '90342', '90343', '90501',
            '91119', '90522', '90423', '90208',
            '90210', '90497', '90498', '90499', '90500',
            '90641', '90643', '90645', '90510', '90639',
            '90640', '90567', '90488', '90414', '90415'
        ];
        miscelaneas.forEach(c => codigos.add(c));
        
        const lacos = [
            '212', '2953', '4566', '22282', '90330',
            '90687', '90688', '90689', '90694', '90695',
            '90696', '90698', '90699', '90737', '90741',
            '90742', '90745', '90746', '90756', '90757', '90761'
        ];
        lacos.forEach(c => codigos.add(c));
        
        const alcas = [
            '90303', '90308', '90310', '90311', '90323',
            '90324', '90557', '90565', '90566', '90683',
            '90685', '90707', '90713', '90715', '90724',
            '90726', '90727'
        ];
        alcas.forEach(c => codigos.add(c));
        
        const parafusos = [
            '90364', '90365', '90366', '90367', '90373',
            '90375', '90376', '90377', '90378', '90379',
            '90380', '90381', '90382', '90383', '90384',
            '90385', '90386'
        ];
        parafusos.forEach(c => codigos.add(c));
        
        const cabos = [
            '42', '90262', '90263', '90272', '90274',
            '90283', '90285', '90287', '90288', '90391',
            '90392', '90624', '90703', '90779', '90836',
            '91095', '91377', '91381', '92113', '604909'
        ];
        cabos.forEach(c => codigos.add(c));
        
        const misc1 = [
            '1856', '10246', '10247', '10251', '32295',
            '90110', '90111', '90229', '90244', '90247',
            '90251', '90252', '90253', '90254', '90275',
            '90277', '90280', '90387', '90388', '90404',
            '90409', '90411', '90440', '90444', '90445',
            '90448', '90524', '90568', '90572', '90575',
            '90576', '90582', '90619'
        ];
        misc1.forEach(c => codigos.add(c));
        
        const misc2 = [
            '10064', '30204', '35795', '62119', '90213',
            '90215', '90389', '90399', '90442', '90458',
            '90462', '90463', '90514', '90516', '90518',
            '90522', '90545', '90548', '90561', '90584',
            '90839', '90862', '90887', '90888', '91003',
            '92161', '92325'
        ];
        misc2.forEach(c => codigos.add(c));
    } else if (depositoAtual === '1855') {
        const itensSemanal = DEPOSITOS_CONFIG['1855']?.itens_semanal || [];
        itensSemanal.forEach(c => codigos.add(c));
        
        // Adiciona códigos de trafos para contagem diária
        const trafos = [];
        for (let i = 170; i <= 370; i++) {
            trafos.push(String(i));
        }
        trafos.forEach(c => codigos.add(c));
    } else if (depositoAtual === '1854') {
        const itensSemanal = DEPOSITOS_CONFIG['1854']?.itens_semanal || [];
        itensSemanal.forEach(c => codigos.add(c));
    } else if (depositoAtual === '1853') {
        const itensSemanal = DEPOSITOS_CONFIG['1853']?.itens_semanal || [];
        itensSemanal.forEach(c => codigos.add(c));
    }
    
    return Array.from(codigos).sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
    });
}

// ============================================
// PROCESSAR DADOS
// ============================================

function processarDados(dados, filtros) {
    let dadosFiltrados = dados.filter(item => item.ativo === 1 || item.ativo === true);
    
    if (filtros) {
        if (filtros.dataInicio || filtros.dataFim) {
            const dataInicio = filtros.dataInicio ? new Date(filtros.dataInicio + 'T00:00:00') : null;
            const dataFim = filtros.dataFim ? new Date(filtros.dataFim + 'T00:00:00') : null;
            
            dadosFiltrados = dadosFiltrados.filter(item => {
                if (!item.data && !item.created_at) return true;
                const dataItem = new Date((item.created_at || item.data) + 'T00:00:00');
                if (dataInicio && dataItem < dataInicio) return false;
                if (dataFim && dataItem > dataFim) return false;
                return true;
            });
        }
        
        if (filtros.tipoMaterial) {
            dadosFiltrados = dadosFiltrados.filter(item => 
                item.tipo_material === filtros.tipoMaterial
            );
        }
        
        if (filtros.codigo && filtros.codigo.trim()) {
            const codigoBusca = filtros.codigo.trim();
            dadosFiltrados = dadosFiltrados.filter(item => 
                item.codigo && item.codigo.includes(codigoBusca)
            );
        }
    }
    
    const tiposUltimaContagem = ['concreto', 'miscelanea', 'especifico', 'laco', 'alca', 'parafuso', 'cabo', 'miscelanea1', 'miscelanea2', 'medidor'];
    const tiposSomaTudo = ['trafo', 'bobina'];
    
    const gruposPorCodigo = {};
    
    dadosFiltrados.forEach(item => {
        const codigo = item.codigo;
        if (!gruposPorCodigo[codigo]) {
            gruposPorCodigo[codigo] = {
                codigo: codigo,
                tipo_material: item.tipo_material || 'desconhecido',
                registros: []
            };
        }
        gruposPorCodigo[codigo].registros.push(item);
    });
    
    const registrosProcessados = [];
    
    Object.values(gruposPorCodigo).forEach(grupo => {
        const tipoMaterial = grupo.tipo_material;
        const registros = grupo.registros;
        
        registros.sort((a, b) => {
            const dateA = new Date(a.created_at || a.data);
            const dateB = new Date(b.created_at || b.data);
            return dateA - dateB;
        });
        
        if (tiposUltimaContagem.includes(tipoMaterial)) {
            const ultimoRegistro = registros[registros.length - 1];
            registrosProcessados.push(ultimoRegistro);
        } else if (tiposSomaTudo.includes(tipoMaterial)) {
            registros.forEach(registro => {
                registrosProcessados.push(registro);
            });
        } else {
            const ultimoRegistro = registros[registros.length - 1];
            registrosProcessados.push(ultimoRegistro);
        }
    });
    
    const todosCodigos = getTodosCodigosContagens();
    const mapaCodigos = {};
    
    todosCodigos.forEach(codigo => {
        mapaCodigos[codigo] = {
            codigo: codigo,
            descricao: '',
            und: '-',
            tipo_material: 'desconhecido',
            quantidade_total: 0,
            ultima_contagem: null,
            ultimo_usuario: null,
            ultima_data: null,
            registros: [],
            qtds_utilizadas: [],
            temRegistro: false,
            valor_unitario: 0,
            saldo_sistemico: 0,
            contagem_diaria: false,
            contagem_semanal: false,
            contagem_rotativa: false,
            da_lista_fixa: true
        };
    });
    
    registrosProcessados.forEach(item => {
        const codigo = item.codigo;
        const tipoMaterial = item.tipo_material || 'desconhecido';
        
        if (tipoMaterial === 'trafo' || tipoMaterial === 'bobina') {
            if (!mapaCodigos[codigo]) {
                mapaCodigos[codigo] = {
                    codigo: codigo,
                    descricao: item.descricao || codigo,
                    und: item.und || '-',
                    tipo_material: tipoMaterial,
                    quantidade_total: 0,
                    ultima_contagem: null,
                    ultimo_usuario: null,
                    ultima_data: null,
                    registros: [],
                    qtds_utilizadas: [],
                    temRegistro: false,
                    valor_unitario: 0,
                    saldo_sistemico: 0,
                    contagem_diaria: false,
                    contagem_semanal: false,
                    contagem_rotativa: false,
                    da_lista_fixa: false
                };
            }
        }
    });
    
    registrosProcessados.forEach(item => {
        const codigo = item.codigo;
        if (!mapaCodigos[codigo]) {
            mapaCodigos[codigo] = {
                codigo: codigo,
                descricao: item.descricao || codigo,
                und: item.und || '-',
                tipo_material: item.tipo_material || 'desconhecido',
                quantidade_total: 0,
                ultima_contagem: null,
                ultimo_usuario: null,
                ultima_data: null,
                registros: [],
                qtds_utilizadas: [],
                temRegistro: false,
                valor_unitario: 0,
                saldo_sistemico: 0,
                contagem_diaria: false,
                contagem_semanal: false,
                contagem_rotativa: false,
                da_lista_fixa: false
            };
        }
        
        const grupo = mapaCodigos[codigo];
        grupo.temRegistro = true;
        
        if (item.descricao && !grupo.descricao) {
            grupo.descricao = item.descricao;
        }
        if (item.und && grupo.und === '-') {
            grupo.und = item.und;
        }
        if (item.tipo_material && grupo.tipo_material === 'desconhecido') {
            grupo.tipo_material = item.tipo_material;
        }
        
        const qtd = parseFloat(item.qtd) || 0;
        grupo.quantidade_total += qtd;
        grupo.registros.push(item);
        grupo.qtds_utilizadas.push({
            qtd: qtd,
            data: item.data,
            created_at: item.created_at,
            nome: item.nome
        });
        
        const dataItem = new Date(item.created_at || item.data);
        if (!grupo.ultima_data || dataItem > new Date(grupo.ultima_data)) {
            grupo.ultima_contagem = item.qtd;
            grupo.ultimo_usuario = item.nome;
            grupo.ultima_data = item.created_at || item.data;
        }
    });
    
    Object.values(mapaCodigos).forEach(item => {
        const estoque = getPosicaoEstoque(item.codigo);
        if (estoque) {
            item.valor_unitario = estoque.valor_unitario || 0;
            item.saldo_sistemico = estoque.saldo_sistemico || 0;
            if (!item.descricao || item.descricao === item.codigo) {
                item.descricao = estoque.descricao || item.codigo;
            }
            if (item.und === '-') {
                item.und = estoque.und || '-';
            }
        }
        
        const tipo = item.tipo_material;
        if (['concreto', 'trafo', 'bobina', 'especifico', 'medidor'].includes(tipo)) {
            item.contagem_diaria = true;
        }
        if (tipo === 'miscelanea') {
            item.contagem_semanal = true;
        }
        if (['laco', 'alca', 'parafuso', 'cabo', 'miscelanea1', 'miscelanea2'].includes(tipo)) {
            item.contagem_rotativa = true;
        }
    });
    
    const resultado = Object.values(mapaCodigos);
    resultado.sort((a, b) => a.codigo.localeCompare(b.codigo));
    
    return resultado;
}

// ============================================
// RENDERIZAR RELATÓRIO POR TIPO DE CONTAGEM
// ============================================

function renderizarRelatorioPorContagem(dados, tipoContagem) {
    const tipoMap = {
        'diaria': { bodyId: 'body-diaria', badgeId: 'badge-diaria', panelId: 'panel-diaria', filtro: 'contagem_diaria' },
        'semanal': { bodyId: 'body-semanal', badgeId: 'badge-semanal', panelId: 'panel-semanal', filtro: 'contagem_semanal' },
        'rotativas': { bodyId: 'body-rotativas', badgeId: 'badge-rotativas', panelId: 'panel-rotativas', filtro: 'contagem_rotativa' }
    };
    
    const config = tipoMap[tipoContagem];
    if (!config) return;
    
    const dadosFiltrados = dados.filter(item => item[config.filtro] === true);
    
    // Verifica se o depósito tem esse tipo de contagem
    const depositoConfig = DEPOSITOS_CONFIG[depositoAtual];
    if (depositoConfig) {
        if (tipoContagem === 'diaria' && !depositoConfig.contagens.diaria) {
            const tbody = document.getElementById(config.bodyId);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="13" class="text-center">📭 Este depósito não possui contagem diária</td>
                    </tr>
                `;
            }
            const badge = document.getElementById(config.badgeId);
            if (badge) badge.textContent = '0';
            return;
        }
        if (tipoContagem === 'semanal' && !depositoConfig.contagens.semanal) {
            const tbody = document.getElementById(config.bodyId);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="13" class="text-center">📭 Este depósito não possui contagem semanal</td>
                    </tr>
                `;
            }
            const badge = document.getElementById(config.badgeId);
            if (badge) badge.textContent = '0';
            return;
        }
        if (tipoContagem === 'rotativas' && !depositoConfig.contagens.rotativa) {
            const tbody = document.getElementById(config.bodyId);
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="13" class="text-center">📭 Este depósito não possui contagens rotativas</td>
                    </tr>
                `;
            }
            const badge = document.getElementById(config.badgeId);
            if (badge) badge.textContent = '0';
            return;
        }
    }
    
    renderizarTabela(dadosFiltrados, config);
}

function renderizarTabela(dadosFiltrados, config) {
    const tbody = document.getElementById(config.bodyId);
    const badge = document.getElementById(config.badgeId);
    
    if (!tbody) return;
    
    if (dadosFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center">📭 Nenhum item encontrado para este tipo de contagem</td>
            </tr>
        `;
        if (badge) badge.textContent = '0';
        return;
    }
    
    if (badge) badge.textContent = dadosFiltrados.length;
    
    let html = '';
    let totalSaldoFisico = 0;
    let totalSaldoSistemico = 0;
    let totalDivergenciaValor = 0;
    let totalItensDivergentes = 0;
    let totalItensFisico = 0;
    let totalQtdFisica = 0;
    let totalQtdSistemica = 0;
    
    dadosFiltrados.forEach(item => {
        const badgeClass = `badge-${item.tipo_material}`;
        const tipoLabel = item.tipo_material.charAt(0).toUpperCase() + item.tipo_material.slice(1);
        
        const saldoFisico = item.temRegistro ? item.quantidade_total : 0;
        const saldoSistemico = item.saldo_sistemico || 0;
        const valorUnitario = item.valor_unitario || 0;
        
        const divergenciaQtd = saldoFisico - saldoSistemico;
        const divergenciaValor = divergenciaQtd * valorUnitario;
        
        totalSaldoFisico += saldoFisico * valorUnitario;
        totalSaldoSistemico += saldoSistemico * valorUnitario;
        totalQtdFisica += saldoFisico;
        totalQtdSistemica += saldoSistemico;
        
        if (saldoFisico > 0) totalItensFisico++;
        
        if (divergenciaQtd !== 0) {
            totalDivergenciaValor += divergenciaValor;
            totalItensDivergentes++;
        }
        
        let acuracidade = '-';
        if (saldoSistemico > 0) {
            const diferenca = Math.abs(saldoFisico - saldoSistemico);
            const percentual = ((1 - (diferenca / saldoSistemico)) * 100);
            acuracidade = percentual.toFixed(1) + '%';
            
            if (percentual >= 95) {
                acuracidade = `<span style="color: #48BB78; font-weight: 600;">✅ ${acuracidade}</span>`;
            } else if (percentual >= 80) {
                acuracidade = `<span style="color: #ED8936; font-weight: 600;">⚠️ ${acuracidade}</span>`;
            } else {
                acuracidade = `<span style="color: #FC8181; font-weight: 600;">❌ ${acuracidade}</span>`;
            }
        }
        
        let statusHtml = '';
        if (item.temRegistro) {
            statusHtml = `<span style="color: #48BB78; font-weight: 600;">✅ Contado</span>`;
        } else {
            statusHtml = `<span style="color: #FC8181; font-weight: 600;">❌ Não contado</span>`;
        }
        
        let divergenciaQtdDisplay = divergenciaQtd.toFixed(2);
        let divergenciaValorDisplay = formatarMoeda(divergenciaValor);
        
        if (divergenciaQtd > 0) {
            divergenciaQtdDisplay = `<span style="color: #48BB78; font-weight: 600;">▲ +${divergenciaQtd.toFixed(2)}</span>`;
            divergenciaValorDisplay = `<span style="color: #48BB78; font-weight: 600;">${formatarMoeda(divergenciaValor)}</span>`;
        } else if (divergenciaQtd < 0) {
            divergenciaQtdDisplay = `<span style="color: #FC8181; font-weight: 600;">▼ ${divergenciaQtd.toFixed(2)}</span>`;
            divergenciaValorDisplay = `<span style="color: #FC8181; font-weight: 600;">${formatarMoeda(divergenciaValor)}</span>`;
        }
        
        const valorUnitarioDisplay = valorUnitario > 0 ? formatarMoeda(valorUnitario) : '-';
        
        let rowClass = !item.temRegistro ? 'tr-nao-contado' : 'tr-contado';
        
        html += `
            <tr class="${rowClass}">
                <td><strong>${item.codigo}</strong></td>
                <td>${item.descricao}</td>
                <td>${item.und}</td>
                <td><span class="badge-tipo ${badgeClass}">${tipoLabel}</span></td>
                <td><strong>${saldoFisico.toFixed(2)}</strong></td>
                <td>${saldoSistemico.toFixed(2)}</td>
                <td>${divergenciaQtdDisplay}</td>
                <td>${valorUnitarioDisplay}</td>
                <td>${divergenciaValorDisplay}</td>
                <td>${acuracidade}</td>
                <td>${statusHtml}</td>
                <td>${item.ultimo_usuario || '-'}</td>
                <td>${formatarDataHora(item.ultima_data)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    const panelAtivo = document.querySelector('.tab-contagem-panel.active');
    if (panelAtivo) {
        document.getElementById('total-saldo-fisico').textContent = formatarMoeda(totalSaldoFisico);
        document.getElementById('total-saldo-sistemico').textContent = formatarMoeda(totalSaldoSistemico);
        
        const valorEl = document.getElementById('total-divergencia-valor');
        if (totalDivergenciaValor > 0) {
            valorEl.style.color = '#48BB78';
            valorEl.textContent = `▲ ${formatarMoeda(totalDivergenciaValor)}`;
        } else if (totalDivergenciaValor < 0) {
            valorEl.style.color = '#FC8181';
            valorEl.textContent = `▼ ${formatarMoeda(totalDivergenciaValor)}`;
        } else {
            valorEl.style.color = '#2D3748';
            valorEl.textContent = formatarMoeda(0);
        }
        
        document.getElementById('total-itens-relatorio').textContent = dadosFiltrados.length;
        document.getElementById('total-itens-fisico').textContent = totalItensFisico;
        document.getElementById('total-itens-divergentes').textContent = totalItensDivergentes;
        
        const percentualCobertura = dadosFiltrados.length > 0 ? (dadosFiltrados.filter(item => item.temRegistro).length / dadosFiltrados.length * 100) : 0;
        document.getElementById('percentual-cobertura').textContent = percentualCobertura.toFixed(1) + '%';
        
        document.getElementById('indicadores-relatorio').style.display = 'block';
    }
}

// ============================================
// ATIVAR ABA DE CONTAGEM
// ============================================

function ativarAbaContagem(tipo) {
    document.querySelectorAll('.tab-contagem-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const btnAtivo = document.querySelector(`.tab-contagem-btn[data-tipo="${tipo}"]`);
    if (btnAtivo) btnAtivo.classList.add('active');
    
    document.querySelectorAll('.tab-contagem-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const panelAtivo = document.getElementById(`panel-${tipo}`);
    if (panelAtivo) panelAtivo.classList.add('active');
    
    if (dadosProcessados && dadosProcessados.length > 0) {
        renderizarRelatorioPorContagem(dadosProcessados, tipo);
    }
}

// ============================================
// ATUALIZAR ESTATÍSTICAS
// ============================================

function atualizarEstatisticas(dados, dadosBrutos) {
    const totalRegistros = dadosBrutos ? dadosBrutos.filter(i => i.ativo === 1 || i.ativo === true).length : 0;
    const elRegistros = document.getElementById('total-registros');
    if (elRegistros) elRegistros.textContent = totalRegistros;
    
    const elCodigos = document.getElementById('total-codigos');
    if (elCodigos) elCodigos.textContent = dados ? dados.length : 0;
    
    const comRegistro = dados ? dados.filter(item => item.temRegistro).length : 0;
    const elContados = document.getElementById('total-codigos-contados');
    if (elContados) elContados.textContent = comRegistro;
    
    if (dadosBrutos && dadosBrutos.length > 0) {
        const ativos = dadosBrutos.filter(i => i.ativo === 1 || i.ativo === true);
        if (ativos.length > 0) {
            const ultimo = ativos.sort((a, b) => {
                const dateA = new Date(a.created_at || a.data);
                const dateB = new Date(b.created_at || b.data);
                return dateB - dateA;
            })[0];
            const el = document.getElementById('ultima-contagem');
            if (el) {
                el.textContent = formatarDataHora(ultimo.created_at || ultimo.data);
                el.style.color = '#2B6CB0';
                el.style.fontWeight = '700';
            }
        }
    }
    
    if (dadosBrutos) {
        const ativos = dadosBrutos.filter(i => i.ativo === 1 || i.ativo === true);
        
        const trafos = ativos.filter(i => i.tipo_material === 'trafo');
        const totalTrafos = trafos.reduce((sum, item) => sum + (parseFloat(item.qtd) || 0), 0);
        const elTrafos = document.getElementById('total-trafos');
        if (elTrafos) elTrafos.textContent = totalTrafos.toFixed(0);
        
        const bobinas = ativos.filter(i => i.tipo_material === 'bobina');
        const totalBobinas = bobinas.reduce((sum, item) => sum + (parseFloat(item.qtd) || 0), 0);
        const elBobinas = document.getElementById('total-bobinas');
        if (elBobinas) elBobinas.textContent = totalBobinas.toFixed(0);
        
        const concretos = ativos.filter(i => i.tipo_material === 'concreto');
        const gruposConcretos = {};
        concretos.forEach(item => {
            const codigo = item.codigo;
            if (!gruposConcretos[codigo]) {
                gruposConcretos[codigo] = [];
            }
            gruposConcretos[codigo].push(item);
        });
        let totalConcretos = 0;
        Object.values(gruposConcretos).forEach(registros => {
            registros.sort((a, b) => {
                const dateA = new Date(a.created_at || a.data);
                const dateB = new Date(b.created_at || b.data);
                return dateB - dateA;
            });
            const ultimoRegistro = registros[0];
            totalConcretos += parseFloat(ultimoRegistro.qtd) || 0;
        });
        const elConcretos = document.getElementById('total-concretos');
        if (elConcretos) elConcretos.textContent = totalConcretos.toFixed(0);
        
        const miscelaneas = ativos.filter(i => i.tipo_material === 'miscelanea');
        const gruposMiscelaneas = {};
        miscelaneas.forEach(item => {
            const codigo = item.codigo;
            if (!gruposMiscelaneas[codigo]) {
                gruposMiscelaneas[codigo] = [];
            }
            gruposMiscelaneas[codigo].push(item);
        });
        let totalMiscelaneas = 0;
        Object.values(gruposMiscelaneas).forEach(registros => {
            registros.sort((a, b) => {
                const dateA = new Date(a.created_at || a.data);
                const dateB = new Date(b.created_at || b.data);
                return dateB - dateA;
            });
            const ultimoRegistro = registros[0];
            totalMiscelaneas += parseFloat(ultimoRegistro.qtd) || 0;
        });
        const elMiscelaneas = document.getElementById('total-miscelaneas');
        if (elMiscelaneas) elMiscelaneas.textContent = totalMiscelaneas.toFixed(0);
        
        const especificos = ativos.filter(i => i.tipo_material === 'especifico');
        const gruposEspecificos = {};
        especificos.forEach(item => {
            const codigo = item.codigo;
            if (!gruposEspecificos[codigo]) {
                gruposEspecificos[codigo] = [];
            }
            gruposEspecificos[codigo].push(item);
        });
        let totalEspecificos = 0;
        Object.values(gruposEspecificos).forEach(registros => {
            registros.sort((a, b) => {
                const dateA = new Date(a.created_at || a.data);
                const dateB = new Date(b.created_at || b.data);
                return dateB - dateA;
            });
            const ultimoRegistro = registros[0];
            totalEspecificos += parseFloat(ultimoRegistro.qtd) || 0;
        });
        const elEspecificos = document.getElementById('total-especificos');
        if (elEspecificos) elEspecificos.textContent = totalEspecificos.toFixed(0);
    }
}

// ============================================
// CARREGAR RELATÓRIOS
// ============================================

async function carregarRelatorios() {
    try {
        const dadosBrutos = await carregarDados();
        
        if (!dadosBrutos || dadosBrutos.length === 0) {
            mostrarToast('⚠️ Nenhum dado encontrado no banco', 'aviso');
            return;
        }
        
        const filtros = {
            dataInicio: document.getElementById('filtro-data-inicio')?.value || '',
            dataFim: document.getElementById('filtro-data-fim')?.value || '',
            tipoMaterial: document.getElementById('filtro-tipo-material')?.value || '',
            codigo: document.getElementById('filtro-codigo')?.value || ''
        };
        
        dadosProcessados = processarDados(dadosBrutos, filtros);
        dadosCompletos = dadosBrutos;
        
        renderizarRelatorioPorContagem(dadosProcessados, 'diaria');
        renderizarRelatorioPorContagem(dadosProcessados, 'semanal');
        renderizarRelatorioPorContagem(dadosProcessados, 'rotativas');
        
        atualizarEstatisticas(dadosProcessados, dadosBrutos);
        
        const total = dadosProcessados.length;
        const contados = dadosProcessados.filter(item => item.temRegistro).length;
        const config = DEPOSITOS_CONFIG[depositoAtual];
        mostrarToast(`✅ ${total} códigos encontrados (${contados} contados, ${total - contados} não contados) - ${config?.nome || depositoAtual}`, 'sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar relatórios:', error);
        mostrarToast('❌ Erro ao carregar relatórios', 'erro');
    }
}

// ============================================
// LIMPAR FILTROS
// ============================================

function limparFiltros() {
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-tipo-material').value = '';
    document.getElementById('filtro-codigo').value = '';
    carregarRelatorios();
}

// ============================================
// EXPORTAR EXCEL (XLSX)
// ============================================

function exportarExcel() {
    const panelAtivo = document.querySelector('.tab-contagem-panel.active');
    if (!panelAtivo) {
        mostrarToast('⚠️ Selecione uma aba para exportar', 'aviso');
        return;
    }
    
    const tabela = panelAtivo.querySelector('.relatorio-tabela');
    if (!tabela) {
        mostrarToast('⚠️ Nenhuma tabela encontrada', 'aviso');
        return;
    }
    
    const linhas = tabela.querySelectorAll('tbody tr');
    if (linhas.length === 0 || linhas[0].textContent.includes('Nenhum item')) {
        mostrarToast('⚠️ Não há dados para exportar', 'aviso');
        return;
    }
    
    mostrarToast('🔄 Gerando arquivo Excel...', 'info');
    
    try {
        const tituloAba = panelAtivo.querySelector('h2')?.textContent || 'Relatório';
        const config = DEPOSITOS_CONFIG[depositoAtual];
        const nomeDeposito = config?.nome || depositoAtual;
        
        let htmlContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" 
                  xmlns:x="urn:schemas-microsoft-com:office:excel" 
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Relatório</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10px; }
                    th { background-color: #4299E1; color: white; font-weight: bold; padding: 6px 10px; border: 1px solid #2B6CB0; }
                    td { padding: 5px 10px; border: 1px solid #CBD5E0; }
                    .text-center { text-align: center; }
                    .total-row { background-color: #EDF2F7; font-weight: 700; }
                </style>
            </head>
            <body>
                <h2>📊 ${tituloAba} - SICGM</h2>
                <p>Depósito: ${nomeDeposito}</p>
                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                <p>Perfil: ${perfilUsuario}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descrição</th>
                            <th>UND</th>
                            <th>Tipo</th>
                            <th>QTD Física</th>
                            <th>Saldo Sistêmico</th>
                            <th>Divergência QTD</th>
                            <th>Valor Unitário</th>
                            <th>Valor Divergência</th>
                            <th>Acuracidade</th>
                            <th>Status</th>
                            <th>Último Usuário</th>
                            <th>Data da Última</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        linhas.forEach(linha => {
            const colunas = linha.querySelectorAll('td');
            if (colunas.length > 0 && !linha.textContent.includes('Nenhum item')) {
                let valores = [];
                colunas.forEach(col => {
                    let texto = col.textContent.trim();
                    texto = texto.replace(/<[^>]*>/g, '').trim();
                    texto = texto.replace(/[▲▼+✅❌⚠️]/g, '').trim();
                    valores.push(texto);
                });
                htmlContent += `<tr><td>${valores.join('</td><td>')}</td></tr>`;
            }
        });
        
        const saldoFisico = document.getElementById('total-saldo-fisico')?.textContent || 'R$ 0,00';
        const saldoSistemico = document.getElementById('total-saldo-sistemico')?.textContent || 'R$ 0,00';
        const divergenciaValor = document.getElementById('total-divergencia-valor')?.textContent || 'R$ 0,00';
        const totalItens = document.getElementById('total-itens-relatorio')?.textContent || '0';
        const itensFisico = document.getElementById('total-itens-fisico')?.textContent || '0';
        const itensDivergentes = document.getElementById('total-itens-divergentes')?.textContent || '0';
        const cobertura = document.getElementById('percentual-cobertura')?.textContent || '0%';
        
        htmlContent += `
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="4" style="text-align: right; font-weight: 700;">RESUMO</td>
                            <td style="font-weight: 700;">${saldoFisico}</td>
                            <td style="font-weight: 700;">${saldoSistemico}</td>
                            <td style="font-weight: 700;">${divergenciaValor}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td colspan="2"></td>
                        </tr>
                        <tr>
                            <td colspan="4" style="text-align: right; font-weight: 700;">Total de Itens</td>
                            <td colspan="9" style="font-weight: 700;">${totalItens}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="text-align: right; font-weight: 700;">Itens com Saldo Físico</td>
                            <td colspan="9" style="font-weight: 700;">${itensFisico}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="text-align: right; font-weight: 700;">Itens com Divergência</td>
                            <td colspan="9" style="font-weight: 700;">${itensDivergentes}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="text-align: right; font-weight: 700;">% Cobertura</td>
                            <td colspan="9" style="font-weight: 700;">${cobertura}</td>
                        </tr>
                    </tfoot>
        `;
        
        htmlContent += `
                </table>
                <br>
                <p style="font-size: 10px; color: #718096;">
                    * Relatório gerado automaticamente pelo sistema SICGM - Depósito: ${nomeDeposito}
                </p>
            </body>
            </html>
        `;
        
        const blob = new Blob([htmlContent], { 
            type: 'application/vnd.ms-excel;charset=utf-8' 
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${depositoAtual}_${getDataBrasil()}.xls`;
        link.click();
        URL.revokeObjectURL(link.href);
        
        mostrarToast('✅ Excel exportado com sucesso!', 'sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao exportar Excel:', error);
        mostrarToast('❌ Erro ao exportar Excel', 'erro');
    }
}

// ============================================
// EXPORTAR PDF (Impressão)
// ============================================

function exportarPDF() {
    const panelAtivo = document.querySelector('.tab-contagem-panel.active');
    if (!panelAtivo) {
        mostrarToast('⚠️ Selecione uma aba para exportar', 'aviso');
        return;
    }
    
    const tabela = panelAtivo.querySelector('.relatorio-tabela');
    if (!tabela) {
        mostrarToast('⚠️ Nenhuma tabela encontrada', 'aviso');
        return;
    }
    
    const linhas = tabela.querySelectorAll('tbody tr');
    if (linhas.length === 0 || linhas[0].textContent.includes('Nenhum item')) {
        mostrarToast('⚠️ Não há dados para exportar', 'aviso');
        return;
    }
    
    mostrarToast('🔄 Preparando PDF...', 'info');
    
    setTimeout(() => {
        const tituloAba = panelAtivo.querySelector('h2')?.textContent || 'Relatório';
        const config = DEPOSITOS_CONFIG[depositoAtual];
        const nomeDeposito = config?.nome || depositoAtual;
        
        const tituloImpressao = document.createElement('div');
        tituloImpressao.id = 'titulo-impressao';
        tituloImpressao.style.cssText = `
            display: none;
            text-align: center;
            padding: 20px;
            font-size: 18px;
            font-weight: 700;
            color: #2D3748;
            border-bottom: 2px solid #E2E8F0;
            margin-bottom: 20px;
        `;
        tituloImpressao.innerHTML = `
            📊 ${tituloAba} - SICGM
            <br>
            <span style="font-size: 12px; font-weight: 400; color: #718096;">
                Depósito: ${nomeDeposito} | Gerado em: ${new Date().toLocaleString('pt-BR')} | Perfil: ${perfilUsuario}
            </span>
        `;
        
        panelAtivo.prepend(tituloImpressao);
        tituloImpressao.style.display = 'block';
        
        const styleImpressao = document.createElement('style');
        styleImpressao.id = 'style-impressao';
        styleImpressao.textContent = `
            @media print {
                .filtros-relatorio, .stats-container, .tabela-actions, 
                .btn-voltar-home, .header-container .title, 
                #filtro-resultado, .loading-message, #mensagem,
                .divergencia-resumo, .indicadores-relatorio,
                .tabs-contagem-nav, .seletor-deposito-container {
                    display: none !important;
                }
                #titulo-impressao {
                    display: block !important;
                }
                .tabela-container {
                    margin-top: 0 !important;
                }
                table {
                    font-size: 8px !important;
                }
                thead th {
                    background: #4299E1 !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .badge-tipo {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body {
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .container {
                    max-width: 100% !important;
                    padding: 10px !important;
                }
                .form-card {
                    padding: 10px !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .btn-navegacao {
                    display: none !important;
                }
                .total-row {
                    background-color: #EDF2F7 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .tab-contagem-panel {
                    display: block !important;
                }
                .tab-contagem-panel:not(.active) {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(styleImpressao);
        
        window.print();
        
        setTimeout(() => {
            const titulo = document.getElementById('titulo-impressao');
            if (titulo) titulo.remove();
            const style = document.getElementById('style-impressao');
            if (style) style.remove();
        }, 1000);
        
        mostrarToast('✅ PDF gerado com sucesso!', 'sucesso');
    }, 500);
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO - TOPO E FIM
// ============================================

function irParaTopo() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function irParaFim() {
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
}

function controlarBotoesNavegacao() {
    const btnTopo = document.getElementById('btnTopo');
    const btnFim = document.getElementById('btnFim');
    
    if (!btnTopo || !btnFim) return;
    
    const scrollY = window.scrollY;
    const alturaTotal = document.body.scrollHeight;
    const alturaVisivel = window.innerHeight;
    
    if (scrollY > 200) {
        btnTopo.classList.add('visivel');
    } else {
        btnTopo.classList.remove('visivel');
    }
    
    if (scrollY + alturaVisivel < alturaTotal - 100) {
        btnFim.classList.add('visivel');
    } else {
        btnFim.classList.remove('visivel');
    }
}

// ============================================
// FUNÇÕES DE SNAPSHOT E HISTÓRICO
// ============================================

async function carregarDatasDisponiveis() {
    try {
        const response = await fetch(`${API_URL}/snapshot/disponiveis?deposito=${depositoAtual}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar datas disponíveis');
        }
        
        const data = await response.json();
        
        if (data.success && data.datas) {
            return data.datas;
        }
        
        return [];
        
    } catch (error) {
        console.error('❌ Erro ao carregar datas disponíveis:', error);
        return [];
    }
}

async function carregarSnapshotPorData(data) {
    try {
        const response = await fetch(`${API_URL}/snapshot/obter/${data}?deposito=${depositoAtual}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar snapshot');
        }
        
        const result = await response.json();
        
        if (result.success && result.snapshot) {
            return result.snapshot;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erro ao carregar snapshot:', error);
        return null;
    }
}

async function carregarUltimoSnapshot() {
    try {
        const response = await fetch(`${API_URL}/snapshot/ultimo?deposito=${depositoAtual}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar último snapshot');
        }
        
        const result = await response.json();
        
        if (result.success && result.snapshot) {
            return result.snapshot;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erro ao carregar último snapshot:', error);
        return null;
    }
}

async function criarSnapshotManual() {
    try {
        mostrarToast('⏳ Criando snapshot...', 'info');
        
        const response = await fetch(`${API_URL}/snapshot/criar?deposito=${depositoAtual}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Erro ao criar snapshot');
        }
        
        const result = await response.json();
        
        if (result.success) {
            mostrarToast(`✅ Snapshot criado com sucesso!`, 'sucesso');
            carregarHistorico();
            return result;
        } else {
            mostrarToast(`❌ ${result.message}`, 'erro');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Erro ao criar snapshot:', error);
        mostrarToast('❌ Erro ao criar snapshot', 'erro');
        return null;
    }
}

function fecharHistorico() {
    const container = document.getElementById('historico-container');
    if (container) {
        container.style.display = 'none';
    }
}

function abrirHistorico() {
    carregarHistorico();
}

async function carregarHistorico() {
    const container = document.getElementById('historico-container');
    const conteudo = document.getElementById('historico-conteudo');
    
    if (!container || !conteudo) return;
    
    try {
        conteudo.innerHTML = '<div class="historico-loading">⏳ Carregando histórico...</div>';
        container.style.display = 'block';
        
        const datas = await carregarDatasDisponiveis();
        
        console.log('📅 Datas disponíveis:', datas);
        
        if (!datas || datas.length === 0) {
            conteudo.innerHTML = `
                <div class="historico-vazio">
                    📭 Nenhum snapshot disponível ainda.
                    <br>
                    <small>Os snapshots são criados automaticamente às 12:00.</small>
                    <br><br>
                    <button onclick="criarSnapshotManual()" class="btn-criar-snapshot">
                        📸 Criar Snapshot Agora
                    </button>
                    <button onclick="fecharHistorico()" class="btn-fechar-historico" style="margin-left: 10px;">
                        ✕ Fechar
                    </button>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="historico-datas">
                <h4>📅 Datas Disponíveis</h4>
                <div class="historico-datas-grid">
        `;
        
        datas.forEach(d => {
            const dataFormatada = formatarData(d.data_snapshot);
            const acuracidade = d.acuracidade_geral ? d.acuracidade_geral.toFixed(1) : '-';
            const cor = d.acuracidade_geral >= 95 ? '#48BB78' : d.acuracidade_geral >= 80 ? '#ED8936' : '#FC8181';
            
            html += `
                <div class="historico-data-item" onclick="carregarSnapshotParaTabela('${d.data_snapshot}')">
                    <div class="historico-data-dia">${dataFormatada}</div>
                    <div class="historico-data-hora">🕐 ${d.hora_snapshot ? formatarDataHora(d.hora_snapshot) : '12:00'}</div>
                    <div class="historico-data-info">
                        <span>📦 ${d.total_itens || 0} itens</span>
                        <span style="color: ${cor};">🎯 ${acuracidade}%</span>
                    </div>
                    <button class="btn-ver-snapshot-pequeno">Ver</button>
                </div>
            `;
        });
        
        html += `
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="criarSnapshotManual()" class="btn-criar-snapshot">
                        📸 Criar Snapshot Agora
                    </button>
                    <button onclick="fecharHistorico()" class="btn-fechar-historico">
                        ✕ Fechar
                    </button>
                </div>
            </div>
        `;
        
        conteudo.innerHTML = html;
        
        const ultimo = await carregarUltimoSnapshot();
        if (ultimo) {
            const previewHtml = `
                <div class="historico-card" style="margin-top: 15px;">
                    <div class="historico-header">
                        <h3>📊 Último Snapshot - ${formatarData(ultimo.data)}</h3>
                        <span class="historico-hora">🕐 ${ultimo.hora}</span>
                    </div>
                    <div class="historico-indicadores">
                        <div class="historico-item">
                            <span class="historico-label">📦 Total de Itens</span>
                            <span class="historico-valor">${ultimo.total_itens}</span>
                        </div>
                        <div class="historico-item">
                            <span class="historico-label">✅ Itens Contados</span>
                            <span class="historico-valor" style="color: #48BB78;">${ultimo.total_contados}</span>
                        </div>
                        <div class="historico-item">
                            <span class="historico-label">❌ Não Contados</span>
                            <span class="historico-valor" style="color: #FC8181;">${ultimo.total_nao_contados}</span>
                        </div>
                        <div class="historico-item">
                            <span class="historico-label">💰 Saldo Físico</span>
                            <span class="historico-valor" style="color: #4299E1;">${formatarMoeda(ultimo.total_saldo_fisico)}</span>
                        </div>
                        <div class="historico-item">
                            <span class="historico-label">📊 Saldo Sistêmico</span>
                            <span class="historico-valor" style="color: #718096;">${formatarMoeda(ultimo.total_saldo_sistemico)}</span>
                        </div>
                        <div class="historico-item">
                            <span class="historico-label">📈 Divergência</span>
                            <span class="historico-valor" style="color: ${ultimo.total_divergencia_valor > 0 ? '#48BB78' : '#FC8181'};">
                                ${formatarMoeda(ultimo.total_divergencia_valor)}
                            </span>
                        </div>
                        <div class="historico-item">
                            <span class="historico-label">🎯 Acuracidade</span>
                            <span class="historico-valor" style="color: ${ultimo.acuracidade_geral >= 95 ? '#48BB78' : ultimo.acuracidade_geral >= 80 ? '#ED8936' : '#FC8181'};">
                                ${ultimo.acuracidade_geral.toFixed(1)}%
                            </span>
                        </div>
                        <div class="historico-item">
                            <span class="historico-label">📈 Cobertura</span>
                            <span class="historico-valor" style="color: #9F7AEA;">
                                ${ultimo.cobertura_percentual.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            `;
            conteudo.innerHTML += previewHtml;
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        conteudo.innerHTML = `
            <div class="historico-erro">
                ❌ Erro ao carregar histórico: ${error.message}
            </div>
        `;
    }
}

async function carregarSnapshotParaTabela(data) {
    try {
        mostrarToast('⏳ Carregando snapshot...', 'info');
        
        const snapshot = await carregarSnapshotPorData(data);
        
        if (!snapshot) {
            mostrarToast('❌ Não foi possível carregar o snapshot', 'erro');
            return;
        }
        
        console.log('📊 Snapshot carregado:', snapshot);
        
        fecharHistorico();
        
        document.getElementById('total-saldo-fisico').textContent = formatarMoeda(snapshot.total_saldo_fisico || 0);
        document.getElementById('total-saldo-sistemico').textContent = formatarMoeda(snapshot.total_saldo_sistemico || 0);
        
        const valorEl = document.getElementById('total-divergencia-valor');
        if (snapshot.total_divergencia_valor > 0) {
            valorEl.style.color = '#48BB78';
            valorEl.textContent = `▲ ${formatarMoeda(snapshot.total_divergencia_valor)}`;
        } else if (snapshot.total_divergencia_valor < 0) {
            valorEl.style.color = '#FC8181';
            valorEl.textContent = `▼ ${formatarMoeda(snapshot.total_divergencia_valor)}`;
        } else {
            valorEl.style.color = '#2D3748';
            valorEl.textContent = formatarMoeda(0);
        }
        
        document.getElementById('total-itens-relatorio').textContent = snapshot.total_itens || 0;
        document.getElementById('total-itens-fisico').textContent = snapshot.total_itens_fisico || 0;
        document.getElementById('total-itens-divergentes').textContent = snapshot.total_itens_divergentes || 0;
        document.getElementById('percentual-cobertura').textContent = snapshot.cobertura_percentual ? snapshot.cobertura_percentual.toFixed(1) + '%' : '0%';
        
        document.getElementById('indicadores-relatorio').style.display = 'block';
        
        const badgeHistorico = document.createElement('div');
        badgeHistorico.id = 'badge-historico-ativo';
        badgeHistorico.style.cssText = `
            background: #ED8936;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 13px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 15px;
        `;
        badgeHistorico.innerHTML = `
            📅 Visualizando snapshot de ${formatarData(snapshot.data)} às ${snapshot.hora}
            <button onclick="restaurarRelatorioAtual()" style="background: white; color: #ED8936; border: none; padding: 2px 10px; border-radius: 4px; cursor: pointer; font-weight: 700;">
                Voltar
            </button>
        `;
        
        const badgeAntigo = document.getElementById('badge-historico-ativo');
        if (badgeAntigo) badgeAntigo.remove();
        
        const indicadores = document.getElementById('indicadores-relatorio');
        if (indicadores) {
            indicadores.parentNode.insertBefore(badgeHistorico, indicadores);
        }
        
        await aplicarSnapshotNaTabela(snapshot);
        
        mostrarToast('✅ Snapshot carregado com sucesso!', 'sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao carregar snapshot:', error);
        mostrarToast('❌ Erro ao carregar snapshot', 'erro');
    }
}

async function aplicarSnapshotNaTabela(snapshot) {
    if (snapshot.dados_detalhados && typeof snapshot.dados_detalhados === 'object' && Object.keys(snapshot.dados_detalhados).length > 0) {
        const dadosDetalhados = snapshot.dados_detalhados;
        
        const dadosFormatados = Object.values(dadosDetalhados).map(item => ({
            codigo: item.codigo || 'N/A',
            descricao: item.descricao || item.codigo || 'N/A',
            und: item.und || '-',
            tipo_material: item.tipo_material || 'desconhecido',
            quantidade_total: item.registros && item.registros.length > 0 ? (item.registros[0].qtd || 0) : 0,
            saldo_sistemico: item.saldo_sistemico || 0,
            valor_unitario: item.valor_unitario || 0,
            temRegistro: item.registros && item.registros.length > 0,
            ultimo_usuario: item.registros && item.registros.length > 0 ? (item.registros[0].nome || null) : null,
            ultima_data: item.registros && item.registros.length > 0 ? (item.registros[0].data || null) : null,
            contagem_diaria: ['concreto', 'trafo', 'bobina', 'especifico', 'medidor'].includes(item.tipo_material),
            contagem_semanal: item.tipo_material === 'miscelanea',
            contagem_rotativa: ['laco', 'alca', 'parafuso', 'cabo', 'miscelanea1', 'miscelanea2'].includes(item.tipo_material),
            da_lista_fixa: true
        }));
        
        const dadosFiltradosDeposito = dadosFormatados.filter(item => {
            if (depositoAtual === '1050') return true;
            if (depositoAtual === '1855') {
                const itensSemanal = DEPOSITOS_CONFIG['1855']?.itens_semanal || [];
                return item.tipo_material === 'trafo' || itensSemanal.includes(item.codigo);
            }
            if (depositoAtual === '1854' || depositoAtual === '1853') {
                const itensSemanal = DEPOSITOS_CONFIG[depositoAtual]?.itens_semanal || [];
                return itensSemanal.includes(item.codigo);
            }
            return true;
        });
        
        dadosProcessados = dadosFiltradosDeposito;
        snapshotCarregado = true;
        
        const abaAtiva = document.querySelector('.tab-contagem-btn.active');
        if (abaAtiva) {
            const tipo = abaAtiva.dataset.tipo;
            renderizarRelatorioPorContagem(dadosProcessados, tipo);
        }
    } else {
        await carregarRelatorios();
    }
}

function restaurarRelatorioAtual() {
    const badge = document.getElementById('badge-historico-ativo');
    if (badge) badge.remove();
    
    snapshotCarregado = false;
    carregarRelatorios();
    mostrarToast('✅ Relatório atual restaurado', 'info');
}

// ============================================
// INICIALIZAR
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    const sessao = sessionStorage.getItem('sessaoSICGM');
    if (!sessao) {
        window.location.href = '../index.html';
        return;
    }
    
    try {
        const dadosSessao = JSON.parse(sessao);
        perfilUsuario = dadosSessao.perfil || 'OPERACIONAL';
        console.log(`👤 Perfil do usuário: ${perfilUsuario}`);
        
        const perfilBadge = document.createElement('span');
        perfilBadge.style.cssText = `
            display: inline-block;
            background: ${perfilUsuario === 'GESTAO' ? '#48BB78' : perfilUsuario === 'OPERACIONAL' ? '#4299E1' : '#ED8936'};
            color: white;
            padding: 2px 12px;
            border-radius: 12px;
            font-size: 0.6em;
            font-weight: 600;
            margin-left: 10px;
            vertical-align: middle;
        `;
        perfilBadge.textContent = perfilUsuario;
        
        const title = document.querySelector('.header-container .title');
        if (title) {
            title.appendChild(perfilBadge);
        }
        
        const table = document.querySelector('.relatorio-tabela');
        if (table) {
            if (perfilUsuario === 'GESTAO') {
                table.style.minWidth = '1200px';
            } else {
                table.style.minWidth = '800px';
            }
        }
        
    } catch (e) {
        console.error('❌ Erro ao ler sessão:', e);
        perfilUsuario = 'OPERACIONAL';
    }
    
    console.log('🚀 Inicializando página de relatórios...');
    
    window.addEventListener('scroll', controlarBotoesNavegacao);
    window.addEventListener('load', function() {
        setTimeout(controlarBotoesNavegacao, 500);
    });
    window.addEventListener('resize', controlarBotoesNavegacao);
    
    await carregarPosicaoEstoque();
    carregarRelatorios();
});

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================

window.carregarRelatorios = carregarRelatorios;
window.limparFiltros = limparFiltros;
window.exportarExcel = exportarExcel;
window.exportarPDF = exportarPDF;
window.redirecionarParaHome = redirecionarParaHome;
window.irParaTopo = irParaTopo;
window.irParaFim = irParaFim;
window.controlarBotoesNavegacao = controlarBotoesNavegacao;
window.ativarAbaContagem = ativarAbaContagem;
window.ativarDeposito = ativarDeposito;
window.abrirHistorico = abrirHistorico;
window.fecharHistorico = fecharHistorico;
window.carregarHistorico = carregarHistorico;
window.carregarSnapshotParaTabela = carregarSnapshotParaTabela;
window.restaurarRelatorioAtual = restaurarRelatorioAtual;
window.criarSnapshotManual = criarSnapshotManual;