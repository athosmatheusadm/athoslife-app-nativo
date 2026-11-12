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

/**
 * v2 (12/11/2026, pedido do dono — "cardápio fraco"): mais opções por papel,
 * salada crua além do legume cozido, jantar com molde próprio (mais leve que
 * o almoço) e `variante` ("outro cardápio": mesmas metas, outros alimentos).
 * As contas e os pisos das metas não mudaram.
 */
export const VERSAO_GERADOR_DIETA = 'dieta-v2-2026-11-12'

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
  /** 0 = primeiro cardápio; cada "outro cardápio" soma 1 e troca os alimentos. */
  readonly variante?: number
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
  | 'salada'
  | 'azeite'
  | 'lanche'

/**
 * Alimentos simples e comuns, em ordem de preferência, por papel no prato.
 * São nomes da base (pt). Ficam de fora de propósito: fritura, embutido,
 * doce, bebida açucarada e suplemento.
 */
export const OPCOES_POR_PAPEL: Record<PapelItem, readonly string[]> = {
  carbo_cafe: ['Pão integral', 'Tapioca (goma seca)', 'Aveia em flocos', 'Pão francês', 'Cuscuz nordestino', 'Pão de aveia', 'Pão de forma integral'],
  proteina_cafe: ['Ovo cozido', 'Iogurte natural integral', 'Queijo minas frescal', 'Ovo mexido sem óleo', 'Iogurte grego natural', 'Queijo ricota', 'Peito de peru fatiado', 'Ovo pochê'],
  fruta: ['Banana prata', 'Mamão papaia', 'Maçã fuji', 'Morango', 'Laranja pera', 'Melão', 'Abacaxi', 'Manga palmer', 'Pera', 'Kiwi', 'Uva itália'],
  carbo: ['Arroz branco cozido', 'Batata doce cozida', 'Arroz integral cozido', 'Macarrão integral cozido', 'Batata inglesa cozida', 'Mandioca cozida', 'Cuscuz de milho cozido', 'Quinoa cozida', 'Batata baroa cozida', 'Cará cozido'],
  leguminosa: ['Feijão carioca cozido', 'Feijão preto cozido', 'Lentilha cozida', 'Grão-de-bico cozido', 'Feijão fradinho cozido'],
  proteina: ['Frango peito grelhado', 'Tilápia grelhada', 'Patinho grelhado sem óleo', 'Carne bovina maminha grelhada', 'Sardinha assada', 'Frango sobrecoxa assada sem pele', 'Merluza assada', 'Carne moída patinho cozida', 'Salmão grelhado', 'Atum em lata em água', 'Peru assado'],
  vegetal: ['Brócolis cozido', 'Abobrinha cozida', 'Cenoura cozida', 'Couve-flor cozida', 'Beterraba cozida', 'Chuchu cozido', 'Berinjela cozida', 'Couve manteiga'],
  salada: ['Alface', 'Tomate', 'Rúcula', 'Pepino cru', 'Cenoura crua', 'Repolho cru', 'Agrião cru'],
  azeite: ['Azeite de oliva'],
  lanche: ['Iogurte natural integral', 'Castanha de caju', 'Iogurte grego natural', 'Pasta de amendoim', 'Queijo minas frescal', 'Amendoim torrado', 'Queijo ricota', 'Castanha do Pará', 'Iogurte natural desnatado'],
}

/**
 * Reserva: só entra quando as restrições deixam o papel com menos de 3
 * opções (vegetariano, sem ovo, sem lactose). Quem come de tudo não recebe
 * tofu no café nem ovo como prato principal — a proteína do dia despencava.
 */
export const OPCOES_RESERVA: Partial<Record<PapelItem, readonly string[]>> = {
  proteina: ['Ovo mexido sem óleo', 'Tofu firme', 'Ovo cozido', 'Grão-de-bico cozido'],
  proteina_cafe: ['Tofu firme'],
}
const MINIMO_SEM_RESERVA = 3

export const NOMES_BASE_PLANO: readonly string[] = [
  ...new Set([...Object.values(OPCOES_POR_PAPEL).flat(), ...Object.values(OPCOES_RESERVA).flat()]),
]

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
    { papel: 'salada', fatia: 0 },
    { papel: 'azeite', fatia: 0 },
  ],
  lanche: [
    { papel: 'fruta', fatia: 0.4 },
    { papel: 'lanche', fatia: 0.6 },
  ],
  // Jantar não é cópia do almoço: sem leguminosa, mais proteína e salada.
  jantar: [
    { papel: 'carbo', fatia: 0.45 },
    { papel: 'proteina', fatia: 0.55 },
    { papel: 'vegetal', fatia: 0 },
    { papel: 'salada', fatia: 0 },
    { papel: 'azeite', fatia: 0 },
  ],
}

/** Itens de quantidade fixa (não entram na divisão de calorias). */
const GRAMAS_FIXAS: Partial<Record<PapelItem, number>> = { vegetal: 100, salada: 80, azeite: 5 }

const LIMITES_G: Record<PapelItem, readonly [number, number]> = {
  carbo_cafe: [25, 150],
  proteina_cafe: [30, 250],
  fruta: [80, 250],
  carbo: [50, 350],
  leguminosa: [50, 250],
  proteina: [60, 250],
  vegetal: [50, 200],
  salada: [40, 150],
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

const PEIXES = ['tilapia', 'salmao', 'atum', 'sardinha', 'merluza', 'peixe']
const CARNE = ['frango', 'patinho', 'carne', 'maminha', 'bovina', 'peru', 'camarao', ...PEIXES]
const LACTEOS = ['leite', 'queijo', 'iogurte', 'requeijao', 'manteiga', 'cottage']
const GLUTEN = ['pao', 'macarrao', 'aveia', 'trigo', 'centeio', 'cevada', 'cuscuz marroquino']
/** Palavras gerais ("não gosto de frutas") -> todos os itens daquele grupo no cardápio. */
const FRUTAS = ['banana', 'mamao', 'maca', 'morango', 'laranja', 'melao', 'abacaxi', 'manga', 'pera', 'kiwi', 'uva']
const VERDURAS = ['brocolis', 'alface', 'tomate', 'cenoura', 'abobrinha', 'chuchu', 'pepino', 'couve', 'beterraba', 'berinjela', 'rucula', 'repolho', 'agriao']

/** Palavra que a pessoa digitou -> termos da base que ela cobre. */
const SINONIMOS: Record<string, readonly string[]> = {
  lactose: LACTEOS,
  leite: LACTEOS,
  laticinios: LACTEOS,
  dairy: LACTEOS,
  lacteos: LACTEOS,
  lactosa: LACTEOS,
  gluten: GLUTEN,
  trigo: GLUTEN,
  wheat: GLUTEN,
  peixe: PEIXES,
  fish: PEIXES,
  pescado: PEIXES,
  'frutos do mar': ['camarao', ...PEIXES],
  seafood: ['camarao', ...PEIXES],
  mariscos: ['camarao'],
  ovo: ['ovo', 'omelete'],
  ovos: ['ovo', 'omelete'],
  egg: ['ovo', 'omelete'],
  eggs: ['ovo', 'omelete'],
  huevo: ['ovo', 'omelete'],
  amendoim: ['amendoim'],
  peanut: ['amendoim'],
  mani: ['amendoim'],
  peanuts: ['amendoim'],
  castanha: ['castanha', 'amendoa', 'noz'],
  castanhas: ['castanha', 'amendoa', 'noz'],
  'tree nuts': ['castanha', 'amendoa', 'noz'],
  'frutos secos': ['castanha', 'amendoa', 'noz'],
  nuts: ['castanha', 'amendoa', 'noz', 'amendoim'],
  soja: ['soja', 'tofu'],
  soy: ['soja', 'tofu'],
  carne: ['patinho', 'carne', 'maminha', 'bovina'],
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
  beef: ['patinho', 'carne', 'maminha', 'bovina'],
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
  const variante = Math.max(0, Math.floor(p.variante ?? 0))
  const porNome = new Map<string, AlimentoPlano>()
  for (const a of base) if (!porNome.has(a.nomeBase)) porNome.set(a.nomeBase, a)

  const permitidos = (nomes: readonly string[]): AlimentoPlano[] =>
    nomes.map((n) => porNome.get(n)).filter((a): a is AlimentoPlano => !!a && permitido(a, termos))
  const opcoesDo = (papel: PapelItem): AlimentoPlano[] => {
    const principais = permitidos(OPCOES_POR_PAPEL[papel])
    return principais.length >= MINIMO_SEM_RESERVA ? principais : [...principais, ...permitidos(OPCOES_RESERVA[papel] ?? [])]
  }

  // Restrição demais (ex.: vegetariano + sem ovo + sem soja) -> sem plano; a tela explica.
  // Fruta e verdura não são essenciais: quem não come, fica sem (a parte da
  // fruta vai pros outros itens da refeição).
  const essenciais: PapelItem[] = ['carbo_cafe', 'carbo', 'proteina']
  if (essenciais.some((papel) => opcoesDo(papel).length === 0)) return null

  const divisao = DIVISAO[p.refeicoes]
  const refeicoes: RefeicaoCardapio[] = []
  // O dia não repete alimento (fruta do café ≠ do lanche, prato do almoço ≠ jantar, ovo só numa refeição).
  const usados = new Set<string>()

  for (const tipo of ['cafe', 'almoco', 'lanche', 'jantar'] as const) {
    const parte = divisao[tipo]
    if (!parte) continue
    const alvoRefeicao = Math.round(metas.kcal * parte)
    // Vegetariano mantém a leguminosa no jantar: é de onde vem a proteína dele.
    const moldeDoTipo = tipo === 'jantar' && p.restricoes.includes('vegetariano') ? MOLDE.almoco : MOLDE[tipo]
    const molde = moldeDoTipo.map((m) => ({ ...m, opcoes: opcoesDo(m.papel) })).filter((m) => m.opcoes.length > 0)

    // Kcal dos fixos (verdura, azeite) sai antes de dividir o resto.
    const fixos = molde
      .filter((m) => GRAMAS_FIXAS[m.papel] !== undefined)
      .reduce((s, m) => s + (m.opcoes[0]!.calorias / m.opcoes[0]!.porcaoG) * GRAMAS_FIXAS[m.papel]!, 0)
    const somaFatias = molde.reduce((s, m) => s + m.fatia, 0) || 1
    const resto = Math.max(alvoRefeicao - fixos, 0)

    const itens: ItemCardapio[] = molde.map((m) => {
      const alvoKcal = Math.round((resto * m.fatia) / somaFatias)
      // Começa na opção da variante, pula o que o dia já usou e prefere o
      // alimento cuja quantidade fecha as calorias do papel (batata inglesa
      // não fecha 400 kcal sem virar um quilo de batata).
      const total = m.opcoes.length
      const inicio = variante % total
      const ordem = Array.from({ length: total }, (_, k) => (inicio + k) % total)
      const livres = ordem.filter((i) => !usados.has(m.opcoes[i]!.id))
      const indice = livres.find((i) => cabeNoPapel(m.opcoes[i]!, alvoKcal, m.papel)) ?? livres[0] ?? inicio
      usados.add(m.opcoes[indice]!.id)
      const esboco = { papel: m.papel, opcoes: m.opcoes, indice, alvoKcal, gramas: 0 }
      return { ...esboco, gramas: gramasPara(alimentoDoItem(esboco), alvoKcal, m.papel) }
    })
    refeicoes.push({ tipo, alvoKcal: alvoRefeicao, itens })
  }

  return { parametros: p, metas, refeicoes: calibrarCalorias(ajustarProteina(refeicoes, metas.proteina), metas.kcal) }
}

/** A quantidade que fecha as calorias-alvo cabe nos limites do papel? */
function cabeNoPapel(a: AlimentoPlano, alvoKcal: number, papel: PapelItem): boolean {
  if (GRAMAS_FIXAS[papel] !== undefined || alvoKcal <= 0) return true
  const kcal = (a.calorias / a.porcaoG) * gramasPara(a, alvoKcal, papel)
  return Math.abs(kcal - alvoKcal) <= alvoKcal * 0.2
}

const PAPEIS_DE_AJUSTE: ReadonlySet<PapelItem> = new Set<PapelItem>(['carbo', 'carbo_cafe', 'leguminosa', 'fruta'])

/**
 * Arredondamento e reforço de proteína tiram o dia da meta: aqui o carbo, a
 * leguminosa e a fruta sobem ou descem (dentro dos limites de cada papel)
 * até o total voltar pra perto. A proteína não é mexida.
 */
function calibrarCalorias(refeicoes: RefeicaoCardapio[], metaKcal: number): RefeicaoCardapio[] {
  let atual = refeicoes
  for (let volta = 0; volta < 4; volta++) {
    const falta = metaKcal - totaisDoPlano(atual).calorias
    if (Math.abs(falta) <= metaKcal * 0.04) break
    const ajustavel = atual
      .flatMap((r) => r.itens)
      .filter((it) => PAPEIS_DE_AJUSTE.has(it.papel))
      .reduce((s, it) => s + macrosDoItem(it).calorias, 0)
    if (ajustavel <= 0) break
    const fator = Math.min(Math.max((ajustavel + falta) / ajustavel, 0.6), 1.6)
    atual = atual.map((r) => ({
      ...r,
      itens: r.itens.map((it) =>
        PAPEIS_DE_AJUSTE.has(it.papel) ? { ...it, gramas: arredondarGramas(alimentoDoItem(it), it.gramas * fator, it.papel) } : it,
      ),
    }))
  }
  return atual
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

// ---------------------------------------------------------------
// Semana (12/11/2026): 7 dias com as mesmas metas e alimentos diferentes
// ---------------------------------------------------------------

export const DIAS_DA_SEMANA_PLANO = 7

/**
 * Um cardápio por dia (índice 0 = segunda). Cada dia é uma variante do
 * gerador; a que sair da tolerância do servidor é pulada. `inicio` muda a
 * semana inteira ("outra semana"). null = nem o primeiro dia fecha.
 */
export function gerarSemanaDieta(
  c: CorpoDieta,
  p: ParametrosDieta,
  base: readonly AlimentoPlano[],
  inicio = 0,
): PlanoDietaGerado[] | null {
  const dias: PlanoDietaGerado[] = []
  let variante = Math.max(0, Math.floor(inicio))
  const limite = variante + DIAS_DA_SEMANA_PLANO * 6
  while (dias.length < DIAS_DA_SEMANA_PLANO && variante < limite) {
    const dia = gerarPlanoDieta(c, { ...p, variante }, base)
    if (!dia) return null
    if (cardapioDentroDaMeta(dia)) dias.push(dia)
    // De 2 em 2: o jantar de um dia usa a opção seguinte à do almoço, e com
    // passo 1 ele virava o almoço do dia seguinte.
    variante += 2
  }
  if (dias.length === 0) return null
  // Restrição demais pra 7 dias diferentes: repete os que fecharam.
  const achados = dias.length
  while (dias.length < DIAS_DA_SEMANA_PLANO) dias.push(dias[dias.length % achados]!)
  return dias
}

/** Próximo `inicio` pra "outra semana" (depois da última variante usada). */
export function proximoInicioDaSemana(semana: readonly PlanoDietaGerado[]): number {
  return Math.max(...semana.map((d) => d.parametros.variante ?? 0)) + 1
}

/** Formato da RPC aplicar_plano_dieta_semana (o dia 1 é o que a RPC antiga recebe). */
export function paraEnvioDietaSemana(semana: readonly PlanoDietaGerado[]) {
  const primeiro = paraEnvioDieta(semana[0]!)
  return {
    p_parametros: primeiro.p_parametros,
    p_metas: primeiro.p_metas,
    p_semana: semana.map((d) => paraEnvioDieta(d).p_cardapio),
    p_gerador_versao: primeiro.p_gerador_versao,
  }
}
