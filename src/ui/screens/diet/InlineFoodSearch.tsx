import { useEffect, useState } from 'react'
import { useFoodSearch } from '@ui/screens/food-search/useFoodSearch'
import { escalarMacros } from '@domain/rules/foodReconciliation'
import { favoritosAlimentoRepository } from '@data/repositories/favoritosAlimentoRepository'
import type { AlimentoBase, Macros } from '@domain/entities/food'
import type { ItemRefeicao } from '@domain/entities/meal'
import { useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { AiProxyError, estimarAlimento, type AlimentoEstimado } from '@data/ai/aiProxy'
import type { Mensagens } from '@/i18n/mensagens/tipo'

/** Erro do "Life estima" em texto pra pessoa (busca da Dieta e scanner). */
export function mensagemErroEstimar(e: unknown, t: Mensagens['dieta']['busca']['estimar']): string {
  if (e instanceof AiProxyError) {
    if (e.info.tipo === 'limit_reached') return e.info.proximoReset ? t.limite(e.info.proximoReset) : t.limiteSemHora
    if (e.info.tipo === 'rate_limited') return t.rapido
    if (e.info.tipo === 'indisponivel') return t.pausado
  }
  return t.falhou
}

/** Estimativa do Life no formato da base — id fixo, não existe na tabela (sem ⭐). */
export const ID_ESTIMADO = 'life-estimado'
export function alimentoDeEstimativa(e: AlimentoEstimado): AlimentoBase {
  return { id: ID_ESTIMADO, nome: e.nome, porcaoG: e.porcaoG, categoria: null, calorias: e.calorias, proteina: e.proteina, carboidrato: e.carboidrato, gordura: e.gordura }
}

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
  const [estimando, setEstimando] = useState(false)
  const [erroEstimar, setErroEstimar] = useState<string | null>(null)
  const { m } = useI18n()
  const t = m.dieta.busca
  useFecharNoVoltar(escolhido !== null, () => setEscolhido(null))

  // Termo novo: o aviso do pedido anterior não vale mais.
  useEffect(() => setErroEstimar(null), [termo])

  async function pedirEstimativa() {
    setErroEstimar(null)
    setEstimando(true)
    try {
      const e = await estimarAlimento(termo.trim())
      if (e) setEscolhido(alimentoDeEstimativa(e))
      else setErroEstimar(t.estimar.naoReconhecido)
    } catch (err) {
      setErroEstimar(mensagemErroEstimar(err, t.estimar))
    } finally {
      setEstimando(false)
    }
  }

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="flex-none text-content-low" aria-hidden="true" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder={t.placeholder}
          autoFocus
          className="min-h-12 flex-1 bg-transparent text-base text-content-hi placeholder:text-content-low focus:outline-none"
        />
        <button onClick={props.onFechar} aria-label={t.fechar} className="-mr-2 flex h-11 w-11 flex-none items-center justify-center text-content-low active:text-content-hi">✕</button>
      </div>

      {buscando && <p className="py-2 text-micro text-content-low">{t.buscando}</p>}

      {!buscando && termo.trim().length >= 2 && resultados.length === 0 && (
        <div className="py-3 text-center">
          <p className="text-micro text-content-low">{t.nada}</p>
          <button
            type="button"
            onClick={() => void pedirEstimativa()}
            disabled={estimando}
            className="mt-2 min-h-12 w-full rounded-xl border border-brand/60 px-3 text-sm font-bold text-brand transition-colors active:bg-brand/10 disabled:opacity-50"
          >
            {estimando ? t.estimar.estimando : t.estimar.botao(termo.trim())}
          </button>
          <p className="mt-1 text-micro text-content-low">{t.estimar.custo}</p>
          {erroEstimar && <p role="alert" className="mt-2 text-micro text-accent-danger">{erroEstimar}</p>}
        </div>
      )}

      <ul className="max-h-52 overflow-y-auto">
        {resultados.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => setEscolhido(a)}
              className="flex min-h-14 w-full items-center justify-between gap-3 border-t border-surface-3 py-2 text-left transition-colors first:border-t-0 active:bg-content-hi/5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-content-hi">{a.nome}</span>
                <span className="block text-micro text-content-low">{t.referencia(a.porcaoG)}</span>
              </span>
              <span className="flex-none text-right">
                <span className="block text-sm font-bold text-brand">{a.calorias} kcal</span>
                <span className="block text-micro text-macro-proteina">{t.prot(a.proteina)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Ajuste de porção, também dentro do card. Exportado porque também serve
 * a lista de "Alimentos salvos" (SavedFoodsList) — mesmo fluxo de
 * escolher→ajustar porção→confirmar, mudando só de onde vem a lista.
 */
export function PorcaoInline(props: {
  alimento: AlimentoBase
  onConfirmar: (item: ItemRefeicao) => void
  onVoltar: () => void
}) {
  const { alimento } = props
  const [gramas, setGramas] = useState(alimento.porcaoG)
  const m = escalarMacros(alimento, gramas)
  const t = useI18n().m.dieta.busca

  return (
    <div className="mt-3 border-t border-surface-3 pt-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={props.onVoltar}
          aria-label={t.voltar}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-surface-4 text-2xl leading-none text-content-hi"
        >
          ‹
        </button>
        <span className="flex-1 truncate text-sm font-semibold text-content-hi">{alimento.nome}</span>
        {alimento.id !== ID_ESTIMADO && <FavoritoStar alimentoId={alimento.id} />}
        <span className="text-sm font-bold text-brand">{m.calorias} kcal</span>
      </div>

      <MacroChips m={m} />
      {alimento.id === ID_ESTIMADO && <p className="mt-1 text-micro text-content-low">{t.estimar.nota}</p>}

      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={gramas}
          onChange={(e) => setGramas(Math.max(0, Number(e.target.value) || 0))}
          aria-label={t.gramas}
          className="min-h-12 w-24 rounded-xl border border-surface-4 bg-surface-3 px-3 text-center text-base font-bold text-content-hi focus:border-brand focus:outline-none"
        />
        <span className="text-micro text-content-low">{t.gramas}</span>
        <div className="flex flex-1 justify-end gap-1.5">
          {[50, 100, 150].map((g) => (
            <button
              key={g}
              onClick={() => setGramas(g)}
              className="min-h-11 min-w-11 rounded-pill border border-surface-4 px-3 text-sm font-semibold text-content-mid active:scale-95 active:bg-content-hi/5"
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
        className="mt-3 min-h-12 w-full rounded-xl bg-brand text-base font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        {t.adicionar}
      </button>
    </div>
  )
}

/**
 * Proteína/carboidrato/gordura da porção escolhida — antes só o kcal
 * aparecia aqui (sumia até o item já estar salvo na refeição). Exportado
 * pra reaproveitar no suplemento (DoseSuplemento), mesma necessidade.
 */
export function MacroChips(props: { m: Macros }) {
  const t = useI18n().m.dieta.busca
  return (
    <div className="mt-1.5 flex gap-3 text-micro text-content-low">
      <span><b className="font-bold text-macro-proteina">{props.m.proteina}g</b> {t.chipProt}</span>
      <span><b className="font-bold text-macro-carbo">{props.m.carboidrato}g</b> {t.chipCarb}</span>
      <span><b className="font-bold text-macro-gordura">{props.m.gordura}g</b> {t.chipGord}</span>
    </div>
  )
}

/**
 * Estrela "salvar alimento" — cada alimento sabe de si mesmo (carrega o
 * próprio estado ao montar, mesmo padrão do lembrete do HabitCard).
 * Exportada porque tanto a busca de comida (PorcaoInline) quanto o
 * suplemento (SupplementSheet, que tem sua própria tela de dose — não
 * reaproveita PorcaoInline, só esta estrela) usam.
 */
export function FavoritoStar(props: { alimentoId: string }) {
  const [favorito, setFavorito] = useState(false)
  const [favoritando, setFavoritando] = useState(false)
  const t = useI18n().m.dieta.busca

  useEffect(() => {
    let ativo = true
    favoritosAlimentoRepository
      .estaFavoritado(props.alimentoId)
      .then((v) => ativo && setFavorito(v))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [props.alimentoId])

  async function alternar() {
    setFavoritando(true)
    try {
      if (favorito) {
        await favoritosAlimentoRepository.desfavoritar(props.alimentoId)
      } else {
        await favoritosAlimentoRepository.favoritar(props.alimentoId)
      }
      setFavorito((v) => !v)
    } catch {
      // silencioso: favoritar é conveniência, não crítico o bastante pra travar a tela com erro
    } finally {
      setFavoritando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void alternar()}
      disabled={favoritando}
      aria-label={favorito ? t.tirarDosSalvos : t.salvar}
      aria-pressed={favorito}
      className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl border text-lg transition-colors disabled:opacity-50 ${
        favorito ? 'border-brand/60 text-brand' : 'border-surface-4 text-content-low'
      }`}
    >
      {favorito ? '★' : '☆'}
    </button>
  )
}
