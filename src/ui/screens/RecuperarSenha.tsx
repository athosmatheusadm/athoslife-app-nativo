import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authRepository } from '@data/repositories/authRepository'

/**
 * Esqueci a senha — em duas etapas, por código de e-mail (não por link):
 *   1) pessoa informa o e-mail -> Supabase manda o código
 *   2) pessoa digita código + senha nova -> valida e grava
 *
 * Fica fora do RequireAnon de propósito: validar o código já abre a sessão,
 * e o guard mandaria a pessoa pra /home antes da senha nova ser gravada.
 * Aqui a navegação pra /home só acontece depois do updateUser dar certo.
 */
type Etapa = 'email' | 'codigo'

const CAMPO =
  'w-full rounded-card border border-surface-4 bg-surface-2 px-4 py-3.5 text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none'

/** Erros do Supabase Auth vêm em inglês — traduz os que a pessoa pode ver aqui. */
function traduzirErro(err: unknown): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (msg.includes('rate limit') || msg.includes('security purposes')) {
    return 'Muitas tentativas seguidas. Espera alguns minutos e tenta de novo.'
  }
  if (msg.includes('expired') || msg.includes('invalid') || msg.includes('otp')) {
    return 'Código inválido ou expirado. Confere o e-mail ou pede um novo.'
  }
  if (msg.includes('should be different')) {
    return 'A senha nova precisa ser diferente da antiga.'
  }
  if (msg.includes('password')) {
    return 'Senha fraca demais. Usa pelo menos 6 caracteres.'
  }
  return 'Não foi possível completar. Tenta de novo.'
}

export function RecuperarSenha() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<Etapa>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function pedirCodigo(e?: FormEvent) {
    e?.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await authRepository.pedirCodigoRecuperacao(email.trim())
      setEtapa('codigo')
    } catch (err) {
      setErro(traduzirErro(err))
    } finally {
      setCarregando(false)
    }
  }

  async function redefinir(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await authRepository.redefinirSenha(email.trim(), codigo.trim(), senha)
      navigate('/home', { replace: true })
    } catch (err) {
      setErro(traduzirErro(err))
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-full flex-col justify-center animate-rise px-6 pt-safe-t">
      <h1 className="text-2xl font-bold text-content-hi">Esqueci a senha</h1>

      {etapa === 'email' ? (
        <>
          <p className="mt-1 text-sm text-content-low">
            Informa o e-mail da conta. A gente manda um código pra você criar uma senha nova.
          </p>
          <form onSubmit={(e) => void pedirCodigo(e)} className="mt-6 space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={CAMPO}
            />
            {erro && <p className="text-sm font-medium text-accent-danger">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-surface-1 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {carregando ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Mesma mensagem exista ou não a conta — não entrega quais e-mails são cadastrados. */}
          <p className="mt-1 text-sm text-content-low">
            Se existir uma conta com <span className="text-content-hi">{email.trim()}</span>, o
            código chegou no e-mail. Confere também o spam.
          </p>
          <form onSubmit={(e) => void redefinir(e)} className="mt-6 space-y-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern="[0-9]{6,10}"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              placeholder="Código do e-mail"
              className={`${CAMPO} tracking-[0.3em]`}
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha nova (mín. 6 caracteres)"
              className={CAMPO}
            />
            {erro && <p className="text-sm font-medium text-accent-danger">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-surface-1 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {carregando ? 'Salvando…' : 'Salvar senha nova'}
            </button>
            <button
              type="button"
              disabled={carregando}
              onClick={() => void pedirCodigo()}
              className="w-full py-2 text-sm font-medium text-content-mid disabled:opacity-60"
            >
              Não chegou? Mandar outro código
            </button>
          </form>
        </>
      )}

      <Link to="/login" replace className="mt-6 text-center text-sm font-medium text-content-mid">
        Voltar pro login
      </Link>
    </main>
  )
}
