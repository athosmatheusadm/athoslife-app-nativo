import { supabase } from '@data/supabase/client'
import type { ResultadoVisao } from '@domain/entities/food'

/**
 * Cliente do Edge Function `ai-proxy`.
 *
 * A chave do Gemini NUNCA vem para o cliente — ela vive só no servidor.
 * Aqui a gente só chama o proxy, que aplica cota (foto_scans_hoje),
 * audita custo (ai_audit_logs) e fala com o Gemini.
 */

/** Erros que o proxy pode devolver, tipados para a UI tratar sem adivinhar. */
export type AiProxyErro =
  | { tipo: 'not_authenticated' }
  | { tipo: 'limit_reached'; proximoReset: string }
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

async function chamar<T>(
  tipo: 'vision' | 'chat' | 'barcode',
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

  if (res.status === 401) throw new AiProxyError({ tipo: 'not_authenticated' })
  if (res.status === 403) {
    const body = (await res.json().catch(() => ({}))) as { next_reset?: string }
    throw new AiProxyError({
      tipo: 'limit_reached',
      proximoReset: body.next_reset ?? '',
    })
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    const detalhe = body.error ?? 'proxy_error'
    if (detalhe === 'image_too_dark') throw new AiProxyError({ tipo: 'image_too_dark' })
    if (detalhe === 'image_too_large') throw new AiProxyError({ tipo: 'image_too_large' })
    throw new AiProxyError({ tipo: 'proxy_error', detalhe })
  }

  return res.json() as Promise<T>
}

/**
 * Envia uma foto (base64, sem prefixo data:) para o Gemini Vision.
 * Devolve os itens já identificados COM macros estimados.
 * Converte snake_case do backend para o domínio na fronteira.
 */
export async function analisarFoto(base64: string): Promise<ResultadoVisao> {
  const cru = await chamar<RespostaVisaoCrua>('vision', { image: base64 })
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
