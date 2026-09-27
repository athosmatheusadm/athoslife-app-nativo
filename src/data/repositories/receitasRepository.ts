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
  tempo_preparo_min: number | null
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
    tempoPreparoMin: row.tempo_preparo_min ?? null,
    corTema: row.cor_tema ?? '#22c55e',
    premium: row.premium ?? false,
    destaque: row.destaque ?? false,
    conteudo: row.conteudo,
    ordem: row.ordem ?? 0,
  }
}

/** Tudo menos `conteudo` — a coluna não tem GRANT de SELECT direto. */
const COLUNAS_VITRINE =
  'id, titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, ordem'

export type ReceitaCrua = Omit<Receita, 'bloqueada' | 'favoritada'>

/** Único ponto que conhece receitas_cozinha e receitas_favoritas. */
export const receitasRepository = {
  /**
   * Lista todas as receitas, na ordem definida. A vitrine (nome, kcal,
   * macros…) vem pra todos; `conteudo` não pode ser lido direto da tabela —
   * só chega pela RPC, que entrega apenas o que o plano da pessoa libera
   * (db/athoslife_limites_gratis_servidor_migration.sql).
   */
  async listar(): Promise<ReceitaCrua[]> {
    const [vitrine, liberadas] = await Promise.all([
      supabase
        .from('receitas_cozinha')
        .select(COLUNAS_VITRINE)
        .order('ordem')
        .returns<Omit<ReceitaRow, 'conteudo'>[]>(),
      supabase.rpc('receitas_conteudo_liberado'),
    ])
    if (vitrine.error) throw vitrine.error
    if (liberadas.error) throw liberadas.error
    const linhas = (liberadas.data ?? []) as Array<{ id: string; conteudo: string | null }>
    const conteudoPorId = new Map(linhas.map((r) => [r.id, r.conteudo]))
    return (vitrine.data ?? []).map((row) =>
      paraDominio({ ...row, conteudo: conteudoPorId.get(row.id) ?? null }),
    )
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
