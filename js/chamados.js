const CHAMADOS_WORKER_URL = 'https://chamados.alefe-gomes-72f.workers.dev';

const TELAS_SISTEMA = [
    { arquivo: 'index.htm',                            titulo: 'Página Inicial' },
    { arquivo: 'login.html',                           titulo: 'Login' },
    { arquivo: 'home-gestao.html',                     titulo: 'Home - Gestão' },
    { arquivo: 'home-operacional.html',                titulo: 'Home - Operacional' },
    { arquivo: 'home-visualizacao.html',               titulo: 'Home - Visualização' },
    { arquivo: 'contagem-diaria/index.html',           titulo: 'Contagem Diária' },
    { arquivo: 'contagem-diaria/contagem-dmpc.html',   titulo: 'Contagem Diária DMPC' },
    { arquivo: 'controles/index.html',                 titulo: 'Controles - Listagem' },
    { arquivo: 'controles/formulario.html',            titulo: 'Controles - Formulário' },
    { arquivo: 'dashboards/index.html',                titulo: 'Dashboards - Início' },
    { arquivo: 'dashboards/aditivos-fisicos.html',     titulo: 'Dashboard - Aditivos Físicos' },
    { arquivo: 'dashboards/aditivos-sistemicos.html',  titulo: 'Dashboard - Aditivos Sistêmicos' },
    { arquivo: 'dashboards/farol-obras.html',          titulo: 'Dashboard - Farol de Obras' },
    { arquivo: 'dashboards/pendencia-devolucao.html',  titulo: 'Dashboard - Pendência Devolução' },
    { arquivo: 'dashboards/pendencia-requisicao.html', titulo: 'Dashboard - Pendência Requisição' },
    { arquivo: 'gestão/admin.html',                    titulo: 'Gestão - Admin' },
    { arquivo: 'gestão/estrutura-setor.html',          titulo: 'Gestão - Estrutura Setor' },
    { arquivo: 'gestão/indicadores.html',              titulo: 'Gestão - Indicadores' },
    { arquivo: 'gestão/planejamento.html',             titulo: 'Gestão - Planejamento' },
    { arquivo: 'mgm-list/index.html',                  titulo: 'MGM List' },
    { arquivo: 'processos/index.html',                 titulo: 'Processos' },
    { arquivo: 'relatorios/relatorio-contagem.html',   titulo: 'Relatório - Contagem' },
    { arquivo: 'relatorios/busca-trafo.html',          titulo: 'Relatório - Busca Trafo' },
    { arquivo: 'sa-emergencial/index.html',            titulo: 'SA Emergencial - Início' },
    { arquivo: 'sa-emergencial/assinar.html',          titulo: 'SA Emergencial - Assinar' },
    { arquivo: 'sa-emergencial/formulario.html',       titulo: 'SA Emergencial - Formulário' }
];

const ATENDENTE_MATRICULA = '171309';
const ATENDENTE_EMAIL = 'alefe.gomes@gpssa.com.br';

// ============================================
// BASE PATH ROBUSTO (detecta /SICGM/ ou raiz)
// ============================================
function getBasePath() {
    const scripts = document.getElementsByTagName('script');
    let scriptUrl = null;
    for (const s of scripts) {
        if (s.src && s.src.includes('/js/chamados.js')) {
            scriptUrl = s.src;
            break;
        }
    }

    if (scriptUrl) {
        const idx = scriptUrl.indexOf('/js/chamados.js');
        if (idx !== -1) {
            return scriptUrl.substring(0, idx + 1);
        }
    }

    const partes = window.location.pathname.split('/').filter(Boolean);
    if (window.location.hostname.includes('github.io') && partes.length > 0) {
        return `${window.location.origin}/${partes[0]}/`;
    }

    return `${window.location.origin}/`;
}

function isPaginaHome() {
    const path = window.location.pathname.toLowerCase();
    const arquivo = path.split('/').pop();
    return arquivo === '' || arquivo === 'index.htm' || arquivo === 'index.html' || arquivo.startsWith('home-');
}

function getIdentificacaoTela() {
    const partes = window.location.pathname.split('/').filter(Boolean);
    const arquivoAtual = partes[partes.length - 1] || 'index.htm';
    const pasta = partes.length > 1 ? partes[partes.length - 2] : '';
    const arquivo = pasta ? `${pasta}/${arquivoAtual}` : arquivoAtual;

    let titulo = document.title || arquivoAtual;
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent.trim()) titulo = h1.textContent.trim().substring(0, 80);

    const nomesPastas = {
        'contagem-diaria': 'Contagem Diária', 'controles': 'Controles',
        'dashboards': 'Dashboards', 'gestão': 'Gestão', 'mgm-list': 'MGM List',
        'processos': 'Processos', 'relatorios': 'Relatórios',
        'sa-emergencial': 'SA Emergencial', 'chamados': 'Chamados'
    };

    return {
        arquivo, pasta,
        pastaNome: nomesPastas[pasta] || pasta || 'Raiz',
        titulo, url: window.location.href
    };
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
}

function formatarData(iso) {
    try {
        return new Date(iso).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch { return iso; }
}

const PRIO_LABEL = { nao_urgente: '🟢 Não urgente', importante: '🟡 Importante', urgente: '🔴 Urgente' };
const STATUS_LABEL = { aberto: '🆕 Aberto', em_andamento: '🔧 Em andamento', resolvido: '✅ Resolvido', cancelado: '❌ Cancelado' };
const TIPO_LABEL = { bug: '🐞 BUG', melhoria: '💡 MELHORIA' };

function getUsuarioLogado() {
    let user = { nome: 'Usuário', perfil: '', matricula: '', email: '' };
    try {
        if (typeof authService !== 'undefined' && authService.isLoggedIn && authService.isLoggedIn()) {
            const u = authService.getUserData();
            if (u) user = {
                nome: u.nome || 'Usuário',
                perfil: u.perfil || '',
                matricula: u.matricula || '',
                email: u.email || ''
            };
        }
    } catch (e) { console.warn('⚠️ authService indisponível:', e.message); }
    return user;
}

function ehAtendente(user) {
    return (user.matricula === ATENDENTE_MATRICULA) ||
           ((user.email || '').toLowerCase() === ATENDENTE_EMAIL);
}

// ============================================
// SLA / TEMPO DECORRIDO
// ============================================
function calcularTempoDecorrido(desdeIso) {
    if (!desdeIso) return null;
    try {
        let data;
        if (typeof desdeIso === 'string' && desdeIso.includes(' ') && !desdeIso.includes('T')) {
            data = new Date(desdeIso.replace(' ', 'T') + 'Z');
        } else {
            data = new Date(desdeIso);
        }
        if (isNaN(data.getTime())) return null;

        const diffMs = Date.now() - data.getTime();
        if (diffMs < 0) return { ms: 0, texto: 'agora mesmo', nivel: 'ok' };

        const seg = Math.floor(diffMs / 1000);
        const min = Math.floor(seg / 60);
        const hr  = Math.floor(min / 60);
        const dia = Math.floor(hr / 24);
        const mes = Math.floor(dia / 30);

        let texto = '';
        if (seg < 60) texto = `${seg}s`;
        else if (min < 60) texto = `${min}min`;
        else if (hr < 24) texto = `${hr}h ${min % 60}min`;
        else if (dia < 30) texto = `${dia}d ${hr % 24}h`;
        else texto = `${mes}m ${dia % 30}d`;

        return { ms: diffMs, texto, nivel: classificarTempo(diffMs) };
    } catch {
        return null;
    }
}

function classificarTempo(ms) {
    const hr = ms / (1000 * 60 * 60);
    if (hr < 24) return 'ok';
    if (hr < 72) return 'medio';
    if (hr < 168) return 'alto';
    return 'critico';
}

function renderBadgeSLA(estado, desdeIso) {
    if (!estado) return '';
    const t = calcularTempoDecorrido(desdeIso);

    let prefixo = '';
    let nivel = 'ok';

    if (estado.estado === 'aguardando_atendente') {
        prefixo = '⏱️ aguardando atendente';
        nivel = t?.nivel || 'ok';
    } else if (estado.estado === 'aguardando_solicitante') {
        prefixo = '⏸️ aguardando solicitante';
        nivel = 'pausado';
    } else if (estado.estado === 'fechado') {
        prefixo = '🔒 fechado';
        nivel = 'fechado';
    }

    const texto = t ? `${prefixo} há ${t.texto}` : prefixo;
    return `<span class="tempo-aberto ${nivel}" title="${estado.estado}">${texto}</span>`;
}

// ============================================
// FORMATAÇÃO DE DURAÇÃO EM ms
// ============================================
function formatarDuracaoMs(ms) {
    if (ms == null || ms < 0) return '—';
    const seg = Math.floor(ms / 1000);
    const min = Math.floor(seg / 60);
    const hr  = Math.floor(min / 60);
    const dia = Math.floor(hr / 24);
    const mes = Math.floor(dia / 30);

    if (seg < 60) return `${seg}s`;
    if (min < 60) return `${min}min`;
    if (hr < 24) return `${hr}h ${min % 60}min`;
    if (dia < 30) return `${dia}d ${hr % 24}h`;
    return `${mes}m ${dia % 30}d`;
}

// ============================================
// RESUMO DE SLA (card)
// ============================================
function renderResumoSLA(sla) {
    if (!sla) return '';
    const atend = formatarDuracaoMs(sla.sla_atendente_ms);
    const sol   = formatarDuracaoMs(sla.sla_solicitante_ms);
    return `
        <div class="sla-resumo">
            <span class="sla-item sla-atendente" title="Soma dos tempos em que a bola estava com o atendente">
                🛠️ Atendente: <strong>${atend}</strong>
            </span>
            <span class="sla-item sla-solicitante" title="Soma dos tempos em que a bola estava com o solicitante">
                👤 Solicitante: <strong>${sol}</strong>
            </span>
        </div>
    `;
}

// ============================================
// TIMELINE DE SLA (modal)
// ============================================
function renderTimelineSLA(ciclos) {
    if (!ciclos || !ciclos.length) {
        return '<div class="sla-timeline-vazia">Nenhum ciclo registrado ainda.</div>';
    }

    return `<div class="sla-timeline">${
        ciclos.map((c, i) => {
            const ehAtendente = c.com === 'atendente';
            const cor = ehAtendente ? 'atendente' : 'solicitante';
            const icone = ehAtendente ? '🛠️' : '👤';
            const rotulo = ehAtendente ? 'Atendente' : 'Solicitante';
            const inicio = formatarData(c.inicio);
            const fim = c.fim ? formatarData(c.fim) : null;
            const duracao = formatarDuracaoMs(c.duracao_ms);

            const gatilhos = {
                criado: 'Chamado criado',
                resposta_solicitante: 'Solicitante respondeu',
                resposta_atendente: 'Atendente respondeu',
                resolvido: 'Chamado resolvido',
                cancelado: 'Chamado cancelado'
            };

            const motivoInicio = gatilhos[c.gatilho_inicio] || c.gatilho_inicio;
            const motivoFim = c.em_curso ? 'Em andamento' : (gatilhos[c.gatilho_fim] || c.gatilho_fim || '—');

            return `
                <div class="sla-ciclo ${cor} ${c.em_curso ? 'em-curso' : ''}">
                    <div class="sla-ciclo-header">
                        <span class="sla-ciclo-numero">#${i + 1}</span>
                        <span class="sla-ciclo-icone">${icone}</span>
                        <strong>${rotulo}</strong>
                        <span class="sla-ciclo-duracao">${duracao}${c.em_curso ? ' ⏳' : ''}</span>
                    </div>
                    <div class="sla-ciclo-detalhes">
                        <div class="sla-ciclo-linha">
                            <span class="sla-ciclo-label">Início:</span>
                            <span>${inicio} — <em>${motivoInicio}</em></span>
                        </div>
                        <div class="sla-ciclo-linha">
                            <span class="sla-ciclo-label">${c.em_curso ? 'Status:' : 'Fim:'}</span>
                            <span>${c.em_curso ? 'Aguardando resposta' : `${fim} — <em>${motivoFim}</em>`}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('')
    }</div>`;
}

// ============================================
// BOTÃO FLUTUANTE
// ============================================
function irParaAbrirChamado() {
    const base = getBasePath();

    if (isPaginaHome() && !window.location.pathname.includes('/chamados/')) {
        window.location.href = `${base}chamados/index.html`;
        return;
    }

    const tela = getIdentificacaoTela();
    const params = new URLSearchParams({
        tela: tela.arquivo, titulo: tela.titulo, url: window.location.href
    });
    window.location.href = `${base}chamados/abrir.html?${params.toString()}`;
}

function criarBotaoFlutuante() {
    if (window.location.pathname.includes('/chamados/')) return;
    if (document.getElementById('btnChamadoFlutuante')) return;

    const home = isPaginaHome();
    const btn = document.createElement('button');
    btn.id = 'btnChamadoFlutuante';
    btn.className = 'btn-chamado-flutuante';
    btn.type = 'button';
    btn.setAttribute('aria-label', home ? 'Painel de chamados' : 'Abrir chamado');
    btn.innerHTML = home
        ? `📋<span class="tooltip">Painel de Chamados</span>`
        : `🐞<span class="tooltip">Abrir chamado / Reportar problema</span>`;
    btn.addEventListener('click', irParaAbrirChamado);
    document.body.appendChild(btn);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarBotaoFlutuante);
} else {
    criarBotaoFlutuante();
}

window.irParaAbrirChamado = irParaAbrirChamado;
window.getIdentificacaoTela = getIdentificacaoTela;

// ============================================
// PÁGINA: ABRIR (abrir.html)
// ============================================
function initPaginaAbrir() {
    const form = document.getElementById('formChamado');
    if (!form) return;

    console.log('📋 Inicializando formulário de chamado...');

    if (typeof authService === 'undefined' || !authService || !authService.isLoggedIn()) {
        alert('🔒 Sessão inválida. Faça login novamente.');
        window.location.href = getBasePath() + 'login.html';
        return;
    }

    const usuario = getUsuarioLogado();
    console.log(`✅ Usuário: ${usuario.nome} | Matrícula: ${usuario.matricula} | Perfil: ${usuario.perfil}`);

    const params = new URLSearchParams(window.location.search);
    const telaArquivo = params.get('tela') || '';
    const urlCompleta = params.get('url') || document.referrer || '';

    const selectTela = document.getElementById('selectTela');
    if (selectTela) {
        selectTela.innerHTML = '<option value="">— Selecione a página —</option>';
        TELAS_SISTEMA.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.arquivo;
            opt.textContent = t.titulo;
            selectTela.appendChild(opt);
        });
        if (telaArquivo && TELAS_SISTEMA.some(t => t.arquivo === telaArquivo)) {
            selectTela.value = telaArquivo;
        } else if (telaArquivo) {
            const opt = document.createElement('option');
            opt.value = telaArquivo;
            opt.textContent = `${telaArquivo} (tela atual)`;
            selectTela.appendChild(opt);
            selectTela.value = telaArquivo;
        }
    }

    const elUrl = document.getElementById('infoUrl');
    if (elUrl) {
        elUrl.textContent = urlCompleta.length > 60 ? urlCompleta.substring(0, 60) + '...' : urlCompleta;
        elUrl.title = urlCompleta;
    }

    const elUsuario = document.getElementById('infoUsuario');
    if (elUsuario) {
        elUsuario.textContent = usuario.matricula
            ? `${usuario.nome} (${usuario.matricula})`
            : usuario.nome;
    }

    document.querySelectorAll('.tipo-opcao').forEach(opcao => {
        const radio = opcao.querySelector('input[type="radio"]');
        if (!radio) return;
        if (radio.checked) opcao.classList.add('selected');
        opcao.addEventListener('click', function (e) {
            if (e.target.tagName !== 'INPUT') radio.checked = true;
            document.querySelectorAll('.tipo-opcao').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    document.querySelectorAll('.prioridade-opcao').forEach(opcao => {
        const radio = opcao.querySelector('input[type="radio"]');
        if (!radio) return;
        if (radio.checked) opcao.classList.add('selected');
        opcao.addEventListener('click', function (e) {
            if (e.target.tagName !== 'INPUT') radio.checked = true;
            document.querySelectorAll('.prioridade-opcao').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    const uploadArea = document.getElementById('uploadArea');
    const inputFile = document.getElementById('inputAnexos');
    const listaAnexos = document.getElementById('listaAnexos');
    let anexosProntos = [];

    if (uploadArea && inputFile) {
        uploadArea.addEventListener('click', () => inputFile.click());
        uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
        inputFile.addEventListener('change', e => {
            handleFiles(e.target.files);
            inputFile.value = '';
        });
    }

    async function handleFiles(files) {
        if (anexosProntos.length + files.length > 5) { alert('Máximo de 5 arquivos por chamado.'); return; }
        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) { alert(`Arquivo "${file.name}" é maior que 10 MB.`); continue; }
            await enviarAnexo(file);
        }
    }

    async function enviarAnexo(file) {
        const itemId = 'anexo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const itemEl = document.createElement('div');
        itemEl.className = 'upload-item';
        itemEl.id = itemId;
        itemEl.innerHTML = `
            <div class="info">
                <span>📎</span>
                <span class="nome">${escapeHtml(file.name)}</span>
                <span class="tamanho">${(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <span class="status enviando">⏳ Enviando...</span>
            <button type="button" class="btn-remover" title="Remover">✕</button>
        `;
        listaAnexos.appendChild(itemEl);

        const statusEl = itemEl.querySelector('.status');
        const btnRemover = itemEl.querySelector('.btn-remover');
        btnRemover.addEventListener('click', () => {
            itemEl.remove();
            anexosProntos = anexosProntos.filter(a => a._itemId !== itemId);
        });

        try {
            const fd = new FormData();
            fd.append('arquivo', file);
            fd.append('chamado_id', 'temp');
            const resp = await fetch(`${CHAMADOS_WORKER_URL}/api/upload`, { method: 'POST', body: fd });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || `Erro ${resp.status}`);
            }
            const data = await resp.json();
            data._itemId = itemId;
            anexosProntos.push(data);
            statusEl.className = 'status ok';
            statusEl.textContent = '✅ OK';
        } catch (e) {
            console.error('❌ Erro upload:', e);
            statusEl.className = 'status erro';
            statusEl.textContent = '❌ Erro';
            btnRemover.title = e.message;
        }
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
        const telaSelecionada = selectTela?.value;
        const titulo = document.getElementById('inputTitulo').value.trim();
        const descricao = document.getElementById('inputDescricao').value.trim();
        const prioridade = document.querySelector('input[name="prioridade"]:checked')?.value;

        if (!tipo) { alert('Selecione o tipo do chamado (BUG ou MELHORIA).'); return; }
        if (!telaSelecionada) { alert('Selecione a página com o problema.'); return; }
        if (!titulo || !descricao || !prioridade) { alert('Preencha título, descrição e prioridade.'); return; }

        const telaMeta = TELAS_SISTEMA.find(t => t.arquivo === telaSelecionada);
        const telaTitulo = telaMeta ? telaMeta.titulo : telaSelecionada;

        const btnSubmit = document.getElementById('btnEnviar');
        btnSubmit.disabled = true;
        btnSubmit.textContent = '⏳ Enviando...';

        try {
            const payload = {
                tela_origem: telaSelecionada,
                tela_titulo: telaTitulo,
                url_completa: urlCompleta,
                tipo, titulo, descricao, prioridade,
                usuario_nome: usuario.nome,
                usuario_email: usuario.matricula || usuario.nome,
                usuario_perfil: usuario.perfil,
                anexos: anexosProntos.map(a => ({
                    nome_original: a.nome_original,
                    chave_r2: a.chave_r2,
                    url_publica: a.url_publica,
                    tipo_mime: a.tipo_mime,
                    tamanho_bytes: a.tamanho_bytes
                }))
            };

            const resp = await fetch(`${CHAMADOS_WORKER_URL}/api/chamados`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Matricula': usuario.matricula,
                    'X-User-Perfil': usuario.perfil
                },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`);

            form.style.display = 'none';
            const sucesso = document.getElementById('chamadoSucesso');
            if (sucesso) {
                sucesso.style.display = 'block';
                const elProt = document.getElementById('protocoloSucesso');
                if (elProt) elProt.textContent = data.protocolo;
            }
        } catch (e) {
            console.error('❌ Erro ao criar chamado:', e);
            alert('Erro ao criar chamado: ' + e.message);
            btnSubmit.disabled = false;
            btnSubmit.textContent = '📨 Enviar Chamado';
        }
    });
}

// ============================================
// PÁGINA: LISTAGEM (index.html)
// ============================================
function initPaginaListagem() {
    const container = document.getElementById('listaChamados');
    if (!container) return;

    console.log('📋 Inicializando painel de chamados...');

    if (typeof authService === 'undefined' || !authService || !authService.isLoggedIn()) {
        alert('🔒 Sessão expirada. Faça login novamente.');
        window.location.href = getBasePath() + 'login.html';
        return;
    }

    const usuarioLogado = getUsuarioLogado();
    console.log(`✅ Painel acessado por: ${usuarioLogado.nome} (${usuarioLogado.perfil})`);

    const elUserLogado = document.getElementById('usuarioLogadoPainel');
    if (elUserLogado) {
        elUserLogado.textContent = `👤 Logado como: ${usuarioLogado.nome}${usuarioLogado.matricula ? ` (${usuarioLogado.matricula})` : ''} · ${usuarioLogado.perfil}`;
    }

    async function carregarChamados() {
        const filtroTipo = document.getElementById('filtroTipo')?.value || '';
        const filtroStatus = document.getElementById('filtroStatus')?.value || '';
        const filtroPrioridade = document.getElementById('filtroPrioridade')?.value || '';
        const busca = document.getElementById('filtroBusca')?.value || '';

        const params = new URLSearchParams();
        if (filtroTipo) params.set('tipo', filtroTipo);
        if (filtroStatus) params.set('status', filtroStatus);
        if (filtroPrioridade) params.set('prioridade', filtroPrioridade);
        if (busca) params.set('busca', busca);

        container.innerHTML = '<div class="loading-msg">⏳ Carregando chamados...</div>';

        try {
            const resp = await fetch(`${CHAMADOS_WORKER_URL}/api/chamados?${params}`);
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Erro desconhecido');

            atualizarKpis(data.stats || {});
            renderizarChamados(data.chamados || []);
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="erro-msg">❌ Erro ao carregar: ${escapeHtml(e.message)}</div>`;
        }
    }

    function atualizarKpis(stats) {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? 0; };
        set('kpiTotal', stats.total);
        set('kpiAbertos', stats.abertos);
        set('kpiAndamento', stats.em_andamento);
        set('kpiResolvidos', stats.resolvidos);
        set('kpiUrgentes', stats.urgentes);
    }

    function renderizarChamados(lista) {
        if (!lista.length) {
            container.innerHTML = '<div class="sem-dados">Nenhum chamado encontrado.</div>';
            return;
        }

        container.innerHTML = lista.map(c => {
            const est = c._estado || null;
            const badgeTempo = renderBadgeSLA(est, est?.desde);
            const resumoSLA = c._sla ? renderResumoSLA(c._sla) : '';

            return `
                <div class="chamado-item" data-id="${c.id}" data-prioridade="${c.prioridade}">
                    <div class="chamado-item-header">
                        <span class="protocolo">${escapeHtml(c.protocolo)}</span>
                        ${c.tipo ? `<span class="tipo ${c.tipo}">${TIPO_LABEL[c.tipo] || c.tipo}</span>` : ''}
                        <span class="prioridade ${c.prioridade}">${PRIO_LABEL[c.prioridade] || c.prioridade}</span>
                        <span class="status ${c.status}">${STATUS_LABEL[c.status] || c.status}</span>
                        ${badgeTempo}
                    </div>
                    <h3 class="chamado-item-titulo">${escapeHtml(c.titulo)}</h3>
                    <p class="chamado-item-desc">${escapeHtml((c.descricao || '').substring(0, 200))}${(c.descricao || '').length > 200 ? '...' : ''}</p>
                    <div class="chamado-item-meta">
                        <span>👤 ${escapeHtml(c.usuario_nome)}</span>
                        <span>📱 ${escapeHtml(c.tela_titulo || c.tela_origem)}</span>
                        <span>🕒 aberto em ${formatarData(c.criado_em)}</span>
                    </div>
                    ${resumoSLA}
                </div>
            `;
        }).join('');

        container.querySelectorAll('.chamado-item').forEach(el => {
            el.addEventListener('click', () => abrirModalDetalhes(parseInt(el.dataset.id)));
        });

        if (window._timerChamadosAtualizar) clearInterval(window._timerChamadosAtualizar);
        window._timerChamadosAtualizar = setInterval(() => {
            container.querySelectorAll('.chamado-item').forEach(el => {
                const id = parseInt(el.dataset.id);
                const chamado = lista.find(c => c.id === id);
                if (!chamado || !chamado._estado) return;
                if (!chamado._estado.contandoSla) return;

                const t = calcularTempoDecorrido(chamado._estado.desde);
                if (!t) return;
                const badge = el.querySelector('.tempo-aberto');
                if (badge) {
                    badge.textContent = `⏱️ aguardando atendente há ${t.texto}`;
                    badge.className = `tempo-aberto ${t.nivel}`;
                }
            });
        }, 60000);
    }

    window.addEventListener('chamados:reload', () => carregarChamados());

    async function abrirModalDetalhes(id) {
        const modal = document.getElementById('modalDetalhes');
        const corpo = document.getElementById('modalCorpo');
        const titulo = document.getElementById('modalTitulo');
        if (!modal || !corpo) return;

        const user = getUsuarioLogado();
        const podeEditarStatus = user.perfil === 'GESTAO';
        const isAtendenteUser = ehAtendente(user);

        modal.style.display = 'flex';
        corpo.innerHTML = '<div class="loading-msg">⏳ Carregando...</div>';
        titulo.textContent = 'Detalhes do Chamado';

        try {
            const resp = await fetch(`${CHAMADOS_WORKER_URL}/api/chamados/${id}`);
            const data = await resp.json();
            if (!data.success) throw new Error(data.error);

            const c = data.chamado;
            titulo.textContent = `${c.protocolo} — ${c.titulo}`;

            const anexosHtml = (data.anexos || []).length
                ? `<div class="modal-anexos">${data.anexos.map(a => {
                    const isImg = (a.tipo_mime || '').startsWith('image/');
                    const src = a.url_publica;
                    return `
                        <a class="anexo-thumb" href="${src}" target="_blank" rel="noopener">
                            ${isImg
                                ? `<img src="${src}" alt="${escapeHtml(a.nome_original)}" loading="lazy">`
                                : `<div class="placeholder">📄</div>`}
                            <div class="nome" title="${escapeHtml(a.nome_original)}">${escapeHtml(a.nome_original)}</div>
                        </a>
                    `;
                }).join('')}</div>`
                : '<div class="modal-field-value" style="color:#A0AEC0;">Nenhum anexo</div>';

            const comentarios = data.comentarios || [];
            const chatHtml = comentarios.length
                ? comentarios.map(cm => {
                    const isAtend = cm.tipo_autor === 'atendente';
                    const isMe = (cm.autor_matricula && cm.autor_matricula === user.matricula) ||
                                 (cm.autor_email && cm.autor_email.toLowerCase() === (user.email || '').toLowerCase());
                    const lado = isMe ? 'me' : 'other';
                    return `
                        <div class="chat-msg ${lado} ${isAtend ? 'atendente' : 'solicitante'}">
                            <div class="chat-msg-header">
                                <strong>${escapeHtml(cm.autor_nome)}</strong>
                                ${isAtend ? '<span class="chat-badge-atendente">🛠️ Atendente</span>' : ''}
                                <span class="chat-msg-data">${formatarData(cm.criado_em)}</span>
                            </div>
                            <div class="chat-msg-texto">${escapeHtml(cm.mensagem).replace(/\n/g, '<br>')}</div>
                        </div>
                    `;
                }).join('')
                : '<div class="chat-vazio">💬 Nenhuma mensagem ainda. Seja o primeiro a comentar!</div>';

            const est = c._estado || null;
            const badgeSLA = renderBadgeSLA(est, est?.desde);

            const slaCompleto = c._sla || null;
            const timelineHtml = slaCompleto?.ciclos ? renderTimelineSLA(slaCompleto.ciclos) : '';
            const resumoSLACompleto = slaCompleto ? `
                <div class="modal-sla-resumo">
                    <div class="sla-total-card">
                        <div class="sla-total-label">🛠️ SLA total do atendente</div>
                        <div class="sla-total-valor">${formatarDuracaoMs(slaCompleto.sla_atendente_ms)}</div>
                    </div>
                    <div class="sla-total-card">
                        <div class="sla-total-label">👤 SLA total do solicitante</div>
                        <div class="sla-total-valor">${formatarDuracaoMs(slaCompleto.sla_solicitante_ms)}</div>
                    </div>
                    <div class="sla-total-card">
                        <div class="sla-total-label">🔄 Ciclos registrados</div>
                        <div class="sla-total-valor">${slaCompleto.ciclos?.length || 0}</div>
                    </div>
                </div>
            ` : '';

            corpo.innerHTML = `
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="modal-field">
                        <div class="modal-field-label">Tipo</div>
                        <div class="modal-field-value">
                            ${c.tipo ? `<span class="tipo ${c.tipo}" style="font-size:12px; padding:4px 10px; border-radius:12px;">${TIPO_LABEL[c.tipo] || c.tipo}</span>` : '—'}
                        </div>
                    </div>
                    <div class="modal-field">
                        <div class="modal-field-label">Status</div>
                        <div class="modal-field-value">
                            <span class="status ${c.status}" style="font-size:12px; padding:4px 10px; border-radius:12px;">${STATUS_LABEL[c.status] || c.status}</span>
                        </div>
                    </div>
                    <div class="modal-field">
                        <div class="modal-field-label">Prioridade</div>
                        <div class="modal-field-value">
                            <span class="prioridade ${c.prioridade}" style="font-size:12px; padding:4px 10px; border-radius:12px;">${PRIO_LABEL[c.prioridade] || c.prioridade}</span>
                        </div>
                    </div>
                    <div class="modal-field">
                        <div class="modal-field-label">Situação atual</div>
                        <div class="modal-field-value">
                            ${badgeSLA || '—'}
                        </div>
                    </div>
                    <div class="modal-field">
                        <div class="modal-field-label">Solicitante</div>
                        <div class="modal-field-value">
                            ${escapeHtml(c.usuario_nome)}
                            ${c.usuario_email ? `<br><small style="color:#A0AEC0;">Matrícula: ${escapeHtml(c.usuario_email)}</small>` : ''}
                        </div>
                    </div>
                    <div class="modal-field">
                        <div class="modal-field-label">Tela</div>
                        <div class="modal-field-value mono">${escapeHtml(c.tela_titulo || c.tela_origem)}</div>
                    </div>
                    <div class="modal-field">
                        <div class="modal-field-label">Criado em</div>
                        <div class="modal-field-value">${formatarData(c.criado_em)}</div>
                    </div>
                </div>

                <div class="modal-field">
                    <div class="modal-field-label">Descrição inicial</div>
                    <div class="modal-field-value" style="background:#F7FAFC; padding:12px; border-radius:8px;">${escapeHtml(c.descricao).replace(/\n/g, '<br>')}</div>
                </div>

                <div class="modal-field">
                    <div class="modal-field-label">Anexos (${(data.anexos || []).length})</div>
                    ${anexosHtml}
                </div>

                <div class="modal-field">
                    <div class="modal-field-label">📊 Resumo de SLA</div>
                    ${resumoSLACompleto}
                </div>

                <div class="modal-field">
                    <div class="modal-field-label">📈 Histórico de SLA por ciclo</div>
                    ${timelineHtml}
                </div>

                <div class="modal-field">
                    <div class="modal-field-label">💬 Conversa</div>
                    <div class="chat-container" id="chatContainer">
                        ${chatHtml}
                    </div>
                </div>

                <div class="chat-input-area" id="chatInputArea">
                    <textarea id="chatInput" placeholder="${isAtendenteUser ? 'Responda como atendente...' : 'Adicione informações ao chamado...'}" maxlength="2000"></textarea>
                    <button class="btn-chamado primary" id="btnEnviarChat">📨 Enviar</button>
                </div>

                <div class="modal-actions" id="modalAcoes">
                    <button class="btn-chamado secondary" onclick="fecharModal()">Fechar</button>
                </div>
            `;

            const acoes = document.getElementById('modalAcoes');
            if (podeEditarStatus) {
                const statusBtns = [
                    { s: 'aberto',       label: '🆕 Reabrir',       cor: 'secondary' },
                    { s: 'em_andamento', label: '🔧 Em andamento',  cor: 'primary' },
                    { s: 'resolvido',    label: '✅ Resolvido',     cor: 'success' },
                    { s: 'cancelado',    label: '❌ Cancelar',      cor: 'secondary' }
                ];
                statusBtns.forEach(b => {
                    if (b.s === c.status) return;
                    const btn = document.createElement('button');
                    btn.className = `btn-chamado ${b.cor}`;
                    btn.textContent = b.label;
                    btn.addEventListener('click', async () => {
                        if (!confirm(`Alterar status para "${b.label}"?`)) return;
                        const ok = await alterarChamado(c.id, { status: b.s }, user);
                        if (ok) abrirModalDetalhes(id);
                    });
                    acoes.insertBefore(btn, acoes.firstChild);
                });
            }

            const btnEnviarChat = document.getElementById('btnEnviarChat');
            const inputChat = document.getElementById('chatInput');
            btnEnviarChat.addEventListener('click', () => enviarComentario(id, inputChat, btnEnviarChat, user));
            inputChat.addEventListener('keydown', e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    enviarComentario(id, inputChat, btnEnviarChat, user);
                }
            });

            const chatEl = document.getElementById('chatContainer');
            if (chatEl) setTimeout(() => chatEl.scrollTop = chatEl.scrollHeight, 80);

        } catch (e) {
            console.error(e);
            corpo.innerHTML = `<div class="erro-msg">❌ Erro: ${escapeHtml(e.message)}</div>`;
        }
    }

    document.getElementById('filtroTipo')?.addEventListener('change', carregarChamados);
    document.getElementById('filtroStatus')?.addEventListener('change', carregarChamados);
    document.getElementById('filtroPrioridade')?.addEventListener('change', carregarChamados);

    let timeoutBusca;
    document.getElementById('filtroBusca')?.addEventListener('input', () => {
        clearTimeout(timeoutBusca);
        timeoutBusca = setTimeout(carregarChamados, 300);
    });

    document.getElementById('btnLimparFiltros')?.addEventListener('click', () => {
        ['filtroTipo', 'filtroStatus', 'filtroPrioridade', 'filtroBusca'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        carregarChamados();
    });

    carregarChamados();
}

// ============================================
// AUXILIARES
// ============================================
async function alterarChamado(id, mudancas, user) {
    try {
        const payload = {
            ...mudancas,
            usuario_alteracao: user.nome || 'Usuário',
            perfil_alteracao: user.perfil || ''
        };

        const resp = await fetch(`${CHAMADOS_WORKER_URL}/api/chamados/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Matricula': user.matricula || '',
                'X-User-Perfil': user.perfil || ''
            },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Erro ao atualizar');

        window.dispatchEvent(new Event('chamados:reload'));
        return true;
    } catch (e) {
        alert('Erro: ' + e.message);
        return false;
    }
}
window.alterarChamado = alterarChamado;

async function enviarComentario(chamadoId, inputEl, btnEl, user) {
    const mensagem = inputEl.value.trim();
    if (!mensagem) return;

    btnEl.disabled = true;
    btnEl.textContent = '⏳ Enviando...';

    try {
        const resp = await fetch(`${CHAMADOS_WORKER_URL}/api/chamados/${chamadoId}/comentarios`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Matricula': user.matricula || '',
                'X-User-Perfil': user.perfil || ''
            },
            body: JSON.stringify({
                autor_nome: user.nome,
                autor_matricula: user.matricula,
                autor_perfil: user.perfil,
                autor_email: user.email || '',
                mensagem
            })
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Erro ao enviar');
        inputEl.value = '';

        const item = document.querySelector(`.chamado-item[data-id="${chamadoId}"]`);
        if (item) item.click();
    } catch (e) {
        alert('Erro: ' + e.message);
    } finally {
        btnEl.disabled = false;
        btnEl.textContent = '📨 Enviar';
    }
}

window.fecharModal = function () {
    const modal = document.getElementById('modalDetalhes');
    if (modal) modal.style.display = 'none';
};

document.addEventListener('click', e => {
    const modal = document.getElementById('modalDetalhes');
    if (modal && modal.style.display === 'flex' && e.target === modal) {
        window.fecharModal();
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.fecharModal();
});

function redirecionarParaHome() {
    const base = getBasePath();
    let perfil = 'GESTAO';
    if (typeof authService !== 'undefined' && authService) {
        const user = authService.getUserData();
        if (user && user.perfil) perfil = user.perfil;
    }
    const homeMap = {
        'OPERACIONAL': 'home-operacional.html',
        'GESTAO': 'home-gestao.html',
        'VISUALIZACAO': 'home-visualizacao.html'
    };
    window.location.href = base + (homeMap[perfil] || 'home-gestao.html');
}

window.redirecionarParaHome = redirecionarParaHome;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPaginaAbrir();
        initPaginaListagem();
    });
} else {
    initPaginaAbrir();
    initPaginaListagem();
}