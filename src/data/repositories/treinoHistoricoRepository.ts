import { supabase } from '@data/supabase/client'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever, inserir, novoId } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import { treinoPlanoRepository } from './treinoPlanoRepository'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { hojeISO } from '@domain/entities/treino'
import {
  grupoPrincipal,
  resumirSessao,
  type SessaoTreino,
} from '@domain/entities/sessaoTreino'

/**
 * Único ponto que conhece treinos_historico. Uma linha por sessão de treino
 * finalizada (o que as conquistas e o Life leem como "treinou").
 */
interface SerieSalva {
  readonly carga_kg: number | null
  readonly reps: number | null
}
interface ExercicioSalvo {
  readonly exercicio_id: string
  readonly nome: string
  readonly series: readonly SerieSalva[]
}

/** O último treino salvo, no formato que o Story usa. */
export interface TreinoParaStory {
  readonly data: string
  readonly grupo: string | null
  readonly duracaoMin: number
  readonly series: number
  readonly volumeKg: number
  /** Volume por exercício, na ordem feita (até 10). */
  readonly blocos: readonly number[]
  /** Maior carga do dia acima do recorde anterior daquele exercício. */
  readonly recorde: { readonly kg: number; readonly exercicio: string; readonly ganhoKg: number } | null
}

/** As últimas sessões (até 120), guardadas no aparelho: Story e "treinou hoje" funcionam sem rede. */
interface HistoricoRow {
  readonly id?: string
  readonly data: string
  readonly grupo_muscular: string | null
  readonly duracao_min: number | null
  readonly series_feitas: unknown
  readonly finalizado_em: string
}
const CHAVE = 'treinos:recentes'

function recentes(): Promise<HistoricoRow[]> {
  return lerComCache(
    CHAVE,
    async () => {
      const { data, error } = await supabase
        .from('treinos_historico')
        .select('id, data, grupo_muscular, duracao_min, series_feitas, finalizado_em')
        .order('finalizado_em', { ascending: false })
        .limit(120)
        .returns<HistoricoRow[]>()
      if (error) throw error
      return data ?? []
    },
    { padrao: [] },
  )
}

async function gravarSessao(linha: Record<string, unknown> & { id: string; data: string; finalizado_em: string }): Promise<void> {
  await escrever(inserir('treinos_historico', linha as never), () =>
    mexerNoCache<HistoricoRow[]>(CHAVE, (atual = []) =>
      atual.some((r) => r.id === linha.id)
        ? atual
        : [
            {
              id: linha.id,
              data: linha.data,
              grupo_muscular: (linha.grupo_muscular as string | null) ?? null,
              duracao_min: (linha.duracao_min as number | null) ?? null,
              series_feitas: linha.series_feitas,
              finalizado_em: linha.finalizado_em,
            },
            ...atual,
          ].slice(0, 120),
    ),
  )
}

const maiorCarga = (e: ExercicioSalvo) => Math.max(0, ...e.series.map((s) => s.carga_kg ?? 0))
const volume = (e: ExercicioSalvo) => e.series.reduce((v, s) => v + (s.carga_kg ?? 0) * (s.reps ?? 0), 0)

export const treinoHistoricoRepository = {
  /**
   * Último treino salvo + recorde pessoal: compara a maior carga de cada
   * exercício com os treinos anteriores (exercício feito pela 1ª vez não
   * conta como recorde).
   */
  async ultimoParaStory(): Promise<TreinoParaStory | null> {
    const [ultimo, ...anteriores] = await recentes()
    if (!ultimo) return null
    const exercicios = (ultimo.series_feitas ?? []) as ExercicioSalvo[]

    const antes = new Map<string, number>()
    for (const linha of anteriores) {
      for (const e of (linha.series_feitas ?? []) as ExercicioSalvo[]) {
        antes.set(e.exercicio_id, Math.max(antes.get(e.exercicio_id) ?? 0, maiorCarga(e)))
      }
    }
    let recorde: TreinoParaStory['recorde'] = null
    for (const e of exercicios) {
      const anterior = antes.get(e.exercicio_id)
      const kg = maiorCarga(e)
      if (anterior === undefined || anterior <= 0 || kg <= anterior) continue
      if (!recorde || kg - anterior > recorde.ganhoKg) recorde = { kg, exercicio: e.nome, ganhoKg: kg - anterior }
    }

    const blocos = exercicios.map(volume).filter((v) => v > 0)
    return {
      data: ultimo.data as string,
      grupo: (ultimo.grupo_muscular as string | null) ?? null,
      duracaoMin: Number(ultimo.duracao_min ?? 0),
      series: exercicios.reduce((n, e) => n + e.series.length, 0),
      volumeKg: Math.round(blocos.reduce((a, b) => a + b, 0)),
      blocos: blocos.slice(0, 10).map(Math.round),
      recorde,
    }
  },


  /** Já tem sessão de treino salva hoje? */
  async treinouHoje(): Promise<boolean> {
    const hoje = hojeISO()
    return (await recentes()).some((r) => r.data === hoje)
  },

  /**
   * Salva a sessão e devolve a ficha atualizada:
   *  - linha em treinos_historico com o que foi feito série a série;
   *  - exercícios completos ficam marcados como concluídos hoje no plano;
   *  - a carga usada vira a carga da ficha (a próxima sessão já começa nela).
   */
  async salvarSessao(sessao: SessaoTreino, agora: number): Promise<void> {
    const userId = await usuarioId()
    const resumo = resumirSessao(sessao, agora)

    await gravarSessao({
      id: novoId(),
      user_id: userId,
      data: hojeISO(),
      local: sessao.local,
      dia_semana: sessao.diaSemana,
      grupo_muscular: grupoPrincipal(sessao),
      iniciado_em: new Date(sessao.iniciadoEm).toISOString(),
      finalizado_em: new Date(agora).toISOString(),
      duracao_min: resumo.duracaoMin,
      exercicios_total: resumo.exerciciosTotal,
      exercicios_feitos: resumo.exerciciosFeitos,
      completo: resumo.completo,
      series_feitas: sessao.exercicios
        .filter((e) => e.feitas.length > 0)
        .map((e) => ({
          exercicio_id: e.exercicioId,
          nome: e.nome,
          medida: e.medida,
          series: e.feitas.map((f) => ({
            carga_kg: f.cargaKg,
            reps: f.reps,
            segundos: f.segundos,
            feita_em: new Date(f.feitaEm).toISOString(),
          })),
        })),
    })

    // Ficha: best-effort — o histórico já foi salvo, falha aqui não perde o treino.
    // Dia leve: só marca o que foi feito; séries e carga aliviadas não viram a ficha.
    // Uma por vez, pela fila: sem rede, sobem depois do histórico, na ordem.
    for (const e of sessao.exercicios.filter((x) => x.feitas.length > 0)) {
      const completo = e.feitas.length >= e.alvo.length
      const valores = sessao.leve
        ? { concluido_em: hojeISO() }
        : {
            series_detalhe: e.alvo.map((alvo, i) => {
              const feita = e.feitas[i] ?? e.feitas[e.feitas.length - 1]
              return { reps: alvo.reps, carga_kg: feita?.cargaKg ?? alvo.cargaKg, segundos: alvo.segundos }
            }),
            ...(completo ? { concluido_em: hojeISO() } : {}),
          }
      await escrever({ op: 'update', tabela: 'treino_plano', valores, filtros: [['id', e.planoId]] }, () =>
        treinoPlanoRepository.anotarLocal(e.planoId, valores),
      ).catch((err: unknown) => console.warn('ficha não atualizada (treino salvo):', err))
    }
    avisarRegistroDoDia()
  },

  /** Dia leve: a caminhada no lugar do treino conta como treino feito. */
  async salvarCaminhada(params: { minutos: number; local: string; diaSemana: string }): Promise<void> {
    const userId = await usuarioId()
    const fim = Date.now()
    await gravarSessao({
      id: novoId(),
      user_id: userId,
      data: hojeISO(),
      local: params.local,
      dia_semana: params.diaSemana,
      grupo_muscular: null,
      iniciado_em: new Date(fim - params.minutos * 60_000).toISOString(),
      finalizado_em: new Date(fim).toISOString(),
      duracao_min: params.minutos,
      exercicios_total: 0,
      exercicios_feitos: 0,
      completo: true,
      series_feitas: [],
    })
    avisarRegistroDoDia()
  },
}
