import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { aoMudarConexao } from './conexao'
import { pendentes, sincronizar } from './fila'

/**
 * Quando a fila offline tenta subir: ao abrir o app, ao voltar o sinal, ao
 * voltar pro app e, enquanto houver algo pendente, a cada 30 s.
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
  if (Capacitor.isNativePlatform()) {
    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) tentar()
    })
  }
  window.setInterval(() => {
    void pendentes().then((n) => {
      if (n > 0) tentar()
    })
  }, 30_000)
}
