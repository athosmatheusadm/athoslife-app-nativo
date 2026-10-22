import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { macrosRepository } from '@data/repositories/macrosRepository'
import { treinoHistoricoRepository } from '@data/repositories/treinoHistoricoRepository'
import { dataLocalISO } from '@domain/rules/datas'
import type { Metas } from '@domain/entities/profile'
import { useI18n } from '@/i18n/I18nProvider'

/** O que fez o dia ser "bom" — só nesses dias o app convida a postar. */
export interface DiaBom {
  readonly meta: boolean
  readonly treino: boolean
  /** Sequência que é recorde (≥ 3 dias), senão null. */
  readonly seq: number | null
}

export const ehDiaBom = (d: DiaBom | null) => !!d && (d.meta || d.treino || d.seq !== null)

/** Calorias entre 90% e 110% da meta conta como meta batida. */
export function useDiaBom(metas: Metas, streakAtual: number, maiorStreak: number): DiaBom | null {
  const [dia, setDia] = useState<DiaBom | null>(null)
  useEffect(() => {
    let vivo = true
    void Promise.all([
      macrosRepository.doDia().catch(() => null),
      treinoHistoricoRepository.treinouHoje().catch(() => false),
    ]).then(([macros, treino]) => {
      if (!vivo) return
      const kcal = macros?.kcal ?? 0
      const meta = metas.kcal > 0 && kcal >= metas.kcal * 0.9 && kcal <= metas.kcal * 1.1
      const seq = streakAtual >= 3 && streakAtual >= maiorStreak ? streakAtual : null
      setDia({ meta, treino, seq })
    })
    return () => {
      vivo = false
    }
  }, [metas.kcal, streakAtual, maiorStreak])
  return dia
}

const CHAVE = 'athos.conviteStory.dispensado'

function dispensadoHoje(): boolean {
  try {
    return localStorage.getItem(CHAVE) === dataLocalISO()
  } catch {
    return false
  }
}

/** Card da Home em dia bom: "Seu dia rendeu! 🔥" → abre o Story. */
export function ConviteStory({ dia }: { dia: DiaBom | null }) {
  const navigate = useNavigate()
  const { m } = useI18n()
  const t = m.story.convite
  const [fechado, setFechado] = useState(dispensadoHoje)
  if (fechado || !dia || !ehDiaBom(dia)) return null

  const chips = [dia.meta && t.meta, dia.treino && t.treino, dia.seq !== null && t.seq(dia.seq)].filter(Boolean) as string[]

  function dispensar() {
    try {
      localStorage.setItem(CHAVE, dataLocalISO())
    } catch {
      /* sem armazenamento: some só nesta visita */
    }
    setFechado(true)
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand/35 bg-surface-2 bg-[radial-gradient(120%_120%_at_100%_0%,rgb(var(--c-brand)/0.2),transparent_60%)] p-4">
      <button onClick={dispensar} aria-label={t.dispensar} className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center text-content-low">
        ✕
      </button>
      <div className="flex items-center gap-3 pr-6">
        <img src="/life/feliz.webp" alt="" className="h-14 w-14 flex-none object-contain" />
        <div className="min-w-0">
          <h3 className="text-base font-bold text-content-hi">{t.titulo}</h3>
          <p className="mt-0.5 text-sm text-content-mid">{t.texto}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <span key={c} className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-brand">✓ {c}</span>
        ))}
      </div>
      <button
        onClick={() => navigate('/story', { state: { escolher: true, modo: dia.treino ? 'gym' : 'food' } })}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-pill bg-brand text-sm font-bold text-brand-ink active:scale-[0.98]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="3" /><path d="M8 6l2-2h4l2 2" /><circle cx="12" cy="13" r="3.5" />
        </svg>
        {t.cta}
      </button>
    </section>
  )
}
