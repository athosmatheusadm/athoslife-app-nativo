import { useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { temAcessoPremium } from '@domain/rules/access'
import { fmtG, fmtKcal } from '@domain/rules/formatoNumero'
import { useI18n } from '@/i18n/I18nProvider'
import type { Receita } from '@domain/entities/receita'
import { CategoryIcon } from './CategoryIcon'

/**
 * Foto da receita curada. As imagens moram no app em
 * `public/receitas/<slug-do-título-em-pt>.webp` (ex.: salada-que-mata-a-fome.webp).
 * Enquanto a foto não existe, mostra o duotone da categoria sobre o degradê.
 */
export function FotoReceita(props: { receita: Pick<Receita, 'foto' | 'categoria' | 'corTema'>; className: string; emojiClassName?: string }) {
  const [falhou, setFalhou] = useState(false)
  const { receita } = props
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${props.className}`}
      style={{ background: `linear-gradient(135deg, ${receita.corTema}33, transparent)` }}
    >
      {!falhou ? (
        <img
          src={`/receitas/${receita.foto}.webp`}
          alt=""
          loading="lazy"
          onError={() => setFalhou(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <CategoryIcon categoria={receita.categoria} grande />
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
  // "Grátis" só faz sentido pra quem está no grátis (no pago tudo é liberado).
  const { profile } = useSession()
  const pago = profile ? temAcessoPremium(profile) : false

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
              // Texto puxado pra cor do texto do tema: o roxo puro ficava sem
              // contraste no fundo escuro (relatório do APK, item 14).
              style={{ backgroundColor: `${r.corTema}22`, color: `color-mix(in srgb, ${r.corTema} 60%, rgb(var(--c-content-hi)))` }}
            >
              {fmtKcal(r.macros.calorias)} {t.kcal}
            </span>
            <span className="rounded-pill bg-macro-proteina/15 px-2 py-0.5 text-micro font-bold text-macro-proteina">
              {fmtG(r.macros.proteina)}g {t.prot}
            </span>
            {r.contemRestricao.length > 0 && (
              <span className="rounded-pill bg-accent-danger/15 px-2 py-0.5 text-micro font-bold text-accent-danger">
                ⚠ {t.contem(r.contemRestricao.map((a) => t.alergenos[a]).join(', '))}
              </span>
            )}
          </div>
          <div className="flex h-5 items-center pr-9 text-micro font-semibold text-content-low">
            {r.tempoPreparoMin != null ? `⏱ ${t.minutos(r.tempoPreparoMin)}` : ''}
          </div>
        </div>
      </button>

      {!r.premium && !pago && (
        <span className="absolute left-2 top-2 rounded-pill bg-brand px-2 py-0.5 text-micro font-extrabold text-brand-ink">
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
