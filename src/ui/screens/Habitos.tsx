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
      onCriarHabito={async (params) => {
        await habitosRepository.criar(params)
        recarregar()
      }}
    />
  )
}
