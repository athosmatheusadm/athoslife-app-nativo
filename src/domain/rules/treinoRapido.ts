import type { ExercicioCatalogo } from '@domain/entities/treino'

/** Aquecimento sugerido no topo do treino rápido do chat (dono, 17/11). */
export const AQUECIMENTO_MIN = 5

/** Descanso entre séries mostrado no cartão do treino rápido (formato do dono, 17/11). */
export const DESCANSO_RAPIDO_SEG = 60

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
 * descanso do cartão). Arredonda de 5 em 5 min, mínimo 10.
 */
export function minutosDoTreinoRapido(
  exercicios: readonly ExercicioCatalogo[],
  /** O que a pessoa mudou no cartão, na mesma ordem (18/11). */
  ajustes: readonly ({ series?: number; reps?: number; segundos?: number } | undefined)[] = [],
): number {
  const series = seriesDoTreinoRapido(exercicios)
  let seg = AQUECIMENTO_MIN * 60
  exercicios.forEach((e, i) => {
    const a = ajustes[i]
    const execucao = e.medida === 'tempo' ? (a?.segundos ?? e.segundosPadrao ?? 30) : (a?.reps ?? e.repeticoesPadrao) * SEG_POR_REP
    seg += (a?.series ?? series[i] ?? 0) * (execucao + DESCANSO_RAPIDO_SEG)
  })
  return Math.max(10, Math.round(seg / 300) * 5)
}

/**
 * Repetições como faixa ("10–12"), como no formato do dono: a ficha grava o
 * número de cima (o padrão do catálogo). Abaixo de 8 fica o número só.
 */
export function faixaDeReps(reps: number): string {
  return reps >= 8 ? `${reps - 2}–${reps}` : String(reps)
}
