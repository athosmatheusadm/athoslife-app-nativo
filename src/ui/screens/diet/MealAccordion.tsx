import { useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
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
 * que desliza), coerente com a regra de nada de tela nova. "Copiar de
 * outra refeição" funciona igual: uma lista de tipos que desliza no lugar
 * dos botões, sem sair do card.
 *
 * Animação: grid-template-rows 0fr -> 1fr (+ opacity). É o que dá o
 * "empurra suave" real a 60fps sem animar height (que engasga no Android).
 *
 * O card é BURRO: não guarda se está aberto, em edição, buscando ou
 * clonando. Quem manda é a tela-mãe (via props + callbacks), pra regra
 * "uma camada extra por vez" ser trivial.
 */
export function MealAccordion(props: {
  refeicao: Refeicao
  aberto: boolean
  buscaAberta: boolean
  clonando: boolean
  /** Outras refeições do dia que já têm algum item — candidatas a "copiar de". */
  outrasRefeicoes: readonly { chave: string; nome: string }[]
  onToggle: () => void
  onAbrirBusca: () => void
  onFecharBusca: () => void
  onAdicionarItem: (item: ItemRefeicao) => void
  onRemoverItem: (itemId: string) => void
  onExcluir: () => void
  onToggleConcluida: () => void
  onAbrirClonar: () => void
  onFecharClonar: () => void
  onClonarDe: (origemChave: string) => void
  /** Só definido para refeições extras, que não têm nome fixo. */
  onRenomear?: (novoNome: string) => void
  /** Mensagem de erro se a última tentativa de renomear falhou. */
  erroRenomear?: string | null
  /** Só definido pra refeições extras (as únicas arrastáveis) — liga o ícone de handle ao dnd-kit. */
  dragHandleProps?: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners } | null
}) {
  const { refeicao, aberto } = props
  const macros = macrosRefeicao(refeicao.itens)
  const totalKcal = macros.calorias
  // Toque 1 no item seleciona (mostra o 🗑), toque 2 (no 🗑) exclui — mesmo
  // padrão de dois toques do ExerciseCard do Treino, sem precisar de um modo
  // "editar refeição" à parte.
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null)

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
      {/* HEADER — sempre visível, resume mesmo aberto */}
      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={aberto}
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
            {props.onRenomear && (
              <NomeExtraInput
                key={refeicao.nome}
                valorInicial={refeicao.nome}
                onSalvar={props.onRenomear}
                erro={props.erroRenomear ?? null}
              />
            )}

            {/* Lista de alimentos — toca no item pra selecionar (mostra o
                🗑), toca no 🗑 pra excluir só aquele alimento. */}
            <ul className="border-t border-surface-3 pt-2">
              {refeicao.itens.map((item) => {
                const selecionado = itemSelecionadoId === item.id
                return (
                  <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
                    <button
                      type="button"
                      onClick={() =>
                        setItemSelecionadoId((atual) => (atual === item.id ? null : item.id))
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="min-w-0 flex-1 truncate text-content-hi">{item.nome}</span>
                      <span className="flex-none text-content-low">{item.quantidade}</span>
                      <span className="w-16 flex-none text-right font-medium text-content-mid">
                        {item.calorias} kcal
                      </span>
                    </button>
                    {selecionado && (
                      <button
                        type="button"
                        onClick={() => {
                          props.onRemoverItem(item.id)
                          setItemSelecionadoId(null)
                        }}
                        aria-label={`Excluir ${item.nome}`}
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-accent-danger/40 text-lg text-accent-danger"
                      >
                        🗑
                      </button>
                    )}
                  </li>
                )
              })}
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

            {/* Ações — ou a busca / o "copiar de" inline, quando abertos */}
            {props.buscaAberta ? (
              <InlineFoodSearch
                onAdicionar={props.onAdicionarItem}
                onFechar={props.onFecharBusca}
              />
            ) : props.clonando ? (
              <div className="mt-3 border-t border-surface-3 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-content-hi">Copiar de qual refeição?</span>
                  <button onClick={props.onFecharClonar} aria-label="Fechar" className="text-content-dim">✕</button>
                </div>
                {props.outrasRefeicoes.length === 0 ? (
                  <p className="py-2 text-micro text-content-low">
                    Nenhuma outra refeição com alimentos hoje ainda.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {props.outrasRefeicoes.map((r) => (
                      <button
                        key={r.chave}
                        type="button"
                        onClick={() => props.onClonarDe(r.chave)}
                        className="rounded-pill border border-surface-4 bg-surface-3 px-3.5 py-2 text-sm font-semibold text-content-hi transition-transform active:scale-95"
                      >
                        {r.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={props.onAbrirBusca}
                  className="mt-3 w-full rounded-xl border border-brand/60 py-3 text-sm font-semibold text-brand transition-colors active:bg-brand/10"
                >
                  + Adicionar alimento
                </button>
                <button
                  type="button"
                  onClick={props.onAbrirClonar}
                  className="mt-2 w-full rounded-xl border border-surface-4 py-2.5 text-micro font-semibold text-content-mid transition-colors active:bg-white/5"
                >
                  ⧉ Copiar de outra refeição
                </button>
                <button
                  type="button"
                  onClick={props.onExcluir}
                  className="mt-2 w-full rounded-xl border border-surface-4 py-2.5 text-micro font-medium text-accent-danger transition-colors active:bg-accent-danger/10"
                >
                  🗑 Excluir refeição inteira
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Nome editável do slot "Extra" (o único sem nome fixo tipo Café/Almoço).
 * Salva ao sair do campo (blur) — sem botão extra, sem modal.
 */
function NomeExtraInput(props: {
  valorInicial: string
  onSalvar: (nome: string) => void
  erro: string | null
}) {
  const [valor, setValor] = useState(props.valorInicial)

  return (
    <div className="mb-2 border-b border-surface-3 pb-2">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
        Nome desta refeição
      </label>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          if (valor.trim() && valor.trim() !== props.valorInicial) props.onSalvar(valor)
        }}
        placeholder="Ex.: Pós-treino, Ceia…"
        className="w-full rounded-xl border border-surface-4 bg-surface-3 px-3 py-2 text-sm font-semibold text-content-hi placeholder:font-normal placeholder:text-content-dim focus:border-brand focus:outline-none"
      />
      {props.erro && <p className="mt-1 text-[11px] text-accent-danger">{props.erro}</p>}
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
