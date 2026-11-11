// ============================================================
// SITA v2 — Etapa 3: Separado (documento.html — backoffice/gestão)
// ============================================================
window.Etapa3 = {
    doc: null,
    itens: [],
    nomeUsuario: '',

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];
        this.nomeUsuario = (typeof SitaAuth !== 'undefined' && SitaAuth.nome) ? SitaAuth.nome() : 'Usuário';

        const tag = docAtual.tag || 'EM_SEPARACAO';
        const tagLabel = tag === 'SEPARADO' ? '✓ SEPARADO' : '⏳ EM SEPARAÇÃO';
        const tagCls = tag === 'SEPARADO' ? 'tag-separado' : 'tag-em-separacao';

        const sistemicos = docAtual.sistemicos || [];
        const rmaBase = sistemicos.find(s => s.tipo === 'RMA' && s.subtipo === 'BASE');

        const subs = (docAtual.subetapas || []).filter(s => s.etapa === 3);
        const pendentes = subs.filter(s => !s.concluida && !s.ignorada);
        const podeAvancar = pendentes.length === 0;

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const souBackoffice = perfilUser === 'BACKOFFICE' || perfilUser === 'GESTAO';

        container.innerHTML = `
            <div class="e3-tag-wrap">
                <span class="e3-tag ${tagCls}">${tagLabel}</span>
                ${docAtual.separador ? `<span class="e3-sep">👷 Separador (matrícula): <strong>${docAtual.separador}</strong></span>` : ''}
            </div>

            <h3 class="etapa-titulo">📦 Etapa 3 — Separado</h3>

            <div class="e3-rma-box ${rmaBase ? 'ok' : 'pendente'}">
                <div class="e3-rma-title">
                    ${rmaBase ? '✅ RMA Base registrado' : '⚠️ RMA Base obrigatório'}
                </div>
                ${rmaBase ? `
                    <div class="e3-rma-info">
                        <span><strong>Nº:</strong> ${rmaBase.numero_documento}</span>
                        <span><strong>Data:</strong> ${rmaBase.data_documento || '—'}</span>
                        <span><strong>Por:</strong> ${rmaBase.registrado_por}</span>
                    </div>
                ` : `
                    <div class="e3-rma-hint">É necessário registrar o RMA base para avançar.</div>
                `}
            </div>

            <div class="e2-tabela-wrap" style="margin-top:1rem">
                <table class="e2-tabela">
                    <thead>
                        <tr>
                            <th style="width:36px">#</th>
                            <th style="width:110px">Código</th>
                            <th>Descrição</th>
                            <th style="width:50px">UN</th>
                            <th style="width:80px">QTD Base</th>
                            <th style="width:80px">Aditivo Saída</th>
                            <th style="width:90px">Separada</th>
                            <th style="width:90px">Pendente</th>
                            <th style="width:100px">Status</th>
                        </tr>
                    </thead>
                    <tbody id="e3Body"></tbody>
                </table>
            </div>

            <div class="e3-subetapas" id="e3Subetapas"></div>

            <div class="e3-footer">
                <button class="btn-acao btn-success" ${podeAvancar ? '' : 'disabled'} onclick="Etapa3.avancar()">
                    ➡️ Avançar para Conferência
                </button>
                ${!podeAvancar ? `<span class="e3-footer-hint">Conclua as subetapas obrigatórias.</span>` : ''}
            </div>
        `;

        this.renderItens();
        this.renderSubetapas();
    },

    renderItens() {
        const tbody = document.getElementById('e3Body');
        const arr = this.itens || [];
        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:#9ca3af">Nenhum item.</td></tr>`;
            return;
        }
        tbody.innerHTML = arr.map((it, idx) => `
            <tr data-id="${it.id}">
                <td style="text-align:center;color:#9ca3af">${idx + 1}</td>
                <td><input type="text" value="${it.codigo || ''}" readonly style="background:#f9fafb"></td>
                <td><input type="text" value="${(it.descricao || '').replace(/"/g, '&quot;')}" readonly style="background:#f9fafb"></td>
                <td><input type="text" value="${it.unidade || ''}" readonly style="background:#f9fafb;text-align:center"></td>
                <td><input type="number" value="${it.qtd_programada || 0}" readonly style="background:#f9fafb;text-align:right"></td>
                <td><input type="number" value="${it.qtd_aditivo_saida || 0}" readonly style="background:#f9fafb;text-align:right"></td>
                <td><input type="number" value="${it.qtd_separada || 0}" readonly style="background:#f9fafb;text-align:right" title="Só o separador responsável pode editar (na tela Separação)"></td>
                <td><input type="number" value="${it.qtd_pendente || 0}" readonly style="background:#f9fafb;text-align:right"></td>
                <td>${this.badgeStatus(it.status_item)}</td>
            </tr>
        `).join('');
    },

    badgeStatus(st) {
        const map = {
            'OK':        { cls: 'badge-ok',     label: '✓ OK' },
            'EXCEDE':    { cls: 'badge-excede', label: '⚠ Excede' },
            'FORA':      { cls: 'badge-fora',   label: '🚨 Fora' },
            'FALTA':     { cls: 'badge-falta',  label: '❌ Falta' },
            'ADITIVADO': { cls: 'badge-adit',   label: '➕ Aditivo' }
        };
        const b = map[st] || { cls: 'badge-pend', label: '—' };
        return `<span class="e2-badge ${b.cls}">${b.label}</span>`;
    },

    renderSubetapas() {
        const cont = document.getElementById('e3Subetapas');
        if (!cont) return;
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 3);
        if (subs.length === 0) { cont.innerHTML = ''; return; }

        const labels = {
            'ET3_REQUISITAR_SISTEMICO': '🧾 Requisitar material sistêmico (RMA base) — obrigatória',
            'ET3_ADITIVO_SAIDA':        '➕ Aditivo de saída — opcional (só BACKOFFICE/GESTÃO)',
            'ET3_DEVOLVER_LISTA_SISTEMA': '↩️ Devolver lista de separação — obrigatória (só separador)'
        };
        const acoes = {
            'ET3_REQUISITAR_SISTEMICO': `Etapa3.abrirModalRMA()`,
            'ET3_ADITIVO_SAIDA':        `Etapa3.abrirModalAditivo()`
        };

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const ehBackoffice = perfilUser === 'BACKOFFICE' || perfilUser === 'GESTAO';

        cont.innerHTML = `
            <h4 style="margin:1rem 0 .5rem;font-size:.9rem">⚙️ Subetapas</h4>
            ${subs.map(s => {
                const label = labels[s.codigo] || s.codigo;
                const acao = acoes[s.codigo];
                const restrita = s.codigo === 'ET3_DEVOLVER_LISTA_SISTEMA';
                const aditivoRestrito = s.codigo === 'ET3_ADITIVO_SAIDA' && !ehBackoffice;
                const bloqueada = restrita || aditivoRestrito;
                const opcional = s.codigo === 'ET3_ADITIVO_SAIDA';
                const ignorada = s.ignorada === 1;

                return `
                    <div class="subetapa ${s.concluida ? 'ok' : ''} ${ignorada ? 'ignorada' : ''} ${bloqueada ? 'restrita' : ''}">
                        <input type="checkbox" ${s.concluida ? 'checked' : ''} ${bloqueada ? 'disabled' : ''}
                            onchange="Etapa3.toggleSubetapa('${s.codigo}', this.checked)">
                        <span class="subetapa-label">${label}</span>
                        ${ignorada ? `<span class="subetapa-meta">⏭ Ignorada (não se aplica)</span>` : ''}
                        ${s.concluida ? `<span class="subetapa-meta">✓ ${s.concluida_por}</span>` : ''}
                        ${bloqueada && !s.concluida ? `<span class="subetapa-restrita">🔒 ${restrita ? 'Só separador' : 'Só backoffice'}</span>` : ''}
                        ${!s.concluida && !ignorada && acao && !bloqueada && s.codigo !== 'ET3_ADITIVO_SAIDA' ? `<button class="subetapa-btn" onclick="${acao}">Registrar</button>` : ''}
                        ${opcional && !s.concluida && !ignorada && ehBackoffice ? `
                            <button class="subetapa-btn" onclick="Etapa3.abrirModalAditivo()">Adicionar Aditivo</button>
                            <button class="subetapa-btn btn-ignorar" onclick="Etapa3.ignorar()">Não se aplica</button>
                        ` : ''}
                        ${ignorada ? `<button class="subetapa-btn btn-desfazer" onclick="Etapa3.reabrir('${s.codigo}')">Desfazer</button>` : ''}
                    </div>
                `;
            }).join('')}
        `;
    },

    async toggleSubetapa(codigo, marcar) {
        try {
            if (marcar) await SitaAPI.concluirSubetapa(this.doc.numero, codigo);
            else await SitaAPI.reabrirSubetapa(this.doc.numero, codigo);
            await this.recarregar();
        } catch (e) { alert(e.message); await this.recarregar(); }
    },

    async ignorar() {
        try {
            await SitaAPI._fetch(`/api/documentos/${this.doc.numero}/subetapas/ET3_ADITIVO_SAIDA/ignorar`, { method: 'POST' });
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    async reabrir(codigo) {
        try {
            await SitaAPI.reabrirSubetapa(this.doc.numero, codigo);
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    abrirModalRMA() {
        const sistemicos = this.doc.sistemicos || [];
        const rmaBase = sistemicos.find(s => s.tipo === 'RMA' && s.subtipo === 'BASE');
        if (rmaBase) { alert(`Já existe RMA base: ${rmaBase.numero_documento}`); return; }
        this._abrirModalSistemico('RMA', 'BASE', 'Registrar RMA Base (obrigatório)');
    },

    abrirModalAditivo() {
        this._abrirModalAditivoSaida();
    },

    _abrirModalSistemico(tipo, subtipo, titulo) {
        const antigo = document.getElementById('e3ModalSistemico');
        if (antigo) antigo.remove();

        const modal = document.createElement('div');
        modal.id = 'e3ModalSistemico';
        modal.className = 'sita-modal-overlay ativo';
        modal.innerHTML = `
            <div class="sita-modal">
                <div class="sita-modal-header">
                    <h3>${titulo}</h3>
                    <button onclick="document.getElementById('e3ModalSistemico').remove()">✕</button>
                </div>
                <div class="sita-modal-body">
                    <label>Nº do Documento *</label>
                    <input type="text" id="e3SistNumero" placeholder="Ex: 2601509345">
                    <label>Data</label>
                    <input type="date" id="e3SistData">
                    <label>Observação</label>
                    <textarea id="e3SistObs" rows="2" placeholder="Opcional"></textarea>
                </div>
                <div class="sita-modal-footer">
                    <button class="btn-acao btn-outline" onclick="document.getElementById('e3ModalSistemico').remove()">Cancelar</button>
                    <button class="btn-acao btn-primary" onclick="Etapa3.salvarSistemico('${tipo}', '${subtipo}')">💾 Registrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('e3SistNumero')?.focus(), 100);
    },

    async salvarSistemico(tipo, subtipo) {
        const numero = document.getElementById('e3SistNumero')?.value.trim();
        const data = document.getElementById('e3SistData')?.value;
        const obs = document.getElementById('e3SistObs')?.value.trim();
        if (!numero) { alert('Informe o nº do documento'); return; }
        try {
            await SitaAPI.criarSistemico(this.doc.numero, {
                tipo, subtipo, numero_documento: numero, data_documento: data || null, observacao: obs
            });
            document.getElementById('e3ModalSistemico')?.remove();
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    _abrirModalAditivoSaida() {
        const antigo = document.getElementById('e3ModalAditivo');
        if (antigo) antigo.remove();

        const modal = document.createElement('div');
        modal.id = 'e3ModalAditivo';
        modal.className = 'sita-modal-overlay ativo';
        modal.innerHTML = `
            <div class="sita-modal">
                <div class="sita-modal-header">
                    <h3>➕ Adicionar Aditivo de Saída</h3>
                    <button onclick="document.getElementById('e3ModalAditivo').remove()">✕</button>
                </div>
                <div class="sita-modal-body">
                    <label>Código do Material *</label>
                    <input type="text" id="e3AditCodigo" placeholder="Ex: 90395">
                    <label>Quantidade *</label>
                    <input type="number" id="e3AditQtd" step="any" min="0.01">
                    <label>Nº do Documento RMA *</label>
                    <input type="text" id="e3AditNumDoc" placeholder="Ex: 2601509345">
                    <label>Observação</label>
                    <textarea id="e3AditObs" rows="2" placeholder="Opcional"></textarea>
                </div>
                <div class="sita-modal-footer">
                    <button class="btn-acao btn-outline" onclick="document.getElementById('e3ModalAditivo').remove()">Cancelar</button>
                    <button class="btn-acao btn-primary" onclick="Etapa3.salvarAditivo()">💾 Adicionar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('e3AditCodigo')?.focus(), 100);
    },

    async salvarAditivo() {
        const codigo = document.getElementById('e3AditCodigo')?.value.trim();
        const quantidade = parseFloat(document.getElementById('e3AditQtd')?.value);
        const numero_documento = document.getElementById('e3AditNumDoc')?.value.trim();
        const observacao = document.getElementById('e3AditObs')?.value.trim();

        if (!codigo || !quantidade || !numero_documento) {
            alert('Preencha código, quantidade e nº do documento');
            return;
        }

        try {
            const resp = await SitaAPI._fetch(`/api/separacao/${this.doc.numero}/aditivo`, {
                method: 'POST',
                body: JSON.stringify({ codigo, quantidade, numero_documento, observacao })
            });
            document.getElementById('e3ModalAditivo')?.remove();
            await this.recarregar();
            const msg = resp.acao === 'SOMADO' ? 'somado ao item existente' : 'novo item criado';
            alert(`✅ Aditivo registrado (${msg})`);
        } catch (e) { alert(e.message); }
    },

    async avancar() {
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 3);
        const pendentes = subs.filter(s => !s.concluida && !s.ignorada);
        if (pendentes.length > 0) { alert('Conclua as subetapas obrigatórias antes de avançar.'); return; }
        try {
            await SitaAPI.avancar(this.doc.numero);
            location.reload();
        } catch (e) { alert(e.message); }
    },

    async recarregar() {
        const doc = await SitaAPI.buscar(this.doc.numero);
        this.doc = doc;
        this.itens = doc.itens || [];
        const cont = document.getElementById('tab-etapa');
        await this.render(cont, doc);
    }
};