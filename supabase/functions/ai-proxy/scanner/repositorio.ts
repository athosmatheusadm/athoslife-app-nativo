// ATHOSlife — scanner: acesso ao banco (service role). A orquestração
// (analisar.ts) só conhece a interface `RepoScan`, pra testar com um repo
// em memória.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { montarCatalogo, type Catalogo } from './resolver.ts'
import type { AlimentoCatalogo, ResultadoScan } from './tipos.ts'

export type StatusJob = 'processing' | 'ready' | 'needs_review' | 'failed' | 'committed'

export interface Job {
  id: string
  requestId: string
  payloadHash: string
  status: StatusJob
  revisao: number
  tentativa: number
  leaseAte: number | null
  resultado: ResultadoScan | null
  erro: string | null
}

export interface Publicacao {
  status: 'ready' | 'needs_review'
  resultado: ResultadoScan
  modelo: string
  promptVersao: string
  schemaVersao: string
  tempos: Record<string, number>
  tokens: number
  custo: number
}

export interface ArgsConfirmar {
  scanId: string
  revisao: number
  commitKey: string
  data: string
  tipo: string
  extraId: string | null
  itens: { nome: string; quantidade_texto: string; calorias: number; proteina: number; carboidrato: number; gordura: number }[]
  correcoes: { item_id: string; campo: string; antes: unknown; depois: unknown }[]
  naoResolvidos: { nome_visto: string; canonical_hint: string | null; candidatos: string[]; escolha_final: string | null; idioma: string }[]
  descricao: string
  confianca: number
  resultadoFinal: unknown
}

export interface RepoScan {
  buscar(requestId: string): Promise<Job | null>
  porId(scanId: string): Promise<Job | null>
  /** null = já existe (corrida de dois toques): releia com buscar(). */
  criar(requestId: string, hash: string, leaseAte: number): Promise<Job | null>
  /** Assume uma análise com lease vencido. false = outro já assumiu. */
  assumir(job: Job, leaseAte: number): Promise<boolean>
  /** Só o dono do lease atual publica. false = tentativa velha, descartada. */
  publicar(scanId: string, tentativa: number, p: Publicacao): Promise<boolean>
  /** true só na 1ª vez que marca falha + devolução da cota (devolve uma vez). */
  falhar(scanId: string, tentativa: number, erro: string): Promise<boolean>
  confirmar(a: ArgsConfirmar): Promise<{ status: string; itens: string[] | null }>
  catalogo(): Promise<Catalogo>
}

// ---------------------------------------------------------------- Supabase

type Sb = SupabaseClient

interface JobRow {
  id: string
  request_id: string
  payload_hash: string
  status: StatusJob
  revisao: number
  tentativa: number
  lease_ate: string | null
  resultado: ResultadoScan | null
  erro: string | null
}

const COLUNAS_JOB = 'id, request_id, payload_hash, status, revisao, tentativa, lease_ate, resultado, erro'

const paraJob = (r: JobRow): Job => ({
  id: r.id,
  requestId: r.request_id,
  payloadHash: r.payload_hash,
  status: r.status,
  revisao: r.revisao,
  tentativa: r.tentativa,
  leaseAte: r.lease_ate ? Date.parse(r.lease_ate) : null,
  resultado: r.resultado,
  erro: r.erro,
})

// Catálogo muda pouco: cache por instância da função (10 min).
let cache: { em: number; cat: Catalogo } | null = null
const CACHE_MS = 10 * 60_000

const numOuNull = (v: unknown): number | null => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v))

async function carregarCatalogo(sb: Sb): Promise<Catalogo> {
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.cat
  const linhas: Record<string, unknown>[] = []
  // PostgREST corta em 1000 linhas por resposta: pagina.
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from('alimentos')
      .select('id, nome, nome_en, nome_es, nome_fr, nome_hi, categoria, porcao_g, calorias, proteina, carboidrato, gordura, preparo, aliases, porcao_tipica_g, representacao, gordura_preparo_pct, densidade_g_ml, taco_id, scanner')
      .order('id').range(de, de + 999)
    if (error) throw new Error(`catalogo: ${error.message}`)
    linhas.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const { data: medidas, error: e2 } = await sb.from('alimentos_medidas').select('alimento_id, medida, gramas, fonte')
  if (e2) throw new Error(`medidas: ${e2.message}`)
  const porAlimento = new Map<string, AlimentoCatalogo['medidas']>()
  for (const m of medidas ?? []) {
    const l = porAlimento.get(m.alimento_id) ?? []
    l.push({ medida: m.medida, gramas: Number(m.gramas), confiavel: m.fonte === 'tbca' || m.fonte === 'pesagem' })
    porAlimento.set(m.alimento_id, l)
  }
  const cat = montarCatalogo(linhas.map((r) => ({
    id: String(r.id),
    nome: String(r.nome),
    nomeEn: (r.nome_en as string | null) ?? null,
    nomeEs: (r.nome_es as string | null) ?? null,
    nomeFr: (r.nome_fr as string | null) ?? null,
    nomeHi: (r.nome_hi as string | null) ?? null,
    categoria: (r.categoria as string | null) ?? null,
    porcaoG: Number(r.porcao_g) || 100,
    kcal: numOuNull(r.calorias),
    proteina: numOuNull(r.proteina),
    carboidrato: numOuNull(r.carboidrato),
    gordura: numOuNull(r.gordura),
    preparo: (r.preparo as AlimentoCatalogo['preparo']) ?? null,
    aliases: Array.isArray(r.aliases) ? r.aliases as string[] : [],
    porcaoTipicaG: numOuNull(r.porcao_tipica_g),
    representacao: (r.representacao as AlimentoCatalogo['representacao']) ?? null,
    gorduraPreparoPct: numOuNull(r.gordura_preparo_pct),
    densidadeGMl: numOuNull(r.densidade_g_ml),
    tacoId: numOuNull(r.taco_id),
    scanner: r.scanner !== false,
    medidas: porAlimento.get(String(r.id)) ?? [],
  })))
  cache = { em: Date.now(), cat }
  return cat
}

export function repoSupabase(sb: Sb, userId: string): RepoScan {
  const iso = (ms: number) => new Date(ms).toISOString()
  return {
    async buscar(requestId) {
      const { data } = await sb.from('scan_jobs').select(COLUNAS_JOB)
        .eq('user_id', userId).eq('request_id', requestId).maybeSingle<JobRow>()
      return data ? paraJob(data) : null
    },
    async porId(scanId) {
      const { data } = await sb.from('scan_jobs').select(COLUNAS_JOB)
        .eq('user_id', userId).eq('id', scanId).maybeSingle<JobRow>()
      return data ? paraJob(data) : null
    },
    async criar(requestId, hash, leaseAte) {
      const { data, error } = await sb.from('scan_jobs')
        .insert({ user_id: userId, request_id: requestId, payload_hash: hash, status: 'processing', lease_ate: iso(leaseAte) })
        .select(COLUNAS_JOB).single<JobRow>()
      if (error) {
        if (error.code === '23505') return null
        throw new Error(`scan_jobs: ${error.message}`)
      }
      return paraJob(data)
    },
    async assumir(job, leaseAte) {
      const { data } = await sb.from('scan_jobs')
        .update({ tentativa: job.tentativa + 1, lease_ate: iso(leaseAte), updated_at: iso(Date.now()) })
        .eq('id', job.id).eq('status', 'processing').eq('tentativa', job.tentativa).select('id')
      return Boolean(data?.length)
    },
    async publicar(scanId, tentativa, p) {
      const { data } = await sb.from('scan_jobs').update({
        status: p.status, resultado: p.resultado, modelo: p.modelo, prompt_versao: p.promptVersao,
        schema_versao: p.schemaVersao, tempos: p.tempos, tokens: p.tokens, custo: p.custo,
        lease_ate: null, updated_at: iso(Date.now()),
      }).eq('id', scanId).eq('status', 'processing').eq('tentativa', tentativa).select('id')
      return Boolean(data?.length)
    },
    async falhar(scanId, tentativa, erro) {
      const { data } = await sb.from('scan_jobs')
        .update({ status: 'failed', erro, cota_devolvida: true, lease_ate: null, updated_at: iso(Date.now()) })
        .eq('id', scanId).eq('status', 'processing').eq('tentativa', tentativa).eq('cota_devolvida', false).select('id')
      return Boolean(data?.length)
    },
    async confirmar(a) {
      const { data, error } = await sb.rpc('scanner_confirmar', {
        p_user_id: userId, p_scan_id: a.scanId, p_revisao: a.revisao, p_commit_key: a.commitKey,
        p_data: a.data, p_tipo: a.tipo, p_extra_id: a.extraId, p_itens: a.itens, p_correcoes: a.correcoes,
        p_nao_resolvidos: a.naoResolvidos, p_descricao: a.descricao, p_confianca: a.confianca,
        p_resultado_final: a.resultadoFinal,
      })
      if (error) throw new Error(`scanner_confirmar: ${error.message}`)
      const row = (Array.isArray(data) ? data[0] : data) as { status: string; itens: string[] | null } | undefined
      return row ?? { status: 'erro', itens: null }
    },
    catalogo: () => carregarCatalogo(sb),
  }
}
