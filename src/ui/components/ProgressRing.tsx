/**
 * Disco de progresso — o anel colorido da fileira "Atividade de hoje".
 * Peça única reutilizada pelos quatro (Água, Calorias, Proteínas, Passos):
 * muda só a cor, o valor, a unidade e a meta.
 *
 * Anel via SVG (raio 30, igual ao PWA). Sem animar layout — só o
 * stroke-dashoffset transiciona, que é GPU-friendly.
 */
export function ProgressRing(props: {
  pct: number
  cor: string
  valor: string
  unidade?: string
  label: string
  meta: string
  ativo?: boolean
  onClick?: () => void
}) {
  const { pct, cor, valor, unidade, label, meta, ativo = false, onClick } = props
  const clamp = Math.max(0, Math.min(100, pct))
  const circ = 2 * Math.PI * 30
  const offset = circ - (clamp / 100) * circ

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border py-1.5 transition-colors ${
        ativo ? 'border-surface-4 bg-surface-3' : 'border-transparent'
      }`}
      aria-label={`${label}: ${valor}${unidade ?? ''}, meta ${meta}`}
    >
      <span className="relative h-[68px] w-[68px]">
        <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
          <circle cx="34" cy="34" r="30" fill="none" stroke="#1f1f1f" strokeWidth="6" />
          <circle
            cx="34"
            cy="34"
            r="30"
            fill="none"
            stroke={cor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color: ativo ? cor : '#fff' }}>
            {valor}
          </span>
          {unidade && <span className="text-[10px] text-content-dim">{unidade}</span>}
        </span>
      </span>
      <span className="text-micro font-semibold uppercase tracking-wide text-content-mid">
        {label}
      </span>
      <span className="text-[10px] text-content-dim">{meta}</span>
    </button>
  )
}
