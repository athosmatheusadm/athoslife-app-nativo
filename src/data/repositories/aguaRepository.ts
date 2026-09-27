import { supabase } from '@data/supabase/client'
import type { AguaDoDia, RegistroAgua } from '@domain/entities/water'
import { dataLocalISO } from '@domain/rules/datas'

interface RegistroRow {
  id: string
  quantidade_ml: number
  created_at: string
}

function paraDominio(row: RegistroRow): RegistroAgua {
  return {
    id: row.id,
    quantidadeMl: row.quantidade_ml,
    criadoEm: new Date(row.created_at),
  }
}

function hojeISO(): string {
  return dataLocalISO()
}

/**
 * Único ponto que conhece as tabelas de água.
 * A meta (agua_meta_ml) vive no profile e chega por parâmetro — o
 * repositório de água não lê profiles, mantém a responsabilidade única.
 */
export const aguaRepository = {
  /** Registros de hoje (para montar o AguaDoDia com histórico). */
  async registrosDeHoje(): Promise<RegistroAgua[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data, error } = await supabase
      .from('registros_agua')
      .select('id, quantidade_ml, created_at')
      .eq('user_id', userId)
      .eq('data', hojeISO())
      .order('created_at', { ascending: false })
      .returns<RegistroRow[]>()

    if (error) throw error
    return (data ?? []).map(paraDominio)
  },

  /** Monta o estado do dia juntando os registros com a meta do perfil. */
  async aguaDoDia(metaMl: number): Promise<AguaDoDia> {
    const registros = await this.registrosDeHoje()
    const totalMl = registros.reduce((s, r) => s + r.quantidadeMl, 0)
    return { totalMl, metaMl, registros }
  },

  /**
   * Adiciona um gole. quantidade_ml pode ser negativo? Não: o schema exige
   * > 0. "Desfazer" é remover o último registro, não somar negativo.
   */
  async adicionar(quantidadeMl: number): Promise<RegistroAgua> {
    if (quantidadeMl <= 0) throw new Error('quantidade_invalida')
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data, error } = await supabase
      .from('registros_agua')
      .insert({ user_id: userId, quantidade_ml: quantidadeMl, data: hojeISO() })
      .select('id, quantidade_ml, created_at')
      .single<RegistroRow>()

    if (error) throw error
    return paraDominio(data)
  },

  /** Remove um registro específico (o "menos" do card = apagar o último). */
  async remover(registroId: string): Promise<void> {
    const { error } = await supabase
      .from('registros_agua')
      .delete()
      .eq('id', registroId)
    if (error) throw error
  },
}
