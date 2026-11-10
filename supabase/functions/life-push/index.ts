// ================================================================
// ATHOSlife — life-push (v1, 2026-11-09). O relógio (pg_cron, a cada
// 15 min) chama esta função; ela olha quem deixou o Life chamar e tem
// aparelho registrado, decide se há motivo (regras.ts), escreve a frase
// (pago: IA personalizada; grátis: frase pronta — textos.ts) e envia pelo
// Firebase (fcm.ts). A frase também entra no chat do Life, como iniciativa.
//
// Publicar com --no-verify-jwt: quem chama é o pg_cron, conferido pela
// senha do Vault (header x-relogio). Teste manual: body {"user_id": "...",
// "simular": true} decide e escreve sem enviar nem gravar.
// ================================================================
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { dadosAbertura, memoriasParaContexto, type Idioma } from '../ai-proxy/life.ts'
import { chamarIA } from '../ai-proxy/ia.ts'
import { decidirPush, minutosDe, type DadosPush, type Decisao, type Momento } from './regras.ts'
import { fraseValida, lerJsonTexto, pedidoIA, textoFixo, TITULO } from './textos.ts'
import { enviarPush, lerConta } from './fcm.ts'

type Sb = SupabaseClient
const env = (k: string) => Deno.env.get(k) ?? ''
const FUSO_PADRAO = 'America/Sao_Paulo'
/** Quantas pessoas por volta do relógio (as que esperam ficam pra próxima). */
const LOTE = 300
const PARALELO = 6

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

function fusoValido(f: unknown): string {
  if (typeof f !== 'string' || !f) return FUSO_PADRAO
  try {
    new Intl.DateTimeFormat('en', { timeZone: f })
    return f
  } catch {
    return FUSO_PADRAO
  }
}

function relogioLocal(fuso: string, agora: Date): { hoje: string; minuto: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(agora).map((x) => [x.type, x.value]))
  return { hoje: `${p.year}-${p.month}-${p.day}`, minuto: Number(p.hour) * 60 + Number(p.minute) }
}

const idiomaDe = (v: unknown): Idioma => (v === 'en' || v === 'es' || v === 'fr' || v === 'hi' ? v : 'pt-BR')
const PERIODO: Record<string, string> = { manha: 'de manhã', meio_dia: 'à tarde', noite: 'à noite' }

interface Perfil {
  id: string
  nome: string | null
  idioma: string | null
  fuso: string | null
  horario_acordar: string | null
  horario_dormir: string | null
  life_chat_momentos: string[] | null
  last_app_open: string | null
  consentimento_habitos: boolean | null
  consentimento_memoria: boolean | null
}

async function montarDados(sb: Sb, p: Perfil, agora: Date): Promise<{ dados: DadosPush; idioma: Idioma; fuso: string }> {
  const fuso = fusoValido(p.fuso)
  const idioma = idiomaDe(p.idioma)
  const { hoje, minuto } = relogioLocal(fuso, agora)
  const desde14 = new Date(agora.getTime() - 14 * 86_400_000).toISOString()
  const [ab, envios, conversa, sensivel, riscos] = await Promise.all([
    dadosAbertura(sb, p.id, hoje, idioma),
    sb.from('life_push_envios').select('motivo, criado_em, aberto_em').eq('user_id', p.id).gte('criado_em', desde14)
      .order('criado_em', { ascending: false }).limit(40),
    sb.from('life_chat_mensagens').select('criado_em').eq('user_id', p.id).eq('autor', 'usuario')
      .order('criado_em', { ascending: false }).limit(1),
    sb.from('eventos_seguranca').select('id', { count: 'exact', head: true }).eq('user_id', p.id)
      .in('tipo', ['sinal_sensivel', 'palavra_risco']).gte('data', new Date(agora.getTime() - 24 * 3_600_000).toISOString()),
    p.consentimento_habitos === true
      ? sb.from('vicios_user').select('nome, horario_risco').eq('user_id', p.id).eq('ativo', true).not('horario_risco', 'is', null).limit(5)
      : Promise.resolve({ data: [] as { nome: string; horario_risco: string }[] }),
  ])
  // Sumiu = nem abriu o app nem registrou nada: vale o mais recente dos dois.
  const abriu = p.last_app_open ? relogioLocal(fuso, new Date(p.last_app_open)).hoje : null
  const ultimaAtividade = [ab.ultimaAtividade, abriu].filter((x): x is string => !!x).sort().at(-1) ?? null
  const ultimaFala = (conversa.data as { criado_em: string }[] | null)?.[0]?.criado_em
  const dados: DadosPush = {
    agora,
    hoje,
    minutoLocal: minuto,
    acordar: minutosDe(p.horario_acordar) ?? 7 * 60,
    dormir: minutosDe(p.horario_dormir) ?? 23 * 60,
    momentos: (p.life_chat_momentos ?? []).filter((m): m is Momento => m === 'manha' || m === 'meio_dia' || m === 'noite'),
    pausadoHoje: ab.pausadoHoje,
    sinalSensivel: (sensivel.count ?? 0) > 0,
    ultimaConversa: ultimaFala ? new Date(ultimaFala) : null,
    envios: ((envios.data ?? []) as { motivo: string; criado_em: string; aberto_em: string | null }[])
      .map((e) => ({ motivo: e.motivo, criadoEm: e.criado_em, abertoEm: e.aberto_em })),
    iniciativas: ab.motivosRecentes,
    eventos: ab.eventos,
    habitos: ab.habitos,
    riscos: ((riscos.data ?? []) as { nome: string; horario_risco: string }[])
      .flatMap((r) => { const m = minutosDe(r.horario_risco); return m === null ? [] : [{ nome: r.nome, minuto: m }] }),
    agradavelUltimosDias: ab.agradavelUltimosDias,
    ultimaAtividade,
  }
  return { dados, idioma, fuso }
}

/** Pago: frase da IA (filtrada). Falhou ou reprovou: frase pronta. */
async function escreverFrase(sb: Sb, p: Perfil, dec: Decisao, dados: DadosPush, idioma: Idioma, pago: boolean) {
  const primeiroNome = (() => {
    const n = p.nome?.trim().split(/\s+/)[0]
    return n ? n.charAt(0).toLocaleUpperCase() + n.slice(1) : null
  })()
  const hora = Math.floor(dados.minutoLocal / 60)
  const fixo = textoFixo(dec, idioma, primeiroNome, dados.hoje, hora)
  if (!pago) return { texto: fixo, ia: false }

  const memorias = p.consentimento_memoria === true
    ? (await memoriasParaContexto(sb, p.id, dec.detalhe?.texto ?? '', dados.hoje, 8))
        .filter((m) => m.categoria !== 'saude' && m.categoria !== 'evento').map((m) => m.texto)
    : []
  const periodo = PERIODO[dados.minutoLocal < 720 ? 'manha' : dados.minutoLocal < 1020 ? 'meio_dia' : 'noite']!
  const { sistema, mensagem } = pedidoIA(dec, { idioma, nome: primeiroNome, memorias, periodo })
  const g = await chamarIA({ sistema, mensagens: [{ papel: 'usuario', texto: mensagem }], maxSaida: 120, json: true }, { timeoutMs: 12_000 })
  await sb.from('ai_audit_logs').insert({
    user_id: p.id, tipo_chamada: 'push', status: g.ok ? 'ok' : 'erro',
    tokens_usados: g.tokens, custo_estimado: g.custo,
    tokens_entrada: g.uso?.entrada ?? null, tokens_saida: g.uso?.saida ?? null,
    tokens_raciocinio: g.uso?.raciocinio ?? null, tokens_cache: g.uso?.cache ?? null,
    modelo: g.modelo ?? null, versao_contexto: `push:${dec.motivo}`, data: new Date().toISOString(),
  }).then(({ error }) => { if (error) console.warn('[push] audit falhou', error.message) })
  const texto = g.ok ? lerJsonTexto(g.texto) : null
  // Nome dos hábitos nunca na tela bloqueada; número só no marco.
  const proibidos = [...dados.habitos.map((h) => h.nome), ...dados.riscos.map((r) => r.nome)]
  if (texto && fraseValida(texto, proibidos, dec.motivo === 'marco' || dec.motivo === 'sumiu')) return { texto, ia: true }
  if (texto) console.warn('[push] frase da IA reprovada', dec.motivo)
  return { texto: fixo, ia: false }
}

async function processar(sb: Sb, p: Perfil, tokens: string[], agora: Date, conta: ReturnType<typeof lerConta>, simular: boolean) {
  const { dados, idioma } = await montarDados(sb, p, agora)
  const dec = decidirPush(dados)
  if (!dec) return { user: p.id, enviado: false }
  const { data: pagoBruto } = await sb.rpc('is_premium_like', { p_user_id: p.id })
  const { texto, ia } = await escreverFrase(sb, p, dec, dados, idioma, pagoBruto === true)
  if (simular || !conta) return { user: p.id, enviado: false, simulado: { motivo: dec.motivo, texto, ia } }

  const { data: envio, error } = await sb.from('life_push_envios')
    .insert({ user_id: p.id, motivo: dec.chave.slice(0, 120), texto, ia }).select('id').single()
  if (error || !envio) { console.warn('[push] gravar envio falhou', error?.message); return { user: p.id, enviado: false } }

  let algum = false
  for (const token of tokens) {
    const r = await enviarPush(conta, {
      token, titulo: TITULO[idioma], corpo: texto,
      dados: { envioId: envio.id as string, rota: '/home', abrirLife: '1' },
    }).catch((e) => { console.warn('[push] fcm', String(e)); return 'erro' as const })
    if (r === 'ok') algum = true
    if (r === 'token_invalido') await sb.from('push_dispositivos').delete().eq('token', token)
  }
  if (!algum) {
    await sb.from('life_push_envios').delete().eq('id', envio.id)
    return { user: p.id, enviado: false }
  }
  // A frase também vira a iniciativa do dia no chat (o cartão da Home não repete).
  await sb.from('life_chat_mensagens').insert({ user_id: p.id, autor: 'life', texto, tipo: 'iniciativa' })
  await sb.from('life_iniciativas').insert({ user_id: p.id, dia: dados.hoje, motivo: dec.chave.slice(0, 120), texto })
  return { user: p.id, enviado: true, motivo: dec.motivo, ia }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
  const senha = req.headers.get('x-relogio') ?? ''
  const { data: ok } = await sb.rpc('conferir_relogio_push', { p_senha: senha })
  if (ok !== true) return json({ error: 'forbidden' }, 403)

  const corpo = (await req.json().catch(() => ({}))) as { user_id?: string; simular?: boolean }
  const simular = corpo.simular === true
  const conta = lerConta(env('FIREBASE_SERVICE_ACCOUNT'))
  if (!conta && !simular) return json({ ok: false, motivo: 'sem_chave_firebase' })
  const agora = new Date()

  let q = sb.from('push_dispositivos').select('token, user_id').order('visto_em', { ascending: false }).limit(5000)
  if (corpo.user_id) q = q.eq('user_id', corpo.user_id)
  const { data: disp, error: e1 } = await q
  if (e1) return json({ ok: false, erro: e1.message }, 500)
  const porUser = new Map<string, string[]>()
  for (const d of (disp ?? []) as { token: string; user_id: string }[]) porUser.set(d.user_id, [...(porUser.get(d.user_id) ?? []), d.token])
  if (porUser.size === 0) return json({ ok: true, pessoas: 0 })

  const { data: perfis, error: e2 } = await sb.from('profiles')
    .select('id, nome, idioma, fuso, horario_acordar, horario_dormir, life_chat_momentos, last_app_open, consentimento_habitos, consentimento_memoria')
    .eq('life_chat_ligado', true).in('id', [...porUser.keys()].slice(0, LOTE))
  if (e2) return json({ ok: false, erro: e2.message }, 500)

  const lista = (perfis ?? []) as Perfil[]
  const resultados: unknown[] = []
  for (let i = 0; i < lista.length; i += PARALELO) {
    const parte = await Promise.allSettled(lista.slice(i, i + PARALELO).map((p) => processar(sb, p, porUser.get(p.id) ?? [], agora, conta, simular)))
    for (const r of parte) resultados.push(r.status === 'fulfilled' ? r.value : { erro: String(r.reason).slice(0, 200) })
  }
  const enviados = resultados.filter((r) => (r as { enviado?: boolean }).enviado).length
  console.log('[push] volta do relógio', { pessoas: lista.length, enviados })
  return json({ ok: true, pessoas: lista.length, enviados, ...(simular || corpo.user_id ? { resultados } : {}) })
})
