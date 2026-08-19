import { useSession } from '@app/SessionProvider'
import { TodayActivity } from './TodayActivity'
import { MealCards } from './MealCards'
import { EmotionalCheckin } from './EmotionalCheckin'
import { WaterCard } from '@ui/screens/water/WaterCard'
import { WeightCard } from '@ui/screens/weight/WeightCard'
import { ProfileAvatar } from '@ui/components/ProfileAvatar'
import type { TipoRefeicao } from '@data/repositories/refeicoesRepository'

/**
 * Home oficial — junta as peças reais que já construímos.
 *
 * Mantém o "jeitinho" do PWA (mesma estrutura e cores). O que é novo aqui
 * é só a organização; cada bloco (discos, refeições, água, peso) já é um
 * componente próprio ligado a dado real.
 *
 * onNavigate: leva para Dieta (refeição), registro de água/peso, etc.
 */
export function HomeScreen({ onNavigate }: { onNavigate: (rota: string) => void }) {
  const { profile } = useSession()
  if (!profile) return null

  const objetivoPerder = profile.metas.kcal > 0 // ajuste fino vem do objetivo real

  return (
    <main className="space-y-4 px-4 pb-24 pt-safe-t">
      {/* Header: marca + streak */}
      <header className="flex items-center justify-between pt-3">
        <h1 className="text-2xl font-bold text-content-hi">
          ATHOS<span className="font-semibold text-brand">life</span>
        </h1>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-pill border border-surface-4 bg-surface-2 px-3 py-1.5">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-bold text-content-hi">{profile.streakAtual}</span>
            <span className="text-micro text-content-low">dias</span>
          </span>
          <ProfileAvatar />
        </span>
      </header>

      <EmotionalCheckin />

      <TodayActivity metas={profile.metas} />

      <MealCards
        refeicoes={[]}
        onAbrir={(tipo: TipoRefeicao) => onNavigate(`/dieta?refeicao=${tipo}`)}
      />

      <WaterCard metaMl={profile.metas.aguaMl} />

      <WeightCard objetivoPerder={objetivoPerder} />
    </main>
  )
}
