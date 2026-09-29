import { useState } from 'react'
import { ProfileAvatar } from '@ui/components/ProfileAvatar'
import { HabitCard } from './HabitCard'
import { CravingAssistant } from './CravingAssistant'
import { AddHabitSheet } from './AddHabitSheet'
import { LifeChatSheet } from './LifeChatSheet'
import { LifeMascote } from '@ui/components/LifeMascote'
import { useI18n } from '@/i18n/I18nProvider'
import {
  corTermometro,
  nivelBemEstar,
  statusHabito,
  type Habito,
  type IntensidadeHabito,
} from '@domain/entities/habito'

/**
 * Tela "Meus Hábitos".
 *
 * Fiel ao print do usuário, com a voz recalibrada (adulto, sério, peso sem
 * punição). Cards em destaque, o Life como termômetro do estado geral,
 * adicionar hábito. O "Estou com vontade" abre o assistente que sobe e
 * escurece o resto.
 *
 * A tela-mãe guarda qual hábito acionou o assistente e se o chat do Life
 * está aberto.
 */
export function HabitsScreen(props: {
  habitos: readonly Habito[]
  maiorStreak: number
  insightIA: string | null
  onRegistrarTropeco: (habitoId: string) => void
  onRegistrarCheckin: (habitoId: string) => void
  onExcluirHabito: (habitoId: string) => Promise<void>
  onCriarHabito: (params: {
    nome: string
    categoria: string | null
    intensidade: IntensidadeHabito
  }) => Promise<void>
}) {
  const { habitos, maiorStreak } = props
  const [vontadeDe, setVontadeDe] = useState<Habito | null>(null)
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false)
  const [chatAberto, setChatAberto] = useState(false)
  const { m } = useI18n()

  const nivel = nivelBemEstar(habitos)
  const corLife = corTermometro(nivel)

  return (
    <main className="space-y-4 px-4 pb-24 pt-safe-t">
      {/* Header com streak geral */}
      <header className="flex items-start justify-between pt-3">
        <div>
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
        </div>
        <ProfileAvatar />
      </header>

      {/* Cards */}
      <div className="space-y-3">
        {habitos.map((h) => (
          <HabitCard
            key={h.id}
            habito={h}
            onEstouComVontade={() => setVontadeDe(h)}
            onTropeco={() => props.onRegistrarTropeco(h.id)}
            feitoHoje={h.feitoHoje}
            onFizHoje={() => props.onRegistrarCheckin(h.id)}
            onExcluir={() => props.onExcluirHabito(h.id)}
          />
        ))}
      </div>

      {/* Adicionar novo hábito */}
      <button
        onClick={() => setMostrarAdicionar(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-brand/40 p-4 text-left"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-surface-3 text-2xl text-brand">+</span>
        <span>
          <span className="block font-semibold text-content-hi">Acompanhar novo hábito</span>
          <span className="block text-micro text-content-low">Açúcar, refrigerante, leitura e mais…</span>
        </span>
      </button>

      <p className="px-2 text-center text-micro leading-relaxed text-content-dim">{m.habitos.aviso}</p>

      {/* Assistente da vontade — sobe e escurece o resto */}
      {vontadeDe && (
        <CravingAssistant
          habito={vontadeDe}
          onConversar={() => {
            setVontadeDe(null)
            setChatAberto(true)
          }}
          onFechar={() => setVontadeDe(null)}
        />
      )}

      {/* Novo hábito — mesmo padrão de painel do assistente da vontade */}
      {mostrarAdicionar && (
        <AddHabitSheet
          onSalvar={async (params) => {
            await props.onCriarHabito(params)
            setMostrarAdicionar(false)
          }}
          onFechar={() => setMostrarAdicionar(false)}
        />
      )}

      {chatAberto && <LifeChatSheet onFechar={() => setChatAberto(false)} />}

      {/* Balão de insight real da IA (hoje sempre null — ver docs/STATUS.md).
          Só aparece quando existir de verdade; nada de frase inventada aqui. */}
      {props.insightIA && (
        <div className="fixed bottom-[calc(196px+env(safe-area-inset-bottom))] left-4 z-20 max-w-[240px] rounded-2xl border border-surface-4 bg-surface-2 p-3 text-sm leading-relaxed text-content-mid shadow-lg">
          {props.insightIA}
        </div>
      )}

      {/* O Life flutua no canto inferior esquerdo, acima do BottomNav
          (z-10), de corpo inteiro. O brilho atrás muda de cor com o
          termômetro, e o humor da imagem acompanha: feliz quando está tudo
          firme, calmo (roxo) quando algum hábito pede atenção. Imagens
          transparentes de 2026-09-28 — o mix-blend-mode do fundo preto saiu. */}
      <button
        type="button"
        onClick={() => setChatAberto(true)}
        aria-label="Conversar com o Life"
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-2 z-20 transition-transform active:scale-95"
      >
        <span
          className="absolute inset-x-0 bottom-0 mx-auto h-20 w-20 rounded-full blur-2xl"
          style={{ backgroundColor: corLife, opacity: 0.35 }}
          aria-hidden="true"
        />
        <LifeMascote humor={habitos.some((h) => statusHabito(h) !== 'firme') ? 'calmo' : 'feliz'} className="relative h-28" />
      </button>
    </main>
  )
}
