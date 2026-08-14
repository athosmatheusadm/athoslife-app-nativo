import { supabase } from '@data/supabase/client'
import { AiProxyError } from '@data/ai/aiProxy'
import type { ContextoReceita, ReceitaGerada } from '@domain/entities/receita'

/**
 * Cliente de IA para o Life montar uma receita a partir da dieta do usuário.
 *
 * ATENÇÃO — pendência de backend:
 * Isto chama o `ai-proxy` com tipo 'recipe'. Hoje o proxy trata
 * 'vision' | 'chat' | 'barcode'. É preciso ADICIONAR um handler 'recipe'
 * no Edge Function (mesmo padrão dos outros: aplica cota, audita custo,
 * chama o Gemini com um prompt que devolve JSON estruturado).
 * Enquanto isso não existir, esta função vai falhar no proxy — de propósito,
 * para não fingir que a feature está pronta.
 *
 * O contrato de saída (ReceitaGerada) já está fechado, então o backend só
 * precisa devolver esse formato. A chave do Gemini nunca vem ao cliente.
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
  const { data: sessao } = await supabase.auth.getSession()
  const token = sessao.session?.access_token
  if (!token) throw new AiProxyError({ tipo: 'not_authenticated' })

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tipo: 'recipe',
      contexto: {
        ingredientes_disponiveis: contexto.ingredientesDisponiveis,
        restricoes: contexto.restricoes,
        objetivo: contexto.objetivo,
        macros_restantes: contexto.macrosRestantes,
        categoria_desejada: contexto.categoriaDesejada,
      },
    }),
  })

  if (res.status === 401) throw new AiProxyError({ tipo: 'not_authenticated' })
  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as { next_reset?: string }
    throw new AiProxyError({ tipo: 'limit_reached', proximoReset: body.next_reset ?? '' })
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new AiProxyError({ tipo: 'proxy_error', detalhe: body.error ?? 'proxy_error' })
  }

  const cru = (await res.json()) as ReceitaGeradaCrua
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
