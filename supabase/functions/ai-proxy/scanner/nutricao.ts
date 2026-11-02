// ATHOSlife — scanner: conta nutricional pura (seção 7 da especificação).
//
// nutriente da porção = nutriente da base × gramas / porção-base.
// null fica null (não medido ≠ zero). Arredonda só na apresentação.
// O app tem a mesma conta em src/domain/rules/scanCalculo.ts — mudar os dois.

import type { BaseNutricional, ItemScan, Nutrientes, Variante } from './tipos.ts'

const KCAL_POR_G_GORDURA = 9
const MULT_VARIANTE: Record<Variante, number> = { sem_oleo: 0, caseiro: 1, bastante_oleo: 2 }

export function nutrientesDaPorcao(base: BaseNutricional, gramas: number, variante: Variante | null): Nutrientes | null {
  if (!Number.isFinite(gramas) || gramas <= 0 || !(base.porcaoG > 0)) return null
  const f = gramas / base.porcaoG
  const escala = (v: number | null) => (v === null ? null : v * f)
  let kcal = escala(base.kcal)
  let gordura = escala(base.gordura)
  // Óleo de preparo: só em quem tem o percentual (o catálogo garante que a
  // base não traz esse óleo — não soma duas vezes).
  if (base.gorduraPreparoPct !== null && variante !== null) {
    const oleo = (gramas * base.gorduraPreparoPct / 100) * MULT_VARIANTE[variante]
    if (gordura !== null) gordura += oleo
    if (kcal !== null) kcal += oleo * KCAL_POR_G_GORDURA
  }
  return { kcal, proteina: escala(base.proteina), carboidrato: escala(base.carboidrato), gordura }
}

/** Soma dos itens incluídos. `parcial` quando algum incluído não tem número. */
export function somarTotais(itens: readonly Pick<ItemScan, 'incluir' | 'nutrientes'>[]): { totais: Nutrientes; parcial: boolean } {
  const t = { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 }
  let parcial = false
  for (const i of itens) {
    if (!i.incluir) continue
    if (!i.nutrientes) { parcial = true; continue }
    for (const k of ['kcal', 'proteina', 'carboidrato', 'gordura'] as const) {
      const v = i.nutrientes[k]
      if (v === null) parcial = true
      else t[k] += v
    }
  }
  return { totais: t, parcial }
}

/**
 * 4×P + 4×C + 9×G contra a kcal da fonte. Só diagnóstico (seção 7): nunca
 * sobrescreve a fonte. Devolve a diferença relativa, ou null se faltar dado.
 */
export function divergenciaAtwater(n: Nutrientes): number | null {
  if (n.kcal === null || n.proteina === null || n.carboidrato === null || n.gordura === null || n.kcal <= 0) return null
  const calc = 4 * n.proteina + 4 * n.carboidrato + 9 * n.gordura
  return Math.abs(calc - n.kcal) / n.kcal
}

/** Apresentação: kcal inteira, macros com 1 casa. */
export function arredondar(n: Nutrientes): Nutrientes {
  const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10)
  return { kcal: n.kcal === null ? null : Math.round(n.kcal), proteina: r1(n.proteina), carboidrato: r1(n.carboidrato), gordura: r1(n.gordura) }
}
