// ============================================
// PERFIS.JS — Constantes compartilhadas
// Perfis + Departamentos + Matriz de acesso
// ============================================

window.PERFIS_SICGM = {
    GESTAO:       { id: 'GESTAO',       nome: 'Gestão',       cor: '#3d8bfd', descricao: 'Acesso total' },
    BACKOFFICE:   { id: 'BACKOFFICE',   nome: 'BackOffice',   cor: '#28a745', descricao: 'Igual ao operacional' },
    TECNICA:      { id: 'TECNICA',      nome: 'Técnica',      cor: '#6f42c1', descricao: 'Igual ao operacional, só DCMD' },
    SEPARADOR:    { id: 'SEPARADOR',    nome: 'Separador',    cor: '#ff9800', descricao: 'SITA + Contagem + Relatórios' },
    ESTORNADOR:   { id: 'ESTORNADOR',   nome: 'Estornador',   cor: '#e91e63', descricao: 'SITA + Contagem + Relatórios' },
    CONFERENTE:   { id: 'CONFERENTE',   nome: 'Conferente',   cor: '#00bcd4', descricao: 'Só SITA' },
    VISUALIZACAO: { id: 'VISUALIZACAO', nome: 'Visualização', cor: '#6b7a8f', descricao: 'Só leitura' }
};

window.DEPARTAMENTOS_SICGM = {
    GESTAO: { id: 'GESTAO', nome: 'GESTÃO', cor: '#3d8bfd', restrito: true },
    DCMD:   { id: 'DCMD',   nome: 'DCMD',   cor: '#3d8bfd', restrito: false },
    DMPC:   { id: 'DMPC',   nome: 'DMPC',   cor: '#28a745', restrito: false },
    DECP:   { id: 'DECP',   nome: 'DECP',   cor: '#ff9800', restrito: false },
    DEOP:   { id: 'DEOP',   nome: 'DEOP',   cor: '#6f42c1', restrito: false }
};

// Matriz de módulos por perfil
// edita: pode editar | le: só leitura | null: sem acesso
window.MATRIZ_ACESSO_SICGM = {
    sita: {
        GESTAO: 'edita', BACKOFFICE: 'edita', TECNICA: 'edita',
        SEPARADOR: 'edita', ESTORNADOR: 'edita', CONFERENTE: 'edita',
        VISUALIZACAO: 'le'
    },
    contagem: {
        GESTAO: 'edita', BACKOFFICE: 'edita', TECNICA: 'edita',
        SEPARADOR: 'edita', ESTORNADOR: 'edita', CONFERENTE: null,
        VISUALIZACAO: 'le'
    },
    relatorios: {
        GESTAO: 'edita', BACKOFFICE: 'edita', TECNICA: 'edita',
        SEPARADOR: 'edita', ESTORNADOR: 'edita', CONFERENTE: null,
        VISUALIZACAO: 'le'
    },
    programacao: {
        GESTAO: 'edita', BACKOFFICE: 'edita', TECNICA: null,
        SEPARADOR: null, ESTORNADOR: null, CONFERENTE: null,
        VISUALIZACAO: 'le'
    },
    despacho: {
        GESTAO: 'edita', BACKOFFICE: 'edita', TECNICA: null,
        SEPARADOR: null, ESTORNADOR: null, CONFERENTE: null,
        VISUALIZACAO: 'le'
    },
    pendencias: {
        GESTAO: 'edita', BACKOFFICE: 'edita', TECNICA: 'edita',
        SEPARADOR: null, ESTORNADOR: null, CONFERENTE: null,
        VISUALIZACAO: 'le'
    },
    admin: {
        GESTAO: 'edita', BACKOFFICE: null, TECNICA: null,
        SEPARADOR: null, ESTORNADOR: null, CONFERENTE: null,
        VISUALIZACAO: null
    }
};

// ============================================
// HELPERS
// ============================================
window.PerfisHelpers = {
    todosPerfis() { return Object.values(PERFIS_SICGM); },
    todosDepartamentos() { return Object.values(DEPARTAMENTOS_SICGM); },

    departamentosVisiveis(perfis) {
        const set = new Set();
        (perfis || []).forEach(p => {
            const isGestao = p.perfil === 'GESTAO';
            (p.departamentos || []).forEach(d => {
                if (isGestao || !DEPARTAMENTOS_SICGM[d]?.restrito) set.add(d);
            });
        });
        return Array.from(set);
    },

    gerarOptionsPerfis(valorSelecionado = '') {
        let html = '<option value="">Selecione...</option>';
        Object.values(PERFIS_SICGM).forEach(p => {
            const sel = p.id === valorSelecionado ? ' selected' : '';
            html += `<option value="${p.id}"${sel}>${p.nome}</option>`;
        });
        return html;
    },

    gerarOptionsDepartamentos(perfis, valorSelecionado = '') {
        const visiveis = this.departamentosVisiveis([{ perfil: 'GESTAO', departamentos: Object.keys(DEPARTAMENTOS_SICGM) }]);
        let html = '';
        visiveis.forEach(id => {
            const d = DEPARTAMENTOS_SICGM[id];
            if (!d) return;
            const sel = id === valorSelecionado ? ' selected' : '';
            html += `<option value="${id}"${sel}>${d.nome}</option>`;
        });
        return html;
    },

    podeAcessar(perfil, modulo) {
        const m = MATRIZ_ACESSO_SICGM[modulo];
        if (!m) return false;
        return !!m[perfil];
    },

    podeEditar(perfil, modulo) {
        const m = MATRIZ_ACESSO_SICGM[modulo];
        if (!m) return false;
        return m[perfil] === 'edita';
    },

    badgePerfil(perfilId) {
        const p = PERFIS_SICGM[perfilId];
        if (!p) return `<span class="badge-perfil">${perfilId}</span>`;
        return `<span class="badge-perfil" style="background:${p.cor}20;color:${p.cor};border:1px solid ${p.cor}">${p.nome}</span>`;
    },

    badgeDepartamento(deptoId) {
        const d = DEPARTAMENTOS_SICGM[deptoId];
        if (!d) return `<span class="badge-depto">${deptoId}</span>`;
        return `<span class="badge-depto" style="background:${d.cor}20;color:${d.cor};border:1px solid ${d.cor}">${d.nome}</span>`;
    },

    resumoPerfis(perfis) {
        if (!perfis || perfis.length === 0) return '—';
        return perfis.map(p => {
            const deptos = (p.departamentos || []).join(', ') || 'sem depto';
            return `${p.perfil} (${deptos})`;
        }).join(' · ');
    }
};

console.log('✅ perfis.js carregado');