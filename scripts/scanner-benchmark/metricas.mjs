// Métricas do benchmark do scanner (seção 12 da especificação v1.1).
// Puro: recebe referência pesada + o que o scanner devolveu, devolve números.

const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
const VAZIAS = new Set(['de', 'do', 'da', 'com', 'e', 'a', 'o', 'ao', 'na', 'no', 'em'])
const tokens = (s) => norm(s).split(' ').filter((t) => t && !VAZIAS.has(t))

/** Mesmo componente? Primeira palavra igual (o "substantivo": arroz, feijão, frango...). */
export function mesmoComponente(ref, previsto) {
  const a = tokens(ref), b = tokens(previsto)
  return a.length > 0 && b.length > 0 && a[0] === b[0]
}

export function mediana(xs) {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

export function percentil(xs, p) {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!v.length) return null
  return v[Math.min(v.length - 1, Math.ceil((p / 100) * v.length) - 1)]
}

/**
 * refeicoes: [{ id, categoria, itensRef: [{nome, gramas, kcal, proteina, carboidrato, gordura}],
 *              previsto: null | { itens: [{nome, gramas, kcal, proteina, carboidrato, gordura}], ms } }]
 * previsto null = sem resultado (falha/recusa) — entra no relatório, nunca é excluído.
 */
export function calcular(refeicoes) {
  let vp = 0, fn = 0, fp = 0
  const errosMassa = [], errosRel = [], absKcal = [], latencias = []
  const mae = { proteina: [], carboidrato: [], gordura: [] }
  let somaAbs = 0, somaRef = 0, graves = 0, semResultado = 0
  const porCategoria = {}

  for (const r of refeicoes) {
    const kRef = r.itensRef.reduce((s, i) => s + i.kcal, 0)
    const cat = (porCategoria[r.categoria] ??= { n: 0, errosRel: [], semResultado: 0 })
    cat.n++
    if (!r.previsto) {
      semResultado++
      cat.semResultado++
      fn += r.itensRef.length
      continue
    }
    latencias.push(r.previsto.ms)
    const usados = new Set()
    for (const ref of r.itensRef) {
      const j = r.previsto.itens.findIndex((p, k) => !usados.has(k) && mesmoComponente(ref.nome, p.nome))
      if (j === -1) { fn++; continue }
      usados.add(j)
      vp++
      const p = r.previsto.itens[j]
      if (ref.gramas > 0 && Number.isFinite(p.gramas)) errosMassa.push(Math.abs(p.gramas - ref.gramas) / ref.gramas)
    }
    fp += r.previsto.itens.length - usados.size
    const kPrev = r.previsto.itens.reduce((s, i) => s + (i.kcal ?? 0), 0)
    const abs = Math.abs(kPrev - kRef)
    absKcal.push(abs)
    somaAbs += abs
    somaRef += kRef
    if (kRef > 0) {
      const rel = abs / kRef
      errosRel.push(rel)
      cat.errosRel.push(rel)
      if (rel > 0.5) graves++
    }
    for (const k of ['proteina', 'carboidrato', 'gordura']) {
      const ref = r.itensRef.reduce((s, i) => s + (i[k] ?? 0), 0)
      const prev = r.previsto.itens.reduce((s, i) => s + (i[k] ?? 0), 0)
      mae[k].push(Math.abs(prev - ref))
    }
  }

  const n = refeicoes.length
  const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  return {
    refeicoes: n,
    semResultado,
    recallComponentes: vp + fn ? vp / (vp + fn) : null,
    inventados: vp + fp ? fp / (vp + fp) : null,
    erroMassaMediano: mediana(errosMassa),
    erroKcalMediano: mediana(errosRel),
    erroKcalAbsMediano: mediana(absKcal),
    wape: somaRef ? somaAbs / somaRef : null,
    errosGraves: n - semResultado ? graves / (n - semResultado) : null,
    maeMacros: { proteina: media(mae.proteina), carboidrato: media(mae.carboidrato), gordura: media(mae.gordura) },
    latenciaP50: percentil(latencias, 50),
    latenciaP95: percentil(latencias, 95),
    porCategoria: Object.fromEntries(Object.entries(porCategoria).map(([c, v]) => [c, { n: v.n, semResultado: v.semResultado, erroKcalMediano: mediana(v.errosRel) }])),
  }
}

/** Portas de qualidade (seção 12.2) que dá pra checar com estas métricas. */
export function portas(m) {
  const ok = (v, cond) => v !== null && cond(v)
  return {
    G1: {
      recall: ok(m.recallComponentes, (v) => v >= 0.9),
      inventados: ok(m.inventados, (v) => v <= 0.05),
      erroKcal: ok(m.erroKcalMediano, (v) => v <= 0.25),
    },
    G2: {
      erroKcal: ok(m.erroKcalMediano, (v) => v <= 0.2),
      graves: ok(m.errosGraves, (v) => v <= 0.1),
      p95: ok(m.latenciaP95, (v) => v <= 8000),
    },
  }
}
