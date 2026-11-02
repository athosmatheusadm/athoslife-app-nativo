import { localidadeAtual } from '@data/localidadeAtual'
import type { Idioma, Unidades } from '@domain/rules/localidade'
import { cmParaPesPolegadas, kgParaLb, mlParaOz } from '@domain/rules/unidades'

/**
 * Formatação de números e medidas no idioma/unidades do usuário.
 * O valor chega sempre métrico (como está no banco).
 */

export function numero(idioma: Idioma, n: number, casas = 0): string {
  return new Intl.NumberFormat(idioma, { maximumFractionDigits: casas, minimumFractionDigits: 0 }).format(n)
}

export function peso(idioma: Idioma, unidades: Unidades, kg: number): string {
  return unidades === 'imperial' ? `${numero(idioma, kgParaLb(kg))} lb` : `${numero(idioma, kg, 1)} kg`
}

export function altura(idioma: Idioma, unidades: Unidades, cm: number): string {
  if (unidades === 'imperial') {
    const { pes, polegadas } = cmParaPesPolegadas(cm)
    return `${pes}′${polegadas}″`
  }
  return `${numero(idioma, cm / 100, 2)} m`
}

export function volume(idioma: Idioma, unidades: Unidades, ml: number): string {
  if (unidades === 'imperial') return `${numero(idioma, mlParaOz(ml))} fl oz`
  return ml >= 1000 ? `${numero(idioma, ml / 1000, 2)} L` : `${numero(idioma, ml)} ml`
}

/**
 * Dia e mês curtos no costume do país: "27/09" no Brasil, "9/27" nos EUA.
 * `iso` = "AAAA-MM-DD" (dia local). Idioma + país viram a tag (en + US = en-US).
 */
export function diaMes(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const { idioma, pais } = localidadeAtual()
  const base = idioma.split('-')[0]
  const tag = pais ? `${base}-${pais}` : idioma
  const data = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  try {
    return new Intl.DateTimeFormat(tag, { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(data)
  } catch {
    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  }
}
