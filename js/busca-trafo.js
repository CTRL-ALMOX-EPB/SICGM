// js/busca-trafo.js

// URL da sua API no Cloudflare (CORRIGIDO)
const API_URL = 'https://busca-trafo-worker.alefe-gomes-72f.workers.dev';

let currentFilters = {};

const statusMap = {
  'Estoque': 'estoque',
  'Obra': 'obra',
  'Transferido': 'transferido',
  'Falta': 'falta'
};

// Carrega os dados da API
async function carregarTransformadores(filters = {}) {
  const corpoTabela = document.getElementById('tabelaCorpo');
  const statsDiv = document.getElementById('stats');

  // Remove os filtros vazios para não enviar parâmetros desnecessários
  const filtrosLimpos = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value && value.trim() !== '') {
      filtrosLimpos[key] = value.trim();
    }
  }

  // Atualizado para 10 colunas (sem Chave_Controle)
  corpoTabela.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px;">⏳ Carregando...</td></tr>`;

  try {
    const response = await fetch(`${API_URL}/api/buscar-trafo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters: filtrosLimpos })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro ao carregar dados.');
    }

    const registros = data.data || [];
    statsDiv.textContent = `📊 Total de registros encontrados: ${registros.length}`;

    if (registros.length === 0) {
      corpoTabela.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px;">Nenhum transformador encontrado.</td></tr>`;
      return;
    }

    // Monta a tabela (sem Chave_Controle)
    let html = '';
    registros.forEach(row => {
      const statusClass = statusMap[row.Status] || 'estoque';
      html += `
        <tr>
          <td>${row.Cod_Mat || '-'}</td>
          <td>${row.Descricao_Material || '-'}</td>
          <td>${row.Fabricante || '-'}</td>
          <td>${row.Numero_Serie || '-'}</td>
          <td>${row.Tombamento || '-'}</td>
          <td><span class="status-badge status-${statusClass}">${row.Status || 'Desconhecido'}</span></td>
          <td>${row.Dt_Recebimento_Energisa || '-'}</td>
          <td>${row.Dt_Saida || '-'}</td>
          <td style="max-width:150px; word-break:break-word;">${row.Historico_Transf || '-'}</td>
          <td style="max-width:150px; word-break:break-word;">${row.Obra_SS || '-'}</td>
        </tr>
      `;
    });

    corpoTabela.innerHTML = html;

  } catch (error) {
    console.error('Erro ao buscar transformadores:', error);
    statsDiv.textContent = '❌ Erro ao carregar dados. Verifique a conexão com a API.';
    corpoTabela.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 40px; color: red;">❌ Erro: ${error.message}</td></tr>`;
  }
}

// Configura os listeners de eventos
function configurarEventos() {
  const btnBuscar = document.getElementById('btnBuscar');

  btnBuscar.addEventListener('click', () => {
    currentFilters = {
      // REMOVIDO: chaveControle (não existe mais no banco)
      codMat: document.getElementById('filtroCodMat').value,
      descricao: document.getElementById('filtroDescricao').value,
      fabricante: document.getElementById('filtroFabricante').value,
      numeroSerie: document.getElementById('filtroSerie').value,
      tombamento: document.getElementById('filtroTombamento').value,
      status: document.getElementById('filtroStatus').value,
    };
    carregarTransformadores(currentFilters);
  });

  // Carrega ao pressionar Enter em qualquer input
  document.querySelectorAll('.filtro-item input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        btnBuscar.click();
      }
    });
  });
}

// Inicia a aplicação
document.addEventListener('DOMContentLoaded', () => {
  configurarEventos();
  // Carrega todos os registros ao abrir a página
  carregarTransformadores({});
});