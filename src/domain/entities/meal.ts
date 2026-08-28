import type { Macros } from '@domain/entities/food'
import type { TipoRefeicao } from '@data/repositories/refeicoesRepository'

/**
 * Modelo da refeição para a tela Dieta ("Meu Plano").
 *
 * Aqui a refeição é vista com seus itens (o card aberto mostra a lista).
 * Isto é diferente do `refeicoes` do banco, que guarda macros somados —
 * na Dieta a gente precisa dos itens individuais, que vêm dos registros
 * de refeição/alimentos. TypeScript puro, reusável por Android e iOS.
 */

export interface ItemRefeicao extends Macros {
  readonly id: string
  readonly nome: string
  /** Texto pronto da quantidade: "80 g", "2 unidades", "120 g". */
  readonly quantidade: string
}

export interface Refeicao {
  /** Identifica a linha de forma única: `tipo` sozinho pros 4 fixos, ou o id real da extra (várias compartilham tipo='extra'). */
  readonly chave: string
  /** null pros 4 tipos fixos; id real em `refeicoes_extra` quando é uma refeição extra. */
  readonly id: string | null
  readonly tipo: TipoRefeicao
  readonly nome: string
  readonly emoji: string
  readonly ordem: number
  readonly itens: readonly ItemRefeicao[]
  readonly concluida: boolean
}

/** Resumo curto do estado fechado: "Aveia + ovo + banana". */
export function resumoRefeicao(itens: readonly ItemRefeicao[]): string {
  if (itens.length === 0) return 'Nada registrado ainda'
  const nomes = itens.map((i) => primeiraPalavra(i.nome))
  if (nomes.length <= 3) return nomes.join(' + ')
  return `${nomes.slice(0, 3).join(' + ')} +${nomes.length - 3}`
}

function primeiraPalavra(nome: string): string {
  const w = nome.trim().split(/\s+/)[0] ?? nome
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
}

/** Soma os macros dos itens — a régua de macros da refeição aberta. */
export function macrosRefeicao(itens: readonly ItemRefeicao[]): Macros {
  return itens.reduce<Macros>(
    (a, i) => ({
      calorias: a.calorias + i.calorias,
      proteina: Math.round((a.proteina + i.proteina) * 10) / 10,
      carboidrato: Math.round((a.carboidrato + i.carboidrato) * 10) / 10,
      gordura: Math.round((a.gordura + i.gordura) * 10) / 10,
    }),
    { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 },
  )
}
