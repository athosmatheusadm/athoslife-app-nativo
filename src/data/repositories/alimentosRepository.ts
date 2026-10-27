import { supabase } from '@data/supabase/client'
import { lerComCache, lerDoCache } from '@data/offline/cache'
import { ehFalhaDeRede, valeTentarRede } from '@data/offline/conexao'
import type { AlimentoBase, CategoriaAlimento } from '@domain/entities/food'
import { localidadeAtual } from '@data/localidadeAtual'
import type { AlimentoPlano } from '@domain/rules/geradorDieta'

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
  gordura_preparo_pct?: number | null
  taco_id?: number | null
  porcao_tipica_g?: number | null
  aliases?: string[] | null
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
    gorduraPreparoPct: row.gordura_preparo_pct == null ? null : Number(row.gordura_preparo_pct),
    tacoId: row.taco_id ?? null,
    porcaoTipicaG: row.porcao_tipica_g == null ? null : Number(row.porcao_tipica_g),
  }
}

const UM_DIA_MS = 24 * 60 * 60 * 1000

/**
 * A base inteira (~1.650 alimentos, leitura pública) guardada no aparelho:
 * busca, suplementos e plano de dieta funcionam sem internet. Renova uma
 * vez por dia quando há rede.
 */
function baseCompleta(): Promise<AlimentoRow[]> {
  return lerComCache(
    'alimentos:base',
    async () => {
      const linhas: AlimentoRow[] = []
      // O PostgREST devolve no máximo 1000 por pedido.
      for (let de = 0; ; de += 1000) {
        const { data, error } = await supabase
          .from('alimentos')
          .select('*')
          .order('nome')
          .range(de, de + 999)
          .returns<AlimentoRow[]>()
        if (error) throw error
        linhas.push(...(data ?? []))
        if (!data || data.length < 1000) break
      }
      return linhas
    },
    { validadeMs: UM_DIA_MS },
  )
}

/** Sem acento, minúsculo e sem pontuação (igual normalizar_texto do banco): "acucar" acha "Açúcar", "coca cola" acha "Coca-Cola". */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Busca na base guardada — mesma ideia da RPC buscar_alimentos (pt/en/es, sem acento, só do país). */
function buscarNaBase(base: readonly AlimentoRow[], termo: string, limite: number): AlimentoBase[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean)
  const termoTodo = palavras.join(' ')
  const achados: { row: AlimentoRow; nota: number }[] = []
  for (const row of base) {
    if (!valeNoPais(row)) continue
    const apelidos = (row.aliases ?? []).map(normalizar)
    const nomes = [row.nome, row.nome_en, row.nome_es].filter((n): n is string => !!n).map(normalizar)
    const local = normalizar(nomeLocal(row))
    if (!palavras.every((p) => nomes.some((n) => n.includes(p))) && !apelidos.some((a) => a.includes(termoTodo))) continue
    // Mesma ordem da RPC: nome igual; alimento simples antes de prato
    // pronto/doce; TACO antes; palavra inteira > começa com >
    // palavra que começa com > resto; nome curto antes.
    const igual = local === termoTodo || apelidos.includes(termoTodo) ? 0 : 1
    const posicao = ` ${local.replace(/,/g, ' ')} `.includes(` ${termoTodo} `)
      ? 0
      : local.startsWith(termoTodo) ? 1 : local.includes(` ${termoTodo}`) ? 2 : 3
    const pronto = row.categoria === 'refeicao' || row.categoria === 'doce' ? 1 : 0
    const taco = row.taco_id != null ? 0 : 1
    achados.push({ row, nota: igual * 1000 + pronto * 100 + taco * 10 + posicao })
  }
  achados.sort((a, b) => a.nota - b.nota || nomeLocal(a.row).length - nomeLocal(b.row).length)
  return achados.slice(0, limite).map((a) => paraDominio(a.row))
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
    if (valeTentarRede()) {
      const { data, error } = await supabase.rpc('buscar_alimentos', {
        p_termo: t,
        p_idioma: idioma,
        p_pais: pais,
        p_limite: limite,
      })
      if (!error) {
        // A RPC não devolve a porção típica: completa com a base guardada
        // (e já deixa a base baixando pra busca sem rede).
        const base = await lerDoCache<AlimentoRow[]>('alimentos:base').catch(() => undefined)
        if (!base) void baseCompleta().catch(() => {})
        const tipica = new Map((base ?? []).map((b) => [b.id, b.porcao_tipica_g ?? null]))
        // O RPC já traduziu `nome`; paraDominio não pode trocar de novo.
        return ((data ?? []) as AlimentoRow[]).map((r) =>
          paraDominio({ ...r, nome_en: null, nome_es: null, porcao_tipica_g: tipica.get(r.id) ?? null }),
        )
      }
      if (!ehFalhaDeRede(error)) throw error
    }
    return buscarNaBase(await baseCompleta(), t, limite)
  },

  /**
   * Carrega a base inteira para reconciliar em memória.
   * A tabela é pequena (dezenas de itens) e de leitura pública,
   * então cabe num cache local em vez de uma query por item.
   */
  async carregarTodos(): Promise<AlimentoBase[]> {
    return (await baseCompleta()).filter(valeNoPais).map(paraDominio)
  },

  /**
   * Filtra a base por categoria — usada pelo carrossel de "Registrar
   * suplemento" (categoria='suplemento'), reaproveitando os ~1500
   * alimentos já cadastrados em vez de uma tabela nova só pra isso.
   */
  async porCategoria(categoria: CategoriaAlimento): Promise<AlimentoBase[]> {
    return (await baseCompleta()).filter((r) => r.categoria === categoria && valeNoPais(r)).map(paraDominio)
  },

  /**
   * Alimentos do cardápio de referência (lista fixa em geradorDieta), no
   * idioma da pessoa e sem item de outro país. Nome repetido na base: fica
   * a maior porção.
   */
  async paraPlanoDieta(nomes: readonly string[]): Promise<AlimentoPlano[]> {
    const procurados = new Set(nomes)
    return (await baseCompleta())
      .filter((r) => procurados.has(r.nome) && valeNoPais(r))
      .sort((a, b) => (b.porcao_g ?? 0) - (a.porcao_g ?? 0))
      .map((row) => ({ ...paraDominio(row), nomeBase: row.nome }))
  },
}
