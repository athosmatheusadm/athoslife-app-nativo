import { useMemo, useState } from 'react'
import { useFoodSearch } from './useFoodSearch'
import { escalarMacros } from '@domain/rules/foodReconciliation'
import type { AlimentoBase } from '@domain/entities/food'
import type { TipoRefeicao } from '@data/repositories/refeicoesRepository'

/**
 * Busca manual de alimentos — inspirada no fluxo do Macros.
 * Barra de busca → lista de resultados (nome, porção, macros) → toca num item
 * → ajusta a porção (macros recalculam ao vivo) → adiciona à refeição.
 *
 * Usa a tabela `alimentos` (via repositório) como fonte. Consistência com o
 * scanner é garantida por reusar `escalarMacros` — a mesma conta dos dois lados.
 */
export function FoodSearchScreen(props: {
  tipoRefeicao: TipoRefeicao
  onAdicionar: (item: {
    alimento: AlimentoBase
    gramas: number
    calorias: number
    proteina: number
    carboidrato: number
    gordura: number
  }) => void
  onVoltar: () => void
}) {
  const { termo, setTermo, resultados, buscando, erro } = useFoodSearch()
  const [selecionado, setSelecionado] = useState<AlimentoBase | null>(null)

  if (selecionado) {
    return (
      <PortionView
        alimento={selecionado}
        onCancelar={() => setSelecionado(null)}
        onConfirmar={(g, macros) => {
          props.onAdicionar({ alimento: selecionado, gramas: g, ...macros })
          setSelecionado(null)
        }}
      />
    )
  }

  return (
    <main className="flex h-full flex-col pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-3 pt-3">
        <button onClick={props.onVoltar} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-bold text-content-hi">Adicionar alimento</h1>
      </header>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-card border border-surface-4 bg-surface-2 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar alimento…"
            autoFocus
            className="min-h-11 flex-1 bg-transparent text-content-hi placeholder:text-content-dim focus:outline-none"
          />
          {termo && (
            <button onClick={() => setTermo('')} aria-label="Limpar" className="text-content-dim">✕</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {buscando && <p className="py-4 text-micro text-content-dim">Buscando…</p>}
        {erro && <p className="py-4 text-micro text-accent-danger">{erro}</p>}

        {!buscando && termo.trim().length >= 2 && resultados.length === 0 && !erro && (
          <div className="py-10 text-center">
            <div className="text-3xl">🥗</div>
            <p className="mt-2 text-sm text-content-low">
              Nada encontrado por aqui.
            </p>
            <p className="mt-1 text-micro text-content-dim">
              Em breve o Life vai poder estimar alimentos fora da base.
            </p>
          </div>
        )}

        {termo.trim().length < 2 && (
          <p className="py-10 text-center text-micro text-content-dim">
            Digite o nome de um alimento para começar.
          </p>
        )}

        <ul className="divide-y divide-surface-3">
          {resultados.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setSelecionado(a)}
                className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors active:bg-white/[0.05]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-content-hi">{a.nome}</span>
                  <span className="block text-micro text-content-low">
                    {a.porcaoG}g · P {a.proteina} · C {a.carboidrato} · G {a.gordura}
                  </span>
                </span>
                <span className="flex-none font-bold text-brand">{a.calorias}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

/** Ajuste de porção: gramas → macros recalculam ao vivo. */
function PortionView(props: {
  alimento: AlimentoBase
  onConfirmar: (
    gramas: number,
    macros: { calorias: number; proteina: number; carboidrato: number; gordura: number },
  ) => void
  onCancelar: () => void
}) {
  const { alimento } = props
  const [gramas, setGramas] = useState(alimento.porcaoG)

  const macros = useMemo(() => escalarMacros(alimento, gramas), [alimento, gramas])

  return (
    <main className="flex h-full flex-col pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-3 pt-3">
        <button onClick={props.onCancelar} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="truncate text-lg font-bold text-content-hi">{alimento.nome}</h1>
      </header>

      <div className="flex-1 px-5">
        <div className="mt-2 grid grid-cols-4 gap-2 text-center">
          <Macro v={macros.calorias} l="kcal" cor="text-brand" />
          <Macro v={macros.proteina} l="Prot" />
          <Macro v={macros.carboidrato} l="Carb" />
          <Macro v={macros.gordura} l="Gord" />
        </div>

        <label className="mt-6 block text-micro font-semibold uppercase tracking-wide text-content-dim">
          Quantidade (g)
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={gramas}
          onChange={(e) => setGramas(Math.max(0, Number(e.target.value) || 0))}
          className="mt-2 w-full rounded-card border border-surface-4 bg-surface-2 px-4 py-4 text-xl font-bold text-content-hi focus:border-brand focus:outline-none"
        />

        <div className="mt-3 flex gap-2">
          {[50, 100, 150, 200].map((g) => (
            <button
              key={g}
              onClick={() => setGramas(g)}
              className="flex-1 rounded-pill border border-surface-4 bg-surface-3 py-2 text-sm font-semibold text-content-mid transition-transform active:scale-95"
            >
              {g}g
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={() => props.onConfirmar(gramas, macros)}
          disabled={gramas <= 0}
          className="w-full rounded-card bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          Adicionar {macros.calorias} kcal
        </button>
      </div>
    </main>
  )
}

function Macro({ v, l, cor = 'text-content-hi' }: { v: number; l: string; cor?: string }) {
  return (
    <div className="rounded-card border border-surface-4 bg-surface-2 py-3">
      <div className={`text-lg font-bold ${cor}`}>{v}</div>
      <div className="text-micro uppercase tracking-wide text-content-dim">{l}</div>
    </div>
  )
}
