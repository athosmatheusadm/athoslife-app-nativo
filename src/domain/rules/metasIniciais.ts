import type { Metas, Objetivo, Sexo } from '@domain/entities/profile'

/**
 * Metas diárias iniciais, calculadas no fim do onboarding. São ponto de
 * partida editável (Perfil > Metas), não prescrição — a tela deixa isso claro.
 *
 * Gasto: Mifflin-St Jeor × fator de atividade pela frequência de treino.
 * Sexo não informado usa a média das duas constantes.
 */

export type FrequenciaTreino = '1x' | '2-3x' | '4-5x' | '6x+'

const FATOR_ATIVIDADE: Record<FrequenciaTreino, number> = {
  '1x': 1.3,
  '2-3x': 1.375,
  '4-5x': 1.55,
  '6x+': 1.725,
}

export function calcularMetasIniciais(p: {
  pesoKg: number
  alturaCm: number
  idade: number
  sexo: Sexo | null
  objetivo: Objetivo
  frequencia: FrequenciaTreino | null
}): Metas {
  const constante = p.sexo === 'masculino' ? 5 : p.sexo === 'feminino' ? -161 : -78
  const basal = 10 * p.pesoKg + 6.25 * p.alturaCm - 5 * p.idade + constante
  const gasto = basal * (p.frequencia ? FATOR_ATIVIDADE[p.frequencia] : 1.2)

  const ajuste = p.objetivo === 'emagrecer' ? 0.8 : p.objetivo === 'massa' ? 1.1 : 1
  // Piso: nunca abaixo do metabolismo basal (nada de restrição agressiva).
  const kcal = Math.round(Math.max(gasto * ajuste, basal) / 10) * 10

  const protPorKg = p.objetivo === 'massa' ? 2 : p.objetivo === 'emagrecer' ? 1.8 : 1.6
  const proteina = Math.round(p.pesoKg * protPorKg)
  const gordura = Math.round((kcal * 0.25) / 9)
  const carboidrato = Math.max(Math.round((kcal - proteina * 4 - gordura * 9) / 4), 0)
  const aguaMl = Math.round((p.pesoKg * 35) / 250) * 250

  return { kcal, proteina, carboidrato, gordura, aguaMl, passos: 10000 }
}
