import { useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { CATEGORIA_META, type Receita } from '@domain/entities/receita'
import { slugReceita } from '@domain/rules/cozinha'

/**
 * Foto da receita curada. As imagens moram no app em
 * `public/receitas/<slug-do-título>.webp` (ex.: salada-que-mata-a-fome.webp).
 * Enquanto a foto não existe, cai no emoji da categoria sobre o degradê.
 */
export function FotoReceita(props: { receita: Pick<Receita, 'titulo' | 'categoria' | 'corTema'>; className: string; emojiClassName?: string }) {
  const [falhou, setFalhou] = useState(false)
  const { receita } = props
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${props.className}`}
      style={{ background: `linear-gradient(135deg, ${receita.corTema}33, transparent)` }}
    >
      {!falhou ? (
        <img
          src={`/receitas/${slugReceita(receita.titulo)}.webp`}
          alt=""
          loading="lazy"
          onError={() => setFalhou(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className={props.emojiClassName ?? 'text-4xl'} aria-hidden="true">
          {CATEGORIA_META[receita.categoria].emoji}
        </span>
      )}
    </div>
  )
}

/** Card da vitrine — usado na Dieta, no "Ver todas" e nas sugestões do dia. */
export function CardReceita(props: {
  receita: Receita
  onAbrir: () => void
  onFavoritar: () => void
  /** Ocupa a largura da grade em vez da largura fixa da fileira. */
  largo?: boolean
}) {
  const { m } = useI18n()
  const t = m.cozinha
  const r = props.receita

  return (
    <div
      className={`relative flex-none overflow-hidden rounded-2xl border border-surface-4 bg-surface-2 ${props.largo ? 'w-full' : 'w-44'}`}
    >
      <button
        type="button"
        onClick={props.onAbrir}
        className={`block w-full text-left transition-transform active:scale-[0.98] ${r.bloqueada ? 'opacity-60' : ''}`}
      >
        <FotoReceita receita={r} className="h-24" />
        <div className="p-2.5">
          <div className="mb-1.5 line-clamp-2 min-h-[2.4em] text-micro font-bold leading-snug text-content-hi">{r.titulo}</div>
          <div className="mb-2 flex flex-wrap gap-1">
            <span
              className="rounded-pill px-2 py-0.5 text-micro font-bold"
              style={{ backgroundColor: `${r.corTema}22`, color: r.corTema }}
            >
              {r.macros.calorias} {t.kcal}
            </span>
            <span className="rounded-pill bg-macro-proteina/15 px-2 py-0.5 text-micro font-bold text-macro-proteina">
              {r.macros.proteina}g {t.prot}
            </span>
          </div>
          <div className="flex h-5 items-center pr-9 text-micro font-semibold text-content-low">
            {r.tempoPreparoMin != null ? `⏱ ${t.minutos(r.tempoPreparoMin)}` : ''}
          </div>
        </div>
      </button>

      {!r.premium && (
        <span className="absolute left-2 top-2 rounded-pill bg-brand px-2 py-0.5 text-micro font-extrabold text-[#04120a]">
          {t.gratis}
        </span>
      )}

      {r.bloqueada ? (
        <span aria-label={t.premium} className="absolute bottom-2.5 right-2.5 text-sm text-content-low">🔒</span>
      ) : (
        <button
          type="button"
          onClick={props.onFavoritar}
          aria-label={r.favoritada ? t.desfavoritar : t.favoritar}
          aria-pressed={r.favoritada}
          className={`absolute bottom-0 right-0 grid h-11 w-11 place-items-center text-lg active:scale-90 ${r.favoritada ? 'text-accent-favorito' : 'text-content-low'}`}
        >
          {r.favoritada ? '♥' : '♡'}
        </button>
      )}
    </div>
  )
}
