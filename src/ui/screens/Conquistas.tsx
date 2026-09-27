import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { conquistasRepository } from '@data/repositories/conquistasRepository'
import type { Conquista } from '@domain/entities/conquista'
import { AchievementsGallery } from './achievements/AchievementsGallery'

/**
 * Sub-página do Perfil (não é mais aba da bottom nav).
 *
 * Avalia as 26 condições do catálogo contra dado real (ver
 * conquistasRepository) toda vez que a tela abre — é o único gatilho de
 * avaliação por enquanto, de propósito: mexer em mais telas pra disparar
 * isso em tempo real ficaria pra depois, sem necessidade agora.
 */
export function Conquistas() {
  const navigate = useNavigate()
  const { profile } = useSession()
  const [conquistas, setConquistas] = useState<Conquista[] | null>(null)

  useEffect(() => {
    if (!profile) return
    let ativo = true
    conquistasRepository
      .avaliarEListar(profile.metas)
      .then((v) => ativo && setConquistas(v))
      .catch(() => ativo && setConquistas([]))
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  return <AchievementsGallery conquistas={conquistas ?? []} onVoltar={() => navigate(-1)} />
}
