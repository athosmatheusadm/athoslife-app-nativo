// ATHOSlife — scanner v1.1: contratos (seção 6 da especificação).
//
// O Gemini só RECONHECE (o que é, preparo, quanto). Nutrientes vêm do
// catálogo (`alimentos`, ligado à TACO), calculados aqui no servidor. O app
// nunca manda nutrientes nem decide cota.

export const SCHEMA_VERSAO = '2'
export const PROMPT_VERSAO = 'scan-2026-10-21'
export const MAX_ITENS = 20

export type Preparo = 'raw' | 'boiled' | 'grilled' | 'fried' | 'baked' | 'unknown'
export type Evidencia = 'visible' | 'user_provided' | 'assumed'
export type Ancora = 'plate' | 'cutlery' | 'glass' | 'hand' | 'package' | 'other'
export type SinalGordura = 'none' | 'some' | 'high' | 'unknown'
export type Unidade = 'g' | 'ml' | 'unit'

/** Item como o Gemini descreve (nomes de campo do contrato da spec). */
export interface ItemVisual {
  localId: string
  name: string
  preparation: Preparo
  representation: 'single_food' | 'composite_dish'
  alternatives: string[]
  amount: { value: number | null; unit: Unidade; lower: number | null; upper: number | null; evidence: Evidencia }
  portionEvidence: 'weak' | 'usable'
  uncertaintyReasons: string[]
  canonicalHint: string | null
  householdMeasure: string | null
  visibleFatSignal: SinalGordura
}

export interface RespostaVisual {
  schemaVersion: '2'
  status: 'ok' | 'recapture' | 'no_food'
  mealTitle: string
  portionAnchors: Ancora[]
  items: ItemVisual[]
  imageIssues: string[]
}

/** Linha do catálogo como o scanner usa (por porção de referência). */
export interface AlimentoCatalogo {
  id: string
  nome: string
  nomeEn: string | null
  nomeEs: string | null
  /** Opcionais: linhas antigas/fixtures sem fr/hi caem no inglês. */
  nomeFr?: string | null
  nomeHi?: string | null
  categoria: string | null
  porcaoG: number
  kcal: number | null
  proteina: number | null
  carboidrato: number | null
  gordura: number | null
  preparo: Exclude<Preparo, 'unknown'> | null
  aliases: string[]
  porcaoTipicaG: number | null
  representacao: 'componentes' | 'prato' | null
  gorduraPreparoPct: number | null
  densidadeGMl: number | null
  tacoId: number | null
  /** false = fora do reconhecimento (variação de porção, suplemento). */
  scanner: boolean
  medidas: Medida[]
}

export interface Medida {
  medida: string
  gramas: number
  confiavel: boolean
}

export type Variante = 'sem_oleo' | 'caseiro' | 'bastante_oleo'

export interface Nutrientes {
  kcal: number | null
  proteina: number | null
  carboidrato: number | null
  gordura: number | null
}

/** O que o app precisa pra recalcular sozinho (correção sem IA). */
export interface BaseNutricional {
  alimentoId: string
  nome: string
  porcaoG: number
  kcal: number | null
  proteina: number | null
  carboidrato: number | null
  gordura: number | null
  gorduraPreparoPct: number | null
  fonte: 'taco' | 'base'
}

export type Resolucao = 'matched' | 'needs_choice' | 'unresolved'

export type Motivo =
  | 'quantidade_invalida'
  | 'sem_catalogo'
  | 'escolher_alimento'
  | 'porcao_fraca'
  | 'porcao_atipica'
  | 'porcao_divergente'
  | 'faixa_ampla'
  | 'possivel_duplicado'
  | 'prato_montado'
  | 'conversao_estimada'
  | 'sem_densidade'

/** Item resolvido e calculado — é o que vai pro app. */
export interface ItemScan {
  itemId: string
  nomeVisto: string
  resolucao: Resolucao
  base: BaseNutricional | null
  candidatos: BaseNutricional[]
  gramas: number | null
  gramasEstimadas: number | null
  faixa: { min: number; max: number } | null
  medidaCaseira: string | null
  variante: Variante | null
  varianteOrigem: 'padrao' | 'visual' | null
  nutrientes: Nutrientes | null
  motivos: Motivo[]
  incluir: boolean
  canonicalHint: string | null
}

export interface ResultadoScan {
  status: 'ready' | 'needs_review'
  titulo: string
  itens: ItemScan[]
  totais: Nutrientes
  parcial: boolean
  ancoras: Ancora[]
  avisosImagem: string[]
}
