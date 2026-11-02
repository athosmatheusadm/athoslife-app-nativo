import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/**
 * Captura de foto para o scanner, isolada do plugin nativo.
 *
 * Por que existe: substitui a câmera do navegador (que some no app nativo)
 * pelo plugin do Capacitor. A regra de negócio (foodCaptureService) não
 * conhece o Capacitor — recebe só um base64. Trocar o plugin no futuro
 * não toca no domínio.
 */

export type OrigemFoto = 'camera' | 'galeria'

export interface FotoCapturada {
  /** Sem o prefixo `data:` — é o que o ai-proxy espera. */
  readonly base64: string
  readonly mime: 'image/jpeg' | 'image/png' | 'image/webp'
  /** Pra pré-visualizar na tela. */
  readonly dataUrl: string
}

/** A pessoa negou a câmera/galeria pro app: só os ajustes do celular liberam de novo. */
export class CameraNegadaError extends Error {
  constructor() {
    super('camera_negada')
    this.name = 'CameraNegadaError'
  }
}

/**
 * Abre a câmera ou a galeria e devolve a imagem pronta pro scanner.
 * Retorna null se o usuário cancelar; lança CameraNegadaError se a
 * permissão foi negada (antes virava "sem foto" e a tela parecia não fazer
 * nada). No navegador (npm run dev) o plugin cai num seletor de arquivo.
 */
export async function capturarFoto(origem: OrigemFoto): Promise<FotoCapturada | null> {
  try {
    const foto = await Camera.getPhoto({
      // 1280 px / ~0,82: ponto de partida da especificação do scanner v1.1
      // (seção 5) — o benchmark compara com 960 e 1600.
      quality: 82,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: origem === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      // Foto de comida não precisa ser gigante: menos upload, menos custo,
      // resposta mais rápida do Gemini.
      width: 1280,
      correctOrientation: true,
    })
    if (!foto.base64String) return null
    const mime = foto.format === 'png' ? 'image/png' : foto.format === 'webp' ? 'image/webp' : 'image/jpeg'
    return { base64: foto.base64String, mime, dataUrl: `data:${mime};base64,${foto.base64String}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/denied|permission|not authorized|negad/i.test(msg)) throw new CameraNegadaError()
    // Cancelamento do usuário cai aqui — não é erro de verdade.
    return null
  }
}
