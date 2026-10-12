/**
 * Card de streak da Home — dias seguidos + recorde pessoal.
 *
 * Layout de antes da passada de 09/10 (número + "dias seguidos" e o recorde
 * sempre à direita — o dono não gostou da troca), agora no verde da marca:
 * faixa verde quase transparente e chama verde que tremula (dono, 12/10).
 *
 * Sem a barra de "próximo nível": esse número depende da lógica de
 * conquistas (avaliar_conquistas() no Postgres), que ainda não está ligada
 * ao app. Melhor não mostrar do que inventar um threshold.
 */
import { useI18n } from '@/i18n/I18nProvider'

export function StreakCard({
  streakAtual,
  maiorStreak,
}: {
  streakAtual: number
  maiorStreak: number
}) {
  const { m } = useI18n()
  const t = m.home.streak
  return (
    <section className="relative overflow-hidden rounded-card border border-brand/15 bg-gradient-to-br from-brand/10 to-surface-1 p-4">
      <div
        className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-brand/15 blur-2xl"
        aria-hidden="true"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ChamaVerde />
          <div>
            <div className="text-2xl font-black leading-none tabular-nums text-content-hi">{streakAtual}</div>
            <div className="text-micro font-semibold text-brand">{t.dias(streakAtual)}</div>
          </div>
        </div>
        <div className="text-right text-micro font-semibold text-content-low">{t.recorde(maiorStreak)}</div>
      </div>
      <style>{`
        @keyframes chamaTremula {
          0%, 100% { transform: scale(1, 1) skewX(0deg); }
          25% { transform: scale(0.96, 1.06) skewX(-3deg); }
          50% { transform: scale(1.03, 0.97) skewX(2deg); }
          75% { transform: scale(0.98, 1.04) skewX(-1deg); }
        }
        @keyframes chamaMiolo {
          0%, 100% { transform: scale(1, 1); opacity: 0.75; }
          50% { transform: scale(0.9, 1.12); opacity: 1; }
        }
        @keyframes chamaBrilho {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>
    </section>
  )
}

/** Chama verde em SVG: contorno, miolo claro e brilho, cada um no seu ritmo. */
function ChamaVerde() {
  return (
    <span className="relative inline-flex h-10 w-9 items-end justify-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-brand/40 blur-md motion-safe:animate-[chamaBrilho_1.6s_ease-in-out_infinite]" />
      <svg
        viewBox="0 0 32 40"
        className="relative h-10 w-8 origin-bottom motion-safe:animate-[chamaTremula_1.2s_ease-in-out_infinite]"
      >
        <path
          className="fill-brand"
          d="M16 1c1.5 6.5 9.5 10.5 9.5 21A9.5 9.5 0 0 1 16 39 9.5 9.5 0 0 1 6.5 29.5c0-5 2.5-8 4.5-10.5.5 3 2 4.5 3.5 5C13 17 14.5 8 16 1Z"
        />
        <path
          className="origin-bottom fill-content-hi motion-safe:animate-[chamaMiolo_0.9s_ease-in-out_infinite]"
          style={{ transformBox: 'fill-box' }}
          d="M16 18c.8 3.5 5 5.5 5 11a5 5 0 0 1-10 0c0-2.8 1.4-4.3 2.4-5.6.3 1.5 1 2.3 1.8 2.6-.4-3.4.3-6 .8-8Z"
          opacity="0.8"
        />
      </svg>
    </span>
  )
}
