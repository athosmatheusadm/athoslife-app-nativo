/**
 * Disco de progresso — o anel colorido da fileira "Atividade de hoje".
 * Peça única reutilizada pelos quatro (Água, Calorias, Proteínas, Passos):
 * muda só o tom, o valor, a unidade e a meta.
 *
 * Anel via SVG (raio 30, igual ao PWA). Sem animar layout — só o
 * stroke-dashoffset transiciona, que é GPU-friendly.
 * UI/UX (09/10): cor vem dos tokens (stroke = currentColor), textos ≥ 12px.
 */
const TOM = {
  agua: 'text-accent-water',
  calorias: 'text-accent-energy',
  proteina: 'text-macro-proteina',
  passos: 'text-brand',
} as const

export type TomDisco = keyof typeof TOM

export function ProgressRing(props: {
  pct: number
  tom: TomDisco
  valor: string
  /** Só pro leitor de tela; dentro do anel vai só o valor (a meta já aparece embaixo). */
  unidade?: string
  label: string
  meta: string
  ariaLabel: string
  ativo?: boolean
  onClick?: () => void
}) {
  const { pct, tom, valor, label, meta, ativo = false, onClick } = props
  const clamp = Math.max(0, Math.min(100, pct))
  const circ = 2 * Math.PI * 30
  const offset = circ - (clamp / 100) * circ

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      aria-label={props.ariaLabel}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl border py-2 transition-colors active:bg-content-hi/5 ${
        ativo ? 'border-surface-4 bg-surface-3' : 'border-transparent'
      }`}
    >
      <span className={`relative h-[68px] w-[68px] ${TOM[tom]}`}>
        <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="34" cy="34" r="30" fill="none" className="stroke-surface-4" strokeWidth="6" />
          <circle
            cx="34"
            cy="34"
            r="30"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span className={`text-sm font-bold tabular-nums ${ativo ? '' : 'text-content-hi'}`}>{valor}</span>
        </span>
      </span>
      <span className="max-w-full truncate text-micro font-semibold uppercase tracking-wide text-content-mid" aria-hidden="true">
        {label}
      </span>
      <span className="max-w-full truncate text-micro text-content-low" aria-hidden="true">{meta}</span>
    </button>
  )
}
