import type { Idioma } from '@domain/rules/localidade'
import { localidadeAtual } from '@data/localidadeAtual'
import { ptBR } from './mensagens/pt-BR'
import { en } from './mensagens/en'
import { es } from './mensagens/es'
import { fr } from './mensagens/fr'
import type { Mensagens } from './mensagens/tipo'

export const DICIONARIOS: Record<Idioma, Mensagens> = { 'pt-BR': ptBR, en, es, fr }

/**
 * Nome das refeições que muda de país pra país no mesmo idioma. No México o
 * almoço é "Comida" ("Almuerzo" lá é um café reforçado); o resto da América
 * Latina e a Espanha usam "Almuerzo". Troca só os textos que são exatamente
 * o nome da refeição. No Québec, "déjeuner" é o café da manhã, "dîner" o
 * almoço e "souper" o jantar (na França: petit-déjeuner / déjeuner / dîner).
 */
const TROCAS_POR_PAIS: Partial<Record<Idioma, Record<string, Record<string, string>>>> = {
  es: { MX: { Almuerzo: 'Comida' } },
  fr: {
    CA: {
      'Petit-déjeuner': 'Déjeuner', 'Petit-déj': 'Déjeuner', Déjeuner: 'Dîner', Dîner: 'Souper', Goûter: 'Collation',
    },
  },
}

function trocarTextos<T>(v: T, trocas: Record<string, string>): T {
  if (typeof v === 'string') return (trocas[v] ?? v) as T
  if (Array.isArray(v) || typeof v !== 'object' || v === null) return v
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) out[k] = trocarTextos(x, trocas)
  return out as T
}

const cache = new Map<string, Mensagens>()

/** Dicionário do idioma com os nomes regionais do país, quando há. */
export function dicionario(idioma: Idioma, pais: string | null): Mensagens {
  const trocas = pais ? TROCAS_POR_PAIS[idioma]?.[pais] : undefined
  if (!trocas) return DICIONARIOS[idioma] ?? ptBR
  const chave = `${idioma}-${pais}`
  let d = cache.get(chave)
  if (!d) {
    d = trocarTextos(DICIONARIOS[idioma], trocas)
    cache.set(chave, d)
  }
  return d
}

/** Textos no idioma em uso, pra quem não é React (avisos do sistema, repositórios). */
export function mensagensAtuais(): Mensagens {
  const { idioma, pais } = localidadeAtual()
  return dicionario(idioma, pais)
}
