import { useCallback, useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useNavigate } from 'react-router-dom'
import { useSession } from './SessionProvider'
import { widgetAgua } from '@data/native/widgetAgua'
import { aguaRepository } from '@data/repositories/aguaRepository'
import { dataLocalISO } from '@domain/rules/datas'

/** Disparado quando a água muda por fora da tela (widget) — useAgua recarrega. */
export const EVENTO_AGUA_MUDOU = 'athos:agua-mudou'

const ROTAS_LINK = new Set(['/home', '/scanner', '/dieta', '/treinos', '/habitos'])

/**
 * Liga o app às peças nativas que vivem fora dele (sem UI própria):
 *  - Widget de água: grava no banco os copos tocados no widget e devolve o
 *    total real do dia pra ele (ao abrir, ao voltar pro app, a cada toque).
 *  - Links `athoslife://abrir/<rota>` (câmera/Life do widget) -> navega.
 */
export function IntegracoesNativas() {
  const { session, profile } = useSession()
  const navigate = useNavigate()
  const metaMl = profile?.metas.aguaMl ?? 2500
  const sincronizando = useRef(false)

  const sincronizarWidget = useCallback(async () => {
    if (!session || sincronizando.current) return
    sincronizando.current = true
    try {
      const copos = await widgetAgua.copinhosPendentes()
      for (const c of copos) {
        // Copo de outro dia (tocado ontem, app aberto hoje) não entra em hoje.
        if (c.ml > 0 && c.data === dataLocalISO()) await aguaRepository.adicionar(c.ml).catch(() => {})
      }
      const hoje = await aguaRepository.aguaDoDia(metaMl)
      await widgetAgua.atualizar({ data: dataLocalISO(), totalMl: hoje.totalMl, metaMl })
      if (copos.length > 0) window.dispatchEvent(new Event(EVENTO_AGUA_MUDOU))
    } catch {
      /* sem rede: tenta de novo na próxima abertura */
    } finally {
      sincronizando.current = false
    }
  }, [session, metaMl])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void sincronizarWidget()
    let tirarCopo: (() => void) | null = null
    let tirarApp: (() => void) | null = null
    void widgetAgua.aoTocarCopo(() => void sincronizarWidget()).then((f) => (tirarCopo = f))
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void sincronizarWidget()
    }).then((h) => (tirarApp = () => void h.remove()))
    return () => {
      tirarCopo?.()
      tirarApp?.()
    }
  }, [sincronizarWidget])

  // Links do widget (app já aberto e abertura fria).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const ir = (url: string) => {
      try {
        const rota = new URL(url).pathname
        if (ROTAS_LINK.has(rota)) navigate(rota)
      } catch {
        /* link malformado: ignora */
      }
    }
    void CapApp.getLaunchUrl().then((r) => r?.url && ir(r.url))
    const h = CapApp.addListener('appUrlOpen', ({ url }) => ir(url))
    return () => void h.then((x) => x.remove())
  }, [navigate])

  return null
}
