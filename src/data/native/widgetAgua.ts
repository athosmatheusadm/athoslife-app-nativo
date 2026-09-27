import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

/**
 * Ponte com o widget de hidratação da tela inicial (plugin nativo próprio:
 * android/app/src/main/java/br/com/athoslife/app/widget/).
 *
 * O app manda o total REAL do dia (do banco) pro widget desenhar. Copos
 * tocados no widget somam lá na hora e entram numa fila; o app grava essa
 * fila no banco (`sincronizarWidgetAgua`) e manda o total certo de volta.
 * Fora do Android tudo vira no-op.
 */

interface CopoPendente {
  ml: number
  data: string
}

interface AthosWidgetAguaPlugin {
  atualizar(opcoes: { data: string; totalMl: number; metaMl: number }): Promise<void>
  copinhosPendentes(): Promise<{ copos: CopoPendente[] }>
  addListener(evento: 'copo', fn: () => void): Promise<PluginListenerHandle>
}

const nativo = Capacitor.getPlatform() === 'android'
const Plugin = registerPlugin<AthosWidgetAguaPlugin>('AthosWidgetAgua')

export const widgetAgua = {
  async atualizar(params: { data: string; totalMl: number; metaMl: number }): Promise<void> {
    if (!nativo) return
    await Plugin.atualizar(params).catch(() => {})
  },

  async copinhosPendentes(): Promise<CopoPendente[]> {
    if (!nativo) return []
    try {
      return (await Plugin.copinhosPendentes()).copos ?? []
    } catch {
      return []
    }
  },

  async aoTocarCopo(fn: () => void): Promise<() => void> {
    if (!nativo) return () => {}
    const h = await Plugin.addListener('copo', fn)
    return () => void h.remove()
  },
}
