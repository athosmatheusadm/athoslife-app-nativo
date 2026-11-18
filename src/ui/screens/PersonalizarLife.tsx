import { useEffect, useState } from 'react'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { LifeMascote, type AcessorioLife, type CorLife } from '@ui/components/LifeMascote'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { meuNumeroFundador } from '@data/assinatura/revenuecat'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Perfil → Personalizar o Life (dono, 18/11/2026): a pessoa escolhe a cor do
 * Life (Home e o Life de cada tela). Verde, amarelo e rosa clarinho pra todo
 * mundo; pérola e auréola só pro Fundador (o banco também confere).
 *
 * As amostras são a cor da pele do Life no motor animado (foco.html), não
 * cores de interface — por isso ficam fora dos tokens.
 */
const CORES: readonly { valor: CorLife | null; chave: 'verde' | CorLife; amostra: string; fundador?: true }[] = [
  { valor: null, chave: 'verde', amostra: '#7ED957' },
  { valor: 'amarelo', chave: 'amarelo', amostra: '#F5E6A3' },
  { valor: 'rosa', chave: 'rosa', amostra: '#F6C9D8' },
  { valor: 'perola', chave: 'perola', amostra: '#F2EEE6', fundador: true },
]

export function PersonalizarLife() {
  const { profile, refresh } = useSession()
  const t = useI18n().m.perfil.lifeVisual
  const [cor, setCor] = useState<CorLife | null>(profile?.lifeCor ?? null)
  const [acessorio, setAcessorio] = useState<AcessorioLife | null>(profile?.lifeAcessorio ?? null)
  const [fundador, setFundador] = useState(false)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    void meuNumeroFundador().then((n) => setFundador(n !== null)).catch(() => setFundador(false))
  }, [])

  async function salvar(novaCor: CorLife | null, novoAcessorio: AcessorioLife | null) {
    const antes = { cor, acessorio }
    setCor(novaCor)
    setAcessorio(novoAcessorio)
    setErro(false)
    try {
      await profileRepository.atualizarVisualLife(novaCor, novoAcessorio)
      await refresh()
    } catch {
      setCor(antes.cor)
      setAcessorio(antes.acessorio)
      setErro(true)
    }
  }

  const opcao = (ativo: boolean) =>
    `flex min-h-16 flex-1 flex-col items-center justify-center rounded-xl border px-1 text-sm font-semibold transition-colors active:scale-[0.98] disabled:opacity-40 ${
      ativo ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
    }`

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <section className="flex flex-col items-center px-5 pt-2 text-center">
        <LifeMascote humor="normal" cor={cor ?? undefined} acessorio={acessorio ?? undefined} alt="" className="h-40" />
        <p className="mt-3 text-sm text-content-low">{t.intro}</p>
      </section>

      <section className="mx-5 mt-6">
        <h2 className="mb-2 text-sm font-bold text-content-hi">{t.cor}</h2>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label={t.cor}>
          {CORES.map((op) => (
            <button
              key={op.chave}
              type="button"
              role="radio"
              aria-checked={cor === op.valor}
              disabled={op.fundador && !fundador}
              onClick={() => void salvar(op.valor, acessorio)}
              className={opcao(cor === op.valor)}
            >
              <span className="h-6 w-6 rounded-full border border-content-dim/40" style={{ backgroundColor: op.amostra }} aria-hidden="true" />
              <span className="mt-1 block text-micro">{t.cores[op.chave]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-6">
        <h2 className="mb-2 text-sm font-bold text-content-hi">{t.acessorio}</h2>
        <div className="flex gap-2" role="radiogroup" aria-label={t.acessorio}>
          <button type="button" role="radio" aria-checked={acessorio === null} onClick={() => void salvar(cor, null)} className={opcao(acessorio === null)}>
            <span className="block text-micro">{t.nenhum}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={acessorio === 'aureola'}
            disabled={!fundador}
            onClick={() => void salvar(cor, 'aureola')}
            className={opcao(acessorio === 'aureola')}
          >
            <span className="block text-micro">{t.aureola}</span>
          </button>
        </div>
        {!fundador && <p className="mt-2 text-micro text-content-low">{t.soFundador}</p>}
        {erro && <p role="alert" className="mt-2 text-micro text-accent-danger">{t.erro}</p>}
      </section>
    </main>
  )
}
