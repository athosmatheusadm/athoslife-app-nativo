import { supabase } from '@data/supabase/client'
import type { RegistroPeso, ResumoPeso } from '@domain/entities/weight'

interface PesoRow {
  peso_kg: number
  data: string
}

function paraDominio(row: PesoRow): RegistroPeso {
  return { pesoKg: row.peso_kg, data: new Date(row.data) }
}

/**
 * Único ponto que conhece registros_peso.
 * A tabela tem UNIQUE (user_id, data): 1 registro por dia. Por isso o
 * "adicionar" é um upsert — registrar de novo no mesmo dia atualiza.
 */
export const pesoRepository = {
  /** Histórico ordenado por data (antigo -> recente) para desenhar a linha. */
  async historico(): Promise<RegistroPeso[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data, error } = await supabase
      .from('registros_peso')
      .select('peso_kg, data')
      .eq('user_id', userId)
      .order('data', { ascending: true })
      .returns<PesoRow[]>()

    if (error) throw error
    return (data ?? []).map(paraDominio)
  },

  /** Monta o resumo do card (inicial, atual, variação) a partir do histórico. */
  async resumo(): Promise<ResumoPeso> {
    const registros = await this.historico()
    if (registros.length === 0) {
      return { inicial: 0, atual: 0, variacao: 0, registros: [] }
    }
    const inicial = registros[0]!.pesoKg
    const atual = registros[registros.length - 1]!.pesoKg
    return {
      inicial,
      atual,
      variacao: Math.round((atual - inicial) * 10) / 10,
      registros,
    }
  },

  /** Registra o peso de hoje (upsert: 1 por dia). */
  async registrar(pesoKg: number): Promise<void> {
    if (pesoKg <= 0) throw new Error('peso_invalido')
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const hoje = new Date().toISOString().slice(0, 10)
    const { error } = await supabase
      .from('registros_peso')
      .upsert(
        { user_id: userId, peso_kg: pesoKg, data: hoje },
        { onConflict: 'user_id,data' },
      )
    if (error) throw error
  },
}
