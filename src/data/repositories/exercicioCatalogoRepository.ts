import { supabase } from '@data/supabase/client'
import type { ExercicioCatalogo, GrupoMuscular, LocalTreino } from '@domain/entities/treino'

interface Row {
  id: string
  nome: string
  grupo_muscular: GrupoMuscular
  musculos_trabalhados: string | null
  ambientes: LocalTreino[]
  icone_url: string | null
  imagem_url: string | null
  como_executar: string[]
  series_padrao: number
  repeticoes_padrao: number
  dica: string | null
}

function paraDominio(r: Row): ExercicioCatalogo {
  return {
    id: r.id,
    nome: r.nome,
    grupoMuscular: r.grupo_muscular,
    musculosTrabalhados: r.musculos_trabalhados,
    ambientes: r.ambientes,
    iconeUrl: r.icone_url,
    imagemUrl: r.imagem_url,
    comoExecutar: r.como_executar,
    seriesPadrao: r.series_padrao,
    repeticoesPadrao: r.repeticoes_padrao,
    dica: r.dica,
  }
}

/** Único ponto que conhece exercicios_catalogo — conteúdo curado, somente leitura. */
export const exercicioCatalogoRepository = {
  /**
   * Lista o catálogo inteiro, opcionalmente filtrado por grupo muscular.
   * Não filtra por local/ambiente de propósito: o usuário pode buscar e
   * adicionar qualquer exercício do catálogo na ficha de qualquer local.
   */
  async listar(filtro?: { grupoMuscular?: GrupoMuscular }): Promise<ExercicioCatalogo[]> {
    let query = supabase
      .from('exercicios_catalogo')
      .select(
        'id, nome, grupo_muscular, musculos_trabalhados, ambientes, icone_url, imagem_url, como_executar, series_padrao, repeticoes_padrao, dica',
      )
      .order('ordem', { ascending: true })

    if (filtro?.grupoMuscular) query = query.eq('grupo_muscular', filtro.grupoMuscular)

    const { data, error } = await query.returns<Row[]>()
    if (error) throw error
    return (data ?? []).map(paraDominio)
  },
}
