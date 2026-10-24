import { supabase } from '@data/supabase/client'
import { exigirRede, lerComCache } from '@data/offline/cache'
import { usuarioId } from '@data/offline/usuario'
import { paraEnvio, type PlanoTreinoGerado } from '@domain/rules/geradorTreino'
import {
  paraEnvioDieta,
  type ParametrosDieta,
  type PlanoDietaGerado,
  type TipoRefeicaoPlano,
} from '@domain/rules/geradorDieta'
import { localidadeAtual } from '@data/localidadeAtual'
import {
  CIENTE_VERSAO,
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
  ciente_orientacao: boolean | null
  criado_em: string
}

function paraDominio(r: TriagemRow): TriagemVigente {
  return {
    id: r.id,
    aptoTreino: r.apto_treino,
    aptoDieta: r.apto_dieta,
    motivos: (r.motivos ?? []) as MotivoTriagem[],
    cienteOrientacao: r.ciente_orientacao === true,
    criadoEm: new Date(r.criado_em),
  }
}

/** Plano de dieta já aplicado, como o SERVIDOR gravou (nomes e macros tirados da base). */
export interface ItemPlanoDietaSalvo {
  readonly nome: string
  readonly gramas: number
  readonly porcaoG: number
  readonly calorias: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
}

export interface PlanoDietaSalvo {
  readonly id: string
  readonly criadoEm: Date
  readonly parametros: ParametrosDieta
  readonly metas: { kcal: number; proteina: number; carboidrato: number; gordura: number }
  readonly refeicoes: readonly { tipo: TipoRefeicaoPlano; itens: readonly ItemPlanoDietaSalvo[] }[]
}

interface ItemSalvoRow {
  nome: string
  nome_en: string | null
  nome_es: string | null
  gramas: number
  porcao_g: number | null
  calorias: number
  proteina: number
  carboidrato: number
  gordura: number
}

interface PlanoGeradoRow {
  id: string
  criado_em: string
  parametros: ParametrosDieta & { metas: PlanoDietaSalvo['metas'] }
  plano: { tipo: TipoRefeicaoPlano; itens: ItemSalvoRow[] }[]
}

function nomeNoIdioma(i: ItemSalvoRow): string {
  const { idioma } = localidadeAtual()
  if (idioma === 'en') return i.nome_en || i.nome
  if (idioma === 'es') return i.nome_es || i.nome
  return i.nome
}

function codigoErroPlano(m: string): string {
  return (
    [
      'premium_required',
      'triagem_necessaria',
      'triagem_ciente_necessaria',
      'triagem_bloqueada',
      'perfil_incompleto',
    ].find((c) => m.includes(c)) ??
    (m.includes('plano_invalido') ? 'plano_invalido' : m)
  )
}

/**
 * Único ponto que conhece triagens_saude / planos_gerados / aplicar_plano_treino.
 * A aptidão que volta daqui é a calculada pelo banco — o app nunca decide.
 */
export const planosRepository = {
  async triagemVigente(): Promise<TriagemVigente | null> {
    const row = await lerComCache('triagem:vigente', async () => {
      const { data, error } = await supabase.rpc('triagem_vigente')
      if (error) throw error
      return ((Array.isArray(data) ? data[0] : data) as TriagemRow | undefined) ?? null
    })
    return row ? paraDominio(row) : null
  },

  /**
   * Grava o check de saúde com a declaração de veracidade e, se a pessoa
   * teve ressalva e quis o plano mesmo assim, a declaração de ciente. Linha
   * imutável (sem UPDATE/DELETE); o trigger ignora qualquer aptidão mandada
   * daqui. Pra declarar ciente depois, grava uma linha nova (histórico fica).
   */
  async enviarTriagem(params: {
    respostas: RespostasTriagem
    dataNascimento: string
    ciente: boolean
  }): Promise<TriagemVigente> {
    exigirRede()
    const userId = await usuarioId()
    const { error } = await supabase.from('triagens_saude').insert({
      user_id: userId,
      versao: VERSAO_TRIAGEM,
      respostas: params.respostas,
      data_nascimento: params.dataNascimento,
      declaracao_versao: DECLARACAO_VERSAO,
      declaracao_aceita: true,
      ciente_orientacao: params.ciente,
      ciente_versao: params.ciente ? CIENTE_VERSAO : null,
    })
    if (error) {
      if (error.message.includes('data_nascimento_invalida')) throw new Error('data_nascimento_invalida')
      throw error
    }
    const vigente = await this.triagemVigente()
    if (!vigente) throw new Error('triagem_nao_encontrada')
    return vigente
  },

  /**
   * Quem na hora escolheu "vou procurar um médico" e depois quer o plano:
   * grava uma linha NOVA com as mesmas respostas + declaração de ciente
   * (a anterior fica no histórico, nada é alterado).
   */
  async declararCiente(): Promise<TriagemVigente> {
    exigirRede()
    const userId = await usuarioId()
    const { data: ultima, error: e1 } = await supabase
      .from('triagens_saude')
      .select('versao, respostas, data_nascimento')
      .eq('user_id', userId)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle<{ versao: string; respostas: Record<string, boolean>; data_nascimento: string }>()
    if (e1) throw e1
    if (!ultima) throw new Error('triagem_necessaria')
    const { error } = await supabase.from('triagens_saude').insert({
      user_id: userId,
      versao: ultima.versao,
      respostas: ultima.respostas,
      data_nascimento: ultima.data_nascimento,
      declaracao_versao: DECLARACAO_VERSAO,
      declaracao_aceita: true,
      ciente_orientacao: true,
      ciente_versao: CIENTE_VERSAO,
    })
    if (error) throw error
    const vigente = await this.triagemVigente()
    if (!vigente) throw new Error('triagem_nao_encontrada')
    return vigente
  },

  /** Troca a ficha do local pelo plano. O servidor revalida tudo; erro vem com o motivo. */
  async aplicarPlanoTreino(plano: PlanoTreinoGerado): Promise<string> {
    // O servidor revalida a triagem de saúde: só com rede.
    exigirRede()
    const { data, error } = await supabase.rpc('aplicar_plano_treino', paraEnvio(plano))
    if (error) throw new Error(codigoErroPlano(error.message))
    return String(data)
  },

  /** Metas + cardápio de referência. O servidor recalcula e confere tudo; erro vem com o motivo. */
  async aplicarPlanoDieta(plano: PlanoDietaGerado): Promise<string> {
    exigirRede()
    const { data, error } = await supabase.rpc('aplicar_plano_dieta', paraEnvioDieta(plano))
    if (error) throw new Error(codigoErroPlano(error.message))
    return String(data)
  },

  /** Último plano de dieta aplicado (ou null). */
  async ultimoPlanoDieta(): Promise<PlanoDietaSalvo | null> {
    const data = await lerComCache(
      'plano:dieta',
      async () => {
        const { data: row, error } = await supabase
          .from('planos_gerados')
          .select('id, criado_em, parametros, plano')
          .eq('tipo', 'dieta')
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle<PlanoGeradoRow>()
        if (error) throw error
        return row
      },
      { padrao: null },
    )
    if (!data) return null
    return {
      id: data.id,
      criadoEm: new Date(data.criado_em),
      parametros: data.parametros,
      metas: data.parametros.metas,
      refeicoes: data.plano.map((r) => ({
        tipo: r.tipo,
        itens: r.itens.map((i) => ({
          nome: nomeNoIdioma(i),
          gramas: Number(i.gramas),
          porcaoG: i.porcao_g ?? 100,
          calorias: Number(i.calorias),
          proteina: Number(i.proteina),
          carboidrato: Number(i.carboidrato),
          gordura: Number(i.gordura),
        })),
      })),
    }
  },
}
