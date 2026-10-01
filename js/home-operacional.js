// ============================================
// HOME OPERACIONAL - CONFIGURAÇÃO E FUNÇÕES
// ============================================

// ============================================
// CONFIGURAÇÃO DOS DEPARTAMENTOS E FUNÇÕES
// ============================================
const DEPARTAMENTOS_OPERACIONAL = {
    'DCMD': {
        nome: 'DCMD',
        titulo: 'Departamento de Construção e Manutenção da Distribuição',
        descricao: 'Acesse as funções disponíveis para o perfil Operacional no DCMD.',
        funcoes: [
            {
                id: 'processos-dcmd',
                nome: 'Processos',
                icone: '📚',
                link: 'processos/index.html?depto=DCMD',
                status: 'disponivel',
                descricao: 'Passo a passo detalhado dos processos do DCMD'
            },
            {
                id: 'contagem-diaria-dcmd',
                nome: 'Contagem Diária',
                icone: '📊',
                link: 'contagem-diaria/index.html',
                status: 'disponivel',
                descricao: 'Registre e visualize as contagens diárias'
            },
            {
                id: 'mgm-list-dcmd',
                nome: 'Lista MGM',
                icone: '📋',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'painel-controles',
                nome: 'Painel de Controles',
                icone: '🖥️',
                link: 'controles/index.html',
                status: 'disponivel',
                descricao: 'Gerencie pendências de baixa, aditivos, farol de obras e movimentações'
            },
            {
                id: 'dashboards-operacional',
                nome: 'Dashboards',
                icone: '📊',
                link: 'dashboards/index.html',
                status: 'disponivel',
                descricao: 'Acesse os dashboards do sistema'
            },
            {
                id: 'relatorios-dcmd',
                nome: 'Relatórios',
                icone: '📈',
                link: 'relatorios/relatorio-contagem.html',
                status: 'disponivel',
                descricao: 'Relatórios de contagem e busca trafo',
                temDropdown: true,
                dropdownItems: [
                    { nome: 'Relatório de Contagem', link: 'relatorios/relatorio-contagem.html', badge: 'Ativo' },
                    { nome: 'Busca Trafo', link: 'relatorios/busca-trafo.html', badge: 'Novo' },
                    { nome: 'Histórico de Movimentações', link: '#', badge: 'Em breve', disabled: true }
                ]
            }
        ]
    },
    'DMPC': {
        nome: 'DMPC',
        titulo: 'Departamento de Materiais Próprios Control',
        descricao: 'Acesse as funções disponíveis para o perfil Operacional no DMPC.',
        funcoes: [
            {
                id: 'processos-dmpc',
                nome: 'Processos',
                icone: '📚',
                link: 'processos/index.html?depto=DMPC',
                status: 'disponivel',
                descricao: 'Passo a passo detalhado dos processos do DMPC'
            },
            {
                id: 'contagem-diaria-dmpc',
                nome: 'Contagem Diária',
                icone: '📊',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'sa-emergencial-dmpc',
                nome: 'S.A. Emergencial',
                icone: '🚨',
                link: 'sa-emergencial/index.html',
                status: 'disponivel',
                descricao: 'Solicitação de Atendimento Emergencial - Atenda os formulários'
            },
            {
                id: 'relatorios-dmpc',
                nome: 'Relatórios',
                icone: '📈',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            }
        ]
    },
    'DECP': {
        nome: 'DECP',
        titulo: 'Departamento de Combate a Perdas',
        descricao: 'Acesse as funções disponíveis para o perfil Operacional no DECP.',
        funcoes: [
            {
                id: 'processos-decp',
                nome: 'Processos',
                icone: '📚',
                link: 'processos/index.html?depto=DECP',
                status: 'disponivel',
                descricao: 'Passo a passo detalhado dos processos do DECP'
            },
            {
                id: 'contagem-diaria-decp',
                nome: 'Contagem Diária',
                icone: '📊',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'solicitacao-kit-decp',
                nome: 'Solicitação de Kit',
                icone: '📦',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'medidores-reforma-decp',
                nome: 'Medidores - Reforma',
                icone: '🔧',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'relatorios-decp',
                nome: 'Relatórios',
                icone: '📈',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            }
        ]
    },
    'DEOP': {
        nome: 'DEOP',
        titulo: 'Departamento Operacional',
        descricao: 'Acesse as funções disponíveis para o perfil Operacional no DEOP.',
        funcoes: [
            {
                id: 'processos-deop',
                nome: 'Processos',
                icone: '📚',
                link: 'processos/index.html?depto=DEOP',
                status: 'disponivel',
                descricao: 'Passo a passo detalhado dos processos do DEOP'
            },
            {
                id: 'contagem-diaria-deop',
                nome: 'Contagem Diária',
                icone: '📊',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'solicitacao-kit-deop',
                nome: 'Solicitação de Kit',
                icone: '📦',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'medidores-reforma-deop',
                nome: 'Medidores - Reforma',
                icone: '🔧',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            },
            {
                id: 'relatorios-deop',
                nome: 'Relatórios',
                icone: '📈',
                link: '#',
                status: 'restrito',
                descricao: 'Funcionalidade restrita para perfil Operacional',
                isRestricted: true
            }
        ]
    }
};

// ============================================
// FUNÇÕES DE SELEÇÃO E RENDERIZAÇÃO
// ============================================
let departamentoAtualOperacional = 'DCMD';

function selecionarDepartamentoOperacional(deptoId) {
    departamentoAtualOperacional = deptoId;

    document.querySelectorAll('.departamento-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.depto === deptoId);
    });

    renderizarDepartamentoOperacional(deptoId);
}

function renderizarDepartamentoOperacional(deptoId) {
    const container = document.getElementById('deptoContentOperacional');
    const depto = DEPARTAMENTOS_OPERACIONAL[deptoId];

    if (!depto) {
        container.innerHTML = `<div class="depto-empty"><p>Departamento não encontrado.</p></div>`;
        return;
    }

    let html = `
        <div class="depto-header">
            <h2 class="depto-title">${depto.nome} - ${depto.titulo}</h2>
            <p class="depto-subtitle">${depto.descricao}</p>
        </div>
        <div class="func-grid">
    `;

    depto.funcoes.forEach(func => {
        const statusClass = func.status === 'disponivel' ? 'disponivel' :
                           func.status === 'desenvolvimento' ? 'desenvolvimento' :
                           func.status === 'restrito' ? 'restrito' : 'em-breve';
        const statusLabel = func.status === 'disponivel' ? '✓ Disponível' :
                           func.status === 'desenvolvimento' ? '⚙️ Em desenvolvimento' :
                           func.status === 'restrito' ? '🔒 Restrito' : '📅 Em breve';
        const isDisabled = func.status !== 'disponivel';

        if (func.temDropdown) {
            html += `
                <div class="func-card" onclick="toggleDropdownOperacional(event, '${func.id}')" style="cursor: pointer;">
                    <div class="func-icon">${func.icone}</div>
                    <div class="func-name">
                        ${func.nome}
                        <span class="arrow-icon">▼</span>
                    </div>
                    <div class="func-status ${statusClass}">${statusLabel}</div>
                    <div class="dropdown-container">
                        <div class="dropdown-menu" id="dropdownOperacional_${func.id}">
            `;

            func.dropdownItems.forEach(item => {
                if (item.disabled) {
                    html += `
                        <a href="#" class="dropdown-item" onclick="event.preventDefault(); mostrarEmDesenvolvimentoOperacional(event)">
                            <span class="item-icon">📜</span>
                            <span class="item-label">${item.nome}</span>
                            <span class="item-badge em-breve">${item.badge}</span>
                        </a>
                    `;
                } else {
                    // 🔥 CORRIGIDO: aplica CONFIG.getPageUrl()
                    const link = (typeof CONFIG !== 'undefined' && CONFIG)
                        ? CONFIG.getPageUrl(item.link)
                        : item.link;
                    html += `
                        <a href="${link}" class="dropdown-item">
                            <span class="item-icon">📄</span>
                            <span class="item-label">${item.nome}</span>
                            <span class="item-badge">${item.badge}</span>
                        </a>
                    `;
                }
            });

            html += `
                        </div>
                    </div>
                </div>
            `;
        } else {
            let onclick = '';
            let link = isDisabled ? '#' : func.link;

            // 🔥 CORRIGIDO: aplica CONFIG.getPageUrl() também nos cards
            if (!isDisabled && !func.isRestricted && typeof CONFIG !== 'undefined' && CONFIG) {
                link = CONFIG.getPageUrl(func.link);
            }

            if (func.isRestricted) {
                onclick = `onclick="event.preventDefault(); alert('⚠️ Funcionalidade restrita para perfil Operacional')"`;
            } else if (isDisabled) {
                onclick = `onclick="event.preventDefault(); mostrarEmDesenvolvimentoOperacional(event)"`;
            }

            html += `
                <a href="${link}" class="func-card ${isDisabled ? 'disabled' : ''}" ${onclick}>
                    <div class="func-icon">${func.icone}</div>
                    <div class="func-name">${func.nome}</div>
                    <div class="func-status ${statusClass}">${statusLabel}</div>
                </a>
            `;
        }
    });

    html += `
        </div>
    `;

    container.innerHTML = html;
}

function toggleDropdownOperacional(event, funcId) {
    event.stopPropagation();
    const dropdown = document.getElementById(`dropdownOperacional_${funcId}`);
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('show');

    document.querySelectorAll('.dropdown-menu.show').forEach(el => {
        if (el !== dropdown) el.classList.remove('show');
    });

    if (isOpen) {
        dropdown.classList.remove('show');
    } else {
        dropdown.classList.add('show');
    }
}

function mostrarEmDesenvolvimentoOperacional(event) {
    if (event) event.preventDefault();
    alert('⚙️ Funcionalidade em desenvolvimento. Em breve disponível!');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 Home Operacional carregada');

    // Aguarda o container existir e a home ficar visível (pós-auth)
    const checkContainer = setInterval(function() {
        const container = document.getElementById('deptoContentOperacional');
        const homeContent = document.getElementById('homeContent');

        if (container && homeContent && homeContent.style.display !== 'none') {
            console.log('✅ Container encontrado, renderizando...');
            clearInterval(checkContainer);
            renderizarDepartamentoOperacional('DCMD');
        }
    }, 200);

    // Fallback: se após 3s ainda não renderizou, força
    setTimeout(function() {
        const container = document.getElementById('deptoContentOperacional');
        if (container && container.innerHTML === '') {
            console.log('⏳ Fallback: renderizando após timeout');
            renderizarDepartamentoOperacional('DCMD');
        }
    }, 3000);
});

document.addEventListener('click', function(event) {
    document.querySelectorAll('.dropdown-menu.show').forEach(el => {
        const card = event.target.closest('.func-card');
        if (!card || !card.querySelector(`#${el.id}`)) {
            el.classList.remove('show');
        }
    });
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.dropdown-menu.show').forEach(el => {
            el.classList.remove('show');
        });
    }
});