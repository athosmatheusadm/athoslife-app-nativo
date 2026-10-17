import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@data/supabase/client'
import { profileRepository, type StatusTesteGratis } from '@data/repositories/profileRepository'
import { idDoAparelho } from '@data/native/aparelho'
import { encerrarAssinaturas, iniciarAssinaturas } from '@data/assinatura/revenuecat'
import type { Profile } from '@domain/entities/profile'

interface SessionState {
  readonly session: Session | null
  readonly profile: Profile | null
  readonly loading: boolean
  /** Resposta do pedido de teste grátis desta sessão (null = não pediu). */
  readonly statusTeste: StatusTesteGratis | null
  readonly refresh: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusTeste, setStatusTeste] = useState<StatusTesteGratis | null>(null)
  // Um pedido de teste por conta por abertura do app.
  const testePedido = useRef<string | null>(null)
  // Uma sincronização com a loja por conta por abertura do app; mudanças
  // depois disso chegam pelo ouvinte do RevenueCat e pelo webhook.
  const lojaIniciada = useRef<string | null>(null)

  async function loadProfile(userId: string): Promise<void> {
    // Ordem importa e é regra de negócio:
    // 1) check_access_status() rebaixa plano expirado antes de qualquer leitura.
    // 2) registrarAbertura() dispara o trigger de streak (idempotente por dia).
    // 3) só então lemos o perfil já consistente.
    await profileRepository.verificarAcesso()
    await profileRepository.registrarAbertura()
    const perfil = await profileRepository.buscar(userId)
    setProfile(perfil)

    // Assinatura da Play Store (RevenueCat). Não segura a abertura; se o
    // servidor mudou o plano, relê o perfil. No-op fora do Android/sem chave.
    if (lojaIniciada.current !== userId) {
      lojaIniciada.current = userId
      void iniciarAssinaturas(userId).then(async (r) => {
        if (r && r.direito.plano !== perfil?.plano) setProfile(await profileRepository.buscar(userId))
      })
    }

    // 4) Conta nova nasce sem dias de teste: o app pede os 7 dias com o id
    //    do aparelho e o servidor decide (db/athoslife_protecao_ia_migration.sql).
    //    Falhar aqui nunca impede de usar o app — fica no grátis.
    const semTeste = perfil && !perfil.trialExpira && (perfil.plano === 'trial' || perfil.plano === 'free')
    if (!semTeste || testePedido.current === userId) return
    testePedido.current = userId
    try {
      const aparelho = await idDoAparelho()
      if (!aparelho) return
      const status = await profileRepository.liberarTesteGratis(aparelho)
      setStatusTeste(status)
      if (status === 'liberado') setProfile(await profileRepository.buscar(userId))
    } catch (err) {
      console.warn('teste grátis:', err)
    }
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
          setStatusTeste(null)
          testePedido.current = null
          lojaIniciada.current = null
          void encerrarAssinaturas()
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
      statusTeste,
      refresh: async () => {
        if (session) await loadProfile(session.user.id)
      },
    }),
    [session, profile, loading, statusTeste],
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
