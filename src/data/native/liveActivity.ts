import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { EstadoLiveActivity } from '@domain/entities/sessaoTreino'

/**
 * Ponte com a Live Activity do treino (card fixo na tela de bloqueio).
 * Plugin nativo próprio: android/app/src/main/java/br/com/athoslife/app/liveactivity/.
 *
 * O app é a fonte da verdade: manda o estado inteiro a cada mudança e o
 * nativo só desenha. Os botões do card (±carga, ±reps, confirmar, +15s,
 * pular…) voltam como eventos `acao`. Se o app estava fechado quando o botão
 * foi tocado, a ação fica numa fila no aparelho e sai em `acoesPendentes()`
 * na próxima abertura.
 *
 * Fora do Android (navegador, `npm run dev`) tudo vira no-op.
 */

export type AcaoLiveActivity =
  | 'carga+'
  | 'carga-'
  | 'reps+'
  | 'reps-'
  | 'seg+'
  | 'seg-'
  | 'confirmar'
  | 'iniciar'
  | 'descanso+15'
  | 'pular'

interface AthosLiveActivityPlugin {
  mostrar(opcoes: { estado: EstadoLiveActivity }): Promise<void>
  encerrar(): Promise<void>
  acoesPendentes(): Promise<{ acoes: AcaoLiveActivity[] }>
  addListener(
    evento: 'acao',
    fn: (dados: { acao: AcaoLiveActivity }) => void,
  ): Promise<PluginListenerHandle>
}

const nativo = Capacitor.getPlatform() === 'android'
const Plugin = registerPlugin<AthosLiveActivityPlugin>('AthosLiveActivity')

export const liveActivity = {
  disponivel: nativo,

  async mostrar(estado: EstadoLiveActivity): Promise<void> {
    if (!nativo) return
    await Plugin.mostrar({ estado }).catch((e) => console.warn('[liveActivity] mostrar', e))
  },

  async encerrar(): Promise<void> {
    if (!nativo) return
    await Plugin.encerrar().catch(() => {})
  },

  async acoesPendentes(): Promise<AcaoLiveActivity[]> {
    if (!nativo) return []
    try {
      return (await Plugin.acoesPendentes()).acoes ?? []
    } catch {
      return []
    }
  },

  async aoTocar(fn: (acao: AcaoLiveActivity) => void): Promise<() => void> {
    if (!nativo) return () => {}
    const h = await Plugin.addListener('acao', (d) => fn(d.acao))
    return () => void h.remove()
  },
}
