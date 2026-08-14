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

/**
 * Abre a câmera ou a galeria e devolve a imagem em base64,
 * SEM o prefixo `data:` (é o que o ai-proxy espera).
 * Retorna null se o usuário cancelar.
 */
export async function capturarFoto(origem: OrigemFoto): Promise<string | null> {
  try {
    const foto = await Camera.getPhoto({
      quality: 70,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: origem === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      // Foto de comida não precisa ser gigante: menos upload, menos custo,
      // resposta mais rápida do Gemini.
      width: 1024,
      correctOrientation: true,
    })
    return foto.base64String ?? null
  } catch {
    // Cancelamento do usuário cai aqui — não é erro de verdade.
    return null
  }
}
