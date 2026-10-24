import { supabase } from '@data/supabase/client'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever, inserir, novoId } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { exercicioParaDominio, linhasDoCatalogo, type CatalogoRow } from '@data/repositories/exercicioCatalogoRepository'
import { traducoesDe } from '@data/traducoesConteudo'
import {
  hojeISO,
  type DiaSemana,
  type ExercicioPlano,
  type LocalTreino,
  type SerieDetalhe,
} from '@domain/entities/treino'

export interface SerieRow {
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

// Cópia local (offline): a ficha inteira numa chave só — doDia, os dias com
// exercício e "concluiu algo hoje" saem dela.
const CHAVE = 'treino:plano'

async function fichaInteira(): Promise<PlanoRow[]> {
  return lerComCache(
    CHAVE,
    async () => {
      const { data, error } = await supabase
        .from('treino_plano')
        .select(SELECT_COM_CATALOGO)
        .order('ordem', { ascending: true })
        .returns<PlanoRow[]>()
      if (error) throw error
      return data ?? []
    },
    { padrao: [] },
  )
}

async function mexerNaFicha(id: string, fn: (r: PlanoRow) => PlanoRow | null): Promise<void> {
  await mexerNoCache<PlanoRow[]>(CHAVE, (atual) => atual?.flatMap((r) => (r.id === id ? (fn(r) ?? []) : [r])))
}

/** Único ponto que conhece treino_plano — atribuição pessoal por (local, dia). Funciona sem rede. */
export const treinoPlanoRepository = {
  /** Exercícios que o usuário colocou num local + dia da semana. */
  async doDia(local: LocalTreino, diaSemana: DiaSemana): Promise<ExercicioPlano[]> {
    const [ficha, trad] = await Promise.all([fichaInteira(), traducoesDe('exercicios_catalogo')])
    return ficha
      .filter((r) => r.local === local && r.dia_semana === diaSemana)
      .sort((a, b) => a.ordem - b.ordem)
      .map((r) => paraDominio(r, trad))
  },

  /** Dias da semana que têm pelo menos um exercício na ficha (qualquer local) — lembrete de treino. */
  async diasComExercicio(): Promise<Set<DiaSemana>> {
    return new Set((await fichaInteira()).map((r) => r.dia_semana))
  },

  /** Algum exercício da ficha marcado como feito hoje? */
  async concluiuAlgoHoje(): Promise<boolean> {
    const hoje = hojeISO()
    return (await fichaInteira()).some((r) => r.concluido_em === hoje)
  },

  /** Adiciona um exercício do catálogo num local + dia da semana. */
  async adicionar(params: {
    local: LocalTreino
    diaSemana: DiaSemana
    exercicioId: string
    series: readonly SerieDetalhe[]
    ordem: number
  }): Promise<ExercicioPlano> {
    const userId = await usuarioId()
    const catalogo = (await linhasDoCatalogo()).find((c) => c.id === params.exercicioId)
    if (!catalogo) throw new Error('exercicio_nao_encontrado')
    const row: PlanoRow = {
      id: novoId(),
      local: params.local,
      dia_semana: params.diaSemana,
      series_detalhe: paraLinha(params.series),
      ordem: params.ordem,
      concluido_em: null,
      exercicios_catalogo: catalogo,
    }
    await escrever(
      inserir('treino_plano', {
        id: row.id,
        user_id: userId,
        local: params.local,
        dia_semana: params.diaSemana,
        exercicio_id: params.exercicioId,
        series_detalhe: row.series_detalhe,
        ordem: params.ordem,
      }),
      () => mexerNoCache<PlanoRow[]>(CHAVE, (atual = []) => [...atual, row]),
    )
    avisarRegistroDoDia()
    return paraDominio(row, await traducoesDe('exercicios_catalogo'))
  },

  async atualizarSeries(id: string, series: readonly SerieDetalhe[]): Promise<void> {
    const series_detalhe = paraLinha(series)
    await escrever({ op: 'update', tabela: 'treino_plano', valores: { series_detalhe }, filtros: [['id', id]] }, () =>
      mexerNaFicha(id, (r) => ({ ...r, series_detalhe })),
    )
  },

  /** Marca/desmarca concluído hoje. Guarda a data (não um boolean) pra "resetar" sozinho a cada dia. */
  async marcarConcluido(id: string, concluido: boolean): Promise<void> {
    const concluido_em = concluido ? hojeISO() : null
    await escrever({ op: 'update', tabela: 'treino_plano', valores: { concluido_em }, filtros: [['id', id]] }, () =>
      mexerNaFicha(id, (r) => ({ ...r, concluido_em })),
    )
    avisarRegistroDoDia()
  },

  async remover(id: string): Promise<void> {
    await escrever({ op: 'delete', tabela: 'treino_plano', filtros: [['id', id]] }, () => mexerNaFicha(id, () => null))
    avisarRegistroDoDia()
  },

  /** Depois de um treino salvo: a ficha local fica com a carga usada e o "feito hoje" (o servidor recebe o mesmo pela fila). */
  async anotarLocal(id: string, campos: Partial<Pick<PlanoRow, 'series_detalhe' | 'concluido_em'>>): Promise<void> {
    await mexerNaFicha(id, (r) => ({ ...r, ...campos }))
  },
}
