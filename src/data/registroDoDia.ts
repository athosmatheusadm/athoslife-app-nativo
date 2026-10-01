/**
 * Sinal de "algo do dia foi registrado" (água, refeição, peso, treino).
 * Os lembretes do Life escutam pra tirar da lista o que já foi feito hoje.
 * Módulo à parte pra os repositórios não dependerem das notificações.
 */
const EVENTO = 'athoslife:registro-do-dia'

export function avisarRegistroDoDia(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO))
}

export function aoRegistrarNoDia(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}
