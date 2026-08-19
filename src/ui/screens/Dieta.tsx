import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { macrosRepository } from '@data/repositories/macrosRepository'
import type { Refeicao } from '@domain/entities/meal'
import { DietScreen } from './diet/DietScreen'

/**
 * Refeições vazias de hoje (café/almoço/lanche/jantar), como ponto de
 * partida do diário. Provisório: ainda não existe um repositório que
 * leia os itens de refeição do dia (só `refeicoesRepository.salvarDoScanner`
 * grava macros somados, sem itens) — próximo "código" da fila.
 */
const REFEICOES_VAZIAS: Refeicao[] = [
  { tipo: 'cafe', nome: 'Café da manhã', emoji: '☕', itens: [], concluida: false },
  { tipo: 'almoco', nome: 'Almoço', emoji: '🍽️', itens: [], concluida: false },
  { tipo: 'lanche', nome: 'Lanche', emoji: '🍎', itens: [], concluida: false },
  { tipo: 'jantar', nome: 'Jantar', emoji: '🌙', itens: [], concluida: false },
]

export function Dieta() {
  const { profile } = useSession()
  const [consumido, setConsumido] = useState({ kcal: 0, proteina: 0, carboidrato: 0 })

  useEffect(() => {
    let ativo = true
    void macrosRepository
      .doDia()
      .then((m) => ativo && setConsumido({ kcal: m.kcal, proteina: m.proteina, carboidrato: m.carboidrato }))
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [])

  if (!profile) return null

  return (
    <DietScreen metas={profile.metas} refeicoes={REFEICOES_VAZIAS} consumido={consumido} />
  )
}
