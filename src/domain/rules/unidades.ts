/**
 * Conversão de unidades. O banco guarda SEMPRE métrico (kg, cm, ml) — a
 * conversão acontece só na hora de mostrar e de ler o que a pessoa digitou.
 */

const KG_POR_LB = 0.45359237
const CM_POR_POL = 2.54
const ML_POR_OZ = 29.5735295625

export function kgParaLb(kg: number): number {
  return kg / KG_POR_LB
}

export function lbParaKg(lb: number): number {
  return lb * KG_POR_LB
}

export function cmParaPesPolegadas(cm: number): { pes: number; polegadas: number } {
  const totalPol = Math.round(cm / CM_POR_POL)
  return { pes: Math.floor(totalPol / 12), polegadas: totalPol % 12 }
}

export function pesPolegadasParaCm(pes: number, polegadas: number): number {
  return Math.round((pes * 12 + polegadas) * CM_POR_POL)
}

export function mlParaOz(ml: number): number {
  return ml / ML_POR_OZ
}

export function ozParaMl(oz: number): number {
  return oz * ML_POR_OZ
}

/** Aceita "70,5" e "70.5". Devolve null se não for número positivo. */
export function lerNumero(texto: string): number | null {
  const n = Number(texto.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}
