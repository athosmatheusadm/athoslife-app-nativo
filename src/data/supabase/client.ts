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
 * fetch do Supabase com duas funções a mais:
 *  - conta pro app se há internet (conexao.ts), pelo resultado real de cada pedido;
 *  - corta pedidos ao banco (/rest/) que ficam pendurados em sinal ruim, pra
 *    a tela cair na cópia local em vez de girar pra sempre. IA e upload
 *    (functions, storage) não têm corte: demoram de propósito.
 */
const fetchComConexao: typeof fetch = async (entrada, init) => {
  const endereco = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url
  const cortar = endereco.includes('/rest/v1/')
  const controle = cortar ? new AbortController() : null
  const timer = controle ? setTimeout(() => controle.abort(), TEMPO_MAX_REST_MS) : null
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
