import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { supabase } from '@data/supabase/client'
import { mensagensAtuais } from '@/i18n/dicionarios'

/** Faixa de ids só dos alôs (não cruza hábitos 910k, lembretes 920–930k, avulsos 940–950k). */
export const ID_AVISO_MIN = 950_000
export const ID_AVISO_MAX = 960_000
/** Evento: os alôs mudaram (licença, "não precisa", tropeço anotado) — reagendar. */
export const EVENTO_AVISOS = 'athos:avisos-mudaram'

const idDo = (uuid: string) => ID_AVISO_MIN + (parseInt(uuid.replace(/-/g, '').slice(0, 7), 16) % (ID_AVISO_MAX - ID_AVISO_MIN))

/**
 * O "oi" do Life na semana seguinte a um tropeço (Fase 5, db/athoslife_aviso_risco_migration.sql).
 * O servidor marca o alô (só com licença da pessoa e com o recurso ligado);
 * aqui o app agenda no aparelho os que estão `agendado` e ainda vão chegar.
 * Texto neutro e variado — nunca cita o hábito (aparece na tela bloqueada).
 * Chamar ao abrir o app, ao voltar pra ele e quando chegar EVENTO_AVISOS.
 */
export async function sincronizarAvisos(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const { data, error } = await supabase.from('life_avisos').select('id, enviar_em')
    .eq('estado', 'agendado').gt('enviar_em', new Date().toISOString()).limit(20)
  if (error) return // tabela ainda não criada ou sem rede: mantém o que já estava
  const { notifications } = await LocalNotifications.getPending()
  const antigos = notifications.filter((n) => n.id >= ID_AVISO_MIN && n.id < ID_AVISO_MAX)
  if (antigos.length) await LocalNotifications.cancel({ notifications: antigos.map((n) => ({ id: n.id })) })
  const lista = (data ?? []) as { id: string; enviar_em: string }[]
  if (!lista.length) return
  const m = mensagensAtuais()
  const textos = m.lembretes.avisoOi
  await LocalNotifications.schedule({
    notifications: lista.map((a, i) => ({
      id: idDo(a.id),
      title: m.lembretes.titulo,
      body: textos[(idDo(a.id) + i) % textos.length] ?? textos[0]!,
      schedule: { at: new Date(a.enviar_em), allowWhileIdle: true },
      extra: { avisoId: a.id },
    })),
  })
}
