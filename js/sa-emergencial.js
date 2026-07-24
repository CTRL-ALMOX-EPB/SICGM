// ============================================
// S.A. EMERGENCIAL - JavaScript
// ============================================

// Configuração
const SA_CONFIG = {
    API_URL: 'https://sa-emergencial-api.seu-usuario.workers.dev/api',
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
        this.modoOffline = false; // Flag para modo offline
    }

    // ============================================
    // CONSULTAS LOCAIS (arquivos .txt)
    // ============================================

    // Verificar se usuário pode gerar SA (todos no arquivo)
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
            return false;
        }
    }

    // Buscar informações do usuário logado no arquivo de autorizados
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
            return null;
        }
    }

    // Buscar colaborador por matrícula
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
            return null;
        }
    }

    // Buscar material por código
    async buscarMaterial(codigo) {
        try {
            const response = await fetch(SA_CONFIG.materiaisPath);
            const data = await response.text();
            const linhas = data.split('\n').filter(line => line.trim());
            
            // Pular cabeçalho (primeira linha)
            for (let i = 1; i < linhas.length; i++) {
                const colunas = linhas[i].split('\t').map(c => c.trim());
                // Formato: Codigo	Armazem	Descricao
                if (colunas.length >= 3) {
                    if (colunas[0] === codigo) {
                        return {
                            codigo: colunas[0],
                            armazem: colunas[1],
                            descricao: colunas[2]
                        };
                    }
                }
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar material:', error);
            return null;
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
                throw new Error(error.error || 'Erro na requisição');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro na requisição:', error);
            console.warn('⚠️ Modo offline ativado - usando dados locais');
            this.modoOffline = true;
            
            // Retornar dados mockados para desenvolvimento
            return this.getDadosMock(endpoint, options);
        }
    }

    // Dados mockados para desenvolvimento offline
    getDadosMock(endpoint, options) {
        console.log('📦 Usando dados mockados para:', endpoint);
        
        if (endpoint === '/sa' && options.method === 'GET') {
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            if (dadosSalvos) {
                return JSON.parse(dadosSalvos);
            }
            return [];
        }
        
        if (endpoint === '/sa' && options.method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            const lista = dadosSalvos ? JSON.parse(dadosSalvos) : [];
            
            const novoNumero = lista.length > 0 ? Math.max(...lista.map(s => s.numero)) + 1 : 1;
            const novaSA = {
                id: Date.now(),
                numero: novoNumero,
                status: 'pendente',
                criado_por: body.criadoPor || 'Sistema',
                criado_em: new Date().toISOString(),
                colaborador_nome: body.colaborador?.nome || '',
                colaborador_matricula: body.colaborador?.matricula || '',
                solicitante: body.solicitante || '',
                data_solicitacao: body.dataSolicitacao || new Date().toISOString().split('T')[0],
                finalizado: false,
                itens: body.itens || [],
                termoResponsabilidade: {
                    entreguePor: null,
                    recebidoPor: null
                }
            };
            
            lista.push(novaSA);
            localStorage.setItem('sa_emergencial_mock', JSON.stringify(lista));
            
            return { success: true, numero: novoNumero };
        }
        
        if (endpoint.match(/^\/sa\/\d+$/) && options.method === 'PUT') {
            const numero = parseInt(endpoint.split('/')[2]);
            const body = JSON.parse(options.body || '{}');
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            const lista = dadosSalvos ? JSON.parse(dadosSalvos) : [];
            
            const index = lista.findIndex(s => s.numero === numero);
            if (index !== -1) {
                lista[index] = { ...lista[index], ...body };
                localStorage.setItem('sa_emergencial_mock', JSON.stringify(lista));
            }
            
            return { success: true };
        }
        
        if (endpoint.match(/^\/sa\/\d+\/assinatura$/) && options.method === 'POST') {
            const numero = parseInt(endpoint.split('/')[2]);
            const body = JSON.parse(options.body || '{}');
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            const lista = dadosSalvos ? JSON.parse(dadosSalvos) : [];
            
            const index = lista.findIndex(s => s.numero === numero);
            if (index !== -1) {
                const sa = lista[index];
                if (!sa.termoResponsabilidade) {
                    sa.termoResponsabilidade = { entreguePor: null, recebidoPor: null };
                }
                
                if (body.tipo === 'entregue') {
                    sa.termoResponsabilidade.entreguePor = {
                        nome: body.nome,
                        assinatura: body.assinatura,
                        data: new Date().toISOString()
                    };
                } else if (body.tipo === 'recebido') {
                    sa.termoResponsabilidade.recebidoPor = {
                        nome: body.nome,
                        assinatura: body.assinatura,
                        data: new Date().toISOString()
                    };
                }
                
                // Verificar se ambas assinaturas foram feitas
                if (sa.termoResponsabilidade.entreguePor && sa.termoResponsabilidade.recebidoPor) {
                    sa.status = 'assinado';
                }
                
                localStorage.setItem('sa_emergencial_mock', JSON.stringify(lista));
            }
            
            return { success: true };
        }
        
        if (endpoint.match(/^\/sa\/\d+\/finalizar$/) && options.method === 'POST') {
            const numero = parseInt(endpoint.split('/')[2]);
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            const lista = dadosSalvos ? JSON.parse(dadosSalvos) : [];
            
            const index = lista.findIndex(s => s.numero === numero);
            if (index !== -1) {
                lista[index].status = 'finalizado';
                lista[index].finalizado = true;
                localStorage.setItem('sa_emergencial_mock', JSON.stringify(lista));
            }
            
            return { success: true };
        }
        
        return {};
    }

    // Carregar usuário logado
    carregarUsuarioLogado() {
        const usuario = sessionStorage.getItem('usuarioLogado');
        if (usuario) {
            this.usuarioAtual = JSON.parse(usuario);
            return this.usuarioAtual;
        }
        
        // Fallback para desenvolvimento
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
            return resultado;
        } catch (error) {
            console.error('Erro ao listar SA:', error);
            // Tentar carregar do localStorage
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            return dadosSalvos ? JSON.parse(dadosSalvos) : [];
        }
    }

    // Buscar SA por número
    async buscarSA(numero) {
        try {
            const resultado = await this.request(`/sa/${numero}`);
            return resultado;
        } catch (error) {
            console.error('Erro ao buscar SA:', error);
            // Tentar carregar do localStorage
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            if (dadosSalvos) {
                const lista = JSON.parse(dadosSalvos);
                return lista.find(s => s.numero === numero) || null;
            }
            return null;
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
            
            if (result.success) {
                this.saAtual = await this.buscarSA(result.numero);
                return this.saAtual;
            }
            return null;
        } catch (error) {
            console.error('Erro ao criar SA:', error);
            throw error;
        }
    }

    // Salvar SA
    async salvarSA() {
        if (!this.saAtual) return false;
        
        try {
            await this.request(`/sa/${this.saAtual.numero}`, {
                method: 'PUT',
                body: JSON.stringify(this.saAtual)
            });
            return true;
        } catch (error) {
            console.error('Erro ao salvar SA:', error);
            // Salvar no localStorage como fallback
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            const lista = dadosSalvos ? JSON.parse(dadosSalvos) : [];
            const index = lista.findIndex(s => s.numero === this.saAtual.numero);
            if (index !== -1) {
                lista[index] = this.saAtual;
                localStorage.setItem('sa_emergencial_mock', JSON.stringify(lista));
                return true;
            }
            return false;
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
            console.error('Erro ao excluir SA:', error);
            // Excluir do localStorage como fallback
            const dadosSalvos = localStorage.getItem('sa_emergencial_mock');
            if (dadosSalvos) {
                let lista = JSON.parse(dadosSalvos);
                lista = lista.filter(s => s.numero !== numero);
                localStorage.setItem('sa_emergencial_mock', JSON.stringify(lista));
                return true;
            }
            return false;
        }
    }

    // Assinar documento
    async assinarDocumento(tipo, nome, assinaturaData) {
        if (!this.saAtual) return false;
        
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
            console.error('Erro ao assinar documento:', error);
            throw error;
        }
    }

    // Finalizar SA
    async finalizarSA() {
        if (!this.saAtual) return false;
        
        try {
            await this.request(`/sa/${this.saAtual.numero}/finalizar`, {
                method: 'POST'
            });
            
            this.saAtual = await this.buscarSA(this.saAtual.numero);
            return true;
        } catch (error) {
            console.error('Erro ao finalizar SA:', error);
            throw error;
        }
    }

    // ============================================
    // FUNÇÕES DE UI
    // ============================================

    // Renderizar lista de SA
    renderizarLista(dados, container) {
        if (!dados || dados.length === 0) {
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
                <span>Data</span>
            </div>
        `;
        
        dados.forEach(doc => {
            const statusClass = doc.status === 'finalizado' ? 'status-finalizado' : 
                              doc.status === 'assinado' ? 'status-assinado' : 'status-pendente';
            
            const statusLabel = doc.status === 'finalizado' ? '✅ Finalizado' :
                              doc.status === 'assinado' ? '✍️ Assinado' : '⏳ Pendente';
            
            const dataFormatada = new Date(doc.criado_em).toLocaleDateString('pt-BR');
            
            html += `
                <div class="sa-list-item" data-numero="${doc.numero}" 
                     onclick="window.location.href='formulario.html?numero=${doc.numero}'">
                    <span class="sa-number">#${String(doc.numero).padStart(4, '0')}</span>
                    <span>${doc.colaborador_nome || 'Não definido'}</span>
                    <span>${doc.criado_por}</span>
                    <span><span class="sa-status ${statusClass}">${statusLabel}</span></span>
                    <span>${dataFormatada}</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    // ============================================
    // SIGNATURE PAD
    // ============================================

    initSignaturePad(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        
        this.signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: '#1a237e',
            minWidth: 2,
            maxWidth: 4
        });
        
        return this.signaturePad;
    }

    abrirModalAssinatura(tipo, nome) {
        this.tipoAssinatura = tipo;
        const modal = document.getElementById('signatureModal');
        modal.classList.add('active');
        
        if (this.signaturePad) {
            this.signaturePad.clear();
        }
        
        document.getElementById('signatureName').value = nome || '';
        document.getElementById('signatureType').textContent = 
            tipo === 'entregue' ? 'ENTREGUE POR' : 'RECEBIDO POR';
    }

    fecharModalAssinatura() {
        const modal = document.getElementById('signatureModal');
        modal.classList.remove('active');
        this.tipoAssinatura = null;
    }

    async confirmarAssinatura() {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            alert('⚠️ Por favor, assine no campo acima.');
            return;
        }
        
        const nome = document.getElementById('signatureName').value.trim();
        if (!nome) {
            alert('⚠️ Por favor, informe o nome do signatário.');
            return;
        }
        
        const assinaturaData = this.signaturePad.toDataURL();
        
        await this.assinarDocumento(this.tipoAssinatura, nome, assinaturaData);
        this.fecharModalAssinatura();
        this.atualizarVisualizacaoAssinaturas();
        
        alert('✅ Assinatura realizada com sucesso!');
    }

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
        const btn = box.querySelector('.btn-assinar');
        
        if (dados && dados.assinatura) {
            box.classList.add('has-signature');
            if (nomeSpan) nomeSpan.textContent = dados.nome;
            if (dataSpan) dataSpan.textContent = new Date(dados.data).toLocaleString('pt-BR');
            if (img) {
                img.src = dados.assinatura;
                img.style.display = 'block';
            }
            if (btn) btn.style.display = 'none';
        } else {
            box.classList.remove('has-signature');
            if (img) img.style.display = 'none';
            if (btn) btn.style.display = 'block';
            if (nomeSpan) nomeSpan.textContent = '-';
            if (dataSpan) dataSpan.textContent = '-';
        }
    }
}

// ============================================
// INSTÂNCIA GLOBAL
// ============================================
const saManager = new SAManager();
window.saManager = saManager;