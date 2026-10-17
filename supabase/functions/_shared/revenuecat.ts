// ATHOSlife — leitura do cliente na API do RevenueCat e verificação dos webhooks.
//
// Segredos (Supabase > Edge Functions > Secrets):
//   RC_SECRET_KEY           chave secreta da API do RevenueCat (sk_...) — só no servidor
//   RC_WEBHOOK_AUTH         valor do "Authorization header" configurado no webhook do RevenueCat
//   RC_WEBHOOK_HMAC_SECRET  (opcional) segredo de assinatura HMAC do webhook

const env = (k: string) => Deno.env.get(k) ?? ''
const API = 'https://api.revenuecat.com/v1'

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface AssinaturaRC {
  expires_date?: string | null
  grace_period_expires_date?: string | null
  is_sandbox?: boolean
  refunded_at?: string | null
  unsubscribe_detected_at?: string | null
  billing_issues_detected_at?: string | null
  store?: string
  store_transaction_id?: string | null
  period_type?: string
  product_plan_identifier?: string | null
}
interface EntitlementRC {
  expires_date?: string | null
  grace_period_expires_date?: string | null
  product_identifier?: string
}
export interface ClienteRC {
  subscriber?: {
    entitlements?: Record<string, EntitlementRC>
    subscriptions?: Record<string, AssinaturaRC>
  }
}

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/** GET /v1/subscribers/{id}. Uma nova tentativa em 429/5xx. */
export async function lerCliente(appUserId: string, tentativa = 0): Promise<ClienteRC> {
  const chave = env('RC_SECRET_KEY')
  if (!chave) throw new Error('rc_chave_ausente')
  const r = await fetch(`${API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { authorization: `Bearer ${chave}`, accept: 'application/json' },
  })
  if (tentativa === 0 && (r.status === 429 || r.status >= 500)) {
    const pedido = Number(r.headers.get('retry-after') ?? '')
    await espera(Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 5) * 1000 : 500 + Math.random() * 500)
    return lerCliente(appUserId, 1)
  }
  if (!r.ok) throw new Error(`rc_api_${r.status}`)
  return await r.json() as ClienteRC
}

const maisTarde = (a?: string | null, b?: string | null) => {
  const ta = a ? Date.parse(a) : NaN, tb = b ? Date.parse(b) : NaN
  if (Number.isNaN(ta)) return Number.isNaN(tb) ? null : b!
  if (Number.isNaN(tb)) return a!
  return ta >= tb ? a! : b!
}

/** Parâmetros de public.aplicar_cliente_rc a partir da resposta do RevenueCat. */
export function argsAplicar(userId: string, cliente: ClienteRC, entitlementId: string) {
  const ent = cliente.subscriber?.entitlements?.[entitlementId]
  const vitalicio = !!ent && (ent.expires_date === null || ent.expires_date === undefined)
  const acessoAte = ent && !vitalicio ? maisTarde(ent.expires_date, ent.grace_period_expires_date) : null
  const assinaturas = Object.entries(cliente.subscriber?.subscriptions ?? {}).map(([chave, s]) => ({
    produto: chave,
    // Google Play no RevenueCat: "assinatura:base_plan" (ex.: athos_premium:anual).
    plano_base: chave.includes(':') ? chave.split(':')[1] : (s.product_plan_identifier ?? null),
    loja: s.store ?? null,
    expira_em: s.expires_date ?? null,
    carencia_ate: s.grace_period_expires_date ?? null,
    sandbox: !!s.is_sandbox,
    reembolsada_em: s.refunded_at ?? null,
    cancelada_em: s.unsubscribe_detected_at ?? null,
    problema_cobranca_em: s.billing_issues_detected_at ?? null,
    transacao: s.store_transaction_id ?? null,
    periodo: s.period_type ?? null,
  }))
  return { p_user_id: userId, p_acesso_ate: acessoAte, p_acesso_vitalicio: vitalicio, p_assinaturas: assinaturas }
}

// ---------- Webhook ----------
function iguais(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b)
  let dif = ea.length ^ eb.length
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) dif |= (ea[i] ?? 0) ^ (eb[i] ?? 0)
  return dif === 0
}

async function hmacHex(segredo: string, texto: string): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(texto))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Confere o cabeçalho Authorization configurado no RevenueCat e, se houver
 * segredo HMAC, a assinatura X-RevenueCat-Webhook-Signature (t=...,v1=...).
 */
export async function webhookAutentico(req: Request, corpoBruto: string, agoraMs = Date.now()): Promise<boolean> {
  const esperado = env('RC_WEBHOOK_AUTH')
  if (!esperado) return false
  const recebido = req.headers.get('authorization') ?? ''
  if (!iguais(recebido, esperado) && !iguais(recebido, `Bearer ${esperado}`)) return false

  const segredo = env('RC_WEBHOOK_HMAC_SECRET')
  if (!segredo) return true
  const partes = Object.fromEntries((req.headers.get('x-revenuecat-webhook-signature') ?? '').split(',').map((p) => {
    const i = p.indexOf('=')
    return [p.slice(0, i).trim(), p.slice(i + 1).trim()]
  }))
  const t = Number(partes.t)
  if (!partes.v1 || !Number.isFinite(t)) return false
  if (Math.abs(agoraMs / 1000 - t) > 300) return false // 5 minutos de tolerância
  return iguais(await hmacHex(segredo, `${partes.t}.${corpoBruto}`), partes.v1)
}

export interface EventoRC {
  id?: string
  type?: string
  environment?: string
  app_user_id?: string
  original_app_user_id?: string
  aliases?: string[]
  transferred_from?: string[]
  transferred_to?: string[]
}

/** Contas do ATHOSlife afetadas pelo evento (ids anônimos do RevenueCat são ignorados). */
export function usuariosDoEvento(e: EventoRC): string[] {
  const ids = e.type === 'TRANSFER'
    ? [...(e.transferred_from ?? []), ...(e.transferred_to ?? [])]
    : [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])]
  return [...new Set(ids.filter((x): x is string => typeof x === 'string' && UUID.test(x)).map((x) => x.toLowerCase()))]
}
