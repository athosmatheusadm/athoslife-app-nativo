import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { diasRestantesTrial, temAcessoPremium } from '@domain/rules/access'
import {
  assinar,
  carregarPlanos,
  ErroAssinatura,
  gerenciarAssinatura,
  lojaDisponivel,
  meuNumeroFundador,
  restaurar,
  vagasFundador,
  type PlanoLoja,
  type ResultadoSync,
} from '@data/assinatura/revenuecat'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { avisar, vibrar } from '@ui/feedback'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Sub-página "Plano" do Perfil — status real (plano atual, contagem do
 * trial) e, quando a loja está configurada (RevenueCat com produtos), os
 * botões de assinar/restaurar. Sem loja (web, ou sem VITE_RC_GOOGLE_KEY, ou
 * sem produtos no RevenueCat) continua o aviso de "em breve" — mostrar um
 * botão que não compra nada seria fingir uma feature pronta.
 */
export function Plano() {
  const { profile, statusTeste, refresh } = useSession()
  const t = useI18n().m.perfil.plano
  const [planos, setPlanos] = useState<PlanoLoja[]>([])
  const [vagas, setVagas] = useState<number | null>(null)
  const [fundador, setFundador] = useState<number | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!lojaDisponivel()) return
    let ativo = true
    void Promise.all([carregarPlanos(), vagasFundador(), meuNumeroFundador()]).then(([p, v, f]) => {
      if (!ativo) return
      setPlanos(p)
      setVagas(v)
      setFundador(f)
    })
    return () => {
      ativo = false
    }
  }, [profile?.plano])

  if (!profile) return null

  const premium = temAcessoPremium(profile)
  const dias = diasRestantesTrial(profile)
  const nomePlano = t.nomes[profile.plano] ?? profile.plano
  const aviso = statusTeste && statusTeste in t.avisos ? t.avisos[statusTeste as keyof typeof t.avisos] : null
  const pago = profile.plano === 'premium' || profile.plano === 'fundador'
  const vende = planos.length > 0 && !pago && profile.plano !== 'vip' && profile.plano !== 'vitalicio'

  async function executar(acao: () => Promise<ResultadoSync>, ok: string) {
    if (ocupado) return
    setOcupado(true)
    try {
      const r = await acao()
      if (r.direito.fundador_numero) setFundador(r.direito.fundador_numero)
      await refresh()
      vibrar.sucesso()
      avisar.ok(ok)
    } catch (e) {
      const codigo = e instanceof ErroAssinatura ? e.codigo : 'generico'
      if (codigo !== 'cancelado') avisar.erro(t.loja.erros[codigo])
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <section className="mx-5 mt-2 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/[0.12] to-transparent p-5">
        <p className="text-micro font-bold uppercase tracking-wide text-brand">{t.seuPlano}</p>
        <p className="mt-1 text-2xl font-extrabold text-content-hi">{nomePlano}</p>
        {pago && fundador !== null && (
          <p className="mt-1 text-sm font-semibold text-brand">{t.loja.fundadorNumero(fundador)}</p>
        )}
        {profile.plano === 'trial' && dias !== null && (
          <p className="mt-1 text-sm text-content-low">{t.diasRestantes(dias)}</p>
        )}
        {!premium && (
          <p className="mt-1 text-sm text-content-low">{t.limitado}</p>
        )}
        {!premium && aviso && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-micro text-content-mid">{aviso}</p>}
      </section>

      <section className="mx-5 mt-5">
        <h2 className="mb-2 text-sm font-bold text-content-hi">{t.inclui}</h2>
        <ul className="space-y-2">
          {t.beneficios.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-content-mid">
              <span className="mt-0.5 flex-none text-brand">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </section>

      {vende && (
        <section className="mx-5 mt-6 space-y-3">
          {planos.map((p) => (
            <button
              key={p.plano}
              type="button"
              disabled={ocupado}
              onClick={() => void executar(() => assinar(p), t.loja.sucesso)}
              className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-surface-4 bg-surface-2 px-4 py-3 text-left active:scale-[0.98] disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-bold text-content-hi">{p.plano === 'anual' ? t.loja.anual : t.loja.mensal}</span>
                <span className="mt-0.5 block text-micro text-content-low">
                  {p.plano === 'anual' ? t.loja.porAno(p.preco) : t.loja.porMes(p.preco)}
                </span>
                {p.plano === 'anual' && vagas !== null && vagas > 0 && (
                  <span className="mt-1 block text-micro font-semibold text-brand">{t.loja.vagasFundador(vagas)}</span>
                )}
              </span>
              <span className="flex-none rounded-pill bg-brand px-4 py-2 text-sm font-bold text-brand-ink">{t.loja.assinar}</span>
            </button>
          ))}
        </section>
      )}

      {planos.length > 0 && (
        <div className="mx-5 mt-4 flex flex-col items-center gap-1">
          {pago && (
            <button type="button" onClick={() => void gerenciarAssinatura()} className="min-h-11 text-sm font-semibold text-brand">
              {t.loja.gerenciar}
            </button>
          )}
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void executar(restaurar, t.loja.restaurado)}
            className="min-h-11 text-sm text-content-low disabled:opacity-60"
          >
            {t.loja.restaurar}
          </button>
        </div>
      )}

      {!premium && planos.length === 0 && (
        <p className="mx-5 mt-6 rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-micro text-content-low">{t.emBreve}</p>
      )}
    </main>
  )
}
