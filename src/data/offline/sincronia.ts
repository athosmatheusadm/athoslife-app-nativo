import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { testarConexao } from '@data/supabase/client'
import { aoMudarConexao, estaOnline } from './conexao'
import { pendentes, sincronizar } from './fila'

/**
 * Quando a fila offline tenta subir: ao abrir o app, ao voltar o sinal, ao
 * voltar pro app e, enquanto houver algo pendente, a cada 30 s.
 * Enquanto o app se acha offline, testa a rede a cada 10 s (e ao voltar pro
 * app): o selo "sem internet" ficava preso numa tela parada, porque só uma
 * resposta do servidor o tira.
 * Liga uma vez só (o SessionProvider chama ao saber quem está logado).
 */
let ligada = false

export function ligarSincronia(): void {
  if (ligada) return
  ligada = true
  const tentar = () => void sincronizar().catch(() => {})
  tentar()
  aoMudarConexao((online) => {
    if (online) tentar()
  })
  const testarSeOffline = () => {
    if (!estaOnline() && navigator.onLine !== false) void testarConexao()
  }
  if (Capacitor.isNativePlatform()) {
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      testarSeOffline()
      tentar()
    })
  }
  window.setInterval(testarSeOffline, 10_000)
  window.setInterval(() => {
    void pendentes().then((n) => {
      if (n > 0) tentar()
    })
  }, 30_000)
}
