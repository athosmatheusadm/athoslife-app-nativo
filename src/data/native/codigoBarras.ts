import { Capacitor } from '@capacitor/core'
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'

/**
 * Leitura de código de barras pela câmera (ML Kit, tela pronta do Google:
 * abre, lê e fecha — sem pedir permissão de câmera na tela).
 * Só no app Android; no navegador a tela oferece digitar o número.
 */

export const leitorDisponivel = Capacitor.getPlatform() === 'android'

/** Número do código (EAN/UPC) ou null se a pessoa cancelou. */
export async function lerCodigoBarras(): Promise<string | null> {
  if (!leitorDisponivel) return null
  // O módulo do Google é baixado pelo Play Services; na 1ª vez pode faltar.
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable()
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule()
    throw new Error('modulo_baixando')
  }
  try {
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE],
    })
    return barcodes[0]?.rawValue ?? null
  } catch (e) {
    // Cancelar a leitura rejeita a promise — não é erro.
    if (String(e).toLowerCase().includes('cancel')) return null
    throw e
  }
}
