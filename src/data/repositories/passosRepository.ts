import { supabase } from '@data/supabase/client'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import { dataLocalISO } from '@domain/rules/datas'

export interface PassosDoDia {
  readonly passos: number
  readonly meta: number
}

interface PassosRow {
  passos: number | null
  meta: number | null
}

const chaveDia = (dia: string) => `passos:${dia}`

/**
 * Passos do dia (tabela passos_diarios, 1 registro por dia).
 * Hoje o preenchimento é MANUAL (como no PWA) — o sensor automático via
 * Health Connect fica para o futuro. `registrar` faz upsert do dia.
 */
export const passosRepository = {
  async doDia(metaPadrao: number): Promise<PassosDoDia> {
    const userId = await usuarioId()
    const hoje = dataLocalISO()
    const data = await lerComCache(
      chaveDia(hoje),
      async () => {
        const { data: row, error } = await supabase
          .from('passos_diarios')
          .select('passos, meta')
          .eq('user_id', userId)
          .eq('data', hoje)
          .maybeSingle<PassosRow>()
        if (error) throw error
        return row
      },
      { padrao: null },
    )
    return {
      passos: data?.passos ?? 0,
      meta: data?.meta ?? metaPadrao,
    }
  },

  /** Muda só a meta de hoje (dia leve), sem mexer nos passos já registrados. */
  async definirMetaDoDia(meta: number): Promise<void> {
    const atual = await this.doDia(meta)
    await this.registrar(atual.passos, meta)
  },

  async registrar(passos: number, meta: number): Promise<void> {
    if (passos < 0) throw new Error('passos_invalido')
    const userId = await usuarioId()
    const hoje = dataLocalISO()
    await escrever(
      {
        op: 'upsert',
        tabela: 'passos_diarios',
        valores: { user_id: userId, passos, meta, data: hoje },
        onConflict: 'user_id,data',
      },
      () => mexerNoCache<PassosRow | null>(chaveDia(hoje), () => ({ passos, meta })),
    )
  },
}
