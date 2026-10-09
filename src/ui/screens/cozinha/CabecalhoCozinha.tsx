import type { ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nProvider'

/** Topo das sub-páginas da Cozinha (tela cheia, sem bottom nav). */
export function CabecalhoCozinha(props: { titulo: string; onVoltar: () => void; direita?: ReactNode }) {
  const { m } = useI18n()
  return (
    <header className="flex items-center gap-2 px-2 pb-2 pt-2">
      <button type="button" onClick={props.onVoltar} aria-label={m.cozinha.voltar} className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-content-hi active:bg-white/5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-content-hi">{props.titulo}</h1>
      {props.direita}
    </header>
  )
}
