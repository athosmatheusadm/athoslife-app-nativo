import { supabase } from '@data/supabase/client'
import { dataLocalISO } from '@domain/rules/datas'

export interface PassosDoDia {
  readonly passos: number
  readonly meta: number
}

interface PassosRow {
  passos: number | null
  meta: number | null
}

/**
 * Passos do dia (tabela passos_diarios, 1 registro por dia).
 * Hoje o preenchimento é MANUAL (como no PWA) — o sensor automático via
 * Health Connect fica para o futuro. `registrar` faz upsert do dia.
 */
export const passosRepository = {
  async doDia(metaPadrao: number): Promise<PassosDoDia> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const hoje = dataLocalISO()
    const { data, error } = await supabase
      .from('passos_diarios')
      .select('passos, meta')
      .eq('user_id', userId)
      .eq('data', hoje)
      .maybeSingle<PassosRow>()

    if (error) throw error
    return {
      passos: data?.passos ?? 0,
      meta: data?.meta ?? metaPadrao,
    }
  },

  async registrar(passos: number, meta: number): Promise<void> {
    if (passos < 0) throw new Error('passos_invalido')
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const hoje = dataLocalISO()
    const { error } = await supabase
      .from('passos_diarios')
      .upsert(
        { user_id: userId, passos, meta, data: hoje },
        { onConflict: 'user_id,data' },
      )
    if (error) throw error
  },
}
