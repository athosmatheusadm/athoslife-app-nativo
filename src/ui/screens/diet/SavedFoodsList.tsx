import { useEffect, useState } from 'react'
import { favoritosAlimentoRepository } from '@data/repositories/favoritosAlimentoRepository'
import { PorcaoInline } from './InlineFoodSearch'
import type { AlimentoBase } from '@domain/entities/food'
import type { ItemRefeicao } from '@domain/entities/meal'
import { useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'

/**
 * "Alimentos salvos" — os alimentos que o usuário favoritou com a ⭐ em
 * PorcaoInline. Mesmo fluxo de escolher→ajustar porção→confirmar da busca
 * normal, só que a lista já vem pronta (sem digitar nada).
 */
export function SavedFoodsList(props: {
  onAdicionar: (item: ItemRefeicao) => void
  onFechar: () => void
}) {
  const [lista, setLista] = useState<AlimentoBase[] | null>(null)
  const [erro, setErro] = useState(false)
  const [escolhido, setEscolhido] = useState<AlimentoBase | null>(null)
  const { m } = useI18n()
  const t = m.dieta.salvos
  useFecharNoVoltar(escolhido !== null, () => setEscolhido(null))

  useEffect(() => {
    let ativo = true
    favoritosAlimentoRepository
      .listar()
      .then((v) => ativo && setLista(v))
      .catch(() => ativo && setErro(true))
    return () => {
      ativo = false
    }
  }, [])

  if (escolhido) {
    return (
      <PorcaoInline
        alimento={escolhido}
        onVoltar={() => setEscolhido(null)}
        onConfirmar={(item) => {
          props.onAdicionar(item)
          setEscolhido(null)
        }}
      />
    )
  }

  return (
    <div className="mt-3 border-t border-surface-3 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-content-hi">{t.titulo}</span>
        <button onClick={props.onFechar} aria-label={m.dieta.sheet.fechar} className="-mr-2 flex h-11 w-11 items-center justify-center text-content-low active:text-content-hi">✕</button>
      </div>

      {erro && <p className="py-2 text-micro text-accent-danger">{t.erro}</p>}

      {!erro && !lista && <p className="py-2 text-micro text-content-low">{t.carregando}</p>}

      {!erro && lista && lista.length === 0 && (
        <p className="py-3 text-center text-micro text-content-low">{t.vazio}</p>
      )}

      <ul className="max-h-52 overflow-y-auto">
        {lista?.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => setEscolhido(a)}
              className="flex min-h-14 w-full items-center justify-between gap-3 border-t border-surface-3 py-2 text-left transition-colors first:border-t-0 active:bg-content-hi/5"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-content-hi">{a.nome}</span>
                <span className="block text-micro text-content-low">{m.dieta.busca.referencia(a.porcaoG)}</span>
              </span>
              <span className="flex-none text-right">
                <span className="block text-sm font-bold text-brand">{a.calorias} kcal</span>
                <span className="block text-micro text-macro-proteina">{m.dieta.busca.prot(a.proteina)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
