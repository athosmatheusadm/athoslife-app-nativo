import { LocalNotifications } from '@capacitor/local-notifications'

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
        body: `Hora de ${params.nomeHabito.toLowerCase()} 🌱`,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  })
}

export async function cancelarLembrete(habitoId: string): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: idNumerico(habitoId) }] })
}
