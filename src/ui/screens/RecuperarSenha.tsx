import { SENHA_MINIMA } from './Login'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authRepository } from '@data/repositories/authRepository'
import { useI18n } from '@/i18n/I18nProvider'
import type { Mensagens } from '@/i18n/mensagens/tipo'

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
  'min-h-12 w-full rounded-card border border-surface-4 bg-surface-2 px-4 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none'

/** Erros do Supabase Auth vêm em inglês — traduz os que a pessoa pode ver aqui. */
function traduzirErro(err: unknown, t: Mensagens['entrar']['recuperar']['erros']): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (msg.includes('rate limit') || msg.includes('security purposes')) return t.muitas
  if (msg.includes('expired') || msg.includes('invalid') || msg.includes('otp')) return t.codigo
  if (msg.includes('should be different')) return t.igual
  if (msg.includes('password')) return t.fraca
  return t.geral
}

export function RecuperarSenha() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<Etapa>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { m } = useI18n()
  const t = m.entrar.recuperar

  async function pedirCodigo(e?: FormEvent) {
    e?.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      await authRepository.pedirCodigoRecuperacao(email.trim())
      setEtapa('codigo')
    } catch (err) {
      setErro(traduzirErro(err, t.erros))
    } finally {
      setCarregando(false)
    }
  }

  async function redefinir(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (senha.length < SENHA_MINIMA) {
      setErro(t.erros.fraca)
      return
    }
    setCarregando(true)
    try {
      await authRepository.redefinirSenha(email.trim(), codigo.trim(), senha)
      navigate('/home', { replace: true })
    } catch (err) {
      setErro(traduzirErro(err, t.erros))
      setCarregando(false)
    }
  }

  return (
    <main className="flex min-h-full flex-col justify-center animate-rise px-6 pt-safe-t">
      <h1 className="text-2xl font-bold text-content-hi">{t.titulo}</h1>

      {etapa === 'email' ? (
        <>
          <p className="mt-1 text-sm text-content-low">{t.lead}</p>
          <form onSubmit={(e) => void pedirCodigo(e)} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-micro font-semibold text-content-low">{m.entrar.email}</span>
              <input
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={CAMPO}
              />
            </label>
            {erro && <p role="alert" className="text-sm font-medium text-accent-danger">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="min-h-12 w-full rounded-pill bg-brand text-base font-bold text-surface-1 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {carregando ? t.enviando : t.enviar}
            </button>
          </form>
        </>
      ) : (
        <>
          {/* Mesma mensagem exista ou não a conta — não entrega quais e-mails são cadastrados. */}
          <p className="mt-1 text-sm text-content-low">{t.chegou(email.trim())}</p>
          <form onSubmit={(e) => void redefinir(e)} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-micro font-semibold text-content-low">{t.codigo}</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="[0-9]{6,10}"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                className={`${CAMPO} tracking-[0.3em]`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-micro font-semibold text-content-low">{t.senhaNova}</span>
              <input
                type="password"
                required
                minLength={SENHA_MINIMA}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={CAMPO}
              />
            </label>
            {erro && <p role="alert" className="text-sm font-medium text-accent-danger">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="min-h-12 w-full rounded-pill bg-brand text-base font-bold text-surface-1 transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {carregando ? t.salvando : t.salvar}
            </button>
            <button
              type="button"
              disabled={carregando}
              onClick={() => void pedirCodigo()}
              className="min-h-12 w-full text-sm font-medium text-content-mid disabled:opacity-60"
            >
              {t.outro}
            </button>
          </form>
        </>
      )}

      <Link to="/login" replace className="mx-auto mt-6 flex min-h-11 items-center px-3 text-sm font-medium text-content-mid">
        {t.voltarLogin}
      </Link>
    </main>
  )
}
