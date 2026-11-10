import { useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { LifeMascote } from '@ui/components/LifeMascote'

/**
 * Licença do oi da semana que vem, depois do "Hoje eu cedi" (Fase 5).
 * Mesmo texto e mesmas opções que o Life usa no chat; some ao responder.
 */
export function PerguntaOi(props: { dia: number; onResponder: (pode: boolean) => Promise<void> }) {
  const { m } = useI18n()
  const t = m.habitos.perguntaOi
  const [salvando, setSalvando] = useState(false)

  async function responder(pode: boolean) {
    setSalvando(true)
    await props.onResponder(pode).finally(() => setSalvando(false))
  }

  return (
    <section
      aria-live="polite"
      className="flex items-start gap-3 rounded-2xl border border-surface-4 border-l-[3px] border-l-brand bg-surface-2 px-3.5 py-3"
    >
      <LifeMascote humor="normal" alt="" className="h-12 flex-none" estatico />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-content-hi">{t.texto(t.queVem[props.dia] ?? '')}</p>
        <div className="mt-1 flex gap-4">
          <button type="button" disabled={salvando} onClick={() => void responder(true)} className="min-h-11 text-sm font-semibold text-brand">
            {t.pode}
          </button>
          <button type="button" disabled={salvando} onClick={() => void responder(false)} className="min-h-11 text-sm text-content-low">
            {t.naoPrecisa}
          </button>
        </div>
      </div>
    </section>
  )
}
