import { useEffect, useState } from 'react'
import { refeicoesRepository, type TipoRefeicao } from '@data/repositories/refeicoesRepository'
import cafeImg from '@/assets/refeicoes/refeicao-cafe.png'
import almocoImg from '@/assets/refeicoes/refeicao-almoco.png'
import lancheImg from '@/assets/refeicoes/refeicao-lanche.png'
import jantarImg from '@/assets/refeicoes/refeicao-jantar.png'

/**
 * Cards de refeição no visual da arte, agora com FOTO real do prato
 * (imagem fixa por tipo, PNG transparente). A foto não vem do usuário:
 * cada tipo tem sua imagem fixa, decisão de produto.
 */

const VISUAL: Record<TipoRefeicao, { nome: string; img: string | null }> = {
  cafe: { nome: 'Café', img: cafeImg },
  almoco: { nome: 'Almoço', img: almocoImg },
  lanche: { nome: 'Lanche', img: lancheImg },
  jantar: { nome: 'Jantar', img: jantarImg },
  extra: { nome: 'Extra', img: null },
}

const ORDEM: TipoRefeicao[] = ['cafe', 'almoco', 'lanche', 'jantar']

export function MealCards(props: {
  onAbrir: (tipo: TipoRefeicao) => void
  /** "+" — cria uma refeição extra nova (Colação, Ceia, Pós-treino...) e leva pra Dieta já nela. */
  onCriarNovaRefeicao: () => void
}) {
  const [kcalPorTipo, setKcalPorTipo] = useState<Map<TipoRefeicao, number>>(new Map())

  useEffect(() => {
    let ativo = true
    void refeicoesRepository
      .doDia()
      .then((resumo) => {
        if (!ativo) return
        setKcalPorTipo(new Map(resumo.map((r) => [r.tipo, r.kcal])))
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [])

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-hi">Refeições</h2>
        <span className="text-micro font-semibold text-brand">Ver todas</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ORDEM.map((tipo) => {
          const v = VISUAL[tipo]
          const kcal = kcalPorTipo.get(tipo) ?? null
          return (
            <button
              key={tipo}
              onClick={() => props.onAbrir(tipo)}
              className="flex w-[84px] flex-none flex-col items-center gap-1.5"
            >
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-surface-4 bg-surface-3">
                {v.img ? (
                  <img src={v.img} alt="" className="h-full w-full object-contain" loading="lazy" />
                ) : (
                  <span className="text-3xl">🍴</span>
                )}
              </span>
              <span className="text-micro font-medium text-content-hi">{v.nome}</span>
              <span className="text-[10px] font-semibold text-brand">
                {kcal !== null ? `${kcal} kcal` : '—'}
              </span>
            </button>
          )
        })}

        {/* Cria uma refeição extra nova (nome livre) e já leva pra ela na Dieta. */}
        <button
          onClick={props.onCriarNovaRefeicao}
          className="flex w-[84px] flex-none flex-col items-center gap-1.5"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-surface-4 text-2xl text-brand">
            +
          </span>
          <span className="text-micro font-medium text-content-low">Adicionar</span>
        </button>
      </div>
    </section>
  )
}
