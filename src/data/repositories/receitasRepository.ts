import { supabase } from '@data/supabase/client'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import type { CategoriaReceita, Receita } from '@domain/entities/receita'
import type { TemaSazonal } from '@domain/rules/temasSazonais'
import type { Macros } from '@domain/entities/food'
import { localidadeAtual } from '@data/localidadeAtual'
import { texto, traducoesDe } from '@data/traducoesConteudo'

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
  alergenos?: string[] | null
  temas?: string[] | null
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
function paraDominio(row: ReceitaRow, trad: Record<string, unknown> = {}): ReceitaCrua {
  return {
    id: row.id,
    titulo: texto(trad, 'titulo', row.titulo),
    subtitulo: texto(trad, 'subtitulo', row.subtitulo),
    categoria: row.categoria as CategoriaReceita,
    macros: macrosDe(row),
    tempoPreparoMin: row.tempo_preparo_min ?? null,
    corTema: row.cor_tema ?? '#22c55e',
    premium: row.premium ?? false,
    destaque: row.destaque ?? false,
    conteudo: row.conteudo,
    ordem: row.ordem ?? 0,
    alergenos: row.alergenos ?? [],
    temas: (row.temas ?? []) as TemaSazonal[],
  }
}

/** Tudo menos `conteudo` — a coluna não tem GRANT de SELECT direto. */
const COLUNAS_VITRINE =
  'id, titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, ordem, alergenos, temas'

export type ReceitaCrua = Omit<Receita, 'bloqueada' | 'favoritada' | 'contemRestricao'>

/**
 * Modo de preparo liberado pro plano da pessoa, no idioma dela. Se o banco
 * ainda tem a RPC antiga (sem p_idioma), cai na chamada sem argumento (pt).
 */
async function conteudoLiberado() {
  const { idioma } = localidadeAtual()
  if (idioma !== 'pt-BR') {
    // en/es/fr/hi no banco (db/athoslife_idiomas_fr_hi_conteudo_migration.sql).
    const r = await supabase.rpc('receitas_conteudo_liberado', { p_idioma: idioma })
    if (!r.error) return r
  }
  return supabase.rpc('receitas_conteudo_liberado')
}

const CHAVE_FAVORITAS = 'receitas:favoritas'

/** Único ponto que conhece receitas_cozinha e receitas_favoritas. Funciona sem rede. */
export const receitasRepository = {
  /**
   * Lista todas as receitas, na ordem definida. A vitrine (nome, kcal,
   * macros…) vem pra todos; `conteudo` não pode ser lido direto da tabela —
   * só chega pela RPC, que entrega apenas o que o plano da pessoa libera
   * (db/athoslife_limites_gratis_servidor_migration.sql).
   */
  async listar(): Promise<ReceitaCrua[]> {
    // Guardado por idioma (o modo de preparo vem traduzido): a Cozinha abre sem rede.
    const { idioma } = localidadeAtual()
    const [linhas, trad] = await Promise.all([
      lerComCache(`receitas:v3:${idioma}`, async () => {
        const [vitrine, liberadas] = await Promise.all([
          supabase
            .from('receitas_cozinha')
            .select(COLUNAS_VITRINE)
            .order('ordem')
            .returns<Omit<ReceitaRow, 'conteudo'>[]>(),
          conteudoLiberado(),
        ])
        if (vitrine.error) throw vitrine.error
        if (liberadas.error) throw liberadas.error
        const conteudos = (liberadas.data ?? []) as Array<{ id: string; conteudo: string | null }>
        const conteudoPorId = new Map(conteudos.map((r) => [r.id, r.conteudo]))
        return (vitrine.data ?? []).map((row): ReceitaRow => ({ ...row, conteudo: conteudoPorId.get(row.id) ?? null }))
      }),
      traducoesDe('receitas_cozinha'),
    ])
    return linhas.map((row) => paraDominio(row, trad(row.id)))
  },

  /** IDs das receitas favoritadas pelo usuário atual. */
  async idsFavoritas(): Promise<Set<string>> {
    const ids = await lerComCache(
      CHAVE_FAVORITAS,
      async () => {
        const { data, error } = await supabase
          .from('receitas_favoritas')
          .select('receita_id')
          .returns<Array<{ receita_id: string }>>()
        if (error) throw error
        return (data ?? []).map((r) => r.receita_id)
      },
      { padrao: [] },
    )
    return new Set(ids)
  },

  async favoritar(receitaId: string): Promise<void> {
    const userId = await usuarioId()
    // ON CONFLICT: favoritar de novo não quebra (UNIQUE user+receita).
    await escrever(
      {
        op: 'upsert',
        tabela: 'receitas_favoritas',
        valores: { user_id: userId, receita_id: receitaId },
        onConflict: 'user_id,receita_id',
        ignorarDuplicados: true,
      },
      () => mexerNoCache<string[]>(CHAVE_FAVORITAS, (atual = []) => (atual.includes(receitaId) ? atual : [...atual, receitaId])),
    )
  },

  async desfavoritar(receitaId: string): Promise<void> {
    const userId = await usuarioId()
    await escrever(
      { op: 'delete', tabela: 'receitas_favoritas', filtros: [['user_id', userId], ['receita_id', receitaId]] },
      () => mexerNoCache<string[]>(CHAVE_FAVORITAS, (atual) => atual?.filter((id) => id !== receitaId)),
    )
  },
}
