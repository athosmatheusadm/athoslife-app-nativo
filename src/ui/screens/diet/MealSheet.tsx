import { ActivityIcon } from '@ui/components/ActivityIcon'
import { ActivityIconPicker, MEAL_ICONS } from '@ui/components/ActivityIcon'
import { useEffect, useState } from 'react'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { macrosRefeicao, type ItemRefeicao, type Refeicao } from '@domain/entities/meal'
import { useI18n } from '@/i18n/I18nProvider'
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
  /** Itens do plano de referência ainda não registrados nesta refeição. */
  sugestoesPlano?: readonly ItemRefeicao[]
  onAdicionarPlano?: (itens: readonly ItemRefeicao[]) => void
  onRemoverItem: (itemId: string) => void
  onCopiarItem: (item: ItemRefeicao) => void
  onColar: () => void
  onExcluir: () => void
  onToggleConcluida: () => void
  onEscanear: () => void
  onAbrirSuplemento: () => void
  /** Só definido para refeições extras, que não têm nome fixo. */
  onRenomear?: (novoNome: string) => void
  onMudarIcone?: (icone: string) => Promise<void>
  erroRenomear?: string | null
}) {
  const { refeicao } = props
  const [modo, setModo] = useState<Modo>('menu')
  const [salvandoIcone, setSalvandoIcone] = useState(false)
  const [erroIcone, setErroIcone] = useState(false)
  const [itemSelecionadoId, setItemSelecionadoId] = useState<string | null>(null)
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false)
  const macros = macrosRefeicao(refeicao.itens)
  const { m, idioma } = useI18n()
  const t = m.dieta.sheet
  const sugestoes = props.sugestoesPlano ?? []

  // Voltar do Android: busca/salvos voltam pro menu; menu fecha o sheet.
  useFecharNoVoltar(true, props.onFechar)
  useFecharNoVoltar(modo !== 'menu', () => setModo('menu'))

  // "Excluir refeição inteira" pede um 2º toque (3 s) em vez do confirm() do
  // sistema, que no app aparecia com título "localhost".
  useEffect(() => {
    if (!confirmandoExcluir) return
    const id = setTimeout(() => setConfirmandoExcluir(false), 3000)
    return () => clearTimeout(id)
  }, [confirmandoExcluir])

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={refeicao.nome}
    >
      <button
        aria-label={t.fechar}
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-surface-4 bg-surface-1 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mt-3 h-1 w-10 flex-none rounded-full bg-surface-4" aria-hidden="true" />

        <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-3">
          <div className="flex items-center gap-3">
            <ActivityIcon icone={refeicao.icone ?? refeicao.tipo} />
            <span className="min-w-0 flex-1 truncate text-xl font-bold text-content-hi">{refeicao.nome}</span>
            <span className="text-sm font-bold tabular-nums text-brand">{macros.calorias} kcal</span>
            <button
              type="button"
              role="checkbox"
              aria-checked={refeicao.concluida}
              aria-label={m.dieta.marcarFeita(refeicao.nome)}
              onClick={props.onToggleConcluida}
              className="-mr-2 flex h-12 w-12 flex-none items-center justify-center rounded-xl active:bg-white/5"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-colors ${
                  refeicao.concluida ? 'border-brand bg-brand text-brand-ink' : 'border-content-dim'
                }`}
              >
                {refeicao.concluida && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                )}
              </span>
            </button>
          </div>

          {props.onRenomear && (
            <NomeExtraInput
              key={refeicao.nome}
              valorInicial={refeicao.nome}
              onSalvar={props.onRenomear}
              erro={props.erroRenomear ? t.erroNome : null}
            />
          )}

          {props.onMudarIcone && <ActivityIconPicker valor={refeicao.icone ?? 'tigela'} opcoes={MEAL_ICONS} disabled={salvandoIcone}
            onChange={(icone) => {
              setSalvandoIcone(true)
              setErroIcone(false)
              void props.onMudarIcone!(icone).catch(() => setErroIcone(true)).finally(() => setSalvandoIcone(false))
            }} />}
          {erroIcone && <p role="alert" className="mt-2 text-sm text-accent-danger">{idioma === 'en' ? "Couldn't save the icon. Try again." : idioma === 'es' ? 'No se pudo guardar el icono. Inténtalo de nuevo.' : 'Não deu para salvar o ícone. Tente novamente.'}</p>}

          {/* Itens já registrados — toca pra selecionar, ⧉ copia, 🗑 exclui (com Desfazer) */}
          <ul className="mt-3 border-t border-surface-3 pt-1">
            {refeicao.itens.map((item) => {
              const selecionado = itemSelecionadoId === item.id
              return (
                <li key={item.id} className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    aria-expanded={selecionado}
                    onClick={() => setItemSelecionadoId((atual) => (atual === item.id ? null : item.id))}
                    className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-left transition-colors active:bg-white/5 ${selecionado ? 'bg-white/5' : ''}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-content-hi">{item.nome}</span>
                    <span className="flex-none text-content-low">{item.quantidade}</span>
                    <span className="w-16 flex-none text-right font-medium tabular-nums text-content-mid">
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
                        aria-label={t.copiar(item.nome)}
                        className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-surface-4 text-base text-content-hi active:bg-white/5"
                      >
                        ⧉
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          props.onRemoverItem(item.id)
                          setItemSelecionadoId(null)
                        }}
                        aria-label={t.excluir(item.nome)}
                        className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-accent-danger/40 text-lg text-accent-danger active:bg-accent-danger/10"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </li>
              )
            })}
            {refeicao.itens.length === 0 && sugestoes.length === 0 && (
              <li className="py-3 text-center text-micro text-content-low">{t.vazio}</li>
            )}
          </ul>
          {refeicao.itens.length > 0 && !itemSelecionadoId && (
            <p className="mt-1 text-micro text-content-low">{t.dicaItem}</p>
          )}

          {/* Plano de referência: apagado até a pessoa dizer que comeu (+). */}
          {sugestoes.length > 0 && props.onAdicionarPlano && (
            <div className="mt-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-micro font-semibold text-brand">✨ {m.planoDieta.card.doPlano}</span>
                {sugestoes.length > 1 && (
                  <button type="button" onClick={() => props.onAdicionarPlano!(sugestoes)} className="min-h-11 px-2 text-micro font-semibold text-brand active:opacity-70">
                    {m.planoDieta.card.adicionarTudo}
                  </button>
                )}
              </div>
              <ul>
                {sugestoes.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-1 text-sm">
                    <span className="flex min-w-0 flex-1 items-center gap-3 opacity-70">
                      <span className="min-w-0 flex-1 truncate text-content-hi">{item.nome}</span>
                      <span className="flex-none text-content-low">{item.quantidade}</span>
                      <span className="w-14 flex-none text-right tabular-nums text-content-mid">{item.calorias} kcal</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => props.onAdicionarPlano!([item])}
                      aria-label={`${m.comum.adicionar} ${item.nome}`}
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-brand/60 text-lg font-bold text-brand active:bg-brand/10"
                    >
                      +
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-micro text-content-low">{m.planoDieta.card.dica}</p>
            </div>
          )}

          {refeicao.itens.length > 0 && (
            <div className="mt-3 flex border-y border-surface-3 py-3 text-center">
              <MacroCell v={`${macros.proteina}g`} l={m.dieta.macroLongo.proteina} cor="text-macro-proteina" />
              <MacroCell v={`${macros.carboidrato}g`} l={m.dieta.macroLongo.carbo} cor="text-macro-carbo" />
              <MacroCell v={`${macros.gordura}g`} l={m.dieta.macroLongo.gordura} cor="text-macro-gordura" />
              <MacroCell v={String(macros.calorias)} l={m.dieta.macroLongo.calorias} cor="text-brand" />
            </div>
          )}

          {modo === 'busca' ? (
            <InlineFoodSearch onAdicionar={props.onAdicionarItem} onFechar={() => setModo('menu')} />
          ) : modo === 'salvos' ? (
            <SavedFoodsList onAdicionar={props.onAdicionarItem} onFechar={() => setModo('menu')} />
          ) : (
            <>
              <div className="mt-3 space-y-1">
                <AcaoBotao emoji="📷" titulo={t.escanear} onClick={props.onEscanear} />
                <AcaoBotao emoji="🔍" titulo={t.pesquisar} onClick={() => setModo('busca')} />
                <AcaoBotao emoji="💊" titulo={t.suplemento} onClick={props.onAbrirSuplemento} />
                <AcaoBotao emoji="⭐" titulo={t.salvos} onClick={() => setModo('salvos')} />
                {props.clipboard && (
                  <AcaoBotao emoji="⧉" titulo={t.colar(props.clipboard.nome)} onClick={props.onColar} />
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!confirmandoExcluir) return setConfirmandoExcluir(true)
                  setConfirmandoExcluir(false)
                  props.onExcluir()
                }}
                className={`mt-4 min-h-12 w-full rounded-xl border text-sm font-semibold transition-colors ${
                  confirmandoExcluir
                    ? 'border-accent-danger bg-accent-danger/15 text-accent-danger'
                    : 'border-surface-4 text-accent-danger active:bg-accent-danger/10'
                }`}
              >
                🗑 {confirmandoExcluir ? t.confirmarExcluir : t.excluirRefeicao}
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
      className="flex min-h-14 w-full items-center gap-3.5 rounded-2xl p-2 text-left transition-colors active:bg-white/5"
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
  const { m } = useI18n()

  return (
    <div className="mt-3 border-b border-surface-3 pb-3">
      <label className="mb-1 block text-micro font-bold uppercase tracking-wide text-content-low">
        {m.dieta.sheet.nomeRefeicao}
      </label>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          if (valor.trim() && valor.trim() !== props.valorInicial) props.onSalvar(valor)
        }}
        placeholder={m.dieta.sheet.nomeExemplo}
        className="min-h-12 w-full rounded-xl border border-surface-4 bg-surface-3 px-3 text-base font-semibold text-content-hi placeholder:font-normal placeholder:text-content-low focus:border-brand focus:outline-none"
      />
      {props.erro && <p className="mt-1 text-micro text-accent-danger">{props.erro}</p>}
    </div>
  )
}

function MacroCell({ v, l, cor }: { v: string; l: string; cor: string }) {
  return (
    <div className="flex-1">
      <div className={`text-base font-bold ${cor}`}>{v}</div>
      <div className="text-micro text-content-low">{l}</div>
    </div>
  )
}
