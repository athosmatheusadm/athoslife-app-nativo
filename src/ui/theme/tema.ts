import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Tema do app — escolhido em Perfil > Acessibilidade > Tema. "Automático"
 * (segue o modo do celular) é o padrão desde 30/10, pedido do dono; Escuro e
 * Claro fixam.
 * O claro é a classe `.tema-claro` no <html> (globals.css). Aqui também vão
 * a barra de status do Android e a cor da barra do navegador, que o CSS
 * não alcança. Guardado no aparelho, como as outras preferências de exibição.
 */

export type Tema = 'escuro' | 'claro' | 'auto'

const CHAVE = 'athoslife:tema'
const FUNDO = { escuro: '#161616', claro: '#ffffff' } as const
const consulta = window.matchMedia('(prefers-color-scheme: light)')

export function lerTema(): Tema {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'escuro' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

function aplicar(tema: Tema): void {
  const claro = tema === 'claro' || (tema === 'auto' && consulta.matches)
  document.documentElement.classList.toggle('tema-claro', claro)
  const fundo = claro ? FUNDO.claro : FUNDO.escuro
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fundo)
  if (!Capacitor.isNativePlatform()) return
  // Style.Light = ícones escuros (fundo claro); Style.Dark = ícones claros.
  void StatusBar.setStyle({ style: claro ? Style.Light : Style.Dark }).catch(() => {})
  void StatusBar.setBackgroundColor({ color: fundo }).catch(() => {})
}

export function definirTema(tema: Tema): void {
  try {
    if (tema === 'auto') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, tema)
  } catch {
    // localStorage pode falhar — preferência visual, não crítico.
  }
  aplicar(tema)
}

/** Chamar uma vez no boot. */
export function iniciarTema(): void {
  aplicar(lerTema())
  consulta.addEventListener('change', () => {
    if (lerTema() === 'auto') aplicar('auto')
  })
}
