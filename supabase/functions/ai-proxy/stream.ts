// ================================================================
// Streaming do chat (Fase 7, guia item 11).
//
// O Gemini manda a resposta em pedaços (SSE). O ai-proxy junta tudo no mesmo
// formato do generateContent (o resto do código não muda) e, enquanto junta,
// mostra um RASCUNHO na bolha do app. A resposta final continua sendo a do
// servidor (filtros, cartões, ações) e substitui o rascunho no fim.
// ================================================================

interface Parte { text?: string; functionCall?: unknown; thought?: boolean }
interface Pedaco {
  candidates?: { content?: { parts?: Parte[] }; finishReason?: string }[]
  usageMetadata?: Record<string, unknown>
  promptFeedback?: Record<string, unknown>
}

/** Junta os eventos `data: {...}` do streamGenerateContent num corpo só. */
export async function juntarStream(
  corpo: ReadableStream<Uint8Array>,
  aoEscrever?: (acumulado: string) => void,
): Promise<Pedaco> {
  const leitor = corpo.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let texto = ''
  const chamadas: Parte[] = []
  let finishReason: string | undefined
  let usageMetadata: Record<string, unknown> | undefined
  let promptFeedback: Record<string, unknown> | undefined

  const evento = (linha: string) => {
    if (!linha.startsWith('data:')) return
    const bruto = linha.slice(5).trim()
    if (!bruto || bruto === '[DONE]') return
    let p: Pedaco
    try { p = JSON.parse(bruto) } catch { return }
    if (p.usageMetadata) usageMetadata = p.usageMetadata
    if (p.promptFeedback) promptFeedback = p.promptFeedback
    const c = p.candidates?.[0]
    if (c?.finishReason) finishReason = c.finishReason
    let mudou = false
    for (const parte of c?.content?.parts ?? []) {
      if (parte.thought) continue
      if (typeof parte.text === 'string' && parte.text) { texto += parte.text; mudou = true }
      if (parte.functionCall) chamadas.push({ functionCall: parte.functionCall })
    }
    if (mudou && aoEscrever) aoEscrever(texto)
  }

  for (;;) {
    const { value, done } = await leitor.read()
    if (value) buffer += value
    let i: number
    while ((i = buffer.indexOf('\n')) >= 0) {
      evento(buffer.slice(0, i).replace(/\r$/, ''))
      buffer = buffer.slice(i + 1)
    }
    if (done) break
  }
  if (buffer) evento(buffer)

  return {
    candidates: [{ content: { parts: [...(texto ? [{ text: texto }] : []), ...chamadas] }, finishReason }],
    usageMetadata,
    promptFeedback,
  }
}

/**
 * Rascunho da bolha. `aoEscrever` recebe o texto acumulado do modelo; `emitir`
 * só é chamado com o pedaço que já pode aparecer na tela:
 * - "[fora]" no começo: nada (a resposta vai ser a fixa).
 * - Marcas do fim ([[RESUMO]], [[LEMBRAR]], [[receita:..]], [[HUMOR]]): corta antes delas,
 *   e segura um "[" solto no fim (pode ser o começo de uma marca).
 * - `barrar` (filtros de saída: prescrição, receita completa): se pegar uma vez,
 *   o rascunho para de vez — a resposta final do servidor troca o texto.
 * Só emite quando o texto cresce (nunca "desescreve" na tela).
 */
export function novoRascunho(barrar: (t: string) => boolean, emitir: (texto: string) => void) {
  let parado = false
  let ultimo = ''
  return {
    get parado() { return parado },
    get emitido() { return ultimo },
    aoEscrever(acumulado: string) {
      if (parado) return
      const t = acumulado.replace(/^\s+/, '')
      if (t.length < 8 && /^\[/.test(t)) return
      if (/^\[\s*fora\s*\]/i.test(t)) { parado = true; return }
      let visivel = t
      const marca = visivel.indexOf('[[')
      if (marca >= 0) visivel = visivel.slice(0, marca)
      visivel = visivel.replace(/\[$/, '').trimEnd()
      if (barrar(visivel)) { parado = true; return }
      if (visivel.length < 2 || visivel.length <= ultimo.length || !visivel.startsWith(ultimo)) return
      ultimo = visivel
      emitir(visivel)
    },
  }
}

/** Uma linha do corpo NDJSON que vai pro app. */
export function linhaNdjson(o: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(o) + '\n')
}
