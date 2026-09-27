import { SettingsRow } from '@ui/components/SettingsRow'
import { Chevron } from '@ui/components/Chevron'
import { useSession } from '@app/SessionProvider'
import { diasRestantesTrial, temAcessoPremium } from '@domain/rules/access'

/**
 * Tela de Perfil — lista de Ajustes no padrão validado (estilo WhatsApp).
 * A navegação para sub-páginas é feita pelo router (slide-in por transform),
 * então aqui a tela só declara as linhas e para onde cada uma leva.
 */
export function ProfileScreen({
  onNavigate,
  onSair,
}: {
  onNavigate: (rota: string) => void
  onSair: () => void
}) {
  const { profile } = useSession()
  if (!profile) return null

  const premium = temAcessoPremium(profile)
  const dias = diasRestantesTrial(profile)

  const statusPlano = premium
    ? profile.plano === 'trial' && dias !== null
      ? `Teste grátis · ${dias} ${dias === 1 ? 'dia' : 'dias'}`
      : 'Premium'
    : 'Grátis'

  const inicial = (profile.nome ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <main className="pt-safe-t">
      <header className="flex items-center gap-4 px-5 pb-2 pt-3">
        <h1 className="text-xl font-bold text-content-hi">Perfil</h1>
      </header>

      <section className="flex items-center gap-3.5 px-5 pb-5 pt-2">
        <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-dark text-2xl font-bold text-[#04120a] ring-2 ring-brand/35">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            inicial
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-lg font-bold text-content-hi">
            {profile.nome ?? 'Você'}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-micro text-content-low">
            <span className="rounded-pill border border-brand/25 bg-brand/[0.14] px-2.5 py-0.5 font-semibold text-[#6ee7a3]">
              {statusPlano}
            </span>
            {profile.streakAtual > 0 && (
              <span className="font-semibold text-accent-energy">
                🔥 {profile.streakAtual} {profile.streakAtual === 1 ? 'dia' : 'dias'}
              </span>
            )}
          </span>
        </span>
      </section>

      <nav>
        <SettingsRow
          icon={<IconConquistas />}
          title="Conquistas"
          subtitle="Veja tudo que você já desbloqueou"
          trailing={<Chevron />}
          onClick={() => onNavigate('/perfil/conquistas')}
        />
        <div className="mx-5 my-2 h-px bg-surface-4/50" />
        <SettingsRow icon={<IconConta />} title="Conta" subtitle="Nome, e-mail e foto de perfil" trailing={<Chevron />} onClick={() => onNavigate('/perfil/conta')} />
        <SettingsRow icon={<IconMetas />} title="Metas" subtitle="Calorias, macros, água e peso alvo" trailing={<Chevron />} onClick={() => onNavigate('/perfil/metas')} />
        <SettingsRow icon={<IconPlano />} title="Plano" subtitle="Sua assinatura e benefícios" trailing={<><span className="mr-2 text-micro font-semibold text-accent-gold">{premium ? 'Premium' : 'Grátis'}</span><Chevron /></>} onClick={() => onNavigate('/perfil/plano')} />
        <SettingsRow icon={<IconPriv />} title="Privacidade e dados" subtitle="Consentimento, exportar ou excluir seus dados" trailing={<Chevron />} onClick={() => onNavigate('/perfil/privacidade')} />
        <SettingsRow icon={<IconNotif />} title="Notificações" subtitle="Lembretes, modo resgate e WhatsApp" trailing={<Chevron />} onClick={() => onNavigate('/perfil/notificacoes')} />
        <SettingsRow icon={<IconAcess />} title="Acessibilidade" subtitle="Contraste, animações e tamanho do texto" trailing={<Chevron />} onClick={() => onNavigate('/perfil/acessibilidade')} />
        <SettingsRow icon={<IconSobre />} title="Sobre" subtitle="Termos, política de privacidade e suporte" trailing={<Chevron />} onClick={() => onNavigate('/perfil/sobre')} />

        <div className="mx-5 my-2 h-px bg-surface-4/50" />

        <SettingsRow icon={<IconSair />} title="Sair da conta" danger onClick={onSair} />
      </nav>

      <p className="px-5 py-5 text-center text-micro text-content-dim opacity-70">
        ATHOSlife · versão 1.0
      </p>
    </main>
  )
}

const s = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const IconConquistas = () => (<svg {...s}><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /></svg>)
const IconConta = () => (<svg {...s}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>)
const IconMetas = () => (<svg {...s}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /></svg>)
const IconPlano = () => (<svg {...s}><path d="M3 7l3 12h12l3-12-5 4-4-6-4 6-5-4z" /></svg>)
const IconPriv = () => (<svg {...s}><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>)
const IconNotif = () => (<svg {...s}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></svg>)
const IconAcess = () => (<svg {...s}><circle cx="12" cy="4.5" r="1.8" /><path d="M4 8h16M12 8v7M12 15l-3 6M12 15l3 6" /></svg>)
const IconSobre = () => (<svg {...s}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>)
const IconSair = () => (<svg {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>)
