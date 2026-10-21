import { MEDIDAS, type ItemStory } from '@domain/entities/story'

/**
 * Desenha o Story em 1080×1920 (JPEG) com os mesmos itens da tela.
 * Devolve o base64 sem o prefixo `data:` — é o que o plugin nativo espera.
 */

const L = 1080
const A = 1920
const FONTE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = falha
    img.src = src
  })
}

function cobrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const escala = Math.max(L / img.naturalWidth, A / img.naturalHeight)
  const w = img.naturalWidth * escala
  const h = img.naturalHeight * escala
  ctx.drawImage(img, (L - w) / 2, (A - h) / 2, w, h)
}

function fundoSemFoto(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, L * 0.6, A)
  g.addColorStop(0, '#262b27')
  g.addColorStop(0.7, '#0b0d0c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L, A)
  const r = ctx.createRadialGradient(L * 0.3, A * 0.8, 0, L * 0.3, A * 0.8, L * 0.9)
  r.addColorStop(0, 'rgba(34,197,94,0.18)')
  r.addColorStop(1, 'rgba(34,197,94,0)')
  ctx.fillStyle = r
  ctx.fillRect(0, 0, L, A)
}

function sombra(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 4
}

export async function exportarStory(params: {
  foto: string | null
  itens: readonly ItemStory[]
  lifeSrc: string
}): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = A
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_indisponivel')

  if (params.foto) cobrir(ctx, await carregar(params.foto))
  else fundoSemFoto(ctx)

  // Mesmo degradê da tela: topo e base um pouco mais escuros pro texto ler.
  const g = ctx.createLinearGradient(0, 0, 0, A)
  g.addColorStop(0, 'rgba(0,0,0,0.35)')
  g.addColorStop(0.16, 'rgba(0,0,0,0)')
  g.addColorStop(0.6, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, L, A)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  for (const i of params.itens) {
    if (!i.on) continue
    const cx = (i.x / 100) * L
    const cy = (i.y / 100) * A
    if (i.tipo === 'life') {
      const img = await carregar(params.lifeSrc)
      const w = MEDIDAS.life * L * i.k
      const h = (w * img.naturalHeight) / img.naturalWidth
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 32
      ctx.shadowOffsetY = 16
      ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
      ctx.restore()
      continue
    }
    const tamRot = MEDIDAS.rotulo * L * i.k
    const tamVal = (i.tipo === 'titulo' ? MEDIDAS.valorTitulo : MEDIDAS.valor) * L * i.k
    ctx.save()
    sombra(ctx)
    ctx.fillStyle = i.cor
    // Rótulo em cima, valor embaixo, o par centrado em (cx, cy).
    const alturaPar = tamRot * 1.3 + tamVal
    const topo = cy - alturaPar / 2
    ctx.globalAlpha = 0.85
    ctx.font = `700 ${tamRot}px ${FONTE}`
    ctx.fillText(i.rotulo.toUpperCase(), cx, topo + tamRot)
    ctx.globalAlpha = 1
    const pesoValor = i.tipo === 'titulo' ? 800 : 900
    if (i.unidade) {
      ctx.font = `${pesoValor} ${tamVal}px ${FONTE}`
      const wv = ctx.measureText(i.valor).width
      ctx.font = `700 ${tamVal * 0.5}px ${FONTE}`
      const wu = ctx.measureText(i.unidade).width + tamVal * 0.12
      const ini = cx - (wv + wu) / 2
      ctx.textAlign = 'left'
      ctx.font = `${pesoValor} ${tamVal}px ${FONTE}`
      ctx.fillText(i.valor, ini, topo + tamRot * 1.3 + tamVal * 0.9)
      ctx.font = `700 ${tamVal * 0.5}px ${FONTE}`
      ctx.fillText(i.unidade, ini + wv + tamVal * 0.12, topo + tamRot * 1.3 + tamVal * 0.9)
      ctx.textAlign = 'center'
    } else {
      ctx.font = `${pesoValor} ${tamVal}px ${FONTE}`
      ctx.fillText(i.valor, cx, topo + tamRot * 1.3 + tamVal * 0.9)
    }
    ctx.restore()
  }

  // Assinatura no canto de baixo, sempre.
  const tamAss = MEDIDAS.assinatura * L
  const m = MEDIDAS.margem * L
  ctx.save()
  sombra(ctx)
  ctx.textAlign = 'left'
  ctx.font = `800 ${tamAss}px ${FONTE}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText('ATHOS', m, A - m)
  const w = ctx.measureText('ATHOS').width
  ctx.fillStyle = '#22c55e'
  ctx.fillText('life', m + w, A - m)
  ctx.restore()

  return canvas.toDataURL('image/jpeg', 0.92).split(',')[1] ?? ''
}
