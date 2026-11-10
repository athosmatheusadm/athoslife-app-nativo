// Teste de invasão do ATHOSlife (10/11/2026). Cria 2 contas de teste, tenta
// ler/alterar dados de outra pessoa, virar premium/admin sem pagar e chamar as
// funções do servidor sem senha; no fim apaga as contas.
//
//   node scripts/teste-invasao.mjs .env
//
// Rode depois de mexer em regra do banco, permissão ou Edge Function.
// O esperado está no bloco de 10/11/2026 (4) do docs/WORKLOG.md.
import { readFileSync } from 'node:fs'
const envTxt = readFileSync(process.argv[2] ?? '.env', 'utf8')
const env = Object.fromEntries(envTxt.split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY
const log = (nome, r) => console.log(`${nome} => ${r}`)
const curto = (x) => { const s = typeof x === 'string' ? x : JSON.stringify(x); return s.length > 170 ? s.slice(0, 170) + '…' : s }
async function req(path, { method = 'GET', token = ANON, body, headers = {}, apikey = true } = {}) {
  const h = { 'content-type': 'application/json', ...headers }
  if (apikey) h.apikey = ANON
  if (token) h.authorization = `Bearer ${token}`
  const r = await fetch(URL_ + path, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) })
  let t = await r.text(); let j; try { j = JSON.parse(t) } catch { j = t }
  return { s: r.status, j }
}
const fmt = (r) => `${r.s} ${curto(r.j)}`
async function conta(tag) {
  const email = `qa.seg.${tag}.${Date.now()}@example.com`, password = 'Qa!' + Math.random().toString(36).slice(2) + 'Zx9'
  const r = await req('/auth/v1/signup', { method: 'POST', body: { email, password } })
  if (!r.j?.access_token) throw new Error('signup falhou: ' + fmt(r))
  return { id: r.j.user.id, token: r.j.access_token, email, password }
}
const A = await conta('a'), B = await conta('b')
console.log('contas criadas', A.id.slice(0, 8), B.id.slice(0, 8))
// dado da vítima (A)
await req('/rest/v1/registros_agua', { method: 'POST', token: A.token, body: { user_id: A.id, quantidade_ml: 250, data: '2026-11-10' }, headers: { prefer: 'return=minimal' } })

console.log('\n== 1. SEM LOGIN (só a chave pública do app) ==')
for (const t of ['profiles', 'life_chat_mensagens', 'rc_assinaturas', 'life_config', 'life_memorias', 'push_dispositivos', 'registros_agua', 'vip_links', 'billing_config', 'eventos_seguranca', 'taco', 'alimentos', 'fundador_vagas'])
  log(`anon lê ${t}`, fmt(await req(`/rest/v1/${t}?select=*&limit=2`)))
log('anon rpc admin_list_users', fmt(await req('/rest/v1/rpc/admin_list_users', { method: 'POST', body: {} })))
log('anon rpc life_config_ligada', fmt(await req('/rest/v1/rpc/life_config_ligada', { method: 'POST', body: { p_chave: 'fase5' } })))
log('anon rpc consumir_cota_ia', fmt(await req('/rest/v1/rpc/consumir_cota_ia', { method: 'POST', body: { p_user_id: A.id, p_tipo: 'chat', p_teto_global_tokens: 1 } })))
log('anon lista bucket avatars', fmt(await req('/storage/v1/object/list/avatars', { method: 'POST', body: { prefix: '', limit: 5 } })))
log('anon lista bucket progress-photos', fmt(await req('/storage/v1/object/list/progress-photos', { method: 'POST', body: { prefix: '', limit: 5 } })))

console.log('\n== 2. USUÁRIO B ATACA USUÁRIO A ==')
log('B lê perfil de A', fmt(await req(`/rest/v1/profiles?id=eq.${A.id}&select=id,email,nome`, { token: B.token })))
log('B lê todos os perfis', fmt(await req(`/rest/v1/profiles?select=id,email&limit=5`, { token: B.token })))
log('B lê água de A', fmt(await req(`/rest/v1/registros_agua?user_id=eq.${A.id}&select=*`, { token: B.token })))
log('B muda nome de A', fmt(await req(`/rest/v1/profiles?id=eq.${A.id}`, { method: 'PATCH', token: B.token, body: { nome: 'hackeado' }, headers: { prefer: 'return=representation' } })))
log('B grava água em nome de A', fmt(await req('/rest/v1/registros_agua', { method: 'POST', token: B.token, body: { user_id: A.id, quantidade_ml: 9999, data: '2026-11-10' } })))
log('B apaga água de A', fmt(await req(`/rest/v1/registros_agua?user_id=eq.${A.id}`, { method: 'DELETE', token: B.token, headers: { prefer: 'return=representation' } })))
log('B grava memória do Life em A', fmt(await req('/rest/v1/life_memorias', { method: 'POST', token: B.token, body: { user_id: A.id, texto: 'x', origem: 'usuario' } })))
log('B rpc is_premium_like(A)', fmt(await req('/rest/v1/rpc/is_premium_like', { method: 'POST', token: B.token, body: { p_user_id: A.id } })))
log('B rpc fuso_do_usuario(A)', fmt(await req('/rest/v1/rpc/fuso_do_usuario', { method: 'POST', token: B.token, body: { p_user_id: A.id } })))
log('B rpc life_responder_licenca_aviso(A)', fmt(await req('/rest/v1/rpc/life_responder_licenca_aviso', { method: 'POST', token: B.token, body: { p_pode: true, p_user_id: A.id } })))
log('B sobe arquivo na pasta de avatar de A', fmt(await req(`/storage/v1/object/avatars/${A.id}/x.png`, { method: 'POST', token: B.token, body: 'x', headers: { 'content-type': 'image/png' } })))
log('B lista todos os avatares', fmt(await req('/storage/v1/object/list/avatars', { method: 'POST', token: B.token, body: { prefix: '', limit: 5 } })))

console.log('\n== 3. B TENTA VIRAR PREMIUM / ADMIN SEM PAGAR ==')
for (const [k, v] of [['plano', 'premium'], ['is_admin', true], ['assinatura_ativa', true], ['trial_expira', '2099-01-01'], ['chat_msgs_hoje', -999], ['foto_scans_hoje', -999], ['email', 'x@y.z']])
  log(`B muda o próprio ${k}`, fmt(await req(`/rest/v1/profiles?id=eq.${B.id}`, { method: 'PATCH', token: B.token, body: { [k]: v }, headers: { prefer: 'return=representation' } })))
log('B insere rc_assinaturas', fmt(await req('/rest/v1/rc_assinaturas', { method: 'POST', token: B.token, body: { user_id: B.id } })))
log('B insere fundadores', fmt(await req('/rest/v1/fundadores', { method: 'POST', token: B.token, body: { user_id: B.id } })))
log('B rpc admin_set_vip(si mesmo)', fmt(await req('/rest/v1/rpc/admin_set_vip', { method: 'POST', token: B.token, body: { target_user: B.id, enable: true } })))
log('B rpc admin_list_users', fmt(await req('/rest/v1/rpc/admin_list_users', { method: 'POST', token: B.token, body: {} })))
log('B rpc aplicar_cliente_rc', fmt(await req('/rest/v1/rpc/aplicar_cliente_rc', { method: 'POST', token: B.token, body: { p_user_id: B.id, p_acesso_ate: '2099-01-01', p_acesso_vitalicio: true, p_assinaturas: [] } })))
log('B rpc reservar_vaga_fundador', fmt(await req('/rest/v1/rpc/reservar_vaga_fundador', { method: 'POST', token: B.token, body: {} })))
log('B rpc devolver_cota_ia', fmt(await req('/rest/v1/rpc/devolver_cota_ia', { method: 'POST', token: B.token, body: { p_user_id: B.id, p_tipo: 'chat' } })))
log('B zera a própria cota de IA', fmt(await req(`/rest/v1/ia_uso_diario?user_id=eq.${B.id}`, { method: 'DELETE', token: B.token, headers: { prefer: 'return=representation' } })))
log('B liga a Fase 5 em life_config', fmt(await req('/rest/v1/life_config', { method: 'POST', token: B.token, body: { chave: 'x', valor: '1' } })))
log('B altera catálogo de alimentos', fmt(await req('/rest/v1/alimentos?id=not.is.null', { method: 'PATCH', token: B.token, body: { nome: 'hack' }, headers: { prefer: 'return=representation' } })))
log('B apaga o próprio rastro de segurança', fmt(await req(`/rest/v1/eventos_seguranca?user_id=eq.${B.id}`, { method: 'DELETE', token: B.token, headers: { prefer: 'return=representation' } })))
log('B rpc liberar_teste_gratis(aparelho inventado)', fmt(await req('/rest/v1/rpc/liberar_teste_gratis', { method: 'POST', token: B.token, body: { p_aparelho: 'aparelho-falso-' + Math.random() } })))
log('B plano depois', fmt(await req(`/rest/v1/profiles?id=eq.${B.id}&select=plano,trial_expira,is_admin`, { token: B.token })))
log('B produto falso c/ imagem externa', fmt(await req('/rest/v1/rpc/salvar_produto_codigo_barras', { method: 'POST', token: B.token, body: { p_codigo: '00000000', p_nome: 'Teste QA', p_marca: null, p_kcal: 100, p_proteina: 10, p_carbo: 10, p_gordura: 2, p_porcao_g: 100, p_imagem_url: 'https://evil.example.com/pixel.png', p_fonte: 'off' } })))
log('produto falso gravado?', fmt(await req(`/rest/v1/produtos_codigo_barras?codigo=eq.00000000&select=codigo,nome,imagem_url,fonte`, { token: A.token })))

console.log('\n== 4. FUNÇÕES DO SERVIDOR ==')
log('ai-proxy sem token', fmt(await req('/functions/v1/ai-proxy', { method: 'POST', token: null, body: { tipo: 'chat', mensagem: 'oi' } })))
log('ai-proxy com chave pública no lugar do login', fmt(await req('/functions/v1/ai-proxy', { method: 'POST', body: { tipo: 'chat', mensagem: 'oi' } })))
log('ai-proxy token forjado', fmt(await req('/functions/v1/ai-proxy', { method: 'POST', token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.x', body: { tipo: 'chat', mensagem: 'oi' } })))
log('ai-proxy tipo inválido', fmt(await req('/functions/v1/ai-proxy', { method: 'POST', token: B.token, body: { tipo: '__proto__' } })))
log('ai-proxy ação de outro (id inventado)', fmt(await req('/functions/v1/ai-proxy', { method: 'POST', token: B.token, body: { tipo: 'acao', id: '00000000-0000-0000-0000-000000000000', decisao: 'confirmar' } })))
log('ai-proxy corpo gigante (5 MB)', fmt(await req('/functions/v1/ai-proxy', { method: 'POST', token: B.token, body: JSON.stringify({ tipo: 'chat', mensagem: 'a'.repeat(5_000_000) }) })))
log('ai-proxy origem estranha (CORS)', await (async () => { const r = await fetch(URL_ + '/functions/v1/ai-proxy', { method: 'OPTIONS', headers: { origin: 'https://site-malicioso.com', 'access-control-request-method': 'POST' } }); return r.status + ' allow-origin=' + r.headers.get('access-control-allow-origin') })())
log('life-push sem senha', fmt(await req('/functions/v1/life-push', { method: 'POST', token: null, apikey: false, body: { amostra: true } })))
log('life-push senha errada', fmt(await req('/functions/v1/life-push', { method: 'POST', token: null, apikey: false, body: { user_id: A.id }, headers: { 'x-relogio': 'chute' } })))
log('rc-webhook sem senha (dar premium)', fmt(await req('/functions/v1/rc-webhook', { method: 'POST', token: null, apikey: false, body: { event: { id: 'x', type: 'INITIAL_PURCHASE', app_user_id: B.id } } })))
log('rc-webhook senha errada', fmt(await req('/functions/v1/rc-webhook', { method: 'POST', token: 'chute', apikey: false, body: { event: { id: 'x', type: 'INITIAL_PURCHASE', app_user_id: B.id } } })))
log('rc-sync sem login', fmt(await req('/functions/v1/rc-sync', { method: 'POST', body: {} })))
log('rc-sync logado sem compra', fmt(await req('/functions/v1/rc-sync', { method: 'POST', token: B.token, body: {} })))
log('produto-codigo sem login', fmt(await req('/functions/v1/produto-codigo', { method: 'POST', body: { codigo: '3017620422003' } })))
log('produto-codigo código inválido', fmt(await req('/functions/v1/produto-codigo', { method: 'POST', token: B.token, body: { codigo: 'abc' } })))
log('produto-codigo tentando mandar o produto pronto', fmt(await req('/functions/v1/produto-codigo', { method: 'POST', token: B.token, body: { codigo: '00000000', nome: 'Teste QA', kcal_100: 1, imagem_url: 'https://evil.example.com/p.png', fonte: 'off' } })))
log('nome inventado entrou na base?', await (async () => { const r = await req(`/rest/v1/produtos_codigo_barras?codigo=eq.00000000&select=nome`, { token: A.token }); return r.j?.[0]?.nome === 'Teste QA' ? 'SIM (falha)' : `não (${curto(r.j)})` })())
log('produto-codigo código real (servidor busca sozinho)', fmt(await req('/functions/v1/produto-codigo', { method: 'POST', token: B.token, body: { codigo: '3017620422003', nome: 'NOME FALSO' } })))
log('produto real na base', fmt(await req(`/rest/v1/produtos_codigo_barras?codigo=eq.3017620422003&select=nome,marca,kcal_100,imagem_url,fonte`, { token: A.token })))

console.log('\n== 5. LOGIN ==')
let bloqueou = null
for (let i = 1; i <= 12; i++) { const r = await req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: A.email, password: 'errada' + i } }); if (r.s === 429) { bloqueou = i; break } }
log('força bruta de senha (12 tentativas)', bloqueou ? `bloqueado na tentativa ${bloqueou}` : 'NÃO bloqueou em 12 tentativas')
if (bloqueou) log('senha certa durante a trava', `${(await req('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: A.email, password: A.password } })).s} (esperado 429)`)
const fraca = await req('/auth/v1/signup', { method: 'POST', body: { email: `qa.seg.c.${Date.now()}@example.com`, password: 'abc123' } })
log('senha de 6 letras no cadastro', fraca.j?.access_token ? 'ACEITA (servidor deveria exigir 8)' : `recusada (${fraca.s})`)
const C = fraca.j?.access_token ? { token: fraca.j.access_token, password: 'abc123' } : null

console.log('\n== LIMPEZA ==')
await req(`/rest/v1/produtos_codigo_barras?codigo=eq.00000000`, { method: 'DELETE', token: B.token })
for (const c of [A, B, C].filter(Boolean)) log('excluir conta de teste', fmt(await req('/rest/v1/rpc/excluir_minha_conta', { method: 'POST', token: c.token, body: { p_senha: c.password } })))
