/**
 * Story Studio — formato do protótipo do dono (ATHOS_Story_Editor_Unificado_V2):
 * a foto vem primeiro e os elementos (números, Life, gráfico) ficam por cima,
 * cada um com posição, tamanho, opacidade e cor. Musculação e Alimentação;
 * Corrida e Jiu-Jitsu ficam pra depois (o app ainda não registra esses treinos).
 *
 * Posições em fração do quadro 1080×1920 (x, y = centro do elemento). O mesmo
 * estado desenha a prévia e a imagem exportada (ui/screens/story/storyCanvas).
 */

export type ModoStory = 'gym' | 'food'

export type TipoItemStory = 'metric' | 'life' | 'chart' | 'icon' | 'lines'

export interface ItemStory {
  readonly id: string
  readonly tipo: TipoItemStory
  readonly rotulo: string
  readonly valor: string
  readonly unidade: string
  readonly x: number
  readonly y: number
  /** Escala (0,4–1,7). */
  readonly tamanho: number
  readonly opacidade: number
  readonly cor: string
  /** Só o Life: giro de cor em graus. */
  readonly matiz: number
  readonly visivel: boolean
}

export interface EstadoStory {
  readonly itens: readonly ItemStory[]
  /** Volume por bloco (gráfico da musculação), em kg. */
  readonly blocos: readonly number[]
  /** Luz da foto, -100 a 100. */
  readonly luz: number
  /** Sombra suave à esquerda pra ler os números. */
  readonly sombra: boolean
  readonly zoom: number
  readonly panX: number
  readonly panY: number
}

/** Dados que o app manda pro editor. Só os campos presentes viram elemento. */
export interface ValoresStory {
  readonly pr?: string
  readonly evolution?: string
  readonly focus?: string
  readonly volume?: string
  readonly sets?: string
  readonly duration?: string
  readonly blocks?: readonly number[]
  readonly kcal?: string
  readonly protein?: string
  readonly carbs?: string
  readonly fat?: string
}

/** Rótulos e unidades no idioma do app (i18n `story.campos`). */
export interface TextosStory {
  readonly campos: Readonly<Record<string, { readonly rotulo: string; readonly unidade?: string }>>
  readonly life: string
  readonly halter: string
  readonly grafico: string
  readonly linhas: string
}

export const COR_PADRAO = '#ffffff'
export const CORES_STORY = ['#ffffff', '#d3f6a2', '#171d16'] as const

const CAMPOS: Record<ModoStory, readonly string[]> = {
  gym: ['pr', 'evolution', 'focus', 'volume', 'sets', 'duration'],
  food: ['kcal', 'protein', 'carbs', 'fat'],
}

/** O que aparece de cara quando o app abre o editor (máx. 2, como no V2). */
const PREFERIDOS: Record<ModoStory, readonly string[]> = {
  gym: ['pr', 'evolution', 'volume', 'sets', 'focus'],
  food: ['kcal', 'protein', 'carbs'],
}

const base = { tamanho: 1, opacidade: 0.82, cor: COR_PADRAO, matiz: 0, valor: '', unidade: '' }

export function criarEstado(modo: ModoStory, valores: ValoresStory, t: TextosStory): EstadoStory {
  const itens: ItemStory[] = []
  for (const id of CAMPOS[modo]) {
    const valor = valores[id as keyof ValoresStory]
    if (typeof valor !== 'string' || !valor) continue
    const c = t.campos[id]
    itens.push({ ...base, id, tipo: 'metric', rotulo: c?.rotulo ?? id, valor: valor.slice(0, 90), unidade: c?.unidade ?? '', x: 0.38, y: 0.5, visivel: false })
  }
  if (modo === 'gym') {
    itens.push({ ...base, id: 'icon', tipo: 'icon', rotulo: t.halter, x: 0.37, y: 0.62, opacidade: 0.8, visivel: false })
    if (valores.blocks?.length) itens.push({ ...base, id: 'chart', tipo: 'chart', rotulo: t.grafico, x: 0.38, y: 0.85, opacidade: 0.8, visivel: false })
  } else {
    itens.push({ ...base, id: 'lines', tipo: 'lines', rotulo: t.linhas, x: 0.3, y: 0.85, opacidade: 0.8, visivel: false })
  }
  itens.push({ ...base, id: 'life', tipo: 'life', rotulo: t.life, x: 0.8, y: 0.86, tamanho: 0.85, opacidade: 1, visivel: false })

  // Os dois primeiros dados disponíveis aparecem na base, um embaixo do outro.
  let n = 0
  const comPosicao = itens.map((i) => {
    if (n >= 2 || !PREFERIDOS[modo].includes(i.id)) return i
    const pos = { x: 0.35, y: n === 0 ? 0.7 : 0.79 }
    n++
    return { ...i, ...pos, visivel: true }
  })
  return { itens: comPosicao, blocos: valores.blocks?.slice(0, 10) ?? [], luz: 0, sombra: false, zoom: 1, panX: 0, panY: 0 }
}

export type ModeloStory = 'foto' | 'base' | 'coluna' | 'editorial'

/** Modelos do V2: reorganizam os dados principais; a foto e os valores ficam. */
export function aplicarModelo(e: EstadoStory, modo: ModoStory, modelo: ModeloStory): EstadoStory {
  const escondidos = e.itens.map((i) => ({ ...i, visivel: false }))
  if (modelo === 'foto') return { ...e, itens: escondidos }
  const max = modo === 'gym' ? 2 : 3
  const ids = PREFERIDOS[modo].filter((id) => e.itens.some((i) => i.id === id)).slice(0, max)
  const pos =
    modelo === 'editorial' ? [[0.28, 0.7], [0.7, 0.7], [0.28, 0.8]]
      : modelo === 'coluna' ? [[0.3, 0.26], [0.3, 0.37], [0.3, 0.48]]
        : [[0.3, 0.7], [0.3, 0.79], [0.7, 0.79]]
  const tamanho = modo === 'gym' && modelo === 'editorial' ? 0.55 : 0.9
  return {
    ...e,
    itens: escondidos.map((i) => {
      const k = ids.indexOf(i.id)
      if (k < 0) return i
      const [x, y] = pos[k]!
      return { ...i, x: x!, y: y!, tamanho, opacidade: 0.82, visivel: true }
    }),
  }
}

let serial = 100

/** "+ Criar campo personalizado" do V2. */
export function campoPersonalizado(rotulo: string, valor: string): ItemStory {
  return { ...base, id: `custom${++serial}`, tipo: 'metric', rotulo, valor, x: 0.45, y: 0.55, visivel: true }
}

export function mudarItem(e: EstadoStory, id: string, fn: (i: ItemStory) => ItemStory): EstadoStory {
  return { ...e, itens: e.itens.map((i) => (i.id === id ? fn(i) : i)) }
}

export const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
