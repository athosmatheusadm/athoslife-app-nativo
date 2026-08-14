import { supabase } from '@data/supabase/client'
import type { Exercicio, LocalTreino, Treino } from '@domain/entities/treino'

interface TreinoRow {
  id: string
  local: LocalTreino
  nome: string
  subtitulo: string | null
  icone: string | null
  modelo: boolean
  ordem: number
}
interface ExRow {
  id: string
  treino_id: string
  nome: string
  icone: string | null
  series: number
  repeticoes: number
  concluido: boolean
  ordem: number
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Único ponto que conhece treinos/exercicios_treino.
 * Monta a árvore Local → Treinos → Exercícios.
 */
export const treinoRepository = {
  /** Treinos de um local (os do usuário + os modelos prontos), com exercícios. */
  async doLocal(local: LocalTreino): Promise<Treino[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data: treinos, error: e1 } = await supabase
      .from('treinos')
      .select('id, local, nome, subtitulo, icone, modelo, ordem')
      .eq('local', local)
      .order('ordem', { ascending: true })
      .returns<TreinoRow[]>()
    if (e1) throw e1
    if (!treinos || treinos.length === 0) return []

    const ids = treinos.map((t) => t.id)
    const { data: exs, error: e2 } = await supabase
      .from('exercicios_treino')
      .select('id, treino_id, nome, icone, series, repeticoes, concluido, ordem')
      .in('treino_id', ids)
      .eq('data', hojeISO())
      .order('ordem', { ascending: true })
      .returns<ExRow[]>()
    if (e2) throw e2

    return treinos.map((t) => ({
      id: t.id,
      local: t.local,
      nome: t.nome,
      subtitulo: t.subtitulo,
      icone: t.icone,
      modelo: t.modelo,
      exercicios: (exs ?? [])
        .filter((x) => x.treino_id === t.id)
        .map((x) => ({
          id: x.id,
          nome: x.nome,
          icone: x.icone ?? 'corpo',
          series: x.series,
          repeticoes: x.repeticoes,
          concluido: x.concluido,
        })),
    }))
  },

  /** Cria um treino novo do usuário num local. */
  async criarTreino(params: {
    local: LocalTreino
    nome: string
    subtitulo?: string | null
    icone?: string | null
    ordem: number
  }): Promise<string> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { data, error } = await supabase
      .from('treinos')
      .insert({
        user_id: userId,
        local: params.local,
        nome: params.nome,
        subtitulo: params.subtitulo ?? null,
        icone: params.icone ?? null,
        ordem: params.ordem,
        modelo: false,
      })
      .select('id')
      .single<{ id: string }>()
    if (error) throw error
    return data.id
  },

  /** Anota um exercício dentro de um treino. */
  async adicionarExercicio(params: {
    treinoId: string
    nome: string
    icone: string
    series: number
    repeticoes: number
    ordem: number
  }): Promise<Exercicio> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { data, error } = await supabase
      .from('exercicios_treino')
      .insert({
        treino_id: params.treinoId,
        user_id: userId,
        nome: params.nome,
        icone: params.icone,
        series: params.series,
        repeticoes: params.repeticoes,
        ordem: params.ordem,
      })
      .select('id, nome, icone, series, repeticoes, concluido')
      .single<Omit<ExRow, 'treino_id' | 'ordem'>>()
    if (error) throw error
    return {
      id: data.id,
      nome: data.nome,
      icone: data.icone ?? 'corpo',
      series: data.series,
      repeticoes: data.repeticoes,
      concluido: data.concluido,
    }
  },

  async definirConcluido(id: string, concluido: boolean): Promise<void> {
    const { error } = await supabase
      .from('exercicios_treino')
      .update({ concluido })
      .eq('id', id)
    if (error) throw error
  },
}
