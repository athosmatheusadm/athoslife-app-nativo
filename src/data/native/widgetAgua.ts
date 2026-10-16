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

export interface CopoPendente {
  id: string
  em: number
  ml: number
  data: string
}

interface AthosWidgetAguaPlugin {
  configurarUsuario(opcoes: { usuario: string }): Promise<void>
  atualizar(opcoes: { data: string; totalMl: number; metaMl: number; idsRegistrados: string[]; usuario: string }): Promise<void>
  copinhosPendentes(opcoes: { usuario: string }): Promise<{ copos: CopoPendente[] }>
  confirmarCopos(opcoes: { usuario: string; ids: string[] }): Promise<void>
  addListener(evento: 'copo', fn: () => void): Promise<PluginListenerHandle>
}

const nativo = Capacitor.getPlatform() === 'android'
const Plugin = registerPlugin<AthosWidgetAguaPlugin>('AthosWidgetAgua')
let usuarioAtual = ''

export const widgetAgua = {
  async configurarUsuario(usuario: string): Promise<void> {
    if (!nativo) return
    await Plugin.configurarUsuario({ usuario })
    usuarioAtual = usuario
  },

  async atualizar(params: { data: string; totalMl: number; metaMl: number; idsRegistrados: string[]; usuario?: string }): Promise<void> {
    if (!nativo) return
    await Plugin.atualizar({ ...params, usuario: params.usuario ?? usuarioAtual }).catch(() => {})
  },

  async copinhosPendentes(usuario: string): Promise<CopoPendente[]> {
    if (!nativo) return []
    return (await Plugin.copinhosPendentes({ usuario })).copos ?? []
  },

  async confirmarCopos(usuario: string, ids: string[]): Promise<void> {
    if (!nativo) return
    await Plugin.confirmarCopos({ usuario, ids })
  },

  async aoTocarCopo(fn: () => void): Promise<() => void> {
    if (!nativo) return () => {}
    const h = await Plugin.addListener('copo', fn)
    return () => void h.remove()
  },
}
