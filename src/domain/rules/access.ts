import type { Plano, Profile } from '@domain/entities/profile'

/**
 * FRONTEIRA DE AUTORIDADE — leia antes de mexer.
 *
 * A decisão real de acesso é do Postgres: check_access_status() e
 * is_premium_like(), protegidas por RLS. O servidor é a única fonte
 * de verdade e não confia no client.
 *
 * O que está aqui é apenas o ESPELHO para a interface: decidir se mostra
 * cadeado, badge ou CTA de assinar sem ter que ir ao servidor a cada render.
 *
 * Nunca libere conteúdo pago apoiado somente nestas funções.
 * Quem concede acesso é o backend.
 */

const PLANOS_PAGOS: ReadonlySet<Plano> = new Set<Plano>([
  'premium',
  'fundador',
  'vitalicio',
  'vip',
])

/** Trial ainda válido? Espelha a comparação com trial_expira. */
export function trialAtivo(
  profile: Pick<Profile, 'plano' | 'trialExpira'>,
  agora: Date = new Date(),
): boolean {
  if (profile.plano !== 'trial') return false
  if (!profile.trialExpira) return false
  return profile.trialExpira.getTime() > agora.getTime()
}

/**
 * Espelha is_premium_like(): plano pago OU trial não expirado.
 * O trial de 30 dias dá acesso completo — e não é uma venda,
 * portanto não passa pelo Google Play Billing.
 */
export function temAcessoPremium(
  profile: Pick<Profile, 'plano' | 'trialExpira'>,
  agora: Date = new Date(),
): boolean {
  if (PLANOS_PAGOS.has(profile.plano)) return true
  return trialAtivo(profile, agora)
}

/** Dias restantes de trial, para o banner de contagem regressiva. */
export function diasRestantesTrial(
  profile: Pick<Profile, 'plano' | 'trialExpira'>,
  agora: Date = new Date(),
): number | null {
  if (!trialAtivo(profile, agora)) return null
  const ms = profile.trialExpira!.getTime() - agora.getTime()
  return Math.ceil(ms / 86_400_000)
}
