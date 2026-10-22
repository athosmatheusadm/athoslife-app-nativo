import { limitar, type EstadoStory, type ItemStory, type ModoStory } from '@domain/entities/story'

/**
 * Desenho do Story num canvas 1080×1920 — portado do protótipo do dono
 * (ATHOS_Story_Editor_Unificado_V2). A prévia na tela e a imagem exportada
 * saem da mesma função, então o que a pessoa vê é o que vai pro Instagram.
 */

export const W = 1080
export const H = 1920
const FONTE = 'system-ui, -apple-system, Roboto, Arial, sans-serif'

export interface Midia {
  readonly foto: HTMLImageElement | null
  readonly life: HTMLImageElement | null
  readonly rotuloGrafico: string
  readonly idioma: string
}

interface Forma {
  readonly w: number
  readonly h: number
  readonly fonte: number
  readonly linhas: readonly string[]
}

/** Medidas do elemento em tamanho 1 (o V2 mede o texto pra quebrar linha). */
export function forma(c: CanvasRenderingContext2D, o: ItemStory, modo: ModoStory, m: Midia): Forma {
  let w = 350
  let h = 145
  let fonte = 70
  const linhas: string[] = []
  if (o.tipo === 'metric') {
    w = modo === 'gym' || o.id.startsWith('custom') ? 650 : 350
    const texto = o.valor + (o.unidade ? ` ${o.unidade}` : '')
    c.font = `600 ${fonte}px ${FONTE}`
    while (fonte > 39 && c.measureText(texto).width > w) c.font = `600 ${--fonte}px ${FONTE}`
    let linha = ''
    for (const ch of texto) {
      if (c.measureText(linha + ch).width > w && linha) {
        linhas.push(linha)
        linha = ch
      } else linha += ch
    }
    linhas.push(linha)
    h = 50 + linhas.length * (fonte + 8)
  } else if (o.tipo === 'life') {
    h = 320
    w = m.life ? (h * m.life.naturalWidth) / m.life.naturalHeight : 230
  } else if (o.tipo === 'chart') {
    w = 570
    h = 200
  } else if (o.tipo === 'icon') {
    w = 560
    h = 70
  } else if (o.tipo === 'lines') {
    w = 350
    h = 120
  }
  return { w, h, fonte, linhas }
}

export interface Caixa {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export function caixa(c: CanvasRenderingContext2D, o: ItemStory, modo: ModoStory, m: Midia): Caixa {
  const f = forma(c, o, modo, m)
  return { x: o.x * W - (f.w * o.tamanho) / 2, y: o.y * H - (f.h * o.tamanho) / 2, w: f.w * o.tamanho, h: f.h * o.tamanho }
}

/** Mantém o elemento dentro do quadro. */
export function encaixar(c: CanvasRenderingContext2D, o: ItemStory, modo: ModoStory, m: Midia): ItemStory {
  const b = caixa(c, o, modo, m)
  const mx = Math.min(0.49, b.w / (2 * W) + 0.025)
  const my = Math.min(0.49, b.h / (2 * H) + 0.025)
  return { ...o, x: limitar(o.x, mx, 1 - mx), y: limitar(o.y, my, 1 - my) }
}

export interface Canto {
  readonly x: number
  readonly y: number
  readonly sx: 1 | -1
  readonly sy: 1 | -1
}

export function cantos(b: Caixa): Canto[] {
  return [
    { x: b.x, y: b.y, sx: -1, sy: -1 },
    { x: b.x + b.w, y: b.y, sx: 1, sy: -1 },
    { x: b.x, y: b.y + b.h, sx: -1, sy: 1 },
    { x: b.x + b.w, y: b.y + b.h, sx: 1, sy: 1 },
  ]
}

function desenharItem(c: CanvasRenderingContext2D, o: ItemStory, e: EstadoStory, modo: ModoStory, m: Midia) {
  const { w, h, fonte, linhas } = forma(c, o, modo, m)
  c.save()
  c.translate(o.x * W, o.y * H)
  c.scale(o.tamanho, o.tamanho)
  c.globalAlpha = o.opacidade
  c.fillStyle = c.strokeStyle = o.cor
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.lineWidth = 5
  if (o.tipo === 'metric') {
    c.textAlign = 'left'
    c.font = `400 30px ${FONTE}`
    c.globalAlpha = o.opacidade * 0.85
    c.fillText(o.rotulo, -w / 2, -h / 2 + 29)
    c.globalAlpha = o.opacidade
    c.font = `600 ${fonte}px ${FONTE}`
    linhas.forEach((t, i) => c.fillText(t, -w / 2, -h / 2 + 48 + fonte + i * (fonte + 8)))
  } else if (o.tipo === 'life') {
    if (m.life) {
      c.filter = `hue-rotate(${o.matiz}deg)`
      c.drawImage(m.life, -w / 2, -h / 2, w, h)
    }
  } else if (o.tipo === 'lines') {
    c.beginPath()
    for (const [x, y] of [[0, 10], [29, -36], [58, -15]] as const) {
      c.moveTo(x - w / 2, 45)
      c.lineTo(x - w / 2, y)
    }
    c.stroke()
  } else if (o.tipo === 'icon') {
    c.beginPath()
    c.moveTo(-w / 2, 0)
    c.lineTo(-80, 0)
    c.moveTo(80, 0)
    c.lineTo(w / 2, 0)
    c.moveTo(-30, 0)
    c.lineTo(30, 0)
    c.stroke()
    c.strokeRect(-60, -25, 23, 50)
    c.strokeRect(37, -25, 23, 50)
  } else if (o.tipo === 'chart') {
    const bs = e.blocos.length ? e.blocos : [0]
    const max = Math.max(...bs, 1)
    const passo = w / bs.length
    const larg = Math.min(60, passo * 0.62)
    c.textAlign = 'center'
    bs.forEach((n, i) => {
      const bh = (120 * n) / max
      const x = -w / 2 + i * passo + passo / 2
      c.fillRect(x - larg / 2, 30 - bh, larg, bh)
      c.font = `22px ${FONTE}`
      c.fillText(Math.round(n).toLocaleString(m.idioma), x, 62)
    })
    c.font = `18px ${FONTE}`
    c.fillText(m.rotuloGrafico, 0, 95)
  }
  c.restore()
}

/**
 * Desenha o quadro inteiro. `selecionado` + `pxPorPonto` desenham a moldura
 * com os cantos de redimensionar (só na tela, nunca na exportação).
 */
export function desenhar(
  c: CanvasRenderingContext2D,
  e: EstadoStory,
  modo: ModoStory,
  m: Midia,
  selecionado?: { item: ItemStory; pxPorPonto: number; cor: string },
) {
  c.clearRect(0, 0, W, H)
  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#273526')
  g.addColorStop(1, '#0a100c')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)

  const im = m.foto
  if (im?.naturalWidth) {
    const iw = im.naturalWidth
    const ih = im.naturalHeight
    const r = Math.max(W / iw, H / ih) * e.zoom
    const sw = W / r
    const sh = H / r
    const sx = ((iw - sw) / 2) * (1 + e.panX)
    const sy = ((ih - sh) / 2) * (1 + e.panY)
    c.drawImage(im, sx, sy, sw, sh, 0, 0, W, H)
  }
  if (e.luz) {
    c.fillStyle = e.luz > 0 ? `rgba(255,255,255,${(e.luz / 100) * 0.45})` : `rgba(0,0,0,${(-e.luz / 100) * 0.55})`
    c.fillRect(0, 0, W, H)
  }
  if (e.sombra) {
    const s = c.createLinearGradient(0, 0, W, 0)
    s.addColorStop(0, '#0008')
    s.addColorStop(1, '#0000')
    c.fillStyle = s
    c.fillRect(0, 0, W, H)
  }
  for (const o of e.itens) if (o.visivel) desenharItem(c, o, e, modo, m)

  // Assinatura discreta, sempre.
  c.save()
  c.globalAlpha = 0.75
  c.fillStyle = '#fff'
  c.font = `600 27px ${FONTE}`
  c.textAlign = 'right'
  c.fillText('ATHOSlife', 1000, 1815)
  c.restore()

  if (selecionado?.item.visivel) {
    const b = caixa(c, selecionado.item, modo, m)
    const px = selecionado.pxPorPonto
    c.save()
    c.strokeStyle = selecionado.cor
    c.lineWidth = 1.5 * px
    c.strokeRect(b.x, b.y, b.w, b.h)
    for (const k of cantos(b)) {
      c.fillStyle = '#101411'
      c.fillRect(k.x - 5 * px, k.y - 5 * px, 10 * px, 10 * px)
      c.strokeRect(k.x - 5 * px, k.y - 5 * px, 10 * px, 10 * px)
    }
    c.restore()
  }
}

/** JPEG 1080×1920 em base64 (sem o prefixo data:), pronto pro plugin. */
export function exportar(e: EstadoStory, modo: ModoStory, m: Midia): string {
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')
  if (!c) throw new Error('canvas')
  desenhar(c, e, modo, m)
  return cv.toDataURL('image/jpeg', 0.92).split(',')[1] ?? ''
}

export function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const im = new Image()
    im.onload = () => ok(im)
    im.onerror = () => erro(new Error('imagem'))
    im.src = src
  })
}
