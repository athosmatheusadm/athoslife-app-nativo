// Teste de estresse do Life (ai-proxy v3.7). Uso:
//   node estresse.mjs <arquivo .env do app> <arquivo com "email\nsenha">
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const [email, senha] = fs.readFileSync(process.argv[3], 'utf8').trim().split('\n')
const URL_ = env.VITE_SUPABASE_URL, ANON = env.VITE_SUPABASE_ANON_KEY
const login = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: senha }) })).json()
if (!login.access_token) { console.log('login falhou', login.error_description ?? login.msg ?? login); process.exit(1) }
const jwt = login.access_token
async function proxy(corpo) {
  const t = Date.now()
  const r = await fetch(`${URL_}/functions/v1/ai-proxy`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}`, apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
  return { http: r.status, ms: Date.now() - t, ...(await r.json().catch(() => ({}))) }
}
const roteiro = JSON.parse(fs.readFileSync(new URL('./roteiro.json', import.meta.url), 'utf8'))
const inicio = process.argv[4] ? Number(process.argv[4]) : 0
for (const [i, [foco, msg, espera]] of roteiro.entries()) {
  if (i < inicio) continue
  const id = crypto.randomUUID()
  const r = await proxy({ tipo: 'chat', mensagem: msg, foco, id_envio: id })
  console.log(`\n#${i} [${foco}] ${msg}\n   esperado: ${espera}\n   -> (${r.http}, ${r.ms}ms) ${r.resposta ?? r.error}${r.acao ? `\n   acao: ${JSON.stringify(r.acao)}` : ''}`)
  if (r.acao?.tipo === 'escolha') {
    const rep = await proxy({ tipo: 'chat', mensagem: msg, foco, id_envio: id })
    console.log(`   reenvio mesmo id -> ${rep.resposta} ${rep.acao ? JSON.stringify(rep.acao.tipo) : ''}`)
    const e = await proxy({ tipo: 'acao', id: r.acao.id, escolha: 'adicionar' })
    console.log(`   escolha adicionar -> ${e.resposta}`)
    const e2 = await proxy({ tipo: 'acao', id: r.acao.id, escolha: 'adicionar' })
    console.log(`   toque duplo -> ${e2.resposta}`)
  }
  if (r.error === 'rate_limited') await new Promise((ok) => setTimeout(ok, 61_000))
  await new Promise((ok) => setTimeout(ok, 11_000)) // 6 chamadas/min por usuário
}
