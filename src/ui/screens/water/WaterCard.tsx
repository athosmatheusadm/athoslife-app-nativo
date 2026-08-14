import { useState } from 'react'
import {
  ATALHOS_AGUA_ML,
  formatarVolume,
  progressoAgua,
} from '@domain/entities/water'
import { useAgua } from './useAgua'

/**
 * Card de água da Home. Traduz o protótipo oficial (agua-card.html):
 * card compacto que EXPANDE no lugar — sem abrir outra página.
 *
 * Correção de performance frente ao protótipo: a expansão é feita com
 * grid-rows/opacity e o anel via SVG, evitando animar height/top (que
 * engasgam no WebView do Android). O visual é o mesmo; o motor é nativo-friendly.
 */
export function WaterCard({ metaMl }: { metaMl: number }) {
  const [aberto, setAberto] = useState(false)
  const { estado, carregando, erro, adicionar, desfazerUltimo } = useAgua(metaMl)

  const total = estado?.totalMl ?? 0
  const pct = Math.round(progressoAgua(total, metaMl))

  // Anel SVG: raio 40 -> circunferência 2*pi*40.
  const circ = 2 * Math.PI * 40
  const offset = circ - (pct / 100) * circ

  return (
    <section
      className="rounded-card bg-surface-2 border border-surface-4 overflow-hidden"
      aria-label="Hidratação de hoje"
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="relative h-14 w-14 flex-none">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#2a2a2a" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.22,1,0.36,1)' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-content-hi">
            {pct}%
          </span>
        </span>

        <span className="flex-1">
          <span className="block font-semibold text-content-hi">Água</span>
          <span className="block text-micro text-content-low">
            {formatarVolume(total)} de {formatarVolume(metaMl)}
          </span>
        </span>

        <span className="text-accent-water" aria-hidden="true">
          {aberto ? '▲' : '▼'}
        </span>
      </button>

      {/* Expansão por grid-rows (GPU-friendly, sem animar height). */}
      <div
        className="grid transition-all duration-300 ease-athos"
        style={{ gridTemplateRows: aberto ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-3 py-3">
              {ATALHOS_AGUA_ML.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => void adicionar(ml)}
                  className="flex-1 rounded-pill border border-surface-4 bg-surface-3 py-3 text-sm font-semibold text-content-hi transition-transform active:scale-95"
                >
                  +{ml}
                </button>
              ))}
            </div>

            <div className="mt-2 border-t border-surface-4 pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-micro font-semibold uppercase tracking-wide text-content-dim">
                  Registros de hoje
                </span>
                {estado && estado.registros.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void desfazerUltimo()}
                    className="text-micro font-semibold text-accent-water"
                  >
                    Desfazer
                  </button>
                )}
              </div>

              {carregando && (
                <p className="py-2 text-micro text-content-dim">Carregando…</p>
              )}
              {erro && <p className="py-2 text-micro text-accent-danger">{erro}</p>}
              {!carregando && !erro && estado?.registros.length === 0 && (
                <p className="py-2 text-micro text-content-low">
                  Nenhum gole ainda hoje. Bora começar? 💧
                </p>
              )}

              <ul className="max-h-24 space-y-1 overflow-y-auto">
                {estado?.registros.map((r) => (
                  <li key={r.id} className="flex justify-between text-sm">
                    <span className="text-content-low">
                      {r.criadoEm.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-semibold text-accent-water">
                      +{r.quantidadeMl} ml
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
