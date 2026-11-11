// ============================================================
// SITA v2 — Configuração global (6 etapas)
// ============================================================
window.SITA_CONFIG = {
    API_URL: 'https://sicgm-sita.alefe-gomes-72f.workers.dev',

    ETAPAS: {
        1: { nome: 'Programação',       cor: '#3b82f6', icone: '📋', tag: 'PROGRAMADO'   },
        2: { nome: 'Lista de Separação', cor: '#8b5cf6', icone: '📝', tag: 'PROGRAMADO'   },
        3: { nome: 'Separado',          cor: '#f97316', icone: '📦', tag: 'EM_SEPARACAO' },
        4: { nome: 'Conferência',       cor: '#eab308', icone: '🔍', tag: 'SEPARADO'     },
        5: { nome: 'Expedido',          cor: '#22c55e', icone: '🚚', tag: 'EXPEDIDO'     },
        6: { nome: 'Devolvido',         cor: '#64748b', icone: '↩️', tag: 'DEVOLVIDO'   }
    },

    SUBETAPAS: {
        2: [
            { codigo: 'ET2_COMPARAR_ORCAMENTO', label: 'Comparar com orçamento original' },
            { codigo: 'ET2_TRATAR_FALTA',       label: 'Verificar e tratar falta de materiais' }
        ],
        3: [
            { codigo: 'ET3_REQUISITAR_SISTEMICO', label: 'Requisitar material sistêmico (RMA)' },
            { codigo: 'ET3_ADITIVO_SAIDA',        label: 'Aditivo de saída (opcional)' },
            { codigo: 'ET3_DEVOLVER_LISTA_SISTEMA', label: 'Devolver lista de separação' }
        ],
        5: [
            { codigo: 'ET5_ADITIVO_CAMPO', label: 'Aditivo de campo (opcional)' }
        ],
        6: [
            // A definir no próximo bloco
        ]
    }
};