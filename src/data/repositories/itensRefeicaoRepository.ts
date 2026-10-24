import { supabase } from '@data/supabase/client'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever, inserir, novoId } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
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
  created_at: string
}

export interface RefeicaoExtra {
  readonly icone?: string
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
  icone?: string
  id: string
  nome: string
  ordem: number
  concluida: boolean
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
  'id, tipo, refeicao_extra_id, nome, quantidade_texto, calorias, proteina, carboidrato, gordura, created_at'

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

// Cópia local por dia (offline): itens, "concluída" dos fixos e extras.
const chaveItens = (dia: string) => `itens:${dia}`
const chaveStatus = (dia: string) => `refeicoes-status:${dia}`
const chaveExtras = (dia: string) => `refeicoes-extra:${dia}`

/** Em que dia está cada item / refeição extra — pra atualizar a cópia local certa sem ir ao servidor. */
const diaDoItem = new Map<string, string>()
const diaDaExtra = new Map<string, string>()

/** Todas as linhas do dia — a fonte única de doDia, macrosDoDia e clonar. */
async function linhasDoDia(dia: string): Promise<ItemRow[]> {
  const userId = await usuarioId()
  const rows = await lerComCache(
    chaveItens(dia),
    async () => {
      const { data: rows, error } = await supabase
        .from('itens_refeicao')
        .select(COLUNAS_ITEM)
        .eq('user_id', userId)
        .eq('data', dia)
        .order('created_at', { ascending: true })
        .returns<ItemRow[]>()
      if (error) throw error
      return rows ?? []
    },
    { padrao: [] },
  )
  for (const r of rows) diaDoItem.set(r.id, dia)
  return rows
}

function noAlvo(row: ItemRow, alvo: RefeicaoAlvo): boolean {
  return alvo.tipo === 'extra' ? row.tipo === 'extra' && row.refeicao_extra_id === alvo.extraId : row.tipo === alvo.tipo
}

async function gravarItens(dia: string, rows: ItemRow[]): Promise<void> {
  const userId = await usuarioId()
  for (const r of rows) diaDoItem.set(r.id, dia)
  await escrever(
    inserir(
      'itens_refeicao',
      rows.map((r) => ({ ...r, user_id: userId, data: dia })),
    ),
    () =>
      mexerNoCache<ItemRow[]>(chaveItens(dia), (atual = []) => [
        ...atual,
        ...rows.filter((r) => !atual.some((a) => a.id === r.id)),
      ]),
  )
  avisarRegistroDoDia()
}

async function mexerNaExtra(extraId: string, fn: (e: ExtraRow) => ExtraRow | null): Promise<void> {
  const dia = diaDaExtra.get(extraId)
  if (!dia) return
  await mexerNoCache<ExtraRow[]>(chaveExtras(dia), (atual) =>
    atual?.flatMap((e) => (e.id === extraId ? (fn(e) ?? []) : [e])),
  )
}

/**
 * Único ponto que conhece `itens_refeicao` e `refeicoes_status`.
 *
 * `itens_refeicao` é o item-a-item real da Dieta (o que a antiga versão só
 * guardava em useState). `refeicoes_status` é o checkbox "concluída" por
 * (dia, tipo) — separado porque uma refeição pode ficar marcada mesmo com
 * a lista de itens vazia (ex.: "hoje pulei o café, mas já decidi que 'tá ok'").
 *
 * Tudo funciona sem internet: as gravações vão pela fila offline (ids
 * gerados no aparelho) e atualizam a cópia local do dia.
 */
export const itensRefeicaoRepository = {
  /** Itens do dia, já particionados: os 4 tipos fixos (por tipo) e cada refeição extra (por id). */
  async doDia(
    data: Date,
  ): Promise<{ fixos: Map<TipoFixo, ItemRefeicao[]>; extras: Map<string, ItemRefeicao[]> }> {
    const rows = await linhasDoDia(paraDataStr(data))
    const fixos = new Map<TipoFixo, ItemRefeicao[]>()
    const extras = new Map<string, ItemRefeicao[]>()
    for (const row of rows) {
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

  /** Grava um alimento novo na refeição do dia (fixa ou extra específica). Devolve o item já com o id definitivo. */
  async adicionar(
    alvo: RefeicaoAlvo,
    data: Date,
    item: Omit<ItemRefeicao, 'id'>,
  ): Promise<ItemRefeicao> {
    const row: ItemRow = {
      id: novoId(),
      tipo: alvo.tipo,
      refeicao_extra_id: alvo.tipo === 'extra' ? alvo.extraId : null,
      nome: item.nome,
      quantidade_texto: item.quantidade,
      calorias: item.calorias,
      proteina: item.proteina,
      carboidrato: item.carboidrato,
      gordura: item.gordura,
      created_at: new Date().toISOString(),
    }
    await gravarItens(paraDataStr(data), [row])
    return paraDominio(row)
  },

  async removerItem(itemId: string): Promise<void> {
    const dia = diaDoItem.get(itemId)
    await escrever({ op: 'delete', tabela: 'itens_refeicao', filtros: [['id', itemId]] }, () =>
      dia ? mexerNoCache<ItemRow[]>(chaveItens(dia), (atual) => atual?.filter((r) => r.id !== itemId)) : undefined,
    )
    avisarRegistroDoDia()
  },

  /** "Excluir refeição" de um tipo fixo: limpa todos os itens do tipo, no dia (o slot em si continua existindo). */
  async removerTodosDoTipo(tipo: TipoFixo, data: Date): Promise<void> {
    const userId = await usuarioId()
    const dia = paraDataStr(data)
    await escrever(
      { op: 'delete', tabela: 'itens_refeicao', filtros: [['user_id', userId], ['data', dia], ['tipo', tipo]] },
      () => mexerNoCache<ItemRow[]>(chaveItens(dia), (atual) => atual?.filter((r) => r.tipo !== tipo)),
    )
    avisarRegistroDoDia()
  },

  /**
   * "Copiar de outra refeição": duplica os itens da refeição de origem para
   * a de destino (fixa ou extra), sempre no mesmo dia. Devolve os itens já
   * com id novo.
   */
  async clonar(origem: RefeicaoAlvo, destino: RefeicaoAlvo, data: Date): Promise<ItemRefeicao[]> {
    const dia = paraDataStr(data)
    const itensOrigem = (await linhasDoDia(dia)).filter((r) => noAlvo(r, origem))
    if (itensOrigem.length === 0) return []
    const agora = Date.now()
    const novos: ItemRow[] = itensOrigem.map((i, n) => ({
      ...i,
      id: novoId(),
      tipo: destino.tipo,
      refeicao_extra_id: destino.tipo === 'extra' ? destino.extraId : null,
      // Mantém a ordem da origem na lista do destino.
      created_at: new Date(agora + n).toISOString(),
    }))
    await gravarItens(dia, novos)
    return novos.map(paraDominio)
  },

  /** Checkbox "concluída" dos 4 tipos fixos, no dia (extras têm o próprio `concluida` em `refeicoes_extra`). */
  async statusDoDia(data: Date): Promise<Map<TipoFixo, boolean>> {
    const userId = await usuarioId()
    const dia = paraDataStr(data)
    const rows = await lerComCache(
      chaveStatus(dia),
      async () => {
        const { data: linhas, error } = await supabase
          .from('refeicoes_status')
          .select('tipo, concluida')
          .eq('user_id', userId)
          .eq('data', dia)
          .returns<{ tipo: TipoRefeicao; concluida: boolean }[]>()
        if (error) throw error
        return linhas ?? []
      },
      { padrao: [] },
    )
    return new Map(
      rows
        .filter((r): r is { tipo: TipoFixo; concluida: boolean } => r.tipo !== 'extra')
        .map((r) => [r.tipo, r.concluida]),
    )
  },

  async definirConcluida(tipo: TipoFixo, data: Date, concluida: boolean): Promise<void> {
    const userId = await usuarioId()
    const dia = paraDataStr(data)
    await escrever(
      {
        op: 'upsert',
        tabela: 'refeicoes_status',
        valores: { user_id: userId, data: dia, tipo, concluida },
        onConflict: 'user_id,data,tipo',
      },
      () =>
        mexerNoCache<{ tipo: TipoRefeicao; concluida: boolean }[]>(chaveStatus(dia), (atual = []) => [
          ...atual.filter((r) => r.tipo !== tipo),
          { tipo, concluida },
        ]),
    )
    avisarRegistroDoDia()
  },

  /** Refeições extras do dia, ordenadas pela posição escolhida pelo usuário (drag). */
  async listarExtras(data: Date): Promise<RefeicaoExtra[]> {
    const userId = await usuarioId()
    const dia = paraDataStr(data)
    const rows = await lerComCache(
      chaveExtras(dia),
      async () => {
        const { data: linhas, error } = await supabase
          .from('refeicoes_extra')
          .select('*')
          .eq('user_id', userId)
          .eq('data', dia)
          .order('ordem', { ascending: true })
          .returns<ExtraRow[]>()
        if (error) throw error
        return linhas ?? []
      },
      { padrao: [] },
    )
    for (const e of rows) diaDaExtra.set(e.id, dia)
    return [...rows].sort((a, b) => a.ordem - b.ordem)
  },

  /** Cria uma refeição extra nova, sempre no fim da lista do dia (maior ordem + 10). */
  async criarExtra(data: Date, nome: string): Promise<RefeicaoExtra> {
    const userId = await usuarioId()
    const dia = paraDataStr(data)
    const atuais = await this.listarExtras(data)
    const ordem = Math.max(0, ...atuais.map((e) => e.ordem)) + 10
    const row: ExtraRow = { id: novoId(), nome, ordem, concluida: false }
    await escrever(inserir('refeicoes_extra', { ...row, user_id: userId, data: dia }), () =>
      mexerNoCache<ExtraRow[]>(chaveExtras(dia), (lista = []) => [...lista, row]),
    )
    diaDaExtra.set(row.id, dia)
    return row
  },

  /** Troca o ícone de uma refeição extra (precisa da coluna `icone` no banco). */
  async definirIconeExtra(extraId: string, icone: string): Promise<void> {
    await escrever({ op: 'update', tabela: 'refeicoes_extra', valores: { icone }, filtros: [['id', extraId]] }, () =>
      mexerNaExtra(extraId, (e) => ({ ...e, icone })),
    )
  },

  /** Renomeia uma refeição extra específica. */
  async renomearExtraPorId(extraId: string, nome: string): Promise<void> {
    await escrever({ op: 'update', tabela: 'refeicoes_extra', valores: { nome }, filtros: [['id', extraId]] }, () =>
      mexerNaExtra(extraId, (e) => ({ ...e, nome })),
    )
  },

  async definirConcluidaExtra(extraId: string, concluida: boolean): Promise<void> {
    await escrever({ op: 'update', tabela: 'refeicoes_extra', valores: { concluida }, filtros: [['id', extraId]] }, () =>
      mexerNaExtra(extraId, (e) => ({ ...e, concluida })),
    )
  },

  /** Exclui a refeição extra por completo (cascata apaga os itens dela). */
  async excluirExtra(extraId: string): Promise<void> {
    const dia = diaDaExtra.get(extraId)
    await escrever({ op: 'delete', tabela: 'refeicoes_extra', filtros: [['id', extraId]] }, async () => {
      await mexerNaExtra(extraId, () => null)
      if (dia) await mexerNoCache<ItemRow[]>(chaveItens(dia), (atual) => atual?.filter((r) => r.refeicao_extra_id !== extraId))
    })
    avisarRegistroDoDia()
  },

  /** Move a refeição extra pra uma nova posição (ponto médio entre os vizinhos, calculado por quem chama). */
  async reordenarExtra(extraId: string, novaOrdem: number): Promise<void> {
    await escrever(
      { op: 'update', tabela: 'refeicoes_extra', valores: { ordem: novaOrdem }, filtros: [['id', extraId]] },
      () => mexerNaExtra(extraId, (e) => ({ ...e, ordem: novaOrdem })),
    )
  },

  /**
   * Macros somados por tipo, no dia — usado por `refeicoesRepository.doDia()`
   * (kcal por card na Home) e `macrosRepository.doDia()` (total do dia), pra
   * que itens adicionados manualmente na Dieta contem nesses totais também.
   */
  async macrosDoDia(data: Date): Promise<MacrosPorTipo[]> {
    const rows = await linhasDoDia(paraDataStr(data))
    const porTipo = new Map<TipoRefeicao, MacrosPorTipo>()
    for (const row of rows) {
      const atual = porTipo.get(row.tipo) ?? {
        tipo: row.tipo,
        calorias: 0,
        proteina: 0,
        carboidrato: 0,
        gordura: 0,
      }
      porTipo.set(row.tipo, {
        tipo: row.tipo,
        calorias: atual.calorias + Number(row.calorias),
        proteina: atual.proteina + Number(row.proteina),
        carboidrato: atual.carboidrato + Number(row.carboidrato),
        gordura: atual.gordura + Number(row.gordura),
      })
    }
    return Array.from(porTipo.values())
  },
}
