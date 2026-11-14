// ============================================
// SICGM - HOME UNIFICADA v9
// Perfis + Departamentos
// ============================================

let perfilUsuario = 'VISUALIZACAO';
let perfisUsuario = [];
let departamentosUsuario = [];
let dadosDepartamentos = {};
let usuarioLogado = null;

const abasAbertas = [];
let abaAtiva = null;

// ============================================
// 1. DADOS POR DEPARTAMENTO (fixos)
// ============================================
const DEPARTAMENTOS_BASE = {
    'GESTAO': {
        nome: 'GESTÃO', titulo: 'Gestão Estratégica do Setor',
        descricao: 'Acompanhamento de indicadores, planejamento e estrutura organizacional.',
        cor: '#3d8bfd', restrito: true,
        funcoes: [
            { id: 'estrutura-setor', nome: 'Estrutura do Setor', icone: '🏗️', link: 'gestao/estrutura-setor.html', status: 'disponivel', modulo: 'admin' },
            { id: 'indicadores-gestao', nome: 'Indicadores', icone: '📊', status: 'disponivel', modulo: 'relatorios', temDropdown: true, dropdownItems: [
                { nome: 'Pendência de Requisição', link: 'gestao/indicadores.html', modulo: 'relatorios' }
            ]},
            { id: 'planejamento', nome: 'Planejamento', icone: '📅', link: 'gestao/planejamento.html', status: 'disponivel', modulo: 'admin' },
            { id: 'admin', nome: 'Administração', icone: '👑', link: 'gestao/admin.html', status: 'disponivel', modulo: 'admin' }
        ]
    },
    'DCMD': {
        nome: 'DCMD', titulo: 'Construção e Manutenção da Distribuição',
        descricao: 'Contagens, SITA, Painel de Controles e relatórios.',
        cor: '#3d8bfd', restrito: false,
        funcoes: [
            { id: 'contagem-diaria-dcmd', nome: 'Contagem Diária', icone: '🧮', link: 'contagem-diaria/index.html', status: 'disponivel', modulo: 'contagem' },
            { id: 'sita-dcmd', nome: 'SITA', icone: '📋', status: 'disponivel', modulo: 'sita', temDropdown: true, dropdownItems: [
                { nome: 'Programação', link: 'sita/index.html', modulo: 'programacao' },
                { nome: 'Esteira', link: 'sita/esteira.html', modulo: 'sita' },
                { nome: 'Despacho', link: 'sita/despacho.html', modulo: 'despacho' },
                { nome: 'Separação', link: 'sita/separacao.html', modulo: 'sita' },
                { nome: 'Pendências', link: 'sita/pendencias.html', modulo: 'pendencias' }
            ]},
            { id: 'indicadores-dcmd', nome: 'Indicadores', icone: '📈', link: 'power-bi/index.html', status: 'disponivel', modulo: 'relatorios' },
            { id: 'painel-controles', nome: 'Painel de Controles', icone: '🖥️', link: 'controles/index.html', status: 'disponivel', modulo: 'contagem' },
            { id: 'dashboards-dcmd', nome: 'Dashboards', icone: '🎛️', status: 'disponivel', modulo: 'relatorios', temDropdown: true, dropdownItems: [] },
            { id: 'relatorios-dcmd', nome: 'Relatórios', icone: '📄', status: 'disponivel', modulo: 'relatorios', temDropdown: true, dropdownItems: [
                { nome: 'Relatório de Contagem', link: 'relatorios/relatorio-contagem.html', modulo: 'relatorios' },
                { nome: 'Busca Trafo', link: 'relatorios/busca-trafo.html', modulo: 'relatorios' }
            ]}
        ]
    },
    'DMPC': {
        nome: 'DMPC', titulo: 'Materiais Próprios Control',
        descricao: 'Contagem semanal, S.A. emergencial e relatórios.',
        cor: '#28a745', restrito: false,
        funcoes: [
            { id: 'contagem-dmpc', nome: 'Contagem DMPC', icone: '📦', link: 'contagem-diaria/contagem-dmpc.html', status: 'disponivel', modulo: 'contagem' },
            { id: 'sa-emergencial-dmpc', nome: 'S.A. Emergencial', icone: '🚨', link: 'sa-emergencial/index.html', status: 'disponivel', modulo: 'contagem' },
            { id: 'relatorios-dmpc', nome: 'Relatórios', icone: '📈', link: '#', status: 'desenvolvimento', modulo: 'relatorios' }
        ]
    },
    'DECP': {
        nome: 'DECP', titulo: 'Combate a Perdas',
        descricao: 'Contagens, kits e medidores.',
        cor: '#ff9800', restrito: false,
        funcoes: [
            { id: 'contagem-diaria-decp', nome: 'Contagem Diária', icone: '📊', link: '#', status: 'desenvolvimento', modulo: 'contagem' },
            { id: 'solicitacao-kit-decp', nome: 'Solicitação de Kit', icone: '📦', link: '#', status: 'desenvolvimento', modulo: 'contagem' },
            { id: 'medidores-reforma-decp', nome: 'Medidores - Reforma', icone: '🔧', link: '#', status: 'desenvolvimento', modulo: 'contagem' },
            { id: 'relatorios-decp', nome: 'Relatórios', icone: '📈', link: '#', status: 'desenvolvimento', modulo: 'relatorios' }
        ]
    },
    'DEOP': {
        nome: 'DEOP', titulo: 'Operacional',
        descricao: 'Contagens, kits e medidores.',
        cor: '#6f42c1', restrito: false,
        funcoes: [
            { id: 'contagem-diaria-deop', nome: 'Contagem Diária', icone: '📊', link: '#', status: 'desenvolvimento', modulo: 'contagem' },
            { id: 'solicitacao-kit-deop', nome: 'Solicitação de Kit', icone: '📦', link: '#', status: 'desenvolvimento', modulo: 'contagem' },
            { id: 'medidores-reforma-deop', nome: 'Medidores - Reforma', icone: '🔧', link: '#', status: 'desenvolvimento', modulo: 'contagem' },
            { id: 'relatorios-deop', nome: 'Relatórios', icone: '📈', link: '#', status: 'desenvolvimento', modulo: 'relatorios' }
        ]
    }
};

const DASHBOARDS_DISPONIVEIS = [
    { nome: 'Pendência de Requisição', link: 'dashboards/pendencia-requisicao.html' },
    { nome: 'Aditivos Sistêmicos', link: 'dashboards/aditivos-sistemicos.html' },
    { nome: 'Aditivos Físicos', link: 'dashboards/aditivos-fisicos.html' },
    { nome: 'Pendência de Devolução', link: 'dashboards/pendencia-devolucao.html' },
    { nome: 'Farol de Obras', link: 'dashboards/farol-obras.html' }
];

const DEPARTAMENTOS_PROCESSOS = [
    { id: 'DCMD', nome: 'DCMD - Construção e Manutenção' },
    { id: 'DMPC', nome: 'DMPC - Materiais Próprios Control' },
    { id: 'DECP', nome: 'DECP - Combate a Perdas' },
    { id: 'DEOP', nome: 'DEOP - Operacional' }
];

// Preenche dropdowns
Object.values(DEPARTAMENTOS_BASE).forEach(d => {
    const dash = d.funcoes.find(f => f.id.includes('dashboard'));
    if (dash) dash.dropdownItems = DASHBOARDS_DISPONIVEIS.map(x => ({ ...x, badge: 'Ativo' }));
});

// ============================================
// 2. INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Home Unificada v9');

    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error('❌ Firebase não carregado');
        return;
    }

    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) { window.location.href = 'login.html'; return; }
        usuarioLogado = user;
        buscarDadosUsuario(user);
    });

    inicializarSinoHome();
    window.addEventListener('message', tratarMensagemIframe);
});

function tratarMensagemIframe(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'SICGM_ABRIR_ABA') return;
    const { link, titulo, tabId } = data;
    if (!link || !titulo) return;
    let linkNormalizado = String(link);
    if (linkNormalizado.startsWith('http')) {
        try {
            const url = new URL(linkNormalizado);
            linkNormalizado = url.pathname.replace(/^\//, '') + url.search + url.hash;
        } catch (_) {}
    }
    const basePath = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.BASE_PATH)
        ? String(CONFIG.BASE_PATH).replace(/\/$/, '') : '';
    if (basePath && linkNormalizado.startsWith(basePath + '/')) {
        linkNormalizado = linkNormalizado.substring(basePath.length + 1);
    }
    linkNormalizado = linkNormalizado.replace(/^\/+/, '');
    abrirAba(linkNormalizado, titulo, tabId || `iframe-${Date.now()}`);
}

async function buscarDadosUsuario(user) {
    try {
        // Tenta pelo authService (sessionStorage)
        let dados = null;
        if (typeof authService !== 'undefined' && authService.isLoggedIn && authService.isLoggedIn()) {
            dados = authService.getUserData();
        }

        // Fallback: busca no KV
        if (!dados || !dados.perfis || dados.perfis.length === 0) {
            const r = await fetch(`${authService.WORKER_URL}/usuarios/me`, {
                headers: { 'X-User-Email': user.email }
            });
            if (r.ok) dados = await r.json();
        }

        // Último fallback: localStorage
        if (!dados) {
            dados = {
                email: user.email,
                nome: user.displayName || localStorage.getItem('nomeUsuario') || user.email.split('@')[0],
                matricula: localStorage.getItem('matriculaUsuario') || '---',
                perfil: localStorage.getItem('perfilUsuario') || 'VISUALIZACAO',
                perfis: JSON.parse(localStorage.getItem('perfisUsuario') || '[]'),
                departamentos: JSON.parse(localStorage.getItem('departamentosUsuario') || '[]')
            };
        }

        configurarInterface(dados);
    } catch (err) {
        console.error('❌ buscarDadosUsuario:', err);
        configurarInterface({
            email: user.email,
            nome: localStorage.getItem('nomeUsuario') || 'Usuário',
            matricula: localStorage.getItem('matriculaUsuario') || '---',
            perfil: localStorage.getItem('perfilUsuario') || 'VISUALIZACAO',
            perfis: JSON.parse(localStorage.getItem('perfisUsuario') || '[]'),
            departamentos: JSON.parse(localStorage.getItem('departamentosUsuario') || '[]')
        });
    }
}

function configurarInterface(dados) {
    perfilUsuario = (dados.perfil || 'VISUALIZACAO').toUpperCase();
    perfisUsuario = Array.isArray(dados.perfis) && dados.perfis.length > 0
        ? dados.perfis
        : [{ perfil: perfilUsuario, departamentos: dados.departamentos || [] }];
    departamentosUsuario = dados.departamentos || [];

    console.log('👤 Perfil principal:', perfilUsuario, '| Perfis:', perfisUsuario);

    document.getElementById('headerNomeUser').textContent = dados.nome || 'Usuário';
    document.getElementById('headerMatUser').textContent = `Matrícula: ${dados.matricula || '---'}`;

    // Departamentos visíveis
    const ehGestao = perfisUsuario.some(p => p.perfil === 'GESTAO');
    const setDeptos = new Set();
    perfisUsuario.forEach(p => {
        (p.departamentos || []).forEach(d => {
            if (ehGestao || d !== 'GESTAO') setDeptos.add(d);
        });
    });
    if (ehGestao) setDeptos.add('GESTAO');

    dadosDepartamentos = {};
    Array.from(setDeptos).forEach(id => {
        if (DEPARTAMENTOS_BASE[id]) dadosDepartamentos[id] = DEPARTAMENTOS_BASE[id];
    });

    // Badge
    const badgePerfil = document.getElementById('headerPerfilUser');
    const deptosArr = Array.from(setDeptos);
    const deptosLabel = deptosArr.length > 2
        ? `${deptosArr[0]} +${deptosArr.length - 1}`
        : deptosArr.join(' · ') || '—';
    badgePerfil.textContent = `${perfilUsuario} · ${deptosLabel}`;
    if (window.PERFIS_SICGM?.[perfilUsuario]?.cor) {
        badgePerfil.style.background = window.PERFIS_SICGM[perfilUsuario].cor;
    } else if (perfilUsuario === 'OPERACIONAL') badgePerfil.style.background = '#28a745';
    else if (perfilUsuario === 'VISUALIZACAO') badgePerfil.style.background = '#3d8bfd';

    // Admin button
    const adminBtn = document.getElementById('headerAdminBtn');
    if (adminBtn) adminBtn.style.display = ehGestao ? 'inline-flex' : 'none';

    renderizarSidebar();
    renderizarAbas();
}

// ============================================
// 3. SIDEBAR
// ============================================
function renderizarSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = '';

    const titulo = document.createElement('div');
    titulo.className = 'sidebar-section-title';
    titulo.textContent = 'Departamentos';
    sidebar.appendChild(titulo);

    const ordem = ['GESTAO', 'DCMD', 'DMPC', 'DECP', 'DEOP'];
    ordem.forEach(deptoId => {
        const depto = dadosDepartamentos[deptoId];
        if (!depto) return;

        const item = document.createElement('div');
        item.className = 'depto-item';
        item.dataset.depto = deptoId;
        item.innerHTML = `
            <div class="depto-item-left">
                <i class="fa-solid fa-building"></i>
                <span class="depto-name-text">${depto.nome}</span>
            </div>
            <i class="fa-solid fa-chevron-right chevron"></i>
        `;
        item.onclick = () => toggleDepartamento(deptoId);
        sidebar.appendChild(item);

        const submenu = document.createElement('div');
        submenu.className = 'depto-submenu';
        submenu.id = `submenu-${deptoId}`;

        depto.funcoes.forEach(func => {
            // Filtro por módulo (se authService disponível)
            if (func.modulo && typeof authService !== 'undefined' && authService.podeAcessar && !authService.podeAcessar(func.modulo)) return;

            if (func.temDropdown) {
                const sub = document.createElement('div');
                sub.className = 'sub-item has-children';
                sub.id = `sub-${deptoId}-${func.id}`;
                sub.innerHTML = `
                    <div class="sub-left">
                        <i class="fa-solid fa-angle-right"></i>
                        <span>${func.nome}</span>
                    </div>
                    <i class="fa-solid fa-chevron-right sub-chevron"></i>
                `;
                sub.onclick = (e) => { e.stopPropagation(); toggleSubSubmenu(deptoId, func); };
                submenu.appendChild(sub);

                const subsub = document.createElement('div');
                subsub.className = 'sub-submenu';
                subsub.id = `subsub-${deptoId}-${func.id}`;

                (func.dropdownItems || []).forEach(itemOpt => {
                    if (itemOpt.modulo && typeof authService !== 'undefined' && authService.podeAcessar && !authService.podeAcessar(itemOpt.modulo)) return;
                    const ssItem = document.createElement('div');
                    ssItem.className = 'sub-sub-item';
                    ssItem.innerHTML = `<i class="fa-solid fa-circle"></i><span>${itemOpt.nome}</span>`;
                    ssItem.onclick = (e) => {
                        e.stopPropagation();
                        if (itemOpt.disabled) { alert('Em breve!'); return; }
                        abrirAba(itemOpt.link, itemOpt.nome, `${deptoId}-${func.id}-${itemOpt.nome}`);
                    };
                    subsub.appendChild(ssItem);
                });
                submenu.appendChild(subsub);
            } else {
                const sub = document.createElement('div');
                sub.className = 'sub-item';
                sub.innerHTML = `<i class="fa-solid fa-angle-right"></i><span>${func.nome}</span>`;
                sub.onclick = (e) => {
                    e.stopPropagation();
                    if (func.status !== 'disponivel') { alert('⚙️ Funcionalidade em desenvolvimento.'); return; }
                    abrirAba(func.link, func.nome, `${deptoId}-${func.id}`);
                };
                submenu.appendChild(sub);
            }
        });
        sidebar.appendChild(submenu);
    });

    const chamados = document.createElement('div');
    chamados.className = 'sidebar-fixed-item';
    chamados.innerHTML = `<i class="fa-solid fa-headset"></i> <span>Chamados</span>`;
    chamados.onclick = () => abrirAba('chamados/index.html', 'Chamados', 'chamados-fixo');
    sidebar.appendChild(chamados);

    // Ajuda
    const ajudaWrap = document.createElement('div');
    ajudaWrap.id = 'ajuda-wrap';
    const ajuda = document.createElement('div');
    ajuda.className = 'sidebar-fixed-item has-children';
    ajuda.id = 'ajuda-item';
    ajuda.innerHTML = `
        <div class="sub-left" style="display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-circle-question"></i>
            <span>Ajuda</span>
        </div>
        <i class="fa-solid fa-chevron-right sub-chevron"></i>
    `;
    ajuda.onclick = () => toggleAjudaSubmenu();
    ajudaWrap.appendChild(ajuda);

    const ajudaSub = document.createElement('div');
    ajudaSub.className = 'depto-submenu';
    ajudaSub.id = 'ajuda-submenu';
    DEPARTAMENTOS_PROCESSOS.forEach(dep => {
        const sub = document.createElement('div');
        sub.className = 'sub-item';
        sub.innerHTML = `<i class="fa-solid fa-angle-right"></i><span>${dep.nome}</span>`;
        sub.onclick = (e) => {
            e.stopPropagation();
            abrirAba(`processos/index.html?depto=${dep.id}`, `Ajuda ${dep.id}`, `ajuda-${dep.id}`);
        };
        ajudaSub.appendChild(sub);
    });
    ajudaWrap.appendChild(ajudaSub);
    sidebar.appendChild(ajudaWrap);
}

function toggleDepartamento(deptoId) {
    const item = document.querySelector(`.depto-item[data-depto="${deptoId}"]`);
    const submenu = document.getElementById(`submenu-${deptoId}`);
    if (!item || !submenu) return;
    const isExpanded = item.classList.contains('expanded');

    document.querySelectorAll('.depto-item').forEach(el => el.classList.remove('expanded', 'active'));
    document.querySelectorAll('.depto-submenu').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.sub-item').forEach(el => el.classList.remove('expanded'));
    document.querySelectorAll('.sub-submenu').forEach(el => el.classList.remove('open'));

    const ajudaSub = document.getElementById('ajuda-submenu');
    if (ajudaSub) ajudaSub.classList.remove('open');
    const ajudaItem = document.getElementById('ajuda-item');
    if (ajudaItem) ajudaItem.classList.remove('expanded');

    if (!isExpanded) {
        item.classList.add('expanded', 'active');
        submenu.classList.add('open');
    }
}

function toggleSubSubmenu(deptoId, func) {
    const subItem = document.getElementById(`sub-${deptoId}-${func.id}`);
    const subSub = document.getElementById(`subsub-${deptoId}-${func.id}`);
    if (!subItem || !subSub) return;
    const isExpanded = subItem.classList.contains('expanded');
    document.querySelectorAll('.sub-item').forEach(el => el.classList.remove('expanded'));
    document.querySelectorAll('.sub-submenu').forEach(el => el.classList.remove('open'));
    if (!isExpanded) {
        subItem.classList.add('expanded');
        subSub.classList.add('open');
    }
}

function toggleAjudaSubmenu() {
    const sub = document.getElementById('ajuda-submenu');
    const item = document.getElementById('ajuda-item');
    if (!sub || !item) return;
    const isOpen = sub.classList.contains('open');
    document.querySelectorAll('.depto-item').forEach(el => el.classList.remove('expanded'));
    document.querySelectorAll('.depto-submenu').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.sub-item').forEach(el => el.classList.remove('expanded'));
    document.querySelectorAll('.sub-submenu').forEach(el => el.classList.remove('open'));
    if (!isOpen) { sub.classList.add('open'); item.classList.add('expanded'); }
}

// ============================================
// 4. ABAS
// ============================================
function abrirAba(link, titulo, tabId) {
    let linkFinal = String(link || '').replace(/^\/+/, '');
    const existente = abasAbertas.find(a => a.link === linkFinal);
    if (existente) { ativarAba(existente.id); return; }
    abasAbertas.push({ id: tabId, titulo, link: linkFinal });
    abaAtiva = tabId;
    renderizarAbas();
    mostrarIframe(linkFinal);
}

function renderizarAbas() {
    const tabsBar = document.getElementById('tabsBar');
    tabsBar.innerHTML = '';
    if (abasAbertas.length === 0) { tabsBar.classList.add('empty'); return; }
    tabsBar.classList.remove('empty');
    abasAbertas.forEach(aba => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (abaAtiva === aba.id ? ' active' : '');
        btn.dataset.tab = aba.id;
        btn.title = aba.titulo;
        btn.innerHTML = `
            <span class="tab-title">${aba.titulo}</span>
            <span class="tab-close" onclick="event.stopPropagation(); fecharAba('${aba.id}')">×</span>
        `;
        btn.onclick = () => ativarAba(aba.id);
        tabsBar.appendChild(btn);
    });
}

function ativarAba(tabId) {
    const aba = abasAbertas.find(a => a.id === tabId);
    if (!aba) return;
    abaAtiva = tabId;
    renderizarAbas();
    mostrarIframe(aba.link);
}

function fecharAba(tabId) {
    const idx = abasAbertas.findIndex(a => a.id === tabId);
    if (idx === -1) return;
    abasAbertas.splice(idx, 1);
    if (abaAtiva === tabId) {
        if (abasAbertas.length > 0) {
            abaAtiva = abasAbertas[Math.max(0, idx - 1)].id;
            renderizarAbas();
            mostrarIframe(abasAbertas.find(a => a.id === abaAtiva).link);
        } else {
            abaAtiva = null;
            renderizarAbas();
            mostrarEstadoVazio();
        }
    } else {
        renderizarAbas();
    }
}

function mostrarIframe(link) {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('iframe-container').classList.remove('hidden');
    const iframe = document.getElementById('iframe-content');
    if (iframe.getAttribute('src') !== link) iframe.setAttribute('src', link);
}

function mostrarEstadoVazio() {
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('iframe-container').classList.add('hidden');
    document.getElementById('iframe-content').setAttribute('src', '');
}

// ============================================
// 5. SINO DE NOTIFICAÇÃO (intacto)
// ============================================
const SINO_CHAMADOS_URL = 'https://chamados.alefe-gomes-72f.workers.dev';
let _sinoInterval = null;
let _sinoDropdownAberto = false;
let _sinoCache = [];

function inicializarSinoHome() {
    const btn = document.getElementById('sinoBtn');
    const marcarTodas = document.getElementById('sinoMarcarTodas');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dd = document.getElementById('sinoDropdown');
        if (!dd) return;
        if (dd.style.display === 'block') { dd.style.display = 'none'; _sinoDropdownAberto = false; }
        else { dd.style.display = 'block'; _sinoDropdownAberto = true; carregarNotifSino(true); }
    });
    if (marcarTodas) marcarTodas.addEventListener('click', marcarTodasNotifSino);
    document.addEventListener('click', (e) => {
        const el = document.getElementById('sinoNotificacoes');
        if (el && !el.contains(e.target)) {
            const dd = document.getElementById('sinoDropdown');
            if (dd) dd.style.display = 'none';
            _sinoDropdownAberto = false;
        }
    });
    contarNotifSino();
    _sinoInterval = setInterval(() => {
        contarNotifSino();
        if (_sinoDropdownAberto) carregarNotifSino(true);
    }, 30000);
}

function getHeadersSino() {
    return {
        'Content-Type': 'application/json',
        'X-User-Matricula': localStorage.getItem('matriculaUsuario') || '',
        'X-User-Perfil': (localStorage.getItem('perfilUsuario') || '').toUpperCase()
    };
}

async function contarNotifSino() {
    const mat = localStorage.getItem('matriculaUsuario');
    if (!mat) return;
    try {
        const r = await fetch(`${SINO_CHAMADOS_URL}/api/notificacoes/contar`, { headers: getHeadersSino() });
        if (!r.ok) return;
        const data = await r.json();
        atualizarBadgeSino(data.nao_lidas || 0);
    } catch (_) {}
}

async function carregarNotifSino(forcar = false) {
    const mat = localStorage.getItem('matriculaUsuario');
    if (!mat) return;
    if (!forcar && _sinoCache.length > 0) { renderizarListaSino(_sinoCache); return; }
    try {
        const r = await fetch(`${SINO_CHAMADOS_URL}/api/notificacoes?limit=30`, { headers: getHeadersSino() });
        if (!r.ok) throw new Error('Erro');
        const data = await r.json();
        _sinoCache = data.data || [];
        renderizarListaSino(_sinoCache);
    } catch (_) {
        const lista = document.getElementById('sinoLista');
        if (lista) lista.innerHTML = '<div class="sino-error">❌ Erro ao carregar</div>';
    }
}

async function marcarUmaLidaSino(id, e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    try {
        await fetch(`${SINO_CHAMADOS_URL}/api/notificacoes/${id}/ler`, { method: 'PUT', headers: getHeadersSino() });
        const n = _sinoCache.find(x => x.id === id);
        if (n) n.lida = 1;
        renderizarListaSino(_sinoCache);
        contarNotifSino();
    } catch (_) {}
}

async function marcarTodasNotifSino(e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    try {
        await fetch(`${SINO_CHAMADOS_URL}/api/notificacoes/ler-todas`, { method: 'PUT', headers: getHeadersSino() });
        _sinoCache.forEach(n => n.lida = 1);
        renderizarListaSino(_sinoCache);
        contarNotifSino();
    } catch (_) {}
}

async function clicarNotifSino(id, protocolo, e) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    await marcarUmaLidaSino(id);
    if (protocolo) abrirAba(`chamados/index.html?busca=${encodeURIComponent(protocolo)}`, 'Chamados', 'chamados-fixo');
}

function atualizarBadgeSino(naoLidas) {
    const badge = document.getElementById('sinoBadge');
    if (!badge) return;
    if (naoLidas > 0) { badge.textContent = naoLidas > 99 ? '99+' : naoLidas; badge.style.display = 'flex'; }
    else badge.style.display = 'none';
}

function formatarTempoRelativoSino(dataStr) {
    if (!dataStr) return '';
    try {
        const data = new Date(dataStr.includes(' ') && !dataStr.includes('T')
            ? dataStr.replace(' ', 'T') + 'Z' : dataStr);
        const diff = (Date.now() - data.getTime()) / 1000;
        if (diff < 60) return 'agora';
        if (diff < 3600) return `${Math.floor(diff / 60)}min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
        return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch { return ''; }
}

function iconeNotifSino(tipo) {
    return { 'CHAMADO_ABERTO': '🎫', 'CHAMADO_RESPONDIDO': '💬', 'CHAMADO_FECHADO': '✅', 'INFO': 'ℹ️' }[tipo] || '🔔';
}

function escapeHtmlSino(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function renderizarListaSino(lista) {
    const container = document.getElementById('sinoLista');
    if (!container) return;
    const info = document.getElementById('sinoInfo');
    const naoLidas = lista.filter(n => !n.lida).length;
    if (info) info.textContent = `${lista.length} notif. • ${naoLidas} não lida${naoLidas !== 1 ? 's' : ''}`;
    if (!lista || lista.length === 0) {
        container.innerHTML = `<div class="sino-empty"><div style="font-size:48px;margin-bottom:10px;">🔔</div><p>Nenhuma notificação</p><small>Tudo em dia!</small></div>`;
        return;
    }
    container.innerHTML = lista.map(n => `
        <div class="sino-item ${n.lida ? 'lida' : 'nao-lida'}"
             onclick="window._clicarNotifSino(${n.id}, '${(n.chamado_protocolo || '').replace(/'/g, "\\'")}', event)"
             data-id="${n.id}">
            <div class="sino-item-icone">${iconeNotifSino(n.tipo)}</div>
            <div class="sino-item-conteudo">
                <div class="sino-item-titulo">${escapeHtmlSino(n.titulo || '(sem título)')}</div>
                <div class="sino-item-msg">${escapeHtmlSino(n.mensagem || '')}</div>
                <div class="sino-item-tempo">${formatarTempoRelativoSino(n.criado_em)}</div>
            </div>
            ${n.lida ? '' : `<button class="sino-item-btn-lida" onclick="window._marcarUmaLidaSino(${n.id}, event)" title="Marcar como lida">✓</button>`}
        </div>
    `).join('');
}
window._clicarNotifSino = clicarNotifSino;
window._marcarUmaLidaSino = marcarUmaLidaSino;

// ============================================
// 6. LOGOUT
// ============================================
async function sair() {
    if (!confirm('Deseja sair do sistema?')) return;
    try {
        if (typeof authService !== 'undefined') await authService.logout();
        else if (typeof firebase !== 'undefined' && firebase.auth) await firebase.auth().signOut();
    } catch (_) {}
    localStorage.clear();
    window.location.href = 'login.html';
}