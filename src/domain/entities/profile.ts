/**
 * Entidades do domínio ATHOSlife.
 *
 * TypeScript puro. Sem React, sem Supabase, sem Capacitor.
 * É exatamente esta camada que Android e iOS reusam sem alteração.
 */

/** Planos existentes no backend (coluna profiles.plano). */
export const PLANOS = [
  'trial',
  'free',
  'premium',
  'fundador',
  'vitalicio',
  'vip',
] as const

export type Plano = (typeof PLANOS)[number]

/** Modos do mascote Life, em ordem de prioridade (maior vence). */
export const MASCOTE_MODOS = [
  'champion',
  'critical',
  'rescue',
  'struggle',
  'athlete',
  'chef',
  'scanner',
  'active',
] as const

export type MascoteModo = (typeof MASCOTE_MODOS)[number]

export type Objetivo = 'emagrecer' | 'massa' | 'manter'

export type Sexo = 'masculino' | 'feminino' | 'outro' | 'prefiro_nao_dizer'

/** Metas diárias. Calculadas no onboarding, editáveis, personalizáveis por IA. */
export interface Metas {
  readonly kcal: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
  readonly aguaMl: number
  readonly passos: number
}

export interface Profile {
  readonly id: string
  readonly nome: string | null
  readonly avatarUrl: string | null
  readonly sexo: Sexo | null
  readonly alturaCm: number | null
  readonly idade: number | null
  readonly pesoAtual: number | null
  /** null enquanto o onboarding real não pergunta (hoje é esqueleto). */
  readonly objetivo: Objetivo | null
  readonly pesoMeta: number | null
  readonly plano: Plano
  readonly trialExpira: Date | null
  readonly assinaturaAtiva: boolean
  readonly isAdmin: boolean

  readonly onboardingCompleto: boolean
  readonly consentimentoAceito: boolean
  readonly consentimentoHabitos: boolean

  readonly streakAtual: number
  readonly maiorStreak: number
  readonly lastAppOpen: Date | null

  readonly mascoteModoAtual: MascoteModo
  readonly metas: Metas
}

/**
 * Progresso de uma meta, limitado a 100%.
 * Regra preservada do legado: min(100, (atual / meta) * 100).
 */
export function calcularProgresso(atual: number, meta: number): number {
  if (meta <= 0) return 0
  return Math.min(100, (atual / meta) * 100)
}
