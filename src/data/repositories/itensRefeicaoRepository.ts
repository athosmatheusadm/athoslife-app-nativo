import { supabase } from '@data/supabase/client'
import type { TipoRefeicao } from './refeicoesRepository'
import type { ItemRefeicao } from '@domain/entities/meal'
import { dataLocalISO } from '@domain/rules/datas'

interface ItemRow {
  id: string
  tipo: TipoRefeicao
  refeicao_extra_id: string | null
  nome: string
  quantidade_texto: string
  calorias: number
  proteina: number
  carboidrato: number
  gordura: number
}

export interface RefeicaoExtra {
  readonly id: string
  readonly nome: string
  readonly ordem: number
  readonly concluida: boolean
}

/** Refeição fixa (tipo) ou uma extra específica (por id) — identifica pra onde uma ação (excluir, clonar, concluir...) deve ir. */
export type RefeicaoAlvo =
  | { readonly tipo: 'cafe' | 'almoco' | 'lanche' | 'jantar' }
  | { readonly tipo: 'extra'; readonly extraId: string }

interface ExtraRow {
  id: string
  nome: string
  ordem: number
  concluida: boolean
}

interface MacrosRow {
  tipo: TipoRefeicao
  calorias: number
  proteina: number
  carboidrato: number
  gordura: number
}

export interface MacrosPorTipo {
  readonly tipo: TipoRefeicao
  readonly calorias: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
}

type TipoFixo = 'cafe' | 'almoco' | 'lanche' | 'jantar'

const COLUNAS_ITEM =
  'id, tipo, refeicao_extra_id, nome, quantidade_texto, calorias, proteina, carboidrato, gordura'

function paraDominio(row: ItemRow): ItemRefeicao {
  return {
    id: row.id,
    nome: row.nome,
    quantidade: row.quantidade_texto,
    calorias: row.calorias,
    proteina: row.proteina,
    carboidrato: row.carboidrato,
    gordura: row.gordura,
  }
}

function paraDataStr(data: Date): string {
  return dataLocalISO(data)
}

/**
 * Único ponto que conhece `itens_refeicao` e `refeicoes_status`.
 *
 * `itens_refeicao` é o item-a-item real da Dieta (o que a antiga versão só
 * guardava em useState). `refeicoes_status` é o checkbox "concluída" por
 * (dia, tipo) — separado porque uma refeição pode ficar marcada mesmo com
 * a lista de itens vazia (ex.: "hoje pulei o café, mas já decidi que 'tá ok'").
 */
export const itensRefeicaoRepository = {
  /** Itens do dia, já particionados: os 4 tipos fixos (por tipo) e cada refeição extra (por id). */
  async doDia(
    data: Date,
  ): Promise<{ fixos: Map<TipoFixo, ItemRefeicao[]>; extras: Map<string, ItemRefeicao[]> }> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data: rows, error } = await supabase
      .from('itens_refeicao')
      .select(COLUNAS_ITEM)
      .eq('user_id', userId)
      .eq('data', paraDataStr(data))
      .order('created_at', { ascending: true })
      .returns<ItemRow[]>()

    if (error) throw error

    const fixos = new Map<TipoFixo, ItemRefeicao[]>()
    const extras = new Map<string, ItemRefeicao[]>()
    for (const row of rows ?? []) {
      if (row.tipo === 'extra' && row.refeicao_extra_id) {
        const lista = extras.get(row.refeicao_extra_id) ?? []
        lista.push(paraDominio(row))
        extras.set(row.refeicao_extra_id, lista)
      } else if (row.tipo !== 'extra') {
        const lista = fixos.get(row.tipo) ?? []
        lista.push(paraDominio(row))
        fixos.set(row.tipo, lista)
      }
    }
    return { fixos, extras }
  },

  /** Grava um alimento novo na refeição do dia (fixa ou extra específica). Devolve o item com id real do banco. */
  async adicionar(
    alvo: RefeicaoAlvo,
    data: Date,
    item: Omit<ItemRefeicao, 'id'>,
  ): Promise<ItemRefeicao> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data: row, error } = await supabase
      .from('itens_refeicao')
      .insert({
        user_id: userId,
        data: paraDataStr(data),
        tipo: alvo.tipo,
        refeicao_extra_id: alvo.tipo === 'extra' ? alvo.extraId : null,
        nome: item.nome,
        quantidade_texto: item.quantidade,
        calorias: item.calorias,
        proteina: item.proteina,
        carboidrato: item.carboidrato,
        gordura: item.gordura,
      })
      .select(COLUNAS_ITEM)
      .single<ItemRow>()

    if (error) throw error
    return paraDominio(row)
  },

  async removerItem(itemId: string): Promise<void> {
    const { error } = await supabase.from('itens_refeicao').delete().eq('id', itemId)
    if (error) throw error
  },

  /** "Excluir refeição" de um tipo fixo: limpa todos os itens do tipo, no dia (o slot em si continua existindo). */
  async removerTodosDoTipo(tipo: TipoFixo, data: Date): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase
      .from('itens_refeicao')
      .delete()
      .eq('user_id', userId)
      .eq('data', paraDataStr(data))
      .eq('tipo', tipo)

    if (error) throw error
  },

  /**
   * "Copiar de outra refeição": duplica os itens da refeição de origem para
   * a de destino (fixa ou extra), sempre no mesmo dia. Devolve os itens já
   * com id novo.
   */
  async clonar(origem: RefeicaoAlvo, destino: RefeicaoAlvo, data: Date): Promise<ItemRefeicao[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const dataStr = paraDataStr(data)
    let query = supabase
      .from('itens_refeicao')
      .select('nome, quantidade_texto, calorias, proteina, carboidrato, gordura')
      .eq('user_id', userId)
      .eq('data', dataStr)
      .eq('tipo', origem.tipo)
    query =
      origem.tipo === 'extra' ? query.eq('refeicao_extra_id', origem.extraId) : query

    const { data: itensOrigem, error: erroOrigem } = await query
    if (erroOrigem) throw erroOrigem
    if (!itensOrigem || itensOrigem.length === 0) return []

    const novos = itensOrigem.map((i) => ({
      user_id: userId,
      data: dataStr,
      tipo: destino.tipo,
      refeicao_extra_id: destino.tipo === 'extra' ? destino.extraId : null,
      nome: i.nome,
      quantidade_texto: i.quantidade_texto,
      calorias: i.calorias,
      proteina: i.proteina,
      carboidrato: i.carboidrato,
      gordura: i.gordura,
    }))

    const { data: inseridos, error: erroInsert } = await supabase
      .from('itens_refeicao')
      .insert(novos)
      .select(COLUNAS_ITEM)
      .returns<ItemRow[]>()

    if (erroInsert) throw erroInsert
    return (inseridos ?? []).map(paraDominio)
  },

  /** Checkbox "concluída" dos 4 tipos fixos, no dia (extras têm o próprio `concluida` em `refeicoes_extra`). */
  async statusDoDia(data: Date): Promise<Map<TipoFixo, boolean>> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data: rows, error } = await supabase
      .from('refeicoes_status')
      .select('tipo, concluida')
      .eq('user_id', userId)
      .eq('data', paraDataStr(data))
      .returns<{ tipo: TipoRefeicao; concluida: boolean }[]>()

    if (error) throw error
    return new Map(
      (rows ?? [])
        .filter((r): r is { tipo: TipoFixo; concluida: boolean } => r.tipo !== 'extra')
        .map((r) => [r.tipo, r.concluida]),
    )
  },

  async definirConcluida(tipo: TipoFixo, data: Date, concluida: boolean): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase
      .from('refeicoes_status')
      .upsert(
        { user_id: userId, data: paraDataStr(data), tipo, concluida },
        { onConflict: 'user_id,data,tipo' },
      )

    if (error) throw error
  },

  /** Refeições extras do dia, ordenadas pela posição escolhida pelo usuário (drag). */
  async listarExtras(data: Date): Promise<RefeicaoExtra[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data: rows, error } = await supabase
      .from('refeicoes_extra')
      .select('id, nome, ordem, concluida')
      .eq('user_id', userId)
      .eq('data', paraDataStr(data))
      .order('ordem', { ascending: true })
      .returns<ExtraRow[]>()

    if (error) throw error
    return rows ?? []
  },

  /** Cria uma refeição extra nova, sempre no fim da lista do dia (maior ordem + 10). */
  async criarExtra(data: Date): Promise<RefeicaoExtra> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const dataStr = paraDataStr(data)
    const { data: ultima, error: erroUltima } = await supabase
      .from('refeicoes_extra')
      .select('ordem')
      .eq('user_id', userId)
      .eq('data', dataStr)
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle<{ ordem: number }>()

    if (erroUltima) throw erroUltima
    const ordem = (ultima?.ordem ?? 0) + 10

    const { data: row, error } = await supabase
      .from('refeicoes_extra')
      .insert({ user_id: userId, data: dataStr, nome: 'Nova refeição', ordem })
      .select('id, nome, ordem, concluida')
      .single<ExtraRow>()

    if (error) throw error
    return row
  },

  /** Renomeia uma refeição extra específica. */
  async renomearExtraPorId(extraId: string, nome: string): Promise<void> {
    const { error } = await supabase.from('refeicoes_extra').update({ nome }).eq('id', extraId)
    if (error) throw error
  },

  async definirConcluidaExtra(extraId: string, concluida: boolean): Promise<void> {
    const { error } = await supabase
      .from('refeicoes_extra')
      .update({ concluida })
      .eq('id', extraId)
    if (error) throw error
  },

  /** Exclui a refeição extra por completo (cascata apaga os itens dela). */
  async excluirExtra(extraId: string): Promise<void> {
    const { error } = await supabase.from('refeicoes_extra').delete().eq('id', extraId)
    if (error) throw error
  },

  /** Move a refeição extra pra uma nova posição (ponto médio entre os vizinhos, calculado por quem chama). */
  async reordenarExtra(extraId: string, novaOrdem: number): Promise<void> {
    const { error } = await supabase
      .from('refeicoes_extra')
      .update({ ordem: novaOrdem })
      .eq('id', extraId)
    if (error) throw error
  },

  /**
   * Macros somados por tipo, no dia — usado por `refeicoesRepository.doDia()`
   * (kcal por card na Home) e `macrosRepository.doDia()` (total do dia), pra
   * que itens adicionados manualmente na Dieta contem nesses totais também.
   */
  async macrosDoDia(data: Date): Promise<MacrosPorTipo[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data: rows, error } = await supabase
      .from('itens_refeicao')
      .select('tipo, calorias, proteina, carboidrato, gordura')
      .eq('user_id', userId)
      .eq('data', paraDataStr(data))
      .returns<MacrosRow[]>()

    if (error) throw error

    const porTipo = new Map<TipoRefeicao, MacrosPorTipo>()
    for (const row of rows ?? []) {
      const atual = porTipo.get(row.tipo) ?? {
        tipo: row.tipo,
        calorias: 0,
        proteina: 0,
        carboidrato: 0,
        gordura: 0,
      }
      porTipo.set(row.tipo, {
        tipo: row.tipo,
        calorias: atual.calorias + row.calorias,
        proteina: atual.proteina + row.proteina,
        carboidrato: atual.carboidrato + row.carboidrato,
        gordura: atual.gordura + row.gordura,
      })
    }
    return Array.from(porTipo.values())
  },
}
