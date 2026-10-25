import { supabase } from '@data/supabase/client'
import { exigirRede, lerDoCache, mexerNoCache } from '@data/offline/cache'
import { SemConexaoError } from '@data/offline/conexao'
import type { Macros } from '@domain/entities/food'

/**
 * Produto pelo código de barras. Nada de IA aqui — os números são os do
 * rótulo. Ordem da busca (todas gratuitas):
 *
 *   1. cópia no celular (funciona sem internet);
 *   2. base própria `produtos_codigo_barras`: o que o app já achou antes e o
 *      que as pessoas cadastraram pelo rótulo (o teste de 25/10 achou o Open
 *      Food Facts sozinho limitado pra produto brasileiro);
 *   3. Open Food Facts, tentando as variações do código (UPC-A ↔ EAN-13);
 *   4. USDA FoodData Central (produtos de marca, cobre importados).
 *
 * O que vem das bases públicas é guardado na base própria, então a próxima
 * pessoa acha direto. Se só o nome é conhecido (cadastro sem tabela
 * nutricional), devolve `semTabela` pra tela pedir os números do rótulo.
 */

export interface ProdutoRotulo {
  readonly codigo: string
  readonly nome: string
  readonly marca: string | null
  /** Macros por 100 g/ml (rótulo). */
  readonly por100: Macros
  /** Porção do rótulo em g/ml, quando informada. */
  readonly porcaoG: number | null
  readonly imagemUrl: string | null
}

export type ResultadoCodigo =
  | { readonly tipo: 'achado'; readonly produto: ProdutoRotulo }
  /** A base conhece o produto, mas sem tabela nutricional. */
  | { readonly tipo: 'semTabela'; readonly codigo: string; readonly nome: string; readonly marca: string | null; readonly imagemUrl: string | null }
  | { readonly tipo: 'naoAchado'; readonly codigo: string }

type Fonte = 'off' | 'usda' | 'usuario'

const CHAVE_CACHE = 'codigos-barras'
const MAX_CACHE = 300

interface RespostaOFF {
  status: number
  product?: {
    product_name?: string
    product_name_pt?: string
    product_name_es?: string
    product_name_en?: string
    generic_name?: string
    brands?: string
    serving_quantity?: number | string
    image_front_small_url?: string
    nutriments?: Record<string, number | string | undefined>
  }
}

interface LinhaBase {
  codigo: string
  nome: string
  marca: string | null
  kcal_100: number
  proteina_100: number
  carbo_100: number
  gordura_100: number
  porcao_g: number | null
  imagem_url: string | null
}

const CAMPOS_OFF = [
  'product_name',
  'product_name_pt',
  'product_name_es',
  'product_name_en',
  'generic_name',
  'brands',
  'serving_quantity',
  'nutriments',
  'image_front_small_url',
].join(',')

/** Chave pública de demonstração da USDA (limite por IP, suficiente pra um celular). */
const USDA_CHAVE = 'DEMO_KEY'

function numero(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const r1 = (n: number) => Math.round(n * 10) / 10

function semNumeros(m: Macros): boolean {
  return m.calorias === 0 && m.proteina === 0 && m.carboidrato === 0 && m.gordura === 0
}

/**
 * Variações do mesmo código: UPC-A (12) é o EAN-13 com zero na frente, e
 * algumas bases guardam um e outras o outro.
 */
export function variacoesDoCodigo(limpo: string): string[] {
  const v = [limpo]
  if (limpo.length === 12) v.push(`0${limpo}`)
  if (limpo.length === 13 && limpo.startsWith('0')) v.push(limpo.slice(1))
  if (limpo.length === 14 && limpo.startsWith('0')) v.push(limpo.slice(1))
  return v
}

/** Nutrientes do Open Food Facts por 100 g; se só houver por porção, converte. */
export function macrosDoOff(n: Record<string, number | string | undefined>, porcaoG: number): Macros {
  const kcal100 = numero(n['energy-kcal_100g']) || numero(n['energy_100g']) / 4.184 || numero(n['energy-kj_100g']) / 4.184
  const por100: Macros = {
    calorias: Math.round(kcal100),
    proteina: r1(numero(n['proteins_100g'])),
    carboidrato: r1(numero(n['carbohydrates_100g'])),
    gordura: r1(numero(n['fat_100g'])),
  }
  if (!semNumeros(por100) || porcaoG <= 0) return por100
  const f = 100 / porcaoG
  const kcalPorcao = numero(n['energy-kcal_serving']) || numero(n['energy_serving']) / 4.184
  return {
    calorias: Math.round(kcalPorcao * f),
    proteina: r1(numero(n['proteins_serving']) * f),
    carboidrato: r1(numero(n['carbohydrates_serving']) * f),
    gordura: r1(numero(n['fat_serving']) * f),
  }
}

async function buscarJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url).catch(() => {
    throw new SemConexaoError()
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`http_${res.status}`)
  return (await res.json()) as T
}

async function daBasePropria(codigos: string[]): Promise<ProdutoRotulo | null> {
  const { data, error } = await supabase
    .from('produtos_codigo_barras')
    .select('codigo,nome,marca,kcal_100,proteina_100,carbo_100,gordura_100,porcao_g,imagem_url')
    .in('codigo', codigos)
    .limit(1)
  // Tabela ainda não criada (migração pendente) ou erro: segue pras bases públicas.
  if (error || !data?.[0]) return null
  const l = data[0] as LinhaBase
  return {
    codigo: codigos[0]!,
    nome: l.nome,
    marca: l.marca,
    por100: {
      calorias: Number(l.kcal_100),
      proteina: Number(l.proteina_100),
      carboidrato: Number(l.carbo_100),
      gordura: Number(l.gordura_100),
    },
    porcaoG: l.porcao_g ? Number(l.porcao_g) : null,
    imagemUrl: l.imagem_url,
  }
}

async function doOpenFoodFacts(codigos: string[]): Promise<ResultadoCodigo | null> {
  let soNome: ResultadoCodigo | null = null
  for (const c of codigos) {
    const d = await buscarJson<RespostaOFF>(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=${CAMPOS_OFF}`)
    const p = d?.product
    if (!d || d.status !== 1 || !p) continue
    const nome = (p.product_name_pt || p.product_name || p.product_name_es || p.product_name_en || p.generic_name || '').trim()
    const marca = p.brands?.split(',')[0]?.trim() || null
    const porcao = numero(p.serving_quantity)
    const por100 = macrosDoOff(p.nutriments ?? {}, porcao)
    if (semNumeros(por100)) {
      if (nome && !soNome) soNome = { tipo: 'semTabela', codigo: codigos[0]!, nome, marca, imagemUrl: p.image_front_small_url ?? null }
      continue
    }
    return {
      tipo: 'achado',
      produto: {
        codigo: codigos[0]!,
        nome: nome || marca || 'Produto',
        marca,
        por100,
        porcaoG: porcao > 0 ? Math.round(porcao) : null,
        imagemUrl: p.image_front_small_url ?? null,
      },
    }
  }
  return soNome
}

interface RespostaUSDA {
  foods?: {
    gtinUpc?: string
    description?: string
    brandName?: string
    brandOwner?: string
    servingSize?: number
    servingSizeUnit?: string
    foodNutrients?: { nutrientNumber?: string; value?: number }[]
  }[]
}

/** A USDA guarda o GTIN com 14 dígitos (zeros na frente) e só acha assim. */
async function daUsda(codigos: string[]): Promise<ProdutoRotulo | null> {
  const semZeros = (s: string) => s.replace(/^0+/, '')
  const alvo = new Set(codigos.map(semZeros))
  const d = await buscarJson<RespostaUSDA>(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_CHAVE}&dataType=Branded&pageSize=5&query=${codigos[0]!.padStart(14, '0')}`,
  ).catch(() => null) // limite da chave de demonstração, fora do ar ou CORS: segue sem ela
  const f = d?.foods?.find((x) => x.gtinUpc && alvo.has(semZeros(x.gtinUpc)))
  if (!f?.description) return null
  const valor = (num: string) => numero(f.foodNutrients?.find((n) => n.nutrientNumber === num)?.value)
  const por100: Macros = {
    calorias: Math.round(valor('208')),
    proteina: r1(valor('203')),
    carboidrato: r1(valor('205')),
    gordura: r1(valor('204')),
  }
  if (semNumeros(por100)) return null
  const unidade = (f.servingSizeUnit ?? '').toLowerCase()
  const porcao = unidade === 'g' || unidade === 'ml' || unidade === 'grm' || unidade === 'mlt' ? numero(f.servingSize) : 0
  // A USDA escreve tudo em maiúsculas.
  const capitalizar = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase())
  return {
    codigo: codigos[0]!,
    nome: capitalizar(f.description),
    marca: f.brandName || f.brandOwner ? capitalizar((f.brandName || f.brandOwner)!) : null,
    por100,
    porcaoG: porcao > 0 ? Math.round(porcao) : null,
    imagemUrl: null,
  }
}

async function guardarNoCelular(p: ProdutoRotulo): Promise<void> {
  await mexerNoCache<Record<string, ProdutoRotulo & { em: number }>>(CHAVE_CACHE, (atual) => {
    const novo = { ...(atual ?? {}), [p.codigo]: { ...p, em: Date.now() } }
    const chaves = Object.keys(novo)
    if (chaves.length > MAX_CACHE) {
      chaves
        .sort((a, b) => novo[a]!.em - novo[b]!.em)
        .slice(0, chaves.length - MAX_CACHE)
        .forEach((k) => delete novo[k])
    }
    return novo
  }).catch(() => {})
}

async function gravarNaBase(p: ProdutoRotulo, fonte: Fonte): Promise<void> {
  const { error } = await supabase.rpc('salvar_produto_codigo_barras', {
    p_codigo: p.codigo,
    p_nome: p.nome.slice(0, 120),
    p_marca: p.marca?.slice(0, 80) ?? null,
    p_kcal: p.por100.calorias,
    p_proteina: p.por100.proteina,
    p_carbo: p.por100.carboidrato,
    p_gordura: p.por100.gordura,
    p_porcao_g: p.porcaoG,
    p_imagem_url: p.imagemUrl?.startsWith('https://') ? p.imagemUrl : null,
    p_fonte: fonte,
  })
  if (error) throw new Error(error.message)
}

export const produtoCodigoBarrasRepository = {
  async buscar(codigo: string): Promise<ResultadoCodigo> {
    const limpo = codigo.replace(/\D/g, '')
    if (limpo.length < 8) return { tipo: 'naoAchado', codigo: limpo }
    const codigos = variacoesDoCodigo(limpo)

    const local = await lerDoCache<Record<string, ProdutoRotulo>>(CHAVE_CACHE).catch(() => undefined)
    const doCelular = codigos.map((c) => local?.[c]).find(Boolean)
    if (doCelular) return { tipo: 'achado', produto: { ...doCelular, codigo: limpo } }

    exigirRede()

    const proprio = await daBasePropria(codigos).catch(() => null)
    if (proprio) {
      void guardarNoCelular(proprio)
      return { tipo: 'achado', produto: proprio }
    }

    let off: ResultadoCodigo | null = null
    try {
      off = await doOpenFoodFacts(codigos)
    } catch (e) {
      if (e instanceof SemConexaoError) throw e
      // Open Food Facts fora do ar: ainda tenta a USDA.
    }
    if (off?.tipo === 'achado') {
      void guardarNoCelular(off.produto)
      void gravarNaBase(off.produto, 'off').catch(() => {})
      return off
    }

    const usda = await daUsda(codigos)
    if (usda) {
      const produto = off?.tipo === 'semTabela' ? { ...usda, nome: off.nome, marca: off.marca ?? usda.marca, imagemUrl: off.imagemUrl } : usda
      void guardarNoCelular(produto)
      void gravarNaBase(produto, 'usda').catch(() => {})
      return { tipo: 'achado', produto }
    }

    return off ?? { tipo: 'naoAchado', codigo: limpo }
  },

  /**
   * A pessoa copiou o rótulo de um produto que nenhuma base conhecia: entra
   * na base própria (a próxima pessoa já acha) e no celular. false = ficou
   * só no celular (sem rede ou a base recusou); o alimento entra do mesmo jeito.
   */
  async cadastrarPeloRotulo(p: ProdutoRotulo): Promise<boolean> {
    await guardarNoCelular(p)
    return gravarNaBase(p, 'usuario').then(
      () => true,
      () => false,
    )
  },
}
