import type { ExercicioCatalogo } from '@domain/entities/treino'
import { DESCANSO_PADRAO_SEG } from '@domain/entities/sessaoTreino'

/** Aquecimento sugerido no topo do treino rápido do chat (dono, 17/11). */
export const AQUECIMENTO_MIN = 5

/** Segundos por repetição numa execução controlada (só pra estimar o tempo). */
const SEG_POR_REP = 3

/** Mesmo teto do servidor (supabase/functions/ai-proxy/treinoRapido.ts — mudou lá, muda aqui). */
const TETO_SERIES = 10

/**
 * Séries de cada exercício do treino rápido, iguais às que o servidor grava
 * na ficha: o padrão do catálogo (no máximo 3), e só os dois primeiros ficam
 * com 3 quando o total passaria do teto.
 */
export function seriesDoTreinoRapido(exercicios: readonly ExercicioCatalogo[]): number[] {
  let total = 0
  return exercicios.map((e, i) => {
    const padrao = Math.min(Math.max(e.seriesPadrao || 3, 1), 3)
    const restam = exercicios.length - i - 1
    const n = Math.max(1, Math.min(padrao, TETO_SERIES - total - restam * 2, i < 2 ? 3 : 2))
    total += n
    return n
  })
}

/**
 * Tempo aproximado do treino rápido: aquecimento + cada série (execução +
 * descanso padrão do app). Arredonda de 5 em 5 min, mínimo 10.
 */
export function minutosDoTreinoRapido(exercicios: readonly ExercicioCatalogo[]): number {
  const series = seriesDoTreinoRapido(exercicios)
  let seg = AQUECIMENTO_MIN * 60
  exercicios.forEach((e, i) => {
    const execucao = e.medida === 'tempo' ? (e.segundosPadrao ?? 30) : e.repeticoesPadrao * SEG_POR_REP
    seg += (series[i] ?? 0) * (execucao + DESCANSO_PADRAO_SEG)
  })
  return Math.max(10, Math.round(seg / 300) * 5)
}

export { DESCANSO_PADRAO_SEG }
