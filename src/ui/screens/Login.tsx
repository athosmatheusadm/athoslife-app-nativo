import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authRepository } from '@data/repositories/authRepository'

/**
 * Login real (email + senha via Supabase Auth).
 *
 * Sem navegação manual pro /home: ao logar, o SessionProvider recebe o
 * evento onAuthStateChange, a sessão muda, e o RequireAnon (Guards.tsx)
 * reage sozinho e redireciona. Login só entra e espera.
 */
type Modo = 'entrar' | 'criar'

/** O Supabase devolve o erro em inglês e técnico — aqui vira algo que a pessoa entende. */
function mensagemErroAuth(err: unknown): string {
  const codigo = (err as { code?: string } | null)?.code ?? ''
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (codigo === 'over_email_send_rate_limit' || msg.includes('rate limit'))
    return 'Muitos e-mails enviados em pouco tempo. Espera uns minutos e tenta de novo.'
  if (codigo === 'email_not_confirmed' || msg.includes('not confirmed'))
    return 'Falta confirmar seu e-mail: abre o link que mandamos (olha também o spam).'
  if (codigo === 'invalid_credentials' || msg.includes('invalid login'))
    return 'E-mail ou senha incorretos.'
  if (codigo === 'email_address_invalid' || (msg.includes('email') && msg.includes('invalid')))
    return 'Esse e-mail não parece válido. Confere se não tem erro de digitação (ex.: gmail.com).'
  if (codigo === 'user_already_exists' || msg.includes('already registered'))
    return 'Já existe uma conta com esse e-mail. Entra com ela ou use "Esqueci a senha".'
  if (codigo === 'weak_password' || msg.includes('password should'))
    return 'Senha fraca: use pelo menos 6 caracteres.'
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return 'Sem conexão com o servidor. Confere a internet.'
  return 'Não foi possível completar. Tenta de novo.'
}

export function Login() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  function trocarModo(m: Modo) {
    setModo(m)
    setErro(null)
    setAviso(null)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    setCarregando(true)
    try {
      if (modo === 'entrar') {
        await authRepository.entrar(email, senha)
        // Sucesso: SessionProvider pega o evento e o Guards redireciona sozinho.
      } else {
        const { sessaoAtiva } = await authRepository.criarConta(email, senha)
        if (!sessaoAtiva) {
          // Sem sessão = o Supabase pede confirmação. Ele responde igual se o e-mail
          // já tinha conta (não revela quem está cadastrado), então o texto cobre os dois.
          setAviso(
            'Pronto! Mandamos um link pro seu e-mail — abre ele pra ativar a conta (olha também o spam). Se esse e-mail já tinha conta, é só entrar.',
          )
          setCarregando(false)
        }
        // Se sessaoAtiva, o SessionProvider pega o evento e redireciona sozinho.
      }
    } catch (err) {
      console.warn('auth:', err)
      setErro(mensagemErroAuth(err))
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-full flex-col justify-center animate-rise px-6 pt-safe-t">
      <h1 className="text-3xl font-bold text-content-hi">
        ATHOS<span className="text-brand">life</span>
      </h1>
      <p className="mt-1 text-sm text-content-low">
        {modo === 'entrar' ? 'Entre pra continuar.' : 'Cria sua conta pra começar.'}
      </p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => trocarModo('entrar')}
          className={`flex-1 rounded-pill py-2.5 text-sm font-semibold transition-colors ${
            modo === 'entrar' ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => trocarModo('criar')}
          className={`flex-1 rounded-pill py-2.5 text-sm font-semibold transition-colors ${
            modo === 'criar' ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
          }`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-card border border-surface-4 bg-surface-2 px-4 py-3.5 text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={modo === 'criar' ? 6 : undefined}
          autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder={modo === 'entrar' ? 'Senha' : 'Senha (mín. 6 caracteres)'}
          className="w-full rounded-card border border-surface-4 bg-surface-2 px-4 py-3.5 text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none"
        />

        {modo === 'entrar' && (
          <Link to="/recuperar-senha" className="block text-right text-sm font-medium text-content-mid">
            Esqueci a senha
          </Link>
        )}

        {erro && <p className="text-sm font-medium text-accent-danger">{erro}</p>}
        {aviso && <p className="text-sm font-medium text-brand">{aviso}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-surface-1 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {carregando
            ? modo === 'entrar' ? 'Entrando…' : 'Criando…'
            : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </main>
  )
}
