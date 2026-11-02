/**
 * Verde menta (01/11): as receitas trazem a própria cor do banco (`cor_tema`),
 * muitas ainda no tom neon antigo. Aqui a saturação é limitada e a luz fica
 * numa faixa média, pra cor da receita conversar com a paleta do app.
 * Valor que não for `#rrggbb` volta como veio.
 */
export function suavizarCor(c: string, satMax = 0.55): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(c)
  if (!m?.[1]) return c
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  let l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  s = Math.min(s, satMax)
  l = Math.min(Math.max(l, 0.45), 0.66)
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const canal = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  return '#' + [canal(h + 1 / 3), canal(h), canal(h - 1 / 3)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}
