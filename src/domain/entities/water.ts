import { formatarNumero } from '@domain/rules/formatoNumero'
/**
 * Domínio de hidratação.
 *
 * TypeScript puro. A regra de "quanto já bebi / quanto falta" mora aqui,
 * não na tela. Android e iOS reusam sem tocar.
 */

/** Um gole registrado, já no formato do domínio. */
export interface RegistroAgua {
  readonly id: string
  readonly quantidadeMl: number
  readonly criadoEm: Date
}

/** Estado da hidratação do dia — o que o card de água mostra. */
export interface AguaDoDia {
  readonly totalMl: number
  readonly metaMl: number
  readonly registros: readonly RegistroAgua[]
}

/** Quantidades de atalho do card (os botões +100/+250/+500). */
export const ATALHOS_AGUA_ML = [100, 250, 500] as const

/**
 * Progresso 0–100, teto em 100 (regra preservada do legado).
 * Mesma fórmula usada em qualquer meta do app.
 */
export function progressoAgua(totalMl: number, metaMl: number): number {
  if (metaMl <= 0) return 0
  return Math.min(100, (totalMl / metaMl) * 100)
}

/** Quanto ainda falta para a meta (nunca negativo). */
export function faltaParaMeta(totalMl: number, metaMl: number): number {
  return Math.max(0, metaMl - totalMl)
}

/** Formata ml para leitura humana: 1560 -> "1,56 L", 800 -> "800 ml". */
export function formatarVolume(ml: number): string {
  if (ml < 1000) return `${formatarNumero(ml)} ml`
  // Até 2 casas, sem zero sobrando: 2,75 L / 2,8 L / 3 L — igual em todo o app.
  return `${formatarNumero(ml / 1000, 2)} L`
}
