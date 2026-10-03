import { supabase } from '@data/supabase/client'

export const MOMENTOS_LIFE = ['manha', 'meio_dia', 'noite'] as const
export type MomentoLife = (typeof MOMENTOS_LIFE)[number]

export interface PreferenciasContato {
  readonly lifeLigado: boolean
  readonly lifeMomentos: readonly MomentoLife[]
}

/**
 * "Life puxa conversa" no chat (Perfil > Notificações). Só se grava pela RPC
 * salvar_preferencias_contato: ela valida e registra cada aceite num log que
 * não pode ser apagado (db/athoslife_preferencias_contato_migration.sql).
 *
 * WhatsApp ficou pra uma versão futura (decisão do dono, 2026-10-03): a RPC
 * ainda pede opções/telefone, então vai lista vazia e o telefone que já está
 * no perfil (mandar null apagaria o número).
 */
export const contatoRepository = {
  async buscar(): Promise<PreferenciasContato> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { data, error } = await supabase
      .from('profiles')
      .select('life_chat_ligado, life_chat_momentos')
      .eq('id', userId)
      .single<{ life_chat_ligado: boolean | null; life_chat_momentos: string[] | null }>()
    if (error) throw error
    return {
      lifeLigado: data.life_chat_ligado ?? false,
      lifeMomentos: (data.life_chat_momentos ?? []).filter((m): m is MomentoLife =>
        (MOMENTOS_LIFE as readonly string[]).includes(m),
      ),
    }
  },

  async salvar(p: PreferenciasContato): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const atual = await supabase
      .from('profiles')
      .select('telefone')
      .eq('id', userId)
      .single<{ telefone: string | null }>()
    if (atual.error) throw atual.error
    const { error } = await supabase.rpc('salvar_preferencias_contato', {
      p_life_ligado: p.lifeLigado,
      p_life_momentos: p.lifeMomentos,
      p_whatsapp_opcoes: [],
      p_telefone: atual.data.telefone,
    })
    if (error) throw error
  },
}
