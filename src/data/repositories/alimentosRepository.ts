import { supabase } from '@data/supabase/client'
import type { AlimentoBase, CategoriaAlimento } from '@domain/entities/food'
import { localidadeAtual } from '@data/localidadeAtual'

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
  nome_en?: string | null
  nome_es?: string | null
  regioes?: string[] | null
}

/** Nome no idioma em uso (sem tradução, fica o pt-BR). */
function nomeLocal(row: AlimentoRow): string {
  const { idioma } = localidadeAtual()
  if (idioma === 'en') return row.nome_en || row.nome
  if (idioma === 'es') return row.nome_es || row.nome
  return row.nome
}

/** Item regional (ex.: marca de suplemento só vendida no Brasil) fora do país some. */
function valeNoPais(row: AlimentoRow): boolean {
  if (!row.regioes || row.regioes.length === 0) return true
  const pais = localidadeAtual().pais ?? 'BR'
  return row.regioes.includes(pais)
}

function paraDominio(row: AlimentoRow): AlimentoBase {
  return {
    id: row.id,
    nome: nomeLocal(row),
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
  /**
   * Busca manual por nome, no idioma e país da pessoa (RPC buscar_alimentos:
   * procura em pt/en/es sem acento, esconde item de outro país e já devolve
   * o nome traduzido).
   */
  async buscar(termo: string, limite = 20): Promise<AlimentoBase[]> {
    const t = termo.trim()
    if (!t) return []
    const { idioma, pais } = localidadeAtual()
    const { data, error } = await supabase.rpc('buscar_alimentos', {
      p_termo: t,
      p_idioma: idioma,
      p_pais: pais,
      p_limite: limite,
    })
    if (error) throw error
    // O RPC já traduziu `nome`; paraDominio não pode trocar de novo.
    return ((data ?? []) as AlimentoRow[]).map((r) => paraDominio({ ...r, nome_en: null, nome_es: null }))
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
    return (data ?? []).filter(valeNoPais).map(paraDominio)
  },

  /**
   * Filtra a base por categoria — usada pelo carrossel de "Registrar
   * suplemento" (categoria='suplemento'), reaproveitando os ~1500
   * alimentos já cadastrados em vez de uma tabela nova só pra isso.
   */
  async porCategoria(categoria: CategoriaAlimento): Promise<AlimentoBase[]> {
    const { data, error } = await supabase
      .from('alimentos')
      .select('*')
      .eq('categoria', categoria)
      .order('nome')
      .returns<AlimentoRow[]>()
    if (error) throw error
    return (data ?? []).filter(valeNoPais).map(paraDominio)
  },
}
