import { supabase } from '@data/supabase/client'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever, inserir, novoId } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import { MAX_KCAL_ITEM } from '@domain/rules/limites'

export type TipoPlanejavel = 'cafe' | 'almoco' | 'lanche' | 'jantar'

/** Comida que o Life deixou no lugar e a pessoa ainda não comeu. */
export interface ItemPlanejado {
  readonly id: string
  readonly data: string
  readonly tipo: TipoPlanejavel
  readonly nome: string
  readonly quantidade: string
  readonly calorias: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
  readonly lote: string | null
}

interface Row {
  id: string
  data: string
  tipo: TipoPlanejavel
  nome: string
  quantidade_texto: string
  calorias: number
  proteina: number
  carboidrato: number
  gordura: number
  lote: string | null
}

const COLUNAS = 'id, data, tipo, nome, quantidade_texto, calorias, proteina, carboidrato, gordura, lote'
const chave = (dia: string) => `planejadas:${dia}`

const paraDominio = (r: Row): ItemPlanejado => ({
  id: r.id, data: r.data, tipo: r.tipo, nome: r.nome, quantidade: r.quantidade_texto,
  calorias: Number(r.calorias), proteina: Number(r.proteina), carboidrato: Number(r.carboidrato), gordura: Number(r.gordura),
  lote: r.lote,
})

/**
 * Refeições planejadas (db/athoslife_refeicoes_planejadas_migration.sql,
 * 02/11). O Life propõe no chat; ao confirmar, cai aqui. Na Dieta o item
 * aparece apagadinho na refeição e o ✓ registra de verdade (itens_refeicao)
 * e apaga daqui. Nada daqui entra em soma nenhuma. Funciona sem internet
 * (fila), como a Dieta.
 */
export const planejadasRepository = {
  async doDia(dia: string): Promise<ItemPlanejado[]> {
    const userId = await usuarioId()
    const rows = await lerComCache(chave(dia), async () => {
      const { data, error } = await supabase.from('refeicoes_planejadas').select(COLUNAS)
        .eq('user_id', userId).eq('data', dia).order('criado_em', { ascending: true }).returns<Row[]>()
      // Tabela ainda não criada (banco antes do JS) ou sem rede: só não mostra nada.
      if (error) return []
      return data ?? []
    })
    return rows.map(paraDominio)
  },

  /** Grava um lote (um "programar" do chat). Devolve o id do lote, pro Desfazer. */
  async adicionarLote(itens: Omit<ItemPlanejado, 'id' | 'lote'>[]): Promise<string> {
    if (itens.some((i) => !(i.calorias >= 0 && i.calorias <= MAX_KCAL_ITEM))) throw new Error('quantidade_invalida')
    const userId = await usuarioId()
    const lote = novoId()
    const rows: Row[] = itens.map((i) => ({
      id: novoId(), data: i.data, tipo: i.tipo, nome: i.nome.slice(0, 120), quantidade_texto: i.quantidade.slice(0, 60),
      calorias: i.calorias, proteina: i.proteina, carboidrato: i.carboidrato, gordura: i.gordura, lote,
    }))
    await escrever(
      inserir('refeicoes_planejadas', rows.map((r) => ({ ...r, user_id: userId, origem: 'life' }))),
      async () => {
        for (const dia of new Set(rows.map((r) => r.data))) {
          await mexerNoCache<Row[]>(chave(dia), (atual = []) => [...atual, ...rows.filter((r) => r.data === dia)])
        }
      },
    )
    return lote
  },

  /** Desfazer do chat: apaga o lote inteiro. */
  async apagarLote(lote: string, dias: readonly string[]): Promise<void> {
    await escrever({ op: 'delete', tabela: 'refeicoes_planejadas', filtros: [['lote', lote]] }, async () => {
      for (const dia of dias) await mexerNoCache<Row[]>(chave(dia), (atual) => atual?.filter((r) => r.lote !== lote))
    })
  },

  /** Depois do ✓ (já gravou em itens_refeicao) ou do ×: tira do planejado. */
  async apagar(ids: readonly string[], dia: string): Promise<void> {
    for (const id of ids) {
      await escrever({ op: 'delete', tabela: 'refeicoes_planejadas', filtros: [['id', id]] }, () =>
        mexerNoCache<Row[]>(chave(dia), (atual) => atual?.filter((r) => r.id !== id)),
      )
    }
  },
}
