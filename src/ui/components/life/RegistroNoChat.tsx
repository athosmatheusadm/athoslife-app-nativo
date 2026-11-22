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
export function nomeRefeicaoRegistro(
  acao: Pick<AcaoRegistro, 'refeicao'>,
  refeicoes: Record<'cafe' | 'almoco' | 'lanche' | 'jantar', string>,
): string {
  return acao.refeicao.tipo === 'extra' ? acao.refeicao.nome : refeicoes[acao.refeicao.tipo]
}

/** A refeição principal + as outras contadas na mesma mensagem (22/11). */
function gruposDe(acao: AcaoRegistro) {
  return [{ dia: acao.dia, refeicao: acao.refeicao, itens: acao.itens }, ...(acao.outras ?? [])]
}

/**
 * Cartão de conferência da refeição digitada no chat: a pessoa ajusta as
 * gramas (±10 g) ou tira um item, e só então grava. Grava pelo mesmo caminho
 * da Dieta (funciona sem internet e entra na fila). Desde 22/11 pode trazer
 * mais de uma refeição e itens estimados (fora da base).
 */
export function RegistroNoChat(props: {
  acao: AcaoRegistro
  onPronto: (texto: string) => void
  onCancelar: () => void
}) {
  const { m } = useI18n()
  const t = m.lifeChat.registro
  const grupos = gruposDe(props.acao)
  const [itens, setItens] = useState(() =>
    grupos.flatMap((g, gi) =>
      g.itens.map((i, idx) => ({ ...i, gramas: limitarGramas(i.gramas) || i.porcaoG, grupo: gi, chave: `${gi}-${i.alimentoId}-${idx}` })),
    ),
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(false)
  const nomes = grupos.map((g) => nomeRefeicaoRegistro(g, m.dieta.refeicoes))
  const totalKcal = itens.reduce((s, i) => s + macrosDe(i, i.gramas).calorias, 0)

  function mudar(chave: string, gramas: number) {
    setItens((lista) => lista.map((i) => (i.chave === chave ? { ...i, gramas: Math.max(10, limitarGramas(gramas)) } : i)))
  }

  async function registrar() {
    if (salvando || itens.length === 0) return
    setSalvando(true)
    setErro(false)
    try {
      for (const i of itens) {
        const g = grupos[i.grupo] ?? grupos[0]!
        const r = g.refeicao
        const alvo: RefeicaoAlvo = r.tipo === 'extra' && r.extraId ? { tipo: 'extra', extraId: r.extraId } : { tipo: r.tipo === 'extra' ? 'lanche' : r.tipo }
        const unidades = i.unidadeG && i.gramas % i.unidadeG === 0 ? i.gramas / i.unidadeG : null
        await itensRefeicaoRepository.adicionar(alvo, new Date(`${g.dia}T12:00:00`), {
          nome: i.nome,
          quantidade: unidades ? m.dieta.busca.quantidadeUnidades(unidades, i.gramas) : `${i.gramas} g`,
          ...macrosDe(i, i.gramas),
        })
      }
      const usados = nomes.filter((_, gi) => itens.some((i) => i.grupo === gi))
      props.onPronto(t.pronto(itens.length, usados.join(t.juntar), fmtKcal(totalKcal)))
    } catch {
      setErro(true)
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-[92%] rounded-2xl border border-brand/40 bg-surface-2 p-3.5">
      {grupos.map((_, gi) =>
        itens.some((i) => i.grupo === gi) ? (
          <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
            <p className="text-micro font-bold uppercase tracking-wide text-content-low">{t.titulo(nomes[gi] ?? '')}</p>
            <ul className="mt-2 divide-y divide-surface-4/60">
            {itens.filter((i) => i.grupo === gi).map((i) => {
              const mc = macrosDe(i, i.gramas)
              return (
                <li key={i.chave} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-content-hi">{i.nome}</p>
                    <p className="text-micro tabular-nums text-content-low">
                      {fmtKcal(mc.calorias)} kcal · <span className="text-macro-proteina">{m.dieta.busca.prot(fmtG(mc.proteina))}</span>
                      {i.estimado && <> · {t.estimado}</>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => mudar(i.chave, i.gramas - 10)}
                    aria-label={t.menos(i.nome)}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-surface-4 text-lg leading-none text-content-mid active:scale-95"
                  >
                    −
                  </button>
                  <span className="w-14 flex-none text-center text-sm font-bold tabular-nums text-content-hi">{i.gramas} g</span>
                  <button
                    type="button"
                    onClick={() => mudar(i.chave, i.gramas + 10)}
                    aria-label={t.mais(i.nome)}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-surface-4 text-lg leading-none text-content-mid active:scale-95"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setItens((lista) => lista.filter((x) => x.chave !== i.chave))}
                    aria-label={t.tirar(i.nome)}
                    className="flex h-9 w-7 flex-none items-center justify-center text-lg leading-none text-content-low active:scale-95"
                  >
                    ×
                  </button>
                </li>
              )
            })}
            </ul>
          </div>
        ) : null,
      )}
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
