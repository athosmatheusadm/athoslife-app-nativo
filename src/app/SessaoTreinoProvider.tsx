import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Haptics, NotificationType } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { liveActivity, type AcaoLiveActivity } from '@data/native/liveActivity'
import { treinoHistoricoRepository } from '@data/repositories/treinoHistoricoRepository'
import {
  PASSO_CARGA_KG,
  PASSO_SEGUNDOS,
  adicionarDescanso,
  ajustarCarga,
  ajustarReps,
  ajustarSegundos,
  avancarRelogio,
  confirmarSerie,
  criarSessao,
  iniciarCronometro,
  paraLiveActivity,
  pularDescanso,
  type SessaoTreino,
} from '@domain/entities/sessaoTreino'
import type { DiaSemana, ExercicioPlano, LocalTreino } from '@domain/entities/treino'

/**
 * Dono da sessão de "treino em andamento" no app inteiro — não da tela.
 * Mora acima do roteador porque a Live Activity pode mandar um toque a
 * qualquer momento, e a aba Treinos mostra "Continuar treino" de qualquer
 * lugar.
 *
 * Responsabilidades (a regra de negócio fica em domain/entities/sessaoTreino):
 *  - guardar a sessão no aparelho a cada mudança (sobrevive a fechar o app);
 *  - avançar o relógio (descanso/cronômetro) e vibrar quando acaba;
 *  - agendar um aviso local pro fim do descanso (app no fundo não roda timer);
 *  - espelhar o estado na Live Activity e aplicar os toques que vêm dela.
 */

const CHAVE = 'athos.sessaoTreino.v1'
const ID_AVISO = 910_001

type Transformacao = (s: SessaoTreino, agora: number) => SessaoTreino

interface SessaoTreinoState {
  readonly sessao: SessaoTreino | null
  readonly carregando: boolean
  readonly agora: number
  iniciar(params: { itens: readonly ExercicioPlano[]; local: LocalTreino; diaSemana: DiaSemana }): void
  aplicar(fn: Transformacao): void
  finalizar(): Promise<void>
  descartar(): void
}

const Ctx = createContext<SessaoTreinoState | null>(null)

const nativo = Capacitor.isNativePlatform()

function transformacaoDaAcao(acao: AcaoLiveActivity): Transformacao {
  switch (acao) {
    case 'carga+': return (s) => ajustarCarga(s, PASSO_CARGA_KG)
    case 'carga-': return (s) => ajustarCarga(s, -PASSO_CARGA_KG)
    case 'reps+': return (s) => ajustarReps(s, 1)
    case 'reps-': return (s) => ajustarReps(s, -1)
    case 'seg+': return (s) => ajustarSegundos(s, PASSO_SEGUNDOS)
    case 'seg-': return (s) => ajustarSegundos(s, -PASSO_SEGUNDOS)
    case 'confirmar': return confirmarSerie
    case 'iniciar': return iniciarCronometro
    case 'descanso+15': return (s, agora) => adicionarDescanso(s, 15, agora)
    case 'pular': return (s) => pularDescanso(s)
  }
}

async function vibrar(): Promise<void> {
  if (!nativo) return
  await Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}

/** Aviso do SO pro fim do descanso/cronômetro — o único jeito de tocar com o app no fundo. */
async function agendarAviso(s: SessaoTreino | null): Promise<void> {
  if (!nativo) return
  await LocalNotifications.cancel({ notifications: [{ id: ID_AVISO }] }).catch(() => {})
  if (!s) return
  const fim = s.status === 'descanso' ? s.descansoFimEm : s.status === 'cronometro' ? s.cronometroFimEm : null
  if (fim === null || fim <= Date.now() + 1000) return
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID_AVISO,
        title: s.status === 'descanso' ? 'Descanso acabou 💪' : 'Tempo! ✅',
        body: s.status === 'descanso' ? 'Bora pra próxima série.' : 'Série concluída.',
        schedule: { at: new Date(fim), allowWhileIdle: true },
      },
    ],
  }).catch(() => {})
}

export function SessaoTreinoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<SessaoTreino | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [agora, setAgora] = useState(() => Date.now())
  const statusAnterior = useRef<SessaoTreino['status'] | null>(null)

  const aplicar = useCallback((fn: Transformacao) => {
    setSessao((atual) => (atual ? fn(atual, Date.now()) : atual))
  }, [])

  const aplicarPendentes = useCallback(async () => {
    const acoes = await liveActivity.acoesPendentes()
    for (const a of acoes) aplicar(transformacaoDaAcao(a))
    setSessao((atual) => (atual ? avancarRelogio(atual, Date.now()) : atual))
  }, [aplicar])

  // Carrega do aparelho.
  useEffect(() => {
    void Preferences.get({ key: CHAVE })
      .then(({ value }) => {
        if (!value) return
        const salva = JSON.parse(value) as SessaoTreino
        if (salva?.versao === 1) setSessao(avancarRelogio(salva, Date.now()))
      })
      .catch(() => {})
      .finally(() => {
        setCarregando(false)
        void aplicarPendentes()
      })
  }, [aplicarPendentes])

  // Persiste + espelha na Live Activity + agenda aviso, a cada mudança.
  useEffect(() => {
    if (carregando) return
    if (sessao && sessao.status !== 'concluida') {
      void Preferences.set({ key: CHAVE, value: JSON.stringify(sessao) })
      const estado = paraLiveActivity(sessao)
      if (estado) void liveActivity.mostrar(estado)
    } else if (sessao) {
      void Preferences.set({ key: CHAVE, value: JSON.stringify(sessao) })
      void liveActivity.encerrar()
    } else {
      void Preferences.remove({ key: CHAVE })
      void liveActivity.encerrar()
    }
    void agendarAviso(sessao)

    // Vibra quando o relógio muda o estado sozinho (descanso/cronômetro acabou).
    const antes = statusAnterior.current
    const depois = sessao?.status ?? null
    if ((antes === 'descanso' && depois === 'serie') || (antes === 'cronometro' && depois !== 'cronometro')) {
      void vibrar()
    }
    statusAnterior.current = depois
  }, [sessao, carregando])

  // Relógio: só roda quando tem contagem na tela.
  const contando = sessao?.status === 'descanso' || sessao?.status === 'cronometro'
  useEffect(() => {
    if (!contando) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setAgora(t)
      setSessao((atual) => (atual ? avancarRelogio(atual, t) : atual))
    }, 250)
    return () => window.clearInterval(id)
  }, [contando])

  // Toques na Live Activity + volta do app pro primeiro plano.
  useEffect(() => {
    let desligarToque: (() => void) | null = null
    let desligarApp: (() => void) | null = null
    void liveActivity.aoTocar((acao) => aplicar(transformacaoDaAcao(acao))).then((f) => (desligarToque = f))
    if (nativo) {
      void CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) void aplicarPendentes()
      }).then((h) => (desligarApp = () => void h.remove()))
    }
    return () => {
      desligarToque?.()
      desligarApp?.()
    }
  }, [aplicar, aplicarPendentes])

  const value = useMemo<SessaoTreinoState>(
    () => ({
      sessao,
      carregando,
      agora,
      iniciar: ({ itens, local, diaSemana }) => {
        // A Live Activity e o aviso de fim de descanso são notificações:
        // pede a permissão (Android 13+) já no começo do treino.
        if (nativo) void LocalNotifications.requestPermissions().catch(() => {})
        setSessao(criarSessao({ itens, local, diaSemana, agora: Date.now() }))
      },
      aplicar,
      finalizar: async () => {
        if (!sessao) return
        const temAlgo = sessao.exercicios.some((e) => e.feitas.length > 0)
        if (temAlgo) await treinoHistoricoRepository.salvarSessao(sessao, Date.now())
        setSessao(null)
      },
      descartar: () => setSessao(null),
    }),
    [sessao, carregando, agora, aplicar],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSessaoTreino(): SessaoTreinoState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSessaoTreino fora do SessaoTreinoProvider')
  return v
}
