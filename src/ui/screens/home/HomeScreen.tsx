import { useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { LifeChatSheet } from '@ui/screens/habits/LifeChatSheet'
import { TodayActivity } from './TodayActivity'
import { StreakCard } from './StreakCard'
import { MealCards } from './MealCards'
import { EmotionalCheckin } from './EmotionalCheckin'
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
  const [chatAberto, setChatAberto] = useState(false)
  if (!profile) return null

  return (
    <main className="space-y-4 px-4 pb-24 pt-safe-t">
      {/* Header: só a marca — o streak agora tem card próprio, mais abaixo. */}
      <header className="flex items-center justify-between pt-3">
        <h1 className="text-2xl font-bold text-content-hi">
          ATHOS<span className="font-semibold text-brand">life</span>
        </h1>
        <div className="flex items-center gap-2">
          {/* Life acessível de qualquer dia, não só de dentro de Hábitos. */}
          <button
            onClick={() => setChatAberto(true)}
            aria-label="Conversar com o Life"
            className="flex h-10 items-center gap-1.5 rounded-pill border border-brand/40 px-3 text-sm font-semibold text-brand"
          >
            💬 Life
          </button>
          <ProfileAvatar />
        </div>
      </header>

      <EmotionalCheckin />

      <TodayActivity metas={profile.metas} />

      <StreakCard streakAtual={profile.streakAtual} maiorStreak={profile.maiorStreak} />

      <MealCards
        onAbrir={(tipo: TipoRefeicao) => onNavigate(`/dieta?refeicao=${tipo}`)}
        onCriarNovaRefeicao={() => onNavigate('/dieta?novaExtra=1')}
      />

      <WeightCard />

      {chatAberto && <LifeChatSheet onFechar={() => setChatAberto(false)} />}
    </main>
  )
}
