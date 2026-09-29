import type { Sexo } from '@domain/entities/profile'

/**
 * Gerador do PLANO DE REFERÊNCIA de dieta — regras em
 * docs/PLANOS_TREINO_DIETA_DIRETRIZ.md (seção 5). TypeScript puro e
 * determinístico: mesmas escolhas -> mesmo plano.
 *
 * Duas partes:
 *   1. Meta de referência (kcal + macros) por fórmula pública, com pisos.
 *   2. Cardápio de UM dia-modelo com alimentos simples da base, tudo trocável.
 *
 * Nada de "zero carbo", jejum, restrição agressiva ou suplemento. O servidor
 * (RPC aplicar_plano_dieta) recalcula a meta a partir do perfil e confere o
 * cardápio item a item antes de gravar — isto aqui só avisa antes.
 */

export const VERSAO_GERADOR_DIETA = 'dieta-v1-2026-09-29'

export type ObjetivoDieta = 'emagrecer' | 'manter' | 'massa'
export type RitmoDieta = 'leve' | 'moderado'
export type AtividadeDieta = 'sedentario' | 'leve' | 'moderado' | 'alto'
export type RestricaoDieta = 'vegetariano' | 'sem_lactose' | 'sem_gluten'
export type TipoRefeicaoPlano = 'cafe' | 'almoco' | 'lanche' | 'jantar'

export interface ParametrosDieta {
  readonly objetivo: ObjetivoDieta
  /** Só vale pra emagrecer / massa. */
  readonly ritmo: RitmoDieta
  readonly atividade: AtividadeDieta
  readonly refeicoes: 3 | 4
  readonly restricoes: readonly RestricaoDieta[]
  /** Alimentos que a pessoa não come (alergia / não gosta), texto livre. */
  readonly evitar: readonly string[]
}

export interface CorpoDieta {
  readonly pesoKg: number
  readonly alturaCm: number
  readonly idade: number
  readonly sexo: Sexo | null
}

/** Mesmos números do banco (aplicar_plano_dieta). Mudou aqui? Mude lá e a versão. */
export const FATOR_ATIVIDADE: Record<AtividadeDieta, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  alto: 1.725,
}
/** Perda semanal alvo, em fração do peso (diretriz: no máximo ~0,5–1%). */
export const RITMO_PERDA: Record<RitmoDieta, number> = { leve: 0.005, moderado: 0.0075 }
/** Superávit sobre o gasto pra ganho de massa. */
export const RITMO_GANHO: Record<RitmoDieta, number> = { leve: 0.05, moderado: 0.1 }
export const PISO_KCAL = 1200
export const PISO_CARBO_G = 130
/** Abaixo disto não monta plano de emagrecimento (IMC < 18,5 já bloqueia a dieta na triagem). */
export const IMC_MIN_EMAGRECER = 20
const KCAL_POR_KG = 7700
const PROTEINA_G_KG: Record<ObjetivoDieta, number> = { emagrecer: 1.8, manter: 1.6, massa: 2 }

export interface MetasDieta {
  readonly basal: number
  readonly gasto: number
  readonly kcal: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
  readonly aguaMl: number
  /** Estimativa de variação por semana em kg (negativo = perda). Só informativo. */
  readonly variacaoSemanalKg: number
}

export function imc(c: CorpoDieta): number {
  return c.pesoKg / (c.alturaCm / 100) ** 2
}

/**
 * Com IMC >= 30, proteína por peso AJUSTADO (peso do IMC 25 + 25% do
 * excedente) — g/kg do peso total daria meta irreal (ex.: 198 g pra 110 kg).
 */
export function pesoParaProteina(c: CorpoDieta): number {
  const pesoImc25 = 25 * (c.alturaCm / 100) ** 2
  if (imc(c) < 30) return c.pesoKg
  return pesoImc25 + 0.25 * (c.pesoKg - pesoImc25)
}

export function basalMifflin(c: CorpoDieta): number {
  const constante = c.sexo === 'masculino' ? 5 : c.sexo === 'feminino' ? -161 : -78
  return 10 * c.pesoKg + 6.25 * c.alturaCm - 5 * c.idade + constante
}

export function calcularMetasDieta(c: CorpoDieta, p: ParametrosDieta): MetasDieta {
  const basal = basalMifflin(c)
  const gasto = basal * FATOR_ATIVIDADE[p.atividade]

  let alvo = gasto
  if (p.objetivo === 'emagrecer') {
    const deficit = Math.min((c.pesoKg * RITMO_PERDA[p.ritmo] * KCAL_POR_KG) / 7, gasto * 0.25)
    alvo = Math.max(gasto - deficit, basal, PISO_KCAL)
  } else if (p.objetivo === 'massa') {
    alvo = gasto * (1 + RITMO_GANHO[p.ritmo])
  }
  let kcal = Math.round(alvo / 10) * 10

  const proteina = Math.round(pesoParaProteina(c) * PROTEINA_G_KG[p.objetivo])
  let gordura = Math.round((kcal * 0.28) / 9)
  let carboidrato = Math.round((kcal - proteina * 4 - gordura * 9) / 4)

  // Piso de carboidrato: primeiro baixa a gordura até 20% / 0,6 g/kg; se ainda
  // faltar, sobe as calorias — nunca entrega "low carb" radical.
  if (carboidrato < PISO_CARBO_G) {
    gordura = Math.round(Math.max((kcal * 0.2) / 9, c.pesoKg * 0.6))
    carboidrato = Math.round((kcal - proteina * 4 - gordura * 9) / 4)
  }
  if (carboidrato < PISO_CARBO_G) {
    carboidrato = PISO_CARBO_G
    kcal = Math.round((proteina * 4 + carboidrato * 4 + gordura * 9) / 10) * 10
  }

  return {
    basal: Math.round(basal),
    gasto: Math.round(gasto),
    kcal,
    proteina,
    carboidrato,
    gordura,
    aguaMl: Math.round((c.pesoKg * 35) / 250) * 250,
    variacaoSemanalKg: Math.round((((kcal - gasto) * 7) / KCAL_POR_KG) * 100) / 100,
  }
}

// ---------------------------------------------------------------
// Cardápio
// ---------------------------------------------------------------

/** Alimento da base como o gerador precisa (macros POR PORÇÃO, como no banco). */
export interface AlimentoPlano {
  readonly id: string
  /** Nome no idioma da pessoa. */
  readonly nome: string
  /** Nome original (pt) — usado pra casar restrições em qualquer idioma. */
  readonly nomeBase: string
  readonly categoria: string | null
  readonly porcaoG: number
  readonly calorias: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
}

export type PapelItem =
  | 'carbo_cafe'
  | 'proteina_cafe'
  | 'fruta'
  | 'carbo'
  | 'leguminosa'
  | 'proteina'
  | 'vegetal'
  | 'azeite'
  | 'lanche'

/**
 * Alimentos simples e comuns, em ordem de preferência, por papel no prato.
 * São nomes da base (pt). Ficam de fora de propósito: fritura, embutido,
 * doce, bebida açucarada e suplemento.
 */
export const OPCOES_POR_PAPEL: Record<PapelItem, readonly string[]> = {
  carbo_cafe: ['Pão integral', 'Pão francês', 'Aveia em flocos', 'Tapioca (goma seca)', 'Cuscuz nordestino', 'Pão de forma integral'],
  proteina_cafe: ['Ovo cozido', 'Iogurte natural integral', 'Queijo minas frescal', 'Ovo mexido sem óleo', 'Iogurte grego natural', 'Peito de peru fatiado', 'Tofu firme'],
  fruta: ['Banana prata', 'Mamão papaia', 'Maçã fuji', 'Morango', 'Laranja pera', 'Melão', 'Abacaxi', 'Manga palmer', 'Pera', 'Kiwi', 'Uva itália'],
  carbo: ['Arroz branco cozido', 'Arroz integral cozido', 'Batata doce cozida', 'Batata inglesa cozida', 'Macarrão integral cozido', 'Mandioca cozida', 'Quinoa cozida'],
  leguminosa: ['Feijão carioca cozido', 'Feijão preto cozido', 'Lentilha cozida', 'Grão-de-bico cozido'],
  proteina: ['Frango peito grelhado', 'Patinho grelhado sem óleo', 'Tilápia grelhada', 'Carne moída patinho cozida', 'Ovo cozido', 'Salmão grelhado', 'Atum em lata em água', 'Sardinha assada', 'Tofu firme'],
  vegetal: ['Brócolis cozido', 'Alface', 'Tomate', 'Cenoura cozida', 'Abobrinha cozida', 'Chuchu cozido', 'Pepino cru'],
  azeite: ['Azeite de oliva'],
  lanche: ['Iogurte natural integral', 'Iogurte grego natural', 'Castanha de caju', 'Amendoim torrado', 'Pasta de amendoim', 'Queijo minas frescal', 'Iogurte natural desnatado'],
}

export const NOMES_BASE_PLANO: readonly string[] = [...new Set(Object.values(OPCOES_POR_PAPEL).flat())]

/** Parte da refeição que cada papel ocupa (o que sobra depois dos itens fixos). */
const MOLDE: Record<TipoRefeicaoPlano, readonly { papel: PapelItem; fatia: number }[]> = {
  cafe: [
    { papel: 'carbo_cafe', fatia: 0.45 },
    { papel: 'proteina_cafe', fatia: 0.35 },
    { papel: 'fruta', fatia: 0.2 },
  ],
  almoco: [
    { papel: 'carbo', fatia: 0.4 },
    { papel: 'leguminosa', fatia: 0.18 },
    { papel: 'proteina', fatia: 0.42 },
    { papel: 'vegetal', fatia: 0 },
    { papel: 'azeite', fatia: 0 },
  ],
  lanche: [
    { papel: 'fruta', fatia: 0.4 },
    { papel: 'lanche', fatia: 0.6 },
  ],
  jantar: [
    { papel: 'carbo', fatia: 0.4 },
    { papel: 'leguminosa', fatia: 0.18 },
    { papel: 'proteina', fatia: 0.42 },
    { papel: 'vegetal', fatia: 0 },
    { papel: 'azeite', fatia: 0 },
  ],
}

/** Itens de quantidade fixa (não entram na divisão de calorias). */
const GRAMAS_FIXAS: Partial<Record<PapelItem, number>> = { vegetal: 100, azeite: 5 }

const LIMITES_G: Record<PapelItem, readonly [number, number]> = {
  carbo_cafe: [25, 150],
  proteina_cafe: [30, 250],
  fruta: [80, 250],
  carbo: [50, 350],
  leguminosa: [50, 250],
  proteina: [60, 250],
  vegetal: [50, 200],
  azeite: [5, 10],
  lanche: [15, 250],
}

const DIVISAO: Record<3 | 4, Partial<Record<TipoRefeicaoPlano, number>>> = {
  3: { cafe: 0.3, almoco: 0.4, jantar: 0.3 },
  4: { cafe: 0.25, almoco: 0.35, lanche: 0.15, jantar: 0.25 },
}

export interface ItemCardapio {
  readonly papel: PapelItem
  /** Opções válidas pra este papel (já filtradas pelas restrições). */
  readonly opcoes: readonly AlimentoPlano[]
  readonly indice: number
  readonly alvoKcal: number
  readonly gramas: number
}

export interface RefeicaoCardapio {
  readonly tipo: TipoRefeicaoPlano
  readonly alvoKcal: number
  readonly itens: readonly ItemCardapio[]
}

export interface PlanoDietaGerado {
  readonly parametros: ParametrosDieta
  readonly metas: MetasDieta
  readonly refeicoes: readonly RefeicaoCardapio[]
}

export interface MacrosItem {
  readonly calorias: number
  readonly proteina: number
  readonly carboidrato: number
  readonly gordura: number
}

export function alimentoDoItem(i: ItemCardapio): AlimentoPlano {
  return i.opcoes[i.indice % i.opcoes.length]!
}

export function macrosDoItem(i: ItemCardapio): MacrosItem {
  const a = alimentoDoItem(i)
  const f = i.gramas / a.porcaoG
  return {
    calorias: Math.round(a.calorias * f),
    proteina: Math.round(a.proteina * f * 10) / 10,
    carboidrato: Math.round(a.carboidrato * f * 10) / 10,
    gordura: Math.round(a.gordura * f * 10) / 10,
  }
}

export function totaisDoPlano(refeicoes: readonly RefeicaoCardapio[]): MacrosItem {
  let calorias = 0
  let proteina = 0
  let carboidrato = 0
  let gordura = 0
  for (const r of refeicoes) {
    for (const i of r.itens) {
      const m = macrosDoItem(i)
      calorias += m.calorias
      proteina += m.proteina
      carboidrato += m.carboidrato
      gordura += m.gordura
    }
  }
  return { calorias, proteina: Math.round(proteina), carboidrato: Math.round(carboidrato), gordura: Math.round(gordura) }
}

// ---- restrições -------------------------------------------------

function normalizar(t: string): string {
  return ` ${t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

const CARNE = ['frango', 'patinho', 'carne', 'tilapia', 'salmao', 'atum', 'sardinha', 'peru', 'peixe', 'camarao']
const LACTEOS = ['leite', 'queijo', 'iogurte', 'requeijao', 'manteiga', 'cottage']
const GLUTEN = ['pao', 'macarrao', 'aveia', 'trigo', 'centeio', 'cevada', 'cuscuz marroquino']
/** Palavras gerais ("não gosto de frutas") -> todos os itens daquele grupo no cardápio. */
const FRUTAS = ['banana', 'mamao', 'maca', 'morango', 'laranja', 'melao', 'abacaxi', 'manga', 'pera', 'kiwi', 'uva']
const VERDURAS = ['brocolis', 'alface', 'tomate', 'cenoura', 'abobrinha', 'chuchu', 'pepino']

/** Palavra que a pessoa digitou -> termos da base que ela cobre. */
const SINONIMOS: Record<string, readonly string[]> = {
  lactose: LACTEOS,
  leite: LACTEOS,
  laticinios: LACTEOS,
  dairy: LACTEOS,
  lacteos: LACTEOS,
  gluten: GLUTEN,
  trigo: GLUTEN,
  wheat: GLUTEN,
  peixe: ['tilapia', 'salmao', 'atum', 'sardinha', 'peixe'],
  fish: ['tilapia', 'salmao', 'atum', 'sardinha', 'peixe'],
  pescado: ['tilapia', 'salmao', 'atum', 'sardinha', 'peixe'],
  'frutos do mar': ['camarao', 'atum', 'sardinha', 'salmao', 'tilapia'],
  seafood: ['camarao', 'atum', 'sardinha', 'salmao', 'tilapia'],
  ovo: ['ovo', 'omelete'],
  ovos: ['ovo', 'omelete'],
  egg: ['ovo', 'omelete'],
  eggs: ['ovo', 'omelete'],
  huevo: ['ovo', 'omelete'],
  amendoim: ['amendoim'],
  peanut: ['amendoim'],
  mani: ['amendoim'],
  castanha: ['castanha', 'amendoa', 'noz'],
  nuts: ['castanha', 'amendoa', 'noz', 'amendoim'],
  soja: ['soja', 'tofu'],
  soy: ['soja', 'tofu'],
  carne: ['patinho', 'carne'],
  fruta: FRUTAS,
  frutas: FRUTAS,
  fruit: FRUTAS,
  fruits: FRUTAS,
  verdura: VERDURAS,
  verduras: VERDURAS,
  legume: VERDURAS,
  legumes: VERDURAS,
  vegetais: VERDURAS,
  vegetables: VERDURAS,
  beef: ['patinho', 'carne'],
  frango: ['frango'],
  chicken: ['frango'],
  pollo: ['frango'],
  feijao: ['feijao'],
  beans: ['feijao'],
}

/** Termos (normalizados) que tiram um alimento do cardápio. */
export function termosBloqueados(p: Pick<ParametrosDieta, 'restricoes' | 'evitar'>): string[] {
  const termos = new Set<string>()
  if (p.restricoes.includes('vegetariano')) CARNE.forEach((t) => termos.add(t))
  if (p.restricoes.includes('sem_lactose')) LACTEOS.forEach((t) => termos.add(t))
  if (p.restricoes.includes('sem_gluten')) GLUTEN.forEach((t) => termos.add(t))
  for (const cru of p.evitar) {
    const n = normalizar(cru).trim()
    if (n.length < 3) continue
    termos.add(n)
    SINONIMOS[n]?.forEach((t) => termos.add(t))
  }
  return [...termos]
}

function permitido(a: AlimentoPlano, termos: readonly string[]): boolean {
  const nomes = normalizar(a.nomeBase) + normalizar(a.nome)
  return !termos.some((t) => nomes.includes(` ${t} `) || nomes.includes(` ${t}`))
}

// ---- quantidades ------------------------------------------------

/** Até quantas unidades de um item "de unidade" (2 ovos, 3 fatias...) vão numa refeição. */
const MAX_UNIDADES = 3

/** Porção pequena (pão, ovo, fatia, castanha) vai em unidades inteiras; resto de 10 em 10 g. */
function arredondarGramas(a: AlimentoPlano, gramas: number, papel: PapelItem): number {
  const [min, max] = LIMITES_G[papel]
  if (a.porcaoG <= 60) {
    const teto = Math.max(Math.min(Math.floor(max / a.porcaoG), MAX_UNIDADES), 1)
    return Math.min(Math.max(Math.round(gramas / a.porcaoG), 1), teto) * a.porcaoG
  }
  return Math.min(Math.max(Math.round(gramas / 10) * 10, min), max)
}

function gramasPara(a: AlimentoPlano, alvoKcal: number, papel: PapelItem): number {
  const fixa = GRAMAS_FIXAS[papel]
  if (fixa !== undefined) return fixa
  const kcalPorG = a.calorias / a.porcaoG
  return arredondarGramas(a, kcalPorG > 0 ? alvoKcal / kcalPorG : LIMITES_G[papel][0], papel)
}

/** Troca o alimento de um item pelo próximo da lista, mantendo as calorias-alvo. */
export function trocarItem(plano: PlanoDietaGerado, r: number, i: number): PlanoDietaGerado {
  const refeicoes = plano.refeicoes.map((ref, ri) =>
    ri !== r
      ? ref
      : {
          ...ref,
          itens: ref.itens.map((it, ii) => {
            if (ii !== i || it.opcoes.length < 2) return it
            const indice = (it.indice + 1) % it.opcoes.length
            const novo = { ...it, indice }
            return { ...novo, gramas: gramasPara(alimentoDoItem(novo), it.alvoKcal, it.papel) }
          }),
        },
  )
  return { ...plano, refeicoes }
}

export type ErroDieta = 'imc_emagrecer' | 'sem_alimentos' | null

export function validarParametrosDieta(c: CorpoDieta, p: ParametrosDieta): ErroDieta {
  if (p.objetivo === 'emagrecer' && imc(c) < IMC_MIN_EMAGRECER) return 'imc_emagrecer'
  return null
}

/**
 * Monta o dia-modelo. `base` = alimentos da base (NOMES_BASE_PLANO) já no
 * idioma da pessoa. Retorna null se as restrições deixarem algum papel
 * essencial sem opção.
 */
export function gerarPlanoDieta(c: CorpoDieta, p: ParametrosDieta, base: readonly AlimentoPlano[]): PlanoDietaGerado | null {
  const metas = calcularMetasDieta(c, p)
  const termos = termosBloqueados(p)
  const porNome = new Map<string, AlimentoPlano>()
  for (const a of base) if (!porNome.has(a.nomeBase)) porNome.set(a.nomeBase, a)

  const opcoesDo = (papel: PapelItem): AlimentoPlano[] =>
    OPCOES_POR_PAPEL[papel].map((n) => porNome.get(n)).filter((a): a is AlimentoPlano => !!a && permitido(a, termos))

  // Restrição demais (ex.: vegetariano + sem ovo + sem soja) -> sem plano; a tela explica.
  // Fruta e verdura não são essenciais: quem não come, fica sem (a parte da
  // fruta vai pros outros itens da refeição).
  const essenciais: PapelItem[] = ['carbo_cafe', 'carbo', 'proteina']
  if (essenciais.some((papel) => opcoesDo(papel).length === 0)) return null

  const divisao = DIVISAO[p.refeicoes]
  const refeicoes: RefeicaoCardapio[] = []
  // O dia não repete alimento no mesmo papel (fruta do café ≠ do lanche, prato do almoço ≠ jantar).
  const usados = new Set<string>()

  for (const tipo of ['cafe', 'almoco', 'lanche', 'jantar'] as const) {
    const parte = divisao[tipo]
    if (!parte) continue
    const alvoRefeicao = Math.round(metas.kcal * parte)
    const molde = MOLDE[tipo].map((m) => ({ ...m, opcoes: opcoesDo(m.papel) })).filter((m) => m.opcoes.length > 0)

    // Kcal dos fixos (verdura, azeite) sai antes de dividir o resto.
    const fixos = molde
      .filter((m) => GRAMAS_FIXAS[m.papel] !== undefined)
      .reduce((s, m) => s + (m.opcoes[0]!.calorias / m.opcoes[0]!.porcaoG) * GRAMAS_FIXAS[m.papel]!, 0)
    const somaFatias = molde.reduce((s, m) => s + m.fatia, 0) || 1
    const resto = Math.max(alvoRefeicao - fixos, 0)

    const itens: ItemCardapio[] = molde.map((m) => {
      const livre = m.opcoes.findIndex((a) => !usados.has(`${m.papel}:${a.id}`))
      const indice = livre >= 0 ? livre : 0
      usados.add(`${m.papel}:${m.opcoes[indice]!.id}`)
      const alvoKcal = Math.round((resto * m.fatia) / somaFatias)
      const esboco = { papel: m.papel, opcoes: m.opcoes, indice, alvoKcal, gramas: 0 }
      return { ...esboco, gramas: gramasPara(alimentoDoItem(esboco), alvoKcal, m.papel) }
    })
    refeicoes.push({ tipo, alvoKcal: alvoRefeicao, itens })
  }

  return { parametros: p, metas, refeicoes: ajustarProteina(refeicoes, metas.proteina) }
}

/** Se a proteína do dia ficou bem abaixo da meta, reforça a proteína do almoço/jantar (dentro do limite). */
function ajustarProteina(refeicoes: RefeicaoCardapio[], metaProteina: number): RefeicaoCardapio[] {
  const total = totaisDoPlano(refeicoes).proteina
  if (total >= metaProteina * 0.9) return refeicoes
  const fator = Math.min(metaProteina / Math.max(total, 1), 1.5)
  return refeicoes.map((r) => ({
    ...r,
    itens: r.itens.map((it) => {
      if (it.papel !== 'proteina' && it.papel !== 'proteina_cafe') return it
      const a = alimentoDoItem(it)
      const alvoKcal = Math.round(it.alvoKcal * fator)
      return { ...it, alvoKcal, gramas: arredondarGramas(a, it.gramas * fator, it.papel) }
    }),
  }))
}

/** Faixa aceita pelo servidor entre o total do cardápio e a meta. */
export const TOLERANCIA_CARDAPIO = 0.15

export function cardapioDentroDaMeta(plano: PlanoDietaGerado): boolean {
  const kcal = totaisDoPlano(plano.refeicoes).calorias
  return Math.abs(kcal - plano.metas.kcal) <= plano.metas.kcal * TOLERANCIA_CARDAPIO
}

/** Formato que a RPC aplicar_plano_dieta espera. */
export function paraEnvioDieta(plano: PlanoDietaGerado) {
  return {
    p_parametros: {
      objetivo: plano.parametros.objetivo,
      ritmo: plano.parametros.ritmo,
      atividade: plano.parametros.atividade,
      refeicoes: plano.parametros.refeicoes,
      restricoes: plano.parametros.restricoes,
      evitar: plano.parametros.evitar,
    },
    p_metas: {
      kcal: plano.metas.kcal,
      proteina: plano.metas.proteina,
      carboidrato: plano.metas.carboidrato,
      gordura: plano.metas.gordura,
    },
    p_cardapio: plano.refeicoes.map((r) => ({
      tipo: r.tipo,
      itens: r.itens.map((i) => ({ alimento_id: alimentoDoItem(i).id, gramas: i.gramas })),
    })),
    p_gerador_versao: VERSAO_GERADOR_DIETA,
  }
}
