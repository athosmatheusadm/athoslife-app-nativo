// ATHOSlife — produto-codigo: guarda na base própria um produto de código de
// barras, buscando o dado direto nas bases públicas.
// Deploy com verificação de JWT ligada (padrão): só usuário logado.
//
//   POST { codigo }  ->  { ok: true, guardado: boolean }
//
// O app manda SÓ o código. Nome, números e foto o servidor busca sozinho no
// Open Food Facts (e na USDA): nada do que vai pra base de todos passa pela
// mão de quem escaneou (10/11: antes o celular mandava o produto pronto e
// qualquer conta conseguia inventar um).

import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { ...cors, 'content-type': 'application/json' } })

/** Produtos novos que uma conta pode fazer o servidor buscar por dia. */
const LIMITE_DIA = 60
const ESPERA_MS = 6000

interface Linha {
  nome: string
  marca: string | null
  kcal_100: number
  proteina_100: number
  carbo_100: number
  gordura_100: number
  porcao_g: number | null
  imagem_url: string | null
  fonte: 'off' | 'usda'
}

const numero = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}
const r1 = (n: number) => Math.round(n * 10) / 10

function variacoes(limpo: string): string[] {
  const v = [limpo]
  if (limpo.length === 12) v.push(`0${limpo}`)
  if (limpo.length === 13 && limpo.startsWith('0')) v.push(limpo.slice(1))
  if (limpo.length === 14 && limpo.startsWith('0')) v.push(limpo.slice(1))
  return v
}

async function buscarJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MS), headers: { 'user-agent': 'barcode-lookup/1.0' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Mesmas contas do app (`macrosDoOff`): por 100 g; se só houver por porção, converte. */
async function doOpenFoodFacts(codigos: string[]): Promise<Linha | null> {
  const campos = 'product_name,product_name_pt,product_name_es,product_name_en,generic_name,brands,serving_quantity,nutriments,image_front_small_url'
  for (const c of codigos) {
    const d = await buscarJson(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=${campos}`)
    const p = d?.product
    if (!d || d.status !== 1 || !p) continue
    const n = p.nutriments ?? {}
    const porcao = numero(p.serving_quantity)
    let kcal = numero(n['energy-kcal_100g']) || numero(n['energy_100g']) / 4.184 || numero(n['energy-kj_100g']) / 4.184
    let prot = numero(n['proteins_100g']), carbo = numero(n['carbohydrates_100g']), gord = numero(n['fat_100g'])
    if (kcal === 0 && prot === 0 && carbo === 0 && gord === 0 && porcao > 0) {
      const f = 100 / porcao
      kcal = (numero(n['energy-kcal_serving']) || numero(n['energy_serving']) / 4.184) * f
      prot = numero(n['proteins_serving']) * f
      carbo = numero(n['carbohydrates_serving']) * f
      gord = numero(n['fat_serving']) * f
    }
    if (kcal === 0 && prot === 0 && carbo === 0 && gord === 0) continue
    const marca = typeof p.brands === 'string' ? p.brands.split(',')[0]?.trim() || null : null
    const nome = String(p.product_name_pt || p.product_name || p.product_name_es || p.product_name_en || p.generic_name || '').trim()
    return {
      nome: nome || marca || 'Produto',
      marca,
      kcal_100: Math.round(kcal),
      proteina_100: r1(prot),
      carbo_100: r1(carbo),
      gordura_100: r1(gord),
      porcao_g: porcao > 0 ? Math.round(porcao) : null,
      imagem_url: typeof p.image_front_small_url === 'string' ? p.image_front_small_url : null,
      fonte: 'off',
    }
  }
  return null
}

async function daUsda(codigos: string[]): Promise<Linha | null> {
  const chave = Deno.env.get('USDA_API_KEY') ?? 'DEMO_KEY'
  const semZeros = (s: string) => s.replace(/^0+/, '')
  const alvo = new Set(codigos.map(semZeros))
  const d = await buscarJson(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${chave}&dataType=Branded&pageSize=5&query=${codigos[0]!.padStart(14, '0')}`,
  )
  const f = d?.foods?.find((x: any) => x.gtinUpc && alvo.has(semZeros(String(x.gtinUpc))))
  if (!f?.description) return null
  const valor = (num: string) => numero(f.foodNutrients?.find((x: any) => x.nutrientNumber === num)?.value)
  const kcal = Math.round(valor('208')), prot = r1(valor('203')), carbo = r1(valor('205')), gord = r1(valor('204'))
  if (kcal === 0 && prot === 0 && carbo === 0 && gord === 0) return null
  const unidade = String(f.servingSizeUnit ?? '').toLowerCase()
  const porcao = ['g', 'ml', 'grm', 'mlt'].includes(unidade) ? numero(f.servingSize) : 0
  const capitalizar = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (l) => l.toUpperCase())
  const marca = f.brandName || f.brandOwner
  return {
    nome: capitalizar(String(f.description)),
    marca: marca ? capitalizar(String(marca)) : null,
    kcal_100: kcal,
    proteina_100: prot,
    carbo_100: carbo,
    gordura_100: gord,
    porcao_g: porcao > 0 ? Math.round(porcao) : null,
    imagem_url: null,
    fonte: 'usda',
  }
}

/** Rótulo coerente e dentro do que a tabela aceita; fora disso não entra. */
function aceitavel(l: Linha): boolean {
  if (l.nome.length < 2) return false
  if (l.kcal_100 > 950 || l.proteina_100 > 100 || l.carbo_100 > 100 || l.gordura_100 > 100) return false
  if (l.proteina_100 + l.carbo_100 + l.gordura_100 > 100.5) return false
  if (l.kcal_100 > (l.proteina_100 * 4 + l.carbo_100 * 4 + l.gordura_100 * 9) * 1.6 + 40) return false
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL'), chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !chave) return json({ error: 'server_misconfigured' }, 500)
    const sb = createClient(url, chave, { auth: { persistSession: false } })

    const cab = req.headers.get('authorization') ?? ''
    const { data: { user } } = await sb.auth.getUser(cab.replace(/^Bearer\s+/i, ''))
    if (!user) return json({ error: 'not_authenticated' }, 401)

    const corpo = await req.json().catch(() => null)
    const limpo = typeof corpo?.codigo === 'string' ? corpo.codigo.replace(/\D/g, '') : ''
    if (!/^[0-9]{8,14}$/.test(limpo)) return json({ error: 'codigo_invalido' }, 400)
    const codigos = variacoes(limpo)

    const { data: ja } = await sb.from('produtos_codigo_barras').select('codigo').in('codigo', codigos).limit(1)
    if (ja?.[0]) return json({ ok: true, guardado: false })

    const { count } = await sb
      .from('produtos_codigo_barras')
      .select('codigo', { count: 'exact', head: true })
      .eq('criado_por', user.id)
      .gt('criado_em', new Date(Date.now() - 86_400_000).toISOString())
    if ((count ?? 0) >= LIMITE_DIA) return json({ error: 'limite_cadastros' }, 429)

    const linha = (await doOpenFoodFacts(codigos)) ?? (await daUsda(codigos))
    if (!linha || !aceitavel(linha)) return json({ ok: true, guardado: false })

    const { error } = await sb.from('produtos_codigo_barras').upsert(
      {
        codigo: limpo,
        ...linha,
        nome: linha.nome.slice(0, 120),
        marca: linha.marca?.slice(0, 80) ?? null,
        porcao_g: linha.porcao_g && linha.porcao_g <= 2000 ? linha.porcao_g : null,
        criado_por: user.id,
      },
      { onConflict: 'codigo', ignoreDuplicates: true },
    )
    if (error) throw error
    return json({ ok: true, guardado: true })
  } catch (e) {
    console.error('[produto-codigo]', String((e as Error)?.message ?? e))
    return json({ error: 'erro_interno' }, 500)
  }
})
