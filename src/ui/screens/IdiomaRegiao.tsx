import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useId, useMemo, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { IDIOMAS, NOMES_IDIOMA, PAISES, unidadesDoPais, type Idioma, type Unidades } from '@domain/rules/localidade'
import { localidadeAtualDoAparelho, useI18n } from '@/i18n/I18nProvider'

/**
 * Perfil > Idioma e região. Troca o idioma na hora (aparelho) e grava no
 * perfil — o Life e o servidor passam a responder no idioma novo. O fuso
 * acompanha o aparelho sempre que esta tela salva (viajou/mudou de país).
 * Idioma e país são botões que abrem a lista (um brasileiro com o celular
 * em inglês escolhe Brasil aqui e continua com TACO, kg e o CVV).
 */
export function IdiomaRegiao() {
  const { profile, refresh } = useSession()
  const { m, idioma, trocarIdioma } = useI18n()
  const [unidades, setUnidades] = useState<Unidades>(profile?.localidade.unidades ?? 'metrico')
  const [pais, setPais] = useState<string | null>(profile?.localidade.pais ?? localidadeAtualDoAparelho().pais)
  const [aberto, setAberto] = useState<'idioma' | 'pais' | null>(null)
  const [erro, setErro] = useState(false)

  const nomesPais = useMemo(() => {
    let dn: Intl.DisplayNames | null = null
    try {
      dn = new Intl.DisplayNames([idioma], { type: 'region' })
    } catch {
      dn = null
    }
    return PAISES.map((p) => ({ codigo: p, nome: dn?.of(p) ?? p })).sort((a, b) => a.nome.localeCompare(b.nome, idioma))
  }, [idioma])
  const nomePais = (p: string | null) => (p ? (nomesPais.find((x) => x.codigo === p)?.nome ?? p) : m.idioma.paisNenhum)

  async function salvar(campos: { idioma?: Idioma; unidades?: Unidades; pais?: string }) {
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
      <CabecalhoSubpagina titulo={m.idioma.titulo} />

      <Seletor
        titulo={m.idioma.idioma}
        valor={NOMES_IDIOMA[idioma]}
        aberto={aberto === 'idioma'}
        alternar={() => setAberto(aberto === 'idioma' ? null : 'idioma')}
        opcoes={IDIOMAS.map((i) => ({ id: i, nome: NOMES_IDIOMA[i] }))}
        atual={idioma}
        escolher={(i) => {
          setAberto(null)
          trocarIdioma(i as Idioma)
          void salvar({ idioma: i as Idioma })
        }}
      />

      <Seletor
        titulo={m.idioma.pais}
        dica={m.idioma.paisDica}
        valor={nomePais(pais)}
        aberto={aberto === 'pais'}
        alternar={() => setAberto(aberto === 'pais' ? null : 'pais')}
        opcoes={nomesPais.map((p) => ({ id: p.codigo, nome: p.nome }))}
        atual={pais}
        escolher={(p) => {
          setAberto(null)
          setPais(p)
          // Ao trocar de país, as unidades seguem o costume de lá (dá pra mudar abaixo).
          const u = unidadesDoPais(p)
          setUnidades(u)
          void salvar({ pais: p, unidades: u })
        }}
      />

      <section className="mx-5 mt-6">
        <h2 className="mb-2 text-micro font-bold uppercase tracking-wide text-content-low">{m.idioma.unidades}</h2>
        <div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
          {(['metrico', 'imperial'] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                setUnidades(u)
                void salvar({ unidades: u })
              }}
              role="radio"
              aria-checked={unidades === u}
              className="flex min-h-14 w-full items-center justify-between border-b border-surface-4/50 px-4 text-left last:border-b-0 active:bg-content-hi/5"
            >
              <span className="text-sm text-content-hi">{u === 'metrico' ? m.idioma.metrico : m.idioma.imperial}</span>
              {unidades === u && <span className="text-brand" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      </section>

      {erro && <p className="mx-5 mt-4 text-sm text-accent-danger">{m.comum.erroGenerico}</p>}
    </main>
  )
}

/** Botão com o valor atual; tocar abre a lista logo abaixo. */
function Seletor({
  titulo,
  dica,
  valor,
  aberto,
  alternar,
  opcoes,
  atual,
  escolher,
}: {
  readonly titulo: string
  readonly dica?: string
  readonly valor: string
  readonly aberto: boolean
  readonly alternar: () => void
  readonly opcoes: readonly { id: string; nome: string }[]
  readonly atual: string | null
  readonly escolher: (id: string) => void
}) {
  const idLista = useId()
  return (
    <section className="mx-5 mt-6 first-of-type:mt-2">
      <h2 className="mb-2 text-micro font-bold uppercase tracking-wide text-content-low">{titulo}</h2>
      <div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls={idLista}
          className="flex min-h-14 w-full items-center justify-between px-4 text-left active:bg-content-hi/5"
        >
          <span className="text-sm font-semibold text-content-hi">{valor}</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`text-content-low transition-transform ${aberto ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {aberto && (
          <div id={idLista} role="radiogroup" aria-label={titulo} className="max-h-72 overflow-y-auto border-t border-surface-4/50 sem-barra">
            {opcoes.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => escolher(o.id)}
                role="radio"
                aria-checked={atual === o.id}
                className="flex min-h-12 w-full items-center justify-between border-b border-surface-4/50 px-4 text-left last:border-b-0 active:bg-content-hi/5"
              >
                <span className="text-sm text-content-hi">{o.nome}</span>
                {atual === o.id && <span className="text-brand" aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {dica && <p className="mt-2 px-1 text-xs text-content-low">{dica}</p>}
    </section>
  )
}
