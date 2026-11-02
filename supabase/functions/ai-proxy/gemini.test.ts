// Testes da chamada ao Gemini (02/11): o chat nunca para.
// Rodar: deno test -A supabase/functions/ai-proxy/gemini.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'

Deno.env.set('GEMINI_API_KEY', 'teste')
Deno.env.set('GEMINI_MODEL', 'gemini-3.5-flash-lite')
Deno.env.set('GEMINI_MODEL_CHAT', 'gemini-3.8-flash')
const { chamarGemini, configGeracao, configRaciocinio, pausado } = await import('./gemini.ts')

type Resp = { status: number; corpo?: unknown; trava?: boolean }
/** Troca o fetch: cada chamada pega a próxima resposta; anota modelo e raciocínio pedidos. */
function falso(respostas: Resp[]) {
  const pedidos: { modelo: string; thinking: unknown }[] = []
  const original = globalThis.fetch
  globalThis.fetch = ((url: string, init: RequestInit) => {
    const modelo = String(url).match(/models\/([^:]+):/)![1]
    pedidos.push({ modelo, thinking: JSON.parse(String(init.body)).generationConfig?.thinkingConfig })
    const r = respostas.shift() ?? { status: 500 }
    if (r.trava) {
      return new Promise((_, rej) => init.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
    }
    return Promise.resolve(new Response(JSON.stringify(r.corpo ?? { error: { message: 'x' } }), { status: r.status }))
  }) as typeof fetch
  return { pedidos, restaurar: () => { globalThis.fetch = original } }
}
const OK = (t: string) => ({ status: 200, corpo: { candidates: [{ content: { parts: [{ text: t }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2 } } })
const corpo = () => ({ contents: [{ role: 'user', parts: [{ text: 'oi' }] }], generationConfig: configGeracao(100, 0.6) })

Deno.test('raciocínio no nível que cada modelo aceita', () => {
  igual(configRaciocinio('gemini-3.5-flash-lite'), { thinkingLevel: 'minimal' })
  igual(configRaciocinio('gemini-3.8-flash'), { thinkingLevel: 'low' })
  igual(configRaciocinio('gemini-2.5-flash'), { thinkingBudget: 0 })
})

Deno.test('Flash recebe "low", não o "minimal" do Lite', async () => {
  const f = falso([OK('oi!')])
  try {
    const r = await chamarGemini(corpo(), 25_000, 'gemini-3.8-flash')
    ok(r.ok); igual(r.modelo, 'gemini-3.8-flash')
    igual(f.pedidos[0].thinking, { thinkingLevel: 'low' })
  } finally { f.restaurar() }
})

Deno.test('Flash sobrecarregado (503) → Lite responde', async () => {
  const f = falso([{ status: 503 }, OK('oi do lite')])
  try {
    const r = await chamarGemini(corpo(), 25_000, 'gemini-3.8-flash')
    ok(r.ok); igual(r.modelo, 'gemini-3.5-flash-lite'); igual(r.texto, 'oi do lite')
    igual(f.pedidos.map((p) => p.modelo), ['gemini-3.8-flash', 'gemini-3.5-flash-lite'])
    igual(f.pedidos[1].thinking, { thinkingLevel: 'minimal' })
  } finally { f.restaurar() }
})

Deno.test('Flash travado → Lite responde antes de estourar o tempo total', async () => {
  const f = falso([{ status: 0, trava: true }, OK('oi do lite')])
  try {
    const t0 = Date.now()
    const r = await chamarGemini(corpo(), 300, 'gemini-3.8-flash')
    ok(r.ok); igual(r.modelo, 'gemini-3.5-flash-lite')
    ok(Date.now() - t0 < 1000)
  } finally { f.restaurar() }
})

Deno.test('400 de raciocínio: tenta de novo no mesmo modelo antes de cair', async () => {
  const f = falso([{ status: 400, corpo: { error: { message: 'Thinking level MINIMAL is not supported' } } }, OK('ok')])
  try {
    const r = await chamarGemini({ ...corpo(), generationConfig: { ...configGeracao(100, 0.6), thinkingConfig: { thinkingLevel: 'minimal' } } }, 25_000, 'gemini-3.5-flash-lite')
    ok(r.ok); igual(f.pedidos.length, 2)
  } finally { f.restaurar() }
})

Deno.test('bloqueio de segurança não troca de modelo', async () => {
  const f = falso([{ status: 200, corpo: { promptFeedback: { blockReason: 'SAFETY' } } }])
  try {
    const r = await chamarGemini(corpo(), 25_000, 'gemini-3.8-flash')
    ok(!r.ok && r.bloqueado); igual(f.pedidos.length, 1)
  } finally { f.restaurar() }
})

Deno.test('disjuntor: pausado só até o horário guardado', () => {
  const agora = Date.parse('2026-11-02T21:00:00Z')
  ok(pausado('2026-11-02T21:05:00Z', agora))
  ok(!pausado('2026-11-02T20:55:00Z', agora))
  ok(!pausado(null, agora)); ok(!pausado('lixo', agora))
})
