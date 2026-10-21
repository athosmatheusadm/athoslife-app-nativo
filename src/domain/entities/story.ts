/**
 * Story Studio — o que vai por cima da foto num Story 1080×1920.
 * Posições em % da tela (x, y = centro do elemento), tamanho relativo `k`.
 * A mesma lista desenha a tela (StoryScreen) e a imagem exportada
 * (exportarStory), por isso nada aqui depende de pixel.
 */

export type ModoStory = 'food' | 'gym'

export interface MetricaStory {
  readonly id: string
  readonly rotulo: string
  readonly valor: string
  readonly unidade?: string
  /** Aparece de cara; as outras ficam em "Dados". */
  readonly ligada: boolean
}

/** O que a tela de origem (Dieta ou fim do treino) manda pro editor. */
export interface EntradaStory {
  readonly modo: ModoStory
  readonly titulo: { readonly rotulo: string; readonly valor: string }
  readonly metricas: readonly MetricaStory[]
}

export interface ItemStory {
  readonly id: string
  readonly tipo: 'titulo' | 'metrica' | 'life'
  readonly rotulo: string
  readonly valor: string
  readonly unidade?: string
  readonly x: number
  readonly y: number
  readonly on: boolean
  /** Escala (0,6–2). */
  readonly k: number
  readonly cor: string
}

export type ModeloStory = 'base' | 'topo' | 'lado' | 'foto'

export const CORES_STORY = ['#ffffff', '#86efac', '#fbbf24', '#111412'] as const

/** Faixas cobertas pelos botões do Instagram (em % da altura). */
export const FAIXA_TOPO = 13
export const FAIXA_BASE = 82

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Posição das métricas ligadas num modelo: duas colunas, de cima pra baixo. */
function posicao(modelo: Exclude<ModeloStory, 'foto'>, n: number): { x: number; y: number } {
  if (modelo === 'lado') return { x: 26, y: 34 + n * 10 }
  const y0 = modelo === 'topo' ? 26 : 60
  return { x: n % 2 ? 70 : 30, y: y0 + Math.floor(n / 2) * 9 }
}

export function itensIniciais(e: EntradaStory, rotuloLife: string): ItemStory[] {
  const base = { k: 1, cor: CORES_STORY[0] }
  const ligadas = e.metricas.filter((m) => m.ligada).map((m) => m.id)
  const itens: ItemStory[] = [
    { ...base, id: 'titulo', tipo: 'titulo', rotulo: e.titulo.rotulo, valor: e.titulo.valor, x: 50, y: 21, on: true },
    ...e.metricas.map((m): ItemStory => {
      const i = ligadas.indexOf(m.id)
      const p = posicao('base', i >= 0 ? i : ligadas.length)
      return { ...base, id: m.id, tipo: 'metrica', rotulo: m.rotulo, valor: m.valor, ...(m.unidade ? { unidade: m.unidade } : {}), ...p, on: m.ligada }
    }),
    { ...base, id: 'life', tipo: 'life', rotulo: rotuloLife, valor: '', x: 78, y: 42, on: e.modo === 'gym' },
  ]
  return itens
}

/** Reorganiza sem mudar valores nem foto. "foto" esconde tudo (fica a assinatura). */
export function aplicarModelo(itens: readonly ItemStory[], modelo: ModeloStory): ItemStory[] {
  if (modelo === 'foto') return itens.map((i) => ({ ...i, on: false }))
  let n = 0
  return itens.map((i) => {
    if (i.tipo === 'titulo') return { ...i, on: true, x: modelo === 'lado' ? 30 : 50, y: modelo === 'topo' ? 72 : 21 }
    if (i.tipo === 'life' || !i.on) return i
    return { ...i, ...posicao(modelo, n++) }
  })
}

export function mover(i: ItemStory, x: number, y: number): ItemStory {
  return { ...i, x: limitar(x, 8, 92), y: limitar(y, 6, 94) }
}

export function escalar(i: ItemStory, passo: number): ItemStory {
  return { ...i, k: Math.round(limitar(i.k + passo, 0.6, 2) * 100) / 100 }
}

export const naFaixaDoInstagram = (i: ItemStory) => i.y < FAIXA_TOPO || i.y > FAIXA_BASE

/**
 * Tamanhos em fração da LARGURA do Story — a tela e o canvas 1080 usam os
 * mesmos números (na tela, `cqw`; no canvas, × 1080).
 */
export const MEDIDAS = {
  rotulo: 0.026,
  valor: 0.068,
  valorTitulo: 0.045,
  life: 0.24,
  assinatura: 0.032,
  margem: 0.042,
} as const
