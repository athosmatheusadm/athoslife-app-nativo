import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { capacitorAuthStorage } from './storage'
import { marcarFalhaDeRede, marcarRespostaDoServidor } from '@data/offline/conexao'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env',
  )
}

/**
 * Cliente único do Supabase.
 *
 * Regra de arquitetura: nenhuma tela importa este arquivo diretamente.
 * O acesso a dados passa sempre por um Repository em @data/repositories.
 * Isso mantém a UI ignorante de onde os dados vivem e permite que
 * Android e iOS reusem a mesma camada.
 */
/** Leitura/gravação no banco que passa disso é tratada como sem rede (cai na cópia local / fila). */
const TEMPO_MAX_REST_MS = 9_000
/**
 * Login e renovação da sessão. Sem corte, uma renovação pendurada em sinal
 * ruim segura todo pedido ao banco (o supabase-js espera a sessão antes de
 * cada um): a água não gravava e a fila offline não andava (teste de 30/10).
 */
const TEMPO_MAX_AUTH_MS = 15_000

/**
 * fetch do Supabase com duas funções a mais:
 *  - conta pro app se há internet (conexao.ts), pelo resultado real de cada pedido;
 *  - corta pedidos ao banco (/rest/) e de sessão (/auth/) que ficam
 *    pendurados em sinal ruim, pra a tela cair na cópia local em vez de girar
 *    pra sempre. IA e upload (functions, storage) não têm corte: demoram de
 *    propósito.
 */
const fetchComConexao: typeof fetch = async (entrada, init) => {
  const endereco = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
  const limite = endereco.includes('/rest/v1/') ? TEMPO_MAX_REST_MS : endereco.includes('/auth/v1/') ? TEMPO_MAX_AUTH_MS : 0
  const controle = limite ? new AbortController() : null
  const timer = controle ? setTimeout(() => controle.abort(), limite) : null
  if (controle && init?.signal) {
    if (init.signal.aborted) controle.abort()
    else init.signal.addEventListener('abort', () => controle.abort(), { once: true })
  }
  try {
    const res = await fetch(entrada, controle ? { ...init, signal: controle.signal } : init)
    marcarRespostaDoServidor()
    return res
  } catch (e) {
    marcarFalhaDeRede()
    throw e
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  global: { fetch: fetchComConexao },
  auth: {
    storage: capacitorAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
    // App nativo não tem callback de URL como a web.
    detectSessionInUrl: false,
  },
})

/**
 * Pergunta leve ao servidor (sem login): se responder, o app volta a se
 * considerar online e o selo "sem internet" some. Usado enquanto o app acha
 * que está offline e ninguém está pedindo nada ao servidor.
 */
export async function testarConexao(): Promise<void> {
  await fetchComConexao(`${url}/auth/v1/health`, { headers: { apikey: anonKey } }).catch(() => {})
}
