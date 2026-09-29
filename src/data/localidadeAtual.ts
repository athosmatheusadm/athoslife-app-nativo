import type { Idioma } from '@domain/rules/localidade'

/**
 * Idioma/país em uso, pra camada de dados (repositórios não são React e não
 * leem contexto). Quem mantém atualizado é o I18nProvider.
 */
let atual: { idioma: Idioma; pais: string | null } = { idioma: 'pt-BR', pais: 'BR' }

export function definirLocalidadeAtual(idioma: Idioma, pais: string | null): void {
  atual = { idioma, pais }
}

export function localidadeAtual(): { idioma: Idioma; pais: string | null } {
  return atual
}
