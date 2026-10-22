import { Capacitor } from '@capacitor/core'
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'

/**
 * Leitura de código de barras pela câmera (ML Kit, modo "startScan"): a
 * câmera roda ATRÁS da WebView e a tela por cima é nossa (CameraCodigo).
 * Enquanto lê, `html.barcode-scanner-active` deixa o app transparente
 * (globals.css). Só no app Android; no navegador a tela oferece digitar.
 */

export const leitorDisponivel = Capacitor.getPlatform() === 'android'

const FORMATOS = [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE]

/** Pede a câmera se ainda não tem. false = a pessoa negou. */
export async function permitirCamera(): Promise<boolean> {
  const atual = await BarcodeScanner.checkPermissions()
  if (atual.camera === 'granted' || atual.camera === 'limited') return true
  const pedido = await BarcodeScanner.requestPermissions()
  return pedido.camera === 'granted' || pedido.camera === 'limited'
}

/**
 * Liga a câmera e chama `onCodigo` uma vez, no primeiro código lido.
 * Devolve a função que desliga tudo (chamar sempre ao sair da tela).
 */
export async function iniciarLeitura(onCodigo: (codigo: string) => void): Promise<() => Promise<void>> {
  let lido = false
  const ouvinte = await BarcodeScanner.addListener('barcodesScanned', (ev) => {
    const codigo = ev.barcodes[0]?.rawValue
    if (!codigo || lido) return
    lido = true
    onCodigo(codigo)
  })
  document.documentElement.classList.add('barcode-scanner-active')
  try {
    await BarcodeScanner.startScan({ formats: FORMATOS })
  } catch (e) {
    document.documentElement.classList.remove('barcode-scanner-active')
    await ouvinte.remove()
    throw e
  }
  return async () => {
    document.documentElement.classList.remove('barcode-scanner-active')
    await ouvinte.remove()
    await BarcodeScanner.stopScan().catch(() => {})
  }
}

export async function lanternaDisponivel(): Promise<boolean> {
  return BarcodeScanner.isTorchAvailable()
    .then((r) => r.available)
    .catch(() => false)
}

export async function alternarLanterna(): Promise<void> {
  await BarcodeScanner.toggleTorch()
}
