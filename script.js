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

// ============================================
// FUNÇÃO PARA ATUALIZAR NUMERAÇÃO
// ============================================

function atualizarNumeracao() {
    const materialItems = document.querySelectorAll('.material-item');
    
    materialItems.forEach((item, index) => {
        const novoNumero = index + 1;
        const materialNumber = item.querySelector('.material-number');
        
        if (materialNumber) {
            materialNumber.textContent = `Material #${novoNumero}`;
        }
        
        const novoId = `material-${novoNumero}`;
        item.id = novoId;
        
        // Atualizar IDs dos inputs
        const inputs = item.querySelectorAll('input');
        inputs.forEach(input => {
            if (input.id.includes('codigo-')) input.id = `codigo-${novoNumero}`;
            else if (input.id.includes('descricao-')) {
                input.id = `descricao-${novoNumero}`;
                input.setAttribute('onclick', `mostrarDescricaoCompleta(this)`); // 👈 ADICIONE ISSO
            }
            else if (input.id.includes('und-')) input.id = `und-${novoNumero}`;
            else if (input.id.includes('qtd-')) input.id = `qtd-${novoNumero}`;
        });
        
        // Atualizar labels (for)
        const labels = item.querySelectorAll('label');
        labels.forEach(label => {
            const forAttr = label.getAttribute('for');
            if (forAttr && forAttr.includes('codigo-')) {
                label.setAttribute('for', `codigo-${novoNumero}`);
            } else if (forAttr && forAttr.includes('descricao-')) {
                label.setAttribute('for', `descricao-${novoNumero}`);
            } else if (forAttr && forAttr.includes('und-')) {
                label.setAttribute('for', `und-${novoNumero}`);
            } else if (forAttr && forAttr.includes('qtd-')) {
                label.setAttribute('for', `qtd-${novoNumero}`);
            }
        });
        
        // Atualizar onclick do botão remover
        const btnRemover = item.querySelector('.btn-remove-material');
        if (btnRemover) {
            btnRemover.setAttribute('onclick', `removerMaterial('${novoId}')`);
        }
        
        // Atualizar onchange do input de código
        const inputCodigo = item.querySelector('.input-codigo');
        if (inputCodigo) {
            inputCodigo.setAttribute('onchange', `buscarMaterial('${novoNumero}')`);
        }
    });
    
    console.log('🔄 Numeração atualizada');
}

// Função para consultar material pelo código
function consultarMaterial(codigo) {
    return databaseMateriais.find(material => material.codigo === codigo);
}

function criarMaterialItem() {
    const totalItens = document.querySelectorAll('.material-item').length;
    const novoNumero = totalItens + 1;
    
    const materialItem = document.createElement('div');
    materialItem.className = 'material-item';
    materialItem.id = `material-${novoNumero}`;
    
    materialItem.innerHTML = `
        <div class="material-header">
            <span class="material-number">Material #${novoNumero}</span>
            <button type="button" class="btn-remove-material" onclick="removerMaterial('material-${novoNumero}')">
                ✕
            </button>
        </div>
        <div class="material-row">
            <div class="material-field">
                <label for="codigo-${novoNumero}">Código</label>
                <input type="text" id="codigo-${novoNumero}" class="input-codigo" placeholder="Código" onchange="buscarMaterial('${novoNumero}')">
            </div>
            <div class="material-field">
                <label for="descricao-${novoNumero}">Descrição</label>
                <input 
                    type="text" 
                    id="descricao-${novoNumero}" 
                    class="input-descricao" 
                    placeholder="Descrição" 
                    readonly
                    onclick="mostrarDescricaoCompleta(this)"
                    title="Clique para ver descrição completa"
                >
            </div>
            <div class="material-field">
                <label for="und-${novoNumero}">UND</label>
                <input type="text" id="und-${novoNumero}" class="input-und" placeholder="UND" readonly>
            </div>
            <div class="material-field">
                <label for="qtd-${novoNumero}">Qtd. RMA</label>
                <input type="text" id="qtd-${novoNumero}" class="input-qtd" placeholder="Quantidade">
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
        
        // Atualizar numeração após remover
        atualizarNumeracao();
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
// FUNÇÕES DO POP-UP DE DESCRIÇÃO
// ============================================

let popupAtual = null;
let overlayAtual = null;

function criarPopupDescricao() {
    // Criar overlay (para fechar ao clicar fora)
    if (!overlayAtual) {
        overlayAtual = document.createElement('div');
        overlayAtual.className = 'popup-overlay';
        overlayAtual.addEventListener('click', fecharPopupDescricao);
        document.body.appendChild(overlayAtual);
    }
    
    // Criar pop-up
    if (!popupAtual) {
        popupAtual = document.createElement('div');
        popupAtual.className = 'descricao-popup';
        document.body.appendChild(popupAtual);
    }
}

function mostrarDescricaoCompleta(inputElement) {
    // Só mostra se o campo estiver readonly (material encontrado)
    if (!inputElement.readOnly) return;
    if (!inputElement.value || inputElement.value === 'Material não encontrado') return;
    
    criarPopupDescricao();
    
    const descricaoCompleta = inputElement.value;
    
    // Verificar se o texto está truncado visualmente
    if (!textoEstaTruncado(inputElement) && window.innerWidth > 768) {
        return; // Não mostra popup se o texto couber no campo (apenas desktop)
    }
    
    // Posicionar o pop-up
    posicionarPopup(inputElement, descricaoCompleta);
    
    // Mostrar
    popupAtual.textContent = descricaoCompleta;
    popupAtual.classList.add('show');
    overlayAtual.classList.add('active');
}

function textoEstaTruncado(element) {
    // Verifica se o texto é maior que a largura do input
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const computedStyle = window.getComputedStyle(element);
    context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    
    const textWidth = context.measureText(element.value).width;
    const inputWidth = element.clientWidth - 
                      parseInt(computedStyle.paddingLeft) - 
                      parseInt(computedStyle.paddingRight);
    
    return textWidth > inputWidth;
}

function posicionarPopup(inputElement, texto) {
    const rect = inputElement.getBoundingClientRect();
    const popupHeight = 60; // Altura estimada do pop-up
    const popupWidth = Math.min(350, window.innerWidth - 40);
    
    // Centralizar horizontalmente em relação ao input
    let left = rect.left + (rect.width / 2);
    
    // Ajustar para não sair da tela
    const halfPopupWidth = popupWidth / 2;
    if (left - halfPopupWidth < 10) {
        left = halfPopupWidth + 10;
    } else if (left + halfPopupWidth > window.innerWidth - 10) {
        left = window.innerWidth - halfPopupWidth - 10;
    }
    
    // Remover posicionamento anterior
    popupAtual.style.left = '';
    popupAtual.style.right = '';
    popupAtual.style.top = '';
    popupAtual.style.bottom = '';
    popupAtual.style.transform = '';
    
    // Posicionar horizontalmente
    popupAtual.style.position = 'fixed';
    popupAtual.style.left = left + 'px';
    popupAtual.style.transform = 'translateX(-50%)';
    popupAtual.style.maxWidth = popupWidth + 'px';
    
    // Verificar se cabe em cima do input
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    
    if (spaceAbove > popupHeight + 20) {
        // Mostrar em cima
        popupAtual.style.top = (rect.top - 15) + 'px';
        popupAtual.style.transform = 'translate(-50%, -100%)';
        popupAtual.classList.remove('popup-bottom');
    } else if (spaceBelow > popupHeight + 20) {
        // Mostrar embaixo
        popupAtual.style.top = (rect.bottom + 10) + 'px';
        popupAtual.style.transform = 'translateX(-50%)';
        popupAtual.classList.add('popup-bottom');
    } else {
        // Mostrar em cima mesmo sem espaço (com scroll)
        popupAtual.style.top = '10px';
        popupAtual.style.transform = 'translateX(-50%)';
        popupAtual.classList.remove('popup-bottom');
    }
}

function fecharPopupDescricao() {
    if (popupAtual) {
        popupAtual.classList.remove('show');
    }
    if (overlayAtual) {
        overlayAtual.classList.remove('active');
    }
}

// Fechar pop-up com tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        fecharPopupDescricao();
    }
});

// Fechar pop-up ao redimensionar a janela
window.addEventListener('resize', function() {
    fecharPopupDescricao();
});


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