/**
 * Card "Energia e peso" da Home: calorias por dia x peso no mesmo eixo.
 *
 * Funções puras: recebem linhas do banco e devolvem o que o card desenha.
 * Regra herdada do Life: dia sem registro NÃO é zero caloria — fica de fora
 * das médias. A frase só observa; nunca diz quanto comer (o texto sai do
 * i18n a partir de `Comparacao`).
 */

import type { Objetivo } from '@domain/entities/profile'

export interface ItemKcal {
  readonly data: string // YYYY-MM-DD
  readonly calorias: number | string | null
}

export interface PesoDia {
  readonly data: string // YYYY-MM-DD (registros_peso tem 1 por dia)
  readonly pesoKg: number | string
}

export interface DiaKcal {
  readonly data: string
  readonly kcal: number | null // null = sem registro
}

export interface PontoPeso {
  readonly data: string
  readonly peso: number
  readonly indice: number // posição do dia no período (0..n-1)
}

export interface Tendencia {
  readonly kgPorSemana: number
  readonly inicio: number // valor da reta no primeiro dia
  readonly fim: number // valor da reta no último dia
}

export type Comparacao =
  | { readonly tipo: 'semDados' }
  | { readonly tipo: 'faltaPeso' }
  | { readonly tipo: 'faltaRefeicoes' }
  | {
      readonly tipo: 'ok'
      readonly mediaKcal: number
      readonly metaKcal: number | null
      readonly kgPorSemana: number
      readonly direcao: 'caindo' | 'subindo' | 'estavel'
      /** null = sem objetivo no perfil. */
      readonly alinhado: boolean | null
    }

export interface ResumoEnergiaPeso {
  readonly dias: DiaKcal[]
  readonly pesos: PontoPeso[]
  readonly tendencia: Tendencia | null
  readonly diasComRegistro: number
  readonly metaKcal: number | null
  readonly comparacao: Comparacao
}

const num = (v: unknown): number => {
  const x = typeof v === 'string' ? Number(v) : (v as number)
  return Number.isFinite(x) ? x : 0
}

const DIA_MS = 86_400_000
/** Meia-noite UTC da data: conta de dias sem depender do fuso do aparelho. */
const utc = (data: string) => Date.parse(`${data}T00:00:00Z`)

/** Soma dias a uma data YYYY-MM-DD. */
export function somarDias(data: string, dias: number): string {
  return new Date(utc(data) + dias * DIA_MS).toISOString().slice(0, 10)
}

export function diasEntre(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / DIA_MS)
}

/** Reta de mínimos quadrados sobre (dia, peso). Precisa de 2+ pesagens cobrindo 5+ dias. */
export function tendenciaPeso(pesos: readonly PontoPeso[], totalDias: number): Tendencia | null {
  if (pesos.length < 2) return null
  const xs = pesos.map((p) => p.indice)
  if (Math.max(...xs) - Math.min(...xs) < 5) return null
  const mx = xs.reduce((s, x) => s + x, 0) / pesos.length
  const my = pesos.reduce((s, p) => s + p.peso, 0) / pesos.length
  let numerador = 0
  let denominador = 0
  for (const p of pesos) {
    numerador += (p.indice - mx) * (p.peso - my)
    denominador += (p.indice - mx) ** 2
  }
  if (denominador === 0) return null
  const a = numerador / denominador
  const b = my - a * mx
  return { kgPorSemana: a * 7, inicio: b, fim: a * (totalDias - 1) + b }
}

export function montarResumoEnergiaPeso(params: {
  readonly itens: readonly ItemKcal[]
  readonly pesos: readonly PesoDia[]
  readonly periodo: number
  readonly hoje: string
  readonly metaKcal: number | null
  readonly objetivo: Objetivo | null
}): ResumoEnergiaPeso {
  const { itens, periodo, hoje, objetivo } = params
  const inicio = somarDias(hoje, -(periodo - 1))

  const porDia = new Map<string, number>()
  for (const it of itens) {
    if (it.data < inicio || it.data > hoje) continue
    porDia.set(it.data, (porDia.get(it.data) ?? 0) + num(it.calorias))
  }
  const dias: DiaKcal[] = Array.from({ length: periodo }, (_, i) => {
    const data = somarDias(inicio, i)
    const kcal = porDia.get(data)
    return { data, kcal: kcal === undefined ? null : Math.round(kcal) }
  })

  const pesos: PontoPeso[] = params.pesos
    .filter((r) => r.data >= inicio && r.data <= hoje)
    .map((r) => ({ data: r.data, peso: num(r.pesoKg), indice: diasEntre(inicio, r.data) }))
    .filter((p) => p.peso > 0)
    .sort((a, b) => a.indice - b.indice)

  const tendencia = tendenciaPeso(pesos, periodo)
  const registrados = dias.filter((d) => d.kcal !== null)
  // Hoje ainda está em andamento: não entra na média pra não puxá-la pra baixo.
  const paraMedia = registrados.filter((d) => d.data !== hoje)
  const mediaKcal = paraMedia.length
    ? Math.round(paraMedia.reduce((s, d) => s + (d.kcal ?? 0), 0) / paraMedia.length)
    : null
  const metaKcal = params.metaKcal && params.metaKcal > 0 ? params.metaKcal : null

  return {
    dias,
    pesos,
    tendencia,
    diasComRegistro: registrados.length,
    metaKcal,
    comparacao: comparar(objetivo, mediaKcal, metaKcal, tendencia, paraMedia.length, pesos.length),
  }
}

/** Só considera confiável com 4+ dias de refeições e tendência calculada. */
export function comparar(
  objetivo: Objetivo | null,
  mediaKcal: number | null,
  metaKcal: number | null,
  t: Tendencia | null,
  diasMedia: number,
  pesagens: number,
): Comparacao {
  if (pesagens < 2 && diasMedia < 4) return { tipo: 'semDados' }
  if (pesagens < 2 || !t) return { tipo: 'faltaPeso' }
  if (diasMedia < 4 || mediaKcal === null) return { tipo: 'faltaRefeicoes' }

  const direcao = t.kgPorSemana <= -0.1 ? 'caindo' : t.kgPorSemana >= 0.1 ? 'subindo' : 'estavel'
  const alinhado =
    objetivo === 'emagrecer'
      ? t.kgPorSemana <= -0.1
      : objetivo === 'massa'
        ? t.kgPorSemana >= 0.1
        : objetivo === 'manter'
          ? Math.abs(t.kgPorSemana) < 0.15
          : null
  return { tipo: 'ok', mediaKcal, metaKcal, kgPorSemana: t.kgPorSemana, direcao, alinhado }
}

type Ponto = { readonly x: number; readonly y: number }

/**
 * Curva suave que passa por todos os pontos sem "inventar" picos ou vales
 * entre eles (interpolação monótona de Fritsch-Carlson): nunca desce
 * abaixo de zero nem sobe acima do maior valor real.
 */
export function caminhoSuave(pts: readonly Ponto[]): string {
  const n = pts.length
  if (n === 0) return ''
  const x = pts.map((p) => p.x)
  const y = pts.map((p) => p.y)
  const at = (a: readonly number[], i: number) => a[i] ?? 0
  if (n === 1) return `M${at(x, 0)},${at(y, 0)}`
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(at(x, i + 1) - at(x, i))
    m.push((at(y, i + 1) - at(y, i)) / at(dx, i))
  }
  const t = pts.map((_, i) =>
    i === 0
      ? at(m, 0)
      : i === n - 1
        ? at(m, n - 2)
        : at(m, i - 1) * at(m, i) <= 0
          ? 0
          : (at(m, i - 1) + at(m, i)) / 2,
  )
  for (let i = 0; i < n - 1; i++) {
    const mi = at(m, i)
    if (mi === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = at(t, i) / mi
    const b = at(t, i + 1) / mi
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      t[i] = k * a * mi
      t[i + 1] = k * b * mi
    }
  }
  let d = `M${at(x, 0)},${at(y, 0)}`
  for (let i = 0; i < n - 1; i++) {
    const h = at(dx, i) / 3
    d += ` C${at(x, i) + h},${at(y, i) + at(t, i) * h} ${at(x, i + 1) - h},${at(y, i + 1) - at(t, i + 1) * h} ${at(x, i + 1)},${at(y, i + 1)}`
  }
  return d
}

/** Trechos de dias seguidos com registro: [início, fim] em índices. */
export function trechosComRegistro(dias: readonly DiaKcal[]): [number, number][] {
  const r: [number, number][] = []
  let ini = -1
  dias.forEach((d, i) => {
    if (d.kcal !== null && ini < 0) ini = i
    if ((d.kcal === null || i === dias.length - 1) && ini >= 0) {
      r.push([ini, d.kcal === null ? i - 1 : i])
      ini = -1
    }
  })
  return r
}
