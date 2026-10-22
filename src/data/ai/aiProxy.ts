import { diaLeveHoje } from '@data/diaLeve'
import { supabase } from '@data/supabase/client'
import type { BaseScan, ResultadoVisao, VarianteOleo } from '@domain/entities/food'

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
  tipo: 'vision' | 'scan' | 'chat' | 'recipe' | 'acao' | 'estimar' | 'checkin' | 'abertura',
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

// ---------------------------------------------------------------- scanner v1.1

/** Item como a ai-proxy devolve (`tipo: 'scan'`). Nutrientes já arredondados. */
export interface ItemScanCru {
  itemId: string
  nomeVisto: string
  resolucao: 'matched' | 'needs_choice' | 'unresolved'
  base: BaseScan | null
  candidatos: BaseScan[]
  gramas: number | null
  faixa: { min: number; max: number } | null
  variante: VarianteOleo | null
  varianteOrigem: 'padrao' | 'visual' | null
  nutrientes: { kcal: number | null; proteina: number | null; carboidrato: number | null; gordura: number | null } | null
  motivos: string[]
  incluir: boolean
}

export interface RespostaScan {
  scan_id: string
  revisao: number
  status: 'ready' | 'needs_review' | 'committed' | 'processing'
  titulo?: string
  parcial?: boolean
  itens?: ItemScanCru[]
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Foto -> resultado editável. O mesmo `requestId` com a mesma foto devolve
 * o resultado já pronto sem gastar outro scan — então dá pra repetir com
 * segurança se a internet cair no meio. Se ainda estiver processando,
 * consulta o status por até ~25 s.
 */
export async function analisarScan(base64: string, mime: string, requestId: string): Promise<RespostaScan> {
  const enviar = () => chamar<RespostaScan>('scan', { op: 'analisar', request_id: requestId, image: base64, mime_type: mime })
  let r: RespostaScan
  try {
    r = await enviar()
  } catch (e) {
    if (e instanceof AiProxyError) throw e
    await espera(1500) // queda de rede: tenta uma vez com o mesmo pedido
    r = await enviar()
  }
  for (let i = 0; r.status === 'processing' && i < 10; i++) {
    await espera(2500)
    r = await chamar<RespostaScan>('scan', { op: 'status', scan_id: r.scan_id })
  }
  if (r.status === 'processing') throw new AiProxyError({ tipo: 'proxy_error', detalhe: 'analysis_timeout' })
  return r
}

export async function confirmarScan(params: {
  scanId: string
  revisao: number
  commitKey: string
  data: string
  alvo: { tipo: string; extraId?: string }
  itens: { itemId: string; alimentoId: string | null; gramas: number; variante: VarianteOleo | null; incluir: boolean }[]
}): Promise<number> {
  const r = await chamar<{ ok: boolean; itens: number }>('scan', {
    op: 'confirmar',
    scan_id: params.scanId,
    revisao: params.revisao,
    commit_key: params.commitKey,
    data: params.data,
    alvo: { tipo: params.alvo.tipo, extra_id: params.alvo.extraId },
    itens: params.itens.map((i) => ({ item_id: i.itemId, alimento_id: i.alimentoId, gramas: i.gramas, variante: i.variante, incluir: i.incluir })),
  })
  return r.itens
}

/** Alimento estimado pelo Life (fora da base). Macros POR PORÇÃO. */
export interface AlimentoEstimado {
  nome: string
  porcaoG: number
  calorias: number
  proteina: number
  carboidrato: number
  gordura: number
  confianca: number
}

/**
 * Life estima um alimento/produto que não está na base (busca da Dieta ou
 * código de barras desconhecido). Gasta 1 mensagem da cota do chat.
 * `null` = não reconheceu como comida (e não gastou cota).
 */
export async function estimarAlimento(nome: string): Promise<AlimentoEstimado | null> {
  const cru = await chamar<{
    reconhecido: boolean
    nome?: string
    porcao_g?: number
    calorias?: number
    proteina?: number
    carboidrato?: number
    gordura?: number
    confianca?: number
  }>('estimar', { nome })
  if (!cru.reconhecido) return null
  return {
    nome: cru.nome ?? nome,
    porcaoG: cru.porcao_g ?? 100,
    calorias: cru.calorias ?? 0,
    proteina: cru.proteina ?? 0,
    carboidrato: cru.carboidrato ?? 0,
    gordura: cru.gordura ?? 0,
    confianca: cru.confianca ?? 0,
  }
}

export interface MensagemChat {
  autor: 'usuario' | 'life'
  texto: string
}

/**
 * Cards no fim da fala do Life (ai-proxy v3.10): `[[receita:<uuid>]]` é uma
 * receita da Cozinha que serve pra pessoa; `[[chef]]` é o botão do "Monte
 * sua receita com o Life". Ficam salvos no texto, então voltam no histórico.
 */
const MARCA_CARTAO = /\[\[(receita:[0-9a-f-]{36}|chef)\]\]/g

export function separarCartoes(texto: string): { texto: string; receitas: string[]; chef: boolean } {
  const receitas: string[] = []
  let chef = false
  const limpo = texto.replace(MARCA_CARTAO, (_, m: string) => {
    if (m === 'chef') chef = true
    else receitas.push(m.slice('receita:'.length))
    return ''
  })
  return { texto: limpo.trim(), receitas, chef }
}

export type EscolhaAcao = 'adicionar' | 'substituir' | 'forcar' | 'salvar' | 'cancelar'

/**
 * O que o Life FEZ no app (Life MVP 08/10) — só vem depois que o servidor
 * gravou. `escolha`: precisa da pessoa (ex.: "adicionar ou substituir?").
 */
export type AcaoLife =
  | { tipo: 'refeicao_atualizada'; data: string }
  | { tipo: 'pausa'; dia: string }
  | { tipo: 'escolha'; id: string; opcoes: { valor: EscolhaAcao; rotulo: string }[] }
  /** Pesagem ou meta gravada pelo chat (sem IA, sem cota) — recarrega o card "Meu peso". */
  | { tipo: 'peso_atualizado' }

export interface RespostaChat {
  resposta: string
  /** Mensagens que ainda restam hoje; null quando a resposta não gastou cota. */
  restantes: number | null
  acao: AcaoLife | null
  /** A pessoa contou algo que valia lembrar e ainda não decidiu sobre a memória (v4.0). */
  sugerirMemoria: boolean
}

/**
 * Chat com o Life. Só a mensagem nova vai pro proxy — o histórico mora no
 * servidor (life_chat_mensagens) e é lido de lá, então o cliente não consegue
 * forjar falas do Life. Cota diária por plano (grátis 4, pago 40).
 */
/** De qual tela o chat foi aberto — cada Life puxa pro assunto da sua tela. */
export type FocoLife = 'home' | 'dieta' | 'treino' | 'habitos'

/**
 * `idEnvio`: um por mensagem. Reenviar a MESMA mensagem (depois de erro de
 * rede) com o mesmo id faz o servidor devolver a ação que já aconteceu em
 * vez de repetir a refeição de novo.
 */
export async function enviarMensagemChat(
  mensagem: string,
  foco: FocoLife = 'home',
  idEnvio: string = crypto.randomUUID(),
): Promise<RespostaChat> {
  const diaLeve = await diaLeveHoje()
  const cru = await chamar<{ resposta: string; restantes: number | null; acao?: AcaoLife; sugerir_memoria?: boolean }>('chat', {
    mensagem,
    foco,
    id_envio: idEnvio,
    ...(diaLeve ? { dia_leve: diaLeve } : {}),
  })
  return { resposta: cru.resposta, restantes: cru.restantes, acao: cru.acao ?? null, sugerirMemoria: cru.sugerir_memoria === true }
}

/** Check-in v3 (ai-proxy v4.0): o servidor grava e o Life responde numa frase. Sem cota do chat. */
export async function enviarCheckin(c: {
  palavra: string
  etiquetas: readonly string[]
  nota: string | null
  momento: 'manha' | 'tarde' | 'noite'
}): Promise<{ resposta: string; conviteConversa: boolean }> {
  const cru = await chamar<{ resposta: string; convite_conversa: boolean }>('checkin', {
    palavra: c.palavra,
    etiquetas: c.etiquetas,
    nota: c.nota ?? undefined,
    momento: c.momento,
  })
  return { resposta: cru.resposta, conviteConversa: cru.convite_conversa }
}

/**
 * O Life puxa assunto (máx. 1 por dia, regras fixas, sem IA). O servidor
 * entrega a mensagem uma vez só e ela já fica no histórico do chat.
 */
export async function buscarAberturaLife(): Promise<string | null> {
  const cru = await chamar<{ mensagem: string | null }>('abertura', {})
  return cru.mensagem ?? null
}

/** Resposta a um botão de escolha do Life. Não usa IA nem gasta mensagem. */
export async function responderAcaoLife(id: string, escolha: EscolhaAcao): Promise<{ resposta: string; acao: AcaoLife | null }> {
  const cru = await chamar<{ resposta: string; acao?: AcaoLife | null }>('acao', { id, escolha })
  return { resposta: cru.resposta, acao: cru.acao ?? null }
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
