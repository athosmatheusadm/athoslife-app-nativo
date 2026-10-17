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
  'life_memorias',
  'life_checkins',
  'ia_uso_diario',
  'treinos_historico',
  'triagens_saude',
  'planos_gerados',
] as const

/** Pastas `<user_id>/` no Storage com arquivo da pessoa (Storage não apaga por SQL). */
const BUCKETS_DO_USUARIO = ['avatars', 'receitas-criadas'] as const

export type ResultadoExclusao = 'ok' | 'senha_incorreta' | 'muitas_tentativas'

async function chamarExclusao(senha: string, soConferir: boolean): Promise<ResultadoExclusao> {
  const { data, error } = await supabase.rpc('excluir_minha_conta', { p_senha: senha, p_so_conferir: soConferir })
  if (error) throw error
  if (data === 'ok' || data === 'senha_incorreta' || data === 'muitas_tentativas') return data
  throw new Error(String(data))
}

/**
 * Único ponto que conhece as ações de privacidade — exportar dado pessoal
 * (portabilidade) e excluir a conta.
 *
 * Exclusão de verdade (db/athoslife_excluir_conta_migration.sql): a função
 * do banco confere a senha, anonimiza logs e apaga auth.users — o resto cai
 * em cascata. As fotos do Storage saem antes, por aqui, só depois de a
 * senha ser conferida.
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

  async excluirConta(senha: string): Promise<ResultadoExclusao> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const conferida = await chamarExclusao(senha, true)
    if (conferida !== 'ok') return conferida

    for (const bucket of BUCKETS_DO_USUARIO) {
      const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 })
      const caminhos = (data ?? []).map((f) => `${userId}/${f.name}`)
      // Falha aqui não segura a exclusão: a conta sai mesmo assim.
      if (caminhos.length > 0) await supabase.storage.from(bucket).remove(caminhos).catch(() => {})
    }

    return chamarExclusao(senha, false)
  },
}
