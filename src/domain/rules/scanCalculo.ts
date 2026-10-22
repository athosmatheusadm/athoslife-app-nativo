import type { BaseScan, ItemRascunho, VarianteOleo } from '@domain/entities/food'

/**
 * Scanner v1.1 — recálculo local (corrigir gramas, trocar o alimento ou o
 * preparo não chama IA nem servidor). É a MESMA conta de
 * supabase/functions/ai-proxy/scanner/nutricao.ts — mudar os dois juntos.
 * O servidor refaz a conta ao confirmar; o que fica no diário é o dele.
 */
const MULT: Record<VarianteOleo, number> = { sem_oleo: 0, caseiro: 1, bastante_oleo: 2 }

export function macrosDaBase(base: BaseScan, gramas: number, variante: VarianteOleo | null) {
  const f = base.porcaoG > 0 && gramas > 0 ? gramas / base.porcaoG : 0
  const oleo = base.gorduraPreparoPct !== null && variante !== null ? (gramas * base.gorduraPreparoPct / 100) * MULT[variante] : 0
  return {
    calorias: Math.round((base.kcal ?? 0) * f + oleo * 9),
    proteina: Math.round((base.proteina ?? 0) * f * 10) / 10,
    carboidrato: Math.round((base.carboidrato ?? 0) * f * 10) / 10,
    gordura: Math.round(((base.gordura ?? 0) * f + oleo) * 10) / 10,
  }
}

/** Aplica gramas/alimento/preparo novos num item do scanner v1.1. */
export function atualizarItemScan(
  item: ItemRascunho,
  mudanca: { gramas?: number; base?: BaseScan; variante?: VarianteOleo | null },
): ItemRascunho {
  if (!item.scan) return item
  const base = mudanca.base ?? item.scan.base
  // Alimento escolhido agora e a foto não deu gramas: começa na porção da base.
  const gramas = Math.max(0, Math.round(mudanca.gramas ?? (item.quantidadeG > 0 ? item.quantidadeG : base?.porcaoG ?? 0)))
  const variante = base?.gorduraPreparoPct == null ? null : mudanca.variante !== undefined ? mudanca.variante : item.scan.variante ?? 'caseiro'
  const scan = { ...item.scan, base, variante, semNumeros: !base || gramas <= 0 }
  if (!base) return { ...item, quantidadeG: gramas, scan }
  return { ...item, nome: base.nome, quantidadeG: gramas, alimentoBaseId: base.alimentoId, fonte: 'base', scan, ...macrosDaBase(base, gramas, variante) }
}
