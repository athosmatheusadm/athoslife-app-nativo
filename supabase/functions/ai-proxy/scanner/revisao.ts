// ATHOSlife — scanner: do que o Gemini viu ao resultado editável (seções
// 5.1, 7.1, 7.2, 8 e 8.1 da especificação). Tudo determinístico e testável:
// nenhuma IA aqui.

import { nutrientesDaPorcao, somarTotais } from './nutricao.ts'
import { normalizar, paraBase, resolverItem, type Catalogo } from './resolver.ts'
import type { AlimentoCatalogo, ItemScan, ItemVisual, Motivo, RespostaVisual, ResultadoScan, Variante } from './tipos.ts'

/** Limiares iniciais (a calibrar no conjunto de desenvolvimento). */
export const LIMIARES = {
  divergenciaCaseira: 0.4, // gramas × medida caseira
  porcaoMin: 0.25, // × porção típica
  porcaoMax: 4,
  faixaAmpla: 2.5, // superior / inferior
  relevanteKcal: 100, // diferença que justifica perguntar
  relevanteFracao: 0.2, // ... ou 20% do total provisório
}

/** Motivos que impedem salvar o item sem a pessoa resolver. */
export const MOTIVOS_QUE_BLOQUEIAM: ReadonlySet<Motivo> = new Set(['quantidade_invalida', 'sem_catalogo', 'escolher_alimento', 'sem_densidade'])

const NUMEROS: Record<string, number> = {
  meia: 0.5, meio: 0.5, half: 0.5, media: 0.5, um: 1, uma: 1, one: 1, a: 1, an: 1, un: 1, una: 1,
  dois: 2, duas: 2, two: 2, dos: 2, tres: 3, three: 3, quatro: 4, four: 4, cuatro: 4,
}

/** "2 colheres de servir" -> { n: 2, texto: "colheres de servir" }. */
export function lerMedidaCaseira(texto: string): { n: number; texto: string } | null {
  // O número sai antes de normalizar (normalizar apaga "/" e ",").
  const m = texto.trim().toLowerCase().match(/^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[^\s\d]+)\s+(.+)$/)
  if (!m) return null
  let n: number
  if (m[1].includes('/')) {
    const [a, b] = m[1].split('/').map(Number)
    n = a / b
  } else if (/^\d/.test(m[1])) n = Number(m[1].replace(',', '.'))
  else n = NUMEROS[normalizar(m[1])] ?? NaN
  const resto = normalizar(m[2])
  if (!Number.isFinite(n) || n <= 0 || n > 20 || !resto) return null
  return { n, texto: resto }
}

/** Singular grosseiro: "colheres de servir" casa com "colher de servir". */
const singular = (t: string) => t.replace(/\b(\w+?)(es|s)\b/g, '$1')

export function gramasDaMedida(medida: string, a: AlimentoCatalogo): { gramas: number; confiavel: boolean } | null {
  const lida = lerMedidaCaseira(medida)
  if (!lida) return null
  const alvo = singular(lida.texto)
  const m = a.medidas.find((x) => alvo.includes(singular(normalizar(x.medida))))
  return m ? { gramas: lida.n * m.gramas, confiavel: m.confiavel } : null
}

/** Converte a quantidade da foto em gramas, com o motivo quando não dá. */
export function quantidadeEmGramas(
  valor: number | null, unidade: ItemVisual['amount']['unit'], a: AlimentoCatalogo | null,
): { gramas: number | null; motivo: Motivo | null } {
  if (valor === null) return { gramas: null, motivo: 'quantidade_invalida' }
  if (unidade === 'g') return { gramas: valor, motivo: null }
  if (!a) return { gramas: null, motivo: null } // sem alimento ainda: converte depois da escolha
  if (unidade === 'ml') {
    return a.densidadeGMl ? { gramas: valor * a.densidadeGMl, motivo: null } : { gramas: null, motivo: 'sem_densidade' }
  }
  const un = a.medidas.find((m) => m.medida === 'unidade')
  if (!un) return { gramas: null, motivo: 'quantidade_invalida' }
  return { gramas: valor * un.gramas, motivo: un.confiavel ? null : 'conversao_estimada' }
}

function varianteInicial(a: AlimentoCatalogo, item: ItemVisual): { variante: Variante | null; origem: 'padrao' | 'visual' | null } {
  if (a.gorduraPreparoPct === null) return { variante: null, origem: null }
  // Brilho/fritura visível escolhe "bastante óleo". Ausência de sinal NÃO
  // vira "sem óleo": não ver não é evidência de não ter (seção 7.1).
  if (item.visibleFatSignal === 'high') return { variante: 'bastante_oleo', origem: 'visual' }
  return { variante: 'caseiro', origem: 'padrao' }
}

const kcalDe = (a: AlimentoCatalogo, gramas: number | null, idioma: string) =>
  gramas === null ? null : nutrientesDaPorcao(paraBase(a, idioma), gramas, null)?.kcal ?? null

export function montarResultado(visao: RespostaVisual, cat: Catalogo, idioma: string): ResultadoScan {
  const semAncora = visao.portionAnchors.length === 0
  const itens: ItemScan[] = visao.items.map((item, i) => {
    const motivos = new Set<Motivo>()
    const r = resolverItem(item, cat)
    let alimento = r.alimento
    let candidatos = r.candidatos
    let resolucao = r.resolucao

    const q = quantidadeEmGramas(item.amount.value, item.amount.unit, alimento)
    let gramas = q.gramas
    if (q.motivo) motivos.add(q.motivo)
    const gramasEstimadas = gramas

    // Alternativa com diferença relevante: pergunta em vez de escolher calado.
    if (alimento && item.alternatives.length && gramas !== null) {
      for (const alt of item.alternatives) {
        const ra = resolverItem({ ...item, name: alt, canonicalHint: null }, cat)
        if (ra.resolucao !== 'matched' || !ra.alimento || ra.alimento.id === alimento.id) continue
        const k1 = kcalDe(alimento, gramas, idioma), k2 = kcalDe(ra.alimento, gramas, idioma)
        if (k1 !== null && k2 !== null && Math.abs(k1 - k2) > LIMIARES.relevanteKcal) {
          candidatos = [alimento, ra.alimento]
          alimento = null
          resolucao = 'needs_choice'
          break
        }
      }
    }

    if (resolucao === 'unresolved') motivos.add('sem_catalogo')
    if (resolucao === 'needs_choice') motivos.add('escolher_alimento')

    if (alimento && gramas !== null) {
      // Medida caseira como segunda estimativa (seção 5.1).
      if (item.householdMeasure) {
        const c = gramasDaMedida(item.householdMeasure, alimento)
        if (c && Math.abs(c.gramas - gramas) / Math.max(c.gramas, gramas) > LIMIARES.divergenciaCaseira) {
          motivos.add('porcao_divergente')
          if (c.confiavel) gramas = c.gramas
        }
      }
      if (alimento.porcaoTipicaG && (gramas < LIMIARES.porcaoMin * alimento.porcaoTipicaG || gramas > LIMIARES.porcaoMax * alimento.porcaoTipicaG)) {
        motivos.add('porcao_atipica')
      }
    }
    if (semAncora || item.portionEvidence === 'weak') motivos.add('porcao_fraca')
    const { lower, upper } = item.amount
    if (lower !== null && upper !== null && upper / lower > LIMIARES.faixaAmpla) motivos.add('faixa_ampla')

    const v = alimento ? varianteInicial(alimento, item) : { variante: null, origem: null }
    const base = alimento ? paraBase(alimento, idioma) : null
    const fator = gramasEstimadas && item.amount.value ? gramasEstimadas / item.amount.value : null
    return {
      itemId: `it${i + 1}`,
      nomeVisto: item.name,
      resolucao,
      base,
      candidatos: candidatos.map((c) => paraBase(c, idioma)),
      gramas: gramas === null ? null : Math.round(gramas),
      gramasEstimadas: gramasEstimadas === null ? null : Math.round(gramasEstimadas),
      faixa: fator && lower !== null && upper !== null ? { min: Math.round(lower * fator), max: Math.round(upper * fator) } : null,
      medidaCaseira: item.householdMeasure,
      variante: v.variante,
      varianteOrigem: v.origem,
      nutrientes: base && gramas !== null ? nutrientesDaPorcao(base, gramas, v.variante) : null,
      motivos: [...motivos],
      incluir: true,
      canonicalHint: item.canonicalHint,
    }
  })

  marcarDuplicados(visao, itens, cat)

  const { totais, parcial } = somarTotais(itens)
  const bloqueia = itens.some((i) => i.incluir && i.motivos.some((m) => MOTIVOS_QUE_BLOQUEIAM.has(m)))
  return {
    status: bloqueia ? 'needs_review' : 'ready',
    titulo: visao.mealTitle || itens.map((i) => i.base?.nome ?? i.nomeVisto).slice(0, 3).join(', '),
    itens,
    totais,
    parcial,
    ancoras: visao.portionAnchors,
    avisosImagem: visao.imageIssues,
  }
}

/**
 * Seção 8.1: prato inteiro (lasanha, estrogonofe) e os componentes dele não
 * somam juntos. Se veio "Estrogonofe de frango" e também "Frango", o item
 * solto entra desmarcado e sinalizado — a pessoa religa se for outro frango.
 */
function marcarDuplicados(visao: RespostaVisual, itens: ItemScan[], cat: Catalogo) {
  const pratos = itens.filter((it, i) => {
    const a = it.base ? cat.porId.get(it.base.alimentoId) : null
    return visao.items[i].representation === 'composite_dish' || a?.categoria === 'refeicao'
  })
  if (!pratos.length) return
  const nomesPratos = pratos.map((p) => normalizar(`${p.nomeVisto} ${p.base?.nome ?? ''}`))
  for (const it of itens) {
    if (pratos.includes(it)) continue
    const primeira = normalizar(it.base?.nome ?? it.nomeVisto).split(' ')[0]
    if (primeira.length >= 4 && nomesPratos.some((n) => n.split(' ').includes(primeira))) {
      it.motivos.push('possivel_duplicado')
      it.incluir = false
    }
  }
}
