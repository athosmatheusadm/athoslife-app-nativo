import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { mensagensAtuais } from '@/i18n/dicionarios'

/**
 * Camada 1 (regra fixa, "burra, mas nunca falha") do modelo de notificações
 * descrito em docs/ATHOSlife_Notificacoes_Life.md: lembrete diário num
 * horário fixo, agendado no próprio aparelho — sem servidor, sem Firebase.
 * A Camada 2 (a Life percebendo que o usuário ignorou/esqueceu e reagindo
 * diferente) é outra peça, que depende de push de verdade (FCM) e do
 * `relogio-athos` no servidor — ver esse doc pra escopo e fases.
 *
 * Não existe coluna no banco pra guardar isso: o próprio agendamento do SO
 * é a fonte de verdade (sobrevive a restart do app, some se o usuário
 * desinstalar). `buscarLembrete` consulta o SO, nunca inventa um horário.
 */

/** Converte o UUID do hábito num id numérico estável pro Capacitor (int32 positivo). */
function idNumerico(habitoId: string): number {
  let hash = 0
  for (let i = 0; i < habitoId.length; i++) {
    hash = (hash * 31 + habitoId.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

export async function pedirPermissaoLembrete(): Promise<boolean> {
  const status = await LocalNotifications.checkPermissions()
  if (status.display === 'granted') return true
  const pedido = await LocalNotifications.requestPermissions()
  return pedido.display === 'granted'
}

/** HH:mm do lembrete agendado pra esse hábito, ou null se não houver nenhum. */
export async function buscarLembrete(habitoId: string): Promise<string | null> {
  const id = idNumerico(habitoId)
  // Em pausa o repetido sai do SO e fica guardado (ver sincronizarLembretesHabito).
  const guardado = (await lerGuardados()).find((g) => g.id === id)
  if (guardado) return `${String(guardado.hour).padStart(2, '0')}:${String(guardado.minute).padStart(2, '0')}`
  const { notifications } = await LocalNotifications.getPending()
  const pendente = notifications.find((n) => n.id === id)
  if (!pendente?.schedule || !('on' in pendente.schedule) || !pendente.schedule.on) return null
  const { hour, minute } = pendente.schedule.on
  if (hour === undefined || minute === undefined) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export async function agendarLembrete(params: {
  habitoId: string
  nomeHabito: string
  horaMinuto: string // "HH:mm"
}): Promise<void> {
  const liberado = await pedirPermissaoLembrete()
  if (!liberado) throw new Error('permissao_negada')

  const partes = params.horaMinuto.split(':')
  const hour = Number(partes[0])
  const minute = Number(partes[1])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) throw new Error('horario_invalido')
  const id = idNumerico(params.habitoId)

  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title: 'Athos',
        body: mensagensAtuais().lembretes.habito(params.nomeHabito),
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  })
}

export async function cancelarLembrete(habitoId: string): Promise<void> {
  const id = idNumerico(habitoId)
  const guardados = await lerGuardados()
  const g = guardados.find((x) => x.id === id)
  await LocalNotifications.cancel({ notifications: [{ id }, ...(g?.avulsos ?? []).map((a) => ({ id: a }))] })
  if (g) await salvarGuardados(guardados.filter((x) => x.id !== id))
}

// ── Pausa do Life (08/10) ──────────────────────────────────────────────
// O lembrete de hábito repete todo dia no SO e não dá pra pular só hoje.
// Pausou: guarda o repetido, cancela, e agenda avisos AVULSOS a partir de
// amanhã (assim ainda tocam se o app não for aberto). Abriu num dia sem
// pausa: volta o repetido e some com os avulsos.
const CHAVE_PAUSA = 'athoslife:habitos-em-pausa'
const AVULSO_BASE = 940_000
const AVULSO_FIM = 950_000
const DIAS_AVULSOS = 7
/** Faixas de outros avisos do app (descanso do treino, lembretes do dia) — não são de hábito. */
const FORA_DE_HABITO = (id: number) => (id >= 910_000 && id < 911_000) || (id >= 920_000 && id < 930_000) || (id >= AVULSO_BASE && id < AVULSO_FIM)

interface Guardado {
  id: number
  title: string
  body: string
  hour: number
  minute: number
  avulsos: number[]
}

async function lerGuardados(): Promise<Guardado[]> {
  try {
    const { value } = await Preferences.get({ key: CHAVE_PAUSA })
    const lista: unknown = value ? JSON.parse(value) : []
    return Array.isArray(lista) ? (lista as Guardado[]) : []
  } catch {
    return []
  }
}

async function salvarGuardados(lista: Guardado[]): Promise<void> {
  if (lista.length === 0) await Preferences.remove({ key: CHAVE_PAUSA })
  else await Preferences.set({ key: CHAVE_PAUSA, value: JSON.stringify(lista) })
}

export async function sincronizarLembretesHabito(pausadoHoje: boolean): Promise<void> {
  const guardados = await lerGuardados()
  const { notifications } = await LocalNotifications.getPending()

  if (!pausadoHoje) {
    if (guardados.length === 0) return
    const avulsos = notifications.filter((n) => n.id >= AVULSO_BASE && n.id < AVULSO_FIM).map((n) => ({ id: n.id }))
    if (avulsos.length) await LocalNotifications.cancel({ notifications: avulsos })
    await LocalNotifications.schedule({
      notifications: guardados.map((g) => ({
        id: g.id,
        title: g.title,
        body: g.body,
        schedule: { on: { hour: g.hour, minute: g.minute }, allowWhileIdle: true },
      })),
    })
    await salvarGuardados([])
    return
  }

  // Pausado: junta os repetidos que ainda estão no SO com os já guardados.
  const repetidos = notifications.filter(
    (n) => !FORA_DE_HABITO(n.id) && !!n.schedule && 'on' in n.schedule && n.schedule.on?.hour !== undefined,
  )
  const todos = new Map(guardados.map((g) => [g.id, g]))
  for (const n of repetidos) {
    const on = n.schedule && 'on' in n.schedule ? n.schedule.on : undefined
    if (!on || on.hour === undefined || on.minute === undefined) continue
    todos.set(n.id, { id: n.id, title: n.title ?? 'Athos', body: n.body ?? '', hour: on.hour, minute: on.minute, avulsos: [] })
  }
  if (todos.size === 0) return

  const cancelar = [
    ...repetidos.map((n) => ({ id: n.id })),
    ...notifications.filter((n) => n.id >= AVULSO_BASE && n.id < AVULSO_FIM).map((n) => ({ id: n.id })),
  ]
  if (cancelar.length) await LocalNotifications.cancel({ notifications: cancelar })

  const agora = new Date()
  const lista = [...todos.values()].slice(0, Math.floor((AVULSO_FIM - AVULSO_BASE) / DIAS_AVULSOS))
  const agendar = lista.flatMap((g, i) =>
    Array.from({ length: DIAS_AVULSOS }, (_, d) => {
      const at = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + d + 1, g.hour, g.minute)
      return { id: AVULSO_BASE + i * DIAS_AVULSOS + d, title: g.title, body: g.body, schedule: { at, allowWhileIdle: true } }
    }),
  )
  await LocalNotifications.schedule({ notifications: agendar })
  await salvarGuardados(lista.map((g, i) => ({ ...g, avulsos: agendar.slice(i * DIAS_AVULSOS, (i + 1) * DIAS_AVULSOS).map((a) => a.id) })))
}
