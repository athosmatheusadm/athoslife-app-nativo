// ================================================================
// Envio pelo Firebase Cloud Messaging (API HTTP v1). A chave da conta de
// serviço fica no Secret FIREBASE_SERVICE_ACCOUNT (o JSON inteiro). O
// acesso é um JWT assinado aqui (RS256, WebCrypto) trocado por um token
// do Google, guardado por ~50 min.
// ================================================================

interface ContaServico {
  project_id: string
  client_email: string
  private_key: string
}

export function lerConta(bruto: string | undefined): ContaServico | null {
  if (!bruto) return null
  try {
    const c = JSON.parse(bruto) as Partial<ContaServico>
    return c.project_id && c.client_email && c.private_key ? (c as ContaServico) : null
  } catch {
    return null
  }
}

const b64url = (dados: Uint8Array | string) => {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : dados
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function assinar(conta: ContaServico): Promise<string> {
  const pem = conta.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const chave = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const agora = Math.floor(Date.now() / 1000)
  const cabecalho = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const corpo = b64url(JSON.stringify({
    iss: conta.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora,
    exp: agora + 3600,
  }))
  const assinatura = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', chave, new TextEncoder().encode(`${cabecalho}.${corpo}`)))
  return `${cabecalho}.${corpo}.${b64url(assinatura)}`
}

let cache: { token: string; ate: number } | null = null

async function tokenDeAcesso(conta: ContaServico): Promise<string> {
  if (cache && cache.ate > Date.now()) return cache.token
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: await assinar(conta) }),
  })
  const j = (await r.json()) as { access_token?: string; expires_in?: number; error?: string }
  if (!r.ok || !j.access_token) throw new Error(`google_oauth: ${j.error ?? r.status}`)
  cache = { token: j.access_token, ate: Date.now() + Math.min(j.expires_in ?? 3600, 3000) * 1000 }
  return j.access_token
}

export type ResultadoEnvio = 'ok' | 'token_invalido' | 'erro'

export async function enviarPush(conta: ContaServico, p: {
  token: string
  titulo: string
  corpo: string
  dados: Record<string, string>
}): Promise<ResultadoEnvio> {
  const acesso = await tokenDeAcesso(conta)
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${conta.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: p.token,
        notification: { title: p.titulo, body: p.corpo },
        data: p.dados,
        android: {
          priority: 'high',
          notification: { channel_id: 'life', icon: 'ic_stat_athos', color: '#64c27b', tag: 'life' },
        },
        apns: { payload: { aps: { sound: 'default' } } },
      },
    }),
  })
  if (r.ok) return 'ok'
  const erro = await r.text().catch(() => '')
  // Aparelho desinstalou ou o token venceu: apagar e não tentar mais.
  if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT.*registration/i.test(erro)) return 'token_invalido'
  console.warn('[fcm] envio falhou', r.status, erro.slice(0, 300))
  return 'erro'
}
