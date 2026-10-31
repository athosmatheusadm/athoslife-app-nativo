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
import { perfilGuardado, profileRepository, type StatusTesteGratis } from '@data/repositories/profileRepository'
import { ehFalhaDeRede } from '@data/offline/conexao'
import { ligarSincronia } from '@data/offline/sincronia'
import { definirUsuarioAtual, sessaoGuardada } from '@data/offline/usuario'
import { idDoAparelho } from '@data/native/aparelho'
import { encerrarAssinaturas, iniciarAssinaturas } from '@data/assinatura/revenuecat'
import type { Profile } from '@domain/entities/profile'

interface SessionState {
  readonly session: Session | null
  readonly profile: Profile | null
  readonly loading: boolean
  /** Resposta do pedido de teste grátis desta sessão (null = não pediu). */
  readonly statusTeste: StatusTesteGratis | null
  /**
   * Abriu sem internet e sem nenhuma cópia do perfil no aparelho (1º acesso
   * neste celular, ou dados apagados): a tela de "Sem conexão" oferece
   * tentar de novo em vez de girar pra sempre.
   */
  readonly semConexao: boolean
  readonly refresh: () => Promise<void>
}

const SessionContext = createContext<SessionState | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusTeste, setStatusTeste] = useState<StatusTesteGratis | null>(null)
  const [semConexao, setSemConexao] = useState(false)
  // Um pedido de teste por conta por abertura do app.
  const testePedido = useRef<string | null>(null)
  // Uma sincronização com a loja por conta por abertura do app; mudanças
  // depois disso chegam pelo ouvinte do RevenueCat e pelo webhook.
  const lojaIniciada = useRef<string | null>(null)

  // Perfil já carregado pra esta conta: o Supabase avisa "entrou" mais de uma
  // vez na abertura (sessão inicial, renovação do token) e cada aviso rodava
  // tudo de novo — 3× check_access_status por abertura.
  const carregadoPara = useRef<string | null>(null)

  async function loadProfile(userId: string): Promise<void> {
    carregadoPara.current = userId
    definirUsuarioAtual(userId)
    ligarSincronia()
    setSemConexao(false)

    // 1) Abre na hora com a cópia do aparelho (funciona sem internet).
    const guardado = await perfilGuardado()
    if (guardado?.id === userId) setProfile(guardado)

    // 2) Servidor. Ordem importa e é regra de negócio:
    //    check_access_status() rebaixa plano expirado antes da leitura;
    //    registrarAbertura() dispara o trigger de streak (idempotente por dia);
    //    só então lemos o perfil já consistente. Sem rede, as duas primeiras
    //    ficam pra próxima abertura e o perfil vem da cópia.
    const atualizar = async (): Promise<Profile | null> => {
      try {
        await profileRepository.verificarAcesso()
        await profileRepository.registrarAbertura()
      } catch (err) {
        if (!ehFalhaDeRede(err)) console.warn('abertura:', err)
      }
      const perfil = await profileRepository.buscar(userId)
      if (carregadoPara.current === userId) setProfile(perfil)
      return perfil
    }

    let perfil: Profile | null
    if (guardado?.id === userId) {
      // Já tem tela: o servidor atualiza por trás, sem segurar a abertura.
      void atualizar()
        .then((p) => p && depoisDoPerfil(userId, p))
        .catch(() => {})
      return
    }
    try {
      perfil = await atualizar()
    } catch (err) {
      if (ehFalhaDeRede(err)) setSemConexao(true)
      else console.warn('perfil:', err)
      return
    }
    if (perfil) await depoisDoPerfil(userId, perfil)
  }

  /** Loja e teste grátis: só com o perfil do servidor; falhar aqui nunca impede de usar o app. */
  async function depoisDoPerfil(userId: string, perfil: Profile): Promise<void> {
    // Assinatura da Play Store (RevenueCat). Não segura a abertura; se o
    // servidor mudou o plano, relê o perfil. No-op fora do Android/sem chave.
    if (lojaIniciada.current !== userId) {
      lojaIniciada.current = userId
      void iniciarAssinaturas(userId)
        .then(async (r) => {
          if (r && r.direito.plano !== perfil.plano) setProfile(await profileRepository.buscar(userId))
        })
        .catch(() => {})
    }

    // 3) Conta nova nasce sem dias de teste: o app pede os 7 dias com o id
    //    do aparelho e o servidor decide (db/athoslife_protecao_ia_migration.sql).
    //    Falhar aqui nunca impede de usar o app — fica no grátis.
    const semTeste = !perfil.trialExpira && (perfil.plano === 'trial' || perfil.plano === 'free')
    if (!semTeste || testePedido.current === userId) return
    testePedido.current = userId
    try {
      const aparelho = await idDoAparelho()
      if (!aparelho) return
      const status = await profileRepository.liberarTesteGratis(aparelho)
      setStatusTeste(status)
      if (status === 'liberado') setProfile(await profileRepository.buscar(userId))
    } catch (err) {
      // Sem rede: pede de novo na próxima abertura.
      if (ehFalhaDeRede(err)) testePedido.current = null
      console.warn('teste grátis:', err)
    }
  }

  useEffect(() => {
    let ativo = true

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!ativo) return
      // Sem internet com o token vencido, o supabase-js não consegue renovar
      // e devolve sessão vazia — mas ela continua guardada. Quem tem conta
      // neste celular entra mesmo assim; quando a rede volta, renova sozinha.
      const sessao = data.session ?? (error && ehFalhaDeRede(error) ? await sessaoGuardada() : null)
      setSession(sessao)
      if (sessao) await loadProfile(sessao.user.id)
      if (ativo) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, novaSessao) => {
        if (!novaSessao) {
          setSession(null)
          setProfile(null)
          setStatusTeste(null)
          setSemConexao(false)
          definirUsuarioAtual(null)
          carregadoPara.current = null
          testePedido.current = null
          lojaIniciada.current = null
          void encerrarAssinaturas()
          return
        }
        setSession(novaSessao)
        // Renovação de token e avisos repetidos não recarregam o perfil.
        if (carregadoPara.current !== novaSessao.user.id) void loadProfile(novaSessao.user.id)
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
      semConexao,
      refresh: async () => {
        if (session) await loadProfile(session.user.id)
      },
    }),
    [session, profile, loading, statusTeste, semConexao],
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
