// Fluxo do scanner com banco em memória: idempotência, cota devolvida uma
// vez só, lease vencido, tentativa atrasada descartada e confirmar sem
// duplicar (seções 9 e 9.1). O Gemini aqui é falso — isto testa integração,
// não reconhecimento (seção 14).
import { assert, assertEquals } from 'jsr:@std/assert@1'
import { handleScan, type DepsScan, type RespostaGemini } from './analisar.ts'
import { CAT, IDS } from './fixtures.ts'
import type { ArgsConfirmar, Job, RepoScan } from './repositorio.ts'

const FOTO = 'A'.repeat(500)
const OUTRA = 'B'.repeat(500)
const REQ = '11111111-1111-4111-8111-111111111111'
const COMMIT = '22222222-2222-4222-8222-222222222222'

const RESPOSTA_OK = JSON.stringify({
  schemaVersion: '2', status: 'ok', mealTitle: 'Arroz e frango', portionAnchors: ['plate'],
  items: [
    { localId: 'a', name: 'Arroz branco', preparation: 'boiled', canonicalHint: 'Arroz branco cozido', amount: { value: 150, unit: 'g', evidence: 'visible' }, portionEvidence: 'usable', visibleFatSignal: 'none' },
    { localId: 'b', name: 'Frango grelhado', preparation: 'grilled', canonicalHint: 'Frango peito grelhado', amount: { value: 120, unit: 'g', evidence: 'visible' }, portionEvidence: 'usable', visibleFatSignal: 'none' },
  ],
  imageIssues: [],
})

function repoMemoria() {
  const jobs = new Map<string, Job & { cotaDevolvida: boolean; commitKey: string | null; itens: string[] | null }>()
  const diario: ArgsConfirmar['itens'] = []
  let n = 0
  const repo: RepoScan = {
    buscar: async (r) => [...jobs.values()].find((j) => j.requestId === r) ?? null,
    porId: async (id) => jobs.get(id) ?? null,
    criar: async (requestId, hash, leaseAte) => {
      if ([...jobs.values()].some((j) => j.requestId === requestId)) return null
      const j = { id: `00000000-0000-4000-9000-${String(++n).padStart(12, '0')}`, requestId, payloadHash: hash, status: 'processing' as const, revisao: 1, tentativa: 1, leaseAte, resultado: null, erro: null, cotaDevolvida: false, commitKey: null, itens: null }
      jobs.set(j.id, j)
      return j
    },
    assumir: async (job, leaseAte) => {
      const j = jobs.get(job.id)!
      if (j.status !== 'processing' || j.tentativa !== job.tentativa) return false
      Object.assign(j, { tentativa: j.tentativa + 1, leaseAte })
      return true
    },
    publicar: async (id, tentativa, p) => {
      const j = jobs.get(id)!
      if (j.status !== 'processing' || j.tentativa !== tentativa) return false
      Object.assign(j, { status: p.status, resultado: p.resultado, leaseAte: null })
      return true
    },
    falhar: async (id, tentativa, erro) => {
      const j = jobs.get(id)!
      if (j.status !== 'processing' || j.tentativa !== tentativa || j.cotaDevolvida) return false
      Object.assign(j, { status: 'failed', erro, cotaDevolvida: true })
      return true
    },
    confirmar: async (a) => {
      const j = jobs.get(a.scanId)
      if (!j) return { status: 'nao_encontrado', itens: null }
      if (j.status === 'committed') return { status: j.commitKey === a.commitKey ? 'ja_confirmado' : 'ja_confirmado_outro', itens: j.itens }
      if (j.revisao !== a.revisao) return { status: 'conflito_revisao', itens: null }
      diario.push(...a.itens)
      Object.assign(j, { status: 'committed', commitKey: a.commitKey, itens: a.itens.map((_, i) => `item${i}`) })
      return { status: 'ok', itens: j.itens }
    },
    catalogo: async () => CAT,
  }
  return { repo, jobs, diario }
}

function montar(respostas: string[] = [RESPOSTA_OK]) {
  const m = repoMemoria()
  const cont = { gemini: 0, cota: 0, devolvida: 0 }
  let agora = 1_000_000
  const deps: DepsScan = {
    repo: m.repo, idioma: 'pt-BR', pais: 'BR', modelo: 'teste', vocabularioMax: 600,
    gemini: async (): Promise<RespostaGemini> => {
      const texto = respostas[Math.min(cont.gemini, respostas.length - 1)]
      cont.gemini++
      return { ok: texto !== 'FALHA', texto, tokens: 10, custo: 0 }
    },
    extrairJSON: (t) => { try { return JSON.parse(t) } catch { return null } },
    consumirCota: async () => { cont.cota++; return { ok: true } },
    devolverCota: async () => { cont.devolvida++ },
    auditar: async () => {},
    json: (data, status = 200) => new Response(JSON.stringify(data), { status }),
    agora: () => agora,
  }
  return { ...m, deps, cont, avancar: (ms: number) => { agora += ms } }
}

const analisar = (d: DepsScan, image = FOTO, request_id = REQ) => handleScan(d, { op: 'analisar', request_id, image })
const corpo = async (r: Response) => ({ status: r.status, body: await r.json() })

Deno.test('analisa uma vez; repetir o mesmo pedido não gasta cota nem IA', async () => {
  const t = montar()
  const a = await corpo(await analisar(t.deps))
  assertEquals(a.status, 200)
  assertEquals(a.body.status, 'ready')
  assertEquals(a.body.itens.length, 2)
  assertEquals(a.body.itens[0].base.fonte, 'taco')
  const b = await corpo(await analisar(t.deps))
  assertEquals(b.body.scan_id, a.body.scan_id)
  assertEquals(t.cont, { gemini: 1, cota: 1, devolvida: 0 })
})

Deno.test('mesmo request_id com outra foto é conflito', async () => {
  const t = montar()
  await analisar(t.deps)
  assertEquals((await analisar(t.deps, OUTRA)).status, 409)
})

Deno.test('JSON quebrado: 1 recuperação; falhou de novo, devolve a cota uma vez só', async () => {
  const t = montar(['não é json', 'ainda não'])
  assertEquals((await analisar(t.deps)).status, 502)
  assertEquals(t.cont.gemini, 2)
  assertEquals(t.cont.devolvida, 1)
  const de_novo = await corpo(await analisar(t.deps))
  assertEquals(de_novo.status, 409)
  assertEquals(de_novo.body.error, 'request_failed')
  assertEquals(t.cont, { gemini: 2, cota: 1, devolvida: 1 })
})

Deno.test('recuperação que funciona publica normal', async () => {
  const t = montar(['quebrado', RESPOSTA_OK])
  assertEquals((await corpo(await analisar(t.deps))).body.status, 'ready')
  assertEquals(t.cont.devolvida, 0)
})

Deno.test('sem comida: 422 e cota de volta', async () => {
  const t = montar([JSON.stringify({ schemaVersion: '2', status: 'no_food', items: [] })])
  const r = await corpo(await analisar(t.deps))
  assertEquals(r.status, 422)
  assertEquals(r.body.error, 'no_food')
  assertEquals(t.cont.devolvida, 1)
})

Deno.test('provedor fora: 502 e cota de volta', async () => {
  const t = montar(['FALHA'])
  assertEquals((await analisar(t.deps)).status, 502)
  assertEquals(t.cont, { gemini: 1, cota: 1, devolvida: 1 })
})

Deno.test('em andamento devolve 202; lease vencido é assumido sem cobrar de novo', async () => {
  const t = montar()
  // Simula um pedido que caiu no meio: job criado, nunca publicado.
  await t.repo.criar(REQ, await sha(FOTO), 1_000_000 + 40_000)
  assertEquals((await analisar(t.deps)).status, 202)
  t.avancar(60_000)
  const r = await corpo(await analisar(t.deps))
  assertEquals(r.body.status, 'ready')
  assertEquals(t.cont.cota, 0)
  const job = [...t.jobs.values()][0]
  assertEquals(job.tentativa, 2)
  // A tentativa 1, atrasada, não sobrescreve.
  assertEquals(await t.repo.publicar(job.id, 1, { status: 'ready', resultado: job.resultado!, modelo: '', promptVersao: '', schemaVersao: '', tempos: {}, tokens: 0, custo: 0 }), false)
})

async function sha(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.test('confirmar: nutriente calculado no servidor; tocar duas vezes não duplica', async () => {
  const t = montar()
  const a = (await corpo(await analisar(t.deps))).body
  const pedido = {
    op: 'confirmar', scan_id: a.scan_id, revisao: a.revisao, commit_key: COMMIT, data: '2026-10-21', alvo: { tipo: 'almoco' },
    itens: [
      // calorias mandadas pelo app são ignoradas (o servidor nem lê).
      { item_id: 'it1', alimento_id: IDS.arroz, gramas: 200, variante: 'sem_oleo', incluir: true, calorias: 1 },
      { item_id: 'it2', alimento_id: IDS.frango, gramas: 120, variante: 'caseiro', incluir: false },
    ],
  }
  const c1 = await corpo(await handleScan(t.deps, pedido))
  assertEquals(c1.status, 200)
  assertEquals(t.diario.length, 1)
  assertEquals(t.diario[0].calorias, 256) // 200 g × 1,28 sem óleo
  assertEquals(t.diario[0].quantidade_texto, '200 g')
  const c2 = await corpo(await handleScan(t.deps, pedido))
  assertEquals(c2.status, 200)
  assertEquals(t.diario.length, 1)
  assertEquals((await handleScan(t.deps, { ...pedido, commit_key: '33333333-3333-4333-8333-333333333333' })).status, 409)
})

Deno.test('confirmar: item sem alimento ou com gramas absurdas é recusado', async () => {
  const t = montar()
  const a = (await corpo(await analisar(t.deps))).body
  const base = { op: 'confirmar', scan_id: a.scan_id, revisao: 1, commit_key: COMMIT, data: '2026-10-21', alvo: { tipo: 'jantar' } }
  assertEquals((await handleScan(t.deps, { ...base, itens: [{ item_id: 'it1', alimento_id: null, gramas: 100 }] })).status, 422)
  assertEquals((await handleScan(t.deps, { ...base, itens: [{ item_id: 'it1', alimento_id: IDS.arroz, gramas: 9000 }] })).status, 422)
  assertEquals((await handleScan(t.deps, { ...base, itens: [{ item_id: 'xx', alimento_id: IDS.arroz, gramas: 100 }] })).status, 400)
  assertEquals(t.diario.length, 0)
})

Deno.test('status devolve o resultado guardado', async () => {
  const t = montar()
  const a = (await corpo(await analisar(t.deps))).body
  const s = await corpo(await handleScan(t.deps, { op: 'status', scan_id: a.scan_id }))
  assertEquals(s.body.titulo, 'Arroz e frango')
  assert(s.body.totais.kcal > 0)
})
