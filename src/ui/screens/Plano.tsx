import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { diasRestantesTrial, temAcessoPremium } from '@domain/rules/access'

const NOME_PLANO: Record<string, string> = {
  trial: 'Teste grátis',
  free: 'Grátis',
  premium: 'Premium',
  fundador: 'Fundador',
  vitalicio: 'Vitalício',
  vip: 'VIP',
}

const BENEFICIOS = [
  'Scanner de comida por IA sem limite diário',
  'Chat com a Life sem limite diário',
  'Cozinha ATHOS completa (todas as receitas)',
  'Catálogo de treino completo',
]

/**
 * Sub-página "Plano" do Perfil — status real (plano atual, contagem do
 * trial). Sem botão de assinar de verdade: Google Play Billing ainda não
 * está integrado (ver STATUS.md, "Ainda nem começamos") — mostrar um CTA
 * que não compra nada seria fingir uma feature pronta.
 */
export function Plano() {
  const navigate = useNavigate()
  const { profile } = useSession()
  if (!profile) return null

  const premium = temAcessoPremium(profile)
  const dias = diasRestantesTrial(profile)
  const nomePlano = NOME_PLANO[profile.plano] ?? profile.plano

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">Plano</h1>
      </header>

      <section className="mx-5 mt-2 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/[0.12] to-transparent p-5">
        <p className="text-micro font-bold uppercase tracking-wide text-brand">Seu plano</p>
        <p className="mt-1 text-2xl font-extrabold text-content-hi">{nomePlano}</p>
        {profile.plano === 'trial' && dias !== null && (
          <p className="mt-1 text-sm text-content-low">
            {dias} {dias === 1 ? 'dia restante' : 'dias restantes'} de acesso completo
          </p>
        )}
        {!premium && (
          <p className="mt-1 text-sm text-content-low">
            Acesso limitado — sem scanner/chat sem limite, receitas e treinos premium bloqueados.
          </p>
        )}
      </section>

      <section className="mx-5 mt-5">
        <h2 className="mb-2 text-sm font-bold text-content-hi">O que o Premium inclui</h2>
        <ul className="space-y-2">
          {BENEFICIOS.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-content-mid">
              <span className="mt-0.5 flex-none text-brand">✓</span>
              {b}
            </li>
          ))}
        </ul>
      </section>

      {!premium && (
        <p className="mx-5 mt-6 rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-micro text-content-dim">
          Assinatura pela Play Store chega em breve — ainda não está pronta pra vender de verdade.
        </p>
      )}
    </main>
  )
}
