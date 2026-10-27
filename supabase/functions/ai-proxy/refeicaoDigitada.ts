// ATHOSlife — refeição digitada no chat (v4.5): "almocei arroz, feijão e um
// bife" vira registro. O Gemini só separa os alimentos e as quantidades (pela
// ferramenta registrar_alimentos); quem acha cada um na base, calcula gramas
// e macros é este arquivo, sem IA. Nada é gravado aqui: o app mostra um
// cartão pra pessoa conferir e só grava quando ela toca em Registrar.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type Sb = SupabaseClient
export type Idioma = 'pt-BR' | 'en' | 'es'

/** O que o modelo entendeu de cada alimento. */
export interface ItemPedido {
  nome: string
  quantidade: number | null
  unidade: string | null
}

/** Alimento achado na base, pronto pro cartão de conferência do app. */
export interface ItemAchado {
  alimentoId: string
  nome: string
  gramas: number
  /** Macros da base valem para `porcaoG` gramas (como a tabela alimentos). */
  porcaoG: number
  calorias: number
  proteina: number
  carboidrato: number
  gordura: number
  /** Gramas de 1 unidade (ovo, pão, fruta), quando a base sabe. */
  unidadeG: number | null
}

export const MAX_ITENS = 12
const MAX_GRAMAS = 5000

/** Medidas caseiras -> gramas (médias; a pessoa ajusta no cartão). */
const MEDIDAS: Record<string, number> = {
  g: 1, grama: 1, gramas: 1, gram: 1, grams: 1, gramo: 1, gramos: 1,
  ml: 1, kg: 1000, quilo: 1000, l: 1000, litro: 1000, liter: 1000,
  colher: 15, 'colher de sopa': 15, 'colheres de sopa': 15, colheres: 15, tablespoon: 15, tbsp: 15, cucharada: 15, cucharadas: 15,
  'colher de cha': 5, teaspoon: 5, tsp: 5, cucharadita: 5,
  'colher de servir': 45, escumadeira: 80,
  concha: 120, ladle: 120, cucharon: 120,
  fatia: 25, fatias: 25, slice: 25, slices: 25, rebanada: 25, rebanadas: 25,
  xicara: 160, xicaras: 160, cup: 160, cups: 160, taza: 160, tazas: 160,
  copo: 200, copos: 200, glass: 200, vaso: 200, vasos: 200,
  prato: 300, plate: 300, plato: 300,
  oz: 28, onca: 28, onza: 28, lb: 454, libra: 454,
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** Valida o que veio do modelo (nunca confia: é dado, não instrução). */
export function lerItens(v: unknown): ItemPedido[] {
  if (!Array.isArray(v)) return []
  const out: ItemPedido[] = []
  for (const x of v.slice(0, MAX_ITENS)) {
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const nome = typeof o.nome === 'string' ? o.nome.trim().slice(0, 60) : ''
    if (!nome) continue
    const q = Number(o.quantidade)
    out.push({
      nome,
      quantidade: Number.isFinite(q) && q > 0 ? q : null,
      unidade: typeof o.unidade === 'string' && o.unidade.trim() ? normalizar(o.unidade).slice(0, 30) : null,
    })
  }
  return out
}

/**
 * Gramas do item: medida dita pela pessoa > unidades × peso de 1 unidade >
 * porção típica > porção da base. Sempre entre 1 g e 5 kg.
 */
export function gramasDoItem(
  item: ItemPedido,
  base: { porcaoG: number; unidadeG: number | null },
): number {
  const q = item.quantidade
  const u = item.unidade
  // "colher de sopa cheia" -> "colher de sopa": a medida mais longa que encaixa.
  const medida = u
    ? Object.keys(MEDIDAS).filter((k) => u === k || u.startsWith(`${k} `)).sort((a, b) => b.length - a.length)[0]
    : undefined
  const umaUnidade = base.unidadeG ?? base.porcaoG
  let g: number
  if (medida) g = (q ?? 1) * MEDIDAS[medida]
  else if (q !== null) g = q * umaUnidade // "2 ovos", "1 pedaço"
  else g = umaUnidade
  return Math.min(MAX_GRAMAS, Math.max(1, Math.round(g)))
}

/** Acha cada alimento na base (mesma busca da Dieta, já com o básico primeiro). */
export async function acharNaBase(
  sb: Sb,
  itens: ItemPedido[],
  idioma: Idioma,
  pais: string | null,
): Promise<{ achados: ItemAchado[]; faltando: string[] }> {
  const achados: ItemAchado[] = []
  const faltando: string[] = []
  const buscas = await Promise.all(
    itens.map((i) => sb.rpc('buscar_alimentos', { p_termo: i.nome, p_idioma: idioma, p_pais: pais, p_limite: 1 })),
  )
  const ids = buscas.map((b) => (b.data as { id: string }[] | null)?.[0]?.id).filter((x): x is string => !!x)
  const { data: extras } = ids.length
    ? await sb.from('alimentos').select('id, porcao_tipica_g').in('id', ids)
    : { data: [] }
  const tipica = new Map(((extras ?? []) as { id: string; porcao_tipica_g: number | null }[]).map((e) => [e.id, e.porcao_tipica_g]))

  itens.forEach((item, i) => {
    const row = (buscas[i].data as {
      id: string; nome: string; porcao_g: number | null; calorias: number | null
      proteina: number | null; carboidrato: number | null; gordura: number | null
    }[] | null)?.[0]
    if (!row) {
      faltando.push(item.nome)
      return
    }
    const porcaoG = Math.max(1, Number(row.porcao_g ?? 100))
    const t = tipica.get(row.id)
    const unidadeG = t == null ? null : Number(t)
    achados.push({
      alimentoId: row.id,
      nome: row.nome,
      gramas: gramasDoItem(item, { porcaoG, unidadeG }),
      porcaoG,
      calorias: Number(row.calorias ?? 0),
      proteina: Number(row.proteina ?? 0),
      carboidrato: Number(row.carboidrato ?? 0),
      gordura: Number(row.gordura ?? 0),
      unidadeG,
    })
  })
  return { achados, faltando }
}

/** Refeição mais provável pela hora local (igual a refeicaoPeloHorario do app). */
export function refeicaoPelaHora(h: number): 'cafe' | 'almoco' | 'lanche' | 'jantar' {
  if (h < 5) return 'jantar'
  if (h < 10) return 'cafe'
  if (h < 15) return 'almoco'
  if (h < 18) return 'lanche'
  return 'jantar'
}

export const TXT_REGISTRO: Record<Idioma, {
  confira: (onde: string) => string
  faltando: (nomes: string) => string
  nada: string
  restricao: (itens: string, r: string) => string
}> = {
  'pt-BR': {
    confira: (onde) => `Achei isso para ${onde}. Confere as quantidades e toca em Registrar.`,
    faltando: (nomes) => `Não achei ${nomes} na base; dá pra buscar na Dieta (lá eu também estimo).`,
    nada: 'Não achei esses alimentos na base. Tenta com outro nome, ou busca na Dieta (lá eu também estimo).',
    restricao: (itens, r) => `Atenção: ${itens} pode ter ${r}, que está nas suas restrições.`,
  },
  en: {
    confira: (onde) => `Here's what I found for ${onde}. Check the amounts and tap Log.`,
    faltando: (nomes) => `I couldn't find ${nomes}; you can search it in Diet (I can estimate it there).`,
    nada: "I couldn't find these foods. Try another name, or search in Diet (I can estimate it there).",
    restricao: (itens, r) => `Heads up: ${itens} may contain ${r}, which is in your restrictions.`,
  },
  es: {
    confira: (onde) => `Esto encontré para ${onde}. Revisa las cantidades y toca Registrar.`,
    faltando: (nomes) => `No encontré ${nomes}; puedes buscarlo en Dieta (ahí también lo estimo).`,
    nada: 'No encontré esos alimentos. Prueba con otro nombre o búscalo en Dieta (ahí también lo estimo).',
    restricao: (itens, r) => `Ojo: ${itens} puede tener ${r}, que está en tus restricciones.`,
  },
}
