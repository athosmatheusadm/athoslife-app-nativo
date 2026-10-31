import { useNavigate } from 'react-router-dom'
import type { ModoStory } from '@domain/entities/story'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Câmera discreta no cabeçalho das telas principais (Início, Dieta, Treino):
 * mesmo tamanho e peso dos outros ícones. Em dia bom ganha um pontinho verde.
 * Sem `modo`, o editor abre com as abas Musculação / Alimentação.
 */
export function BotaoStory({ modo, destaque = false }: { modo?: ModoStory; destaque?: boolean }) {
  const navigate = useNavigate()
  const { m } = useI18n()
  return (
    <button
      type="button"
      onClick={() => navigate('/story', { state: modo ? { modo } : { escolher: true } })}
      aria-label={m.story.abrir}
      className="relative flex h-9 w-9 flex-none items-center justify-center rounded-full border border-surface-4 text-content-mid active:bg-content-hi/5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="14" rx="3" />
        <path d="M8 6l2-2h4l2 2" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      {destaque && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-brand shadow-[0_0_6px_rgb(var(--c-brand))]" aria-hidden="true" />}
    </button>
  )
}
