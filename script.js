// Função para buscar material pelo código (mantenha esta versão)
function buscarMaterial(id) {
    const codigoInput = document.getElementById(`codigo-${id}`);
    const descricaoInput = document.getElementById(`descricao-${id}`);
    const undInput = document.getElementById(`und-${id}`);
    const qtdInput = document.getElementById(`qtd-${id}`);
    
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
        return;
    }
    
    // Verificar se a base de dados está carregada
    if (databaseMateriais.length === 0) {
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
        descricaoInput.style.borderColor = '#48BB78'; // Verde para sucesso
        undInput.style.borderColor = '#48BB78';
        codigoInput.style.borderColor = '#48BB78';
        
        // Focar no campo de quantidade
        setTimeout(() => qtdInput.focus(), 100);
        
    } else {
        // Material não encontrado
        descricaoInput.value = 'Material não encontrado';
        undInput.value = '---';
        
        // Destravar para edição manual
        descricaoInput.readOnly = false;
        undInput.readOnly = false;
        descricaoInput.style.backgroundColor = '#FFFFFF';
        undInput.style.backgroundColor = '#FFFFFF';
        descricaoInput.style.borderColor = '#FC8181';
        undInput.style.borderColor = '#FC8181';
        codigoInput.style.borderColor = '#FC8181';
        
        // Focar na descrição para correção manual
        setTimeout(() => descricaoInput.focus(), 100);
    }
}