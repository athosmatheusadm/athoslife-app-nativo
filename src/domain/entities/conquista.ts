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

/**
 * 'hidratacao', não 'agua' — precisa bater com o CHECK de
 * conquistas_catalogo.categoria no Supabase. Já foi bug real: o domínio
 * dizia 'agua' e a categoria de hidratação nunca aparecia (2026-09-24).
 */
export type CategoriaConquista =
  | 'streak'
  | 'treino'
  | 'dieta'
  | 'hidratacao'
  | 'peso'

export type NivelConquista = 'bronze' | 'prata' | 'ouro' | 'diamante' | 'lendario'

export interface Conquista {
  readonly id: string
  readonly titulo: string
  readonly descricao: string
  readonly categoria: CategoriaConquista
  readonly nivel: NivelConquista
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
      return '#e3814a' // energia/fogo
    case 'treino':
      return '#64c27b' // brand
    case 'dieta':
      return '#64c27b'
    case 'hidratacao':
      return '#588cda' // água
    case 'peso':
      return '#e8be62' // ouro
  }
}

/** Cor do selo de nível — bronze→lendário, mesma escala visual do mundo dos jogos. */
export function corNivel(nivel: NivelConquista): string {
  switch (nivel) {
    case 'bronze':
      return '#bf8350'
    case 'prata':
      return '#c0c0c0'
    case 'ouro':
      return '#e3ca69'
    case 'diamante':
      return '#79d4e4'
    case 'lendario':
      return '#da83be'
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
