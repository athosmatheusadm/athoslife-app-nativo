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

  /**
   * Manda o e-mail de recuperação com um código numérico. Por código e não
   * por link: o app nativo não tem deep link de volta (detectSessionInUrl
   * desligado). O template "Reset Password" do Supabase precisa exibir
   * {{ .Token }} pra esse código aparecer no e-mail.
   */
  async pedirCodigoRecuperacao(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  },

  /** Valida o código (isso já abre sessão) e grava a senha nova. */
  async redefinirSenha(email: string, codigo: string, novaSenha: string): Promise<void> {
    const { error: erroCodigo } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'recovery',
    })
    if (erroCodigo) throw erroCodigo
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) throw error
  },

  async sair(): Promise<void> {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
