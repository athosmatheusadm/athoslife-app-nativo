import { supabase } from '@data/supabase/client'
import type { CategoriaReceita, Receita } from '@domain/entities/receita'
import type { Macros } from '@domain/entities/food'

/** Linha crua de receitas_cozinha. */
interface ReceitaRow {
  id: string
  titulo: string
  subtitulo: string | null
  categoria: string
  macros: { proteina?: number; carboidrato?: number; gordura?: number } | null
  kcal: number | null
  cor_tema: string | null
  premium: boolean | null
  destaque: boolean | null
  conteudo: string | null
  ordem: number | null
}

function macrosDe(row: ReceitaRow): Macros {
  return {
    calorias: row.kcal ?? 0,
    proteina: row.macros?.proteina ?? 0,
    carboidrato: row.macros?.carboidrato ?? 0,
    gordura: row.macros?.gordura ?? 0,
  }
}

/**
 * Converte linha -> domínio. `bloqueada` e `favoritada` são decididos
 * depois, no serviço, porque dependem do perfil e das favoritas.
 */
function paraDominio(row: ReceitaRow): Omit<Receita, 'bloqueada' | 'favoritada'> {
  return {
    id: row.id,
    titulo: row.titulo,
    subtitulo: row.subtitulo,
    categoria: row.categoria as CategoriaReceita,
    macros: macrosDe(row),
    corTema: row.cor_tema ?? '#22c55e',
    premium: row.premium ?? false,
    destaque: row.destaque ?? false,
    conteudo: row.conteudo,
    ordem: row.ordem ?? 0,
  }
}

export type ReceitaCrua = Omit<Receita, 'bloqueada' | 'favoritada'>

/** Único ponto que conhece receitas_cozinha e receitas_favoritas. */
export const receitasRepository = {
  /** Lista todas as receitas, na ordem definida. */
  async listar(): Promise<ReceitaCrua[]> {
    const { data, error } = await supabase
      .from('receitas_cozinha')
      .select('*')
      .order('ordem')
      .returns<ReceitaRow[]>()
    if (error) throw error
    return (data ?? []).map(paraDominio)
  },

  /** IDs das receitas favoritadas pelo usuário atual. */
  async idsFavoritas(): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('receitas_favoritas')
      .select('receita_id')
      .returns<Array<{ receita_id: string }>>()
    if (error) throw error
    return new Set((data ?? []).map((r) => r.receita_id))
  },

  async favoritar(receitaId: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    // ON CONFLICT: favoritar de novo não quebra (UNIQUE user+receita).
    const { error } = await supabase
      .from('receitas_favoritas')
      .upsert({ user_id: userId, receita_id: receitaId }, { onConflict: 'user_id,receita_id' })
    if (error) throw error
  },

  async desfavoritar(receitaId: string): Promise<void> {
    const { error } = await supabase
      .from('receitas_favoritas')
      .delete()
      .eq('receita_id', receitaId)
    if (error) throw error
  },
}
