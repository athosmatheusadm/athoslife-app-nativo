import { supabase } from '@data/supabase/client'
import { lerComCache } from '@data/offline/cache'
import { localidadeAtual } from '@data/localidadeAtual'

/**
 * Traduções do conteúdo curado (conquistas, exercícios, receitas), coluna
 * `traducoes jsonb` = {"en": {...}, "es": {...}} — ver
 * db/athoslife_traducoes_conteudo_migration.sql.
 *
 * Busca separada e tolerante de propósito: se a migração ainda não rodou
 * (coluna não existe) ou a rede falhar, o app só fica em português.
 * Conteúdo curado não muda durante o uso: guarda em memória por tabela.
 */
type Tabela = 'conquistas_catalogo' | 'exercicios_catalogo' | 'receitas_cozinha'
type PorIdioma = Partial<Record<string, Record<string, unknown>>>

const cache = new Map<Tabela, Promise<Map<string, PorIdioma>>>()

async function buscar(tabela: Tabela): Promise<Map<string, PorIdioma>> {
  // Guardado no aparelho: sem rede, exercícios e receitas continuam traduzidos.
  const linhas = await lerComCache(
    `traducoes:${tabela}`,
    async () => {
      const { data, error } = await supabase.from(tabela).select('id, traducoes').returns<{ id: string; traducoes: PorIdioma | null }[]>()
      if (error) throw error
      return data ?? []
    },
    { validadeMs: 24 * 60 * 60 * 1000 },
  )
  return new Map(linhas.map((r) => [r.id, r.traducoes ?? {}]))
}

/**
 * Campos traduzidos de cada linha no idioma atual (vazio em pt ou sem
 * tradução). Idioma que o banco ainda não tem (fr) cai no inglês.
 */
export async function traducoesDe(tabela: Tabela): Promise<(id: string) => Record<string, unknown>> {
  const { idioma } = localidadeAtual()
  if (idioma === 'pt-BR') return () => ({})
  let p = cache.get(tabela)
  if (!p) {
    p = buscar(tabela)
    cache.set(tabela, p)
    // Falhou: não guarda o erro, tenta de novo na próxima vez.
    p.catch(() => cache.delete(tabela))
  }
  const mapa = await p.catch(() => new Map<string, PorIdioma>())
  return (id) => mapa.get(id)?.[idioma] ?? (idioma === 'es' ? undefined : mapa.get(id)?.en) ?? {}
}

/** Texto traduzido se existir e não for vazio; senão o original. */
export function texto(trad: Record<string, unknown>, campo: string, original: string): string
export function texto(trad: Record<string, unknown>, campo: string, original: string | null): string | null
export function texto(trad: Record<string, unknown>, campo: string, original: string | null): string | null {
  const v = trad[campo]
  return typeof v === 'string' && v.trim() ? v : original
}

/** Lista traduzida só se tiver o mesmo tamanho da original (passo a passo). */
export function lista(trad: Record<string, unknown>, campo: string, original: readonly string[]): readonly string[] {
  const v = trad[campo]
  return Array.isArray(v) && v.length === original.length && v.every((x) => typeof x === 'string') ? (v as string[]) : original
}
