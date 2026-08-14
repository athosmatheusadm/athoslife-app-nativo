import { useEffect } from 'react'
import type { Conquista } from '@domain/entities/conquista'

/**
 * Celebração de conquista — o Life DOURADO (modo champion).
 *
 * Aparece onde o usuário estiver quando desbloqueia algo. Desce do topo,
 * o Life brilha dourado, anuncia a conquista. Auto-some em ~6s (a duração
 * do modo champion definida nas regras), ou ao toque.
 *
 * Não é modal que trava a tela — é uma faixa que desce e recolhe, pra
 * celebrar sem interromper. Depois a conquista vai pro acervo (gaveta).
 */
export function AchievementToast(props: {
  conquista: Conquista
  onFechar: () => void
}) {
  const { conquista } = props

  useEffect(() => {
    const t = setTimeout(props.onFechar, 6000)
    return () => clearTimeout(t)
  }, [props])

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-safe-t"
      role="status"
      aria-live="polite"
    >
      <button
        onClick={props.onFechar}
        className="mt-3 flex w-full max-w-md items-center gap-3.5 rounded-2xl border border-accent-gold/40 bg-surface-2 p-4 text-left shadow-[0_8px_30px_rgba(251,191,36,0.15)] motion-safe:animate-[descer_0.4s_cubic-bezier(0.22,1,0.36,1)]"
      >
        {/* Life dourado — brilho de champion */}
        <span className="relative flex h-14 w-14 flex-none items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-accent-gold/25 blur-lg motion-safe:animate-pulse" />
          <span className="relative text-4xl" aria-hidden="true">🦎</span>
          <span className="absolute -right-0.5 -top-0.5 text-sm">✨</span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-micro font-bold uppercase tracking-wide text-accent-gold">
            Conquista desbloqueada
          </span>
          <span className="block truncate text-base font-bold text-content-hi">
            {conquista.titulo}
          </span>
          <span className="block truncate text-micro text-content-low">
            {conquista.descricao}
          </span>
        </span>
      </button>

      <style>{`
        @keyframes descer {
          from { transform: translateY(-120%); opacity: 0 }
          to { transform: translateY(0); opacity: 1 }
        }
      `}</style>
    </div>
  )
}
