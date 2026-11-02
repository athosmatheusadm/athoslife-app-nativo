import { useCallback, useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useNavigate } from 'react-router-dom'
import { useSession } from './SessionProvider'
import { widgetAgua } from '@data/native/widgetAgua'
import { atualizarIconeDoMascote } from '@data/native/iconeMascote'
import { aguaRepository } from '@data/repositories/aguaRepository'
import { dataLocalISO } from '@domain/rules/datas'
import { sincronizarCoposWidget, rotaDoWidget } from '@data/native/sincronizarCoposWidget'

/** Disparado quando a água muda por fora da tela (widget) — useAgua recarrega. */
export const EVENTO_AGUA_MUDOU = 'athos:agua-mudou'

/**
 * Liga o app às peças nativas que vivem fora dele (sem UI própria):
 *  - Widget de água: grava no banco os copos tocados no widget e devolve o
 *    total real do dia pra ele (ao abrir, ao voltar pro app, a cada toque).
 *  - Links `athoslife://abrir/<rota>` (câmera/Life do widget) -> navega.
 */
export function IntegracoesNativas() {
  const { session, profile, loading } = useSession()
  const navigate = useNavigate()
  const metaMl = profile?.metas.aguaMl ?? 2500
  const filaSync = useRef<Promise<void>>(Promise.resolve())
  const usuario = session?.user.id ?? ''
  const usuarioAtual = useRef(usuario)
  usuarioAtual.current = usuario

  const sincronizarWidget = useCallback(async () => {
    if (loading) return
    const executar = async () => {
    if (usuarioAtual.current !== usuario) return
    try {
      await widgetAgua.configurarUsuario(usuario)
      if (!usuario) return
      await sincronizarCoposWidget({
        listar: () => widgetAgua.copinhosPendentes(usuario),
        gravar: (c) => aguaRepository.adicionarDoWidget(c, usuario),
        confirmar: (ids) => widgetAgua.confirmarCopos(usuario, ids),
      })
      const hoje = await aguaRepository.aguaDoDia(metaMl)
      if (usuarioAtual.current === usuario) await widgetAgua.atualizar({ data: dataLocalISO(), totalMl: hoje.totalMl, idsRegistrados: hoje.registros.map((r) => r.id), metaMl, usuario })
    } catch {
      /* Fila não confirmada continua no Android, com ids estáveis para reenvio. */
    } finally {
      if (usuario && usuarioAtual.current === usuario) window.dispatchEvent(new Event(EVENTO_AGUA_MUDOU))
    }
    }
    // Cada toque durante uma sincronização ganha uma nova passagem pela fila.
    filaSync.current = filaSync.current.catch(() => {}).then(executar)
    await filaSync.current
  }, [usuario, loading, metaMl])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    void sincronizarWidget()
    void atualizarIconeDoMascote()
    let tirarCopo: (() => void) | null = null
    let tirarApp: (() => void) | null = null
    let encerrado = false
    const aoConectar = () => void sincronizarWidget()
    window.addEventListener('online', aoConectar)
    void widgetAgua.aoTocarCopo(aoConectar).then((f) => { if (encerrado) f(); else tirarCopo = f }).catch(() => {})
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      void sincronizarWidget()
      void atualizarIconeDoMascote()
    }).then((h) => { if (encerrado) void h.remove(); else tirarApp = () => void h.remove() })
    return () => {
      encerrado = true
      window.removeEventListener('online', aoConectar)
      tirarCopo?.()
      tirarApp?.()
    }
  }, [sincronizarWidget])

  // Links do widget (app já aberto e abertura fria).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const ir = (url: string) => {
      try {
        const rota = rotaDoWidget(url)
        if (rota) navigate(rota)
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
