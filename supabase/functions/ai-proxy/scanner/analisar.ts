// ATHOSlife — scanner v1.1: orquestração (seções 4, 9 e 9.1).
//
//   { tipo:'scan', op:'analisar', request_id, image, mime_type? }
//   { tipo:'scan', op:'status', scan_id }
//   { tipo:'scan', op:'confirmar', scan_id, revisao, commit_key, data, alvo:{tipo, extra_id?},
//     itens:[{item_id, alimento_id, gramas, variante, incluir}] }
//
// Caminho normal: 1 chamada ao Gemini. No máximo 2 (só se o JSON vier
// quebrado e ainda houver tempo). Mesmo request_id + mesma foto devolve o
// resultado guardado, sem gastar cota de novo. Falha devolve a cota uma vez.

import { arredondar, nutrientesDaPorcao, somarTotais } from './nutricao.ts'
import { PROMPT_RECUPERACAO, promptVisual } from './prompt.ts'
import { paraBase, vocabularioCanonico } from './resolver.ts'
import { montarResultado } from './revisao.ts'
import type { Job, RepoScan } from './repositorio.ts'
import { PROMPT_VERSAO, SCHEMA_VERSAO } from './tipos.ts'
import type { ItemScan, ResultadoScan, Variante } from './tipos.ts'
import { validarVisao } from './validar.ts'

export interface RespostaGemini {
  ok: boolean
  texto: string
  tokens: number
  custo: number
}

export interface DepsScan {
  repo: RepoScan
  idioma: string
  pais: string | null
  modelo: string
  /** Quantos nomes do catálogo vão no prompt (SCANNER_VOCAB_MAX). */
  vocabularioMax: number
  /** Uma chamada de visão (foto + prompt). */
  gemini(imagem: string, mime: string, prompt: string, timeoutMs: number): Promise<RespostaGemini>
  extrairJSON(txt: string): unknown
  consumirCota(): Promise<{ ok: true } | { ok: false; resposta: Response }>
  devolverCota(): Promise<void>
  auditar(status: string, g?: RespostaGemini): Promise<void>
  json(data: unknown, status?: number): Response
  agora(): number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const LEASE_MS = 40_000
const TIMEOUT_PRINCIPAL = 15_000
const TIMEOUT_RECUPERACAO = 8_000
const ORCAMENTO_MS = 22_000
const VARIANTES: readonly Variante[] = ['sem_oleo', 'caseiro', 'bastante_oleo']

async function hashDe(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** O que o app recebe: nutrientes arredondados (apresentação), nada interno. */
export function publico(job: Job) {
  const r = job.resultado
  if (!r || (job.status !== 'ready' && job.status !== 'needs_review' && job.status !== 'committed')) {
    return { scan_id: job.id, status: job.status }
  }
  const redondo = (n: ItemScan['nutrientes']) => (n ? arredondar(n) : null)
  return {
    scan_id: job.id,
    revisao: job.revisao,
    status: job.status,
    titulo: r.titulo,
    parcial: r.parcial,
    ancoras: r.ancoras,
    avisos_imagem: r.avisosImagem,
    totais: arredondar(r.totais),
    itens: r.itens.map((i) => ({ ...i, nutrientes: redondo(i.nutrientes) })),
  }
}

export async function handleScan(d: DepsScan, corpo: Record<string, unknown>): Promise<Response> {
  switch (corpo.op) {
    case 'analisar':
      return await analisar(d, corpo)
    case 'status': {
      const id = String(corpo.scan_id ?? '')
      if (!UUID.test(id)) return d.json({ error: 'invalid_scan' }, 400)
      const job = await d.repo.porId(id)
      return job ? d.json(publico(job)) : d.json({ error: 'not_found' }, 404)
    }
    case 'confirmar':
      return await confirmar(d, corpo)
    default:
      return d.json({ error: 'invalid_op' }, 400)
  }
}

async function analisar(d: DepsScan, corpo: Record<string, unknown>): Promise<Response> {
  const requestId = String(corpo.request_id ?? '')
  if (!UUID.test(requestId)) return d.json({ error: 'request_id_required' }, 400)
  let imagem = typeof corpo.image === 'string' ? corpo.image : ''
  const idx = imagem.indexOf('base64,')
  if (idx !== -1) imagem = imagem.slice(idx + 7)
  if (imagem.length < 100 || !/^[A-Za-z0-9+/=\s]+$/.test(imagem.slice(0, 2000))) return d.json({ error: 'image_required' }, 400)
  if (imagem.length > 4_000_000) return d.json({ error: 'image_too_large' }, 413)
  const mime = MIMES.has(String(corpo.mime_type)) ? String(corpo.mime_type) : 'image/jpeg'
  const hash = await hashDe(imagem)

  let job = await d.repo.buscar(requestId)
  let tentativa: number
  if (job) {
    if (job.payloadHash !== hash) return d.json({ error: 'request_conflict' }, 409)
    if (job.status !== 'processing') {
      return job.status === 'failed' ? d.json({ error: 'request_failed', motivo: job.erro }, 409) : d.json(publico(job))
    }
    if (job.leaseAte !== null && job.leaseAte > d.agora()) return d.json({ scan_id: job.id, status: 'processing' }, 202)
    // Lease vencido (processo caiu no meio): assume sem cobrar de novo.
    tentativa = job.tentativa + 1
    if (!await d.repo.assumir(job, d.agora() + LEASE_MS)) return d.json({ scan_id: job.id, status: 'processing' }, 202)
  } else {
    const cota = await d.consumirCota()
    if (!cota.ok) return cota.resposta
    job = await d.repo.criar(requestId, hash, d.agora() + LEASE_MS)
    if (!job) {
      // Dois toques ao mesmo tempo: o outro pedido é quem analisa.
      await d.devolverCota()
      const outro = await d.repo.buscar(requestId)
      return outro ? d.json(publico(outro), outro.status === 'processing' ? 202 : 200) : d.json({ error: 'proxy_error' }, 500)
    }
    tentativa = job.tentativa
  }
  return await processar(d, job, tentativa, imagem, mime)
}

async function processar(d: DepsScan, job: Job, tentativa: number, imagem: string, mime: string): Promise<Response> {
  const t0 = d.agora()
  const falhar = async (erro: string, resposta: Response, g?: RespostaGemini) => {
    if (await d.repo.falhar(job.id, tentativa, erro)) await d.devolverCota()
    await d.auditar(erro, g)
    return resposta
  }

  let cat
  try {
    cat = await d.repo.catalogo()
  } catch (e) {
    console.error('[scan] catalogo', String(e))
    return falhar('CATALOG_UNAVAILABLE', d.json({ error: 'ia_falhou' }, 502))
  }
  const prompt = promptVisual({ idioma: d.idioma, pais: d.pais, vocabulario: vocabularioCanonico(cat, d.vocabularioMax) })
  const tCat = d.agora()

  let g = await d.gemini(imagem, mime, prompt, TIMEOUT_PRINCIPAL)
  let visao = g.ok ? validarVisao(d.extrairJSON(g.texto)) : 'INVALID_MODEL_OUTPUT' as const
  let chamadas = 1
  if (g.ok && visao === 'INVALID_MODEL_OUTPUT' && d.agora() - t0 + TIMEOUT_RECUPERACAO < ORCAMENTO_MS) {
    const g2 = await d.gemini(imagem, mime, `${prompt}\n\n${PROMPT_RECUPERACAO}`, TIMEOUT_RECUPERACAO)
    chamadas = 2
    g = { ...g2, tokens: g.tokens + g2.tokens, custo: g.custo + g2.custo }
    visao = g2.ok ? validarVisao(d.extrairJSON(g2.texto)) : 'INVALID_MODEL_OUTPUT'
  }
  const tVisao = d.agora()
  if (!g.ok) return falhar('PROVIDER_UNAVAILABLE', d.json({ error: 'ia_falhou' }, 502), g)
  if (visao === 'INVALID_MODEL_OUTPUT') return falhar('INVALID_MODEL_OUTPUT', d.json({ error: 'ia_falhou' }, 502), g)
  if (visao.status !== 'ok') {
    const erro = visao.status === 'no_food' ? 'no_food' : 'recapture'
    return falhar(erro.toUpperCase(), d.json({ error: erro }, 422), g)
  }

  const resultado = montarResultado(visao, cat, d.idioma)
  const tFim = d.agora()
  const publicou = await d.repo.publicar(job.id, tentativa, {
    status: resultado.status,
    resultado,
    modelo: d.modelo,
    promptVersao: PROMPT_VERSAO,
    schemaVersao: SCHEMA_VERSAO,
    tempos: { catalogo_ms: tCat - t0, vision_ms: tVisao - tCat, resolve_ms: tFim - tVisao, total_ms: tFim - t0, chamadas },
    tokens: g.tokens,
    custo: g.custo,
  })
  await d.auditar('ok', g)
  if (!publicou) {
    // Outra tentativa assumiu no meio: vale o que ela publicou.
    const atual = await d.repo.porId(job.id)
    return atual ? d.json(publico(atual), atual.status === 'processing' ? 202 : 200) : d.json({ error: 'proxy_error' }, 500)
  }
  return d.json(publico({ ...job, status: resultado.status, resultado }))
}

// ---------------------------------------------------------------- confirmar

interface ItemFinal {
  itemId: string
  alimentoId: string | null
  gramas: number
  variante: Variante | null
  incluir: boolean
}

function lerItens(v: unknown): ItemFinal[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > 20) return null
  const out: ItemFinal[] = []
  for (const x of v) {
    const o = (x ?? {}) as Record<string, unknown>
    const gramas = Number(o.gramas)
    const alimentoId = o.alimento_id == null ? null : String(o.alimento_id)
    if (typeof o.item_id !== 'string' || (alimentoId !== null && !UUID.test(alimentoId))) return null
    out.push({
      itemId: o.item_id,
      alimentoId,
      gramas: Number.isFinite(gramas) ? Math.round(gramas) : 0,
      variante: VARIANTES.includes(o.variante as Variante) ? o.variante as Variante : null,
      incluir: o.incluir !== false,
    })
  }
  return out
}

async function confirmar(d: DepsScan, corpo: Record<string, unknown>): Promise<Response> {
  const scanId = String(corpo.scan_id ?? '')
  const commitKey = String(corpo.commit_key ?? '')
  const data = String(corpo.data ?? '')
  const alvo = (corpo.alvo ?? {}) as Record<string, unknown>
  const itensApp = lerItens(corpo.itens)
  if (!UUID.test(scanId) || !UUID.test(commitKey) || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !itensApp) {
    return d.json({ error: 'invalid_request' }, 400)
  }
  const tipo = String(alvo.tipo ?? '')
  const extraId = tipo === 'extra' && UUID.test(String(alvo.extra_id ?? '')) ? String(alvo.extra_id) : null

  const job = await d.repo.porId(scanId)
  if (!job?.resultado) return d.json({ error: 'not_found' }, 404)
  const proposta = new Map(job.resultado.itens.map((i) => [i.itemId, i]))
  const cat = await d.repo.catalogo()

  const itens: { nome: string; quantidade_texto: string; calorias: number; proteina: number; carboidrato: number; gordura: number }[] = []
  const finais: ItemScan[] = []
  const correcoes: { item_id: string; campo: string; antes: unknown; depois: unknown }[] = []
  for (const f of itensApp) {
    const p = proposta.get(f.itemId)
    if (!p) return d.json({ error: 'item_desconhecido' }, 400)
    if (p.incluir && !f.incluir) correcoes.push({ item_id: f.itemId, campo: 'removido', antes: true, depois: false })
    if (!f.incluir) continue
    // Nutriente SEMPRE calculado aqui, a partir do catálogo.
    const a = f.alimentoId ? cat.porId.get(f.alimentoId) : null
    if (!a) return d.json({ error: 'item_sem_alimento', item_id: f.itemId }, 422)
    if (f.gramas < 1 || f.gramas > 3000) return d.json({ error: 'quantidade_invalida', item_id: f.itemId }, 422)
    const base = paraBase(a, d.idioma)
    const variante = a.gorduraPreparoPct === null ? null : f.variante ?? 'caseiro'
    const n = nutrientesDaPorcao(base, f.gramas, variante)
    if (!n || n.kcal === null || n.proteina === null || n.carboidrato === null || n.gordura === null) {
      return d.json({ error: 'nutriente_ausente', item_id: f.itemId }, 422)
    }
    const r = arredondar(n)
    itens.push({ nome: base.nome, quantidade_texto: `${f.gramas} g`, calorias: r.kcal!, proteina: r.proteina!, carboidrato: r.carboidrato!, gordura: r.gordura! })
    finais.push({ ...p, base, gramas: f.gramas, variante, nutrientes: r, incluir: true })
    if (p.base?.alimentoId !== a.id) correcoes.push({ item_id: f.itemId, campo: 'alimento', antes: p.base?.alimentoId ?? null, depois: a.id })
    if (p.gramas !== f.gramas) correcoes.push({ item_id: f.itemId, campo: 'gramas', antes: p.gramas, depois: f.gramas })
    if (p.variante !== variante) correcoes.push({ item_id: f.itemId, campo: 'variante', antes: p.variante, depois: variante })
  }
  if (!itens.length) return d.json({ error: 'nenhum_item' }, 422)

  const escolhas = new Map(itensApp.map((f) => [f.itemId, f.incluir ? f.alimentoId : null]))
  const naoResolvidos = job.resultado.itens.filter((i) => i.resolucao !== 'matched').map((i) => ({
    nome_visto: i.nomeVisto,
    canonical_hint: i.canonicalHint,
    candidatos: i.candidatos.map((c) => c.alimentoId),
    escolha_final: escolhas.get(i.itemId) ?? null,
    idioma: d.idioma,
  }))
  const { totais } = somarTotais(finais)
  const resultadoFinal: ResultadoScan & { versao: string } = { ...job.resultado, itens: finais, totais: arredondar(totais), parcial: false, versao: SCHEMA_VERSAO }

  const r = await d.repo.confirmar({
    scanId, revisao: Number(corpo.revisao) || 0, commitKey, data, tipo, extraId,
    itens, correcoes, naoResolvidos,
    // "Confiança" do histórico = % de itens que casaram sozinhos com o catálogo
    // (taxa de resolução, seção 7.3) — não é probabilidade do modelo.
    descricao: job.resultado.titulo,
    confianca: Math.round(100 * job.resultado.itens.filter((i) => i.resolucao === 'matched').length / Math.max(job.resultado.itens.length, 1)),
    resultadoFinal,
  })
  switch (r.status) {
    case 'ok':
    case 'ja_confirmado':
      return d.json({ ok: true, itens: r.itens?.length ?? itens.length, totais: arredondar(totais) })
    case 'conflito_revisao':
      return d.json({ error: 'revision_conflict' }, 409)
    case 'ja_confirmado_outro':
      return d.json({ error: 'already_committed' }, 409)
    case 'tipo_invalido':
      return d.json({ error: 'invalid_meal' }, 400)
    case 'nao_encontrado':
      return d.json({ error: 'not_found' }, 404)
    default:
      return d.json({ error: 'invalid_state' }, 409)
  }
}
