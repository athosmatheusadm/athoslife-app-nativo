import { mexerNoCache } from '@data/offline/cache'
import { escrever } from '@data/offline/fila'
import { linhaDoPerfil } from './profileRepository'

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
    const data = await linhaDoPerfil()
    return {
      lifeLigado: data.life_chat_ligado ?? false,
      lifeMomentos: (data.life_chat_momentos ?? []).filter((m): m is MomentoLife =>
        (MOMENTOS_LIFE as readonly string[]).includes(m),
      ),
    }
  },

  async salvar(p: PreferenciasContato): Promise<void> {
    const atual = await linhaDoPerfil()
    await escrever(
      {
        op: 'rpc',
        fn: 'salvar_preferencias_contato',
        args: {
          p_life_ligado: p.lifeLigado,
          p_life_momentos: p.lifeMomentos,
          p_whatsapp_opcoes: [],
          p_telefone: atual.telefone ?? null,
        },
      },
      () =>
        mexerNoCache<Record<string, unknown> | null>('perfil', (row) =>
          row ? { ...row, life_chat_ligado: p.lifeLigado, life_chat_momentos: [...p.lifeMomentos] } : undefined,
        ),
    )
  },
}
