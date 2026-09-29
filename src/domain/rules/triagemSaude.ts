/**
 * Check de saúde antes dos planos de referência — v2 (2026-09-29): 5
 * perguntas, respondido UMA vez dentro do chat do Life, e NÃO trava.
 * Regras: docs/PLANOS_TREINO_DIETA_DIRETRIZ.md (seção 2) e
 * db/athoslife_triagem_v2_ciente_migration.sql.
 *
 * Quem decide aptidão, ressalvas e travas é o SERVIDOR (trigger
 * avaliar_triagem + RPCs dos planos); aqui só ficam as chaves, as versões e
 * um espelho pra tela saber o que mostrar antes de gravar.
 */

export const VERSAO_TRIAGEM = 'triagem-v2-2026-09-29'
export const DECLARACAO_VERSAO = 'declaracao-v2-2026-09-29'
export const CIENTE_VERSAO = 'ciente-v1-2026-09-29'

export const PERGUNTAS_TRIAGEM = ['t1', 't2', 't3', 't4', 't5'] as const
export type PerguntaTriagem = (typeof PERGUNTAS_TRIAGEM)[number]
export type RespostasTriagem = Record<PerguntaTriagem, boolean>

export type MotivoTriagem =
  // v2
  | 'coracao'
  | 'condicao_medica'
  | 'lesao_cirurgia'
  | 'alimentar_especial'
  // v1 (triagens antigas continuam valendo)
  | 'cardiaco_pressao'
  | 'dor_no_peito'
  | 'tontura_desmaio'
  | 'doenca_cronica'
  | 'remedio_continuo'
  | 'osteoarticular'
  | 'supervisao_medica'
  | 'dieta_especial'
  | 'transtorno_alimentar'
  | 'cirurgia_recente'
  // as duas
  | 'gestacao_amamentacao'
  | 'menor_de_idade'
  | 'idade_divergente'
  | 'imc_baixo'

export interface TriagemVigente {
  readonly id: string
  readonly aptoTreino: boolean
  readonly aptoDieta: boolean
  readonly motivos: readonly MotivoTriagem[]
  /** Declarou que foi orientado a procurar um médico e quer o plano mesmo assim. */
  readonly cienteOrientacao: boolean
  readonly criadoEm: Date
}

/** Travas que NÃO se resolvem com aceite (igual às RPCs). */
const BLOQUEIO_DURO: readonly MotivoTriagem[] = ['menor_de_idade', 'idade_divergente']

/** Com estes, a dieta só sai em "manter" (igual a aplicar_plano_dieta). */
const DIETA_SO_MANTER: readonly MotivoTriagem[] = [
  'alimentar_especial',
  'transtorno_alimentar',
  'dieta_especial',
  'gestacao_amamentacao',
  'imc_baixo',
  'cirurgia_recente',
]

export function respostasCompletas(r: Partial<RespostasTriagem>): r is RespostasTriagem {
  return PERGUNTAS_TRIAGEM.every((k) => typeof r[k] === 'boolean')
}

/** Alguma resposta "Sim"? (espelho — o servidor recalcula tudo). */
export function temRessalva(r: Partial<RespostasTriagem>): boolean {
  return PERGUNTAS_TRIAGEM.some((k) => r[k] === true)
}

export function bloqueioDuro(t: TriagemVigente): boolean {
  return t.motivos.some((m) => BLOQUEIO_DURO.includes(m))
}

export type SituacaoPlano = 'liberado' | 'precisa_ciente' | 'bloqueado'

export function situacaoTreino(t: TriagemVigente): SituacaoPlano {
  if (bloqueioDuro(t)) return 'bloqueado'
  return t.aptoTreino || t.cienteOrientacao ? 'liberado' : 'precisa_ciente'
}

export function situacaoDieta(t: TriagemVigente): SituacaoPlano {
  if (bloqueioDuro(t)) return 'bloqueado'
  return t.aptoDieta || t.cienteOrientacao ? 'liberado' : 'precisa_ciente'
}

/** Treino com ressalva de saúde: só nível iniciante. */
export function treinoSoIniciante(t: TriagemVigente): boolean {
  return !t.aptoTreino
}

/** Dieta com ressalva alimentar/gravidez/IMC baixo: só "manter". */
export function dietaSoManter(t: TriagemVigente): boolean {
  return t.motivos.some((m) => DIETA_SO_MANTER.includes(m))
}
