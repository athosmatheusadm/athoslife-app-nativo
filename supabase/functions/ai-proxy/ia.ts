// ================================================================
// Chamada à IA (08/11: saiu o Gemini; principal gpt-6-luna, reserva
// Claude Haiku 5.5). O resto do ai-proxy só fala com chamarIA, num
// formato neutro; openai.ts e anthropic.ts traduzem pro de cada um.
//
// Regra que não pode quebrar: o chat nunca para. Se o principal recusar a
// requisição, travar, estiver sobrecarregado ou sem chave, a mesma
// requisição vai pra reserva com o tempo que sobrou.
// ================================================================
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { chamarOpenAI } from './openai.ts'
import { chamarAnthropic } from './anthropic.ts'

const env = (k: string, padrao = '') => Deno.env.get(k) ?? padrao

/** Troca sem republicar: Secrets IA_MODELO e IA_MODELO_RESERVA no painel do Supabase. */
export const MODELO = env('IA_MODELO', 'gpt-6-luna')
export const MODELO_RESERVA = env('IA_MODELO_RESERVA', 'claude-haiku-5-5')

/** US$ por 1M tokens. Cache = entrada lida do cache (10% da entrada nos dois). */
export const PRECOS: Record<string, { entrada: number; cache: number; saida: number }> = {
  'gpt-6-luna': { entrada: 0.1, cache: 0.01, saida: 0.5 },
  'claude-haiku-5-5': { entrada: 0.1, cache: 0.01, saida: 0.5 },
}

/** Ferramenta (function calling) em JSON Schema. */
export interface Ferramenta {
  name: string
  description: string
  parameters?: Record<string, unknown>
}

export interface MensagemIA {
  papel: 'usuario' | 'life'
  texto: string
}

export interface PedidoIA {
  sistema?: string
  /** Começa pela pessoa; falas seguidas do mesmo lado são juntadas. */
  mensagens: MensagemIA[]
  /** Foto (base64 sem prefixo) — vai junto da última mensagem da pessoa. */
  imagem?: { mime: string; base64: string }
  ferramentas?: Ferramenta[] | null
  /** Obriga esta ferramenta (ex.: registrar_alimentos quando o Life prometeu o cartão). */
  forcar?: string
  /** Teto da resposta visível; o raciocínio, quando ligado, ganha folga à parte. */
  maxSaida: number
  json?: boolean
  /** Raciocínio baixo em vez de nenhum (pago, fora do modo economia). */
  pensar?: boolean
}

export interface ChamadaFerramenta {
  nome: string
  args: Record<string, unknown>
}

export interface UsoTokens { entrada: number; saida: number; raciocinio: number; cache: number }

export interface ResultadoIA {
  ok: boolean
  texto: string
  /** Ações que o modelo pediu — o servidor valida e executa. */
  chamadas: ChamadaFerramenta[]
  tokens: number
  custo: number
  /** Recusa do modelo (filtro de segurança). Não vai pra reserva. */
  bloqueado: boolean
  uso?: UsoTokens
  /** Modelo que respondeu de fato (pro log). */
  modelo?: string
  /** Instante (epoch ms) do primeiro pedaço de texto, quando veio em streaming. */
  primeiraEm?: number
}

export type Provedor = (
  p: PedidoIA, modelo: string, timeoutMs: number, aoEscrever?: (acumulado: string) => void,
) => Promise<ResultadoIA>

export const FOLGA_RACIOCINIO = 1024

export function falha(modelo: string): ResultadoIA {
  return { ok: false, texto: '', chamadas: [], tokens: 0, custo: 0, bloqueado: false, modelo }
}

export function custo(modelo: string, uso: UsoTokens): number {
  const p = PRECOS[modelo]
  if (!p) return 0
  const semCache = Math.max(uso.entrada - uso.cache, 0)
  return (semCache * p.entrada + uso.cache * p.cache + (uso.saida + uso.raciocinio) * p.saida) / 1_000_000
}

export function somarUso(a?: UsoTokens, b?: UsoTokens): UsoTokens | undefined {
  if (!a || !b) return a ?? b
  return { entrada: a.entrada + b.entrada, saida: a.saida + b.saida, raciocinio: a.raciocinio + b.raciocinio, cache: a.cache + b.cache }
}

/** Junta falas seguidas do mesmo lado e garante que a conversa começa pela pessoa. */
export function normalizarMensagens(ms: MensagemIA[]): MensagemIA[] {
  const out: MensagemIA[] = []
  for (const m of ms) {
    const ultimo = out[out.length - 1]
    if (ultimo?.papel === m.papel) ultimo.texto += `\n${m.texto}`
    else out.push({ ...m })
  }
  while (out[0]?.papel === 'life') out.shift()
  return out
}

/** O modo JSON da OpenAI exige a palavra "JSON" no pedido; todos os nossos já têm, isto é só garantia. */
export function sistemaComJson(p: PedidoIA): string | undefined {
  if (!p.json) return p.sistema
  const tudo = `${p.sistema ?? ''}\n${p.mensagens.map((m) => m.texto).join('\n')}`
  return /json/i.test(tudo) ? p.sistema : `${p.sistema ? `${p.sistema}\n\n` : ''}Responda só JSON.`
}

export function provedorDe(modelo: string): Provedor {
  return /^claude/.test(modelo) ? chamarAnthropic : chamarOpenAI
}

/**
 * Principal com ~60% do tempo; falhou (sem ser recusa), a reserva recebe o
 * que sobrou (no mínimo 4 s). `pularPrincipal`: disjuntor aberto, vai direto.
 */
export async function chamarIA(
  p: PedidoIA,
  opc: { timeoutMs?: number; aoEscrever?: (acumulado: string) => void; pularPrincipal?: boolean } = {},
): Promise<ResultadoIA> {
  const timeoutMs = opc.timeoutMs ?? 25_000
  const t0 = Date.now()
  if (!opc.pularPrincipal) {
    const r = await provedorDe(MODELO)(p, MODELO, Math.round(timeoutMs * 0.6), opc.aoEscrever)
    if (r.ok || r.bloqueado) return r
    console.warn('[ia]', MODELO, 'falhou — usando', MODELO_RESERVA)
  }
  const resto = Math.max(timeoutMs - (Date.now() - t0), Math.min(timeoutMs, 4_000))
  return provedorDe(MODELO_RESERVA)(p, MODELO_RESERVA, resto, opc.aoEscrever)
}

// ================================================================
// Disjuntor (02/11, v45). Se o principal falhou e a reserva respondeu, o chat
// pula o principal por PAUSA_MS — em todas as instâncias da função (fica no
// banco, em life_config) — em vez de cada pessoa esperar ele estourar o tempo.
// ================================================================

export const CHAVE_PAUSA = 'modelo_chat_pausado_ate'
export const PAUSA_MS = 10 * 60_000

/** O principal está pausado agora? (valor = instante ISO até quando) */
export function pausado(valor: string | null | undefined, agora = Date.now()): boolean {
  const ate = valor ? Date.parse(valor) : NaN
  return Number.isFinite(ate) && ate > agora
}

export async function principalPausado(sb: SupabaseClient): Promise<boolean> {
  const { data, error } = await sb.from('life_config').select('valor').eq('chave', CHAVE_PAUSA).maybeSingle()
  if (error) return false
  return pausado((data as { valor?: string } | null)?.valor)
}

export async function pausarPrincipal(sb: SupabaseClient, agora = Date.now()): Promise<void> {
  const { error } = await sb.from('life_config')
    .upsert({ chave: CHAVE_PAUSA, valor: new Date(agora + PAUSA_MS).toISOString() }, { onConflict: 'chave' })
  if (error) console.warn('[ia] pausar o principal falhou', error.message)
  else console.warn('[ia]', MODELO, 'pausado por', PAUSA_MS / 60_000, 'min')
}
