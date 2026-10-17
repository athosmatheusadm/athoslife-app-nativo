// ATHOSlife — rc-webhook: avisos do RevenueCat (compra, renovação, cancelamento,
// vencimento, reembolso, transferência...).
//
// Deploy com verificação de JWT do Supabase DESLIGADA (o RevenueCat não manda
// o token do Supabase). A autenticidade é conferida aqui pelo cabeçalho
// Authorization configurado no RevenueCat (e HMAC, se ativado).
//
// Como o RevenueCat recomenda, o evento só indica QUEM mudou: o estado real é
// lido de novo na API. 200 = entregue; outro código = RevenueCat tenta de novo
// (até 5 vezes: 5, 10, 20, 40 e 80 minutos).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { argsAplicar, type EventoRC, lerCliente, usuariosDoEvento, webhookAutentico } from '../_shared/revenuecat.ts'

const texto = (t: string, status = 200) => new Response(t, { status })

async function registrar(sb: SupabaseClient, e: EventoRC) {
  const { data: existente } = await sb.from('rc_eventos').select('id, status, tentativas').eq('evento_id', e.id!).maybeSingle()
  if (existente) {
    if (existente.status === 'ok' || existente.status === 'ignorado') return { repetido: true, id: existente.id as number }
    await sb.from('rc_eventos').update({ tentativas: (existente.tentativas as number) + 1 }).eq('id', existente.id)
    return { repetido: false, id: existente.id as number }
  }
  const { data, error } = await sb.from('rc_eventos')
    .insert({ evento_id: e.id, tipo: e.type ?? 'desconhecido', app_user_id: e.app_user_id ?? null, ambiente: e.environment ?? null })
    .select('id').single()
  if (error) {
    // Duas entregas ao mesmo tempo: a outra já registrou.
    if (error.code === '23505') return { repetido: true, id: 0 }
    throw error
  }
  return { repetido: false, id: data.id as number }
}

const finalizar = (sb: SupabaseClient, id: number, status: string, erro: string | null = null) =>
  id ? sb.from('rc_eventos').update({ status, erro, processado_em: new Date().toISOString() }).eq('id', id) : Promise.resolve()

Deno.serve(async (req) => {
  if (req.method !== 'POST') return texto('method_not_allowed', 405)
  const bruto = await req.text()
  if (!(await webhookAutentico(req, bruto))) return texto('unauthorized', 401)

  const url = Deno.env.get('SUPABASE_URL'), chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !chave) return texto('server_misconfigured', 500)
  const sb = createClient(url, chave, { auth: { persistSession: false } })

  let corpo: { event?: EventoRC } | null = null
  try { corpo = JSON.parse(bruto) } catch { /* corpo inválido */ }
  const e = corpo?.event
  if (!e?.id || !e.type) return texto('ignorado') // repetir não ajuda

  let reg: { repetido: boolean; id: number } | null = null
  try {
    reg = await registrar(sb, e)
    if (reg.repetido) return texto('ok')

    const usuarios = e.type === 'TEST' ? [] : usuariosDoEvento(e)
    if (!usuarios.length) { await finalizar(sb, reg.id, 'ignorado'); return texto('ok') }

    const { data: cfg } = await sb.from('billing_config').select('entitlement').eq('id', 1).single()
    for (const uid of usuarios) {
      const cliente = await lerCliente(uid)
      const { data, error } = await sb.rpc('aplicar_cliente_rc', argsAplicar(uid, cliente, cfg?.entitlement ?? 'premium'))
      if (error) throw error
      if ((data as { erro?: string })?.erro) console.warn('[rc-webhook] sem perfil para', uid)
    }
    await finalizar(sb, reg.id, 'ok')
    return texto('ok')
  } catch (err) {
    const msg = String((err as Error)?.message ?? err)
    console.error('[rc-webhook]', e.type, msg)
    if (reg) await finalizar(sb, reg.id, 'erro', msg.slice(0, 500))
    return texto('erro', 500)
  }
})
