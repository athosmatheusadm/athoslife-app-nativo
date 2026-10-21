// ATHOSlife — scanner: casa o que o Gemini viu com o catálogo (seção 7).
//
// Ordem: termo canônico exato -> nome/alias exato -> busca aproximada, tudo
// com preparo compatível. Empate ou dúvida vira escolha (até 3 candidatos);
// sem nada compatível fica "não resolvido" — nunca inventa macro.
// Regra dura: "arroz cozido" nunca vira "arroz cru" só porque o nome parece.

import type { AlimentoCatalogo, BaseNutricional, ItemVisual, Preparo, Resolucao } from './tipos.ts'

const PALAVRAS_VAZIAS = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'e', 'a', 'o', 'ao', 'na', 'no', 'em', 'tipo',
  'of', 'with', 'and', 'the', 'con', 'y', 'el', 'la', 'los', 'las'])

const PREPARO_NO_NOME: [RegExp, Exclude<Preparo, 'unknown'>][] = [
  [/\b(cru|crua|crus|cruas|raw|crudo|cruda)\b/, 'raw'],
  [/\b(frit[oa]s?|empanad[oa]s?|milanesa|fried|frit[oa])\b/, 'fried'],
  [/\b(grelhad[oa]s?|na chapa|grilled|a la plancha|asad[oa] a la parrilla)\b/, 'grilled'],
  [/\b(assad[oa]s?|de forno|air fryer|baked|roasted|horneado|asad[oa])\b/, 'baked'],
  [/\b(cozid[oa]s?|no vapor|ao vapor|boiled|steamed|cocid[oa]|hervid[oa])\b/, 'boiled'],
]

export function normalizar(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ — porcao .*$/, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function preparoDoNome(nome: string): Exclude<Preparo, 'unknown'> | null {
  const t = normalizar(nome)
  for (const [re, p] of PREPARO_NO_NOME) if (re.test(t)) return p
  return null
}

/**
 * Cru × cozido é incompatível sempre; grelhado × frito também (muda muito a
 * gordura). Preparo desconhecido de qualquer lado aceita.
 */
export function preparoCompativel(visto: Preparo, catalogo: Exclude<Preparo, 'unknown'> | null): boolean {
  return visto === 'unknown' || catalogo === null || visto === catalogo
}

function tokens(nome: string): string[] {
  return normalizar(nome).split(' ').filter((t) => t && !PALAVRAS_VAZIAS.has(t))
}

/** Parecido 0–1: tokens em comum sobre a união, com peso pro 1º (o "substantivo"). */
export function semelhanca(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b)
  if (!ta.length || !tb.length) return 0
  const sa = new Set(ta), sb = new Set(tb)
  let comum = 0
  for (const t of sa) if (sb.has(t)) comum++
  const uniao = new Set([...sa, ...sb]).size
  const base = comum / uniao
  return ta[0] === tb[0] ? Math.min(1, base + 0.2) : base * 0.6
}

export function paraBase(a: AlimentoCatalogo, idioma: string): BaseNutricional {
  const nome = idioma === 'en' ? a.nomeEn || a.nome : idioma === 'es' ? a.nomeEs || a.nome : a.nome
  return {
    alimentoId: a.id,
    nome,
    porcaoG: a.porcaoG,
    kcal: a.kcal,
    proteina: a.proteina,
    carboidrato: a.carboidrato,
    gordura: a.gordura,
    gorduraPreparoPct: a.gorduraPreparoPct,
    fonte: a.tacoId !== null ? 'taco' : 'base',
  }
}

export interface Catalogo {
  lista: AlimentoCatalogo[]
  porNome: Map<string, AlimentoCatalogo[]>
  porId: Map<string, AlimentoCatalogo>
}

/**
 * `lista`/`porNome`: só o que o scanner reconhece (sem variação de porção,
 * suplemento ou prato montado). `porId`: tudo — a pessoa pode escolher
 * qualquer alimento da base na revisão.
 */
export function montarCatalogo(linhas: readonly AlimentoCatalogo[]): Catalogo {
  const porNome = new Map<string, AlimentoCatalogo[]>()
  const porId = new Map<string, AlimentoCatalogo>()
  const lista: AlimentoCatalogo[] = []
  for (const a of linhas) {
    porId.set(a.id, a)
    if (!a.scanner || a.representacao === 'componentes') continue
    lista.push(a)
    for (const n of [a.nome, a.nomeEn, a.nomeEs, ...a.aliases]) {
      if (!n) continue
      const k = normalizar(n)
      const l = porNome.get(k)
      if (l) l.push(a)
      else porNome.set(k, [a])
    }
  }
  return { lista, porNome, porId }
}

/** Entre homônimos (ex.: "Abacate" em 2 categorias), prefere TACO e preparo igual. */
function melhorDe(lista: readonly AlimentoCatalogo[], preparo: Preparo): AlimentoCatalogo | null {
  const ok = lista.filter((a) => preparoCompativel(preparo, a.preparo))
  if (!ok.length) return null
  return [...ok].sort((x, y) =>
    Number(y.preparo === preparo) - Number(x.preparo === preparo) || Number(y.tacoId !== null) - Number(x.tacoId !== null))[0]
}

export interface ItemResolvido {
  resolucao: Resolucao
  alimento: AlimentoCatalogo | null
  candidatos: AlimentoCatalogo[]
}

const LIMIAR_CANDIDATO = 0.45
const LIMIAR_CASAR = 0.7
const MARGEM = 0.15

export function resolverItem(item: ItemVisual, cat: Catalogo): ItemResolvido {
  const prep = item.preparation
  // 1. Termo canônico da lista que mandamos ao modelo.
  if (item.canonicalHint) {
    const a = melhorDe(cat.porNome.get(normalizar(item.canonicalHint)) ?? [], prep)
    if (a) return { resolucao: 'matched', alimento: a, candidatos: [] }
  }
  // 2. Nome (ou alias) exato.
  const exato = melhorDe(cat.porNome.get(normalizar(item.name)) ?? [], prep)
  if (exato) return { resolucao: 'matched', alimento: exato, candidatos: [] }

  // 3. Aproximado, só com preparo compatível (e preparo do nome do catálogo
  //    quando a coluna ainda está vazia).
  const pontos: { a: AlimentoCatalogo; s: number }[] = []
  for (const a of cat.lista) {
    if (!preparoCompativel(prep, a.preparo ?? preparoDoNome(a.nome))) continue
    const s = Math.max(semelhanca(item.name, a.nome), item.canonicalHint ? semelhanca(item.canonicalHint, a.nome) : 0)
    if (s >= LIMIAR_CANDIDATO) pontos.push({ a, s })
  }
  pontos.sort((x, y) => y.s - x.s || Number(y.a.tacoId !== null) - Number(x.a.tacoId !== null))
  const unicos: typeof pontos = []
  for (const p of pontos) {
    if (!unicos.some((u) => normalizar(u.a.nome) === normalizar(p.a.nome))) unicos.push(p)
    if (unicos.length === 3) break
  }
  const [p1, p2] = unicos
  if (p1 && p1.s >= LIMIAR_CASAR && (!p2 || p1.s - p2.s >= MARGEM)) {
    return { resolucao: 'matched', alimento: p1.a, candidatos: [] }
  }
  if (unicos.length) return { resolucao: 'needs_choice', alimento: null, candidatos: unicos.map((u) => u.a) }
  return { resolucao: 'unresolved', alimento: null, candidatos: [] }
}

// Ordem de prioridade quando a lista precisa ser cortada: o que mais aparece
// num prato vem antes (TACO primeiro dentro de cada grupo).
const PRIORIDADE_CATEGORIA = ['carboidrato', 'leguminosa', 'proteina', 'vegetal', 'fruta', 'refeicao', 'laticinios', 'bebida', 'doce', 'gordura', 'gordura_boa', 'castanhas', 'outro']

/**
 * Lista de nomes que vai no prompt (seção 5.2): só nomes, sem nutriente.
 * Cada ~100 nomes custam ~600 tokens por foto — e entram no teto diário de
 * tokens da IA. Alimento fora da lista ainda casa pelo nome (passos 2 e 3).
 */
export function vocabularioCanonico(cat: Catalogo, max = 600): string[] {
  const peso = (a: AlimentoCatalogo) => {
    const i = PRIORIDADE_CATEGORIA.indexOf(a.categoria ?? 'outro')
    return (a.tacoId !== null ? 0 : 100) + (i === -1 ? PRIORIDADE_CATEGORIA.length : i)
  }
  const nomes = new Set<string>()
  for (const a of [...cat.lista].sort((x, y) => peso(x) - peso(y) || x.nome.localeCompare(y.nome))) {
    nomes.add(a.nome)
    if (nomes.size >= max) break
  }
  return [...nomes]
}
