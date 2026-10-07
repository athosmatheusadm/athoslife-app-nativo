import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nProvider'

/** Topo das sub-páginas da Cozinha (tela cheia, sem bottom nav). */
export function CabecalhoCozinha(props: { titulo: string; onVoltar: () => void; direita?: ReactNode }) {
  const { m } = useI18n()
  return (
    <header className="flex items-center gap-3 px-4 pb-2 pt-3">
      <button type="button" onClick={props.onVoltar} aria-label={m.cozinha.voltar} className="text-content-hi">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <h1 className="flex-1 text-lg font-bold text-content-hi">{props.titulo}</h1>
      {props.direita}
    </header>
  )
}
