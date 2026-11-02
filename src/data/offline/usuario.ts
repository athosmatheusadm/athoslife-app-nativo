import type { Session } from '@supabase/supabase-js'
import { supabase } from '@data/supabase/client'
import { capacitorAuthStorage } from '@data/supabase/storage'

/**
 * Quem está usando o app, sem ir ao servidor.
 *
 * Antes cada repositório chamava `auth.getUser()`, que vai à rede toda vez
 * (15 das 40 chamadas da Home) e, sem internet, devolve "não logado". A
 * sessão já está no aparelho: o id vem dela.
 */
let idAtual: string | null = null

/** O SessionProvider avisa quem entrou/saiu. */
export function definirUsuarioAtual(id: string | null): void {
  idAtual = id
}

export function usuarioAtualSincrono(): string | null {
  return idAtual
}

export async function usuarioId(): Promise<string> {
  if (idAtual) return idAtual
  const { data } = await supabase.auth.getSession()
  const id = data.session?.user.id ?? (await sessaoGuardada())?.user.id ?? null
  if (!id) throw new Error('not_authenticated')
  return id
}

/** E-mail da sessão local (sem rede). */
export async function emailDaSessao(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.email ?? (await sessaoGuardada())?.user.email ?? null
}

/**
 * A sessão como está guardada no aparelho, mesmo com o token vencido.
 *
 * Sem internet, depois de 1 hora o token vence e o supabase-js não consegue
 * renovar: `getSession()` devolve null, mas a sessão continua guardada
 * (falha de rede não desloga). Sem isto, a pessoa cairia no login só por
 * estar sem sinal. Quando a rede volta, o supabase-js renova sozinho; se a
 * sessão tiver sido revogada, o servidor responde 401 e o app desloga.
 */
export async function sessaoGuardada(): Promise<Session | null> {
  try {
    const chave = (supabase.auth as unknown as { storageKey: string }).storageKey
    const bruto = await capacitorAuthStorage.getItem(chave)
    if (!bruto) return null
    const s = JSON.parse(bruto) as Partial<Session> & { currentSession?: Session }
    const sessao = (s.currentSession ?? s) as Session
    if (!sessao.access_token || !sessao.refresh_token) return null
    if (sessao.user?.id) return sessao
    // Formato sem `user` junto: o id vem do próprio token.
    const sub = idDoToken(sessao.access_token)
    return sub ? ({ ...sessao, user: { id: sub } } as Session) : null
  } catch {
    return null
  }
}

function idDoToken(jwt: string): string | null {
  try {
    const parte = jwt.split('.')[1]
    if (!parte) return null
    const json = atob(parte.replace(/-/g, '+').replace(/_/g, '/'))
    const sub = (JSON.parse(json) as { sub?: unknown }).sub
    return typeof sub === 'string' ? sub : null
  } catch {
    return null
  }
}
