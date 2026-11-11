// ============================================================
// SITA v2 — Etapa 2: Lista de Separação (= MGM Online)
// Réplica funcional do controles/formulario.html (MGM Online)
// + Navegação completa por teclado (←→↑↓, Enter, números em selects)
// ============================================================
window.Etapa2 = {
    doc: null,
    itens: [],
    codigosValidos: null,
    popupEl: null,
    nomeUsuario: '',

    async render(container, docAtual) {
        this.doc = docAtual;
        this.itens = docAtual.itens || [];
        this.nomeUsuario = (typeof SitaAuth !== 'undefined' && SitaAuth.nome) ? SitaAuth.nome() : 'Usuário';

        container.innerHTML = `
            <h3 class="etapa-titulo">📝 Etapa 2 — Lista de Separação</h3>

            <!-- ===== CABEÇALHO MGM ===== -->
            <div class="mgm-cabecalho">
                <div class="mgm-cab-row">
                    <div class="mgm-cab-col">
                        <label>👤 Separador</label>
                        <input type="text" id="e2Separador" value="${docAtual.separador || ''}" placeholder="Nome do separador">
                    </div>
                    <div class="mgm-cab-col">
                        <label>📅 Data de Separação</label>
                        <input type="date" id="e2DataSeparacao" value="${docAtual.data_separacao || ''}">
                    </div>
                    <div class="mgm-cab-col">
                        <label>🚚 Caminhão</label>
                        <input type="text" id="e2Caminhao" value="${docAtual.caminhao || ''}" placeholder="Placa ou identificação">
                    </div>
                </div>
                <div class="mgm-cab-row">
                    <div class="mgm-cab-col">
                        <label>👔 Encarregado</label>
                        <input type="text" id="e2Encarregado" value="${docAtual.encarregado || ''}" placeholder="Nome do encarregado">
                    </div>
                    <div class="mgm-cab-col">
                        <label>🆔 Matrícula</label>
                        <input type="text" id="e2Matricula" value="${docAtual.matricula_encarregado || ''}" placeholder="Matrícula" readonly style="background:#f9fafb">
                    </div>
                    <div class="mgm-cab-col">
                        <label>👥 Equipe</label>
                        <input type="text" id="e2Equipe" value="${docAtual.equipe_encarregado || ''}" placeholder="Equipe" readonly style="background:#f9fafb">
                    </div>
                </div>
                <div class="mgm-cab-row full">
                    <div class="mgm-cab-col">
                        <label>📝 Observação (Conferido / Expedição / Outros)</label>
                        <textarea id="e2Observacao" rows="2" placeholder="Ex: Conferido por: João / Expedição: Maria">${docAtual.obs_inicial || ''}</textarea>
                    </div>
                </div>
            </div>

            <!-- ===== AÇÕES DA LISTA ===== -->
            <div class="e2-actions">
                <input type="file" id="e2FileExcel" accept=".xlsx,.xls,.csv" style="display:none" onchange="Etapa2.importarExcel(event)">
                <button class="btn-acao btn-primary" onclick="document.getElementById('e2FileExcel').click()">
                    📥 Importar Excel
                </button>
                <button class="btn-acao btn-outline" onclick="Etapa2.adicionarLinha()">
                    ➕ Adicionar Item
                </button>
                <button class="btn-acao btn-outline" onclick="Etapa2.compararOrcamento()">
                    📊 Comparar com Orçamento
                </button>
                <span class="e2-info" id="e2Info">${this.itens.length} item(ns)</span>
            </div>

            <!-- ===== AÇÕES EM MASSA ===== -->
            <div class="bulk-actions-container" id="e2BulkActions"></div>

            <!-- ===== TABELA MGM ===== -->
            <div class="e2-tabela-wrap">
                <table class="e2-tabela">
                    <thead>
                        <tr>
                            <th style="width:36px">#</th>
                            <th style="width:100px">Código</th>
                            <th>Descrição</th>
                            <th style="width:50px">UN</th>
                            <th style="width:70px">QTD</th>
                            <th style="width:80px" class="col-mgm">Aditivo Saída</th>
                            <th style="width:80px" class="col-mgm">Aditivo Campo</th>
                            <th style="width:70px" class="col-mgm">RMA</th>
                            <th style="width:80px" class="col-mgm">Separada</th>
                            <th style="width:80px" class="col-mgm">Aplicada</th>
                            <th style="width:70px" class="col-mgm">DMA</th>
                            <th style="width:80px" class="col-mgm">Pendente</th>
                            <th style="width:90px">Status</th>
                            <th style="width:40px"></th>
                        </tr>
                    </thead>
                    <tbody id="e2Body"></tbody>
                </table>
            </div>

            <!-- ===== SUBETAPAS ===== -->
            <div class="e2-subetapas" id="e2Subetapas"></div>

            <!-- ===== AVISO DE COMPARAÇÃO ===== -->
            <div class="e2-aviso" id="e2Aviso"></div>
        `;

        this.renderItens();
        this.renderSubetapas();
        this.renderBulkActions();
        this.configurarCabecalho();
        this.carregarCodigosValidos();
        this.inicializarPopup();
    },

    configurarCabecalho() {
        const campos = [
            ['e2Separador', 'separador'],
            ['e2DataSeparacao', 'data_separacao'],
            ['e2Caminhao', 'caminhao'],
            ['e2Encarregado', 'encarregado'],
            ['e2Observacao', 'obs_inicial']
        ];
        campos.forEach(([id, campo]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', async () => {
                try { await SitaAPI.atualizar(this.doc.numero, { [campo]: el.value.trim() }); }
                catch (e) { alert('Erro ao salvar cabeçalho: ' + e.message); }
            });
        });
    },

    // ================== TABELA ==================
    renderItens() {
        const tbody = document.getElementById('e2Body');
        const arr = this.itens || [];

        if (arr.length === 0) {
            tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;padding:1.5rem;color:#9ca3af">
                Nenhum item. Importe um Excel ou adicione manualmente.
            </td></tr>`;
            document.getElementById('e2Info').textContent = '0 itens';
            return;
        }

        tbody.innerHTML = arr.map((it, idx) => `
            <tr data-id="${it.id}">
                <td style="text-align:center;color:#9ca3af">${idx + 1}</td>
                <td>
                    <input type="text" class="e2-input-codigo" value="${it.codigo || ''}"
                        oninput="Etapa2.aoDigitarCodigo(this, ${it.id})"
                        onblur="Etapa2.aoSairCodigo(this, ${it.id})">
                </td>
                <td>
                    <input type="text" class="e2-input-descricao" value="${(it.descricao || '').replace(/"/g, '&quot;')}"
                        readonly
                        onclick="Etapa2.mostrarPopup(this)">
                </td>
                <td>
                    <input type="text" class="e2-input-un" value="${it.unidade || ''}" readonly>
                </td>
                <td>
                    <input type="number" class="e2-input-qtd" value="${it.qtd_programada || 0}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_programada', parseFloat(this.value)||0)">
                </td>
                <td class="col-mgm">
                    <input type="number" class="e2-input-aditivo-saida" value="${it.qtd_aditivo_saida || 0}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_aditivo_saida', parseFloat(this.value)||0)">
                </td>
                <td class="col-mgm">
                    <input type="number" class="e2-input-aditivo-campo" value="${it.qtd_aditivo_campo || 0}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_aditivo_campo', parseFloat(this.value)||0)">
                </td>
                <td class="col-mgm">
                    <input type="number" class="e2-input-rma" value="${it.qtd_rma || ''}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_rma', parseFloat(this.value)||0)">
                </td>
                <td class="col-mgm">
                    <input type="number" class="e2-input-separada" value="${it.qtd_separada || ''}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_separada', parseFloat(this.value)||0)">
                </td>
                <td class="col-mgm">
                    <input type="number" class="e2-input-aplicada" value="${it.qtd_aplicada || ''}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_aplicada', parseFloat(this.value)||0)">
                </td>
                <td class="col-mgm">
                    <input type="number" class="e2-input-dma" value="${it.qtd_dma || ''}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_dma', parseFloat(this.value)||0)">
                </td>
                <td class="col-mgm">
                    <input type="number" class="e2-input-pendente" value="${it.qtd_pendente || ''}" step="any" min="0"
                        onchange="Etapa2.aoEditarCampo(${it.id}, 'qtd_pendente', parseFloat(this.value)||0)">
                </td>
                <td>${this.badgeStatus(it.status_item)}</td>
                <td>
                    <button class="e2-btn-remove" onclick="Etapa2.removerItem(${it.id})" title="Remover">✕</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('e2Info').textContent = `${arr.length} item(ns)`;
        this.configurarNavegacaoTeclado();
        this.configurarPasteEmMassa();
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

    // ================== CÓDIGOS VÁLIDOS ==================
    async carregarCodigosValidos() {
        if (this.codigosValidos) return;
        try {
            const texto = await SitaAPI.posicaoEstoque();
            const linhas = texto.split('\n').slice(1);
            const set = new Set();
            for (const l of linhas) {
                const cod = (l.split('\t')[0] || '').trim();
                if (cod) set.add(cod);
            }
            this.codigosValidos = set;
            console.log(`✅ ${set.size} códigos válidos`);
        } catch (e) {
            console.warn('⚠️ Não foi possível carregar posição de estoque:', e.message);
        }
    },

    aoDigitarCodigo(input, id) {
        input.style.borderColor = '';
        input.style.backgroundColor = '';
    },

    async aoSairCodigo(input, id) {
        const cod = input.value.trim();
        const it = this.itens.find(x => x.id === id);
        if (!it) return;
        it.codigo = cod;

        if (!cod) {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
            await this.salvarItem(id, { codigo: '' });
            return;
        }

        if (this.codigosValidos && !this.codigosValidos.has(cod)) {
            input.style.borderColor = '#ef4444';
            input.style.backgroundColor = '#fef2f2';
            alert(`❌ Código ${cod} não existe na posição de estoque`);
        } else {
            input.style.borderColor = '#22c55e';
            input.style.backgroundColor = '#f0fdf4';
            setTimeout(() => { input.style.borderColor = ''; input.style.backgroundColor = ''; }, 1200);
        }

        await this.salvarItem(id, { codigo: cod });
    },

    aoEditarCampo(id, campo, valor) {
        const it = this.itens.find(x => x.id === id);
        if (!it) return;
        it[campo] = valor;
        this.salvarItem(id, { [campo]: valor });
    },

    async salvarItem(id, body) {
        try {
            await SitaAPI.atualizarItem(this.doc.numero, id, body);
        } catch (e) {
            alert('Erro ao salvar item: ' + e.message);
        }
    },

    async adicionarLinha() {
        try {
            await SitaAPI.criarItem(this.doc.numero, {
                codigo: '', descricao: '', unidade: '', qtd_programada: 0
            });
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    async removerItem(id) {
        if (!confirm('Remover este item?')) return;
        try {
            await SitaAPI.removerItem(this.doc.numero, id);
            await this.recarregar();
        } catch (e) { alert(e.message); }
    },

    async recarregar() {
        const doc = await SitaAPI.buscar(this.doc.numero);
        this.doc = doc;
        this.itens = doc.itens || [];
        this.renderItens();
        this.renderSubetapas();
        this.renderBulkActions();
    },

    // ================== NAVEGAÇÃO POR TECLADO ==================
    configurarNavegacaoTeclado() {
        const tbody = document.getElementById('e2Body');
        if (!tbody) return;

        tbody.querySelectorAll('input, select').forEach(el => {
            el.removeEventListener('keydown', Etapa2._handleTeclado);
            el.addEventListener('keydown', Etapa2._handleTeclado);
        });
    },

    _handleTeclado(e) {
        const key = e.key;
        const target = e.target;
        if (!target || target.readOnly || target.disabled) return;
        if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') return;

        // 1) Enter — próxima linha, mesma coluna
        if (key === 'Enter') {
            e.preventDefault();
            const row = target.closest('tr');
            const nextRow = row.nextElementSibling;

            if (nextRow) {
                const cellIdx = Array.from(row.children).indexOf(target.closest('td'));
                const nextInput = nextRow.children[cellIdx]?.querySelector('input, select');
                if (nextInput) { nextInput.focus(); nextInput.select?.(); return; }
            }

            // Última linha → adiciona nova e foca mesma coluna
            const currentCol = Array.from(row.children).indexOf(target.closest('td'));
            Etapa2.adicionarLinha().then(() => {
                setTimeout(() => {
                    const tbody = document.getElementById('e2Body');
                    const rows = tbody.querySelectorAll('tr');
                    const lastRow = rows[rows.length - 1];
                    const lastInput = lastRow?.children[currentCol]?.querySelector('input');
                    if (lastInput) { lastInput.focus(); lastInput.select?.(); }
                }, 250);
            });
            return;
        }

        // 2) Setas ← → — navega horizontal (respeita cursor no texto)
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            // Se for input de texto/number, respeita posição do cursor
            if (target.tagName === 'INPUT') {
                try {
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const len = (target.value || '').length;
                    if (key === 'ArrowLeft' && start > 0) return;
                    if (key === 'ArrowRight' && end < len) return;
                } catch (_) { /* number input não tem selectionStart */ }
            }

            e.preventDefault();
            const row = target.closest('tr');
            const editaveis = Array.from(row.querySelectorAll('input:not([readonly]):not([disabled]), select:not([disabled])'));
            const idx = editaveis.indexOf(target);
            if (idx === -1) return;
            const nextIdx = idx + (key === 'ArrowRight' ? 1 : -1);
            if (nextIdx < 0 || nextIdx >= editaveis.length) return;
            const next = editaveis[nextIdx];
            next.focus();
            if (next.tagName === 'INPUT') next.select?.();
            return;
        }

        // 3) Setas ↑ ↓ — navega vertical (mesma coluna)
        if (key === 'ArrowUp' || key === 'ArrowDown') {
            e.preventDefault();
            const row = target.closest('tr');
            const cellIdx = Array.from(row.children).indexOf(target.closest('td'));
            const targetRow = key === 'ArrowUp' ? row.previousElementSibling : row.nextElementSibling;
            if (targetRow) {
                const nextInput = targetRow.children[cellIdx]?.querySelector('input, select');
                if (nextInput) { nextInput.focus(); nextInput.select?.(); }
            }
            return;
        }

        // 4) Números 1-9 em <select> — escolhe opção direta
        if (target.tagName === 'SELECT' && /^[1-9]$/.test(key)) {
            e.preventDefault();
            const num = parseInt(key, 10);
            const options = Array.from(target.options);
            if (num - 1 < options.length) {
                target.selectedIndex = num - 1;
                target.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return;
        }
    },

    // ================== PASTE EM MASSA ==================
    configurarPasteEmMassa() {
        const tbody = document.getElementById('e2Body');
        if (!tbody) return;
        tbody.querySelectorAll('input').forEach(inp => {
            if (inp.classList.contains('e2-input-descricao') || inp.classList.contains('e2-input-un')) return;
            if (inp._pasteOk) return;
            inp._pasteOk = true;
            inp.addEventListener('paste', Etapa2._handlePasteMassa);
        });
    },

    _handlePasteMassa(e) {
        const target = e.target;
        if (!target || target.readOnly) return;
        const dados = e.clipboardData || window.clipboardData;
        if (!dados) return;
        const texto = dados.getData('text/plain');
        if (!texto || texto.trim() === '') return;
        const linhas = texto.split('\n').filter(l => l.trim() !== '');
        if (linhas.length <= 1) return;

        e.preventDefault();
        Etapa2._aplicarPaste(linhas, target);
    },

    async _aplicarPaste(linhas, elementoAlvo) {
        const tbody = document.getElementById('e2Body');
        const rowAlvo = elementoAlvo.closest('tr');
        const colIdx = Array.from(rowAlvo.children).indexOf(elementoAlvo.closest('td'));

        // Mapeamento: coluna → campo do item
        const mapColToField = {
            1: 'codigo',
            4: 'qtd_programada',
            5: 'qtd_aditivo_saida',
            6: 'qtd_aditivo_campo',
            7: 'qtd_rma',
            8: 'qtd_separada',
            9: 'qtd_aplicada',
            10: 'qtd_dma',
            11: 'qtd_pendente'
        };
        const campo = mapColToField[colIdx];
        if (!campo) { alert('Cole em uma coluna editável (código, qtd, rma, separada, etc.)'); return; }

        // Posição inicial: se a célula alvo estiver vazia, começa nela; senão, adiciona novas linhas
        let idxRow = Array.from(tbody.querySelectorAll('tr')).indexOf(rowAlvo);
        const valorAtual = elementoAlvo.value.trim();
        if (valorAtual !== '') idxRow++;

        // Adiciona linhas se faltar
        const linhasAtuais = tbody.querySelectorAll('tr').length;
        const precisamos = (idxRow + linhas.length) - linhasAtuais;
        for (let k = 0; k < precisamos; k++) {
            await this.adicionarLinha();
        }

        // Recarrega e aplica valores
        await this.recarregar();
        const rows = document.getElementById('e2Body').querySelectorAll('tr');

        let cont = 0;
        for (let i = 0; i < linhas.length; i++) {
            const valor = linhas[i].trim();
            if (!valor) continue;
            const row = rows[idxRow + i];
            if (!row) continue;
            const itemId = parseInt(row.dataset.id);
            let valorFinal = valor;
            if (['qtd_programada','qtd_aditivo_saida','qtd_aditivo_campo','qtd_rma','qtd_separada','qtd_aplicada','qtd_dma','qtd_pendente'].includes(campo)) {
                const num = parseFloat(valor.replace(',', '.').replace(/[^\d.-]/g, ''));
                valorFinal = isNaN(num) ? 0 : num;
            } else if (campo === 'codigo') {
                valorFinal = valor.replace(/[^0-9]/g, '');
            }
            await SitaAPI.atualizarItem(this.doc.numero, itemId, { [campo]: valorFinal });
            cont++;
        }
        await this.recarregar();
        alert(`✅ ${cont} valor(es) colados`);
    },

    // ================== POPUP DE DESCRIÇÃO ==================
    inicializarPopup() {
        let popup = document.getElementById('e2PopupDesc');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'e2PopupDesc';
            popup.className = 'e2-popup-desc';
            document.body.appendChild(popup);
        }
        this.popupEl = popup;

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.e2-input-descricao') && !e.target.closest('.e2-popup-desc')) {
                this.fecharPopup();
            }
        });
    },

    mostrarPopup(input) {
        const descricao = input.value.trim();
        if (!descricao) return;
        const rect = input.getBoundingClientRect();
        const popup = this.popupEl;
        popup.textContent = descricao;
        popup.style.left = Math.min(rect.left, window.innerWidth - 420) + 'px';
        popup.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        popup.style.display = 'block';
    },

    fecharPopup() {
        if (this.popupEl) this.popupEl.style.display = 'none';
    },

    // ================== AÇÕES EM MASSA ==================
    renderBulkActions() {
        const cont = document.getElementById('e2BulkActions');
        if (!cont) return;
        if (this.doc.etapa_atual !== 2) { cont.innerHTML = ''; return; }

        cont.innerHTML = `
            <span class="bulk-title">⚡ Ações em Massa</span>
            <div class="bulk-row">
                <label>RMA:</label>
                <input type="number" id="e2BulkRma" step="any" min="0" placeholder="0" style="width:80px">
                <button class="bulk-btn" onclick="Etapa2.aplicarBulk('qtd_rma', 'e2BulkRma')">Aplicar</button>
            </div>
            <div class="bulk-row">
                <label>Separada:</label>
                <input type="number" id="e2BulkSeparada" step="any" min="0" placeholder="0" style="width:80px">
                <button class="bulk-btn" onclick="Etapa2.aplicarBulk('qtd_separada', 'e2BulkSeparada')">Aplicar</button>
            </div>
            <div class="bulk-row">
                <label>Aplicada:</label>
                <input type="number" id="e2BulkAplicada" step="any" min="0" placeholder="0" style="width:80px">
                <button class="bulk-btn" onclick="Etapa2.aplicarBulk('qtd_aplicada', 'e2BulkAplicada')">Aplicar</button>
            </div>
            <button class="bulk-btn-danger" onclick="Etapa2.limparQtds()">🧹 Limpar Qtds</button>
        `;
    },

    async aplicarBulk(campo, inputId) {
        const val = parseFloat(document.getElementById(inputId)?.value);
        if (isNaN(val)) { alert('Digite um valor'); return; }
        if (!confirm(`Aplicar ${val} em todos os itens?`)) return;

        for (const it of this.itens) {
            await SitaAPI.atualizarItem(this.doc.numero, it.id, { [campo]: val });
        }
        await this.recarregar();
    },

    async limparQtds() {
        if (!confirm('Limpar todas as quantidades (RMA, Separada, Aplicada, DMA, Pendente)?')) return;
        for (const it of this.itens) {
            await SitaAPI.atualizarItem(this.doc.numero, it.id, {
                qtd_rma: 0, qtd_separada: 0, qtd_aplicada: 0, qtd_dma: 0, qtd_pendente: 0
            });
        }
        await this.recarregar();
    },

    // ================== IMPORT EXCEL ==================
    async importarExcel(event) {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        if (typeof XLSX === 'undefined') { alert('❌ Biblioteca de Excel não carregada.'); return; }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });
            let sheetName = workbook.SheetNames.find(n => {
                const norm = n.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                return norm.includes('MGM') || norm.includes('FORM');
            }) || workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

            if (!raw || raw.length < 3) { alert('❌ Planilha vazia.'); return; }

            const norm = (v) => String(v || '').toUpperCase().normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');

            // Cabeçalho do documento (obra, separador, etc.)
            const cabecalho = this.extrairCabecalho(raw, norm);
            if (cabecalho.obra) {
                await SitaAPI.atualizar(this.doc.numero, {
                    obra: cabecalho.obra,
                    separador: cabecalho.separador || this.doc.separador,
                    data_separacao: cabecalho.data_separacao || this.doc.data_separacao,
                    encarregado: cabecalho.encarregado || this.doc.encarregado,
                    caminhao: cabecalho.caminhao || this.doc.caminhao,
                    obs_inicial: cabecalho.observacao || this.doc.obs_inicial
                });
            }

            // Localiza cabeçalho da tabela
            let headerRow = -1, headerNorm = [];
            for (let i = 0; i < Math.min(raw.length, 20); i++) {
                const rn = (raw[i] || []).map(c => norm(c));
                if (rn.some(h => h === 'CODIGO' || h.startsWith('CODIGO'))) {
                    headerRow = i; headerNorm = rn; break;
                }
            }
            if (headerRow === -1) { alert('❌ Cabeçalho (CÓDIGO) não encontrado.'); return; }

            const findCol = (preds) => {
                for (const p of preds) {
                    const i = headerNorm.findIndex(h => p(h));
                    if (i !== -1) return i;
                }
                return -1;
            };
            const col = {
                codigo:    findCol([h => h === 'CODIGO', h => h.startsWith('CODIGO')]),
                descricao: findCol([h => h.startsWith('DESCRI')]),
                unidade:   findCol([h => h === 'UNIDADE', h => h.startsWith('UNIDADE'), h => h === 'UND', h => h === 'UN']),
                rma:       findCol([h => h.includes('RMA')]),
                separada:  findCol([h => h.includes('SEPARADA')]),
                aplicada:  findCol([h => h.includes('APLICADA')]),
                aditivoSaida: findCol([h => h.includes('ADITIVO') && (h.includes('SAIDA') || h.includes('SA'))]),
                aditivoCampo: findCol([h => h.includes('ADITIVO') && h.includes('CAMPO')]),
                dma:       findCol([h => h.includes('DMA') && !h.includes('SUCATA')]),
                pendente:  findCol([h => h.includes('PENDENTE')])
            };
            if (col.codigo === -1) col.codigo = 1;

            const parseNum = (v) => {
                if (v === undefined || v === null || v === '') return 0;
                if (typeof v === 'number') return v;
                const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, ''));
                return isNaN(n) ? 0 : n;
            };

            const itens = [];
            for (let i = headerRow + 1; i < raw.length; i++) {
                const row = raw[i] || [];
                const codRaw = String(row[col.codigo] || '').trim();
                if (!codRaw) continue;
                if (norm(codRaw) === 'CODIGO') continue;
                const cod = codRaw.replace(/[^0-9]/g, '');
                if (!cod) continue;
                itens.push({
                    codigo: cod,
                    descricao: col.descricao !== -1 ? String(row[col.descricao] || '').trim() : '',
                    unidade: col.unidade !== -1 ? String(row[col.unidade] || '').trim() : '',
                    qtd_programada: col.rma !== -1 ? parseNum(row[col.rma]) : 0,
                    qtd_rma: col.rma !== -1 ? parseNum(row[col.rma]) : 0,
                    qtd_separada: col.separada !== -1 ? parseNum(row[col.separada]) : 0,
                    qtd_aplicada: col.aplicada !== -1 ? parseNum(row[col.aplicada]) : 0,
                    qtd_aditivo_saida: col.aditivoSaida !== -1 ? parseNum(row[col.aditivoSaida]) : 0,
                    qtd_aditivo_campo: col.aditivoCampo !== -1 ? parseNum(row[col.aditivoCampo]) : 0,
                    qtd_dma: col.dma !== -1 ? parseNum(row[col.dma]) : 0,
                    qtd_pendente: col.pendente !== -1 ? parseNum(row[col.pendente]) : 0
                });
            }

            if (itens.length === 0) { alert('⚠️ Nenhum item válido.'); return; }

            await SitaAPI.criarItensBulk(this.doc.numero, itens);
            await this.recarregar();
            alert(`✅ ${itens.length} itens importados!`);
        } catch (e) {
            console.error(e);
            alert('❌ Erro ao importar: ' + e.message);
        }
    },

    extrairCabecalho(raw, norm) {
        const res = {};
        const isRotulo = (v) => /SEPARADOR|ENCARREGADO|CAMINHAO|PROGRAMACAO|OBRA|MATRICULA|CONFERIDO|EXPEDICAO|OBS/.test(norm(v));
        const isCabecalho = (v) => /^(ITEM|CODIGO|DESCRICAO|UNIDADE|ADITIVO|QTDRMA|QTDSEPARADA|QTDAPLICADA|QTDDMA|QTDPENDENTE)/.test(norm(v));

        for (let i = 0; i < Math.min(raw.length, 5); i++) {
            const row = raw[i] || [];
            for (let c = 0; c < row.length; c++) {
                const cel = String(row[c] || '').trim();
                const celN = norm(cel);

                if (celN.includes('SEPARADOR') && !res.separador) {
                    res.separador = this._proxValor(row, c, isRotulo, isCabecalho);
                }
                if (celN.includes('ENCARREGADO') && !res.encarregado) {
                    res.encarregado = this._proxValor(row, c, isRotulo, isCabecalho);
                }
                if (celN.includes('CAMINHAO') && !res.caminhao) {
                    res.caminhao = this._proxValor(row, c, isRotulo, isCabecalho);
                }
                if (celN.includes('NROBRA') || celN.includes('NUMOBRA')) {
                    const v = this._proxValor(row, c, isRotulo, isCabecalho);
                    if (v && /^\d+$/.test(v)) res.obra = v;
                }
            }
        }
        return res;
    },

    _proxValor(row, colIdx, isRotulo, isCabecalho) {
        for (let d = 1; d <= 3; d++) {
            const v = String(row[colIdx + d] || '').trim();
            if (v && !isRotulo(v) && !isCabecalho(v)) return v;
        }
        return '';
    },

    // ================== COMPARAR ORÇAMENTO ==================
    async compararOrcamento() {
        if (this.itens.length === 0) { alert('Adicione itens antes de comparar.'); return; }
        try {
            const resp = await SitaAPI._fetch(`/api/documentos/${this.doc.numero}/comparar-orcamento`, { method: 'POST' });
            await this.recarregar();
            this.renderAvisoComparacao(resp.resumo);
        } catch (e) { alert(e.message); }
    },

    renderAvisoComparacao(r) {
        const av = document.getElementById('e2Aviso');
        if (!av) return;
        av.innerHTML = `
            <div class="e2-resumo">
                <strong>📊 Comparação com orçamento:</strong>
                <span class="badge-ok">✓ ${r.ok} OK</span>
                <span class="badge-excede">⚠ ${r.excede} excedem</span>
                <span class="badge-fora">🚨 ${r.fora} fora do orçamento</span>
            </div>
        `;
    },

    // ================== SUBETAPAS ==================
    renderSubetapas() {
        const cont = document.getElementById('e2Subetapas');
        if (!cont) return;
        const subs = (this.doc.subetapas || []).filter(s => s.etapa === 2);
        if (subs.length === 0) { cont.innerHTML = ''; return; }

        cont.innerHTML = `
            <h4 style="margin:1rem 0 .5rem;font-size:.9rem">⚙️ Subetapas</h4>
            ${subs.map(s => {
                const def = (SITA_CONFIG.SUBETAPAS[2] || []).find(x => x.codigo === s.codigo);
                const label = def?.label || s.codigo;
                return `
                    <div class="subetapa ${s.concluida ? 'ok' : ''}">
                        <input type="checkbox" ${s.concluida ? 'checked' : ''}
                            onchange="Etapa2.toggleSubetapa('${s.codigo}', this.checked)">
                        <span class="subetapa-label">${label}</span>
                        ${s.concluida ? `<span class="subetapa-meta">✓ ${s.concluida_por}</span>` : ''}
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
        } catch (e) { alert(e.message); }
    }
};