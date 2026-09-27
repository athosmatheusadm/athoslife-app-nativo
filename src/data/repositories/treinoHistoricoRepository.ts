import { supabase } from '@data/supabase/client'
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
export const treinoHistoricoRepository = {
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
    await Promise.allSettled(
      sessao.exercicios
        .filter((e) => e.feitas.length > 0)
        .map((e) => {
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
  },
}
