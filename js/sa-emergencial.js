// ============================================
// S.A. EMERGENCIAL - JavaScript
// ============================================

// Configuração - URL REAL DA SUA API
const SA_CONFIG = {
    API_URL: 'https://fancy-unit-799b.alefe-gomes-72f.workers.dev/api',
    colaboradoresPath: '../data/colaboradores-s-a.txt',
    materiaisPath: '../data/materiais-proprios.txt',
    usuariosAutorizadosPath: '../data/usuarios-autorizados.txt'
};

// ============================================
// CLASS S.A. MANAGER
// ============================================
class SAManager {
    constructor() {
        this.dados = null;
        this.usuarioAtual = null;
        this.saAtual = null;
        this.signaturePad = null;
        this.tipoAssinatura = null;
    }

    // ============================================
    // CONSULTAS LOCAIS (arquivos .txt)
    // ============================================

    async verificarPermissaoGerar(usuario) {
        try {
            const response = await fetch(SA_CONFIG.usuariosAutorizadosPath);
            const data = await response.text();
            const linhas = data.split('\n').filter(line => line.trim());
            
            for (const linha of linhas) {
                const colunas = linha.split('\t').map(c => c.trim());
                if (colunas.length >= 4) {
                    const nomeArquivo = colunas[1].toUpperCase();
                    if (nomeArquivo === usuario.nome.toUpperCase()) {
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.error('Erro ao verificar permissão:', error);
            throw new Error('Erro ao verificar permissão do usuário');
        }
    }

    async buscarUsuarioAutorizado(nome) {
        try {
            const response = await fetch(SA_CONFIG.usuariosAutorizadosPath);
            const data = await response.text();
            const linhas = data.split('\n').filter(line => line.trim());
            
            for (const linha of linhas) {
                const colunas = linha.split('\t').map(c => c.trim());
                if (colunas.length >= 4) {
                    const nomeArquivo = colunas[1].toUpperCase();
                    if (nomeArquivo === nome.toUpperCase()) {
                        return {
                            matricula: colunas[0],
                            nome: colunas[1],
                            cpf: colunas[2],
                            funcao: colunas[3]
                        };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar usuário autorizado:', error);
            throw new Error('Erro ao buscar usuário autorizado');
        }
    }

    async buscarColaborador(matricula) {
        try {
            const response = await fetch(SA_CONFIG.colaboradoresPath);
            const data = await response.text();
            const linhas = data.split('\n').filter(line => line.trim());
            
            for (let i = 1; i < linhas.length; i++) {
                const colunas = linhas[i].split('\t').map(c => c.trim());
                if (colunas[1] === matricula) {
                    return {
                        filial: colunas[0],
                        matricula: colunas[1],
                        colaborador: colunas[2],
                        cpf: colunas[3],
                        centroCusto: colunas[4],
                        funcao: colunas[5]
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar colaborador:', error);
            throw new Error('Erro ao buscar colaborador');
        }
    }

    async buscarMaterial(codigo) {
        try {
            const response = await fetch(SA_CONFIG.materiaisPath);
            const data = await response.text();
            const linhas = data.split('\n').filter(line => line.trim());
            
            for (let i = 1; i < linhas.length; i++) {
                const colunas = linhas[i].split('\t').map(c => c.trim());
                if (colunas.length >= 3) {
                    if (colunas[0] === codigo) {
                        return {
                            codigo: colunas[0],
                            armazem: colunas[1],
                            descricao: colunas[2],
                            unidadeMedida: ''
                        };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar material:', error);
            throw new Error('Erro ao buscar material');
        }
    }

    // ============================================
    // CONSULTAS NA API (Cloudflare D1)
    // ============================================

    async request(endpoint, options = {}) {
        const url = `${SA_CONFIG.API_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `Erro ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            throw new Error(`Não foi possível conectar à API: ${error.message}`);
        }
    }

    // Carregar usuário logado
    carregarUsuarioLogado() {
        const usuario = sessionStorage.getItem('usuarioLogado');
        if (usuario) {
            this.usuarioAtual = JSON.parse(usuario);
            return this.usuarioAtual;
        }
        
        // Fallback apenas para desenvolvimento
        this.usuarioAtual = {
            nome: 'ALEFE PEREIRA DA SILVA GOMES',
            matricula: '171309',
            cpf: '08143726436',
            funcao: 'GESTAO'
        };
        return this.usuarioAtual;
    }

    // Listar todas as SA
    async listarSA() {
        try {
            const resultado = await this.request('/sa');
            if (Array.isArray(resultado)) {
                return resultado;
            }
            throw new Error('Resposta da API não é um array');
        } catch (error) {
            console.error('❌ Erro ao listar SA:', error);
            throw error;
        }
    }

    // Buscar SA por número
    async buscarSA(numero) {
        try {
            const resultado = await this.request(`/sa/${numero}`);
            if (resultado && typeof resultado === 'object') {
                if (!resultado.termoResponsabilidade) {
                    resultado.termoResponsabilidade = {
                        entreguePor: null,
                        recebidoPor: null
                    };
                }
                return resultado;
            }
            throw new Error('S.A. não encontrada');
        } catch (error) {
            console.error(`❌ Erro ao buscar SA #${numero}:`, error);
            throw error;
        }
    }

    // Criar nova SA
    async criarSA(usuario) {
        try {
            const data = {
                criadoPor: usuario.nome,
                criadoPorMatricula: usuario.matricula || '',
                colaborador: {
                    matricula: '',
                    nome: '',
                    cpf: '',
                    funcao: '',
                    filial: '',
                    centroCusto: ''
                },
                solicitante: '',
                dataSolicitacao: new Date().toISOString().split('T')[0],
                itens: []
            };
            
            const result = await this.request('/sa', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (result && result.success) {
                this.saAtual = await this.buscarSA(result.numero);
                return this.saAtual;
            }
            throw new Error('Erro ao criar S.A.: resposta inválida');
        } catch (error) {
            console.error('❌ Erro ao criar SA:', error);
            throw error;
        }
    }

    // Salvar SA
    async salvarSA() {
        if (!this.saAtual) {
            throw new Error('Nenhuma S.A. carregada para salvar');
        }
        
        try {
            await this.request(`/sa/${this.saAtual.numero}`, {
                method: 'PUT',
                body: JSON.stringify(this.saAtual)
            });
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar SA:', error);
            throw error;
        }
    }

    // Excluir SA
    async excluirSA(numero) {
        try {
            await this.request(`/sa/${numero}`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            console.error('❌ Erro ao excluir SA:', error);
            throw error;
        }
    }

    // Assinar documento
    async assinarDocumento(tipo, nome, assinaturaData) {
        if (!this.saAtual) {
            throw new Error('Nenhuma S.A. carregada para assinar');
        }
        
        try {
            await this.request(`/sa/${this.saAtual.numero}/assinatura`, {
                method: 'POST',
                body: JSON.stringify({
                    tipo: tipo,
                    nome: nome,
                    assinatura: assinaturaData
                })
            });
            
            this.saAtual = await this.buscarSA(this.saAtual.numero);
            return true;
        } catch (error) {
            console.error('❌ Erro ao assinar documento:', error);
            throw error;
        }
    }

    // Finalizar SA
    async finalizarSA() {
        if (!this.saAtual) {
            throw new Error('Nenhuma S.A. carregada para finalizar');
        }
        
        const entregue = this.saAtual.termoResponsabilidade?.entreguePor;
        const recebido = this.saAtual.termoResponsabilidade?.recebidoPor;
        
        if (!entregue || !recebido) {
            throw new Error('Documento precisa ser assinado por ambas as partes');
        }
        
        try {
            await this.request(`/sa/${this.saAtual.numero}/finalizar`, {
                method: 'POST'
            });
            
            this.saAtual = await this.buscarSA(this.saAtual.numero);
            return true;
        } catch (error) {
            console.error('❌ Erro ao finalizar SA:', error);
            throw error;
        }
    }

    // ============================================
    // FUNÇÕES DE UI - PAINEL
    // ============================================

    renderizarLista(dados, container) {
        if (!Array.isArray(dados)) {
            console.error('❌ dados não é um array:', dados);
            container.innerHTML = `
                <div class="empty-state" style="color: #f44336;">
                    <p>❌ Erro ao carregar lista de S.A.</p>
                    <p style="font-size: 14px; color: #999;">Os dados retornados não são válidos</p>
                </div>
            `;
            return;
        }
        
        if (dados.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📋 Nenhuma S.A. Emergencial encontrada.</p>
                    <p>Clique em "Nova S.A." para criar a primeira.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="sa-list-header">
                <span>Nº S.A.</span>
                <span>Colaborador</span>
                <span>Criado por</span>
                <span>Status</span>
                <span style="text-align: center;">Ações</span>
            </div>
        `;
        
        dados.forEach(doc => {
            const statusClass = doc.status === 'finalizado' ? 'status-finalizado' : 
                              doc.status === 'assinado' ? 'status-assinado' : 'status-pendente';
            
            const statusLabel = doc.status === 'finalizado' ? '✅ Finalizado' :
                              doc.status === 'assinado' ? '✍️ Assinado' : '⏳ Pendente';
            
            html += `
                <div class="sa-list-item" data-numero="${doc.numero}">
                    <span class="sa-number" onclick="window.location.href='formulario.html?numero=${doc.numero}'">#${String(doc.numero).padStart(4, '0')}</span>
                    <span onclick="window.location.href='formulario.html?numero=${doc.numero}'">${doc.colaborador_nome || 'Não definido'}</span>
                    <span onclick="window.location.href='formulario.html?numero=${doc.numero}'">${doc.criado_por || 'Sistema'}</span>
                    <span onclick="window.location.href='formulario.html?numero=${doc.numero}'"><span class="sa-status ${statusClass}">${statusLabel}</span></span>
                    <span style="text-align: center;">
                        <button class="btn-excluir-item" onclick="excluirSA(${doc.numero}, event)" title="Excluir S.A.">
                            🗑️
                        </button>
                    </span>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // ============================================
    // FUNÇÕES DE UI - FORMULÁRIO
    // ============================================

    atualizarVisualizacaoAssinaturas() {
        if (!this.saAtual) return;
        
        const entregue = this.saAtual.termoResponsabilidade?.entreguePor;
        const recebido = this.saAtual.termoResponsabilidade?.recebidoPor;
        
        this.atualizarAssinaturaBox('entregue', entregue);
        this.atualizarAssinaturaBox('recebido', recebido);
    }

    atualizarAssinaturaBox(tipo, dados) {
        const box = document.querySelector(`.assinatura-box[data-tipo="${tipo}"]`);
        if (!box) return;
        
        const nomeSpan = box.querySelector('.signatario-nome');
        const dataSpan = box.querySelector('.signatario-data');
        const img = box.querySelector('.signature-img');
        const preview = box.querySelector('.signature-preview');
        const btnAssinar = box.querySelector('.btn-assinar');
        const btnReassinar = box.querySelector('.btn-reassinar');
        
        if (dados && dados.assinatura) {
            box.classList.add('has-signature');
            if (nomeSpan) nomeSpan.textContent = dados.nome;
            if (dataSpan) dataSpan.textContent = dados.data ? new Date(dados.data).toLocaleString('pt-BR') : '-';
            if (img) {
                img.src = dados.assinatura;
                img.style.display = 'block';
            }
            if (preview) preview.style.display = 'block';
            if (btnAssinar) btnAssinar.style.display = 'none';
            if (btnReassinar) btnReassinar.style.display = 'inline-block';
        } else {
            box.classList.remove('has-signature');
            if (img) img.style.display = 'none';
            if (preview) preview.style.display = 'none';
            if (btnAssinar) btnAssinar.style.display = 'inline-block';
            if (btnReassinar) btnReassinar.style.display = 'none';
            if (nomeSpan) nomeSpan.textContent = '-';
            if (dataSpan) dataSpan.textContent = '-';
        }
    }

    async aplicarAssinatura(dadosAssinatura) {
        try {
            const tipo = dadosAssinatura.tipo;
            const nome = dadosAssinatura.nome;
            const assinatura = dadosAssinatura.assinatura;
            const numero = dadosAssinatura.numero;
            
            console.log(`📝 Aplicando assinatura ${tipo} para SA #${numero}`);
            
            const sa = await this.buscarSA(parseInt(numero));
            if (!sa) {
                throw new Error('S.A. não encontrada. Recarregue a página.');
            }
            
            this.saAtual = sa;
            
            if (!this.saAtual.termoResponsabilidade) {
                this.saAtual.termoResponsabilidade = {
                    entreguePor: null,
                    recebidoPor: null
                };
            }
            
            if (tipo === 'entregue') {
                this.saAtual.termoResponsabilidade.entreguePor = {
                    nome: nome,
                    assinatura: assinatura,
                    data: new Date().toISOString()
                };
            } else {
                this.saAtual.termoResponsabilidade.recebidoPor = {
                    nome: nome,
                    assinatura: assinatura,
                    data: new Date().toISOString()
                };
            }
            
            await this.assinarDocumento(tipo, nome, assinatura);
            this.atualizarVisualizacaoAssinaturas();
            
            console.log(`✅ Assinatura ${tipo} aplicada com sucesso!`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao aplicar assinatura:', error);
            throw error;
        }
    }

    // ============================================
    // FUNÇÕES DE POP-UP MATERIAL
    // ============================================

    mostrarPopupMaterial(material) {
        this.fecharPopupMaterial();
        
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.id = 'popupMaterial';
        
        overlay.innerHTML = `
            <div class="popup-content">
                <div class="popup-header">
                    <h3>📦 Material Encontrado</h3>
                    <button class="popup-close" onclick="saManager.fecharPopupMaterial()">✕</button>
                </div>
                <div class="popup-body">
                    <div class="popup-field">
                        <span class="popup-label">Código:</span>
                        <span class="popup-value">${material.codigo}</span>
                    </div>
                    <div class="popup-field">
                        <span class="popup-label">Descrição:</span>
                        <span class="popup-value">${material.descricao}</span>
                    </div>
                    <div class="popup-field">
                        <span class="popup-label">Armazém:</span>
                        <span class="popup-value">${material.armazem}</span>
                    </div>
                    ${material.unidadeMedida ? `
                    <div class="popup-field">
                        <span class="popup-label">Unidade:</span>
                        <span class="popup-value">${material.unidadeMedida}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="popup-footer">
                    <button onclick="saManager.fecharPopupMaterial()" class="popup-btn">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                saManager.fecharPopupMaterial();
            }
        });
    }

    fecharPopupMaterial() {
        const popup = document.getElementById('popupMaterial');
        if (popup) {
            popup.remove();
        }
    }

    // ============================================
    // FUNÇÕES DE NAVEGAÇÃO
    // ============================================

    redirecionarParaHome() {
        const sessao = this.verificarSessao();
        if (!sessao) {
            window.location.href = '../login.html';
            return;
        }

        const perfil = sessao.perfil || 'GESTAO';
        const homePages = {
            'GESTAO': '../home-gestao.html',
            'OPERACIONAL': '../home-operacional.html',
            'VISUALIZACAO': '../home-visualizacao.html'
        };

        window.location.href = homePages[perfil] || '../login.html';
    }

    verificarSessao() {
        const sessao = sessionStorage.getItem('sessaoSICGM');
        if (!sessao) return null;
        
        try {
            const dados = JSON.parse(sessao);
            const tempoDecorrido = Date.now() - dados.timestamp;
            if (tempoDecorrido > 30 * 60 * 1000) {
                sessionStorage.removeItem('sessaoSICGM');
                return null;
            }
            return dados;
        } catch (e) {
            return null;
        }
    }

    // ============================================
    // FUNÇÕES DE NAVEGAÇÃO - TOPO/FIM
    // ============================================

    irParaTopo() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    irParaFim() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

    controlarBotoesNavegacao() {
        const btnTopo = document.getElementById('btnTopo');
        const btnFim = document.getElementById('btnFim');
        if (!btnTopo || !btnFim) return;
        
        const scrollY = window.scrollY;
        const alturaTotal = document.body.scrollHeight - window.innerHeight;

        if (scrollY > 200) {
            btnTopo.classList.add('visivel');
        } else {
            btnTopo.classList.remove('visivel');
        }

        if (scrollY < alturaTotal - 100) {
            btnFim.classList.add('visivel');
        } else {
            btnFim.classList.remove('visivel');
        }
    }

    // ============================================
    // FUNÇÕES DE VALIDAÇÃO
    // ============================================

    validarCamposObrigatorios(sa) {
        const erros = [];
        
        if (!sa.colaborador.matricula || !sa.colaborador.nome || !sa.colaborador.cpf) {
            erros.push('Preencha todos os dados do colaborador!');
        }
        
        if (!sa.solicitante) {
            erros.push('Informe o solicitante!');
        }
        
        if (!sa.itens || sa.itens.length === 0) {
            erros.push('Adicione pelo menos um item!');
        }
        
        return erros;
    }

    validarAssinaturas(sa) {
        const entregue = sa.termoResponsabilidade?.entreguePor;
        const recebido = sa.termoResponsabilidade?.recebidoPor;
        
        if (!entregue || !recebido) {
            return 'Ambas as partes precisam assinar o documento!';
        }
        return null;
    }
}

// ============================================
// FUNÇÕES GLOBAIS PARA USO NO HTML
// ============================================

const saManager = new SAManager();
window.saManager = saManager;

// Função para excluir SA
window.excluirSA = async function(numero, event) {
    if (event) event.stopPropagation();
    
    if (confirm(`⚠️ Tem certeza que deseja excluir a S.A. #${String(numero).padStart(4, '0')}?`)) {
        try {
            await saManager.excluirSA(numero);
            
            const dados = await saManager.listarSA();
            const container = document.getElementById('saList');
            saManager.renderizarLista(dados, container);
            
            alert('✅ S.A. excluída com sucesso!');
        } catch (error) {
            alert('❌ Erro ao excluir: ' + error.message);
        }
    }
};

// Função para voltar ao painel
window.voltarPainel = function() {
    window.location.href = 'index.html';
};

// Função para redirecionar para home
window.redirecionarParaHome = function() {
    saManager.redirecionarParaHome();
};

// Função para ir ao topo
window.irParaTopo = function() {
    saManager.irParaTopo();
};

// Função para ir ao fim
window.irParaFim = function() {
    saManager.irParaFim();
};

// Função para buscar colaborador
window.buscarColaborador = async function() {
    const matricula = document.getElementById('matricula').value.trim();
    if (!matricula) return;
    
    try {
        const colaborador = await saManager.buscarColaborador(matricula);
        if (colaborador) {
            document.getElementById('colaborador').value = colaborador.colaborador;
            document.getElementById('cpf').value = colaborador.cpf;
            document.getElementById('funcao').value = colaborador.funcao;
            document.getElementById('filial').value = colaborador.filial;
            document.getElementById('centroCusto').value = colaborador.centroCusto;
            
            if (saManager.saAtual) {
                saManager.saAtual.colaborador = {
                    matricula: colaborador.matricula,
                    nome: colaborador.colaborador,
                    cpf: colaborador.cpf,
                    funcao: colaborador.funcao,
                    filial: colaborador.filial,
                    centroCusto: colaborador.centroCusto
                };
            }
        } else {
            alert('⚠️ Colaborador não encontrado!');
            document.getElementById('colaborador').value = '';
            document.getElementById('cpf').value = '';
            document.getElementById('funcao').value = '';
            document.getElementById('filial').value = '';
            document.getElementById('centroCusto').value = '';
        }
    } catch (error) {
        alert('❌ Erro ao buscar colaborador: ' + error.message);
    }
};

// Função para buscar material
window.buscarMaterial = async function(input) {
    const codigo = input.value.trim();
    if (!codigo) return;
    
    const row = input.closest('tr');
    
    try {
        const material = await saManager.buscarMaterial(codigo);
        if (material) {
            const descricaoInput = row.querySelector('.item-descricao');
            const unidadeInput = row.querySelector('.item-unidade');
            const armazemInput = row.querySelector('.item-armazem');
            
            descricaoInput.value = material.descricao;
            unidadeInput.value = material.unidadeMedida || '';
            armazemInput.value = material.armazem;
            
            descricaoInput.style.backgroundColor = '#f7fafc';
            unidadeInput.style.backgroundColor = '#f7fafc';
            armazemInput.style.backgroundColor = '#f7fafc';
            
            saManager.mostrarPopupMaterial(material);
        } else {
            alert(`⚠️ Material com código "${codigo}" não encontrado!`);
            row.querySelector('.item-descricao').value = '';
            row.querySelector('.item-armazem').value = '';
            row.querySelector('.item-unidade').value = '';
        }
    } catch (error) {
        alert('❌ Erro ao buscar material: ' + error.message);
    }
};

// Função para adicionar linha de item
window.adicionarLinhaItem = function(item = null) {
    const tbody = document.getElementById('itemsBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" class="item-codigo" onchange="buscarMaterial(this)" placeholder="Código" value="${item ? item.codigo : ''}"></td>
        <td><input type="text" class="item-descricao" readonly placeholder="Descrição" value="${item ? item.descricao : ''}" style="background-color: ${item ? '#f7fafc' : ''};"></td>
        <td><input type="text" class="item-unidade" readonly placeholder="Unid." value="${item ? item.unidadeMedida : ''}" style="background-color: ${item ? '#f7fafc' : ''};"></td>
        <td><input type="number" class="item-quantidade" placeholder="Qtd." min="0" value="${item ? item.quantidade : ''}"></td>
        <td><input type="text" class="item-armazem" readonly placeholder="Armazém" value="${item ? item.armazem : ''}" style="background-color: ${item ? '#f7fafc' : ''};"></td>
        <td><input type="text" class="item-ca" placeholder="C.A" value="${item ? item.ca : ''}"></td>
        <td><button class="remove-item" onclick="removerItem(this)">✕</button></td>
    `;
    tbody.appendChild(tr);
};

// Função para remover item
window.removerItem = function(btn) {
    const row = btn.closest('tr');
    if (document.getElementById('itemsBody').children.length > 1) {
        row.remove();
    } else {
        alert('⚠️ É necessário ter pelo menos um item.');
    }
};

// Função para abrir página de assinatura
window.abrirPaginaAssinatura = function(tipo) {
    const nome = tipo === 'entregue' ? 
        document.getElementById('colaborador').value : 
        document.getElementById('solicitante').value;
    
    if (!nome) {
        alert('⚠️ Preencha o nome do colaborador/solicitante antes de assinar.');
        return;
    }

    if (!saManager.saAtual) {
        alert('❌ Erro: S.A. não encontrada.');
        return;
    }

    window.salvarDadosFormulario();

    const numero = saManager.saAtual.numero;
    const url = `assinar.html?tipo=${tipo}&nome=${encodeURIComponent(nome)}&numero=${numero}`;
    
    const janela = window.open(url, '_blank', 'width=800,height=700,scrollbars=yes');
    
    if (!janela) {
        alert('⚠️ O pop-up foi bloqueado. Permita pop-ups para este site e tente novamente.');
    }
};

// Função para salvar dados do formulário
window.salvarDadosFormulario = function() {
    if (!saManager.saAtual) return;
    
    const sa = saManager.saAtual;
    
    sa.colaborador = {
        matricula: document.getElementById('matricula').value.trim(),
        nome: document.getElementById('colaborador').value.trim(),
        cpf: document.getElementById('cpf').value.trim(),
        funcao: document.getElementById('funcao').value.trim(),
        filial: document.getElementById('filial').value.trim(),
        centroCusto: document.getElementById('centroCusto').value.trim()
    };
    
    sa.solicitante = document.getElementById('solicitante').value.trim();
    sa.dataSolicitacao = document.getElementById('dataSolicitacao').value;
    
    sa.itens = [];
    document.querySelectorAll('#itemsBody tr').forEach(row => {
        const codigo = row.querySelector('.item-codigo').value.trim();
        const descricao = row.querySelector('.item-descricao').value.trim();
        const unidadeMedida = row.querySelector('.item-unidade').value.trim();
        const quantidade = parseInt(row.querySelector('.item-quantidade').value) || 0;
        const armazem = row.querySelector('.item-armazem').value.trim();
        const ca = row.querySelector('.item-ca').value.trim();
        
        if (codigo && descricao) {
            sa.itens.push({ codigo, descricao, unidadeMedida, quantidade, armazem, ca });
        }
    });
};

// Função para finalizar SA
window.finalizarSA = async function() {
    if (!saManager.saAtual) {
        alert('❌ Erro: S.A. não encontrada.');
        return;
    }
    
    try {
        window.salvarDadosFormulario();
        
        const sa = saManager.saAtual;
        
        const erros = saManager.validarCamposObrigatorios(sa);
        if (erros.length > 0) {
            alert('⚠️ ' + erros.join('\n'));
            return;
        }
        
        const erroAssinatura = saManager.validarAssinaturas(sa);
        if (erroAssinatura) {
            alert('⚠️ ' + erroAssinatura);
            return;
        }
        
        await saManager.salvarSA();
        await saManager.finalizarSA();
        
        alert('✅ S.A. finalizada com sucesso!');
        window.location.href = 'index.html';
    } catch (error) {
        alert('❌ ' + error.message);
    }
};

// ============================================
// INICIALIZAÇÃO DO PAINEL
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    const container = document.getElementById('saList');
    if (!container) return;
    
    try {
        const usuario = await saManager.carregarUsuarioLogado();
        
        const userInfo = await saManager.buscarUsuarioAutorizado(usuario.nome);
        
        if (userInfo) {
            document.getElementById('userName').textContent = userInfo.nome;
            document.getElementById('userRole').textContent = userInfo.funcao || 'Usuário';
            document.getElementById('userMatricula').textContent = `Matrícula: ${userInfo.matricula}`;
            document.getElementById('userAvatar').textContent = userInfo.nome.charAt(0);
            
            usuario.matricula = userInfo.matricula;
            usuario.cpf = userInfo.cpf;
            usuario.funcao = userInfo.funcao;
            sessionStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        } else {
            document.getElementById('userName').textContent = usuario.nome;
            document.getElementById('userRole').textContent = usuario.funcao || 'Usuário';
            document.getElementById('userMatricula').textContent = `Matrícula: ${usuario.matricula || '---'}`;
            document.getElementById('userAvatar').textContent = usuario.nome.charAt(0);
        }
        
        const podeCriar = await saManager.verificarPermissaoGerar(usuario);
        const btnNova = document.getElementById('btnNovaSA');
        
        if (!podeCriar) {
            btnNova.disabled = true;
            btnNova.title = 'Apenas usuários cadastrados podem criar SA';
            btnNova.style.opacity = '0.5';
            btnNova.textContent = '🔒 Nova S.A. (Sem permissão)';
        }
        
        const dados = await saManager.listarSA();
        saManager.renderizarLista(dados, container);
        
        btnNova.addEventListener('click', async function() {
            if (!podeCriar) {
                alert('⚠️ Apenas usuários cadastrados podem criar novas S.A.');
                return;
            }
            
            try {
                const novaSA = await saManager.criarSA(usuario);
                if (novaSA) {
                    alert(`✅ S.A. #${String(novaSA.numero).padStart(4, '0')} criada com sucesso!`);
                    const dadosAtualizados = await saManager.listarSA();
                    saManager.renderizarLista(dadosAtualizados, container);
                }
            } catch (error) {
                alert('❌ Erro ao criar S.A.: ' + error.message);
            }
        });
        
        window.addEventListener('scroll', () => saManager.controlarBotoesNavegacao());
        window.addEventListener('resize', () => saManager.controlarBotoesNavegacao());
        setTimeout(() => saManager.controlarBotoesNavegacao(), 100);
        
    } catch (error) {
        console.error('❌ Erro ao carregar página:', error);
        container.innerHTML = `
            <div class="empty-state" style="color: #f44336; padding: 40px;">
                <p style="font-size: 24px;">❌ Erro</p>
                <p style="font-size: 16px; color: #666; margin: 10px 0;">${error.message || 'Erro ao carregar dados do servidor'}</p>
                <p style="font-size: 14px; color: #999; margin-top: 20px;">
                    Verifique se a API está disponível ou tente novamente mais tarde.
                </p>
                <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 30px; background: #1a237e; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
});

// ============================================
// INICIALIZAÇÃO DO FORMULÁRIO
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    const saNumero = document.getElementById('saNumero');
    if (!saNumero) return;
    
    try {
        const params = new URLSearchParams(window.location.search);
        const numero = params.get('numero');
        
        await saManager.carregarUsuarioLogado();
        
        const assinaturaPendente = sessionStorage.getItem('assinatura_temp');
        if (assinaturaPendente) {
            try {
                const dados = JSON.parse(assinaturaPendente);
                if (dados.concluido) {
                    await saManager.aplicarAssinatura(dados);
                    sessionStorage.removeItem('assinatura_temp');
                    window.location.reload();
                }
            } catch (error) {
                console.error('Erro ao processar assinatura:', error);
                sessionStorage.removeItem('assinatura_temp');
            }
        }
        
        if (numero) {
            const sa = await saManager.buscarSA(parseInt(numero));
            if (sa) {
                saManager.saAtual = sa;
                carregarDadosFormulario(sa);
                saManager.atualizarVisualizacaoAssinaturas();
            } else {
                alert('❌ S.A. não encontrada!');
                window.location.href = 'index.html';
            }
        } else {
            const podeCriar = await saManager.verificarPermissaoGerar(saManager.usuarioAtual);
            if (!podeCriar) {
                alert('⚠️ Apenas usuários cadastrados podem criar novas S.A.');
                window.location.href = 'index.html';
                return;
            }
            
            const novaSA = await saManager.criarSA(saManager.usuarioAtual);
            if (novaSA) {
                document.getElementById('saNumero').textContent = `#${String(novaSA.numero).padStart(4, '0')}`;
                document.getElementById('dataSolicitacao').value = new Date().toISOString().split('T')[0];
            }
        }
        
        window.addEventListener('scroll', () => saManager.controlarBotoesNavegacao());
        window.addEventListener('resize', () => saManager.controlarBotoesNavegacao());
        setTimeout(() => saManager.controlarBotoesNavegacao(), 100);
        
    } catch (error) {
        console.error('❌ Erro ao carregar formulário:', error);
        mostrarErroFormulario(error.message || 'Erro ao carregar dados do servidor');
    }
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function carregarDadosFormulario(sa) {
    document.getElementById('saNumero').textContent = `#${String(sa.numero).padStart(4, '0')}`;
    
    const col = sa.colaborador || {};
    document.getElementById('matricula').value = col.matricula || '';
    document.getElementById('colaborador').value = col.nome || '';
    document.getElementById('cpf').value = col.cpf || '';
    document.getElementById('funcao').value = col.funcao || '';
    document.getElementById('filial').value = col.filial || '';
    document.getElementById('centroCusto').value = col.centroCusto || '';
    
    document.getElementById('solicitante').value = sa.solicitante || '';
    document.getElementById('dataSolicitacao').value = sa.dataSolicitacao || '';
    
    const tbody = document.getElementById('itemsBody');
    tbody.innerHTML = '';
    if (sa.itens && sa.itens.length > 0) {
        sa.itens.forEach(item => {
            window.adicionarLinhaItem(item);
        });
    } else {
        window.adicionarLinhaItem();
    }
}

function mostrarErroFormulario(mensagem) {
    const body = document.querySelector('.sa-form-body');
    if (!body) return;
    
    body.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <p style="font-size: 48px;">❌</p>
            <h2 style="color: #f44336;">Erro ao carregar formulário</h2>
            <p style="color: #666; margin: 20px 0;">${mensagem}</p>
            <button onclick="window.location.href='index.html'" style="padding: 12px 30px; background: #1a237e; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                ⬅ Voltar ao Painel
            </button>
            <button onclick="window.location.reload()" style="margin-left: 10px; padding: 12px 30px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 600;">
                🔄 Tentar Novamente
            </button>
        </div>
    `;
}