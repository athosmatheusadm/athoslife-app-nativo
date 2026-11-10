import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { Preferences } from '@capacitor/preferences'
import { supabase } from '@data/supabase/client'
import { mensagensAtuais } from '@/i18n/dicionarios'

/**
 * Push do Life pelo servidor (supabase/functions/life-push, 09/11/2026).
 * O app só registra o aparelho e diz quando a pessoa abriu um push; quem
 * decide quando e o quê é o servidor. Com o push ativo, os check-ins fixos
 * do aparelho saem (o servidor faz isso melhor): ver lembretesDiarios.ts.
 */
const CHAVE_TOKEN = 'athoslife:push-token'

export const pushDisponivel = Capacitor.isNativePlatform() && __PUSH_PRONTO__

/** Este aparelho recebe o push do servidor? */
export async function pushAtivo(): Promise<boolean> {
  if (!pushDisponivel) return false
  const { value } = await Preferences.get({ key: CHAVE_TOKEN }).catch(() => ({ value: null }))
  return !!value
}

let ouvindo = false

/**
 * Registra o aparelho (pede a permissão do Android 13+ se ainda não tiver).
 * `pedir: false`: só registra se a permissão já foi dada — ao abrir o app.
 */
export async function registrarPush(opc: { pedir: boolean }): Promise<boolean> {
  if (!pushDisponivel) return false
  let perm = await PushNotifications.checkPermissions()
  if (perm.receive !== 'granted' && opc.pedir) perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return false

  if (!ouvindo) {
    ouvindo = true
    await PushNotifications.addListener('registration', ({ value }) => {
      void supabase.rpc('registrar_push_dispositivo', { p_token: value, p_plataforma: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android' })
        .then(({ error }) => {
          if (error) console.warn('push: registrar aparelho falhou', error.message)
          else void Preferences.set({ key: CHAVE_TOKEN, value })
        })
    })
    await PushNotifications.addListener('registrationError', (e) => console.warn('push: registro falhou', e.error))
  }
  // Canal próprio do Life no Android (som e importância normais).
  await PushNotifications.createChannel({
    id: 'life',
    name: mensagensAtuais().lembretes.canalLife,
    importance: 4,
    visibility: 0,
  }).catch(() => {})
  await PushNotifications.register()
  return true
}

/** Sair da conta: o aparelho para de receber o push desta pessoa. */
export async function esquecerPush(): Promise<void> {
  if (!pushDisponivel) return
  const { value } = await Preferences.get({ key: CHAVE_TOKEN }).catch(() => ({ value: null }))
  if (value) await supabase.rpc('remover_push_dispositivo', { p_token: value }).then(() => {}, () => {})
  await Preferences.remove({ key: CHAVE_TOKEN }).catch(() => {})
}

/** Tocou no push: marca aberto (o servidor aprende o que a pessoa ignora) e avisa quem abre o chat. */
export function aoTocarNoPush(fn: (dados: { rota: string | null; abrirLife: boolean }) => void): () => void {
  if (!pushDisponivel) return () => {}
  const h = PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const d = (notification.data ?? {}) as Record<string, unknown>
    if (typeof d.envioId === 'string') void supabase.rpc('marcar_push_aberto', { p_id: d.envioId }).then(() => {}, () => {})
    fn({ rota: typeof d.rota === 'string' ? d.rota : null, abrirLife: d.abrirLife === '1' })
  })
  return () => void h.then((x) => x.remove())
}
