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
          setAviso('Conta criada! Confirma seu email antes de entrar (verifica a caixa de entrada).')
          setCarregando(false)
        }
        // Se sessaoAtiva, o SessionProvider pega o evento e redireciona sozinho.
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível completar. Tenta de novo.')
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
            modo === 'entrar' ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => trocarModo('criar')}
          className={`flex-1 rounded-pill py-2.5 text-sm font-semibold transition-colors ${
            modo === 'criar' ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'
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
