import { supabase } from '@data/supabase/client'

/** Total de macros consumidos hoje, vindo da view macros_diarios. */
export interface MacrosDoDia {
  readonly kcal: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
}

interface MacrosRow {
  total_kcal: number | null
  total_prot: number | null
  total_carbo: number | null
  total_gord: number | null
}

const ZERO: MacrosDoDia = { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 }

/**
 * Lê a view macros_diarios (soma das refeições do dia).
 * Alimenta os discos de Calorias e Proteínas da Home.
 * Se não houver refeição hoje, a view não retorna linha -> zera.
 */
export const macrosRepository = {
  async doDia(): Promise<MacrosDoDia> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const hoje = new Date().toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('macros_diarios')
      .select('total_kcal, total_prot, total_carbo, total_gord')
      .eq('user_id', userId)
      .eq('data', hoje)
      .maybeSingle<MacrosRow>()

    if (error) throw error
    if (!data) return ZERO
    return {
      kcal: data.total_kcal ?? 0,
      proteina: data.total_prot ?? 0,
      carboidrato: data.total_carbo ?? 0,
      gordura: data.total_gord ?? 0,
    }
  },
}
