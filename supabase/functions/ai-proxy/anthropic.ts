// ================================================================
// Anthropic — reserva (Claude Haiku 5.5), pelo SDK oficial.
// Haiku 5.5: sem temperature (400), sem prefill, raciocínio desligado só
// até effort high — aqui sempre low.
// ================================================================
import Anthropic from 'npm:@anthropic-ai/sdk@1.1.0'
import {
  custo, falha, FOLGA_RACIOCINIO, normalizarMensagens, sistemaComJson,
  type ChamadaFerramenta, type PedidoIA, type ResultadoIA, type UsoTokens,
} from './ia.ts'

let cliente: Anthropic | null = null
function obterCliente(chave: string): Anthropic {
  // A reserva é nossa (ia.ts): o SDK não repete sozinho, senão estoura o tempo.
  // fetch resolvido a cada chamada (o SDK guardaria o do momento da criação; os testes trocam).
  cliente ??= new Anthropic({ apiKey: chave, maxRetries: 0, fetch: (...a) => globalThis.fetch(...a) })
  return cliente
}

type Midia = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export function corpoAnthropic(p: PedidoIA, modelo: string): Anthropic.MessageCreateParamsNonStreaming {
  const mensagens = normalizarMensagens(p.mensagens)
  const ultimaDaPessoa = mensagens.map((m) => m.papel).lastIndexOf('usuario')
  const messages: Anthropic.MessageParam[] = mensagens.map((m, i) => {
    if (m.papel === 'life') return { role: 'assistant', content: m.texto }
    if (p.imagem && i === ultimaDaPessoa) {
      return {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: p.imagem.mime as Midia, data: p.imagem.base64 } },
          { type: 'text', text: m.texto },
        ],
      }
    }
    return { role: 'user', content: m.texto }
  })
  const sistema = sistemaComJson(p.fixo ? { ...p, sistema: p.sistema ? `${p.fixo}\n\n${p.sistema}` : p.fixo } : p)
  const ferramentas = p.ferramentas?.length ? p.ferramentas : null
  return {
    model: modelo,
    max_tokens: p.maxSaida + (p.pensar ? FOLGA_RACIOCINIO : 0),
    ...(sistema ? { system: sistema } : {}),
    messages,
    thinking: p.pensar ? { type: 'adaptive' } : { type: 'disabled' },
    output_config: { effort: 'low' },
    ...(ferramentas
      ? {
        tools: ferramentas.map((f) => ({
          name: f.name,
          description: f.description,
          input_schema: (f.parameters ?? { type: 'object', properties: {} }) as Anthropic.Tool.InputSchema,
        })),
        tool_choice: p.forcar ? { type: 'tool', name: p.forcar } : { type: 'auto' },
      }
      : {}),
  }
}

export function lerRespostaAnthropic(msg: Anthropic.Message, modelo: string): ResultadoIA {
  let texto = ''
  const chamadas: ChamadaFerramenta[] = []
  for (const b of msg.content) {
    if (b.type === 'text') texto += b.text
    else if (b.type === 'tool_use') {
      const args = b.input
      chamadas.push({ nome: b.name, args: args && typeof args === 'object' ? args as Record<string, unknown> : {} })
    }
  }
  const u = msg.usage
  const cacheLido = Number(u.cache_read_input_tokens ?? 0)
  const uso: UsoTokens = {
    entrada: Number(u.input_tokens ?? 0) + cacheLido + Number(u.cache_creation_input_tokens ?? 0),
    saida: Number(u.output_tokens ?? 0),
    raciocinio: 0,
    cache: cacheLido,
  }
  const bloqueado = msg.stop_reason === 'refusal'
  return {
    ok: !bloqueado && (texto.length > 0 || chamadas.length > 0),
    texto: bloqueado ? '' : texto,
    chamadas,
    tokens: uso.entrada + uso.saida,
    custo: custo(modelo, uso),
    bloqueado,
    uso,
    modelo,
  }
}

export async function chamarAnthropic(
  p: PedidoIA, modelo: string, timeoutMs: number, aoEscrever?: (acumulado: string) => void,
): Promise<ResultadoIA> {
  const chave = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
  if (!chave) {
    console.error('[anthropic] sem ANTHROPIC_API_KEY')
    return falha(modelo)
  }
  const t0 = Date.now()
  const opcoes = { timeout: timeoutMs, maxRetries: 0 }
  try {
    const corpo = corpoAnthropic(p, modelo)
    let primeiraEm: number | undefined
    let msg: Anthropic.Message
    if (aoEscrever) {
      let acumulado = ''
      const stream = obterCliente(chave).messages.stream(corpo, opcoes)
      stream.on('text', (pedaco) => {
        primeiraEm ??= Date.now()
        acumulado += pedaco
        aoEscrever(acumulado)
      })
      msg = await stream.finalMessage()
    } else {
      msg = await obterCliente(chave).messages.create(corpo, opcoes)
    }
    const r = lerRespostaAnthropic(msg, modelo)
    console.log('[anthropic]', r.ok ? 'ok' : `vazio(${msg.stop_reason})`, modelo, `${Date.now() - t0}ms`, `saiu=${r.uso?.saida ?? 0}`)
    return { ...r, primeiraEm }
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error('[anthropic] http', e.status, modelo, `${Date.now() - t0}ms`, e.message.slice(0, 300))
    } else {
      console.error('[anthropic] erro de rede/timeout', modelo, `${Date.now() - t0}ms de ${timeoutMs}ms`, String(e))
    }
    return falha(modelo)
  }
}
