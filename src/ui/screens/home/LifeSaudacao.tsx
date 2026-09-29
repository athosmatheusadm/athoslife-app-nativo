import { useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { diasSemAbrir, DIAS_PARA_RESGATE } from '@app/ausencia'
import { LifeMascote } from '@ui/components/LifeMascote'
import { LifeChatSheet } from '@ui/screens/habits/LifeChatSheet'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * O Life na Home: normal no dia a dia, "resgate" (caneca "Cadê você?")
 * quando a pessoa volta depois de dias fora. Tocar abre o chat — o jeito
 * combinado com o dono de chegar no chat (sem botão "💬 Life").
 */
export function LifeSaudacao() {
  const { profile } = useSession()
  const { m } = useI18n()
  const [chatAberto, setChatAberto] = useState(false)
  const [resgate] = useState(() => diasSemAbrir() >= DIAS_PARA_RESGATE)

  const nome = profile?.nome?.split(' ')[0]?.trim() || null
  const fala = resgate
    ? nome ? m.home.lifeResgate(nome) : m.home.lifeResgateSemNome
    : nome ? m.home.lifeOi(nome) : m.home.lifeOiSemNome

  return (
    <>
      <button
        type="button"
        onClick={() => setChatAberto(true)}
        aria-label={m.home.lifeToque}
        className="flex w-full items-end gap-3 text-left transition-transform active:scale-[0.99]"
      >
        <LifeMascote humor={resgate ? 'resgate' : 'normal'} className="h-24 flex-none" />
        <span className="relative mb-4 flex-1 rounded-2xl rounded-bl-sm border border-surface-4 bg-surface-2 px-3.5 py-2.5">
          <span className="block text-sm font-semibold leading-snug text-content-hi">{fala}</span>
          <span className="mt-0.5 block text-micro text-content-dim">{m.home.lifeToque}</span>
        </span>
      </button>
      {chatAberto && <LifeChatSheet onFechar={() => setChatAberto(false)} />}
    </>
  )
}
