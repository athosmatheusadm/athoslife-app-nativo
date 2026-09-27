/**
 * Domínio de peso.
 *
 * Reaproveita o visual do gráfico do PWA (mesma curva verde, mesmo gradiente),
 * mas o traçado passa a ser gerado a partir dos pesos REAIS do usuário —
 * não é mais um path fixo de mockup.
 */

export interface RegistroPeso {
  readonly pesoKg: number
  readonly data: Date
}

/** Resumo do card "Meu peso": inicial, atual e variação. */
export interface ResumoPeso {
  readonly inicial: number
  readonly atual: number
  readonly variacao: number
  readonly registros: readonly RegistroPeso[]
}

/** Formata peso no padrão BR: 72.3 -> "72,3". */
export function formatarPeso(kg: number): string {
  return kg.toFixed(1).replace('.', ',')
}

/** Variação com sinal: -1.7 -> "-1,7", +0.5 -> "+0,5". */
export function formatarVariacao(kg: number): string {
  const s = kg > 0 ? '+' : kg < 0 ? '-' : ''
  return `${s}${Math.abs(kg).toFixed(1).replace('.', ',')}`
}

/**
 * Cor semântica da variação conforme o objetivo do perfil: emagrecer ->
 * perder é verde; ganhar massa -> ganhar é verde. Manter, ou objetivo
 * ainda não informado, fica neutro — não pinta de vermelho quem ganhou
 * peso de propósito.
 */
export function corVariacao(
  variacao: number,
  objetivo: 'emagrecer' | 'massa' | 'manter' | null,
): 'brand' | 'danger' | 'neutral' {
  if (variacao === 0 || objetivo === null || objetivo === 'manter') return 'neutral'
  const perdeu = variacao < 0
  if (objetivo === 'emagrecer') return perdeu ? 'brand' : 'danger'
  return perdeu ? 'danger' : 'brand'
}

export type PeriodoPeso = '30d' | '90d' | 'tudo'

export const PERIODOS_PESO: ReadonlyArray<{ id: PeriodoPeso; rotulo: string; dias: number | null }> = [
  { id: '30d', rotulo: '30 dias', dias: 30 },
  { id: '90d', rotulo: '90 dias', dias: 90 },
  { id: 'tudo', rotulo: 'Tudo', dias: null },
]

/**
 * Registros dentro do período. Se o período tem menos de 2 pontos mas
 * existe registro antes dele, puxa o último anterior como âncora — senão
 * quem pesa 1× por mês nunca veria linha nenhuma em "30 dias".
 */
export function filtrarPeriodo(
  registros: readonly RegistroPeso[],
  periodo: PeriodoPeso,
  agora: Date = new Date(),
): RegistroPeso[] {
  const dias = PERIODOS_PESO.find((p) => p.id === periodo)?.dias ?? null
  if (dias === null) return [...registros]
  const corte = new Date(agora)
  corte.setHours(0, 0, 0, 0)
  corte.setDate(corte.getDate() - dias)
  const dentro = registros.filter((r) => r.data >= corte)
  if (dentro.length < 2) {
    const antes = registros.filter((r) => r.data < corte)
    const ancora = antes[antes.length - 1]
    if (ancora) return [ancora, ...dentro]
  }
  return dentro
}

/** Inicial/atual/variação de uma lista já ordenada (antigo -> recente). */
export function resumirPesos(registros: readonly RegistroPeso[]): ResumoPeso {
  if (registros.length === 0) return { inicial: 0, atual: 0, variacao: 0, registros: [] }
  const inicial = registros[0]!.pesoKg
  const atual = registros[registros.length - 1]!.pesoKg
  return { inicial, atual, variacao: Math.round((atual - inicial) * 10) / 10, registros }
}

/**
 * Quanto falta pra meta, a partir do peso atual. `null` quando não há meta.
 * `atingida` considera a direção do objetivo (quem quer ganhar massa e
 * passou da meta também atingiu).
 */
export function progressoMeta(
  atual: number,
  meta: number | null,
  objetivo: 'emagrecer' | 'massa' | 'manter' | null,
): { faltaKg: number; atingida: boolean } | null {
  if (meta === null || meta <= 0 || atual <= 0) return null
  const falta = Math.round((meta - atual) * 10) / 10
  const atingida =
    objetivo === 'emagrecer' ? atual <= meta : objetivo === 'massa' ? atual >= meta : Math.abs(falta) <= 0.5
  return { faltaKg: Math.abs(falta), atingida }
}

export interface GraficoPeso {
  readonly linha: string
  readonly area: string
  readonly fimX: number
  readonly fimY: number
  readonly temPonto: boolean
  /** Altura da linha da meta no viewBox, ou null se a meta não foi definida. */
  readonly metaY: number | null
}

/**
 * Traçado SVG suave (viewBox largura x altura) a partir dos pesos.
 *
 * O eixo X é TEMPO REAL, não ordem de registro: 3 pesagens seguidas e depois
 * um mês parado aparecem espremidas à esquerda e com um trecho longo depois —
 * o gráfico conta a história verdadeira. A meta entra na escala, pra linha
 * dela sempre caber no card.
 *
 * Sempre devolve um traçado — sem registro nenhum ou com só um, a linha fica
 * reta (placeholder) e `temPonto` diz se já existe dado real.
 */
export function gerarGraficoPeso(
  registros: readonly RegistroPeso[],
  meta: number | null = null,
  largura = 320,
  altura = 64,
): GraficoPeso {
  const margem = 8
  const valores = registros.map((r) => r.pesoKg)
  if (meta !== null && meta > 0) valores.push(meta)
  const min = valores.length ? Math.min(...valores) : 0
  const max = valores.length ? Math.max(...valores) : 0
  const faixa = max - min || 1
  const yDe = (kg: number) => margem + (1 - (kg - min) / faixa) * (altura - margem * 2)
  const metaY = meta !== null && meta > 0 && registros.length > 0 ? yDe(meta) : null

  if (registros.length < 2) {
    const y = registros.length === 1 ? yDe(registros[0]!.pesoKg) : altura / 2
    const linha = `M0,${y} L${largura},${y}`
    const area = `${linha} L${largura},${altura} L0,${altura}Z`
    return { linha, area, fimX: largura, fimY: y, temPonto: registros.length === 1, metaY }
  }

  const t0 = registros[0]!.data.getTime()
  const t1 = registros[registros.length - 1]!.data.getTime()
  const duracao = t1 - t0 || 1
  const pontos = registros.map((r, i) => ({
    x: t1 === t0 ? (i / (registros.length - 1)) * largura : ((r.data.getTime() - t0) / duracao) * largura,
    y: yDe(r.pesoKg),
  }))

  // Curva suave por Catmull-Rom convertido em Bézier.
  let linha = `M${pontos[0]!.x},${pontos[0]!.y}`
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i === 0 ? 0 : i - 1]!
    const p1 = pontos[i]!
    const p2 = pontos[i + 1]!
    const p3 = pontos[i + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    linha += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  const fim = pontos[pontos.length - 1]!
  const area = `${linha} L${largura},${altura} L0,${altura}Z`
  return { linha, area, fimX: fim.x, fimY: fim.y, temPonto: true, metaY }
}

/** "27/09" — rótulo curto de data pro eixo do gráfico e histórico. */
export function formatarDiaMes(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
