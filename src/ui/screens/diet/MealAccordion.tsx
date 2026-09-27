import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { macrosRefeicao, resumoRefeicao, type Refeicao } from '@domain/entities/meal'

/**
 * Linha de refeição na lista da Dieta.
 *
 * Decisão do usuário (2026-09-24): não expande mais inline — tocar abre
 * direto o MealSheet (bottom sheet, renderizado pela tela-mãe) com os
 * itens já registrados + o menu de ações. Isso substituiu o acordeão
 * antigo (grid-rows 0fr->1fr) que vivia aqui — regra antiga de "nada sai
 * do card" foi revogada de propósito, ver MealSheet.tsx.
 *
 * Linha BURRA: só mostra nome/resumo/kcal/status, quem abre o sheet é a
 * tela-mãe.
 */
export function MealAccordion(props: {
  refeicao: Refeicao
  onAbrir: () => void
  onToggleConcluida: () => void
  /** Só pra refeições extras (as únicas arrastáveis) — liga o ícone de handle ao dnd-kit. */
  dragHandleProps?: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners } | null
}) {
  const { refeicao } = props
  const totalKcal = macrosRefeicao(refeicao.itens).calorias

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
      <button
        type="button"
        onClick={props.onAbrir}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {props.dragHandleProps && (
          <span
            {...props.dragHandleProps.attributes}
            {...props.dragHandleProps.listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Arrastar ${refeicao.nome} pra reordenar`}
            className="flex-none touch-none px-0.5 text-content-dim"
          >
            ⋮⋮
          </span>
        )}
        <span className="text-2xl" aria-hidden="true">{refeicao.emoji}</span>

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-content-hi">{refeicao.nome}</span>
          <span className="block truncate text-micro text-content-low">
            {resumoRefeicao(refeicao.itens)}
          </span>
        </span>

        <span className="text-sm font-bold text-content-mid">{totalKcal} kcal</span>

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

        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="flex-none text-content-dim"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  )
}
