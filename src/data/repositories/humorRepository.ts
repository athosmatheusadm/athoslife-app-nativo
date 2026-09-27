import { supabase } from '@data/supabase/client'
import type { CheckinHumor, NivelHumor } from '@domain/entities/humor'
import { dataLocalISO } from '@domain/rules/datas'

interface HumorRow {
  humor: number
  data: string
}

/**
 * Único ponto que conhece checkins_emocionais.
 * A tabela já existe no banco (humor 1-5, data, RLS por usuário).
 */
export const humorRepository = {
  /** Registra o humor de hoje. Um por dia: se já existe, atualiza. */
  async registrar(nivel: NivelHumor): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const hoje = dataLocalISO()

    // Um check-in por dia: apaga o de hoje (se houver) e insere o novo.
    await supabase
      .from('checkins_emocionais')
      .delete()
      .eq('user_id', userId)
      .eq('data', hoje)

    const { error } = await supabase
      .from('checkins_emocionais')
      .insert({ user_id: userId, humor: nivel, data: hoje })
    if (error) throw error
  },

  /** Humor de hoje, se já registrado (pra não pedir de novo). */
  async deHoje(): Promise<CheckinHumor | null> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const hoje = dataLocalISO()
    const { data, error } = await supabase
      .from('checkins_emocionais')
      .select('humor, data')
      .eq('user_id', userId)
      .eq('data', hoje)
      .maybeSingle<HumorRow>()

    if (error) throw error
    if (!data) return null
    return { nivel: data.humor as NivelHumor, data: new Date(data.data) }
  },

  /** Últimos N dias de humor — matéria-prima para os insights da IA. */
  async ultimos(dias = 14): Promise<CheckinHumor[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const desde = new Date()
    desde.setDate(desde.getDate() - dias)

    const { data, error } = await supabase
      .from('checkins_emocionais')
      .select('humor, data')
      .eq('user_id', userId)
      .gte('data', dataLocalISO(desde))
      .order('data', { ascending: true })
      .returns<HumorRow[]>()

    if (error) throw error
    return (data ?? []).map((r) => ({
      nivel: r.humor as NivelHumor,
      data: new Date(r.data),
    }))
  },
}
