import { supabase } from '@data/supabase/client'
import { lerComCache } from '@data/offline/cache'
import { lista, texto, traducoesDe } from '@data/traducoesConteudo'
import type { ExercicioCatalogo, GrupoMuscular, LocalTreino, MedidaSerie, NivelTreino } from '@domain/entities/treino'

export interface CatalogoRow {
  id: string
  nome: string
  grupo_muscular: GrupoMuscular
  musculos_trabalhados: string | null
  ambientes: LocalTreino[]
  icone_url: string | null
  imagem_url: string | null
  prancha_url: string | null
  como_executar: string[]
  series_padrao: number
  repeticoes_padrao: number
  medida: MedidaSerie | null
  segundos_padrao: number | null
  dica: string | null
  nivel_minimo?: NivelTreino | null
}

export function exercicioParaDominio(r: CatalogoRow, trad: Record<string, unknown> = {}): ExercicioCatalogo {
  return {
    id: r.id,
    nome: texto(trad, 'nome', r.nome),
    nomeBase: r.nome,
    grupoMuscular: r.grupo_muscular,
    musculosTrabalhados: texto(trad, 'musculos_trabalhados', r.musculos_trabalhados),
    ambientes: r.ambientes,
    iconeUrl: r.icone_url,
    imagemUrl: r.imagem_url,
    pranchaUrl: r.prancha_url,
    comoExecutar: lista(trad, 'como_executar', r.como_executar),
    seriesPadrao: r.series_padrao,
    repeticoesPadrao: r.repeticoes_padrao,
    medida: r.medida ?? 'reps',
    segundosPadrao: r.segundos_padrao,
    dica: texto(trad, 'dica', r.dica),
    nivelMinimo: r.nivel_minimo ?? 'iniciante',
  }
}

const COLUNAS =
  'id, nome, grupo_muscular, musculos_trabalhados, ambientes, icone_url, imagem_url, prancha_url, como_executar, series_padrao, repeticoes_padrao, medida, segundos_padrao, dica, nivel_minimo'

/** O catálogo inteiro (100 exercícios), guardado no aparelho e renovado uma vez por dia. */
export function linhasDoCatalogo(): Promise<CatalogoRow[]> {
  return lerComCache(
    'exercicios:catalogo',
    async () => {
      const { data, error } = await supabase
        .from('exercicios_catalogo')
        .select(COLUNAS)
        .order('ordem', { ascending: true })
        .returns<CatalogoRow[]>()
      if (error) throw error
      return data ?? []
    },
    { validadeMs: 24 * 60 * 60 * 1000 },
  )
}

/** Único ponto que conhece exercicios_catalogo — conteúdo curado, somente leitura. */
export const exercicioCatalogoRepository = {
  /**
   * Lista o catálogo inteiro, opcionalmente filtrado por grupo muscular.
   * Não filtra por local/ambiente de propósito: o usuário pode buscar e
   * adicionar qualquer exercício do catálogo na ficha de qualquer local.
   */
  async listar(filtro?: { grupoMuscular?: GrupoMuscular }): Promise<ExercicioCatalogo[]> {
    const [linhas, trad] = await Promise.all([linhasDoCatalogo(), traducoesDe('exercicios_catalogo')])
    return linhas
      .filter((r) => !filtro?.grupoMuscular || r.grupo_muscular === filtro.grupoMuscular)
      .map((r) => exercicioParaDominio(r, trad(r.id)))
  },
}
