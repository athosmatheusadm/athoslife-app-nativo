import { useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { primeiroAcessoDoDiaNaHome } from '@app/ausencia'
import { dataLocalISO } from '@domain/rules/datas'
import { LifeFlutuante } from '@ui/components/life/LifeFlutuante'
import { TodayActivity } from './TodayActivity'
import { StreakCard } from './StreakCard'
import { MealCards } from './MealCards'
import { EmotionalCheckin } from './EmotionalCheckin'
import { LifeSaudacao } from './LifeSaudacao'
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
  // Lido uma vez por montagem: no 1º acesso do dia o Life fica no topo.
  const [lifeNoTopo] = useState(() => primeiroAcessoDoDiaNaHome(dataLocalISO()))
  if (!profile) return null

  return (
    <main className="space-y-4 px-4 pb-28 pt-safe-t">
      {/* Header: só a marca — o streak agora tem card próprio, mais abaixo. */}
      <header className="flex items-center justify-between pt-3">
        <h1 className="text-2xl font-bold text-content-hi">
          ATHOS<span className="font-semibold text-brand">life</span>
        </h1>
        <ProfileAvatar />
      </header>

      {lifeNoTopo && <LifeSaudacao />}

      <EmotionalCheckin />

      <TodayActivity metas={profile.metas} />

      <StreakCard streakAtual={profile.streakAtual} maiorStreak={profile.maiorStreak} />

      <MealCards
        onAbrir={(tipo: TipoRefeicao) => onNavigate(`/dieta?refeicao=${tipo}`)}
        onAbrirExtra={(id) => onNavigate(`/dieta?refeicao=${encodeURIComponent(id)}`)}
        onCriarNovaRefeicao={() => onNavigate('/dieta?novaExtra=1')}
        onVerTodas={() => onNavigate('/dieta')}
      />

      <WeightCard />

      {/* O Life da Home junta tudo; fora do 1º acesso do dia, fica no canto.
          No 1º acesso ele está grande no topo e só vem pro canto depois que
          a saudação sai de vista. */}
      <LifeFlutuante humor="normal" foco="home" aparecerDepoisDe={lifeNoTopo ? 320 : 0} />
    </main>
  )
}
