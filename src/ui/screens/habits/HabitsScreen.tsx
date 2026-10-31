import { ActivityIcon } from '@ui/components/ActivityIcon'
import { useState } from 'react'
import { ProfileAvatar } from '@ui/components/ProfileAvatar'
import { HabitCard } from './HabitCard'
import { CravingAssistant } from './CravingAssistant'
import { AddHabitSheet } from './AddHabitSheet'
import { LifeChatSheet } from '@ui/components/life/LifeChatSheet'
import { LifeFlutuante } from '@ui/components/life/LifeFlutuante'
import { useI18n } from '@/i18n/I18nProvider'
import {
  corTermometro,
  nivelBemEstar,
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
  carregando: boolean
  insightIA: string | null
  onRegistrarTropeco: (habitoId: string) => void
  onRegistrarCheckin: (habitoId: string) => void
  onExcluirHabito: (habitoId: string) => Promise<void>
  onCriarHabito: (params: {
    icone: string
    nome: string
    categoria: string | null
    intensidade: IntensidadeHabito
  }) => Promise<void>
}) {
  const { habitos } = props
  // A sequência atual dos hábitos (a melhor delas) — não o recorde do app,
  // que fazia "firme há 9 dias" brigar com os "4 dias seguidos" da Home.
  const sequencia = habitos.reduce((maior, h) => Math.max(maior, h.streakAtual), 0)
  const [vontadeDe, setVontadeDe] = useState<Habito | null>(null)
  const [mostrarAdicionar, setMostrarAdicionar] = useState(false)
  const [chatAberto, setChatAberto] = useState(false)
  const { m } = useI18n()
  const t = m.habitos

  const nivel = nivelBemEstar(habitos)
  const corLife = corTermometro(nivel)

  return (
    <main className="space-y-4 px-4 pb-28 pt-safe-t">
      {/* Header com streak geral */}
      <header className="flex items-start justify-between pt-3">
        <div>
          <div className="text-micro font-bold uppercase tracking-[3px] text-brand">{t.marca}</div>
          <div className="flex items-center gap-2">
            <ActivityIcon icone="outro" tile={false} className="h-7 w-7" />
            <h1 className="text-2xl font-extrabold text-content-hi">{t.titulo}</h1>
          </div>
          {sequencia > 0 && (
            <p className="mt-1 text-sm text-content-low">{t.firmeHa(sequencia)}</p>
          )}
        </div>
        <ProfileAvatar />
      </header>

      {/* Cards */}
      <div className="space-y-3">
        {props.carregando &&
          [0, 1].map((i) => <div key={i} className="h-[62px] animate-pulse rounded-2xl border border-surface-4 bg-surface-2" aria-hidden="true" />)}
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
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-dashed border-brand/40 p-4 text-left transition-colors active:bg-content-hi/5"
      >
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-surface-3 text-2xl text-brand" aria-hidden="true">+</span>
        <span>
          <span className="block font-semibold text-content-hi">{t.novo}</span>
          <span className="block text-micro text-content-low">{t.novoSub}</span>
        </span>
      </button>

      <p className="px-2 text-center text-micro leading-relaxed text-content-low">{t.aviso}</p>

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

      {chatAberto && <LifeChatSheet foco="habitos" onFechar={() => setChatAberto(false)} />}

      {/* Balão de insight real da IA (hoje sempre null — ver docs/STATUS.md).
          Só aparece quando existir de verdade; nada de frase inventada aqui. */}
      {props.insightIA && (
        <div className="fixed bottom-[calc(196px+env(safe-area-inset-bottom))] left-4 z-20 max-w-[240px] rounded-2xl border border-surface-4 bg-surface-2 p-3 text-sm leading-relaxed text-content-mid shadow-lg">
          {props.insightIA}
        </div>
      )}

      {/* O Life de Hábitos: o padrão, no tamanho da Home (decisão do dono,
          29/09 — o de língua de fora saiu daqui). O brilho atrás segue o
          termômetro. */}
      <LifeFlutuante humor="normal" foco="habitos" corBrilho={corLife} nivelHabitos={nivel} />
    </main>
  )
}
