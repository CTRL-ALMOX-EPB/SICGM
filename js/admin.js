// ============================================
// ADMIN.JS v8 — CRUD multi-perfil/depto
// 🛡️ Fix: fecharModalUsuario (não conflita com chamados.js)
// 🔐 Fix: senha = "ctrl-" + matrícula (igual ao login)
// ============================================

let usuariosCache = [];
let onlineCache = [];
let editandoEmail = null;
let intervaloRefresh = null;

const DEPARTAMENTOS_OPTS = [
    { id: 'GESTAO', nome: 'GESTÃO' },
    { id: 'DCMD', nome: 'DCMD' },
    { id: 'DMPC', nome: 'DMPC' },
    { id: 'DECP', nome: 'DECP' },
    { id: 'DEOP', nome: 'DEOP' }
];
const PERFIS_OPTS = [
    { id: 'GESTAO', nome: 'Gestão' },
    { id: 'BACKOFFICE', nome: 'BackOffice' },
    { id: 'TECNICA', nome: 'Técnica' },
    { id: 'SEPARADOR', nome: 'Separador' },
    { id: 'ESTORNADOR', nome: 'Estornador' },
    { id: 'CONFERENTE', nome: 'Conferente' },
    { id: 'VISUALIZACAO', nome: 'Visualização' }
];
const CORES_PERFIL = {
    GESTAO: '#3d8bfd', BACKOFFICE: '#28a745', TECNICA: '#6f42c1',
    SEPARADOR: '#ff9800', ESTORNADOR: '#e91e63', CONFERENTE: '#00bcd4', VISUALIZACAO: '#6b7a8f'
};

const PREFIXO_SENHA = 'ctrl-';

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('👑 Painel Admin iniciado');

    if (typeof authService === 'undefined') {
        window.location.href = '../login.html';
        return;
    }

    await authService.waitForInit();

    if (!authService.isLoggedIn()) {
        alert('🔒 Faça login primeiro.');
        window.location.href = '../login.html';
        return;
    }

    if (!authService.ehGestao()) {
        alert('🔒 Apenas GESTÃO pode acessar.');
        window.location.href = '../home-unificada.html';
        return;
    }

    popularFiltros();
    await carregarDados();

    if (intervaloRefresh) clearInterval(intervaloRefresh);
    intervaloRefresh = setInterval(carregarDados, 30000);

    setInterval(() => {
        if (typeof authService !== 'undefined' && !authService.isLoggedIn()) {
            window.location.href = '../login.html';
        }
    }, 30000);
});

// ============================================
// FILTROS
// ============================================
function popularFiltros() {
    const selPerfil = document.getElementById('filtroPerfil');
    const selDepto = document.getElementById('filtroDepto');

    if (selPerfil && selPerfil.options.length <= 1) {
        PERFIS_OPTS.forEach(p => {
            const o = document.createElement('option');
            o.value = p.id;
            o.textContent = p.nome;
            selPerfil.appendChild(o);
        });
    }

    if (selDepto && selDepto.options.length <= 1) {
        DEPARTAMENTOS_OPTS.forEach(d => {
            const o = document.createElement('option');
            o.value = d.id;
            o.textContent = d.nome;
            selDepto.appendChild(o);
        });
    }
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarDados() {
    const loading = document.getElementById('loading');
    const conteudo = document.getElementById('conteudo');
    if (loading) loading.style.display = 'block';
    if (conteudo) conteudo.style.display = 'none';

    try {
        const todos = await authService.listUsers();
        usuariosCache = todos.usuarios || [];

        const online = await authService.getActiveSessions();
        onlineCache = online.usuarios || [];

        document.getElementById('totalUsers').textContent = todos.stats?.total || 0;
        document.getElementById('activeUsers').textContent = todos.stats?.ativos || 0;
        document.getElementById('inactiveUsers').textContent = todos.stats?.inativos || 0;
        document.getElementById('onlineUsers').textContent = online.total_ativos || 0;
        document.getElementById('badgeTotal').textContent = usuariosCache.length;
        document.getElementById('badgeOnline').textContent = onlineCache.length;

        renderizarUsuarios();
        renderizarOnline();

        if (loading) loading.style.display = 'none';
        if (conteudo) conteudo.style.display = 'block';
    } catch (e) {
        console.error('❌ carregarDados:', e);
        if (loading) {
            if (e.message && e.message.includes('Acesso negado')) {
                loading.innerHTML = '🔒 Acesso negado. Apenas GESTÃO pode acessar.';
            } else {
                loading.innerHTML = `❌ Erro: ${e.message}`;
            }
        }
    }
}

// ============================================
// RENDERIZAR
// ============================================
function filtrarUsuarios() {
    renderizarUsuarios();
}

function renderizarUsuarios() {
    const cont = document.getElementById('allUsersList');
    if (!cont) return;

    const busca = (document.getElementById('filtroBusca')?.value || '').toLowerCase().trim();
    const filtroPerfil = document.getElementById('filtroPerfil')?.value || '';
    const filtroDepto = document.getElementById('filtroDepto')?.value || '';

    let lista = usuariosCache;
    if (busca) {
        lista = lista.filter(u =>
            (u.nome || '').toLowerCase().includes(busca) ||
            (u.email || '').toLowerCase().includes(busca) ||
            (u.matricula || '').toLowerCase().includes(busca)
        );
    }
    if (filtroPerfil) lista = lista.filter(u => (u.perfis || []).some(p => p.perfil === filtroPerfil));
    if (filtroDepto) lista = lista.filter(u => (u.departamentos || []).includes(filtroDepto));

    if (lista.length === 0) {
        cont.innerHTML = '<p style="color:#718096;padding:10px;">Nenhum usuário encontrado.</p>';
        return;
    }

    cont.innerHTML = lista.map(u => {
        const chips = (u.perfis || []).map(p => {
            const cor = CORES_PERFIL[p.perfil] || '#6b7a8f';
            const deptos = (p.departamentos || []).join(', ') || '—';
            return `<span class="chip-perfil" style="background:${cor}20;color:${cor};border:1px solid ${cor}">
                ${p.perfil} <small>(${deptos})</small>
            </span>`;
        }).join('');

        const statusCls = u.ativo ? 'status-ativo' : 'status-inativo';
        const statusTxt = u.ativo ? '✅ Ativo' : '❌ Inativo';
        const emailEscapado = (u.email || '').replace(/'/g, "\\'");

        return `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-name">${u.nome} <span class="${statusCls}">${statusTxt}</span></div>
                    <div class="user-email">${u.email} · Mat: ${u.matricula || '—'}</div>
                    <div class="user-chips">${chips}</div>
                </div>
                <div class="user-actions">
                    <button class="btn-sm btn-edit" onclick="abrirModalEditar('${emailEscapado}')" title="Editar">✏️</button>
                    ${u.ativo
                        ? `<button class="btn-sm btn-danger" onclick="revogar('${emailEscapado}')" title="Revogar">🚫</button>`
                        : `<button class="btn-sm btn-success" onclick="reativar('${emailEscapado}')" title="Reativar">✅</button>`}
                </div>
            </div>
        `;
    }).join('');
}

function renderizarOnline() {
    const cont = document.getElementById('onlineUsersList');
    if (!cont) return;

    if (onlineCache.length === 0) {
        cont.innerHTML = '<p style="color:#718096;padding:10px;">Nenhum usuário online.</p>';
        return;
    }
    cont.innerHTML = onlineCache.map(u => {
        const perfil = u.perfis?.[0]?.perfil || u.perfil || '—';
        const cor = CORES_PERFIL[perfil] || '#6b7a8f';
        return `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-name">${u.nome} <span class="chip-perfil" style="background:${cor}20;color:${cor};border:1px solid ${cor}">${perfil}</span></div>
                    <div class="user-email">${u.email}</div>
                    <div style="font-size:11px;color:#718096;">⏰ Expira: ${u.expira_em || '—'}</div>
                </div>
                <span class="status-ativo">🟢 Online</span>
            </div>
        `;
    }).join('');
}

// ============================================
// HELPERS DE SENHA
// ============================================
function montarSenhaCompleta(matricula) {
    return PREFIXO_SENHA + String(matricula || '').trim();
}

function atualizarPreviewSenha() {
    const matInput = document.getElementById('formMatricula');
    const preview = document.getElementById('senhaPreview');
    const previewTexto = document.getElementById('senhaPreviewTexto');
    if (!preview || !previewTexto) return;

    const mat = matInput?.value.trim() || '';
    if (!mat) {
        previewTexto.textContent = PREFIXO_SENHA + '<matrícula>';
        preview.style.opacity = '0.5';
    } else {
        previewTexto.textContent = PREFIXO_SENHA + mat;
        preview.style.opacity = '1';
    }
}

// ============================================
// MODAL — ABRIR / FECHAR
// ============================================
function abrirModalNovo() {
    editandoEmail = null;
    document.getElementById('modalTitulo').textContent = '➕ Novo Usuário';
    document.getElementById('formEmail').value = '';
    document.getElementById('formEmail').disabled = false;
    document.getElementById('formNome').value = '';
    document.getElementById('formMatricula').value = '';
    document.getElementById('formAtivo').checked = true;
    document.getElementById('perfisContainer').innerHTML = '';
    adicionarPerfil();

    // Preview da senha
    atualizarPreviewSenha();

    document.getElementById('modalUsuario').classList.add('ativo');
}

function abrirModalEditar(email) {
    console.log('🔍 abrirModalEditar chamado com:', email);

    let u = usuariosCache.find(x => x.email === email);
    if (!u) {
        u = usuariosCache.find(x => (x.email || '').toLowerCase() === email.toLowerCase());
    }
    if (!u) {
        console.error('❌ Usuário não encontrado no cache:', email);
        alert('❌ Usuário não encontrado. Recarregue a página.');
        return;
    }

    editandoEmail = u.email;
    document.getElementById('modalTitulo').textContent = '✏️ Editar Usuário';
    document.getElementById('formEmail').value = u.email;
    document.getElementById('formEmail').disabled = true;
    document.getElementById('formNome').value = u.nome || '';
    document.getElementById('formMatricula').value = u.matricula || '';
    document.getElementById('formAtivo').checked = u.ativo !== false;

    const cont = document.getElementById('perfisContainer');
    cont.innerHTML = '';
    if (u.perfis && u.perfis.length > 0) {
        u.perfis.forEach(p => adicionarPerfil(p));
    } else {
        adicionarPerfil();
    }

    // Preview da senha
    atualizarPreviewSenha();

    document.getElementById('modalUsuario').classList.add('ativo');
    console.log('✅ Modal aberto em modo edição');
}

function fecharModalUsuario() {
    const modal = document.getElementById('modalUsuario');
    if (!modal) return;
    modal.classList.remove('ativo');
    modal.style.display = 'none';
    console.log('✅ Modal usuário fechado');
}

// ============================================
// PERFIS DINÂMICOS
// ============================================
function adicionarPerfil(dados) {
    const cont = document.getElementById('perfisContainer');
    const div = document.createElement('div');
    div.className = 'perfil-row';
    div.innerHTML = `
        <select class="perfil-select">
            <option value="">Perfil...</option>
            ${PERFIS_OPTS.map(p => `<option value="${p.id}" ${dados?.perfil === p.id ? 'selected' : ''}>${p.nome}</option>`).join('')}
        </select>
        <div class="deptos-checkboxes">
            ${DEPARTAMENTOS_OPTS.map(d => `
                <label class="check-depto">
                    <input type="checkbox" value="${d.id}" ${(dados?.departamentos || []).includes(d.id) ? 'checked' : ''}>
                    <span>${d.nome}</span>
                </label>
            `).join('')}
        </div>
        <button type="button" class="btn-remove-perfil" onclick="this.parentElement.remove()" title="Remover">🗑</button>
    `;
    cont.appendChild(div);
}

// ============================================
// SALVAR
// ============================================
async function salvarUsuario() {
    const email = document.getElementById('formEmail').value.trim().toLowerCase();
    const nome = document.getElementById('formNome').value.trim();
    const matricula = document.getElementById('formMatricula').value.trim();
    const ativo = document.getElementById('formAtivo').checked;

    if (!email || !email.includes('@')) return alert('E-mail inválido');
    if (!nome) return alert('Nome obrigatório');

    // 🔐 Senha sempre = ctrl-<matricula>
    let senha = null;
    if (!editandoEmail) {
        if (!matricula) return alert('Matrícula obrigatória (é usada como senha)');
        senha = montarSenhaCompleta(matricula);
    } else {
        // No editar: se mudou a matrícula, atualiza senha
        const uOriginal = usuariosCache.find(x => x.email === editandoEmail);
        if (uOriginal && uOriginal.matricula !== matricula && matricula) {
            const confirmar = confirm(`Matrícula mudou de "${uOriginal.matricula}" para "${matricula}".\n\nIsso vai alterar a senha para "${montarSenhaCompleta(matricula)}".\n\nContinuar?`);
            if (!confirmar) return;
            senha = montarSenhaCompleta(matricula);
        }
    }

    const perfis = [];
    let erro = false;
    document.querySelectorAll('#perfisContainer .perfil-row').forEach(row => {
        const perfil = row.querySelector('.perfil-select').value;
        if (!perfil) return;
        const deptos = Array.from(row.querySelectorAll('.deptos-checkboxes input:checked')).map(cb => cb.value);
        if (deptos.length === 0) {
            alert(`Selecione ao menos 1 depto para o perfil ${perfil}`);
            erro = true;
            return;
        }
        perfis.push({ perfil, departamentos: deptos });
    });
    if (erro) return;
    if (perfis.length === 0) return alert('Adicione ao menos 1 perfil');

    const btn = document.getElementById('btnSalvar');
    btn.disabled = true;
    btn.textContent = '⏳ Salvando...';

    try {
        if (editandoEmail) {
            const payload = { nome, matricula, perfis, ativo };
            if (senha) payload.senha = senha;
            await authService.atualizarUsuario(editandoEmail, payload);
            alert('✅ Usuário atualizado');
        } else {
            await authService.criarUsuario({ email, nome, matricula, senha, perfis });
            alert(`✅ Usuário criado!\n\n📧 Login: ${email}\n🔑 Senha: ${senha}\n\n(Guarde essa senha e informe ao colaborador)`);
        }
        fecharModalUsuario();
        await carregarDados();
    } catch (e) {
        alert('❌ ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Salvar';
    }
}

// ============================================
// REVOGAR / REATIVAR
// ============================================
async function revogar(email) {
    if (!confirm(`Revogar acesso de ${email}?`)) return;
    try {
        await authService.revokeUser(email);
        alert('✅ Revogado');
        await carregarDados();
    } catch (e) {
        alert('❌ ' + e.message);
    }
}

async function reativar(email) {
    if (!confirm(`Reativar acesso de ${email}?`)) return;
    try {
        await authService.reactivateUser(email);
        alert('✅ Reativado');
        await carregarDados();
    } catch (e) {
        alert('❌ ' + e.message);
    }
}

// ============================================
// LOGOUT
// ============================================
async function sair() {
    if (!confirm('Deseja sair do sistema?')) return;
    try {
        if (typeof authService !== 'undefined') await authService.logout();
    } catch (_) {}
    window.location.href = '../login.html';
}

// ============================================
// 🛡️ BLINDAGEM — captura clique antes de qualquer outro script
// ============================================
(function blindarModalUsuario() {
    const blindar = () => {
        document.addEventListener('click', function(e) {
            const btnX = e.target.closest('#modalUsuario .btn-fechar');
            if (btnX) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                fecharModalUsuario();
                return false;
            }
            if (e.target.id === 'modalUsuario' && e.target.classList.contains('ativo')) {
                fecharModalUsuario();
            }
        }, true);

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const m = document.getElementById('modalUsuario');
                if (m && m.classList.contains('ativo')) fecharModalUsuario();
            }
        });

        // Atualiza preview de senha ao digitar matrícula
        document.addEventListener('input', function(e) {
            if (e.target.id === 'formMatricula') atualizarPreviewSenha();
        });

        console.log('🛡️ Blindagem do modalUsuario ativa');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', blindar);
    } else {
        blindar();
    }
})();

// ============================================
// EXPOR NO ESCOPO GLOBAL
// ============================================
window.abrirModalNovo = abrirModalNovo;
window.abrirModalEditar = abrirModalEditar;
window.fecharModalUsuario = fecharModalUsuario;
window.salvarUsuario = salvarUsuario;
window.revogar = revogar;
window.reativar = reativar;
window.sair = sair;
window.filtrarUsuarios = filtrarUsuarios;
window.carregarDados = carregarDados;
window.adicionarPerfil = adicionarPerfil;
window.atualizarPreviewSenha = atualizarPreviewSenha;