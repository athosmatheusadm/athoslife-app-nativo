/**
 * Triagem de saúde antes de qualquer plano de referência — perguntas e
 * regras em docs/PLANOS_TREINO_DIETA_DIRETRIZ.md (seção 2).
 *
 * Quem decide se a pessoa está apta é o SERVIDOR (trigger avaliar_triagem);
 * aqui só ficam as chaves, as versões e o texto que a tela mostra.
 */

export const VERSAO_TRIAGEM = 'triagem-v1-2026-09-28'
export const DECLARACAO_VERSAO = 'declaracao-v1-2026-09-28'
/** Triagem vale 90 dias (igual ao banco). */
export const VALIDADE_TRIAGEM_DIAS = 90

export const PERGUNTAS_TRIAGEM = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11'] as const
export type PerguntaTriagem = (typeof PERGUNTAS_TRIAGEM)[number]
export type RespostasTriagem = Record<PerguntaTriagem, boolean>

export type MotivoTriagem =
  | 'cardiaco_pressao'
  | 'dor_no_peito'
  | 'tontura_desmaio'
  | 'doenca_cronica'
  | 'remedio_continuo'
  | 'osteoarticular'
  | 'supervisao_medica'
  | 'gestacao_amamentacao'
  | 'dieta_especial'
  | 'transtorno_alimentar'
  | 'cirurgia_recente'
  | 'menor_de_idade'
  | 'idade_divergente'
  | 'imc_baixo'

export interface TriagemVigente {
  readonly id: string
  readonly aptoTreino: boolean
  readonly aptoDieta: boolean
  readonly motivos: readonly MotivoTriagem[]
  readonly criadoEm: Date
  readonly venceEm: Date
}

export function respostasCompletas(r: Partial<RespostasTriagem>): r is RespostasTriagem {
  return PERGUNTAS_TRIAGEM.every((k) => typeof r[k] === 'boolean')
}
