import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * As cores do app seguem o modo do celular sozinhas (globals.css,
 * prefers-color-scheme). Aqui só acompanha o que o CSS não alcança:
 * a barra de status do Android e a cor da barra do navegador.
 */
const FUNDO = { escuro: '#161616', claro: '#ffffff' } as const

function aplicar(claro: boolean): void {
  const fundo = claro ? FUNDO.claro : FUNDO.escuro
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fundo)
  if (!Capacitor.isNativePlatform()) return
  // Style.Light = ícones escuros (fundo claro); Style.Dark = ícones claros.
  void StatusBar.setStyle({ style: claro ? Style.Light : Style.Dark }).catch(() => {})
  void StatusBar.setBackgroundColor({ color: fundo }).catch(() => {})
}

/** Chamar uma vez no boot. */
export function acompanharModoDoCelular(): void {
  const consulta = window.matchMedia('(prefers-color-scheme: light)')
  aplicar(consulta.matches)
  consulta.addEventListener('change', (e) => aplicar(e.matches))
}
