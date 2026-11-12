import type { ReactNode } from 'react'
import { FOCOS_TREINO, MAX_FOCO, type FocoTreino } from '@domain/rules/geradorTreino'
import { useI18n } from '@/i18n/I18nProvider'
import { vibrar } from '@ui/feedback'

/**
 * Boneco frente/costas pra escolher o foco do treino (pedido do dono,
 * 12/11/2026 — é o boneco do protótipo de onboarding em conversa, reaproveitado).
 * Toca no músculo pra marcar, até MAX_FOCO. Os botões embaixo fazem o mesmo:
 * alvo de toque grande e funciona com leitor de tela.
 */
export function BonecoFoco(props: { valor: readonly FocoTreino[]; onChange: (v: FocoTreino[]) => void }) {
  const { m } = useI18n()
  const t = m.plano.parametros
  const sel = props.valor
  const cheio = sel.length >= MAX_FOCO

  function alternar(g: FocoTreino) {
    if (sel.includes(g)) props.onChange(sel.filter((x) => x !== g))
    else if (!cheio) props.onChange([...sel, g])
    else return
    vibrar.leve()
  }

  // Função (não componente): um componente criado dentro do render remontaria a cada toque.
  const parte = (g: FocoTreino, formas: ReactNode) => (
    <g
      onClick={() => alternar(g)}
      aria-hidden="true"
      className={`cursor-pointer transition-colors duration-200 ${sel.includes(g) ? 'fill-brand' : 'fill-surface-4'}`}
    >
      {formas}
    </g>
  )

  const cabeca = (
    <g className="fill-surface-3">
      <circle cx="50" cy="14" r="10" />
      <rect x="45" y="23" width="10" height="6" />
    </g>
  )

  return (
    <div>
      <div className="flex justify-center gap-6">
        <figure className="text-center">
          <svg viewBox="0 0 100 200" className="h-48" aria-hidden="true">
            {cabeca}
            {parte('ombro', <><ellipse cx="28" cy="36" rx="10" ry="7" /><ellipse cx="72" cy="36" rx="10" ry="7" /></>)}
            {parte('peito', <rect x="33" y="31" width="34" height="22" rx="6" />)}
            {parte('bracos', <><rect x="14" y="44" width="11" height="44" rx="5" /><rect x="75" y="44" width="11" height="44" rx="5" /></>)}
            {parte('abdominal', <rect x="37" y="56" width="26" height="36" rx="5" />)}
            {parte('pernas', <><rect x="33" y="96" width="15" height="54" rx="6" /><rect x="52" y="96" width="15" height="54" rx="6" /></>)}
            {parte('panturrilha', <><rect x="35" y="154" width="11" height="38" rx="5" /><rect x="54" y="154" width="11" height="38" rx="5" /></>)}
          </svg>
          <figcaption className="text-micro text-content-low">{t.focoFrente}</figcaption>
        </figure>
        <figure className="text-center">
          <svg viewBox="0 0 100 200" className="h-48" aria-hidden="true">
            {cabeca}
            {parte('ombro', <><ellipse cx="28" cy="36" rx="10" ry="7" /><ellipse cx="72" cy="36" rx="10" ry="7" /></>)}
            {parte('costas', <path d="M33 31h34l-4 54H37z" />)}
            {parte('bracos', <><rect x="14" y="44" width="11" height="44" rx="5" /><rect x="75" y="44" width="11" height="44" rx="5" /></>)}
            {parte('gluteos', <rect x="34" y="87" width="32" height="20" rx="8" />)}
            {parte('pernas', <><rect x="33" y="109" width="15" height="42" rx="6" /><rect x="52" y="109" width="15" height="42" rx="6" /></>)}
            {parte('panturrilha', <><rect x="35" y="154" width="11" height="38" rx="5" /><rect x="54" y="154" width="11" height="38" rx="5" /></>)}
          </svg>
          <figcaption className="text-micro text-content-low">{t.focoVerso}</figcaption>
        </figure>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {FOCOS_TREINO.map((g) => {
          const on = sel.includes(g)
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              disabled={!on && cheio}
              onClick={() => alternar(g)}
              className={`min-h-11 rounded-pill px-3.5 text-sm font-semibold transition-colors active:scale-95 disabled:opacity-40 ${
                on ? 'bg-brand text-brand-ink' : 'border border-surface-4 bg-surface-2 text-content-mid'
              }`}
            >
              {m.treino.grupos[g]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
