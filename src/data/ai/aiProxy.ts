import { supabase } from '@data/supabase/client'
import type { ResultadoVisao } from '@domain/entities/food'

/**
 * Cliente do Edge Function `ai-proxy`.
 *
 * A chave do Gemini NUNCA vem para o cliente — ela vive só no servidor.
 * Aqui a gente só chama o proxy (`supabase/functions/ai-proxy`), que aplica
 * a cota do plano (consumir_cota_ia), audita custo (ai_audit_logs) e fala
 * com o Gemini. Contrato: JSON plano `{ tipo, ...campos }`.
 */

/** Erros que o proxy pode devolver, tipados para a UI tratar sem adivinhar. */
export type AiProxyErro =
  | { tipo: 'not_authenticated' }
  | { tipo: 'limit_reached'; proximoReset: string }
  /** Recurso só do plano pago (scanner, receitas com o Life). */
  | { tipo: 'premium_required' }
  /** Muitas chamadas em menos de 1 minuto. */
  | { tipo: 'rate_limited' }
  /** Teto global de gasto do dia atingido — IA pausada pra todos até amanhã. */
  | { tipo: 'indisponivel' }
  | { tipo: 'image_too_dark' }
  | { tipo: 'image_too_large' }
  | { tipo: 'proxy_error'; detalhe: string }

export class AiProxyError extends Error {
  readonly info: AiProxyErro
  constructor(info: AiProxyErro) {
    super(info.tipo)
    this.name = 'AiProxyError'
    this.info = info
  }
}

interface RespostaVisaoCrua {
  descricao: string
  confianca: number
  observacao: string | null
  itens: Array<{
    nome: string
    quantidade_g: number
    calorias: number
    proteina: number
    carboidrato: number
    gordura: number
  }>
  totais: {
    calorias: number
    proteina: number
    carboidrato: number
    gordura: number
  }
}

export async function chamar<T>(
  tipo: 'vision' | 'chat' | 'recipe',
  payload: Record<string, unknown>,
): Promise<T> {
  const { data: sessao } = await supabase.auth.getSession()
  const token = sessao.session?.access_token
  if (!token) throw new AiProxyError({ tipo: 'not_authenticated' })

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tipo, ...payload }),
  })

  if (res.ok) return res.json() as Promise<T>

  const body = (await res.json().catch(() => ({}))) as { error?: string; next_reset?: string }
  const erro = body.error ?? 'proxy_error'
  if (res.status === 401) throw new AiProxyError({ tipo: 'not_authenticated' })
  if (erro === 'premium_required') throw new AiProxyError({ tipo: 'premium_required' })
  if (erro === 'limit_reached') {
    throw new AiProxyError({ tipo: 'limit_reached', proximoReset: body.next_reset ?? '' })
  }
  if (erro === 'rate_limited') throw new AiProxyError({ tipo: 'rate_limited' })
  if (erro === 'indisponivel') throw new AiProxyError({ tipo: 'indisponivel' })
  if (erro === 'image_too_dark') throw new AiProxyError({ tipo: 'image_too_dark' })
  if (erro === 'image_too_large') throw new AiProxyError({ tipo: 'image_too_large' })
  throw new AiProxyError({ tipo: 'proxy_error', detalhe: erro })
}

/**
 * Envia uma foto (base64, sem prefixo data:) para o Gemini Vision.
 * Devolve os itens já identificados COM macros estimados.
 * Converte snake_case do backend para o domínio na fronteira.
 */
export async function analisarFoto(base64: string, mime = 'image/jpeg'): Promise<ResultadoVisao> {
  const cru = await chamar<RespostaVisaoCrua>('vision', { image: base64, mime_type: mime })
  return {
    descricao: cru.descricao,
    confianca: cru.confianca,
    observacao: cru.observacao,
    totais: cru.totais,
    itens: cru.itens.map((i) => ({
      nome: i.nome,
      quantidadeG: i.quantidade_g,
      calorias: i.calorias,
      proteina: i.proteina,
      carboidrato: i.carboidrato,
      gordura: i.gordura,
    })),
  }
}

export interface MensagemChat {
  autor: 'usuario' | 'life'
  texto: string
}

export interface RespostaChat {
  resposta: string
  /** Mensagens que ainda restam hoje; null quando a resposta não gastou cota. */
  restantes: number | null
}

/**
 * Chat com o Life. Só a mensagem nova vai pro proxy — o histórico mora no
 * servidor (life_chat_mensagens) e é lido de lá, então o cliente não consegue
 * forjar falas do Life. Cota diária por plano (grátis 4, pago 40).
 */
export async function enviarMensagemChat(mensagem: string): Promise<RespostaChat> {
  const cru = await chamar<{ resposta: string; restantes: number | null }>('chat', { mensagem })
  return { resposta: cru.resposta, restantes: cru.restantes }
}

/** Últimas mensagens da conversa (RLS: só as do próprio usuário). */
export async function carregarHistoricoChat(limite = 30): Promise<MensagemChat[]> {
  const { data: sessao } = await supabase.auth.getSession()
  const userId = sessao.session?.user.id
  if (!userId) return []
  const { data, error } = await supabase
    .from('life_chat_mensagens')
    .select('autor, texto')
    .eq('user_id', userId)
    .order('criado_em', { ascending: false })
    .limit(limite)
    .returns<MensagemChat[]>()
  if (error) throw error
  return (data ?? []).reverse()
}

/** Quanto do chat ainda dá pra usar hoje, pra mostrar antes de enviar. */
export async function cotaChatHoje(): Promise<{ usados: number; limite: number } | null> {
  return cotaIaHoje('chat')
}

/** Uso de hoje de um recurso de IA (chat, vision = scanner). */
export async function cotaIaHoje(tipo: 'chat' | 'vision'): Promise<{ usados: number; limite: number } | null> {
  const { data, error } = await supabase.rpc('cota_ia_status', { p_tipo: tipo })
  const linha = (data as { usados_hoje: number; limite_hoje: number }[] | null)?.[0]
  if (error || !linha) return null
  return { usados: linha.usados_hoje, limite: linha.limite_hoje }
}

/**
 * Código de barras — NÃO IMPLEMENTADO na v1.
 *
 * Falta o que não existe no app hoje:
 *  1) leitura do código pela câmera (biblioteca nativa — ex.: ML Kit),
 *     que transforma a imagem no número do código;
 *  2) uma base de produtos por trás (o campo `fonte`, ex.: OpenFoodFacts).
 *
 * Mantido como contrato para não travar a arquitetura, mas a UI não deve
 * oferecer isso como recurso enquanto (1) e (2) não existirem.
 */
export async function consultarCodigoBarras(_code: string): Promise<never> {
  throw new AiProxyError({
    tipo: 'proxy_error',
    detalhe: 'barcode_nao_implementado_v1',
  })
}
