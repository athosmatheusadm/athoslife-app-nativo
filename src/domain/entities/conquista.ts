/**
 * Domínio de conquistas (gamificação).
 *
 * Baseado nas regras já definidas: o banco tem `avaliar_conquistas()`, que
 * roda após cada ação gamificada e RETORNA APENAS as conquistas novas.
 * Conquista nova -> Life entra no modo `champion` (dourado).
 *
 * Decisão de produto (evolução da regra): o ACERVO de conquistas mora na
 * gaveta lateral (não numa aba fixa), com bolinha de notificação quando há
 * novidade. A CELEBRAÇÃO do desbloqueio é o Life dourado.
 *
 * TypeScript puro, reusável por Android e iOS.
 */

export type CategoriaConquista =
  | 'streak'
  | 'treino'
  | 'dieta'
  | 'agua'
  | 'peso'

export interface Conquista {
  readonly id: string
  readonly titulo: string
  readonly descricao: string
  readonly categoria: CategoriaConquista
  readonly icone: string
  /** Desbloqueada? E quando. */
  readonly desbloqueada: boolean
  readonly desbloqueadaEm: Date | null
  /** Para conquistas progressivas: quanto falta (0–100). */
  readonly progresso: number
}

/** Cor de acento por categoria — coerente com os tokens do app. */
export function corCategoria(cat: CategoriaConquista): string {
  switch (cat) {
    case 'streak':
      return '#f97316' // energia/fogo
    case 'treino':
      return '#22c55e' // brand
    case 'dieta':
      return '#22c55e'
    case 'agua':
      return '#3b82f6' // água
    case 'peso':
      return '#fbbf24' // ouro
  }
}

/** Quantas o usuário já desbloqueou / total — para o cabeçalho do acervo. */
export function resumoAcervo(conquistas: readonly Conquista[]): {
  desbloqueadas: number
  total: number
} {
  return {
    desbloqueadas: conquistas.filter((c) => c.desbloqueada).length,
    total: conquistas.length,
  }
}

/**
 * Há conquistas novas não vistas? Controla a bolinha vermelha da gaveta.
 * "Nova não vista" = desbloqueada depois da última visita ao acervo.
 */
export function temNovidade(
  conquistas: readonly Conquista[],
  ultimaVisita: Date | null,
): boolean {
  if (!ultimaVisita) return conquistas.some((c) => c.desbloqueada)
  return conquistas.some(
    (c) => c.desbloqueada && c.desbloqueadaEm !== null && c.desbloqueadaEm > ultimaVisita,
  )
}
