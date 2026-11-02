import { supabase } from '@data/supabase/client'
import { lerComCache } from '@data/offline/cache'
import { usuarioId } from '@data/offline/usuario'
import { itensRefeicaoRepository } from './itensRefeicaoRepository'
import { dataLocalISO } from '@domain/rules/datas'

/** Total de macros consumidos hoje, vindo da view macros_diarios. */
export interface MacrosDoDia {
  readonly kcal: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
}

interface MacrosRow {
  total_kcal: number | null
  total_prot: number | null
  total_carbo: number | null
  total_gord: number | null
}

const ZERO: MacrosDoDia = { kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 }

/**
 * Lê a view macros_diarios (soma das refeições do scanner) e soma em cima
 * os itens adicionados manualmente na Dieta (`itens_refeicao`), que a view
 * não conhece. Alimenta os discos de Calorias e Proteínas da Home (chamado
 * sem argumento = hoje) e o resumo do topo da tela Dieta (por dia
 * selecionado na faixa).
 * Se não houver refeição no dia, a view não retorna linha -> zera.
 */
export const macrosRepository = {
  async doDia(data: Date = new Date()): Promise<MacrosDoDia> {
    const userId = await usuarioId()

    const dataStr = dataLocalISO(data)
    const [row, manuais] = await Promise.all([
      // Só a tabela antiga do scanner — não muda offline (o scanner novo grava em itens_refeicao).
      lerComCache(
        `macros-scanner-antigo:${dataStr}`,
        async () => {
          const { data: linha, error } = await supabase
            .from('macros_diarios')
            .select('total_kcal, total_prot, total_carbo, total_gord')
            .eq('user_id', userId)
            .eq('data', dataStr)
            .maybeSingle<MacrosRow>()
          if (error) throw error
          return linha
        },
        { padrao: null },
      ),
      itensRefeicaoRepository.macrosDoDia(data),
    ])

    const base: MacrosDoDia = row
      ? {
          kcal: row.total_kcal ?? 0,
          proteina: row.total_prot ?? 0,
          carboidrato: row.total_carbo ?? 0,
          gordura: row.total_gord ?? 0,
        }
      : ZERO

    const soma = manuais.reduce<MacrosDoDia>(
      (acc, m) => ({
        kcal: acc.kcal + Number(m.calorias),
        proteina: acc.proteina + Number(m.proteina),
        carboidrato: acc.carboidrato + Number(m.carboidrato),
        gordura: acc.gordura + Number(m.gordura),
      }),
      base,
    )
    // Soma de decimais em ponto flutuante vira 138.39999999999998 — a tela
    // mostra kcal inteira e gramas com 1 casa.
    return {
      kcal: Math.round(soma.kcal),
      proteina: Math.round(soma.proteina * 10) / 10,
      carboidrato: Math.round(soma.carboidrato * 10) / 10,
      gordura: Math.round(soma.gordura * 10) / 10,
    }
  },
}
