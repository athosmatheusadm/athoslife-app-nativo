import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useSession } from './SessionProvider'
import { SplashGate } from '@ui/screens/SplashGate'

/**
 * Ordem dos guards — regra de negócio, não detalhe de implementação:
 *
 *   sessão? -> consentimento aceito? -> onboarding completo? -> /home
 *
 * Inverter esta ordem quebra a LGPD: coletar dados de onboarding
 * antes do aceite é justamente o que o consentimento existe para impedir.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useSession()
  const location = useLocation()

  if (loading) return <SplashGate />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  if (!profile) return <SplashGate />

  if (!profile.consentimentoAceito) {
    return <Navigate to="/consentimento" replace />
  }
  if (!profile.onboardingCompleto) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

/** Impede que quem já está logado volte para o login. */
export function RequireAnon({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()
  if (loading) return <SplashGate />
  if (session) return <Navigate to="/home" replace />
  return <>{children}</>
}
