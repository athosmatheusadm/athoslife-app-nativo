// Teste de fumaça do Life (02/11): roda DEPOIS de todo deploy da ai-proxy.
// Conversa de verdade com uma conta de teste e reprova se o chat falhar,
// cair no modelo reserva ou passar de LIMITE_MS. Não grava nada além da
// conversa da própria conta de teste.
//
//   SMOKE_EMAIL=... SMOKE_SENHA=... VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node scripts/smoke-life.mjs
//
// Também roda sozinho no GitHub (.github/workflows/smoke-life.yml) e avisa por e-mail se falhar.
const url = process.env.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SMOKE_EMAIL
const senha = process.env.SMOKE_SENHA
const LIMITE_MS = Number(process.env.SMOKE_LIMITE_MS ?? 8000)
if (!url || !anon || !email || !senha) { console.error('faltam variáveis (ver o topo do arquivo)'); process.exit(2) }

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', apikey: anon }, body: JSON.stringify({ email, password: senha }),
})
if (!login.ok) { console.error('login falhou', login.status); process.exit(1) }
const { access_token: jwt } = await login.json()

const mensagens = ['oi, tudo bem?', 'me dá uma ideia de lanche rápido']
let falhas = 0
for (const mensagem of mensagens) {
  const t0 = Date.now()
  const r = await fetch(`${url}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, apikey: anon },
    body: JSON.stringify({ tipo: 'chat', mensagem, id_envio: crypto.randomUUID(), recursos: ['programar'] }),
  })
  const ms = Date.now() - t0
  const corpo = await r.json().catch(() => ({}))
  const okResp = r.ok && typeof corpo.resposta === 'string' && corpo.resposta.length > 0
  const lento = ms > LIMITE_MS
  console.log(`${okResp && !lento ? 'OK ' : 'FALHOU'} ${r.status} ${ms}ms  "${mensagem}" → ${okResp ? corpo.resposta.slice(0, 80) : JSON.stringify(corpo)}`)
  if (!okResp || lento) falhas++
}
if (falhas) { console.error(`\n${falhas} de ${mensagens.length} falharam (erro ou mais de ${LIMITE_MS} ms).`); process.exit(1) }
console.log('\nLife respondendo normal.')
