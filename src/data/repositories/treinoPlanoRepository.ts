import { supabase } from '@data/supabase/client'
import {
  hojeISO,
  type DiaSemana,
  type ExercicioCatalogo,
  type ExercicioPlano,
  type LocalTreino,
  type SerieDetalhe,
} from '@domain/entities/treino'

interface CatalogoRow {
  id: string
  nome: string
  grupo_muscular: ExercicioCatalogo['grupoMuscular']
  musculos_trabalhados: string | null
  ambientes: LocalTreino[]
  icone_url: string | null
  imagem_url: string | null
  como_executar: string[]
  series_padrao: number
  repeticoes_padrao: number
  dica: string | null
}

interface SerieRow {
  reps: number | null
  carga_kg: number | null
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

function paraDominio(r: PlanoRow): ExercicioPlano {
  const c = r.exercicios_catalogo
  return {
    id: r.id,
    local: r.local,
    diaSemana: r.dia_semana,
    series: r.series_detalhe.map((s) => ({ reps: s.reps, cargaKg: s.carga_kg })),
    ordem: r.ordem,
    concluidoHoje: r.concluido_em === hojeISO(),
    exercicio: {
      id: c.id,
      nome: c.nome,
      grupoMuscular: c.grupo_muscular,
      musculosTrabalhados: c.musculos_trabalhados,
      ambientes: c.ambientes,
      iconeUrl: c.icone_url,
      imagemUrl: c.imagem_url,
      comoExecutar: c.como_executar,
      seriesPadrao: c.series_padrao,
      repeticoesPadrao: c.repeticoes_padrao,
      dica: c.dica,
    },
  }
}

function paraLinha(series: readonly SerieDetalhe[]): SerieRow[] {
  return series.map((s) => ({ reps: s.reps, carga_kg: s.cargaKg }))
}

const SELECT_COM_CATALOGO =
  'id, local, dia_semana, series_detalhe, ordem, concluido_em, exercicios_catalogo(id, nome, grupo_muscular, musculos_trabalhados, ambientes, icone_url, imagem_url, como_executar, series_padrao, repeticoes_padrao, dica)'

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
    return (data ?? []).map(paraDominio)
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
    return paraDominio(data)
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
  },

  async remover(id: string): Promise<void> {
    const { error } = await supabase.from('treino_plano').delete().eq('id', id)
    if (error) throw error
  },
}
