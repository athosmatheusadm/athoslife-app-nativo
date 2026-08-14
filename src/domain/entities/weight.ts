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
 * Para emagrecimento, perder é bom (verde); ganhar é alerta.
 * Retorna a cor semântica da variação conforme o objetivo.
 */
export function corVariacao(
  variacao: number,
  objetivoPerder: boolean,
): 'brand' | 'danger' | 'neutral' {
  if (variacao === 0) return 'neutral'
  const perdeu = variacao < 0
  if (objetivoPerder) return perdeu ? 'brand' : 'danger'
  return perdeu ? 'danger' : 'brand'
}

/**
 * Gera o `d` de um <path> SVG suave a partir dos pesos, no viewBox 320x48
 * (o mesmo do PWA). Normaliza os valores entre min e max com uma margem,
 * para a linha nunca colar no topo/base.
 *
 * Devolve também o último ponto, para o círculo pulsante da ponta.
 */
export function gerarPathPeso(
  registros: readonly RegistroPeso[],
  largura = 320,
  altura = 48,
): { linha: string; area: string; fimX: number; fimY: number } | null {
  if (registros.length < 2) return null

  const pesos = registros.map((r) => r.pesoKg)
  const min = Math.min(...pesos)
  const max = Math.max(...pesos)
  const margem = 6
  const faixa = max - min || 1

  const pontos = registros.map((r, i) => {
    const x = (i / (registros.length - 1)) * largura
    // invertido: peso maior -> y menor (mais alto no gráfico)
    const y =
      margem + (1 - (r.pesoKg - min) / faixa) * (altura - margem * 2)
    return { x, y }
  })

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
  return { linha, area, fimX: fim.x, fimY: fim.y }
}
