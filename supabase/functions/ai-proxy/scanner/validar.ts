// ATHOSlife — scanner: valida a resposta do Gemini (schema v2).
//
// Saída estruturada organiza o formato, não garante o conteúdo. Aqui:
// campo desconhecido vira o valor neutro, número inválido vira null (nunca
// zero), excesso de itens é cortado e marcado, e sem âncora de escala a
// porção é sempre "fraca", diga o modelo o que disser (seção 5.1).

import { MAX_ITENS } from './tipos.ts'
import type { Ancora, Evidencia, ItemVisual, Preparo, RespostaVisual, SinalGordura, Unidade } from './tipos.ts'

const PREPAROS: readonly Preparo[] = ['raw', 'boiled', 'grilled', 'fried', 'baked', 'unknown']
const EVIDENCIAS: readonly Evidencia[] = ['visible', 'user_provided', 'assumed']
const ANCORAS: readonly Ancora[] = ['plate', 'cutlery', 'glass', 'hand', 'package', 'other']
const SINAIS: readonly SinalGordura[] = ['none', 'some', 'high', 'unknown']
const UNIDADES: readonly Unidade[] = ['g', 'ml', 'unit']
const QTD_MAX: Record<Unidade, number> = { g: 3000, ml: 3000, unit: 30 }

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {})
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const strOuNull = (v: unknown, max: number): string | null => str(v, max) || null
const umDe = <T extends string>(v: unknown, lista: readonly T[], padrao: T): T =>
  (lista as readonly string[]).includes(v as string) ? v as T : padrao

function qtd(v: unknown, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 && n <= max ? n : null
}

export type ErroValidacao = 'INVALID_MODEL_OUTPUT'

export function validarVisao(cru: unknown): RespostaVisual | ErroValidacao {
  const r = obj(cru)
  if (!Array.isArray(r.items) && r.status !== 'no_food' && r.status !== 'recapture') return 'INVALID_MODEL_OUTPUT'

  const status = umDe(r.status, ['ok', 'recapture', 'no_food'] as const, 'ok')
  const ancoras = [...new Set((Array.isArray(r.portionAnchors) ? r.portionAnchors : [])
    .filter((a): a is Ancora => (ANCORAS as readonly unknown[]).includes(a)))]
  const avisos = (Array.isArray(r.imageIssues) ? r.imageIssues : []).map((x) => str(x, 80)).filter(Boolean).slice(0, 5)

  const brutos = Array.isArray(r.items) ? r.items : []
  const vistos = new Set<string>()
  const items: ItemVisual[] = []
  for (const [i, bruto] of brutos.entries()) {
    if (items.length >= MAX_ITENS) {
      avisos.push('too_many_items')
      break
    }
    const it = obj(bruto)
    const name = str(it.name, 80)
    if (!name) continue
    let localId = str(it.localId, 20) || `i${i + 1}`
    if (vistos.has(localId)) localId = `${localId}_${i + 1}`
    vistos.add(localId)

    const a = obj(it.amount)
    const unit = umDe(a.unit, UNIDADES, 'g')
    const value = qtd(a.value, QTD_MAX[unit])
    let lower = qtd(a.lower, QTD_MAX[unit])
    let upper = qtd(a.upper, QTD_MAX[unit])
    if (lower !== null && upper !== null && lower > upper) [lower, upper] = [upper, lower]

    items.push({
      localId,
      name,
      preparation: umDe(it.preparation, PREPAROS, 'unknown'),
      representation: it.representation === 'composite_dish' ? 'composite_dish' : 'single_food',
      alternatives: (Array.isArray(it.alternatives) ? it.alternatives : [])
        .map((x) => str(x, 80)).filter((x) => x && x !== name).slice(0, 2),
      amount: { value, unit, lower, upper, evidence: umDe(a.evidence, EVIDENCIAS, 'assumed') },
      // Sem âncora de escala na foto, a porção é fraca (backend manda, não o modelo).
      portionEvidence: ancoras.length === 0 ? 'weak' : it.portionEvidence === 'usable' ? 'usable' : 'weak',
      uncertaintyReasons: (Array.isArray(it.uncertaintyReasons) ? it.uncertaintyReasons : [])
        .map((x) => str(x, 60)).filter(Boolean).slice(0, 4),
      canonicalHint: strOuNull(it.canonicalHint, 120),
      householdMeasure: strOuNull(it.householdMeasure, 60),
      visibleFatSignal: umDe(it.visibleFatSignal, SINAIS, 'unknown'),
    })
  }

  // "ok" sem nenhum item aproveitável não é refeição: pede outra foto.
  const statusFinal = status === 'ok' && items.length === 0 ? 'recapture' : status
  return {
    schemaVersion: '2',
    status: statusFinal,
    mealTitle: str(r.mealTitle, 120),
    portionAnchors: ancoras,
    items: statusFinal === 'ok' ? items : [],
    imageIssues: avisos,
  }
}
