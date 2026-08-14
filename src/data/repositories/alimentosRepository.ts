import { supabase } from '@data/supabase/client'
import type { AlimentoBase, CategoriaAlimento } from '@domain/entities/food'

/** Linha crua da tabela `alimentos`. snake_case morre aqui. */
interface AlimentoRow {
  id: string
  nome: string
  porcao_g: number | null
  calorias: number | null
  proteina: number | null
  carboidrato: number | null
  gordura: number | null
  categoria: string | null
}

function paraDominio(row: AlimentoRow): AlimentoBase {
  return {
    id: row.id,
    nome: row.nome,
    porcaoG: row.porcao_g ?? 100,
    calorias: row.calorias ?? 0,
    proteina: row.proteina ?? 0,
    carboidrato: row.carboidrato ?? 0,
    gordura: row.gordura ?? 0,
    categoria: (row.categoria as CategoriaAlimento | null) ?? null,
  }
}

/**
 * Único ponto que conhece a tabela `alimentos`.
 * Serve tanto a busca manual (usuário digita) quanto a reconciliação do
 * scanner (casar nome da IA com a base).
 */
export const alimentosRepository = {
  /** Busca manual por nome. Usada na tela de busca e no autocomplete. */
  async buscar(termo: string, limite = 20): Promise<AlimentoBase[]> {
    const t = termo.trim()
    if (!t) return []
    const { data, error } = await supabase
      .from('alimentos')
      .select('*')
      .ilike('nome', `%${t}%`)
      .limit(limite)
      .returns<AlimentoRow[]>()
    if (error) throw error
    return (data ?? []).map(paraDominio)
  },

  /**
   * Carrega a base inteira para reconciliar em memória.
   * A tabela é pequena (dezenas de itens) e de leitura pública,
   * então cabe num cache local em vez de uma query por item.
   */
  async carregarTodos(): Promise<AlimentoBase[]> {
    const { data, error } = await supabase
      .from('alimentos')
      .select('*')
      .order('nome')
      .returns<AlimentoRow[]>()
    if (error) throw error
    return (data ?? []).map(paraDominio)
  },
}
