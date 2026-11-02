// Testes do streaming do chat (Fase 7). Rodar: deno test -A supabase/functions/ai-proxy/stream.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { juntarStream, novoRascunho } from './stream.ts'

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

Deno.test('stream: junta os pedaços no formato do generateContent', async () => {
  const vistos: string[] = []
  const r = await juntarStream(sse([
    { candidates: [{ content: { parts: [{ text: 'Oi, ' }] } }] },
    { candidates: [{ content: { parts: [{ text: 'pensei', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: 'tudo bem?' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4 } },
  ]), (acc) => vistos.push(acc))
  igual(r.candidates?.[0].content?.parts, [{ text: 'Oi, tudo bem?' }])
  igual(r.candidates?.[0].finishReason, 'STOP')
  igual(r.usageMetadata, { promptTokenCount: 10, candidatesTokenCount: 4 })
  igual(vistos, ['Oi, ', 'Oi, tudo bem?'])
})

Deno.test('stream: chamada de ferramenta e bloqueio passam inteiros', async () => {
  const r = await juntarStream(sse([
    { candidates: [{ content: { parts: [{ functionCall: { name: 'registrar_agua', args: { ml: 500 } } }] } }] },
    { promptFeedback: { blockReason: 'SAFETY' } },
  ], 3))
  igual(r.candidates?.[0].content?.parts, [{ functionCall: { name: 'registrar_agua', args: { ml: 500 } } }])
  igual(r.promptFeedback, { blockReason: 'SAFETY' })
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
