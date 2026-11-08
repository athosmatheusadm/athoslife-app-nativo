// Testes do streaming do chat (Fase 7). Rodar: deno test -A supabase/functions/ai-proxy/stream.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { lerSSE, novoRascunho } from './stream.ts'

function sse(eventos: unknown[], cortarEm = 7): ReadableStream<Uint8Array> {
  const txt = eventos.map((e) => `data: ${JSON.stringify(e)}\r\n\r\n`).join('')
  const bytes = new TextEncoder().encode(txt)
  let i = 0
  // pedaços pequenos e tortos: o JSON chega quebrado no meio
  return new ReadableStream({
    pull(c) {
      if (i >= bytes.length) return c.close()
      c.enqueue(bytes.slice(i, i + cortarEm))
      i += cortarEm
    },
  })
}

Deno.test('stream: lerSSE entrega cada evento mesmo com o JSON quebrado no meio', async () => {
  const vistos: Record<string, unknown>[] = []
  await lerSSE(sse([
    { type: 'response.output_text.delta', delta: 'Oi, ' },
    { type: 'response.output_text.delta', delta: 'tudo bem?' },
    { type: 'response.completed', response: { status: 'completed' } },
  ]), (ev) => vistos.push(ev))
  igual(vistos.map((v) => v.type), ['response.output_text.delta', 'response.output_text.delta', 'response.completed'])
  igual(vistos[1].delta, 'tudo bem?')
})

Deno.test('stream: lerSSE ignora [DONE], linha vazia e lixo', async () => {
  const txt = 'event: x\ndata: [DONE]\n\ndata: {quebrado\ndata: {"type":"a"}\n'
  const vistos: Record<string, unknown>[] = []
  await lerSSE(new Response(txt).body!, (ev) => vistos.push(ev))
  igual(vistos, [{ type: 'a' }])
})

Deno.test('rascunho: esconde marcas, [fora] e "[" solto; só cresce', () => {
  const saidas: string[] = []
  const r = novoRascunho(() => false, (t) => saidas.push(t))
  r.aoEscrever('Bora ')
  r.aoEscrever('Bora de ovo mexido [')
  r.aoEscrever('Bora de ovo mexido [[RESU')
  r.aoEscrever('Bora de ovo mexido com tomate.\n[[RESUMO: ovo]]')
  igual(saidas, ['Bora', 'Bora de ovo mexido', 'Bora de ovo mexido com tomate.'])

  const fora: string[] = []
  const f = novoRascunho(() => false, (t) => fora.push(t))
  f.aoEscrever('[fo')
  f.aoEscrever('[fora] Isso eu não faço')
  igual(fora, [])
  ok(f.parado)
})

Deno.test('rascunho: filtro de saída para de vez', () => {
  const saidas: string[] = []
  const r = novoRascunho((t) => /mg de/.test(t), (t) => saidas.push(t))
  r.aoEscrever('Você pode')
  r.aoEscrever('Você pode tomar 500 mg de')
  r.aoEscrever('Você pode tomar 500 mg de algo. Brincadeira, procure um médico.')
  igual(saidas, ['Você pode'])
  ok(r.parado)
})
