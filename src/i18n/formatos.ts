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
  return ml >= 1000 ? `${numero(idioma, ml / 1000, 1)} L` : `${numero(idioma, ml)} ml`
}
