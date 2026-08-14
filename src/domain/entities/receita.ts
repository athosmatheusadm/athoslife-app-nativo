/**
 * Entidades da Cozinha ATHOSlife.
 *
 * Duas naturezas de receita convivem aqui:
 *  - Receita curada (mini e-book), vinda da tabela `receitas_cozinha`.
 *  - Receita gerada pelo Life a partir do que a pessoa tem na dieta.
 *
 * TypeScript puro. Reutilizável por Android e iOS.
 */

import type { Macros } from '@domain/entities/food'

/**
 * Categorias existentes no backend. Não são só "tipos de comida":
 * ansiedade e vicios amarram a cozinha ao apoio emocional do produto.
 */
export const CATEGORIAS_RECEITA = [
  'emagrecimento',
  'massa',
  'ansiedade',
  'vicios',
  'shakes',
  'chas',
] as const

export type CategoriaReceita = (typeof CATEGORIAS_RECEITA)[number]

/** Rótulo e cor de cada categoria — a cor já vem do backend, isto é o fallback. */
export const CATEGORIA_META: Record<
  CategoriaReceita,
  { rotulo: string; cor: string }
> = {
  emagrecimento: { rotulo: 'Emagrecimento', cor: '#22c55e' },
  massa: { rotulo: 'Ganho de massa', cor: '#3b82f6' },
  ansiedade: { rotulo: 'Ansiedade', cor: '#8b5cf6' },
  vicios: { rotulo: 'Vícios', cor: '#f97316' },
  shakes: { rotulo: 'Shakes', cor: '#06b6d4' },
  chas: { rotulo: 'Chás', cor: '#10b981' },
}

/** Uma receita curada do mini e-book. */
export interface Receita {
  readonly id: string
  readonly titulo: string
  readonly subtitulo: string | null
  readonly categoria: CategoriaReceita
  readonly macros: Macros
  readonly corTema: string
  readonly premium: boolean
  readonly destaque: boolean
  readonly conteudo: string | null
  readonly ordem: number
  /** Calculado no serviço: premium && usuário não tem acesso. */
  readonly bloqueada: boolean
  /** Calculado no serviço: está nas favoritas do usuário. */
  readonly favoritada: boolean
}

/**
 * Receita gerada pelo Life a partir da dieta do usuário.
 * Não vem do banco — é criada na hora pela IA. Pode ser salva/favoritada.
 */
export interface ReceitaGerada {
  readonly titulo: string
  readonly subtitulo: string
  readonly ingredientes: readonly string[]
  readonly modoPreparo: readonly string[]
  readonly macros: Macros
  readonly rendimento: string
  readonly tempoMin: number
  /** A voz do Life: por que essa receita faz sentido pra você agora. */
  readonly dicaLife: string
  /** Restrições que a IA respeitou, para a UI confirmar. */
  readonly respeitaRestricoes: readonly string[]
}

/**
 * Contexto que o Life recebe para montar a receita.
 * É o "o que ela tem na dieta" + as regras dela.
 */
export interface ContextoReceita {
  /** Ingredientes que a pessoa disse ter em casa. */
  readonly ingredientesDisponiveis: readonly string[]
  readonly restricoes: readonly string[]
  readonly objetivo: string | null
  /** Macros que ainda faltam para bater a meta do dia. */
  readonly macrosRestantes: Macros
  readonly categoriaDesejada: CategoriaReceita | null
}
