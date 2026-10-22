import { supabase } from '@data/supabase/client'
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

const maiorCarga = (e: ExercicioSalvo) => Math.max(0, ...e.series.map((s) => s.carga_kg ?? 0))
const volume = (e: ExercicioSalvo) => e.series.reduce((v, s) => v + (s.carga_kg ?? 0) * (s.reps ?? 0), 0)

export const treinoHistoricoRepository = {
  /**
   * Último treino salvo + recorde pessoal: compara a maior carga de cada
   * exercício com os treinos anteriores (exercício feito pela 1ª vez não
   * conta como recorde).
   */
  async ultimoParaStory(): Promise<TreinoParaStory | null> {
    const { data, error } = await supabase
      .from('treinos_historico')
      .select('data, grupo_muscular, duracao_min, series_feitas, finalizado_em')
      .order('finalizado_em', { ascending: false })
      .limit(120)
    if (error) throw error
    const [ultimo, ...anteriores] = data ?? []
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
    const { count, error } = await supabase
      .from('treinos_historico')
      .select('id', { count: 'exact', head: true })
      .eq('data', hojeISO())
    if (error) throw error
    return (count ?? 0) > 0
  },

  /**
   * Salva a sessão e devolve a ficha atualizada:
   *  - linha em treinos_historico com o que foi feito série a série;
   *  - exercícios completos ficam marcados como concluídos hoje no plano;
   *  - a carga usada vira a carga da ficha (a próxima sessão já começa nela).
   */
  async salvarSessao(sessao: SessaoTreino, agora: number): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const resumo = resumirSessao(sessao, agora)

    const { error } = await supabase.from('treinos_historico').insert({
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
    if (error) throw error

    // Ficha: best-effort — o histórico já foi salvo, falha aqui não perde o treino.
    // Dia leve: só marca o que foi feito; séries e carga aliviadas não viram a ficha.
    await Promise.allSettled(
      sessao.exercicios
        .filter((e) => e.feitas.length > 0)
        .map((e) => {
          if (sessao.leve) {
            return supabase.from('treino_plano').update({ concluido_em: hojeISO() }).eq('id', e.planoId)
          }
          const series_detalhe = e.alvo.map((alvo, i) => {
            const feita = e.feitas[i] ?? e.feitas[e.feitas.length - 1]
            return {
              reps: alvo.reps,
              carga_kg: feita?.cargaKg ?? alvo.cargaKg,
              segundos: alvo.segundos,
            }
          })
          const completo = e.feitas.length >= e.alvo.length
          return supabase
            .from('treino_plano')
            .update({ series_detalhe, ...(completo ? { concluido_em: hojeISO() } : {}) })
            .eq('id', e.planoId)
        }),
    )
    avisarRegistroDoDia()
  },

  /** Dia leve: a caminhada no lugar do treino conta como treino feito. */
  async salvarCaminhada(params: { minutos: number; local: string; diaSemana: string }): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const fim = Date.now()
    const { error } = await supabase.from('treinos_historico').insert({
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
    if (error) throw error
    avisarRegistroDoDia()
  },
}
