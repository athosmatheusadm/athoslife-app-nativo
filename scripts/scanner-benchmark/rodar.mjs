// Benchmark do scanner com fotos de pratos PESADOS (etapa 1 e 6 da
// especificação v1.1). Cada foto gasta 1 scan da conta de teste (precisa
// ser conta paga). Ver README.md desta pasta.
//
//   ATHOS_EMAIL=... ATHOS_SENHA=... node scripts/scanner-benchmark/rodar.mjs <pasta> [v1|v2|ambos] [dev|cego|todos]
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { calcular, portas } from './metricas.mjs'

const [pasta, versao = 'ambos', conjunto = 'dev'] = process.argv.slice(2)
if (!pasta || !existsSync(join(pasta, 'referencia.csv'))) {
  console.error('Uso: node scripts/scanner-benchmark/rodar.mjs <pasta com fotos/ e referencia.csv> [v1|v2|ambos] [dev|cego|todos]')
  process.exit(1)
}

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const URL_SB = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY
const { ATHOS_EMAIL, ATHOS_SENHA } = process.env
if (!URL_SB || !ANON || !ATHOS_EMAIL || !ATHOS_SENHA) {
  console.error('Faltam VITE_SUPABASE_URL/ANON_KEY no .env ou ATHOS_EMAIL/ATHOS_SENHA no ambiente.')
  process.exit(1)
}

// referencia.csv: foto;refeicao;categoria;conjunto;item;gramas;kcal;proteina;carboidrato;gordura
// (separador ";" pra não brigar com a vírgula decimal; aceita "80,5").
function lerReferencia() {
  const linhas = readFileSync(join(pasta, 'referencia.csv'), 'utf8').split(/\r?\n/).filter((l) => l.trim())
  const cab = linhas.shift().split(';').map((c) => c.trim())
  const num = (v) => Number(String(v ?? '').replace(',', '.'))
  const porFoto = new Map()
  for (const l of linhas) {
    const c = Object.fromEntries(l.split(';').map((v, i) => [cab[i], v.trim()]))
    const r = porFoto.get(c.foto) ?? { foto: c.foto, id: c.refeicao, categoria: c.categoria, conjunto: c.conjunto, itensRef: [] }
    r.itensRef.push({ nome: c.item, gramas: num(c.gramas), kcal: num(c.kcal), proteina: num(c.proteina), carboidrato: num(c.carboidrato), gordura: num(c.gordura) })
    porFoto.set(c.foto, r)
  }
  return [...porFoto.values()]
}

async function entrar() {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ATHOS_EMAIL, password: ATHOS_SENHA }),
  })
  if (!r.ok) throw new Error(`login falhou: ${r.status}`)
  return (await r.json()).access_token
}

async function proxy(token, corpo) {
  const r = await fetch(`${URL_SB}/functions/v1/ai-proxy`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

async function rodarV1(token, image, mime) {
  const t0 = Date.now()
  const r = await proxy(token, { tipo: 'vision', image, mime_type: mime })
  if (r.status !== 200) return { erro: r.body.error ?? r.status }
  return { ms: Date.now() - t0, itens: r.body.itens.map((i) => ({ nome: i.nome, gramas: i.quantidade_g, kcal: i.calorias, proteina: i.proteina, carboidrato: i.carboidrato, gordura: i.gordura })), cru: r.body }
}

async function rodarV2(token, image, mime) {
  const t0 = Date.now()
  let r = await proxy(token, { tipo: 'scan', op: 'analisar', request_id: randomUUID(), image, mime_type: mime })
  for (let i = 0; r.status === 202 && i < 10; i++) {
    await new Promise((ok) => setTimeout(ok, 2500))
    r = await proxy(token, { tipo: 'scan', op: 'status', scan_id: r.body.scan_id })
  }
  if (r.status !== 200) return { erro: r.body.error ?? r.status }
  // Resultado inicial, sem correção (seção 12: reportar antes e depois separados).
  const itens = r.body.itens.filter((i) => i.incluir).map((i) => ({
    nome: i.base?.nome ?? i.nomeVisto, gramas: i.gramas, kcal: i.nutrientes?.kcal ?? 0,
    proteina: i.nutrientes?.proteina ?? 0, carboidrato: i.nutrientes?.carboidrato ?? 0, gordura: i.nutrientes?.gordura ?? 0,
  }))
  return { ms: Date.now() - t0, itens, cru: r.body }
}

const refeicoes = lerReferencia().filter((r) => conjunto === 'todos' || r.conjunto === conjunto)
const fotos = new Set(readdirSync(join(pasta, 'fotos')))
const token = await entrar()
const versoes = versao === 'ambos' ? ['v1', 'v2'] : [versao]
const saida = { quando: new Date().toISOString(), conjunto, versoes: {} }

for (const v of versoes) {
  const linhas = []
  for (const r of refeicoes) {
    if (!fotos.has(r.foto)) { console.warn(`sem foto: ${r.foto}`); continue }
    const image = readFileSync(join(pasta, 'fotos', r.foto)).toString('base64')
    const mime = MIME[extname(r.foto).toLowerCase()] ?? 'image/jpeg'
    const res = v === 'v1' ? await rodarV1(token, image, mime) : await rodarV2(token, image, mime)
    console.log(`${v} ${r.foto}: ${res.erro ? `ERRO ${res.erro}` : `${res.itens.length} itens, ${Math.round(res.itens.reduce((s, i) => s + i.kcal, 0))} kcal (ref ${Math.round(r.itensRef.reduce((s, i) => s + i.kcal, 0))}) em ${res.ms} ms`}`)
    linhas.push({ ...r, previsto: res.erro ? null : { itens: res.itens, ms: res.ms }, erro: res.erro ?? null, cru: res.cru ?? null })
  }
  const m = calcular(linhas)
  saida.versoes[v] = { metricas: m, portas: portas(m), linhas }
  console.log(`\n== ${v} ==`, JSON.stringify(m, null, 2), '\nportas:', JSON.stringify(portas(m)))
}

mkdirSync(join(pasta, 'resultados'), { recursive: true })
const arq = join(pasta, 'resultados', `${saida.quando.replace(/[:.]/g, '-')}-${conjunto}.json`)
writeFileSync(arq, JSON.stringify(saida, null, 2))
console.log(`\nSalvo em ${arq}`)
