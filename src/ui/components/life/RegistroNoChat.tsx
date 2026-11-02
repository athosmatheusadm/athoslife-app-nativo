import { useState } from 'react'
import type { AcaoLife, ItemRegistroLife } from '@data/ai/aiProxy'
import { itensRefeicaoRepository, type RefeicaoAlvo } from '@data/repositories/itensRefeicaoRepository'
import { escalarMacros } from '@domain/rules/foodReconciliation'
import { fmtG, fmtKcal } from '@domain/rules/formatoNumero'
import { limitarGramas } from '@domain/rules/limites'
import { useI18n } from '@/i18n/I18nProvider'

type AcaoRegistro = Extract<AcaoLife, { tipo: 'registrar_itens' }>

/** Macros do item na quantidade escolhida (mesma conta da busca da Dieta). */
function macrosDe(i: ItemRegistroLife, gramas: number) {
  return escalarMacros(
    { id: i.alimentoId, nome: i.nome, porcaoG: i.porcaoG, calorias: i.calorias, proteina: i.proteina, carboidrato: i.carboidrato, gordura: i.gordura, categoria: null },
    gramas,
  )
}

/** Nome da refeição pra mostrar ("Almoço" ou o nome da extra). */
export function nomeRefeicaoRegistro(acao: AcaoRegistro, refeicoes: Record<'cafe' | 'almoco' | 'lanche' | 'jantar', string>): string {
  return acao.refeicao.tipo === 'extra' ? acao.refeicao.nome : refeicoes[acao.refeicao.tipo]
}

/**
 * Cartão de conferência da refeição digitada no chat: a pessoa ajusta as
 * gramas (±10 g) ou tira um item, e só então grava. Grava pelo mesmo caminho
 * da Dieta (funciona sem internet e entra na fila).
 */
export function RegistroNoChat(props: {
  acao: AcaoRegistro
  onPronto: (texto: string) => void
  onCancelar: () => void
}) {
  const { m } = useI18n()
  const t = m.lifeChat.registro
  const [itens, setItens] = useState(() => props.acao.itens.map((i) => ({ ...i, gramas: limitarGramas(i.gramas) || i.porcaoG })))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(false)
  const nomeRefeicao = nomeRefeicaoRegistro(props.acao, m.dieta.refeicoes)
  const totalKcal = itens.reduce((s, i) => s + macrosDe(i, i.gramas).calorias, 0)

  function mudar(id: string, gramas: number) {
    setItens((lista) => lista.map((i) => (i.alimentoId === id ? { ...i, gramas: Math.max(10, limitarGramas(gramas)) } : i)))
  }

  async function registrar() {
    if (salvando || itens.length === 0) return
    setSalvando(true)
    setErro(false)
    const r = props.acao.refeicao
    const alvo: RefeicaoAlvo = r.tipo === 'extra' && r.extraId ? { tipo: 'extra', extraId: r.extraId } : { tipo: r.tipo === 'extra' ? 'lanche' : r.tipo }
    const data = new Date(`${props.acao.dia}T12:00:00`)
    try {
      for (const i of itens) {
        const unidades = i.unidadeG && i.gramas % i.unidadeG === 0 ? i.gramas / i.unidadeG : null
        await itensRefeicaoRepository.adicionar(alvo, data, {
          nome: i.nome,
          quantidade: unidades ? m.dieta.busca.quantidadeUnidades(unidades, i.gramas) : `${i.gramas} g`,
          ...macrosDe(i, i.gramas),
        })
      }
      props.onPronto(t.pronto(itens.length, nomeRefeicao, fmtKcal(totalKcal)))
    } catch {
      setErro(true)
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-[92%] rounded-2xl border border-brand/40 bg-surface-2 p-3.5">
      <p className="text-micro font-bold uppercase tracking-wide text-content-low">{t.titulo(nomeRefeicao)}</p>
      <ul className="mt-2 divide-y divide-surface-4/60">
        {itens.map((i) => {
          const mc = macrosDe(i, i.gramas)
          return (
            <li key={i.alimentoId} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-content-hi">{i.nome}</p>
                <p className="text-micro tabular-nums text-content-low">
                  {fmtKcal(mc.calorias)} kcal · <span className="text-macro-proteina">{m.dieta.busca.prot(fmtG(mc.proteina))}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => mudar(i.alimentoId, i.gramas - 10)}
                aria-label={t.menos(i.nome)}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-surface-4 text-lg leading-none text-content-mid active:scale-95"
              >
                −
              </button>
              <span className="w-14 flex-none text-center text-sm font-bold tabular-nums text-content-hi">{i.gramas} g</span>
              <button
                type="button"
                onClick={() => mudar(i.alimentoId, i.gramas + 10)}
                aria-label={t.mais(i.nome)}
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-surface-4 text-lg leading-none text-content-mid active:scale-95"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setItens((lista) => lista.filter((x) => x.alimentoId !== i.alimentoId))}
                aria-label={t.tirar(i.nome)}
                className="flex h-9 w-7 flex-none items-center justify-center text-lg leading-none text-content-low active:scale-95"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-sm font-bold tabular-nums text-brand">{t.total(fmtKcal(totalKcal))}</p>
      {erro && <p className="mt-1 text-micro text-accent-danger">{t.falhou}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={salvando}
          onClick={props.onCancelar}
          className="min-h-11 flex-1 rounded-xl border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5 disabled:opacity-50"
        >
          {t.cancelar}
        </button>
        <button
          type="button"
          disabled={salvando || itens.length === 0}
          onClick={() => void registrar()}
          className="min-h-11 flex-1 rounded-xl bg-brand text-sm font-bold text-brand-ink active:scale-[0.98] disabled:opacity-40"
        >
          {t.registrar}
        </button>
      </div>
    </div>
  )
}
