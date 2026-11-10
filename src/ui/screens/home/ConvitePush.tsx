import { useEffect, useState } from 'react'
import { Preferences } from '@capacitor/preferences'
import { contatoRepository, MOMENTOS_LIFE } from '@data/repositories/contatoRepository'
import { avisarEstadoDoLife } from '@data/lifePausa'
import { pushAtivo, pushDisponivel, registrarPush } from '@data/notifications/pushLife'
import { useI18n } from '@/i18n/I18nProvider'
import { LifeMascote } from '@ui/components/LifeMascote'

const CHAVE = 'athoslife:convite-push-respondido'

/**
 * O Life pede pra poder chamar (push do servidor, 09/11/2026). Aparece na
 * Home até a pessoa responder, uma vez só: "Pode" liga o "Life pode te
 * chamar" (gravado com log de aceite) e pede a permissão do Android;
 * "Agora não" não volta. Dá pra mudar depois em Perfil > Notificações.
 */
export function ConvitePush() {
  const { m } = useI18n()
  const t = m.home.convitePush
  const [mostrar, setMostrar] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!pushDisponivel) return
    let vivo = true
    void (async () => {
      const { value } = await Preferences.get({ key: CHAVE }).catch(() => ({ value: 'erro' }))
      if (value) return
      const prefs = await contatoRepository.buscar().catch(() => null)
      if (!prefs) return
      if (prefs.lifeLigado && (await pushAtivo())) return
      if (vivo) setMostrar(true)
    })()
    return () => {
      vivo = false
    }
  }, [])

  async function responder(aceitou: boolean) {
    setSalvando(true)
    await Preferences.set({ key: CHAVE, value: aceitou ? 'sim' : 'nao' }).catch(() => {})
    if (aceitou) {
      const atual = await contatoRepository.buscar().catch(() => null)
      const momentos = atual?.lifeMomentos.length ? atual.lifeMomentos : [...MOMENTOS_LIFE]
      await contatoRepository.salvar({ lifeLigado: true, lifeMomentos: momentos }).catch(() => {})
      await registrarPush({ pedir: true }).catch(() => false)
      avisarEstadoDoLife()
    }
    setMostrar(false)
  }

  if (!mostrar) return null

  return (
    <section
      aria-label={m.home.abertura.rotulo}
      className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-surface-4 border-l-[3px] border-l-brand bg-surface-2 px-3.5 py-3"
    >
      <LifeMascote humor="normal" alt="" className="h-12 flex-none" estatico />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-content-hi">{t.texto}</p>
        <div className="mt-1 flex gap-4">
          <button type="button" disabled={salvando} onClick={() => void responder(true)} className="min-h-11 text-sm font-semibold text-brand">
            {t.sim}
          </button>
          <button type="button" disabled={salvando} onClick={() => void responder(false)} className="min-h-11 text-sm text-content-low">
            {t.depois}
          </button>
        </div>
      </div>
    </section>
  )
}
