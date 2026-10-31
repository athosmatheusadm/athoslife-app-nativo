/**
 * Localidade do usuário: idioma, país, fuso e sistema de unidades.
 *
 * TypeScript puro — recebe o que o aparelho informa (navigator.languages,
 * Intl) como parâmetro, pra poder ser testado e reusado fora do navegador.
 * O banco guarda o mesmo quarteto em profiles (idioma/pais/fuso/unidades,
 * ver db/athoslife_globalizacao_onboarding_migration.sql).
 */

export const IDIOMAS = ['pt-BR', 'en', 'es', 'fr', 'hi'] as const
export type Idioma = (typeof IDIOMAS)[number]

export type Unidades = 'metrico' | 'imperial'

export interface Localidade {
  readonly idioma: Idioma
  /** ISO 3166-1 alfa-2 (BR, US, PT...). null quando o aparelho não diz. */
  readonly pais: string | null
  /** Nome IANA (America/Sao_Paulo, Europe/Lisbon...). */
  readonly fuso: string
  readonly unidades: Unidades
}

/**
 * Países do seletor em Perfil > Idioma e região (nome sai do Intl no idioma
 * da pessoa). Os que têm telefone de apoio próprio na ai-proxy vêm primeiro
 * na lista do código; a tela ordena por nome.
 */
export const PAISES = [
  'BR', 'PT', 'US', 'CA', 'GB', 'IE', 'AU', 'NZ', 'ES', 'MX', 'AR', 'CO', 'CL',
  'PE', 'UY', 'PY', 'BO', 'EC', 'VE', 'CR', 'PA', 'GT', 'DO', 'PR', 'AO', 'MZ',
  'ZA', 'IN', 'DE', 'FR', 'IT', 'NL', 'CH', 'JP', 'BE', 'LU', 'MA', 'SN', 'CI', 'NP',
] as const

/** Países que usam libra/pé/onça no dia a dia. */
const PAISES_IMPERIAIS = new Set(['US', 'LR', 'MM'])

export const NOMES_IDIOMA: Record<Idioma, string> = {
  'pt-BR': 'Português',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  hi: 'हिन्दी',
}

/** "pt-PT", "pt" -> pt-BR; "en-GB" -> en; "es-MX" -> es; "fr-CA" -> fr; resto -> en. */
export function idiomaSuportado(tag: string | null | undefined): Idioma | null {
  if (!tag) return null
  const base = tag.toLowerCase().split(/[-_]/)[0]
  if (base === 'pt') return 'pt-BR'
  if (base === 'en') return 'en'
  if (base === 'es') return 'es'
  if (base === 'fr') return 'fr'
  if (base === 'hi') return 'hi'
  return null
}

export function escolherIdioma(preferidos: readonly string[]): Idioma {
  for (const tag of preferidos) {
    const i = idiomaSuportado(tag)
    if (i) return i
  }
  return 'en'
}

/** País pela região da tag de idioma ("pt-BR" -> BR). */
export function paisDaTag(preferidos: readonly string[]): string | null {
  for (const tag of preferidos) {
    const regiao = tag.split(/[-_]/)[1]
    if (regiao && /^[A-Za-z]{2}$/.test(regiao)) return regiao.toUpperCase()
  }
  return null
}

export function unidadesDoPais(pais: string | null): Unidades {
  return pais && PAISES_IMPERIAIS.has(pais) ? 'imperial' : 'metrico'
}

/** Localidade inicial a partir do aparelho — o usuário pode trocar depois. */
export function localidadeDoAparelho(preferidos: readonly string[], fuso: string | undefined): Localidade {
  const pais = paisDaTag(preferidos)
  return {
    idioma: escolherIdioma(preferidos),
    pais,
    fuso: fuso || 'America/Sao_Paulo',
    unidades: unidadesDoPais(pais),
  }
}

export function normalizarIdioma(v: string | null | undefined): Idioma {
  return (IDIOMAS as readonly string[]).includes(v ?? '') ? (v as Idioma) : 'pt-BR'
}
