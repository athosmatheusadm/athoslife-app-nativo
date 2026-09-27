import { chamar } from '@data/ai/aiProxy'
import type { ContextoReceita, ReceitaGerada } from '@domain/entities/receita'

/**
 * Cliente de IA para o Life montar uma receita a partir da dieta do usuário.
 * Handler 'recipe' do `ai-proxy` — só plano pago (cota: 10/dia). Erros
 * chegam como AiProxyError (premium_required, limit_reached, ...).
 * A chave do Gemini nunca vem ao cliente.
 */

interface ReceitaGeradaCrua {
  titulo: string
  subtitulo: string
  ingredientes: string[]
  modo_preparo: string[]
  macros: { calorias: number; proteina: number; carboidrato: number; gordura: number }
  rendimento: string
  tempo_min: number
  dica_life: string
  respeita_restricoes: string[]
}

export async function gerarReceitaComIA(
  contexto: ContextoReceita,
): Promise<ReceitaGerada> {
  const cru = await chamar<ReceitaGeradaCrua>('recipe', {
    contexto: {
      ingredientes_disponiveis: contexto.ingredientesDisponiveis,
      restricoes: contexto.restricoes,
      objetivo: contexto.objetivo,
      macros_restantes: contexto.macrosRestantes,
      categoria_desejada: contexto.categoriaDesejada,
    },
  })
  return {
    titulo: cru.titulo,
    subtitulo: cru.subtitulo,
    ingredientes: cru.ingredientes,
    modoPreparo: cru.modo_preparo,
    macros: cru.macros,
    rendimento: cru.rendimento,
    tempoMin: cru.tempo_min,
    dicaLife: cru.dica_life,
    respeitaRestricoes: cru.respeita_restricoes,
  }
}
