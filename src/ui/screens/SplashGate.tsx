/**
 * Estado de carregamento durante a resolução dos guards.
 * Não é a splash nativa do Capacitor — é a ponte entre ela e a primeira tela,
 * para o usuário nunca ver um flash branco ou uma tela vazia.
 */
export function SplashGate() {
  return (
    <div
      className="flex h-full items-center justify-center bg-surface-1"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Carregando o ATHOSlife</span>
      <div
        className="h-10 w-10 rounded-full border-2 border-surface-4 border-t-brand motion-safe:animate-spin"
        aria-hidden="true"
      />
    </div>
  )
}
