import { supabase } from '@data/supabase/client'

/** Tabelas com dado pessoal do usuário — tudo que entra na exportação (LGPD, direito de portabilidade). */
const TABELAS_EXPORTAVEIS = [
  'itens_refeicao',
  'refeicoes_status',
  'refeicoes_extra',
  'registros_agua',
  'registros_peso',
  'passos_diarios',
  'checkins_emocionais',
  'vicios_user',
  'recaidas',
  'treino_plano',
  'conquistas_user',
  'receitas_favoritas',
  'alimentos_favoritos',
  'life_chat_mensagens',
  'ia_uso_diario',
] as const

/**
 * Único ponto que conhece as ações de privacidade — exportar dado pessoal
 * (portabilidade) e solicitar exclusão de conta.
 *
 * Exclusão NÃO apaga de verdade daqui: o client não tem (e não deveria
 * ter) permissão de apagar `auth.users` — isso precisa de service role.
 * `solicitarExclusao` registra o pedido (mesma tabela de eventos de
 * segurança já existente) e desconecta o usuário; o apagamento de fato é
 * processo manual/backend, não uma promessa vazia de botão que não faz nada.
 */
export const privacidadeRepository = {
  async exportarMeusDados(): Promise<Record<string, unknown>> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const perfil = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (perfil.error) throw perfil.error

    const resultado: Record<string, unknown> = {
      exportado_em: new Date().toISOString(),
      perfil: perfil.data,
    }

    for (const tabela of TABELAS_EXPORTAVEIS) {
      const { data, error } = await supabase.from(tabela).select('*').eq('user_id', userId)
      if (error) throw error
      resultado[tabela] = data ?? []
    }

    return resultado
  },

  async solicitarExclusaoConta(motivo: string | null): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('eventos_seguranca').insert({
      user_id: userId,
      tipo: 'solicitacao_exclusao_conta',
      contexto: motivo,
    })
    if (error) throw error
  },
}
