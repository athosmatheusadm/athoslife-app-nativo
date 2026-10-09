import { useEffect, useState } from 'react'
import { refeicoesRepository, type TipoRefeicao } from '@data/repositories/refeicoesRepository'
import cafeImg from '@/assets/refeicoes/refeicao-cafe.png'
import almocoImg from '@/assets/refeicoes/refeicao-almoco.png'
import lancheImg from '@/assets/refeicoes/refeicao-lanche.png'
import jantarImg from '@/assets/refeicoes/refeicao-jantar.png'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Cards de refeição no visual da arte, agora com FOTO real do prato
 * (imagem fixa por tipo, PNG transparente). A foto não vem do usuário:
 * cada tipo tem sua imagem fixa, decisão de produto.
 */

const IMG = { cafe: cafeImg, almoco: almocoImg, lanche: lancheImg, jantar: jantarImg } as const

const ORDEM = ['cafe', 'almoco', 'lanche', 'jantar'] as const

export function MealCards(props: {
  onAbrir: (tipo: TipoRefeicao) => void
  /** "+" — cria uma refeição extra nova (Colação, Ceia, Pós-treino...) e leva pra Dieta já nela. */
  onCriarNovaRefeicao: () => void
  /** "Ver todas" — abre a Dieta (antes era um texto que parecia botão e não fazia nada). */
  onVerTodas: () => void
}) {
  const { m } = useI18n()
  const t = m.home.refeicoes
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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-hi">{t.titulo}</h2>
        <button type="button" onClick={props.onVerTodas} className="-mr-2 min-h-11 px-2 text-sm font-semibold text-brand active:opacity-70">
          {t.verTodas} ›
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto sem-barra pb-1">
        {ORDEM.map((tipo) => {
          const kcal = kcalPorTipo.get(tipo) ?? null
          return (
            <button
              key={tipo}
              onClick={() => props.onAbrir(tipo)}
              className="flex w-[84px] flex-none flex-col items-center gap-1.5 rounded-2xl pb-1 transition-transform active:scale-95"
            >
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-surface-4 bg-surface-3">
                <img src={IMG[tipo]} alt="" className="h-full w-full object-contain" loading="lazy" />
              </span>
              <span className="text-micro font-medium text-content-hi">{m.dieta.refeicoes[tipo]}</span>
              <span className={`text-micro font-semibold tabular-nums ${kcal ? 'text-brand' : 'text-content-low'}`}>
                {kcal ? `${kcal} kcal` : t.registrar}
              </span>
            </button>
          )
        })}

        {/* Cria uma refeição extra nova (nome livre) e já leva pra ela na Dieta. */}
        <button
          onClick={props.onCriarNovaRefeicao}
          className="flex w-[84px] flex-none flex-col items-center gap-1.5 rounded-2xl pb-1 transition-transform active:scale-95"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-surface-4 text-2xl text-brand">
            +
          </span>
          <span className="text-micro font-medium text-content-low">{t.adicionar}</span>
        </button>
      </div>
    </section>
  )
}
