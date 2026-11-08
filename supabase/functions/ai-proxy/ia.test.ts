// Testes da chamada à IA (08/11): Luna principal, Haiku reserva, o chat nunca para.
// Rodar: deno test -A supabase/functions/ai-proxy/ia.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'

Deno.env.set('OPENAI_API_KEY', 'teste')
Deno.env.set('ANTHROPIC_API_KEY', 'teste')
Deno.env.set('IA_MODELO', 'gpt-6-luna')
Deno.env.set('IA_MODELO_RESERVA', 'claude-haiku-5-5')
const { chamarIA, custo, normalizarMensagens, pausado } = await import('./ia.ts')
const { corpoOpenAI, lerRespostaOpenAI } = await import('./openai.ts')
const { corpoAnthropic } = await import('./anthropic.ts')

type Resp = { status: number; corpo?: unknown; trava?: boolean }
/** Troca o fetch por provedor: cada chamada pega a próxima resposta daquele lado. */
function falso(openai: Resp[], anthropic: Resp[] = []) {
  const pedidos: { lado: 'openai' | 'anthropic'; corpo: Record<string, unknown> }[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (entrada: string | URL | Request, init?: RequestInit) => {
    const url = entrada instanceof Request ? entrada.url : String(entrada)
    const lado = url.includes('api.anthropic.com') ? 'anthropic' as const : 'openai' as const
    const bruto = init?.body ?? (entrada instanceof Request ? await entrada.text() : '{}')
    pedidos.push({ lado, corpo: JSON.parse(String(bruto)) })
    const r = (lado === 'openai' ? openai : anthropic).shift() ?? { status: 500 }
    const sinal = init?.signal ?? (entrada instanceof Request ? entrada.signal : undefined)
    if (r.trava) {
      return new Promise((_, rej) => sinal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
    }
    return new Response(JSON.stringify(r.corpo ?? { error: { message: 'x' } }), {
      status: r.status, headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  return { pedidos, restaurar: () => { globalThis.fetch = original } }
}

const LUNA = (texto: string) => ({
  status: 200,
  corpo: {
    status: 'completed',
    output: [{ type: 'message', content: [{ type: 'output_text', text: texto }] }],
    usage: { input_tokens: 1000, output_tokens: 20, total_tokens: 1020, input_tokens_details: { cached_tokens: 800 } },
  },
})
const HAIKU = (texto: string) => ({
  status: 200,
  corpo: {
    id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'end_turn',
    content: [{ type: 'text', text: texto }],
    usage: { input_tokens: 10, output_tokens: 2 },
  },
})
const pedido = { mensagens: [{ papel: 'usuario' as const, texto: 'oi' }], maxSaida: 100 }

Deno.test('Luna responde: Haiku nem é chamado', async () => {
  const f = falso([LUNA('oi!')])
  try {
    const r = await chamarIA(pedido)
    ok(r.ok)
    igual(r.texto, 'oi!')
    igual(r.modelo, 'gpt-6-luna')
    igual(f.pedidos.map((p) => p.lado), ['openai'])
  } finally { f.restaurar() }
})

Deno.test('Luna fora (503): cai no Haiku', async () => {
  const f = falso([{ status: 503 }], [HAIKU('oi, tudo bem?')])
  try {
    const r = await chamarIA(pedido)
    ok(r.ok)
    igual(r.modelo, 'claude-haiku-5-5')
    igual(f.pedidos.map((p) => p.lado), ['openai', 'anthropic'])
  } finally { f.restaurar() }
})

Deno.test('Luna travada: corta e o Haiku responde dentro do tempo', async () => {
  const f = falso([{ status: 200, trava: true }], [HAIKU('voltei')])
  try {
    const t0 = Date.now()
    const r = await chamarIA(pedido, { timeoutMs: 500 })
    ok(r.ok)
    igual(r.modelo, 'claude-haiku-5-5')
    ok(Date.now() - t0 < 4_500)
  } finally { f.restaurar() }
})

Deno.test('recusa do Luna não vai pra reserva', async () => {
  const f = falso([{ status: 200, corpo: { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'não' }] }] } }])
  try {
    const r = await chamarIA(pedido)
    ok(!r.ok)
    ok(r.bloqueado)
    igual(f.pedidos.length, 1)
  } finally { f.restaurar() }
})

Deno.test('disjuntor aberto: vai direto no Haiku', async () => {
  const f = falso([], [HAIKU('direto')])
  try {
    const r = await chamarIA(pedido, { pularPrincipal: true })
    igual(r.texto, 'direto')
    igual(f.pedidos.map((p) => p.lado), ['anthropic'])
  } finally { f.restaurar() }
})

Deno.test('os dois fora: falha sem estourar', async () => {
  const f = falso([{ status: 500 }], [{ status: 500 }])
  try {
    const r = await chamarIA(pedido)
    ok(!r.ok)
    ok(!r.bloqueado)
  } finally { f.restaurar() }
})

Deno.test('corpo do Luna: store false, raciocínio none/low, sem temperature', () => {
  const gratis = corpoOpenAI(pedido, 'gpt-6-luna', false)
  igual(gratis.store, false)
  igual(gratis.reasoning, { effort: 'none' })
  igual(gratis.max_output_tokens, 100)
  ok(!('temperature' in gratis))
  const pago = corpoOpenAI({ ...pedido, pensar: true }, 'gpt-6-luna', true)
  igual(pago.reasoning, { effort: 'low' })
  igual(pago.max_output_tokens, 100 + 1024)
  igual(pago.stream, true)
})

Deno.test('corpo do Luna: ferramenta forçada, JSON e foto na última fala', () => {
  const c = corpoOpenAI({
    sistema: 'Responda só JSON.',
    mensagens: [{ papel: 'life', texto: 'antes' }, { papel: 'usuario', texto: 'a' }, { papel: 'usuario', texto: 'b' }],
    imagem: { mime: 'image/png', base64: 'AAAA' },
    ferramentas: [{ name: 'pausar_life_hoje', description: 'pausa' }],
    forcar: 'pausar_life_hoje',
    maxSaida: 50,
    json: true,
  }, 'gpt-6-luna', false)
  igual(c.tool_choice, { type: 'function', name: 'pausar_life_hoje' })
  igual((c.tools as Record<string, unknown>[])[0].parameters, { type: 'object', properties: {} })
  igual(c.text, { format: { type: 'json_object' } })
  const input = c.input as { role: string; content: unknown }[]
  igual(input.length, 1) // fala do Life no começo sai; as duas da pessoa juntam
  igual(input[0].content, [
    { type: 'input_image', image_url: 'data:image/png;base64,AAAA' },
    { type: 'input_text', text: 'a\nb' },
  ])
})

Deno.test('modo JSON sem a palavra no pedido: acrescenta', () => {
  const c = corpoOpenAI({ mensagens: [{ papel: 'usuario', texto: 'x' }], maxSaida: 10, json: true }, 'gpt-6-luna', false)
  igual(c.instructions, 'Responda só JSON.')
})

Deno.test('resposta do Luna: ferramenta, uso e custo com cache', () => {
  const r = lerRespostaOpenAI({
    status: 'completed',
    output: [
      { type: 'reasoning' },
      { type: 'function_call', name: 'registrar_alimentos', arguments: '{"itens":[{"nome":"ovo"}]}' },
    ],
    usage: { input_tokens: 1000, output_tokens: 300, input_tokens_details: { cached_tokens: 800 }, output_tokens_details: { reasoning_tokens: 100 } },
  }, 'gpt-6-luna')
  ok(r.ok)
  igual(r.chamadas, [{ nome: 'registrar_alimentos', args: { itens: [{ nome: 'ovo' }] } }])
  igual(r.uso, { entrada: 1000, saida: 200, raciocinio: 100, cache: 800 })
  // 200 sem cache × 0,10 + 800 × 0,01 + 300 × 0,50 (por 1M)
  igual(Math.round(r.custo * 1e9), Math.round(((200 * 0.1 + 800 * 0.01 + 300 * 0.5) / 1e6) * 1e9))
})

Deno.test('corpo do Haiku: sem temperature, raciocínio desligado no grátis, ferramenta forçada', () => {
  const c = corpoAnthropic({
    ...pedido,
    ferramentas: [{ name: 'pausar_life_hoje', description: 'pausa' }],
    forcar: 'pausar_life_hoje',
  }, 'claude-haiku-5-5')
  ok(!('temperature' in c))
  igual(c.thinking, { type: 'disabled' })
  igual(c.output_config, { effort: 'low' })
  igual(c.tool_choice, { type: 'tool', name: 'pausar_life_hoje' })
  igual(c.max_tokens, 100)
  const pago = corpoAnthropic({ ...pedido, pensar: true }, 'claude-haiku-5-5')
  igual(pago.thinking, { type: 'adaptive' })
  igual(pago.max_tokens, 1124)
})

Deno.test('normalizar: junta falas seguidas e começa pela pessoa', () => {
  igual(normalizarMensagens([
    { papel: 'life', texto: 'oi' }, { papel: 'usuario', texto: 'a' }, { papel: 'usuario', texto: 'b' }, { papel: 'life', texto: 'c' },
  ]), [{ papel: 'usuario', texto: 'a\nb' }, { papel: 'life', texto: 'c' }])
})

Deno.test('custo de modelo sem preço é zero; pausa expira', () => {
  igual(custo('outro', { entrada: 10, saida: 10, raciocinio: 0, cache: 0 }), 0)
  ok(pausado(new Date(Date.now() + 60_000).toISOString()))
  ok(!pausado(new Date(Date.now() - 1).toISOString()))
  ok(!pausado(null))
})
