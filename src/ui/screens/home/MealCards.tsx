import { ActivityIcon } from '@ui/components/ActivityIcon'
import { itensRefeicaoRepository, type RefeicaoExtra } from '@data/repositories/itensRefeicaoRepository'
import { useEffect, useState } from 'react'
import { refeicoesRepository, type TipoRefeicao } from '@data/repositories/refeicoesRepository'
import { useI18n } from '@/i18n/I18nProvider'


const ORDEM = ['cafe', 'almoco', 'lanche', 'jantar'] as const

export function MealCards(props: {
  onAbrir: (tipo: TipoRefeicao) => void
  /** "+" — cria uma refeição extra nova (Colação, Ceia, Pós-treino...) e leva pra Dieta já nela. */
  onCriarNovaRefeicao: () => void
  onAbrirExtra: (id: string) => void
  /** "Ver todas" — abre a Dieta (antes era um texto que parecia botão e não fazia nada). */
  onVerTodas: () => void
}) {
  const { m } = useI18n()
  const t = m.home.refeicoes
  const [kcalPorTipo, setKcalPorTipo] = useState<Map<TipoRefeicao, number>>(new Map())

  const [extras, setExtras] = useState<RefeicaoExtra[]>([])
  const [kcalExtras, setKcalExtras] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    let ativo = true
    void refeicoesRepository
      .doDia()
      .then((resumo) => {
        if (!ativo) return
        setKcalPorTipo(new Map(resumo.map((r) => [r.tipo, r.kcal])))
      })
      .catch(() => {})
    void Promise.all([itensRefeicaoRepository.listarExtras(new Date()), itensRefeicaoRepository.doDia(new Date())])
      .then(([lista, itens]) => {
        if (!ativo) return
        setExtras(lista)
        setKcalExtras(new Map([...itens.extras].map(([id, alimentos]) => [id, alimentos.reduce((soma, i) => soma + i.calorias, 0)])))
      }).catch(() => {})
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
                <ActivityIcon icone={tipo} className="h-20 w-20" />
              </span>
              <span className="text-micro font-medium text-content-hi">{m.dieta.refeicoes[tipo]}</span>
              <span className={`text-micro font-semibold tabular-nums ${kcal ? 'text-brand' : 'text-content-low'}`}>
                {kcal ? `${kcal} kcal` : t.registrar}
              </span>
            </button>
          )
        })}

        {extras.map((extra) => <button key={extra.id} type="button" onClick={() => props.onAbrirExtra(extra.id)}
          className="flex w-[84px] flex-none flex-col items-center gap-1.5 rounded-2xl pb-1 transition-transform active:scale-95">
          <ActivityIcon icone={extra.icone ?? 'tigela'} className="h-20 w-20" />
          <span className="w-full truncate text-micro font-medium text-content-hi">{extra.nome}</span>
          <span className="text-micro font-semibold tabular-nums text-brand">{kcalExtras.get(extra.id) ? `${kcalExtras.get(extra.id)} kcal` : t.registrar}</span>
        </button>)}

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
