// Testes do módulo do RevenueCat com a rede simulada. Rodar: deno test -A supabase/functions/_shared/revenuecat.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'

Deno.env.set('RC_SECRET_KEY', 'sk_teste')
Deno.env.set('RC_WEBHOOK_AUTH', 'segredo-do-header')

const chamadas: { url: string; auth: string | null }[] = []
let falharUmaVez = false
globalThis.fetch = (async (entrada: string | URL | Request, init: RequestInit = {}) => {
  const url = String(entrada)
  chamadas.push({ url, auth: new Headers(init.headers).get('authorization') })
  if (falharUmaVez) { falharUmaVez = false; return new Response('', { status: 503 }) }
  return Response.json({
    subscriber: {
      entitlements: {
        premium: { expires_date: '2027-10-16T10:00:00Z', grace_period_expires_date: '2027-10-23T10:00:00Z', product_identifier: 'athos_premium:anual' },
      },
      subscriptions: {
        'athos_premium:anual': { expires_date: '2027-10-16T10:00:00Z', grace_period_expires_date: null, is_sandbox: false, refunded_at: null, unsubscribe_detected_at: null, billing_issues_detected_at: null, store: 'play_store', store_transaction_id: 'GPA.1234', period_type: 'normal' },
        'athos_premium:mensal': { expires_date: '2026-09-01T10:00:00Z', is_sandbox: false, store: 'play_store', store_transaction_id: 'GPA.0001', period_type: 'normal', refunded_at: '2026-08-15T10:00:00Z' },
        athos_antigo: { expires_date: '2026-01-01T00:00:00Z', product_plan_identifier: 'anual', store: 'play_store' },
      },
    },
  })
}) as typeof fetch

const rc = await import('./revenuecat.ts')
const UID = '6f1c2a9e-1b2c-4d3e-8f90-123456789abc'

Deno.test('lê o cliente com a chave secreta e o id codificado', async () => {
  await rc.lerCliente(UID)
  igual(chamadas.at(-1), { url: `https://api.revenuecat.com/v1/subscribers/${UID}`, auth: 'Bearer sk_teste' })
  await rc.lerCliente('$RCAnonymousID:abc')
  igual(chamadas.at(-1)!.url, 'https://api.revenuecat.com/v1/subscribers/%24RCAnonymousID%3Aabc')
})

Deno.test('instabilidade: tenta de novo uma vez', async () => {
  falharUmaVez = true
  const c = await rc.lerCliente(UID)
  ok(c.subscriber)
})

Deno.test('monta os parâmetros: acesso até o fim da carência e base plan pela chave', async () => {
  const a = rc.argsAplicar(UID, await rc.lerCliente(UID), 'premium')
  igual(a.p_acesso_ate, '2027-10-23T10:00:00Z')
  igual(a.p_acesso_vitalicio, false)
  const anual = a.p_assinaturas.find((s) => s.produto === 'athos_premium:anual')!
  igual(anual.plano_base, 'anual')
  igual(anual.transacao, 'GPA.1234')
  igual(a.p_assinaturas.find((s) => s.produto === 'athos_premium:mensal')!.reembolsada_em, '2026-08-15T10:00:00Z')
  igual(a.p_assinaturas.find((s) => s.produto === 'athos_antigo')!.plano_base, 'anual')
})

Deno.test('entitlement sem data de fim = vitalício; sem entitlement = sem acesso', () => {
  igual(rc.argsAplicar(UID, { subscriber: { entitlements: { premium: { expires_date: null } } } }, 'premium').p_acesso_vitalicio, true)
  const sem = rc.argsAplicar(UID, { subscriber: { entitlements: {} } }, 'premium')
  igual([sem.p_acesso_ate, sem.p_acesso_vitalicio, sem.p_assinaturas.length], [null, false, 0])
})

Deno.test('usuários do evento: ignora ids anônimos e trata transferência', () => {
  igual(rc.usuariosDoEvento({ type: 'RENEWAL', app_user_id: UID, original_app_user_id: UID, aliases: ['$RCAnonymousID:x', UID.toUpperCase()] }), [UID])
  const outro = '11111111-2222-4333-8444-555555555555'
  igual(rc.usuariosDoEvento({ type: 'TRANSFER', transferred_from: [UID], transferred_to: [outro], app_user_id: 'ignorado' }), [UID, outro])
})

Deno.test('webhook: aceita o header certo e recusa o errado', async () => {
  const req = (h: Record<string, string>) => new Request('https://x', { method: 'POST', headers: h })
  ok(await rc.webhookAutentico(req({ authorization: 'segredo-do-header' }), '{}'))
  ok(await rc.webhookAutentico(req({ authorization: 'Bearer segredo-do-header' }), '{}'))
  ok(!(await rc.webhookAutentico(req({ authorization: 'segredo-errado' }), '{}')))
  ok(!(await rc.webhookAutentico(req({}), '{}')))
})

Deno.test('webhook com HMAC: confere assinatura e horário', async () => {
  Deno.env.set('RC_WEBHOOK_HMAC_SECRET', 'whsec_teste')
  const corpo = '{"api_version":"1.0","event":{"id":"e1","type":"TEST"}}'
  const t = Math.floor(Date.now() / 1000)
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_teste'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`${t}.${corpo}`)))].map((b) => b.toString(16).padStart(2, '0')).join('')
  const req = (assinatura: string) => new Request('https://x', { method: 'POST', headers: { authorization: 'segredo-do-header', 'x-revenuecat-webhook-signature': assinatura } })
  ok(await rc.webhookAutentico(req(`t=${t},v1=${sig}`), corpo))
  ok(!(await rc.webhookAutentico(req(`t=${t},v1=${sig}`), corpo + ' ')), 'corpo alterado')
  ok(!(await rc.webhookAutentico(req(`t=${t - 3600},v1=${sig}`), corpo)), 'assinatura velha')
  ok(!(await rc.webhookAutentico(req('t=abc'), corpo)), 'cabeçalho malformado')
  Deno.env.delete('RC_WEBHOOK_HMAC_SECRET')
})
