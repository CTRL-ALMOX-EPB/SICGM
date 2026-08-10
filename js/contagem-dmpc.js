// ============================================
// CÓDIGO ESPECÍFICO PARA PÁGINA DE CONTAGEM DMPC
// ============================================

// Verificar se estamos na página de contagem DMPC
if (document.getElementById('contagemForm')) {
    
    // ============================================
    // CONFIGURAÇÃO
    // ============================================
    
    const API_URL_CONTAGEM = 'https://fancy-unit-799b.alefe-gomes-72f.workers.dev';
    
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
    // VARIÁVEIS GLOBAIS
    // ============================================
    
    let materiaisDMPC = [];
    let todosRegistrosDB = [];
    let registrosCarregados = false;
    let enviandoDados = false;
    let cacheQuantidades = {};
    let codigosExistentesDB = new Set();
    
    // ============================================
    // PREENCHER DATA AUTOMATICAMENTE
    // ============================================
    
    const dataInput = document.getElementById('data');
    const dataFormatada = getDataBrasil();
    if (dataInput) dataInput.value = dataFormatada;
    
    // ============================================
    // CARREGAR DADOS DO USUÁRIO DA SESSÃO
    // ============================================
    
    function carregarDadosUsuarioSessao() {
        try {
            const sessao = sessionStorage.getItem('sessaoSICGM');
            
            if (sessao) {
                const dadosSessao = JSON.parse(sessao);
                
                const tempoDecorrido = Date.now() - dadosSessao.timestamp;
                if (tempoDecorrido > 30 * 60 * 1000) {
                    console.warn('⏰ Sessão expirada, redirecionando para login...');
                    window.location.href = 'login.html';
                    return false;
                }
                
                document.getElementById('nome').value = dadosSessao.nome || '';
                document.getElementById('matricula').value = dadosSessao.matricula || '';
                
                console.log('✅ Dados do usuário carregados da sessão:', dadosSessao.nome);
                return true;
            } else {
                console.warn('⚠️ Sessão não encontrada, tentando carregar do arquivo...');
                return carregarColaboradoresArquivo();
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados da sessão:', error);
            return carregarColaboradoresArquivo();
        }
    }
    
    async function carregarColaboradoresArquivo() {
        try {
            const response = await fetch('../data/colaboradores.txt');
            
            if (!response.ok) {
                throw new Error('Arquivo de colaboradores não encontrado');
            }
            
            const texto = await response.text();
            const linhas = texto.trim().split('\n');
            
            let usuarioEncontrado = null;
            
            for (let i = 0; i < linhas.length; i++) {
                const linha = linhas[i].trim();
                if (linha) {
                    if (linha.startsWith('*')) {
                        const partes = linha.replace('*', '').trim().split('\t');
                        if (partes.length >= 2) {
                            usuarioEncontrado = {
                                matricula: partes[0].trim(),
                                nome: partes[1].trim()
                            };
                            break;
                        }
                    }
                }
            }
            
            if (!usuarioEncontrado && linhas.length > 0) {
                const primeiraLinha = linhas[0].trim().replace('*', '').trim();
                const partes = primeiraLinha.split('\t');
                if (partes.length >= 2) {
                    usuarioEncontrado = {
                        matricula: partes[0].trim(),
                        nome: partes[1].trim()
                    };
                }
            }
            
            if (usuarioEncontrado) {
                document.getElementById('nome').value = usuarioEncontrado.nome;
                document.getElementById('matricula').value = usuarioEncontrado.matricula;
                console.log('✅ Dados do usuário carregados do arquivo:', usuarioEncontrado.nome);
                return true;
            } else {
                document.getElementById('nome').removeAttribute('readonly');
                document.getElementById('matricula').removeAttribute('readonly');
                console.warn('⚠️ Nenhum colaborador encontrado. Campos liberados para edição.');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar colaboradores:', error);
            document.getElementById('nome').removeAttribute('readonly');
            document.getElementById('matricula').removeAttribute('readonly');
            return false;
        }
    }
    
    // ============================================
    // CARREGAR MATERIAIS DO ARQUIVO contagem-dmpc.txt
    // ============================================
    
    async function carregarMateriaisDMPC() {
        try {
            const loadingDiv = document.getElementById('loading-materiais');
            if (loadingDiv) {
                loadingDiv.innerHTML = '⏳ Carregando materiais DMPC...';
                loadingDiv.style.display = 'block';
            }
            
            const response = await fetch('../data/contagem-dmpc.txt');
            
            if (!response.ok) {
                throw new Error('Arquivo contagem-dmpc.txt não encontrado');
            }
            
            const texto = await response.text();
            const linhas = texto.trim().split('\n');
            
            materiaisDMPC = [];
            
            // Pular cabeçalho
            for (let i = 1; i < linhas.length; i++) {
                const linha = linhas[i].trim();
                if (linha) {
                    const partes = linha.split('\t');
                    if (partes.length >= 2) {
                        const codigo = partes[0].trim();
                        const descricao = partes[1].trim();
                        
                        let und = 'UN';
                        try {
                            const materiaisResponse = await fetch('../data/materiais-proprios.txt');
                            if (materiaisResponse.ok) {
                                const materiaisTexto = await materiaisResponse.text();
                                const materiaisLinhas = materiaisTexto.trim().split('\n');
                                for (const mLinha of materiaisLinhas) {
                                    const mPartes = mLinha.trim().split('\t');
                                    if (mPartes.length >= 3 && mPartes[0].trim() === codigo) {
                                        und = mPartes[2].trim();
                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('⚠️ Não foi possível carregar UN do materiais-proprios.txt');
                        }
                        
                        materiaisDMPC.push({
                            codigo: codigo,
                            descricao: descricao,
                            und: und
                        });
                    }
                }
            }
            
            console.log(`📦 ${materiaisDMPC.length} materiais DMPC carregados`);
            
            await carregarTodosRegistros();
            renderizarMateriaisDMPC();
            
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar materiais DMPC:', error);
            const loadingDiv = document.getElementById('loading-materiais');
            if (loadingDiv) {
                loadingDiv.innerHTML = '❌ Erro ao carregar materiais: ' + error.message;
                loadingDiv.style.color = '#E53E3E';
            }
        }
    }
    
    // ============================================
    // CARREGAR TODOS OS REGISTROS DO BANCO
    // ============================================
    
    async function carregarTodosRegistros() {
        try {
            console.log('🔄 Carregando registros DMPC do banco...');
            const response = await fetch(`${API_URL_CONTAGEM}/api/dmpc/dados`);
            const resultados = await response.json();
            
            todosRegistrosDB = resultados.filter(r => r.ativo === 1 || r.ativo === true);
            
            codigosExistentesDB = new Set();
            todosRegistrosDB.forEach(item => {
                codigosExistentesDB.add(item.codigo);
            });
            
            console.log(`📊 Total de registros ativos DMPC: ${todosRegistrosDB.length}`);
            console.log(`📊 Códigos únicos no banco: ${codigosExistentesDB.size}`);
            
            registrosCarregados = true;
            return todosRegistrosDB;
            
        } catch (error) {
            console.error('❌ Erro ao carregar registros DMPC:', error);
            todosRegistrosDB = [];
            registrosCarregados = false;
            return [];
        }
    }
    
    // ============================================
    // RENDERIZAR MATERIAIS DMPC
    // ============================================
    
    function renderizarMateriaisDMPC() {
        const container = document.getElementById('materiais-container');
        if (!container) return;
        
        if (materiaisDMPC.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #A0AEC0;">
                    <p style="font-size: 3em;">📭</p>
                    <p>Nenhum material DMPC configurado para contagem</p>
                    <p style="font-size: 0.8em; margin-top: 10px;">Verifique o arquivo data/contagem-dmpc.txt</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        const tipoMaterial = 'material_proprio';
        
        materiaisDMPC.forEach((material, index) => {
            const idUnico = `dmpc-${index}`;
            
            // Verificar se já está registrado (qualquer data)
            const jaRegistrado = codigosExistentesDB.has(material.codigo);
            
            // Buscar última quantidade
            let ultimaQtd = 0;
            if (jaRegistrado) {
                const registro = todosRegistrosDB.find(r => r.codigo === material.codigo && r.ativo === 1);
                if (registro) {
                    ultimaQtd = registro.qtd || 0;
                }
            }
            
            html += `
                <div class="material-item dmpc-item" 
                     data-codigo="${material.codigo}" 
                     data-tipo="${tipoMaterial}" 
                     data-index="${index}"
                     data-ja-registrado="${jaRegistrado}">
                    <div class="material-header">
                        <span class="material-number">${material.codigo}</span>
                        ${jaRegistrado ? `<span class="badge-registrado">✅ Registrado</span>` : ''}
                    </div>
                    
                    <div class="material-row">
                        <div class="material-field">
                            <label>Código</label>
                            <input type="text" value="${material.codigo}" readonly class="input-readonly">
                        </div>
                        <div class="material-field">
                            <label>Descrição</label>
                            <input type="text" value="${material.descricao}" class="input-descricao" readonly>
                        </div>
                        <div class="material-field">
                            <label>UND</label>
                            <input type="text" value="${material.und}" readonly class="input-readonly">
                        </div>
                    </div>
                    
                    <div class="material-row material-row-qtd">
                        <div class="material-field">
                            <label>QTD *</label>
                            <input type="number" id="qtd-${idUnico}" step="0.01" min="0" placeholder="0.00" 
                                class="input-qtd" 
                                onchange="calcularDiferenca('${idUnico}', '${material.codigo}')"
                                onkeyup="if(this.value === '' || this.value === null) { document.getElementById('diferenca-${idUnico}').style.display = 'none'; }"
                                onblur="if(this.value === '' || this.value === null) { document.getElementById('diferenca-${idUnico}').style.display = 'none'; }">
                        </div>
                        <div class="material-field">
                            <label>Últ. Cont.</label>
                            <input type="text" id="qtd-anterior-${idUnico}" readonly 
                                class="input-readonly input-qtd-anterior" value="${ultimaQtd > 0 ? ultimaQtd : 'Carregando...'}">
                        </div>
                    </div>
                    
                    <div id="diferenca-${idUnico}" class="diferenca-indicador" style="display: none;"></div>
                    
                    <div class="material-row" style="margin-top: 10px;">
                        <div class="material-field" style="grid-column: 1 / -1;">
                            <label>Observação</label>
                            <input type="text" id="obs-${idUnico}" placeholder="Observação (opcional)" class="input-justificativa">
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Buscar quantidades anteriores para cada item
        setTimeout(() => {
            materiaisDMPC.forEach((material, index) => {
                const idUnico = `dmpc-${index}`;
                buscarQuantidadeAnterior(material.codigo, idUnico);
            });
        }, 200);
        
        atualizarContagemFiltro();
    }
    
    // ============================================
    // BUSCAR QUANTIDADE ANTERIOR
    // ============================================
    
    async function buscarQuantidadeAnterior(codigo, idUnico) {
        const inputAnterior = document.getElementById(`qtd-anterior-${idUnico}`);
        if (!inputAnterior || !codigo) return;
        
        const cacheKey = codigo;
        
        if (cacheQuantidades[cacheKey]) {
            const dados = cacheQuantidades[cacheKey];
            inputAnterior.value = dados.qtd || '0';
            inputAnterior.title = dados.data ? `Última contagem: ${formatarData(dados.data)}` : 'Nenhuma contagem anterior';
            inputAnterior.classList.add(dados.qtd ? 'tem-dado-anterior' : 'sem-dado-anterior');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL_CONTAGEM}/api/dmpc/contagem-anterior`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: codigo })
            });
            
            const resultado = await response.json();
            
            if (resultado.encontrado) {
                const qtdAnterior = resultado.qtd_anterior || '0';
                cacheQuantidades[cacheKey] = {
                    qtd: qtdAnterior,
                    data: resultado.data_anterior
                };
                inputAnterior.value = qtdAnterior;
                inputAnterior.title = `Última contagem: ${formatarData(resultado.data_anterior)}`;
                inputAnterior.classList.add('tem-dado-anterior');
                console.log(`📊 Contagem anterior para ${codigo}: ${qtdAnterior}`);
            } else {
                cacheQuantidades[cacheKey] = {
                    qtd: '0',
                    data: null
                };
                inputAnterior.value = '0';
                inputAnterior.title = 'Nenhuma contagem anterior encontrada';
                inputAnterior.classList.add('sem-dado-anterior');
            }
            
        } catch (error) {
            console.error('❌ Erro ao buscar quantidade anterior:', error);
            inputAnterior.value = '0';
            inputAnterior.title = 'Erro ao carregar';
            inputAnterior.classList.add('sem-dado-anterior');
        }
    }
    
    // ============================================
    // CALCULAR DIFERENÇA
    // ============================================
    
    function calcularDiferenca(idUnico, codigo) {
        const inputQtd = document.getElementById(`qtd-${idUnico}`);
        const inputAnterior = document.getElementById(`qtd-anterior-${idUnico}`);
        const diferencaDiv = document.getElementById(`diferenca-${idUnico}`);
        
        if (!inputQtd || !inputAnterior || !diferencaDiv) return;
        
        if (inputQtd.value === '' || inputQtd.value === null || inputQtd.value === undefined) {
            diferencaDiv.style.display = 'none';
            return;
        }
        
        const qtdAtual = parseFloat(inputQtd.value);
        const qtdAnterior = parseFloat(inputAnterior.value);
        
        if (isNaN(qtdAtual) || isNaN(qtdAnterior)) {
            diferencaDiv.style.display = 'none';
            return;
        }
        
        const diferenca = qtdAtual - qtdAnterior;
        
        if (qtdAnterior === 0 && qtdAtual > 0) {
            diferencaDiv.style.display = 'flex';
            diferencaDiv.className = 'diferenca-indicador diferenca-ok';
            diferencaDiv.innerHTML = `📝 Primeira contagem - QTD: ${qtdAtual.toFixed(2)}`;
        } else if (diferenca === 0) {
            diferencaDiv.style.display = 'flex';
            diferencaDiv.className = 'diferenca-indicador diferenca-igual';
            diferencaDiv.innerHTML = '✓ Sem alteração';
        } else if (diferenca > 0) {
            diferencaDiv.style.display = 'flex';
            diferencaDiv.className = 'diferenca-indicador diferenca-positiva';
            diferencaDiv.innerHTML = `▲ +${diferenca.toFixed(2)} a mais`;
        } else if (diferenca < 0) {
            diferencaDiv.style.display = 'flex';
            diferencaDiv.className = 'diferenca-indicador diferenca-negativa';
            diferencaDiv.innerHTML = `▼ ${diferenca.toFixed(2)} a menos`;
        } else {
            diferencaDiv.style.display = 'none';
        }
    }
    
    // ============================================
    // FORMATAR DATA
    // ============================================
    
    function formatarData(dataString) {
        if (!dataString) return '';
        const data = new Date(dataString + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    }
    
    // ============================================
    // FUNÇÕES DE FILTRO
    // ============================================
    
    function aplicarFiltro() {
        const texto = document.getElementById('filtro-texto').value.toLowerCase().trim();
        const tipo = document.getElementById('filtro-tipo').value;
        
        const items = document.querySelectorAll('.dmpc-item');
        let visiveis = 0;
        
        if (!texto) {
            items.forEach(item => {
                item.classList.remove('filtro-oculto');
                visiveis++;
            });
            document.getElementById('filtro-contagem').textContent = `Mostrando ${visiveis} itens`;
            return;
        }
        
        items.forEach(item => {
            let textoBusca = '';
            const codigo = item.dataset.codigo || '';
            const descricaoInput = item.querySelector('.input-descricao');
            const descricao = descricaoInput ? descricaoInput.value.toLowerCase() : '';
            
            switch(tipo) {
                case 'codigo':
                    textoBusca = codigo.toLowerCase();
                    break;
                case 'descricao':
                    textoBusca = descricao.toLowerCase();
                    break;
                case 'todos':
                default:
                    textoBusca = `${codigo} ${descricao}`.toLowerCase();
                    break;
            }
            
            if (textoBusca.includes(texto)) {
                item.classList.remove('filtro-oculto');
                visiveis++;
            } else {
                item.classList.add('filtro-oculto');
            }
        });
        
        document.getElementById('filtro-contagem').textContent = `Mostrando ${visiveis} itens`;
    }
    
    function limparFiltro() {
        document.getElementById('filtro-texto').value = '';
        document.getElementById('filtro-tipo').value = 'todos';
        aplicarFiltro();
        document.getElementById('filtro-texto').focus();
    }
    
    function atualizarContagemFiltro() {
        const items = document.querySelectorAll('.dmpc-item:not(.filtro-oculto)');
        document.getElementById('filtro-contagem').textContent = `Mostrando ${items.length} itens`;
    }
    
    // ============================================
    // ITEM FOI MODIFICADO
    // ============================================
    
    function itemFoiModificado(inputQtd) {
        if (!inputQtd) return false;
        
        const valor = inputQtd.value;
        if (valor === '' || valor === null || valor === undefined || valor.trim() === '') {
            return false;
        }
        
        const qtdAtual = parseFloat(valor);
        if (isNaN(qtdAtual)) return false;
        
        const item = inputQtd.closest('.dmpc-item');
        if (!item) return false;
        
        const qtdAnteriorInput = item.querySelector('.input-qtd-anterior');
        const qtdAnterior = parseFloat(qtdAnteriorInput?.value) || 0;
        
        return qtdAtual !== qtdAnterior;
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
    // ENVIAR FORMULÁRIO
    // ============================================
    
    document.getElementById('contagemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (enviandoDados) {
            mostrarToast('⏳ Aguarde o envio atual ser concluído...', 'aviso');
            return;
        }
        
        const botaoSubmit = e.target.querySelector('.submit-btn');
        const nome = document.getElementById('nome').value;
        const matricula = document.getElementById('matricula').value;
        const data = document.getElementById('data').value;
        
        if (!nome.trim()) {
            mostrarToast('❌ Por favor, preencha o nome!', 'erro');
            return;
        }
        
        // Coletar todos os itens modificados
        const materiaisParaEnviar = [];
        const items = document.querySelectorAll('.dmpc-item');
        
        items.forEach((item) => {
            const index = parseInt(item.dataset.index);
            if (isNaN(index)) return;
            
            const idUnico = `dmpc-${index}`;
            const qtdInput = document.getElementById(`qtd-${idUnico}`);
            
            if (!qtdInput) return;
            if (qtdInput.value === '' || qtdInput.value === null || qtdInput.value === undefined) {
                return;
            }
            
            const qtdAtual = parseFloat(qtdInput.value) || 0;
            const codigo = item.dataset.codigo;
            
            // Verificar se foi modificado ou é primeira contagem
            const foiModificado = itemFoiModificado(qtdInput);
            const jaRegistrado = item.dataset.jaRegistrado === 'true';
            
            // Se QTD = 0 e não existe no banco, pular
            if (qtdAtual === 0 && !jaRegistrado) {
                return;
            }
            
            // Se QTD = 0 e existe no banco, verificar se é igual à anterior
            if (qtdAtual === 0 && jaRegistrado) {
                const qtdAnteriorInput = item.querySelector('.input-qtd-anterior');
                const qtdAnterior = parseFloat(qtdAnteriorInput?.value) || 0;
                if (qtdAtual === qtdAnterior) {
                    return;
                }
            }
            
            // Se não foi modificado e já existe no banco, pular
            if (!foiModificado && jaRegistrado) {
                return;
            }
            
            // Se QTD = 0 e foi modificado (zerou), enviar
            if (qtdAtual === 0 && foiModificado) {
                // Enviar mesmo com 0 para registrar a zeragem
            }
            
            const descricaoInput = item.querySelector('.input-descricao');
            const descricao = descricaoInput ? descricaoInput.value : '';
            const undInput = item.querySelector('.input-readonly');
            const und = undInput ? undInput.value : 'UN';
            
            const obsInput = document.getElementById(`obs-${idUnico}`);
            const obs = obsInput ? obsInput.value : '';
            
            console.log(`✅ Material DMPC ${codigo} - SERÁ ENVIADO (QTD: ${qtdAtual})`);
            
            materiaisParaEnviar.push({
                nome: nome,
                matricula: matricula,
                data: data,
                codigo: codigo,
                descricao: descricao,
                und: und,
                qtd: qtdAtual,
                obs: obs || `Contagem DMPC - ${nome}`
            });
        });
        
        if (materiaisParaEnviar.length === 0) {
            mostrarToast('ℹ️ Nenhum item foi modificado. Nada para salvar.', 'info');
            return;
        }
        
        // ENVIAR
        try {
            enviandoDados = true;
            botaoSubmit.disabled = true;
            botaoSubmit.textContent = 'Enviando...';
            
            let totalContagem = 0;
            let erros = [];
            
            for (const material of materiaisParaEnviar) {
                console.log(`📤 Enviando ${material.codigo} para contagem DMPC...`);
                
                try {
                    const response = await fetch(`${API_URL_CONTAGEM}/api/dmpc/salvar`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(material)
                    });
                    
                    if (response.ok) {
                        const resultado = await response.json();
                        totalContagem++;
                        console.log(`✅ ${material.codigo} salvo na contagem DMPC (ID: ${resultado.id})`);
                        
                        // Marcar item como registrado
                        const item = document.querySelector(`.dmpc-item[data-codigo="${material.codigo}"]`);
                        if (item) {
                            item.dataset.jaRegistrado = 'true';
                            
                            // Adicionar badge
                            const header = item.querySelector('.material-header');
                            if (header && !header.querySelector('.badge-registrado')) {
                                const badge = document.createElement('span');
                                badge.className = 'badge-registrado';
                                badge.innerHTML = '✅ Registrado';
                                badge.style.cssText = `
                                    background: #48BB78;
                                    color: white;
                                    padding: 2px 10px;
                                    border-radius: 12px;
                                    font-size: 11px;
                                    font-weight: 600;
                                    margin-left: 10px;
                                `;
                                header.appendChild(badge);
                            }
                            
                            // Bloquear QTD
                            const qtdInput = item.querySelector('.input-qtd');
                            if (qtdInput) {
                                qtdInput.setAttribute('readonly', 'readonly');
                                qtdInput.classList.add('input-locked');
                                qtdInput.style.backgroundColor = '#EDF2F7';
                                qtdInput.style.cursor = 'not-allowed';
                            }
                        }
                        
                    } else {
                        const errorText = await response.text();
                        erros.push({
                            codigo: material.codigo,
                            erro: errorText
                        });
                        console.error(`❌ Erro ao salvar ${material.codigo}:`, errorText);
                    }
                    
                } catch (error) {
                    erros.push({
                        codigo: material.codigo,
                        erro: error.message
                    });
                    console.error(`❌ Erro ao salvar ${material.codigo}:`, error);
                }
            }
            
            let mensagem = `✅ ${totalContagem} item(ns) registrado(s) na contagem DMPC!`;
            
            if (erros.length > 0) {
                mensagem += ` ⚠️ ${erros.length} erro(s) ocorreram.`;
                mostrarToast(mensagem, 'aviso');
                console.log('📋 Detalhes dos erros:', erros);
            } else {
                mostrarToast(mensagem, 'sucesso');
            }
            
            cacheQuantidades = {};
            await carregarTodosRegistros();
            
        } catch (error) {
            console.error('❌ Erro:', error);
            mostrarToast(`❌ Erro de conexão: ${error.message}`, 'erro');
            
        } finally {
            enviandoDados = false;
            botaoSubmit.disabled = false;
            botaoSubmit.textContent = '📝 Registrar Contagem';
        }
    });
    
    // ============================================
    // POP-UP DE DESCRIÇÃO
    // ============================================
    
    const descricaoPopup = document.getElementById('descricao-popup');
    const popupOverlay = document.getElementById('popup-overlay');
    let popupTimeout = null;
    let popupInputAtual = null;
    
    function mostrarDescricaoPopup(input, texto, codigo) {
        if (!descricaoPopup) return;
        
        if (popupInputAtual === input && descricaoPopup.classList.contains('show')) {
            fecharDescricaoPopup();
            return;
        }
        
        if (popupTimeout) {
            clearTimeout(popupTimeout);
            popupTimeout = null;
        }
        
        if (!texto || texto.trim() === '') {
            fecharDescricaoPopup();
            return;
        }
        
        const rect = input.getBoundingClientRect();
        const popupWidth = Math.min(400, window.innerWidth - 40);
        
        let html = '';
        if (codigo) {
            html += `<span class="popup-titulo">📦 Código: ${codigo}</span>`;
        } else {
            html += `<span class="popup-titulo">📋 Descrição Completa</span>`;
        }
        html += `<span class="popup-texto">${texto}</span>`;
        
        descricaoPopup.innerHTML = html;
        descricaoPopup.className = 'descricao-popup show';
        
        let top = rect.top - 12;
        
        if (top - descricaoPopup.offsetHeight < 10) {
            top = rect.bottom + 12;
            descricaoPopup.classList.add('popup-bottom');
        } else {
            descricaoPopup.classList.remove('popup-bottom');
        }
        
        let left = rect.left + (rect.width / 2);
        const halfPopupWidth = Math.min(200, popupWidth / 2);
        if (left - halfPopupWidth < 10) {
            left = 10 + halfPopupWidth;
        } else if (left + halfPopupWidth > window.innerWidth - 10) {
            left = window.innerWidth - 10 - halfPopupWidth;
        }
        
        descricaoPopup.style.left = left + 'px';
        descricaoPopup.style.top = top + 'px';
        descricaoPopup.style.maxWidth = popupWidth + 'px';
        
        popupInputAtual = input;
        
        if (popupOverlay) {
            popupOverlay.classList.add('active');
        }
        
        if (popupTimeout) {
            clearTimeout(popupTimeout);
        }
        popupTimeout = setTimeout(() => {
            fecharDescricaoPopup();
        }, 5000);
    }
    
    function fecharDescricaoPopup() {
        if (descricaoPopup) {
            descricaoPopup.classList.remove('show');
        }
        if (popupOverlay) {
            popupOverlay.classList.remove('active');
        }
        if (popupTimeout) {
            clearTimeout(popupTimeout);
            popupTimeout = null;
        }
        popupInputAtual = null;
    }
    
    if (descricaoPopup && popupOverlay) {
        document.addEventListener('click', function(e) {
            const target = e.target;
            
            if (target.classList.contains('input-descricao') && target.readOnly) {
                const descricao = target.value;
                if (descricao && descricao.trim() !== '') {
                    const item = target.closest('.dmpc-item');
                    let codigo = '';
                    if (item) {
                        const codigoInput = item.querySelector('.input-readonly');
                        if (codigoInput) {
                            codigo = codigoInput.value || '';
                        }
                    }
                    mostrarDescricaoPopup(target, descricao, codigo);
                    e.stopPropagation();
                }
                return;
            }
            
            if (popupInputAtual) {
                const isPopupClick = descricaoPopup.contains(e.target);
                const isInputClick = popupInputAtual.contains(e.target);
                
                if (!isPopupClick && !isInputClick) {
                    fecharDescricaoPopup();
                }
            }
        });
        
        popupOverlay.addEventListener('click', function(e) {
            e.stopPropagation();
            fecharDescricaoPopup();
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                fecharDescricaoPopup();
            }
        });
        
        window.addEventListener('resize', function() {
            fecharDescricaoPopup();
        });
        
        window.addEventListener('scroll', function() {
            fecharDescricaoPopup();
        }, { passive: true });
    }
    
    window.mostrarDescricaoPopup = mostrarDescricaoPopup;
    window.fecharDescricaoPopup = fecharDescricaoPopup;
    
    // ============================================
    // INICIALIZAR
    // ============================================
    
    carregarDadosUsuarioSessao();
    carregarMateriaisDMPC();
    
    window.aplicarFiltro = aplicarFiltro;
    window.limparFiltro = limparFiltro;
    window.calcularDiferenca = calcularDiferenca;
    window.mostrarToast = mostrarToast;
    window.formatarData = formatarData;
    
} // FIM DO if (document.getElementById('contagemForm'))