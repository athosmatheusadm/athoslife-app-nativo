import type { ExercicioCatalogo } from '@domain/entities/treino'
import { DESCANSO_PADRAO_SEG } from '@domain/entities/sessaoTreino'

/** Aquecimento sugerido no topo do treino rápido do chat (dono, 17/11). */
export const AQUECIMENTO_MIN = 5

/** Segundos por repetição numa execução controlada (só pra estimar o tempo). */
const SEG_POR_REP = 3

/**
 * Tempo aproximado do treino rápido: aquecimento + cada série (execução +
 * descanso padrão do app). Arredonda de 5 em 5 min, mínimo 10.
 * Usa as séries/repetições padrão do catálogo — as mesmas que a ficha usa
 * quando o exercício entra nela.
 */
export function minutosDoTreinoRapido(exercicios: readonly ExercicioCatalogo[]): number {
  let seg = AQUECIMENTO_MIN * 60
  for (const e of exercicios) {
    const execucao = e.medida === 'tempo' ? (e.segundosPadrao ?? 30) : e.repeticoesPadrao * SEG_POR_REP
    seg += e.seriesPadrao * (execucao + DESCANSO_PADRAO_SEG)
  }
  return Math.max(10, Math.round(seg / 300) * 5)
}

export { DESCANSO_PADRAO_SEG }
