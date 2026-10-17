// ATHOSlife — rc-sync: o app chama logo depois de comprar, ao restaurar e ao abrir.
// Deploy com verificação de JWT ligada (padrão): só usuário logado.
//
//   POST {}  ->  { direito: { plano, plano_tipo, assinatura_expira, fundador_numero }, vagas_fundador }
//
// O servidor lê o cliente direto na API do RevenueCat (não confia no app).

import { createClient } from 'npm:@supabase/supabase-js@2'
import { argsAplicar, lerCliente } from '../_shared/revenuecat.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { ...cors, 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const url = Deno.env.get('SUPABASE_URL'), chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !chave) return json({ error: 'server_misconfigured' }, 500)
    const sb = createClient(url, chave, { auth: { persistSession: false } })

    const cab = req.headers.get('authorization') ?? ''
    const { data: { user } } = await sb.auth.getUser(cab.replace(/^Bearer\s+/i, ''))
    if (!user) return json({ error: 'not_authenticated' }, 401)

    const { data: cfg } = await sb.from('billing_config').select('entitlement').eq('id', 1).single()
    const cliente = await lerCliente(user.id)
    const { data: direito, error } = await sb.rpc('aplicar_cliente_rc', argsAplicar(user.id, cliente, cfg?.entitlement ?? 'premium'))
    if (error) throw error
    const { data: vagas } = await sb.rpc('vagas_fundador_disponiveis')
    return json({ direito, vagas_fundador: vagas ?? null })
  } catch (e) {
    const msg = String((e as Error)?.message ?? e)
    console.error('[rc-sync]', msg)
    if (msg.startsWith('rc_')) return json({ error: 'revenuecat_indisponivel' }, 502)
    return json({ error: 'erro_interno' }, 500)
  }
})
