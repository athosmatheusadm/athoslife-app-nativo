import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * Postar o Story: no Android, o plugin próprio `AthosInstagram`
 * (android/.../story/AthosInstagramPlugin.java) abre o editor de Stories do
 * Instagram já com a imagem (Meta "Sharing to Stories"). Precisa do
 * Facebook App ID em capacitor.config.ts → plugins.AthosInstagram; sem ele,
 * ou sem Instagram, cai no menu de compartilhar do sistema.
 * No navegador: menu de compartilhar do navegador, senão baixa o arquivo.
 */

interface AthosInstagramPlugin {
  shareToStory(o: { imageBase64: string; topColor?: string; bottomColor?: string }): Promise<{ ok: boolean }>
  shareImage(o: { imageBase64: string }): Promise<{ completed: boolean }>
}

const Plugin = registerPlugin<AthosInstagramPlugin>('AthosInstagram')
const nativo = Capacitor.getPlatform() === 'android'

export type ComoFoi = 'instagram' | 'menu' | 'baixado'

function comoArquivo(base64: string): File {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], 'athoslife-story.jpg', { type: 'image/jpeg' })
}

async function pelaWeb(base64: string): Promise<ComoFoi> {
  const arquivo = comoArquivo(base64)
  if (navigator.canShare?.({ files: [arquivo] })) {
    await navigator.share({ files: [arquivo] })
    return 'menu'
  }
  const url = URL.createObjectURL(arquivo)
  const a = document.createElement('a')
  a.href = url
  a.download = arquivo.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'baixado'
}

/** Tenta o Instagram direto; sem App ID ou sem Instagram, abre o menu de compartilhar. */
export async function postarNoStory(base64: string): Promise<ComoFoi> {
  if (!nativo) return pelaWeb(base64)
  try {
    await Plugin.shareToStory({ imageBase64: base64, topColor: '#0e100f', bottomColor: '#0e100f' })
    return 'instagram'
  } catch {
    await Plugin.shareImage({ imageBase64: base64 })
    return 'menu'
  }
}

/** Salvar / mandar pra outro app (menu do sistema). */
export async function compartilharImagem(base64: string): Promise<ComoFoi> {
  if (!nativo) return pelaWeb(base64)
  await Plugin.shareImage({ imageBase64: base64 })
  return 'menu'
}
