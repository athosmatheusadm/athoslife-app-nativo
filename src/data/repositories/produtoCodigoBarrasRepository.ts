import type { Macros } from '@domain/entities/food'

/**
 * Produto pelo código de barras, via Open Food Facts (base pública e
 * gratuita, boa cobertura de produtos brasileiros; aceita chamada direto do
 * app). Nada de IA aqui — os números são os do rótulo cadastrado.
 */

export interface ProdutoRotulo {
  readonly codigo: string
  readonly nome: string
  readonly marca: string | null
  /** Macros por 100 g/ml (rótulo). */
  readonly por100: Macros
  /** Porção do rótulo em g/ml, quando informada. */
  readonly porcaoG: number | null
  readonly imagemUrl: string | null
}

interface RespostaOFF {
  status: number
  product?: {
    product_name?: string
    product_name_pt?: string
    brands?: string
    serving_quantity?: number | string
    image_front_small_url?: string
    nutriments?: Record<string, number | string | undefined>
  }
}

const CAMPOS = 'product_name,product_name_pt,brands,serving_quantity,nutriments,image_front_small_url'

function numero(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export const produtoCodigoBarrasRepository = {
  /** null = produto não cadastrado (ou sem tabela nutricional). */
  async buscar(codigo: string): Promise<ProdutoRotulo | null> {
    const limpo = codigo.replace(/\D/g, '')
    if (limpo.length < 8) return null
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${limpo}.json?fields=${CAMPOS}`,
    )
    if (res.status === 404) return null
    if (!res.ok) throw new Error('off_indisponivel')
    const d = (await res.json()) as RespostaOFF
    const p = d.product
    if (d.status !== 1 || !p) return null

    const n = p.nutriments ?? {}
    const kcal = numero(n['energy-kcal_100g'] ?? (numero(n['energy_100g']) / 4.184 || 0))
    const por100: Macros = {
      calorias: Math.round(kcal),
      proteina: Math.round(numero(n['proteins_100g']) * 10) / 10,
      carboidrato: Math.round(numero(n['carbohydrates_100g']) * 10) / 10,
      gordura: Math.round(numero(n['fat_100g']) * 10) / 10,
    }
    const semTabela = por100.calorias === 0 && por100.proteina === 0 && por100.carboidrato === 0 && por100.gordura === 0
    if (semTabela) return null

    const porcao = numero(p.serving_quantity)
    return {
      codigo: limpo,
      nome: (p.product_name_pt || p.product_name || 'Produto').trim(),
      marca: p.brands?.split(',')[0]?.trim() || null,
      por100,
      porcaoG: porcao > 0 ? Math.round(porcao) : null,
      imagemUrl: p.image_front_small_url ?? null,
    }
  },
}
