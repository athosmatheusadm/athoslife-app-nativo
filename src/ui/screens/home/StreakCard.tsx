/**
 * Card de streak da Home — dias seguidos + recorde pessoal.
 *
 * Fiel ao visual de referência (fogo animado, gradiente laranja), mas sem a
 * barra de "próximo nível": esse número depende da lógica de conquistas
 * (avaliar_conquistas() no Postgres), que ainda não está ligada ao app.
 * Melhor não mostrar do que inventar um threshold que não existe de verdade.
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
    <section className="relative overflow-hidden rounded-card border border-accent-energy/15 bg-gradient-to-br from-accent-energy/10 to-surface-1 p-4">
      <div
        className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2), transparent 70%)' }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-block text-3xl motion-safe:animate-[fireF_1.5s_ease-in-out_infinite]" aria-hidden="true">
            🔥
          </span>
          {/* Sequência zerada não é bronca: vira convite (Humane By Design). */}
          {streakAtual > 0 ? (
            <div>
              <div className="text-2xl font-black leading-none tabular-nums text-content-hi">{streakAtual}</div>
              <div className="text-micro font-semibold text-accent-energy">{t.dias(streakAtual)}</div>
            </div>
          ) : (
            <div className="text-sm font-semibold text-content-mid">{t.comece}</div>
          )}
        </div>
        {maiorStreak > 0 && (
          <div className="text-right text-micro font-semibold text-content-low">{t.recorde(maiorStreak)}</div>
        )}
      </div>
      <style>{`
        @keyframes fireF {
          0%, 100% { transform: scale(1) rotate(-3deg); }
          50% { transform: scale(1.12) rotate(3deg); }
        }
      `}</style>
    </section>
  )
}
