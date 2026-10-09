import { supabase } from '@data/supabase/client'
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
type PorIdioma = Partial<Record<'en' | 'es', Record<string, unknown>>>

const cache = new Map<Tabela, Promise<Map<string, PorIdioma>>>()

async function buscar(tabela: Tabela): Promise<Map<string, PorIdioma>> {
  const { data, error } = await supabase.from(tabela).select('id, traducoes').returns<{ id: string; traducoes: PorIdioma | null }[]>()
  if (error) throw error
  return new Map((data ?? []).map((r) => [r.id, r.traducoes ?? {}]))
}

/** Campos traduzidos de cada linha no idioma atual (vazio em pt ou sem tradução). */
export async function traducoesDe(tabela: Tabela): Promise<(id: string) => Record<string, unknown>> {
  const { idioma } = localidadeAtual()
  if (idioma !== 'en' && idioma !== 'es') return () => ({})
  let p = cache.get(tabela)
  if (!p) {
    p = buscar(tabela)
    cache.set(tabela, p)
    // Falhou: não guarda o erro, tenta de novo na próxima vez.
    p.catch(() => cache.delete(tabela))
  }
  const mapa = await p.catch(() => new Map<string, PorIdioma>())
  return (id) => mapa.get(id)?.[idioma] ?? {}
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
