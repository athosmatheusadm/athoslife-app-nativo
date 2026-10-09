import { supabase } from '@data/supabase/client'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { exercicioParaDominio, type CatalogoRow } from '@data/repositories/exercicioCatalogoRepository'
import { traducoesDe } from '@data/traducoesConteudo'
import {
  hojeISO,
  type DiaSemana,
  type ExercicioPlano,
  type LocalTreino,
  type SerieDetalhe,
} from '@domain/entities/treino'

interface SerieRow {
  reps: number | null
  carga_kg: number | null
  segundos?: number | null
}

interface PlanoRow {
  id: string
  local: LocalTreino
  dia_semana: DiaSemana
  series_detalhe: SerieRow[]
  ordem: number
  concluido_em: string | null
  exercicios_catalogo: CatalogoRow
}

function paraDominio(r: PlanoRow, trad: (id: string) => Record<string, unknown>): ExercicioPlano {
  const c = r.exercicios_catalogo
  return {
    id: r.id,
    local: r.local,
    diaSemana: r.dia_semana,
    series: r.series_detalhe.map((s) => ({ reps: s.reps, cargaKg: s.carga_kg, segundos: s.segundos ?? null })),
    ordem: r.ordem,
    concluidoHoje: r.concluido_em === hojeISO(),
    exercicio: exercicioParaDominio(c, trad(c.id)),
  }
}

function paraLinha(series: readonly SerieDetalhe[]): SerieRow[] {
  return series.map((s) => ({ reps: s.reps, carga_kg: s.cargaKg, segundos: s.segundos ?? null }))
}

const SELECT_COM_CATALOGO =
  'id, local, dia_semana, series_detalhe, ordem, concluido_em, exercicios_catalogo(id, nome, grupo_muscular, musculos_trabalhados, ambientes, icone_url, imagem_url, prancha_url, como_executar, series_padrao, repeticoes_padrao, medida, segundos_padrao, dica, nivel_minimo)'

/** Único ponto que conhece treino_plano — atribuição pessoal por (local, dia). */
export const treinoPlanoRepository = {
  /** Exercícios que o usuário colocou num local + dia da semana. */
  async doDia(local: LocalTreino, diaSemana: DiaSemana): Promise<ExercicioPlano[]> {
    const { data, error } = await supabase
      .from('treino_plano')
      .select(SELECT_COM_CATALOGO)
      .eq('local', local)
      .eq('dia_semana', diaSemana)
      .order('ordem', { ascending: true })
      .returns<PlanoRow[]>()
    if (error) throw error
    const trad = await traducoesDe('exercicios_catalogo')
    return (data ?? []).map((r) => paraDominio(r, trad))
  },

  /** Dias da semana que têm pelo menos um exercício na ficha (qualquer local) — lembrete de treino. */
  async diasComExercicio(): Promise<Set<DiaSemana>> {
    const { data, error } = await supabase.from('treino_plano').select('dia_semana').returns<{ dia_semana: DiaSemana }[]>()
    if (error) throw error
    return new Set((data ?? []).map((r) => r.dia_semana))
  },

  /** Algum exercício da ficha marcado como feito hoje? */
  async concluiuAlgoHoje(): Promise<boolean> {
    const { count, error } = await supabase
      .from('treino_plano')
      .select('id', { count: 'exact', head: true })
      .eq('concluido_em', hojeISO())
    if (error) throw error
    return (count ?? 0) > 0
  },

  /** Adiciona um exercício do catálogo num local + dia da semana. */
  async adicionar(params: {
    local: LocalTreino
    diaSemana: DiaSemana
    exercicioId: string
    series: readonly SerieDetalhe[]
    ordem: number
  }): Promise<ExercicioPlano> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { data, error } = await supabase
      .from('treino_plano')
      .insert({
        user_id: userId,
        local: params.local,
        dia_semana: params.diaSemana,
        exercicio_id: params.exercicioId,
        series_detalhe: paraLinha(params.series),
        ordem: params.ordem,
      })
      .select(SELECT_COM_CATALOGO)
      .single<PlanoRow>()
    if (error) throw error
    avisarRegistroDoDia()
    return paraDominio(data, await traducoesDe('exercicios_catalogo'))
  },

  async atualizarSeries(id: string, series: readonly SerieDetalhe[]): Promise<void> {
    const { error } = await supabase
      .from('treino_plano')
      .update({ series_detalhe: paraLinha(series) })
      .eq('id', id)
    if (error) throw error
  },

  /** Marca/desmarca concluído hoje. Guarda a data (não um boolean) pra "resetar" sozinho a cada dia. */
  async marcarConcluido(id: string, concluido: boolean): Promise<void> {
    const { error } = await supabase
      .from('treino_plano')
      .update({ concluido_em: concluido ? hojeISO() : null })
      .eq('id', id)
    if (error) throw error
    avisarRegistroDoDia()
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase.from('treino_plano').delete().eq('id', id)
    if (error) throw error
    avisarRegistroDoDia()
  },
}
