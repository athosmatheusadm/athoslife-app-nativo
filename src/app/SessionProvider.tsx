import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@data/supabase/client'
import { profileRepository } from '@data/repositories/profileRepository'
import type { Profile } from '@domain/entities/profile'

interface SessionState {
  readonly session: Session | null
  readonly profile: Profile | null
  readonly loading: boolean
  readonly refresh: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(userId: string): Promise<void> {
    // Ordem importa e é regra de negócio:
    // 1) check_access_status() rebaixa plano expirado antes de qualquer leitura.
    // 2) registrarAbertura() dispara o trigger de streak (idempotente por dia).
    // 3) só então lemos o perfil já consistente.
    await profileRepository.verificarAcesso()
    await profileRepository.registrarAbertura()
    setProfile(await profileRepository.buscar(userId))
  }

  useEffect(() => {
    let ativo = true

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      if (ativo) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, novaSessao) => {
        setSession(novaSessao)
        if (!novaSessao) {
          setProfile(null)
          return
        }
        void loadProfile(novaSessao.user.id)
      },
    )

    return () => {
      ativo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<SessionState>(
    () => ({
      session,
      profile,
      loading,
      refresh: async () => {
        if (session) await loadProfile(session.user.id)
      },
    }),
    [session, profile, loading],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de SessionProvider')
  return ctx
}
