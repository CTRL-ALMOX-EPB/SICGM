// ============================================================
// SITA v2 — Etapa 4: Conferência
// Só o conferente (ou GESTAO) pode confirmar
// ============================================================
window.Etapa4 = {
    doc: null,
    itens: [],
    nomeUsuario: '',

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];
        this.nomeUsuario = (typeof SitaAuth !== 'undefined' && SitaAuth.nome) ? SitaAuth.nome() : 'Usuário';

        const jaConferido = !!(docAtual.conferente && docAtual.data_conferencia);
        const tag = docAtual.tag || 'SEPARADO';
        const tagLabel = jaConferido ? '✓ CONFERIDO' : '🔍 AGUARDANDO CONFERÊNCIA';
        const tagCls = jaConferido ? 'tag-conferido' : 'tag-aguardando';

        const perfilUser = (SitaAuth.perfil && SitaAuth.perfil() || '').toUpperCase();
        const podeConferir = !jaConferido && (perfilUser === 'GESTAO' || perfilUser === 'CONFERENTE');

        // Subetapas (não existem na etapa 4 — é 1 check só)
        const subs = (docAtual.subetapas || []).filter(s => s.etapa === 4);
        const todasOk = subs.length === 0 || subs.every(s => s.concluida);
        const podeAvancar = jaConferido && todasOk;

        container.innerHTML = `
            <div class="e3-tag-wrap">
                <span class="e3-tag ${tagCls}">${tagLabel}</span>
                ${docAtual.separador ? `<span class="e3-sep">👷 Separador: <strong>${docAtual.separador}</strong></span>` : ''}
            </div>

            <h3 class="etapa-titulo">🔍 Etapa 4 — Conferência</h3>

            <!-- ===== PAINEL DE CONFERÊNCIA ===== -->
            ${jaConferido ? `
                <div class="e4-confirmado-box">
                    <div class="e4-confirmado-title">✅ Conferência confirmada</div>
                    <div class="e4-confirmado-info">
                        <span><strong>Conferente:</strong> ${docAtual.conferente}</span>
                        <span><strong>Data:</strong> ${new Date(docAtual.data_conferencia).toLocaleString('pt-BR')}</span>
                    </div>
                </div>
            ` : podeConferir ? `
                <div class="e4-aguardando-box">
                    <div class="e4-aguardando-title">🔍 Conferência pendente</div>
                    <div class="e4-aguardando-hint">
                        Confira os itens abaixo. Ao confirmar, o documento será marcado como <strong>CONFERIDO</strong> e ficará pronto para expedição.
                    </div>
                    <button class="btn-acao btn-primary e4-btn-confirmar" onclick="Etapa4.confirmar()">
                        🔍 Confirmar Conferência
                    </button>
                </div>
            ` : `
                <div class="e4-bloqueado-box">
                    <div class="e4-bloqueado-title">🔒 Aguardando o conferente</div>
                    <div class="e4-bloqueado-hint">
                        Apenas o conferente responsável ou a GESTÃO podem confirmar esta etapa.
                    </div>
                </div>
            `}

            <!-- ===== TABELA DE CONFERÊNCIA ===== -->
            <div class="e2-tabela-wrap" style="margin-top:1rem">
                <table class="e2-tabela">
                    <thead>
                        <tr>
                            <th style="width:36px">#</th>
                            <th style="width:110px">Código</th>
                            <th>Descrição</th>
                            <th style="width:50px">UN</th>
                            <th style="width:80px">QTD</th>
                            <th style="width:90px">RMA</th>
                            <th style="width:90px">Separada</th>
                            <th style="width:100px">Status</th>
                        </tr>
                    </thead>
                    <tbody id="e4Body"></tbody>
                </table>
            </div>

            <!-- ===== AVANÇAR ===== -->
            <div class="e3-footer">
                <button class="btn-acao btn-success" ${podeAvancar ? '' : 'disabled'} onclick="Etapa4.avancar()">
                    ➡️ Avançar para Expedido
                </button>
                ${!podeAvancar ? `<span class="e3-footer-hint">Confirme a conferência primeiro.</span>` : ''}
            </div>
        `;

        this.renderItens();
    },

    renderItens() {
        const tbody = document.getElementById('e4Body');
        const arr = this.itens || [];
        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:#9ca3af">
                Nenhum item no documento.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = arr.map((it, idx) => `
            <tr data-id="${it.id}">
                <td style="text-align:center;color:#9ca3af">${idx + 1}</td>
                <td><input type="text" value="${it.codigo || ''}" readonly style="background:#f9fafb"></td>
                <td><input type="text" value="${(it.descricao || '').replace(/"/g, '&quot;')}" readonly style="background:#f9fafb"></td>
                <td><input type="text" value="${it.unidade || ''}" readonly style="background:#f9fafb;text-align:center"></td>
                <td><input type="number" value="${it.qtd_programada || 0}" readonly style="background:#f9fafb;text-align:right"></td>
                <td><input type="number" value="${it.qtd_rma || 0}" readonly style="background:#f9fafb;text-align:right"></td>
                <td><input type="number" value="${it.qtd_separada || 0}" readonly style="background:#f9fafb;text-align:right"></td>
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

    async confirmar() {
        if (!confirm('🔍 Confirmar a conferência deste documento?\n\nApós confirmar, o documento vai para EXPEDIDO e só a GESTÃO poderá reverter.')) return;
        try {
            const resp = await SitaAPI._fetch(`/api/documentos/${this.doc.numero}/confirmar-conferencia`, { method: 'POST' });
            alert(`✅ Conferência confirmada por ${resp.conferente}`);
            await this.recarregar();
        } catch (e) { alert('❌ ' + e.message); }
    },

    async avancar() {
        if (!this.doc.conferente || !this.doc.data_conferencia) {
            alert('Confirme a conferência primeiro.');
            return;
        }
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