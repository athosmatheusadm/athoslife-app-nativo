import type { LocalTreino } from '@domain/entities/treino'

/**
 * Avisos entre o chat do Life e as telas (sem estado global):
 *
 *   abrir-life      um botão da tela pede pro Life do canto abrir o chat
 *   plano-aplicado  o plano montado no chat foi salvo — Treino troca pro
 *                   local e recarrega a ficha; Dieta recarrega os cards
 */
const ABRIR_LIFE = 'athoslife:abrir-life'
const PLANO_APLICADO = 'athoslife:plano-aplicado'

export type PlanoAplicado = { readonly tipo: 'treino'; readonly local: LocalTreino } | { readonly tipo: 'dieta' }

/** `rascunho`: texto já escrito no campo do chat (ex.: "Pesei  kg" — a pessoa só completa). */
export function pedirAbrirLife(rascunho?: string): void {
  window.dispatchEvent(new CustomEvent<string | undefined>(ABRIR_LIFE, { detail: rascunho }))
}

export function aoPedirAbrirLife(fn: (rascunho?: string) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<string | undefined>).detail)
  window.addEventListener(ABRIR_LIFE, h)
  return () => window.removeEventListener(ABRIR_LIFE, h)
}

/** Local do último plano de treino aplicado — o Treino abre nele (a tela pode nem estar montada no aviso). */
const LOCAL_PLANO = 'athoslife:local-ultimo-plano'

export function localDoUltimoPlano(): LocalTreino | null {
  try {
    const v = sessionStorage.getItem(LOCAL_PLANO)
    sessionStorage.removeItem(LOCAL_PLANO)
    return v === 'casa' || v === 'academia' ? v : null
  } catch {
    return null
  }
}

export function avisarPlanoAplicado(p: PlanoAplicado): void {
  if (p.tipo === 'treino') {
    try {
      sessionStorage.setItem(LOCAL_PLANO, p.local)
    } catch {
      // sem storage: a tela aberta ainda recebe o evento
    }
  }
  window.dispatchEvent(new CustomEvent<PlanoAplicado>(PLANO_APLICADO, { detail: p }))
}

export function aoAplicarPlano(fn: (p: PlanoAplicado) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<PlanoAplicado>).detail)
  window.addEventListener(PLANO_APLICADO, h)
  return () => window.removeEventListener(PLANO_APLICADO, h)
}
