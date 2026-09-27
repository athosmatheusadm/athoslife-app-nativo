import { useEffect, useState } from 'react'
import { favoritosAlimentoRepository } from '@data/repositories/favoritosAlimentoRepository'
import { PorcaoInline } from './InlineFoodSearch'
import type { AlimentoBase } from '@domain/entities/food'
import type { ItemRefeicao } from '@domain/entities/meal'

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
  const [erro, setErro] = useState<string | null>(null)
  const [escolhido, setEscolhido] = useState<AlimentoBase | null>(null)

  useEffect(() => {
    let ativo = true
    favoritosAlimentoRepository
      .listar()
      .then((v) => ativo && setLista(v))
      .catch(() => ativo && setErro('Não deu pra carregar os alimentos salvos agora.'))
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
        <span className="text-sm font-semibold text-content-hi">Alimentos salvos</span>
        <button onClick={props.onFechar} aria-label="Fechar" className="text-content-dim">✕</button>
      </div>

      {erro && <p className="py-2 text-micro text-accent-danger">{erro}</p>}

      {!erro && !lista && <p className="py-2 text-micro text-content-dim">Carregando…</p>}

      {!erro && lista && lista.length === 0 && (
        <p className="py-3 text-center text-micro text-content-low">
          Nenhum alimento salvo ainda. Toque na ⭐ ao adicionar um alimento pra guardá-lo aqui.
        </p>
      )}

      <ul className="max-h-52 overflow-y-auto">
        {lista?.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => setEscolhido(a)}
              className="flex w-full items-center justify-between gap-3 border-t border-surface-3 py-2.5 text-left first:border-t-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm text-content-hi">{a.nome}</span>
                <span className="block text-micro text-content-low">{a.porcaoG}g de referência</span>
              </span>
              <span className="flex-none text-right">
                <span className="block text-sm font-bold text-brand">{a.calorias} kcal</span>
                <span className="block text-micro text-content-dim">{a.proteina}g prot</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
