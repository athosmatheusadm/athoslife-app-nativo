// ================================================================
// OpenAI — API Responses (gpt-6-luna). store:false: a OpenAI não guarda
// a conversa; a memória do Life continua só no Supabase.
// Sem temperature: modelo de raciocínio não aceita.
// ================================================================
import {
  custo, falha, FOLGA_RACIOCINIO, normalizarMensagens,
  type ChamadaFerramenta, type PedidoIA, type ResultadoIA, type UsoTokens,
} from './ia.ts'
import { lerSSE } from './stream.ts'

const URL_RESPONSES = 'https://api.openai.com/v1/responses'

export function corpoOpenAI(p: PedidoIA, modelo: string, stream: boolean): Record<string, unknown> {
  const mensagens = normalizarMensagens(p.mensagens)
  // Modo JSON: a OpenAI exige a palavra "json" nas MENSAGENS (nas instruções não basta — 400 em 08/11).
  if (p.json && !mensagens.some((m) => /json/i.test(m.texto))) {
    const ultima = mensagens.map((m) => m.papel).lastIndexOf('usuario')
    if (ultima >= 0) mensagens[ultima] = { ...mensagens[ultima], texto: `${mensagens[ultima].texto}\n\n(Responda em JSON.)` }
  }
  const ultimaDaPessoa = mensagens.map((m) => m.papel).lastIndexOf('usuario')
  const input = mensagens.map((m, i) => {
    if (m.papel === 'life') return { role: 'assistant', content: m.texto }
    if (p.imagem && i === ultimaDaPessoa) {
      return {
        role: 'user',
        content: [
          { type: 'input_image', image_url: `data:${p.imagem.mime};base64,${p.imagem.base64}` },
          { type: 'input_text', text: m.texto },
        ],
      }
    }
    return { role: 'user', content: m.texto }
  })
  const sistema = p.sistema
  const ferramentas = p.ferramentas?.length ? p.ferramentas : null
  return {
    model: modelo,
    ...(sistema ? { instructions: sistema } : {}),
    input,
    store: false,
    stream,
    reasoning: { effort: p.pensar ? 'low' : 'none' },
    max_output_tokens: p.maxSaida + (p.pensar ? FOLGA_RACIOCINIO : 0),
    ...(ferramentas
      ? {
        tools: ferramentas.map((f) => ({
          type: 'function',
          name: f.name,
          description: f.description,
          parameters: f.parameters ?? { type: 'object', properties: {} },
        })),
        tool_choice: p.forcar ? { type: 'function', name: p.forcar } : 'auto',
      }
      : {}),
    ...(p.json ? { text: { format: { type: 'json_object' } } } : {}),
  }
}

interface ItemSaida {
  type?: string
  name?: string
  arguments?: string
  content?: { type?: string; text?: string; refusal?: string }[]
}
interface RespostaOpenAI {
  status?: string
  incomplete_details?: { reason?: string } | null
  output?: ItemSaida[]
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
    input_tokens_details?: { cached_tokens?: number }
    output_tokens_details?: { reasoning_tokens?: number }
  }
}

export function lerRespostaOpenAI(data: RespostaOpenAI, modelo: string): ResultadoIA {
  let texto = ''
  let recusou = false
  const chamadas: ChamadaFerramenta[] = []
  for (const item of data.output ?? []) {
    if (item.type === 'message') {
      for (const c of item.content ?? []) {
        if (c.type === 'output_text' && typeof c.text === 'string') texto += c.text
        if (c.type === 'refusal') recusou = true
      }
    } else if (item.type === 'function_call' && typeof item.name === 'string') {
      let args: unknown = {}
      try { args = JSON.parse(item.arguments || '{}') } catch { args = {} }
      chamadas.push({ nome: item.name, args: args && typeof args === 'object' ? args as Record<string, unknown> : {} })
    }
  }
  const u = data.usage ?? {}
  const raciocinio = Number(u.output_tokens_details?.reasoning_tokens ?? 0)
  const uso: UsoTokens = {
    entrada: Number(u.input_tokens ?? 0),
    saida: Math.max(Number(u.output_tokens ?? 0) - raciocinio, 0),
    raciocinio,
    cache: Number(u.input_tokens_details?.cached_tokens ?? 0),
  }
  const bloqueado = recusou || data.incomplete_details?.reason === 'content_filter'
  return {
    ok: !bloqueado && (texto.length > 0 || chamadas.length > 0),
    texto: bloqueado ? '' : texto,
    chamadas,
    tokens: Number(u.total_tokens ?? uso.entrada + uso.saida + uso.raciocinio),
    custo: custo(modelo, uso),
    bloqueado,
    uso,
    modelo,
  }
}

export async function chamarOpenAI(
  p: PedidoIA, modelo: string, timeoutMs: number, aoEscrever?: (acumulado: string) => void,
): Promise<ResultadoIA> {
  const chave = Deno.env.get('OPENAI_API_KEY') ?? ''
  if (!chave) {
    console.error('[openai] sem OPENAI_API_KEY')
    return falha(modelo)
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const t0 = Date.now()
  try {
    const res = await fetch(URL_RESPONSES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
      body: JSON.stringify(corpoOpenAI(p, modelo, !!aoEscrever)),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const erro = (await res.text().catch(() => '')).slice(0, 300)
      console.error('[openai] http', res.status, modelo, `${Date.now() - t0}ms`, erro)
      return falha(modelo)
    }
    let primeiraEm: number | undefined
    let data: RespostaOpenAI | null = null
    if (aoEscrever && res.body) {
      let acumulado = ''
      await lerSSE(res.body, (ev) => {
        if (ev.type === 'response.output_text.delta' && typeof ev.delta === 'string') {
          primeiraEm ??= Date.now()
          acumulado += ev.delta
          aoEscrever(acumulado)
        } else if (ev.type === 'response.completed' || ev.type === 'response.incomplete') {
          data = ev.response as RespostaOpenAI
        } else if (ev.type === 'response.failed' || ev.type === 'error') {
          console.error('[openai] stream falhou', modelo, JSON.stringify(ev).slice(0, 300))
        }
      })
    } else {
      data = await res.json()
    }
    if (!data) return falha(modelo)
    const r = lerRespostaOpenAI(data, modelo)
    console.log('[openai]', r.ok ? 'ok' : 'vazio', modelo, `${Date.now() - t0}ms`, `pensou=${r.uso?.raciocinio ?? 0}`, `saiu=${r.uso?.saida ?? 0}`, `cache=${r.uso?.cache ?? 0}`)
    return { ...r, primeiraEm }
  } catch (e) {
    console.error('[openai] erro de rede/timeout', modelo, `${Date.now() - t0}ms de ${timeoutMs}ms`, String(e))
    return falha(modelo)
  } finally {
    clearTimeout(timer)
  }
}
