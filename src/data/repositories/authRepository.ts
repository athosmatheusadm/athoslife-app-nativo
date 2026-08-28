import { supabase } from '@data/supabase/client'

/**
 * Único ponto do app que conhece `supabase.auth`.
 * Login e logout passam sempre por aqui — a UI nunca chama o cliente direto.
 */
export const authRepository = {
  async entrar(email: string, senha: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
  },

  /**
   * Cria a conta no Supabase Auth. Retorna se já veio com sessão ativa
   * (confirmação de email desligada no projeto) ou se falta confirmar
   * o email antes de conseguir entrar.
   */
  async criarConta(email: string, senha: string): Promise<{ sessaoAtiva: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password: senha })
    if (error) throw error
    return { sessaoAtiva: data.session !== null }
  },

  async sair(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
