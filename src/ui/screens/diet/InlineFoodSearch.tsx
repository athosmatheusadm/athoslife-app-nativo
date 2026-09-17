import { useState } from 'react'
import { useFoodSearch } from '@ui/screens/food-search/useFoodSearch'
import { escalarMacros } from '@domain/rules/foodReconciliation'
import type { AlimentoBase } from '@domain/entities/food'
import type { ItemRefeicao } from '@domain/entities/meal'

/**
 * Busca de alimento que abre DENTRO do card da refeição.
 *
 * Respeita a regra sagrada da Dieta: nada de página/modal. Aqui a busca é
 * só mais uma camada que desliza no próprio card. Fluxo:
 *   digitar -> escolher alimento -> ajustar porção -> adicionar -> volta.
 *
 * Reaproveita o useFoodSearch (mesma busca da tela do Macros) e o
 * escalarMacros (mesma conta do scanner) — consistência de graça.
 */
export function InlineFoodSearch(props: {
  onAdicionar: (item: ItemRefeicao) => void
  onFechar: () => void
}) {
  const { termo, setTermo, resultados, buscando } = useFoodSearch()
  const [escolhido, setEscolhido] = useState<AlimentoBase | null>(null)

  if (escolhido) {
    return (
      <PorcaoInline
        alimento={escolhido}
        onVoltar={() => setEscolhido(null)}
        onConfirmar={(item) => {
          props.onAdicionar(item)
          setEscolhido(null)
          setTermo('')
        }}
      />
    )
  }

  return (
    <div className="mt-3 border-t border-surface-3 pt-3">
      <div className="flex items-center gap-2 rounded-xl border border-surface-4 bg-surface-3 px-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar alimento…"
          autoFocus
          className="min-h-10 flex-1 bg-transparent text-sm text-content-hi placeholder:text-content-dim focus:outline-none"
        />
        <button onClick={props.onFechar} aria-label="Fechar busca" className="text-content-dim">✕</button>
      </div>

      {buscando && <p className="py-2 text-micro text-content-dim">Buscando…</p>}

      {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
        <p className="py-3 text-center text-micro text-content-low">
          Nada encontrado. Em breve o Life estima o que falta na base.
        </p>
      )}

      <ul className="max-h-52 overflow-y-auto">
        {resultados.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => setEscolhido(a)}
              className="flex w-full items-center justify-between gap-3 border-t border-surface-3 py-2.5 text-left first:border-t-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-content-hi">{a.nome}</span>
                <span className="block text-micro text-content-low">{a.porcaoG}g de referência</span>
              </span>
              <span className="flex-none text-sm font-bold text-brand">{a.calorias}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Ajuste de porção, também dentro do card. */
function PorcaoInline(props: {
  alimento: AlimentoBase
  onConfirmar: (item: ItemRefeicao) => void
  onVoltar: () => void
}) {
  const { alimento } = props
  const [gramas, setGramas] = useState(alimento.porcaoG)
  const m = escalarMacros(alimento, gramas)

  return (
    <div className="mt-3 border-t border-surface-3 pt-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={props.onVoltar}
          aria-label="Voltar (desistir deste alimento)"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-surface-4 text-2xl leading-none text-content-hi"
        >
          ‹
        </button>
        <span className="flex-1 truncate text-sm font-semibold text-content-hi">{alimento.nome}</span>
        <span className="text-sm font-bold text-brand">{m.calorias} kcal</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={gramas}
          onChange={(e) => setGramas(Math.max(0, Number(e.target.value) || 0))}
          className="w-24 rounded-xl border border-surface-4 bg-surface-3 px-3 py-2.5 text-center font-bold text-content-hi focus:border-brand focus:outline-none"
        />
        <span className="text-micro text-content-low">gramas</span>
        <div className="flex flex-1 justify-end gap-1.5">
          {[50, 100, 150].map((g) => (
            <button
              key={g}
              onClick={() => setGramas(g)}
              className="rounded-pill border border-surface-4 px-3 py-1.5 text-micro font-semibold text-content-mid active:scale-95"
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() =>
          props.onConfirmar({
            id: `item-${Date.now()}`,
            nome: alimento.nome,
            quantidade: `${gramas} g`,
            ...m,
          })
        }
        disabled={gramas <= 0}
        className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-bold text-[#04120a] active:scale-[0.98] disabled:opacity-40"
      >
        Adicionar à refeição
      </button>
    </div>
  )
}
