// Variável para armazenar os materiais carregados
let databaseMateriais = [];

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
        
        console.log('Materiais carregados:', databaseMateriais.length);
        console.log('Primeiros 5 materiais:', databaseMateriais.slice(0, 5));
        
    } catch (error) {
        console.error('Erro ao carregar materiais:', error);
        alert('Erro ao carregar a base de dados de materiais!');
        
        // Dados de fallback
        databaseMateriais = [
            { codigo: "661185", descricao: "ABRACADEIRA R S F 1/2 X 5/8", und: "PC" },
            { codigo: "1197", descricao: "ACENDEDOR SOLDA EXOTERMICA", und: "PC" },
            { codigo: "630463", descricao: "ACENDEDOR SOLDA EXOTERMICA", und: "PC" }
        ];
    }
}

// Função para consultar material pelo código
function consultarMaterial(codigo) {
    // Busca exata pelo código
    return databaseMateriais.find(material => material.codigo === codigo);
}

// Função para buscar materiais por parte do código (opcional)
function buscarMateriaisPorCodigo(codigoParcial) {
    return databaseMateriais.filter(material => 
        material.codigo.includes(codigoParcial)
    );
}

// Carregar materiais ao iniciar a página
document.addEventListener('DOMContentLoaded', function() {
    carregarMateriais();
});