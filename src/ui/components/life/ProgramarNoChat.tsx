import { useState } from 'react'
import type { AcaoLife, ItemRegistroLife } from '@data/ai/aiProxy'
import { planejadasRepository } from '@data/repositories/planejadasRepository'
import { escalarMacros } from '@domain/rules/foodReconciliation'
import { fmtG, fmtKcal } from '@domain/rules/formatoNumero'
import { limitarGramas } from '@domain/rules/limites'
import { useI18n } from '@/i18n/I18nProvider'

type AcaoProgramar = Extract<AcaoLife, { tipo: 'programar_itens' }>
type Tipo = AcaoProgramar['refeicoes'][number]['tipo']
interface ItemCartao extends ItemRegistroLife { readonly chave: string; readonly refeicao: Tipo }

const macrosDe = (i: ItemRegistroLife, gramas: number) =>
  escalarMacros(
    { id: i.alimentoId, nome: i.nome, porcaoG: i.porcaoG, calorias: i.calorias, proteina: i.proteina, carboidrato: i.carboidrato, gordura: i.gordura, categoria: null },
    gramas,
  )

/** "03/11" no formato do idioma. */
function diaCurto(dia: string, idioma: string): string {
  const [, m, d] = dia.split('-')
  return idioma === 'en' ? `${m}/${d}` : `${d}/${m}`
}

/**
 * Cartão "deixar no lugar" (02/11): o Life propõe comida pra hoje ou pros
 * próximos dias; a pessoa ajusta as gramas ou tira um item e confirma. Grava
 * em refeicoes_planejadas (sem internet também) — na Dieta aparece
 * apagadinho, e o ✓ da refeição registra de verdade. Depois de confirmar,
 * o cartão vira "Desfazer" (apaga o lote inteiro).
 */
export function ProgramarNoChat(props: {
  acao: AcaoProgramar
  onPronto: (texto: string) => void
  onDesfeito: (texto: string) => void
  onCancelar: () => void
}) {
  const { m, idioma } = useI18n()
  const t = m.lifeChat.programar
  const [itens, setItens] = useState<ItemCartao[]>(() =>
    props.acao.refeicoes.flatMap((r) =>
      r.itens.map((i, idx) => ({ ...i, gramas: limitarGramas(i.gramas) || i.porcaoG, chave: `${r.tipo}-${i.alimentoId}-${idx}`, refeicao: r.tipo })),
    ),
  )
  const [estado, setEstado] = useState<'conferir' | 'salvando' | 'feito' | 'desfazendo' | 'desfeito'>('conferir')
  const [lote, setLote] = useState<string | null>(null)
  const [erro, setErro] = useState(false)
  const dias = props.acao.dias
  const totalKcal = itens.reduce((s, i) => s + macrosDe(i, i.gramas).calorias, 0)
  const tiposNaOrdem = props.acao.refeicoes.map((r) => r.tipo).filter((tp) => itens.some((i) => i.refeicao === tp))

  function mudar(chave: string, gramas: number) {
    setItens((l) => l.map((i) => (i.chave === chave ? { ...i, gramas: Math.max(10, limitarGramas(gramas)) } : i)))
  }

  async function confirmar() {
    if (estado !== 'conferir' || itens.length === 0) return
    setEstado('salvando')
    setErro(false)
    try {
      const linhas = dias.flatMap((data) =>
        itens.map((i) => {
          const unidades = i.unidadeG && i.gramas % i.unidadeG === 0 ? i.gramas / i.unidadeG : null
          return {
            data,
            tipo: i.refeicao,
            nome: i.nome,
            quantidade: unidades ? m.dieta.busca.quantidadeUnidades(unidades, i.gramas) : `${i.gramas} g`,
            ...macrosDe(i, i.gramas),
          }
        }),
      )
      const id = await planejadasRepository.adicionarLote(linhas)
      setLote(id)
      setEstado('feito')
      props.onPronto(t.pronto(dias.map((d) => diaCurto(d, idioma)).join(', ')))
    } catch {
      setErro(true)
      setEstado('conferir')
    }
  }

  async function desfazer() {
    if (!lote || estado !== 'feito') return
    setEstado('desfazendo')
    try {
      await planejadasRepository.apagarLote(lote, dias)
      setEstado('desfeito')
      props.onDesfeito(t.desfeito)
    } catch {
      setEstado('feito')
      setErro(true)
    }
  }

  if (estado === 'feito' || estado === 'desfazendo' || estado === 'desfeito') {
    return estado === 'desfeito' ? null : (
      <div className="flex max-w-[92%] items-center gap-3 rounded-2xl border border-surface-4 bg-surface-2 px-3.5 py-2.5">
        <p className="min-w-0 flex-1 text-micro text-content-low">{t.noLugar(dias.map((d) => diaCurto(d, idioma)).join(', '))}</p>
        <button
          type="button"
          disabled={estado === 'desfazendo'}
          onClick={() => void desfazer()}
          className="min-h-11 flex-none rounded-xl border border-surface-4 px-3 text-sm font-semibold text-content-mid active:bg-content-hi/5 disabled:opacity-50"
        >
          {t.desfazer}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[92%] rounded-2xl border border-brand/40 bg-surface-2 p-3.5">
      <p className="text-micro font-bold uppercase tracking-wide text-content-low">
        {t.titulo(dias.map((d) => diaCurto(d, idioma)).join(', '))}
      </p>
      {tiposNaOrdem.map((tp) => (
        <div key={tp} className="mt-2">
          <p className="text-sm font-semibold text-content-mid">{m.dieta.refeicoes[tp]}</p>
          <ul className="divide-y divide-surface-4/60">
            {itens.filter((i) => i.refeicao === tp).map((i) => {
              const mc = macrosDe(i, i.gramas)
              return (
                <li key={i.chave} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-content-hi">{i.nome}</p>
                    <p className="text-micro tabular-nums text-content-low">
                      {fmtKcal(mc.calorias)} kcal · <span className="text-macro-proteina">{m.dieta.busca.prot(fmtG(mc.proteina))}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => mudar(i.chave, i.gramas - 10)}
                    aria-label={m.lifeChat.registro.menos(i.nome)}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-surface-4 text-lg leading-none text-content-mid active:scale-95"
                  >
                    −
                  </button>
                  <span className="w-14 flex-none text-center text-sm font-bold tabular-nums text-content-hi">{i.gramas} g</span>
                  <button
                    type="button"
                    onClick={() => mudar(i.chave, i.gramas + 10)}
                    aria-label={m.lifeChat.registro.mais(i.nome)}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-surface-4 text-lg leading-none text-content-mid active:scale-95"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setItens((l) => l.filter((x) => x.chave !== i.chave))}
                    aria-label={m.lifeChat.registro.tirar(i.nome)}
                    className="flex h-9 w-7 flex-none items-center justify-center text-lg leading-none text-content-low active:scale-95"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <p className="mt-1 text-sm font-bold tabular-nums text-brand">
        {dias.length > 1 ? t.totalPorDia(fmtKcal(totalKcal)) : m.lifeChat.registro.total(fmtKcal(totalKcal))}
      </p>
      <p className="mt-1 text-micro text-content-low">{t.explica}</p>
      {erro && <p className="mt-1 text-micro text-accent-danger">{t.falhou}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={estado === 'salvando'}
          onClick={props.onCancelar}
          className="min-h-11 flex-1 rounded-xl border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5 disabled:opacity-50"
        >
          {m.lifeChat.registro.cancelar}
        </button>
        <button
          type="button"
          disabled={estado === 'salvando' || itens.length === 0}
          onClick={() => void confirmar()}
          className="min-h-11 flex-1 rounded-xl bg-brand text-sm font-bold text-brand-ink active:scale-[0.98] disabled:opacity-40"
        >
          {t.confirmar}
        </button>
      </div>
    </div>
  )
}
