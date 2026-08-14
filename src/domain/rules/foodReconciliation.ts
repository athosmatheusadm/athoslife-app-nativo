import type {
  AlimentoBase,
  ItemRascunho,
  ItemVisao,
  Macros,
  ResultadoVisao,
} from '@domain/entities/food'

/**
 * RECONCILIAÇÃO — o coração do "scanner".
 *
 * Problema que resolve: o Gemini estima os macros de cada item. A tabela
 * `alimentos` tem valores canônicos e confiáveis. Se "frango na foto" e
 * "frango na mão" derem números diferentes, o app se contradiz.
 *
 * Política (decisão de produto, isolada aqui para poder ser afinada):
 *  - Se o item da IA casar com um alimento da base, os macros passam a vir
 *    da BASE, escalados pela porção que a IA estimou. Vira "conferido".
 *  - Se não casar, mantém a estimativa da IA. Vira "estimativa".
 *
 * Assim, foto e busca manual convergem para os mesmos números quando o
 * alimento é conhecido, e a IA cobre só o que a base ainda não tem.
 *
 * Nada aqui depende de framework. É testável isoladamente.
 */

/** Normaliza texto para comparação: minúsculas, sem acento, sem ruído. */
export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Escala os macros de um alimento base (por porção) para a quantidade em gramas.
 * Ex.: frango 165kcal/100g estimado em 150g -> 247kcal.
 */
export function escalarMacros(base: AlimentoBase, quantidadeG: number): Macros {
  const fator = base.porcaoG > 0 ? quantidadeG / base.porcaoG : 0
  const r = (n: number): number => Math.round(n * fator)
  const r1 = (n: number): number => Math.round(n * fator * 10) / 10
  return {
    calorias: r(base.calorias),
    proteina: r1(base.proteina),
    carboidrato: r1(base.carboidrato),
    gordura: r1(base.gordura),
  }
}

/**
 * Acha o melhor alimento da base para um nome vindo da IA.
 * Estratégia deliberadamente simples e explicável (nada de "mágica"):
 *  1) match exato do nome normalizado;
 *  2) um contém o outro (ex.: "arroz" ⊂ "arroz branco cozido");
 *  3) senão, null (a IA assume).
 *
 * Retorna null em vez de chutar. Preferimos "estimativa honesta" a
 * "match errado que polui o dado".
 */
export function encontrarNaBase(
  nomeIA: string,
  base: readonly AlimentoBase[],
): AlimentoBase | null {
  const alvo = normalizarNome(nomeIA)
  if (!alvo) return null

  let contido: AlimentoBase | null = null
  for (const a of base) {
    const nb = normalizarNome(a.nome)
    if (nb === alvo) return a
    if (contido === null && (nb.includes(alvo) || alvo.includes(nb))) {
      contido = a
    }
  }
  return contido
}

/** Gera um id local estável para o rascunho (não é id de banco). */
function idLocal(prefixo: string, i: number): string {
  return `${prefixo}-${i}-${Math.random().toString(36).slice(2, 8)}`
}

/** Reconcilia um único item da visão contra a base. */
export function reconciliarItem(
  item: ItemVisao,
  base: readonly AlimentoBase[],
  indice: number,
): ItemRascunho {
  const encontrado = encontrarNaBase(item.nome, base)

  if (encontrado) {
    const macros = escalarMacros(encontrado, item.quantidadeG)
    return {
      id: idLocal('item', indice),
      nome: encontrado.nome,
      quantidadeG: item.quantidadeG,
      alimentoBaseId: encontrado.id,
      fonte: 'base',
      incluir: true,
      ...macros,
    }
  }

  return {
    id: idLocal('item', indice),
    nome: item.nome,
    quantidadeG: item.quantidadeG,
    alimentoBaseId: null,
    fonte: 'ia',
    incluir: true,
    calorias: item.calorias,
    proteina: item.proteina,
    carboidrato: item.carboidrato,
    gordura: item.gordura,
  }
}

/**
 * Transforma a resposta crua do Gemini num rascunho editável e reconciliado.
 * É este rascunho que a tela de revisão recebe. Todo item entra com
 * `incluir: true` — o usuário desmarca o que a IA errou.
 */
export function montarRascunho(
  visao: ResultadoVisao,
  base: readonly AlimentoBase[],
): {
  descricao: string
  confianca: number
  observacao: string | null
  itens: ItemRascunho[]
} {
  return {
    descricao: visao.descricao,
    confianca: visao.confianca,
    observacao: visao.observacao,
    itens: visao.itens.map((item, i) => reconciliarItem(item, base, i)),
  }
}
