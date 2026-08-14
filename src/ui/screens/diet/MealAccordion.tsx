import {
  macrosRefeicao,
  resumoRefeicao,
  type ItemRefeicao,
  type Refeicao,
} from '@domain/entities/meal'
import { InlineFoodSearch } from './InlineFoodSearch'

/**
 * Card de refeição expansível — o coração da tela Dieta.
 *
 * Regra sagrada: NADA de página/modal/dialog/bottomsheet. Tudo acontece
 * dentro do próprio card. Fechado: nome + resumo + kcal + status.
 * Aberto: itens + macros + ações. Ao fechar, volta idêntico.
 *
 * O "+ Adicionar alimento" abre a busca DENTRO do card (mais uma camada
 * que desliza), coerente com a regra de nada de tela nova.
 *
 * Animação: grid-template-rows 0fr -> 1fr (+ opacity). É o que dá o
 * "empurra suave" real a 60fps sem animar height (que engasga no Android).
 *
 * O card é BURRO: não guarda se está aberto. Quem manda é a tela-mãe
 * (via `aberto` + `onToggle`), pra regra "um aberto por vez" ser trivial.
 */
export function MealAccordion(props: {
  refeicao: Refeicao
  aberto: boolean
  buscaAberta: boolean
  onToggle: () => void
  onAbrirBusca: () => void
  onFecharBusca: () => void
  onAdicionarItem: (item: ItemRefeicao) => void
  onEditar: () => void
  onExcluir: () => void
  onToggleConcluida: () => void
}) {
  const { refeicao, aberto } = props
  const macros = macrosRefeicao(refeicao.itens)
  const totalKcal = macros.calorias

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
      {/* HEADER — sempre visível, resume mesmo aberto */}
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-2xl" aria-hidden="true">{refeicao.emoji}</span>

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-content-hi">{refeicao.nome}</span>
          {!aberto && (
            <span className="block truncate text-micro text-content-low">
              {resumoRefeicao(refeicao.itens)}
            </span>
          )}
        </span>

        <span className={`text-sm font-bold ${aberto ? 'text-brand' : 'text-content-mid'}`}>
          {totalKcal} kcal
        </span>

        {/* Status: check verde / vazio */}
        <span
          role="checkbox"
          aria-checked={refeicao.concluida}
          onClick={(e) => {
            e.stopPropagation()
            props.onToggleConcluida()
          }}
          className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border ${
            refeicao.concluida
              ? 'border-brand bg-brand text-[#04120a]'
              : 'border-surface-4 bg-transparent'
          }`}
        >
          {refeicao.concluida && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          )}
        </span>

        {/* Seta que gira */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-none text-content-dim transition-transform duration-300 ${aberto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* CORPO — expande por grid-rows (empurra suave, GPU-friendly) */}
      <div
        className="grid transition-all duration-300 ease-athos"
        style={{ gridTemplateRows: aberto ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            {/* Lista de alimentos */}
            <ul className="border-t border-surface-3 pt-2">
              {refeicao.itens.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="flex-1 text-content-hi">{item.nome}</span>
                  <span className="text-content-low">{item.quantidade}</span>
                  <span className="w-16 text-right font-medium text-content-mid">
                    {item.calorias} kcal
                  </span>
                </li>
              ))}
              {refeicao.itens.length === 0 && (
                <li className="py-3 text-center text-micro text-content-low">
                  Nenhum alimento ainda. Que tal começar?
                </li>
              )}
            </ul>

            {/* Régua de macros da refeição */}
            {refeicao.itens.length > 0 && (
              <div className="mt-2 flex border-y border-surface-3 py-3 text-center">
                <MacroCell v={`${macros.carboidrato}g`} l="Carboidratos" cor="text-accent-danger" />
                <MacroCell v={`${macros.proteina}g`} l="Proteína" cor="text-accent-water" />
                <MacroCell v={`${macros.gordura}g`} l="Gorduras" cor="text-accent-gold" />
                <MacroCell v={String(macros.calorias)} l="Calorias" cor="text-brand" />
              </div>
            )}

            {/* Ações — ou a busca inline, quando aberta */}
            {props.buscaAberta ? (
              <InlineFoodSearch
                onAdicionar={props.onAdicionarItem}
                onFechar={props.onFecharBusca}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={props.onAbrirBusca}
                  className="mt-3 w-full rounded-xl border border-brand/60 py-3 text-sm font-semibold text-brand transition-colors active:bg-brand/10"
                >
                  + Adicionar alimento
                </button>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={props.onEditar}
                    className="flex-1 rounded-xl border border-surface-4 py-2.5 text-micro font-medium text-content-mid transition-colors active:bg-white/5"
                  >
                    ✎ Editar refeição
                  </button>
                  <button
                    type="button"
                    onClick={props.onExcluir}
                    className="flex-1 rounded-xl border border-surface-4 py-2.5 text-micro font-medium text-accent-danger transition-colors active:bg-accent-danger/10"
                  >
                    🗑 Excluir refeição
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MacroCell({ v, l, cor }: { v: string; l: string; cor: string }) {
  return (
    <div className="flex-1">
      <div className={`text-base font-bold ${cor}`}>{v}</div>
      <div className="text-[10px] text-content-dim">{l}</div>
    </div>
  )
}
