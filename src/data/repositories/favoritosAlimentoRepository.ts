import { supabase } from '@data/supabase/client'
import type { AlimentoBase, CategoriaAlimento } from '@domain/entities/food'

interface FavoritoRow {
  alimento_id: string
  alimentos: {
    id: string
    nome: string
    porcao_g: number | null
    calorias: number | null
    proteina: number | null
    carboidrato: number | null
    gordura: number | null
    categoria: string | null
  } | null
}

function paraDominio(row: FavoritoRow['alimentos']): AlimentoBase | null {
  if (!row) return null
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
 * Alimentos que o usuário marcou com a estrela pra não precisar pesquisar
 * de novo toda vez ("Alimentos salvos" no menu da refeição).
 */
export const favoritosAlimentoRepository = {
  async listar(): Promise<AlimentoBase[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data, error } = await supabase
      .from('alimentos_favoritos')
      .select('alimento_id, alimentos(*)')
      .eq('user_id', userId)
      .order('criado_em', { ascending: false })
      .returns<FavoritoRow[]>()

    if (error) throw error
    return (data ?? []).map((r) => paraDominio(r.alimentos)).filter((a): a is AlimentoBase => a !== null)
  },

  async estaFavoritado(alimentoId: string): Promise<boolean> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return false

    const { data, error } = await supabase
      .from('alimentos_favoritos')
      .select('alimento_id')
      .eq('user_id', userId)
      .eq('alimento_id', alimentoId)
      .maybeSingle()

    if (error) throw error
    return data !== null
  },

  async favoritar(alimentoId: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase
      .from('alimentos_favoritos')
      .upsert({ user_id: userId, alimento_id: alimentoId })
    if (error) throw error
  },

  async desfavoritar(alimentoId: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase
      .from('alimentos_favoritos')
      .delete()
      .eq('user_id', userId)
      .eq('alimento_id', alimentoId)
    if (error) throw error
  },
}
