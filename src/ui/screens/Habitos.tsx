import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { habitosRepository } from '@data/repositories/habitosRepository'
import type { Habito } from '@domain/entities/habito'
import { HabitsScreen } from './habits/HabitsScreen'

export function Habitos() {
  const { profile } = useSession()
  const [habitos, setHabitos] = useState<Habito[]>([])

  function recarregar() {
    void habitosRepository.listar().then(setHabitos).catch(() => {})
  }

  useEffect(recarregar, [])

  if (!profile) return null

  return (
    <HabitsScreen
      habitos={habitos}
      maiorStreak={profile.maiorStreak}
      insightIA={null}
      onRegistrarTropeco={(habitoId) => {
        void habitosRepository
          .registrarRecaida({ habitoId, gatilho: null, contexto: null })
          .then(recarregar)
          .catch(() => {})
      }}
      onEscolherCaminho={() => {
        // "Esperar 10 min" / "Alternativa" / "Já passou" são só do momento —
        // nada para persistir ainda (sem tabela de eventos de vontade).
      }}
      onAdicionar={() => {
        // Fluxo "Acompanhar novo hábito": próxima tela da fila.
      }}
      onAbrirChat={() => {
        // Chat com a Life: tela ainda não construída (docs/STATUS.md).
      }}
    />
  )
}
