// Contador de materiais
let materialCount = 0;

// Variável para armazenar os materiais carregados
let databaseMateriais = [];

// ============================================
// FUNÇÕES DA BASE DE DADOS
// ============================================

// Função para carregar materiais do arquivo de texto
async function carregarMateriais() {
    try {
        const response = await fetch('materiais.txt');
        const texto = await response.text();
        
        // Dividir o texto em linhas
        const linhas = texto.split('\n');
        
        // Processar cada linha
        databaseMateriais = linhas
            .filter(linha => linha.trim() !== '') // Remove linhas vazias
            .map(linha => {
                // Divide por TAB (\t)
                const partes = linha.split('\t');
                
                if (partes.length >= 3) {
                    return {
                        codigo: partes[0].trim(),
                        descricao: partes[1].trim(),
                        und: partes[2].trim()
                    };
                }
                return null;
            })
            .filter(material => material !== null); // Remove linhas inválidas
        
        console.log('✅ Materiais carregados:', databaseMateriais.length);
        console.log('📋 Primeiros 5 materiais:', databaseMateriais.slice(0, 5));
        
    } catch (error) {
        console.error('❌ Erro ao carregar materiais:', error);
        
        // Dados de fallback
        databaseMateriais = [
            { codigo: "661185", descricao: "ABRACADEIRA R S F 1/2 X 5/8", und: "PC" },
            { codigo: "1197", descricao: "ACENDEDOR SOLDA EXOTERMICA", und: "PC" },
            { codigo: "630463", descricao: "ACENDEDOR SOLDA EXOTERMICA", und: "PC" },
            { codigo: "638861", descricao: "ACENDEDOR SOLDA EXOTERMICA", und: "PC" },
            { codigo: "620603", descricao: "ACO BELGO 50 CA50 20,00 MM", und: "PC" }
        ];
        
        console.log('⚠️ Usando dados de fallback');
    }
}

// Função para consultar material pelo código
function consultarMaterial(codigo) {
    return databaseMateriais.find(material => material.codigo === codigo);
}

// ============================================
// FUNÇÕES DE MATERIAIS
// ============================================

// Função para criar um novo item de material
function criarMaterialItem() {
    materialCount++;
    const materialItem = document.createElement('div');
    materialItem.className = 'material-item';
    materialItem.id = `material-${materialCount}`;
    
    materialItem.innerHTML = `
        <div class="material-header">
            <span class="material-number">Material #${materialCount}</span>
            <button type="button" class="btn-remove-material" onclick="removerMaterial('material-${materialCount}')">
                ✕
            </button>
        </div>
        <div class="material-row">
            <div class="material-field">
                <label for="codigo-${materialCount}">Código</label>
                <input 
                    type="text" 
                    id="codigo-${materialCount}" 
                    class="input-codigo" 
                    placeholder="Código"
                    onchange="buscarMaterial('${materialCount}')"
                >
            </div>
            <div class="material-field">
                <label for="descricao-${materialCount}">Descrição</label>
                <input 
                    type="text" 
                    id="descricao-${materialCount}" 
                    class="input-descricao" 
                    placeholder="Descrição"
                    readonly
                >
            </div>
            <div class="material-field">
                <label for="und-${materialCount}">UND</label>
                <input 
                    type="text" 
                    id="und-${materialCount}" 
                    class="input-und" 
                    placeholder="UND"
                    readonly
                >
            </div>
            <div class="material-field">
                <label for="qtd-${materialCount}">Qtd. RMA</label>
                <input 
                    type="text" 
                    id="qtd-${materialCount}" 
                    class="input-qtd" 
                    placeholder="Quantidade"
                >
            </div>
        </div>
    `;
    
    return materialItem;
}

// Função para adicionar material
function adicionarMaterial() {
    const container = document.getElementById('materiais-container');
    
    if (!container) {
        console.error('❌ Container de materiais não encontrado!');
        return;
    }
    
    const materialItem = criarMaterialItem();
    container.appendChild(materialItem);
    
    // Focar no campo de código do novo material
    setTimeout(() => {
        const codigoInput = document.getElementById(`codigo-${materialCount}`);
        if (codigoInput) {
            codigoInput.focus();
        }
    }, 100);
    
    console.log('✅ Material #' + materialCount + ' adicionado');
}

// Função para remover material
function removerMaterial(id) {
    const materialItem = document.getElementById(id);
    if (materialItem) {
        materialItem.remove();
        console.log('🗑️ Material removido:', id);
    }
}

// Função para buscar material pelo código
function buscarMaterial(id) {
    const codigoInput = document.getElementById(`codigo-${id}`);
    const descricaoInput = document.getElementById(`descricao-${id}`);
    const undInput = document.getElementById(`und-${id}`);
    const qtdInput = document.getElementById(`qtd-${id}`);
    
    if (!codigoInput || !descricaoInput || !undInput) {
        console.error('❌ Campos não encontrados para o material #' + id);
        return;
    }
    
    const codigo = codigoInput.value.trim();
    
    if (codigo === '') {
        // Limpar e destravar campos se código estiver vazio
        descricaoInput.value = '';
        undInput.value = '';
        descricaoInput.readOnly = false;
        undInput.readOnly = false;
        descricaoInput.style.backgroundColor = '#FFFFFF';
        undInput.style.backgroundColor = '#FFFFFF';
        descricaoInput.style.borderColor = '#E2E8F0';
        undInput.style.borderColor = '#E2E8F0';
        codigoInput.style.borderColor = '#E2E8F0';
        return;
    }
    
    // Verificar se a base de dados está carregada
    if (databaseMateriais.length === 0) {
        console.warn('⚠️ Base de dados ainda não carregada');
        alert('Base de dados ainda está carregando. Tente novamente em instantes.');
        return;
    }
    
    // Consultar na base de dados
    const material = consultarMaterial(codigo);
    
    if (material) {
        // Material encontrado - preencher e BLOQUEAR
        descricaoInput.value = material.descricao;
        undInput.value = material.und;
        
        // Bloquear edição
        descricaoInput.readOnly = true;
        undInput.readOnly = true;
        
        // Estilo visual de bloqueado
        descricaoInput.style.backgroundColor = '#F7FAFC';
        undInput.style.backgroundColor = '#F7FAFC';
        descricaoInput.style.borderColor = '#48BB78'; // Verde
        undInput.style.borderColor = '#48BB78';
        codigoInput.style.borderColor = '#48BB78';
        
        // Focar no campo de quantidade
        if (qtdInput) {
            setTimeout(() => qtdInput.focus(), 100);
        }
        
        console.log('✅ Material encontrado:', material.descricao);
        
    } else {
        // Material não encontrado
        descricaoInput.value = 'Material não encontrado';
        undInput.value = '---';
        
        // Destravar para edição manual
        descricaoInput.readOnly = false;
        undInput.readOnly = false;
        descricaoInput.style.backgroundColor = '#FFFFFF';
        undInput.style.backgroundColor = '#FFFFFF';
        descricaoInput.style.borderColor = '#FC8181'; // Vermelho
        undInput.style.borderColor = '#FC8181';
        codigoInput.style.borderColor = '#FC8181';
        
        // Focar na descrição
        setTimeout(() => descricaoInput.focus(), 100);
        
        console.warn('⚠️ Material não encontrado:', codigo);
    }
}

// ============================================
// FUNÇÃO DE COLETA DE DADOS
// ============================================

function coletarDadosFormulario() {
    const materiais = [];
    const materialItems = document.querySelectorAll('.material-item');
    
    materialItems.forEach(item => {
        const id = item.id.split('-')[1];
        const codigo = document.getElementById(`codigo-${id}`)?.value || '';
        const descricao = document.getElementById(`descricao-${id}`)?.value || '';
        const und = document.getElementById(`und-${id}`)?.value || '';
        const qtd = document.getElementById(`qtd-${id}`)?.value || '';
        
        materiais.push({
            codigo,
            descricao,
            und,
            quantidade: qtd
        });
    });
    
    return {
        numeroObra: document.getElementById('numero-obra')?.value || '',
        data: document.getElementById('data')?.value || '',
        separador: document.getElementById('separador')?.value || '',
        matriculaSeparador: document.getElementById('matricula-separador')?.value || '',
        encarregado: document.getElementById('encarregado')?.value || '',
        matriculaEncarregado: document.getElementById('matricula-encarregado')?.value || '',
        conferente: document.getElementById('conferente')?.value || '',
        matriculaConferente: document.getElementById('matricula-conferente')?.value || '',
        materiais: materiais
    };
}

// ============================================
// INICIALIZAÇÃO - APENAS UM EVENT LISTENER!
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando aplicação...');
    
    // 1. Carregar base de dados
    await carregarMateriais();
    
    // 2. Configurar botão Adicionar Material
    const btnAddMaterial = document.getElementById('btn-add-material');
    if (btnAddMaterial) {
        btnAddMaterial.addEventListener('click', adicionarMaterial);
        console.log('✅ Botão "Adicionar Material" configurado');
    } else {
        console.error('❌ Botão "btn-add-material" não encontrado!');
    }
    
    // 3. Configurar envio do formulário
    const form = document.getElementById('mgmForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const dados = coletarDadosFormulario();
            console.log('📤 Dados do formulário:', dados);
            
            alert('Formulário enviado com sucesso!\nVerifique o console para ver os dados.');
        });
        console.log('✅ Formulário configurado');
    } else {
        console.error('❌ Formulário "mgmForm" não encontrado!');
    }
    
    console.log('✅ Aplicação iniciada com sucesso!');
});