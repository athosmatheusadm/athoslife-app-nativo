import { useState } from 'react'
import { macrosRefeicao, type ItemRefeicao, type Refeicao } from '@domain/entities/meal'
import { InlineFoodSearch } from './InlineFoodSearch'
import { SavedFoodsList } from './SavedFoodsList'

type Modo = 'menu' | 'busca' | 'salvos'

/**
 * Sheet único da refeição — substitui o card que expandia inline
 * (decisão do usuário, 2026-09-24: tocar na refeição sobe direto este
 * sheet, não existe mais o acordeão intermediário). Junta o que antes
 * estava em dois lugares: os itens já registrados (era o corpo do card) e
 * o menu de ações (era o MealActionSheet à parte).
 *
 * "Copiar de outra refeição" (lista de origem pra escolher) saiu — virou
 * clipboard de verdade: ⧉ em qualquer item copia, "Colar" aqui cola o que
 * tiver copiado, sem precisar declarar origem→destino na mesma ação.
 */
export function MealSheet(props: {
  refeicao: Refeicao
  clipboard: ItemRefeicao | null
  onFechar: () => void
  onAdicionarItem: (item: ItemRefeicao) => void
  onRemoverItem: (itemId: string) => void
  onCopiarItem: (item: ItemRefeicao) => void
  onColar: () => void
  onExcluir: () => void
  onToggleConcluida: () => void
  onEscanear: () => void
  onAbrirSuplemento: () => void
  /** Só definido para refeições extras, que não têm nome fixo. */
  onRenomear?: (novoNome: string) => void
  erroRenomear?: string | null
}) {
  const { refeicao } = props
  const [modo, setModo] = useState<Modo>('menu')
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null)
  const macros = macrosRefeicao(refeicao.itens)

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={refeicao.nome}
    >
      <button
        aria-label="Fechar"
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-surface-4 bg-surface-1 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mt-3 h-1 w-10 flex-none rounded-full bg-surface-4" aria-hidden="true" />

        <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{refeicao.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-xl font-bold text-content-hi">{refeicao.nome}</span>
            <span className="text-sm font-bold text-brand">{macros.calorias} kcal</span>
            <span
              role="checkbox"
              aria-checked={refeicao.concluida}
              aria-label="Marcar refeição como concluída"
              onClick={props.onToggleConcluida}
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-md border ${
                refeicao.concluida ? 'border-brand bg-brand text-[#04120a]' : 'border-surface-4'
              }`}
            >
              {refeicao.concluida && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              )}
            </span>
          </div>

          {props.onRenomear && (
            <NomeExtraInput
              key={refeicao.nome}
              valorInicial={refeicao.nome}
              onSalvar={props.onRenomear}
              erro={props.erroRenomear ?? null}
            />
          )}

          {/* Itens já registrados — toca pra selecionar, ⧉ copia, 🗑 exclui */}
          <ul className="mt-4 border-t border-surface-3 pt-2">
            {refeicao.itens.map((item) => {
              const selecionado = itemSelecionadoId === item.id
              return (
                <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setItemSelecionadoId((atual) => (atual === item.id ? null : item.id))}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-content-hi">{item.nome}</span>
                    <span className="flex-none text-content-low">{item.quantidade}</span>
                    <span className="w-16 flex-none text-right font-medium text-content-mid">
                      {item.calorias} kcal
                    </span>
                  </button>
                  {selecionado && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          props.onCopiarItem(item)
                          setItemSelecionadoId(null)
                        }}
                        aria-label={`Copiar ${item.nome}`}
                        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-surface-4 text-base text-content-hi"
                      >
                        ⧉
                      </button>
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
                    </>
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

          {refeicao.itens.length > 0 && (
            <div className="mt-2 flex border-y border-surface-3 py-3 text-center">
              <MacroCell v={`${macros.carboidrato}g`} l="Carboidratos" cor="text-accent-danger" />
              <MacroCell v={`${macros.proteina}g`} l="Proteína" cor="text-accent-water" />
              <MacroCell v={`${macros.gordura}g`} l="Gorduras" cor="text-accent-gold" />
              <MacroCell v={String(macros.calorias)} l="Calorias" cor="text-brand" />
            </div>
          )}

          {modo === 'busca' ? (
            <InlineFoodSearch onAdicionar={props.onAdicionarItem} onFechar={() => setModo('menu')} />
          ) : modo === 'salvos' ? (
            <SavedFoodsList onAdicionar={props.onAdicionarItem} onFechar={() => setModo('menu')} />
          ) : (
            <>
              <div className="mt-4 space-y-1.5">
                <AcaoBotao emoji="📷" titulo="Escanear comida" onClick={props.onEscanear} />
                <AcaoBotao emoji="🔍" titulo="Pesquisar alimento" onClick={() => setModo('busca')} />
                <AcaoBotao emoji="💊" titulo="Registrar suplemento" onClick={props.onAbrirSuplemento} />
                <AcaoBotao emoji="⭐" titulo="Alimentos salvos" onClick={() => setModo('salvos')} />
                {props.clipboard && (
                  <AcaoBotao
                    emoji="⧉"
                    titulo={`Colar "${props.clipboard.nome}"`}
                    onClick={props.onColar}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={props.onExcluir}
                className="mt-4 w-full rounded-xl border border-surface-4 py-2.5 text-micro font-medium text-accent-danger transition-colors active:bg-accent-danger/10"
              >
                🗑 Excluir refeição inteira
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}

function AcaoBotao(props: { emoji: string; titulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex w-full items-center gap-3.5 rounded-2xl p-3 text-left transition-colors active:bg-white/5"
    >
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-surface-3 text-2xl">
        {props.emoji}
      </span>
      <span className="flex-1 truncate text-base font-bold text-content-hi">{props.titulo}</span>
    </button>
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
    <div className="mt-4 border-b border-surface-3 pb-3">
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
