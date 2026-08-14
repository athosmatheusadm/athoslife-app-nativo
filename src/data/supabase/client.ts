import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { capacitorAuthStorage } from './storage'

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
export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    storage: capacitorAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
    // App nativo não tem callback de URL como a web.
    detectSessionInUrl: false,
  },
})
