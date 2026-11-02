import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useSession } from './SessionProvider'
import { conquistasRepository } from '@data/repositories/conquistasRepository'
import { valeTentarRede } from '@data/offline/conexao'
import { consumirCelebracao, EVENTO_CELEBRAR } from '@data/native/iconeMascote'
import type { Conquista, NivelConquista } from '@domain/entities/conquista'
import { AchievementToast } from '@ui/screens/achievements/AchievementToast'

/**
 * Antes as conquistas só eram avaliadas abrindo Perfil > Conquistas, então
 * o Life dourado nunca aparecia (teste do dono, 27/10). Agora, nas abas
 * raiz, o app confere ao abrir, ao voltar pro app e ao trocar de aba (no
 * máx. 1 vez a cada 90 s — a avaliação cruza várias tabelas). Conquista
 * nova: faixa com o Life dourado, o Life da Home toca a animação dourada
 * uma vez e o ícone do app fica dourado até a meia-noite.
 */
const INTERVALO_MS = 90_000
const PESO_NIVEL: Record<NivelConquista, number> = { bronze: 0, prata: 1, ouro: 2, diamante: 3, lendario: 4 }

export function CelebracaoConquistas() {
  const { profile } = useSession()
  const { pathname } = useLocation()
  const [atual, setAtual] = useState<Conquista | null>(null)
  const ultima = useRef(0)
  const metasRef = useRef(profile?.metas)
  metasRef.current = profile?.metas

  const verificar = useRef(async () => {
    const metas = metasRef.current
    if (!metas || !valeTentarRede()) return
    if (Date.now() - ultima.current < INTERVALO_MS) return
    ultima.current = Date.now()
    try {
      const novas = await conquistasRepository.verificarNovas(metas)
      // Várias de uma vez (ex.: primeira avaliação): celebra a de nível mais alto.
      const melhor = [...novas].sort((a, b) => PESO_NIVEL[b.nivel] - PESO_NIVEL[a.nivel])[0]
      if (melhor) setAtual(melhor)
    } catch {
      /* sem rede ou erro do banco: tenta de novo na próxima troca de aba */
    }
  })

  const temPerfil = !!profile
  useEffect(() => {
    if (temPerfil) void verificar.current()
  }, [pathname, temPerfil])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let tirar: (() => void) | null = null
    let encerrado = false
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void verificar.current()
    }).then((h) => {
      if (encerrado) void h.remove()
      else tirar = () => void h.remove()
    })
    return () => {
      encerrado = true
      tirar?.()
    }
  }, [])

  if (!atual) return null
  return <AchievementToast conquista={atual} onFechar={() => setAtual(null)} />
}

/**
 * Contador pro `celebrar` do Life da Home: sobe quando há conquista nova
 * (ou meta batida) ainda não celebrada — na hora, ou ao voltar pra Home.
 */
export function useCelebracaoNaHome(): number {
  const [vezes, setVezes] = useState(0)
  useEffect(() => {
    const pegar = () => {
      if (consumirCelebracao()) setVezes((n) => n + 1)
    }
    pegar()
    window.addEventListener(EVENTO_CELEBRAR, pegar)
    return () => window.removeEventListener(EVENTO_CELEBRAR, pegar)
  }, [])
  return vezes
}
