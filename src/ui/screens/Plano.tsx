import { useSession } from '@app/SessionProvider'
import { diasRestantesTrial, temAcessoPremium } from '@domain/rules/access'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Sub-página "Plano" do Perfil — status real (plano atual, contagem do
 * trial). Sem botão de assinar de verdade: Google Play Billing ainda não
 * está integrado (ver STATUS.md, "Ainda nem começamos") — mostrar um CTA
 * que não compra nada seria fingir uma feature pronta.
 */
export function Plano() {
  const { profile, statusTeste } = useSession()
  const t = useI18n().m.perfil.plano
  if (!profile) return null

  const premium = temAcessoPremium(profile)
  const dias = diasRestantesTrial(profile)
  const nomePlano = t.nomes[profile.plano] ?? profile.plano
  const aviso = statusTeste && statusTeste in t.avisos ? t.avisos[statusTeste as keyof typeof t.avisos] : null

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <section className="mx-5 mt-2 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/[0.12] to-transparent p-5">
        <p className="text-micro font-bold uppercase tracking-wide text-brand">{t.seuPlano}</p>
        <p className="mt-1 text-2xl font-extrabold text-content-hi">{nomePlano}</p>
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

      {!premium && (
        <p className="mx-5 mt-6 rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-micro text-content-low">{t.emBreve}</p>
      )}
    </main>
  )
}
