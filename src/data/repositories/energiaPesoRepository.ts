import { supabase } from '@data/supabase/client'
import type { ItemKcal, PesoDia } from '@domain/rules/energiaPeso'

/**
 * Dados do card "Energia e peso": calorias item a item (`itens_refeicao`,
 * a mesma fonte da Dieta e do scanner) e pesagens (`registros_peso`, 1 por
 * dia) de um intervalo. Só leitura, com o login do próprio usuário.
 */
export const energiaPesoRepository = {
  async periodo(desde: string, ate: string): Promise<{ itens: ItemKcal[]; pesos: PesoDia[] }> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const [itensRes, pesosRes] = await Promise.all([
      supabase
        .from('itens_refeicao')
        .select('data, calorias')
        .eq('user_id', userId)
        .gte('data', desde)
        .lte('data', ate)
        .limit(3000)
        .returns<{ data: string; calorias: number | null }[]>(),
      supabase
        .from('registros_peso')
        .select('data, peso_kg')
        .eq('user_id', userId)
        .gte('data', desde)
        .lte('data', ate)
        .order('data', { ascending: true })
        .returns<{ data: string; peso_kg: number }[]>(),
    ])
    if (itensRes.error) throw itensRes.error
    if (pesosRes.error) throw pesosRes.error

    return {
      itens: itensRes.data ?? [],
      pesos: (pesosRes.data ?? []).map((r) => ({ data: r.data, pesoKg: r.peso_kg })),
    }
  },
}
