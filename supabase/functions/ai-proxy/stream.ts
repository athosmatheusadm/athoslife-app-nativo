// ================================================================
// Streaming do chat (Fase 7, guia item 11).
//
// O modelo manda a resposta em pedaços (SSE). Enquanto chega, o app mostra
// um RASCUNHO na bolha. A resposta final continua sendo a do servidor
// (filtros, cartões, ações) e substitui o rascunho no fim.
// ================================================================

/** Lê um corpo SSE e entrega cada evento `data: {...}` já como objeto. */
export async function lerSSE(
  corpo: ReadableStream<Uint8Array>,
  aoEvento: (ev: Record<string, unknown>) => void,
): Promise<void> {
  const leitor = corpo.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  const linha = (l: string) => {
    if (!l.startsWith('data:')) return
    const bruto = l.slice(5).trim()
    if (!bruto || bruto === '[DONE]') return
    let ev: unknown
    try { ev = JSON.parse(bruto) } catch { return }
    if (ev && typeof ev === 'object') aoEvento(ev as Record<string, unknown>)
  }
  for (;;) {
    const { value, done } = await leitor.read()
    if (value) buffer += value
    let i: number
    while ((i = buffer.indexOf('\n')) >= 0) {
      linha(buffer.slice(0, i).replace(/\r$/, ''))
      buffer = buffer.slice(i + 1)
    }
    if (done) break
  }
  if (buffer) linha(buffer)
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
