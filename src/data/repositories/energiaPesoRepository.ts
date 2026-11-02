import { supabase } from '@data/supabase/client'
import { lerComCache, lerDoCache } from '@data/offline/cache'
import { usuarioId } from '@data/offline/usuario'
import { pesoRepository } from './pesoRepository'
import type { ItemKcal, PesoDia } from '@domain/rules/energiaPeso'
import { dataLocalISO } from '@domain/rules/datas'

interface Periodo {
  itens: { data: string; calorias: number | null }[]
  pesos: { data: string; peso_kg: number }[]
}

/**
 * Dados do card "Energia e peso": calorias item a item (`itens_refeicao`,
 * a mesma fonte da Dieta e do scanner) e pesagens (`registros_peso`, 1 por
 * dia) de um intervalo. Só leitura, com o login do próprio usuário.
 *
 * Sem rede: a última cópia do período, com os dias que a Dieta e o peso já
 * têm na cópia local (inclusive o que foi registrado offline) por cima.
 */
export const energiaPesoRepository = {
  async periodo(desde: string, ate: string): Promise<{ itens: ItemKcal[]; pesos: PesoDia[] }> {
    const userId = await usuarioId()

    const r = await lerComCache<Periodo>(
      'energia-peso',
      async () => {
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
        return { itens: itensRes.data ?? [], pesos: pesosRes.data ?? [] }
      },
      { padrao: { itens: [], pesos: [] }, ajustarCopia: (c) => comCopiasDoDia(c, desde, ate) },
    )

    const dentro = (d: string) => d >= desde && d <= ate
    return {
      itens: r.itens.filter((i) => dentro(i.data)),
      pesos: r.pesos.filter((p) => dentro(p.data)).map((p) => ({ data: p.data, pesoKg: p.peso_kg })),
    }
  },
}

async function comCopiasDoDia(c: Periodo, desde: string, ate: string): Promise<Periodo> {
  let itens = c.itens
  const d = new Date(`${desde}T12:00:00`)
  const fim = new Date(`${ate}T12:00:00`)
  for (; d <= fim; d.setDate(d.getDate() + 1)) {
    const dia = dataLocalISO(d)
    const doDia = await lerDoCache<{ calorias: number }[]>(`itens:${dia}`)
    if (doDia) itens = [...itens.filter((i) => i.data !== dia), ...doDia.map((i) => ({ data: dia, calorias: i.calorias }))]
  }
  const pesos = await pesoRepository.linhas().catch(() => c.pesos)
  return { itens, pesos }
}
