import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { IDIOMAS, NOMES_IDIOMA, type Idioma, type Unidades } from '@domain/rules/localidade'
import { localidadeAtualDoAparelho, useI18n } from '@/i18n/I18nProvider'

/**
 * Perfil > Idioma e região. Troca o idioma na hora (aparelho) e grava no
 * perfil — o Life e o servidor passam a responder no idioma novo. O fuso
 * acompanha o aparelho sempre que esta tela salva (viajou/mudou de país).
 */
export function IdiomaRegiao() {
  const navigate = useNavigate()
  const { profile, refresh } = useSession()
  const { m, idioma, trocarIdioma } = useI18n()
  const [unidades, setUnidades] = useState<Unidades>(profile?.localidade.unidades ?? 'metrico')
  const [erro, setErro] = useState(false)

  async function salvar(campos: { idioma?: Idioma; unidades?: Unidades }) {
    setErro(false)
    try {
      const aparelho = localidadeAtualDoAparelho()
      await profileRepository.atualizarLocalidade({ ...campos, fuso: aparelho.fuso })
      await refresh()
    } catch {
      setErro(true)
    }
  }

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label={m.comum.voltar} className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">{m.idioma.titulo}</h1>
      </header>

      <section className="mx-5 mt-2">
        <h2 className="mb-2 text-micro font-bold uppercase tracking-wide text-content-dim">{m.idioma.idioma}</h2>
        <div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
          {IDIOMAS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                trocarIdioma(i)
                void salvar({ idioma: i })
              }}
              className="flex w-full items-center justify-between border-b border-surface-4/50 px-4 py-3.5 text-left last:border-b-0"
            >
              <span className="text-sm text-content-hi">{NOMES_IDIOMA[i]}</span>
              {idioma === i && <span className="text-brand">✓</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-6">
        <h2 className="mb-2 text-micro font-bold uppercase tracking-wide text-content-dim">{m.idioma.unidades}</h2>
        <div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
          {(['metrico', 'imperial'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                setUnidades(u)
                void salvar({ unidades: u })
              }}
              className="flex w-full items-center justify-between border-b border-surface-4/50 px-4 py-3.5 text-left last:border-b-0"
            >
              <span className="text-sm text-content-hi">{u === 'metrico' ? m.idioma.metrico : m.idioma.imperial}</span>
              {unidades === u && <span className="text-brand">✓</span>}
            </button>
          ))}
        </div>
      </section>

      {erro && <p className="mx-5 mt-4 text-sm text-accent-danger">{m.comum.erroGenerico}</p>}
    </main>
  )
}
