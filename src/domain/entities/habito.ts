/**
 * Domínio de hábitos.
 *
 * A tabela do banco se chama vicios_user, mas na INTERFACE o tom é sempre
 * ADULTO e SÉRIO — respeita o tamanho da luta, sem punir e sem amenizar.
 * O card usa o nome limpo ("Chocolate", "Fast Food"), nunca "vício em...".
 *
 * Princípio de voz: acolher NÃO é amenizar. Reconhece que é difícil,
 * afirma que passa, devolve o poder pra pessoa. Peso sem acusação.
 *
 * O número que importa é o STREAK. O tropeço se registra em ROXO (acolhe),
 * nunca vermelho (alarme). TypeScript puro, reusável por Android e iOS.
 */

export type IntensidadeHabito = 'leve' | 'medio' | 'forte'
export type StatusHabito = 'firme' | 'atencao'

export interface Habito {
  readonly id: string
  /** Nome limpo, sem peso: "Chocolate", "Fast Food". */
  readonly nome: string
  readonly emoji: string
  readonly categoria: string | null
  readonly gatilhos: readonly string[]
  readonly horarioRisco: string | null
  readonly streakAtual: number
  readonly melhorStreak: number
  readonly totalRecaidas: number
  readonly ultimaRecaida: Date | null
  readonly proximaConquista: number
}

/** "Atenção" é alerta sóbrio (streak recente, mais frágil), nunca punição. */
export function statusHabito(h: Pick<Habito, 'streakAtual'>): StatusHabito {
  return h.streakAtual <= 3 ? 'atencao' : 'firme'
}

/** Rótulo do selo. "Firme" tem força — palavra de peso, não de fofura. */
export function rotuloStatus(s: StatusHabito): string {
  return s === 'firme' ? 'Firme' : 'Momento de atenção'
}

export function progressoConquista(streak: number, meta: number): number {
  if (meta <= 0) return 0
  return Math.min(100, (streak / meta) * 100)
}

export function faltamParaConquista(streak: number, meta: number): number {
  return Math.max(0, meta - streak)
}

export const CAMINHOS_VONTADE = [
  { id: 'esperar', rotulo: 'Vou esperar 10 minutos', emoji: '⏱️' },
  { id: 'alternativa', rotulo: 'Quero uma alternativa', emoji: '🍎' },
  { id: 'passou', rotulo: 'Já passou', emoji: '' },
] as const

export type CaminhoVontade = (typeof CAMINHOS_VONTADE)[number]['id']

/**
 * Mensagem do assistente no momento da vontade.
 * Peso sem punição: reconhece que é forte (respeita), afirma que passa
 * (esperança concreta), faz um pedido firme (não implora).
 */
export function mensagemVontade(temHorarioRisco: boolean): string {
  const abertura = temHorarioRisco
    ? 'Essa vontade costuma vir nesse horário — e ela é real e forte, eu sei.'
    : 'Essa vontade é real e é forte, eu sei.'
  return `${abertura}\n\nMas ela passa. Me dá 10 minutos antes de decidir. Se ainda quiser depois, a gente encara junto.`
}

/**
 * Mensagem no momento do tropeço.
 * Trata como o que foi (difícil), não minimiza, devolve o poder:
 * o streak que passou continua sendo conquista da pessoa.
 */
export function mensagemTropeco(melhorStreak: number): string {
  if (melhorStreak >= 7) {
    return `Foi difícil hoje. Isso não apaga os ${melhorStreak} dias que você aguentou — eles continuam sendo seus.`
  }
  return 'Foi difícil hoje, e tudo bem admitir. Amanhã você tem uma nova chance de recomeçar.'
}
