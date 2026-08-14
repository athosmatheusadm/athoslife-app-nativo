import { supabase } from '@data/supabase/client'
import type { Habito, IntensidadeHabito } from '@domain/entities/habito'

interface HabitoRow {
  id: string
  nome: string
  categoria: string | null
  intensidade: IntensidadeHabito | null
  gatilhos: string[] | null
  horario_risco: string | null
  streak_atual: number | null
  melhor_streak: number | null
  total_recaidas: number | null
  ultima_recaida: string | null
  ativo: boolean | null
}

function paraDominio(r: HabitoRow): Habito {
  // proximaConquista: próximo marco de dias acima do streak atual.
  const marcos = [7, 14, 30, 60, 90, 180, 365]
  const streak = r.streak_atual ?? 0
  const proxima = marcos.find((m) => m > streak) ?? streak + 30

  return {
    id: r.id,
    nome: r.nome,
    emoji: emojiPorCategoria(r.categoria),
    categoria: r.categoria,
    gatilhos: r.gatilhos ?? [],
    horarioRisco: r.horario_risco,
    streakAtual: streak,
    melhorStreak: r.melhor_streak ?? 0,
    totalRecaidas: r.total_recaidas ?? 0,
    ultimaRecaida: r.ultima_recaida ? new Date(r.ultima_recaida) : null,
    proximaConquista: proxima,
  }
}

/** Emoji por categoria (o banco guarda categoria; o emoji é da UI). */
function emojiPorCategoria(cat: string | null): string {
  switch (cat) {
    case 'doce':
      return '🍫'
    case 'fast_food':
      return '🍟'
    case 'alcool':
      return '🍺'
    case 'cigarro':
      return '🚬'
    case 'refrigerante':
      return '🥤'
    default:
      return '🎯'
  }
}

/**
 * Único ponto que conhece vicios_user/recaidas.
 * O streak é recalculado no servidor a partir da última recaída — o
 * client não "inventa" streak (mesma disciplina do streak principal).
 */
export const habitosRepository = {
  async listar(): Promise<Habito[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data, error } = await supabase
      .from('vicios_user')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('criado_em', { ascending: true })
      .returns<HabitoRow[]>()

    if (error) throw error
    return (data ?? []).map(paraDominio)
  },

  /**
   * Registra uma recaída (sem punir). Grava o tropeço e zera o streak.
   * O gatilho e o contexto viram aprendizado — alimentam a IA e os
   * insights futuros ("você costuma escorregar às sextas à noite").
   */
  async registrarRecaida(params: {
    habitoId: string
    gatilho: string | null
    contexto: string | null
  }): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('recaidas').insert({
      user_id: userId,
      vicio_id: params.habitoId,
      gatilho: params.gatilho,
      contexto: params.contexto,
    })
    if (error) throw error
    // O trigger/servidor cuida de zerar streak_atual e incrementar
    // total_recaidas — o client não mexe nesses números diretamente.
  },

  /** Marca mais um dia firme (quando aplicável ao fluxo do produto). */
  async criar(params: {
    nome: string
    categoria: string | null
    intensidade: IntensidadeHabito
  }): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('vicios_user').insert({
      user_id: userId,
      nome: params.nome,
      categoria: params.categoria,
      intensidade: params.intensidade,
    })
    if (error) throw error
  },
}
