/**
 * Época de festa → expositor de receitas temáticas na Cozinha (ideia do
 * dono, 24/10). A receita é marcada no banco (`receitas_cozinha.temas`);
 * aqui fica só QUANDO cada tema aparece.
 *
 *   natal         1 a 25 de dezembro
 *   ano_novo      26 de dezembro a 6 de janeiro
 *   pascoa        3 semanas antes até o domingo de Páscoa (data móvel)
 *   festa_junina  junho e começo de julho — só no Brasil
 */
export type TemaSazonal = 'natal' | 'ano_novo' | 'pascoa' | 'festa_junina'

/** Domingo de Páscoa do ano (algoritmo de Meeus/Jones/Butcher, calendário gregoriano). */
export function domingoDePascoa(ano: number): Date {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

export function temaDoMomento(agora: Date = new Date(), pais: string | null = 'BR'): TemaSazonal | null {
  const mes = agora.getMonth() + 1
  const dia = agora.getDate()
  if (mes === 12 && dia <= 25) return 'natal'
  if ((mes === 12 && dia >= 26) || (mes === 1 && dia <= 6)) return 'ano_novo'

  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const pascoa = domingoDePascoa(agora.getFullYear())
  const inicio = new Date(pascoa)
  inicio.setDate(pascoa.getDate() - 21)
  if (hoje >= inicio && hoje <= pascoa) return 'pascoa'

  if ((pais ?? 'BR') === 'BR' && (mes === 6 || (mes === 7 && dia <= 15))) return 'festa_junina'
  return null
}
