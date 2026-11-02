// ================================================================
// Chamada ao Gemini (separada do index.ts em 02/11 pra ter teste).
//
// Regra que não pode quebrar: o chat nunca para. O modelo do chat (Flash)
// recebe o raciocínio no nível que ele aceita; se recusar, travar, estiver
// sobrecarregado ou fora, a chamada cai no MODELO (Lite) com o tempo que
// sobrou. (02/11: o Flash recusava "minimal" com 400, a nova tentativa sem
// limite estourava os 25 s, e o chat devolveu ia_falhou pra todo mundo.)
// ================================================================
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { juntarStream } from './stream.ts'

const env = (k: string, padrao = '') => Deno.env.get(k) ?? padrao

export const GEMINI_KEY = env('GEMINI_API_KEY')
// 2.5 ficou restrito a quem já usava (erro 404 em 2026-09-27). Troca sem
// republicar: Secret GEMINI_MODEL no painel do Supabase.
export const MODELO = env('GEMINI_MODEL', 'gemini-3.5-flash-lite')
/**
 * Só o chat do Life (01/11, dono): o Lite seguia as regras do prompt pela
 * metade. Flash no chat; scanner, receitas e check-in continuam no Lite.
 * Troca sem republicar: Secret GEMINI_MODEL_CHAT. Se o modelo do chat der
 * 404/400 de modelo, a chamada cai no MODELO (o chat nunca para).
 */
export const MODELO_CHAT = env('GEMINI_MODEL_CHAT', 'gemini-3.8-flash')

// Preço por 1M tokens (USD, entrada/saída) — só pra estimar custo no log.
export const PRECOS: Record<string, [number, number]> = {
  'gemini-2.5-flash': [0.3, 2.5],
  'gemini-2.5-flash-lite': [0.1, 0.4],
  'gemini-3.5-flash-lite': [0.3, 2.5],
  'gemini-3.8-flash': [0.75, 3.75],
}

export interface ChamadaFerramenta {
  nome: string
  args: Record<string, unknown>
}

export interface ResultadoGemini {
  ok: boolean
  texto: string
  /** Ações que o modelo pediu (function calling) — o servidor valida e executa. */
  chamadas: ChamadaFerramenta[]
  tokens: number
  custo: number
  bloqueado: boolean
  /** Tokens separados, como o Google devolve (só pro log de custo). */
  uso?: UsoTokens
  /** Modelo que respondeu de fato (pro log). */
  modelo?: string
  /** Fase 7: instante (epoch ms) do primeiro pedaço de texto, quando veio em streaming. */
  primeiraEm?: number
}

export interface UsoTokens { entrada: number; saida: number; raciocinio: number; cache: number }

export function somarUso(a?: UsoTokens, b?: UsoTokens): UsoTokens | undefined {
  if (!a || !b) return a ?? b
  return { entrada: a.entrada + b.entrada, saida: a.saida + b.saida, raciocinio: a.raciocinio + b.raciocinio, cache: a.cache + b.cache }
}

/**
 * Se o Google recusar a requisição (400 — o erro vem genérico, "invalid
 * argument", sem dizer o campo), tenta de novo SEM thinkingConfig, com folga
 * no teto de saída, porque o raciocínio conta dentro de maxOutputTokens e
 * poderia deixar a resposta vazia. (28/09: família 3.x recusou
 * thinkingBudget 0 e o chat inteiro caiu com 502.)
 */
/** `aoEscrever` (Fase 7): streaming — recebe o texto acumulado a cada pedaço. */
export async function chamarGemini(
  corpo: Record<string, unknown>, timeoutMs = 25_000, modelo = MODELO, aoEscrever?: (acumulado: string) => void,
): Promise<ResultadoGemini> {
  // O raciocínio vai no nível que ESTE modelo aceita (02/11: o Flash 3.x recusa
  // "minimal" com 400; sem limite, pensava demais e estourava o tempo).
  const cfgAtual = corpo.generationConfig as Record<string, unknown> | undefined
  const comRaciocinio = (cfg: Record<string, unknown> | undefined, thinking: Record<string, unknown> | null) => {
    if (!cfg?.thinkingConfig) return corpo
    const c = { ...cfg }
    if (thinking) c.thinkingConfig = thinking
    else { delete c.thinkingConfig; c.maxOutputTokens = Number(c.maxOutputTokens ?? 0) + 1024 }
    return { ...corpo, generationConfig: c }
  }
  // Com reserva (modelo do chat ≠ padrão), o principal tem menos tempo: sobra pro reserva.
  const temReserva = modelo !== MODELO
  const tempo = temReserva ? Math.min(timeoutMs, 14_000) : timeoutMs
  let r = await chamarGeminiUmaVez(comRaciocinio(cfgAtual, configRaciocinio(modelo)), tempo, modelo, aoEscrever)
  if (!r.ok && r.status === 400 && cfgAtual?.thinkingConfig && /thinking/i.test(r.erro)) {
    const outro = configRaciocinio(modelo).thinkingLevel === 'low' ? null : { thinkingLevel: 'low' }
    r = await chamarGeminiUmaVez(comRaciocinio(cfgAtual, outro), tempo, modelo, aoEscrever)
  }
  // Modelo do chat fora, sobrecarregado ou lento demais: cai no padrão — o chat nunca para.
  const vale = r.status === 0 || r.status === 400 || r.status === 404 || r.status === 429 || r.status >= 500
  if (!r.ok && temReserva && !r.bloqueado && vale) {
    console.warn('[gemini] modelo', modelo, 'falhou com', r.status || 'timeout', '— usando', MODELO)
    return chamarGemini(corpo, timeoutMs, MODELO, aoEscrever)
  }
  return r
}

async function chamarGeminiUmaVez(
  corpo: Record<string, unknown>,
  timeoutMs: number,
  modelo: string,
  aoEscrever?: (acumulado: string) => void,
): Promise<ResultadoGemini & { status: number; erro: string }> {
  const falha = { ok: false, texto: '', chamadas: [] as ChamadaFerramenta[], tokens: 0, custo: 0, bloqueado: false, status: 0, erro: '' }
  if (!GEMINI_KEY) return falha

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const t0 = Date.now()
  try {
    const res = await fetch(
      aoEscrever
        ? `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:streamGenerateContent?alt=sse`
        : `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
      {
        method: 'POST',
        // Chave no cabeçalho, não na URL (URL vai parar em log).
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify(corpo),
        signal: ctrl.signal,
      },
    )
    if (!res.ok) {
      const erro = (await res.text().catch(() => '')).slice(0, 300)
      console.error('[gemini] http', res.status, modelo, `${Date.now() - t0}ms`, erro)
      return { ...falha, status: res.status, erro }
    }
    let primeiraEm: number | undefined
    const data = aoEscrever && res.body
      ? await juntarStream(res.body, (acc) => { primeiraEm ??= Date.now(); aoEscrever(acc) })
      : await res.json()
    const uso = data?.usageMetadata ?? {}
    console.log('[gemini] ok', modelo, `${Date.now() - t0}ms`, `pensou=${uso.thoughtsTokenCount ?? 0}`, `saiu=${uso.candidatesTokenCount ?? 0}`)
    const entrada = Number(uso.promptTokenCount ?? 0)
    const saida = Number(uso.candidatesTokenCount ?? 0) + Number(uso.thoughtsTokenCount ?? 0)
    const [pe, ps] = PRECOS[modelo] ?? [0, 0]
    const candidato = data?.candidates?.[0]
    const bloqueado = Boolean(data?.promptFeedback?.blockReason) || candidato?.finishReason === 'SAFETY'
    const txt: string =
      candidato?.content?.parts?.filter((p: { text?: string }) => typeof p?.text === 'string')
        .map((p: { text: string }) => p.text).join('') ?? ''
    const chamadas: ChamadaFerramenta[] = (candidato?.content?.parts ?? [])
      .map((p: { functionCall?: { name?: unknown; args?: unknown } }) => p?.functionCall)
      .filter((fc: { name?: unknown } | undefined) => typeof fc?.name === 'string')
      .map((fc: { name: string; args?: unknown }) => ({
        nome: fc.name,
        args: fc.args && typeof fc.args === 'object' ? (fc.args as Record<string, unknown>) : {},
      }))
    return {
      ok: !bloqueado && (txt.length > 0 || chamadas.length > 0),
      texto: txt,
      chamadas,
      tokens: Number(uso.totalTokenCount ?? entrada + saida),
      custo: (entrada * pe + saida * ps) / 1_000_000,
      bloqueado,
      uso: {
        entrada,
        saida: Number(uso.candidatesTokenCount ?? 0),
        raciocinio: Number(uso.thoughtsTokenCount ?? 0),
        cache: Number(uso.cachedContentTokenCount ?? 0),
      },
      modelo,
      primeiraEm,
      status: res.status,
      erro: '',
    }
  } catch (e) {
    console.error('[gemini] erro de rede/timeout', modelo, `${Date.now() - t0}ms de ${timeoutMs}ms`, String(e))
    return falha
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Raciocínio no mínimo. Gemini 2.x: thinkingBudget 0 (desliga). Gemini 3.x
 * não aceita thinkingBudget 0 (dá 400) — usa thinkingLevel "minimal".
 */
export function configRaciocinio(modelo = MODELO): Record<string, unknown> {
  if (/^gemini-2\./.test(modelo)) return { thinkingBudget: 0 }
  // 3.x: só o Lite aceita "minimal"; Flash/Pro começam em "low".
  return /lite/.test(modelo) ? { thinkingLevel: 'minimal' } : { thinkingLevel: 'low' }
}

/** Config base: sem "raciocínio" (thinking gasta token escondido), saída curta. */
export function configGeracao(maxTokens: number, temperatura: number, json = false) {
  return {
    temperature: temperatura,
    maxOutputTokens: maxTokens,
    thinkingConfig: configRaciocinio(),
    ...(json ? { responseMimeType: 'application/json' } : {}),
  }
}

// ================================================================
// Disjuntor do modelo do chat (02/11). Se o Flash falhou e o Lite respondeu,
// o chat pula o Flash por PAUSA_MS — em todas as instâncias da função (fica
// no banco, em life_config) — em vez de fazer cada pessoa esperar o Flash
// estourar o tempo. Depois da pausa, o Flash é tentado de novo sozinho.
// ================================================================

export const CHAVE_PAUSA = 'modelo_chat_pausado_ate'
export const PAUSA_MS = 10 * 60_000

/** O Flash está pausado agora? (valor = instante ISO até quando) */
export function pausado(valor: string | null | undefined, agora = Date.now()): boolean {
  const ate = valor ? Date.parse(valor) : NaN
  return Number.isFinite(ate) && ate > agora
}

export async function modeloChatPausado(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.from('life_config').select('valor').eq('chave', CHAVE_PAUSA).maybeSingle()
  if (error) return false
  return pausado((data as { valor?: string } | null)?.valor)
}

export async function pausarModeloChat(sb: SupabaseClient, agora = Date.now()): Promise<void> {
  const { error } = await sb.from('life_config')
    .upsert({ chave: CHAVE_PAUSA, valor: new Date(agora + PAUSA_MS).toISOString() }, { onConflict: 'chave' })
  if (error) console.warn('[gemini] pausar modelo do chat falhou', error.message)
  else console.warn('[gemini] modelo do chat pausado por', PAUSA_MS / 60_000, 'min')
}
