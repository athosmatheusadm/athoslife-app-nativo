/**
 * Entidades de captura de comida ("scanner").
 *
 * O que a gente chama de "scanner" é, tecnicamente, uma captura por IA:
 * foto -> Gemini Vision identifica e estima os macros -> usuário revisa -> salva.
 * Não é leitor de código de barras (isso não existe no app hoje).
 *
 * TypeScript puro. Sem React, sem Supabase, sem Capacitor.
 */

/** Macros básicos. Reutilizado em toda parte que fala de comida. */
export interface Macros {
  readonly calorias: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
}

/** Categorias que existem no seed da tabela `alimentos`. */
export type CategoriaAlimento =
  | 'proteina'
  | 'carboidrato'
  | 'leguminosa'
  | 'fruta'
  | 'vegetal'
  | 'laticinios'
  | 'gordura_boa'
  | 'suplemento'
  | 'outro'

/** Um alimento canônico vindo da tabela `alimentos` (base confiável). */
export interface AlimentoBase extends Macros {
  readonly id: string
  readonly nome: string
  readonly porcaoG: number
  readonly categoria: CategoriaAlimento | null
  /** Óleo de preparo caseiro (% do peso) — scanner v1.1. Ausente = sem dado. */
  readonly gorduraPreparoPct?: number | null
  /** Ligado à TACO 4ª ed. */
  readonly tacoId?: number | null
  /** Peso de 1 unidade/porção caseira (ovo, fatia de pão, colher de azeite), quando a base sabe. */
  readonly porcaoTipicaG?: number | null
}

/**
 * Item cru como o Gemini Vision devolve.
 * Espelha exatamente o retorno de analyzePhoto (tipo_chamada='vision').
 * São ESTIMATIVAS — nunca tratar como verdade sem revisão.
 */
export interface ItemVisao extends Macros {
  readonly nome: string
  readonly quantidadeG: number
}

/** Resposta completa do Gemini Vision. */
export interface ResultadoVisao {
  readonly descricao: string
  readonly itens: readonly ItemVisao[]
  readonly totais: Macros
  /** 0–100. Confiança geral da IA na leitura. */
  readonly confianca: number
  readonly observacao: string | null
}

/**
 * De onde vieram os macros de um item depois da reconciliação.
 * É isto que a UI mostra como selo de transparência:
 * "conferido na base" pesa mais que "estimativa da IA".
 */
/** 'rotulo' = tabela nutricional do produto, lida pelo código de barras. */
export type FonteMacro = 'base' | 'ia' | 'rotulo'

/**
 * Item já reconciliado e PRONTO PARA EDIÇÃO.
 * É o modelo que a tela de revisão manipula antes de salvar.
 * Mutável de propósito — é um rascunho, não um fato.
 */
export interface ItemRascunho extends Macros {
  /** id estável para key de lista/edição na UI. */
  id: string
  nome: string
  quantidadeG: number
  /** Preenchido quando bateu com a tabela `alimentos`. */
  alimentoBaseId: string | null
  fonte: FonteMacro
  incluir: boolean
  /** Só no scanner v1.1: o que o servidor resolveu e a base pra recalcular. */
  scan?: ItemScanInfo
}

/** Variante de preparo (óleo) do scanner v1.1. */
export type VarianteOleo = 'sem_oleo' | 'caseiro' | 'bastante_oleo'

/** Base nutricional que o servidor manda pra o app recalcular sem IA. */
export interface BaseScan {
  readonly alimentoId: string
  readonly nome: string
  readonly porcaoG: number
  readonly kcal: number | null
  readonly proteina: number | null
  readonly carboidrato: number | null
  readonly gordura: number | null
  readonly gorduraPreparoPct: number | null
  readonly fonte: 'taco' | 'base'
}

export interface ItemScanInfo {
  readonly itemId: string
  readonly nomeVisto: string
  readonly resolucao: 'matched' | 'needs_choice' | 'unresolved'
  /** null = falta a pessoa escolher/buscar o alimento (não salva assim). */
  base: BaseScan | null
  readonly candidatos: readonly BaseScan[]
  variante: VarianteOleo | null
  readonly varianteOrigem: 'padrao' | 'visual' | null
  readonly faixa: { readonly min: number; readonly max: number } | null
  readonly motivos: readonly string[]
  /** Sem número ainda (sem alimento): não entra no total. */
  semNumeros: boolean
}

/** O rascunho completo que a tela de revisão edita e depois confirma. */
export interface RefeicaoRascunho {
  descricao: string
  confianca: number
  itens: ItemRascunho[]
  observacao: string | null
  /** Scanner v1.1: a confirmação vai pro servidor, que recalcula tudo. */
  scan?: { readonly scanId: string; readonly revisao: number; readonly commitKey: string; readonly parcial: boolean }
}

export const MACROS_ZERO: Macros = {
  calorias: 0,
  proteina: 0,
  carboidrato: 0,
  gordura: 0,
}

/** Soma os macros dos itens marcados para inclusão. Base do total exibido. */
export function somarMacros(itens: readonly ItemRascunho[]): Macros {
  return itens.reduce<Macros>((acc, item) => {
    if (!item.incluir || item.scan?.semNumeros) return acc
    return {
      calorias: acc.calorias + item.calorias,
      proteina: acc.proteina + item.proteina,
      carboidrato: acc.carboidrato + item.carboidrato,
      gordura: acc.gordura + item.gordura,
    }
  }, MACROS_ZERO)
}
