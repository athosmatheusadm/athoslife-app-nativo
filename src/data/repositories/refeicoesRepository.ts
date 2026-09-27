import { supabase } from '@data/supabase/client'
import {
  somarMacros,
  type ItemRascunho,
  type RefeicaoRascunho,
} from '@domain/entities/food'
import { itensRefeicaoRepository } from './itensRefeicaoRepository'

export type TipoRefeicao = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'extra'

export interface RefeicaoResumoDia {
  readonly tipo: TipoRefeicao
  readonly kcal: number
}

/**
 * `refeicoes` é a tabela antiga do scanner (uma linha por refeição, macros
 * somados) — só lida aqui pra somar o que já existe. Desde 2026-09-27 o
 * scanner grava item a item em `itens_refeicao`, igual à Dieta.
 */
export const refeicoesRepository = {
  /**
   * Soma as calorias por tipo de refeição já registradas hoje — tanto as
   * vindas do scanner (`refeicoes`) quanto os itens adicionados manualmente
   * na Dieta (`itens_refeicao`), pra o card da Home bater com o que a
   * pessoa vê lá dentro.
   * Alimenta os cards de refeição da Home (café, almoço, lanche, jantar).
   */
  async doDia(): Promise<RefeicaoResumoDia[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const hoje = new Date()
    const hojeStr = hoje.toISOString().slice(0, 10)
    const [{ data, error }, manuais] = await Promise.all([
      supabase
        .from('refeicoes')
        .select('tipo, calorias')
        .eq('user_id', userId)
        .eq('data', hojeStr)
        .returns<{ tipo: TipoRefeicao; calorias: number }[]>(),
      itensRefeicaoRepository.macrosDoDia(hoje),
    ])

    if (error) throw error

    const porTipo = new Map<TipoRefeicao, number>()
    for (const row of data ?? []) {
      porTipo.set(row.tipo, (porTipo.get(row.tipo) ?? 0) + row.calorias)
    }
    for (const m of manuais) {
      porTipo.set(m.tipo, (porTipo.get(m.tipo) ?? 0) + m.calorias)
    }
    return Array.from(porTipo, ([tipo, kcal]) => ({ tipo, kcal }))
  },

  /**
   * Histórico do scan (auditoria + futura melhoria da base de alimentos).
   * Os alimentos em si vão pra `itens_refeicao` (ver foodCaptureService) —
   * mesma lista que a Dieta mostra, com excluir/copiar. Falha aqui não
   * desfaz nada do que a pessoa salvou.
   */
  async registrarScan(params: { rascunho: RefeicaoRascunho; data: string }): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    const incluidos = params.rascunho.itens.filter((i) => i.incluir)
    const { error } = await supabase.from('scan_historico').insert({
      user_id: userId,
      descricao_ia: params.rascunho.descricao || montarNome(incluidos, ''),
      resultado_final: { itens: incluidos, totais: somarMacros(incluidos), observacao: params.rascunho.observacao },
      confianca: params.rascunho.confianca,
      data: params.data,
    })
    if (error) console.warn('scan_historico falhou (itens preservados):', error.message)
  },
}

/** Nome legível: usa a descrição da IA, ou junta os nomes dos itens. */
function montarNome(itens: readonly ItemRascunho[], descricao: string): string {
  const d = descricao.trim()
  if (d) return d
  const nomes = itens.map((i) => i.nome).slice(0, 3)
  return nomes.join(', ') || 'Refeição'
}
