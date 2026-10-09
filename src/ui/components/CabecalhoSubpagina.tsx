import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Cabeçalho das sub-páginas (Perfil e afins): voltar + título. Antes cada
 * tela repetia o próprio, com o voltar do tamanho do ícone (24px) e sem
 * tradução; aqui o alvo é 44px e o rótulo vem do i18n.
 */
export function CabecalhoSubpagina(props: { titulo: ReactNode; subtitulo?: ReactNode; direita?: ReactNode; onVoltar?: () => void }) {
  const navigate = useNavigate()
  const { m } = useI18n()
  return (
    <header className="flex items-center gap-2 px-2 pb-2 pt-2">
      <button
        type="button"
        onClick={props.onVoltar ?? (() => navigate(-1))}
        aria-label={m.perfil.voltar}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-content-hi active:bg-white/5"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-content-hi">{props.titulo}</h1>
        {props.subtitulo && <p className="text-micro text-content-low">{props.subtitulo}</p>}
      </div>
      {props.direita}
    </header>
  )
}
