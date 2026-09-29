import { supabase } from '@data/supabase/client'
import { paraEnvio, type PlanoTreinoGerado } from '@domain/rules/geradorTreino'
import {
  DECLARACAO_VERSAO,
  VERSAO_TRIAGEM,
  type MotivoTriagem,
  type RespostasTriagem,
  type TriagemVigente,
} from '@domain/rules/triagemSaude'

interface TriagemRow {
  id: string
  apto_treino: boolean
  apto_dieta: boolean
  motivos: string[] | null
  criado_em: string
  vence_em: string
}

function paraDominio(r: TriagemRow): TriagemVigente {
  return {
    id: r.id,
    aptoTreino: r.apto_treino,
    aptoDieta: r.apto_dieta,
    motivos: (r.motivos ?? []) as MotivoTriagem[],
    criadoEm: new Date(r.criado_em),
    venceEm: new Date(r.vence_em),
  }
}

/**
 * Único ponto que conhece triagens_saude / planos_gerados / aplicar_plano_treino.
 * A aptidão que volta daqui é a calculada pelo banco — o app nunca decide.
 */
export const planosRepository = {
  async triagemVigente(): Promise<TriagemVigente | null> {
    const { data, error } = await supabase.rpc('triagem_vigente')
    if (error) throw error
    const row = (Array.isArray(data) ? data[0] : data) as TriagemRow | undefined
    return row ? paraDominio(row) : null
  },

  /**
   * Grava a triagem com a declaração de veracidade. Linha imutável (sem
   * UPDATE/DELETE); o trigger ignora qualquer aptidão mandada daqui.
   */
  async enviarTriagem(params: { respostas: RespostasTriagem; dataNascimento: string }): Promise<TriagemVigente> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { error } = await supabase.from('triagens_saude').insert({
      user_id: userId,
      versao: VERSAO_TRIAGEM,
      respostas: params.respostas,
      data_nascimento: params.dataNascimento,
      declaracao_versao: DECLARACAO_VERSAO,
      declaracao_aceita: true,
    })
    if (error) {
      if (error.message.includes('data_nascimento_invalida')) throw new Error('data_nascimento_invalida')
      throw error
    }
    const vigente = await this.triagemVigente()
    if (!vigente) throw new Error('triagem_nao_encontrada')
    return vigente
  },

  /** Troca a ficha do local pelo plano. O servidor revalida tudo; erro vem com o motivo. */
  async aplicarPlanoTreino(plano: PlanoTreinoGerado): Promise<string> {
    const { data, error } = await supabase.rpc('aplicar_plano_treino', paraEnvio(plano))
    if (error) {
      const m = error.message
      const codigo =
        ['premium_required', 'triagem_necessaria', 'triagem_inapta'].find((c) => m.includes(c)) ??
        (m.includes('plano_invalido') ? 'plano_invalido' : null)
      throw new Error(codigo ?? m)
    }
    return String(data)
  },
}
