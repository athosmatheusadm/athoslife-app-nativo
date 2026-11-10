import { Capacitor, registerPlugin } from '@capacitor/core'

/**
 * Entregar um arquivo de texto pra pessoa. No Android, o plugin próprio
 * `AthosArquivo` (android/.../arquivo/AthosArquivoPlugin.java) abre o menu
 * de compartilhar do sistema — o WebView ignora `<a download>`. No
 * navegador, baixa direto.
 */
interface AthosArquivoPlugin {
  compartilharTexto(o: { texto: string; nome: string; tipo: string; titulo: string }): Promise<void>
}

const Plugin = registerPlugin<AthosArquivoPlugin>('AthosArquivo')

export async function entregarArquivo(o: { texto: string; nome: string; tipo: string; titulo: string }): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    await Plugin.compartilharTexto(o)
    return
  }
  const url = URL.createObjectURL(new Blob([o.texto], { type: o.tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = o.nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
