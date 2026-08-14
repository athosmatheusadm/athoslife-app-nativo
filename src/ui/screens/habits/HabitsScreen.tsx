import { useState } from 'react'
import { HabitCard } from './HabitCard'
import { CravingAssistant } from './CravingAssistant'
import type { CaminhoVontade, Habito } from '@domain/entities/habito'

/**
 * Tela "Meus Hábitos".
 *
 * Fiel ao print do usuário, com a voz recalibrada (adulto, sério, peso sem
 * punição). Cards em destaque, insight da IA, adicionar hábito. O
 * "Estou com vontade" abre o assistente que sobe e escurece o resto.
 *
 * A tela-mãe guarda qual hábito acionou o assistente.
 */
export function HabitsScreen(props: {
  habitos: readonly Habito[]
  maiorStreak: number
  insightIA: string | null
  onRegistrarTropeco: (habitoId: string) => void
  onEscolherCaminho: (habitoId: string, caminho: CaminhoVontade) => void
  onAdicionar: () => void
  onAbrirChat: () => void
}) {
  const { habitos, maiorStreak } = props
  const [vontadeDe, setVontadeDe] = useState<Habito | null>(null)

  return (
    <main className="space-y-4 px-4 pb-24 pt-safe-t">
      {/* Header com streak geral */}
      <header className="pt-3">
        <div className="text-micro font-bold uppercase tracking-[3px] text-brand">Athos</div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h1 className="text-2xl font-extrabold text-content-hi">Meus Hábitos</h1>
        </div>
        {maiorStreak > 0 && (
          <p className="mt-1 text-sm text-content-low">
            Você está firme há {maiorStreak} {maiorStreak === 1 ? 'dia' : 'dias'} 🔥
          </p>
        )}
      </header>

      {/* Cards */}
      <div className="space-y-3">
        {habitos.map((h) => (
          <HabitCard
            key={h.id}
            habito={h}
            onEstouComVontade={() => setVontadeDe(h)}
            onTropeco={() => props.onRegistrarTropeco(h.id)}
          />
        ))}
      </div>

      {/* Insight da IA */}
      {props.insightIA && (
        <button
          onClick={props.onAbrirChat}
          className="w-full rounded-2xl border border-accent-water/25 bg-accent-water/[0.08] p-4 text-left"
        >
          <div className="text-micro font-bold uppercase tracking-wide text-accent-water">
            💡 Insight do Life para você
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-content-mid">
            {props.insightIA}
          </p>
        </button>
      )}

      {/* Adicionar novo hábito */}
      <button
        onClick={props.onAdicionar}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand/40 p-4 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-surface-3 text-2xl text-brand">+</span>
        <span>
          <span className="block font-semibold text-content-hi">Acompanhar novo hábito</span>
          <span className="block text-micro text-content-low">Açúcar, refrigerante, álcool e mais…</span>
        </span>
      </button>

      {/* Assistente da vontade — sobe e escurece o resto */}
      {vontadeDe && (
        <CravingAssistant
          habito={vontadeDe}
          onEscolher={(c) => {
            props.onEscolherCaminho(vontadeDe.id, c)
            setVontadeDe(null)
          }}
          onFechar={() => setVontadeDe(null)}
        />
      )}
    </main>
  )
}
