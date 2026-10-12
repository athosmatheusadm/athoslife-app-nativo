import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

/**
 * Sub-página "Metas" do Perfil — as metas diárias que alimentam os discos
 * da Home e a régua de macros da Dieta (`profile.metas`). Cada campo salva
 * sozinho ao sair do foco, mesmo padrão de Conta. No fim, as alergias e
 * restrições (antes só dava pra mudar no onboarding; o Life também grava
 * por lá quando a pessoa aceita no chat).
 */
export function Metas() {
  const { profile, refresh } = useSession()
  const { m } = useI18n()
  const t = m.perfil.metas

  if (!profile) return null
  const { metas } = profile

  /** Salva, avisa e recarrega o perfil — antes um erro passava calado. */
  const salvar = (acao: Promise<unknown>) =>
    acao
      .then(() => {
        vibrar.leve()
        avisar.ok(m.perfil.salvo)
        return refresh()
      })
      .catch(() => avisar.erro(m.perfil.erroSalvar))

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <p className="px-5 pb-4 text-sm text-content-low">
        {t.lead}
      </p>

      <div className="space-y-4 px-5">
        <CampoMeta
          rotulo={t.calorias}
          sufixo="kcal"
          valorInicial={metas.kcal}
          onSalvar={(v) => salvar(profileRepository.atualizarMeta('kcal_meta', v))}
        />
        <div className="grid grid-cols-3 gap-3">
          <CampoMeta
            rotulo={t.proteina}
            sufixo="g"
            valorInicial={metas.proteina}
            onSalvar={(v) => salvar(profileRepository.atualizarMeta('prot_meta', v))}
          />
          <CampoMeta
            rotulo={t.carbo}
            sufixo="g"
            valorInicial={metas.carboidrato}
            onSalvar={(v) => salvar(profileRepository.atualizarMeta('carbo_meta', v))}
          />
          <CampoMeta
            rotulo={t.gordura}
            sufixo="g"
            valorInicial={metas.gordura}
            onSalvar={(v) => salvar(profileRepository.atualizarMeta('gord_meta', v))}
          />
        </div>
        <CampoMeta
          rotulo={t.agua}
          sufixo="ml"
          valorInicial={metas.aguaMl}
          onSalvar={(v) => salvar(profileRepository.atualizarMetaAgua(v))}
        />
        <CampoMeta
          rotulo={t.passos}
          sufixo={t.passosDia}
          valorInicial={metas.passos}
          onSalvar={(v) => salvar(profileRepository.atualizarMeta('passos_meta', v))}
        />
      </div>

      <Restricoes />
    </main>
  )
}

function CampoMeta(props: {
  rotulo: string
  sufixo: string
  valorInicial: number
  onSalvar: (valor: number) => unknown
}) {
  const [valor, setValor] = useState(String(props.valorInicial))
  const id = `meta-${props.rotulo}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-micro font-bold uppercase tracking-wide text-content-low">
        {props.rotulo}
      </label>
      <div className="flex min-h-12 items-center gap-2 rounded-xl border border-surface-4 bg-surface-2 px-3.5 focus-within:border-brand">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={() => {
            const numero = Number(valor)
            if (Number.isNaN(numero) || numero <= 0) {
              setValor(String(props.valorInicial))
              return
            }
            if (numero !== props.valorInicial) props.onSalvar(numero)
          }}
          className="min-w-0 w-full bg-transparent text-base font-semibold tabular-nums text-content-hi focus:outline-none"
        />
        <span className="flex-none text-micro text-content-low">{props.sufixo}</span>
      </div>
    </div>
  )
}

/** Alergias e restrições: toque no × tira, sugestão ou campo adiciona — salva na hora. */
function Restricoes() {
  const { m } = useI18n()
  const t = m.perfil.metas
  const [itens, setItens] = useState<string[] | null>(null)
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    void profileRepository
      .restricoes()
      .then((r) => vivo && setItens(r))
      .catch(() => vivo && setItens([]))
    return () => {
      vivo = false
    }
  }, [])

  async function mudar(novos: string[]) {
    if (!itens || salvando) return
    const antes = itens
    setItens(novos)
    setSalvando(true)
    try {
      await profileRepository.atualizarRestricoes(novos)
      vibrar.leve()
      avisar.ok(m.perfil.salvo)
    } catch {
      setItens(antes)
      avisar.erro(m.perfil.erroSalvar)
    } finally {
      setSalvando(false)
    }
  }

  function adicionar(valor: string) {
    const v = valor.trim().slice(0, 40)
    if (!itens || !v) return
    setTexto('')
    if (itens.some((x) => x.toLowerCase() === v.toLowerCase())) return
    void mudar([...itens, v].slice(0, 20))
  }

  if (!itens) return null
  const sugestoes = t.restricoesSugestoes.filter((s) => !itens.some((x) => x.toLowerCase() === s.toLowerCase()))

  return (
    <section className="mt-8 px-5" aria-labelledby="restricoes-titulo">
      <h2 id="restricoes-titulo" className="mb-1 text-micro font-bold uppercase tracking-wide text-content-low">
        {t.restricoesTitulo}
      </h2>
      <p className="mb-3 text-sm text-content-low">{t.restricoesLead}</p>

      {itens.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {itens.map((x) => (
            <li
              key={x}
              className="flex min-h-11 items-center gap-1 rounded-xl border border-surface-4 bg-surface-2 pl-3.5 pr-1 text-sm font-semibold text-content-hi"
            >
              {x}
              <button
                type="button"
                aria-label={`${m.comum.remover} ${x}`}
                disabled={salvando}
                onClick={() => void mudar(itens.filter((i) => i !== x))}
                className="flex h-11 w-10 items-center justify-center text-lg text-content-low active:opacity-70 disabled:opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          adicionar(texto)
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t.restricoesPlaceholder}
          aria-label={t.restricoesTitulo}
          maxLength={40}
          enterKeyHint="done"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-surface-4 bg-surface-2 px-3.5 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
        />
        <button
          type="submit"
          disabled={salvando || !texto.trim()}
          className="min-h-12 flex-none rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink active:scale-[0.98] disabled:opacity-40"
        >
          {m.comum.adicionar}
        </button>
      </form>

      {sugestoes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              disabled={salvando}
              onClick={() => adicionar(s)}
              className="min-h-11 rounded-full border border-surface-4 px-3.5 text-sm text-content-mid active:scale-[0.98] disabled:opacity-40"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
