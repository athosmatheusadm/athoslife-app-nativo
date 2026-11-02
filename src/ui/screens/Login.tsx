import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authRepository } from '@data/repositories/authRepository'
import { useI18n } from '@/i18n/I18nProvider'
import type { Mensagens } from '@/i18n/mensagens/tipo'

/**
 * Login real (email + senha via Supabase Auth).
 *
 * Sem navegação manual pro /home: ao logar, o SessionProvider recebe o
 * evento onAuthStateChange, a sessão muda, e o RequireAnon (Guards.tsx)
 * reage sozinho e redireciona. Login só entra e espera.
 */
type Modo = 'entrar' | 'criar'

/** O Supabase devolve o erro em inglês e técnico — aqui vira algo que a pessoa entende. */
function mensagemErroAuth(err: unknown, t: Mensagens['entrar']['erros']): string {
  const codigo = (err as { code?: string } | null)?.code ?? ''
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (codigo === 'over_email_send_rate_limit' || msg.includes('rate limit')) return t.muitos
  if (codigo === 'email_not_confirmed' || msg.includes('not confirmed')) return t.confirmar
  if (codigo === 'invalid_credentials' || msg.includes('invalid login')) return t.credenciais
  if (codigo === 'email_address_invalid' || (msg.includes('email') && msg.includes('invalid'))) return t.emailInvalido
  if (codigo === 'user_already_exists' || msg.includes('already registered')) return t.jaExiste
  if (codigo === 'weak_password' || msg.includes('password should')) return t.fraca
  if (msg.includes('failed to fetch') || msg.includes('network')) return t.rede
  return t.geral
}

export const SENHA_MINIMA = 8

export function Login() {
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const { m } = useI18n()
  const t = m.entrar

  function trocarModo(novo: Modo) {
    setModo(novo)
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
        // Mínimo 8 no app (relatório do APK); o Supabase também precisa estar em 8.
        if (senha.length < SENHA_MINIMA) {
          setErro(t.erros.fraca)
          setCarregando(false)
          return
        }
        const { sessaoAtiva } = await authRepository.criarConta(email, senha)
        if (!sessaoAtiva) {
          // Sem sessão = o Supabase pede confirmação. Ele responde igual se o e-mail
          // já tinha conta (não revela quem está cadastrado), então o texto cobre os dois.
          setAviso(t.criada)
          setCarregando(false)
        }
        // Se sessaoAtiva, o SessionProvider pega o evento e redireciona sozinho.
      }
    } catch (err) {
      console.warn('auth:', err)
      setErro(mensagemErroAuth(err, t.erros))
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-full flex-col justify-center animate-rise px-6 pt-safe-t">
      <h1 className="text-3xl font-bold text-content-hi">
        ATHOS<span className="text-brand">life</span>
      </h1>
      <p className="mt-1 text-sm text-content-low">{modo === 'entrar' ? t.leadEntrar : t.leadCriar}</p>

      <div className="mt-6 flex gap-2" role="tablist">
        {(['entrar', 'criar'] as const).map((md) => (
          <button
            key={md}
            type="button"
            role="tab"
            aria-selected={modo === md}
            onClick={() => trocarModo(md)}
            className={`min-h-12 flex-1 rounded-pill text-sm font-semibold transition-colors active:scale-[0.98] ${
              modo === md ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
            }`}
          >
            {md === 'entrar' ? t.entrar : t.criar}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-1 block text-micro font-semibold text-content-low">{t.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            enterKeyHint="next"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 w-full rounded-card border border-surface-4 bg-surface-2 px-4 text-base text-content-hi focus:border-brand focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-micro font-semibold text-content-low">{modo === 'entrar' ? t.senha : t.senhaNova}</span>
          <span className="flex min-h-12 items-center rounded-card border border-surface-4 bg-surface-2 focus-within:border-brand">
            <input
              type={verSenha ? 'text' : 'password'}
              required
              minLength={modo === 'criar' ? SENHA_MINIMA : undefined}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
              enterKeyHint="go"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="min-h-12 min-w-0 flex-1 bg-transparent pl-4 text-base text-content-hi focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? t.esconder : t.mostrar}
              aria-pressed={verSenha}
              className="flex h-12 w-12 flex-none items-center justify-center text-content-low active:text-content-hi"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {verSenha && <path d="M3 3l18 18" />}
              </svg>
            </button>
          </span>
        </label>

        {modo === 'entrar' && (
          <div className="flex justify-end">
            <Link to="/recuperar-senha" className="-mr-2 flex min-h-11 items-center px-2 text-sm font-medium text-content-mid active:text-content-hi">
              {t.esqueci}
            </Link>
          </div>
        )}

        {erro && <p role="alert" className="text-sm font-medium text-accent-danger">{erro}</p>}
        {aviso && <p role="status" className="text-sm font-medium text-brand">{aviso}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="min-h-12 w-full rounded-pill bg-brand text-base font-bold text-surface-1 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {carregando ? (modo === 'entrar' ? t.entrando : t.criando) : modo === 'entrar' ? t.entrar : t.criar}
        </button>
      </form>
    </main>
  )
}
