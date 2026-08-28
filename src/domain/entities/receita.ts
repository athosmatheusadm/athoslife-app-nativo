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
  'vegano',
  'habitos',
  'shakes',
  'chas',
] as const

export type CategoriaReceita = (typeof CATEGORIAS_RECEITA)[number]

/** Rótulo, cor e emoji de cada categoria — a cor já vem do backend, isto é o fallback. */
export const CATEGORIA_META: Record<
  CategoriaReceita,
  { rotulo: string; cor: string; emoji: string }
> = {
  emagrecimento: { rotulo: 'Emagrecimento', cor: '#22c55e', emoji: '🥗' },
  massa: { rotulo: 'Ganho de massa', cor: '#3b82f6', emoji: '🍗' },
  vegano: { rotulo: 'Vegano', cor: '#84cc16', emoji: '🌱' },
  habitos: { rotulo: 'Hábitos', cor: '#f97316', emoji: '🍫' },
  shakes: { rotulo: 'Shakes', cor: '#06b6d4', emoji: '🥤' },
  chas: { rotulo: 'Chás', cor: '#10b981', emoji: '🍵' },
}

/** Uma receita curada do mini e-book. */
export interface Receita {
  readonly id: string
  readonly titulo: string
  readonly subtitulo: string | null
  readonly categoria: CategoriaReceita
  readonly macros: Macros
  readonly tempoPreparoMin: number | null
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

/** Um bloco do `conteudo` já separado em rótulo (se houver) + texto. */
export interface BlocoConteudo {
  readonly rotulo: string | null
  readonly texto: string
}

/**
 * Quebra `receita.conteudo` em blocos pra renderizar. O texto real (seed)
 * não segue um formato rígido por seção — varia "PREPARO" vs "MODO DE
 * PREPARO", "DICA DO LIFE" vs "UM PAPO DO LIFE" — então em vez de procurar
 * por palavras-chave específicas, cada parágrafo (separado por linha em
 * branco) tem sua primeira linha checada: se ela tem ":" logo no começo
 * (rótulo curto, tipo "PREPARO:" ou "DICA DO LIFE:"), tudo antes vira
 * `rotulo` e o resto vira `texto`. Funciona com qualquer rótulo, sem lista
 * fixa de palavras.
 */
export function formatarConteudo(conteudo: string): readonly BlocoConteudo[] {
  return conteudo
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((bloco): BlocoConteudo => {
      const linhas = bloco.split('\n')
      const primeiraLinha = linhas[0] ?? ''
      const idxDoisPontos = primeiraLinha.indexOf(':')
      if (idxDoisPontos === -1 || idxDoisPontos > 40) {
        return { rotulo: null, texto: bloco }
      }
      const rotulo = primeiraLinha.slice(0, idxDoisPontos).trim()
      const restoPrimeiraLinha = primeiraLinha.slice(idxDoisPontos + 1)
      const texto = [restoPrimeiraLinha, ...linhas.slice(1)].join('\n').trim()
      return { rotulo, texto }
    })
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
