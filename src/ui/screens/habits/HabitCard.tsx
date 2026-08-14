import {
  faltamParaConquista,
  progressoConquista,
  rotuloStatus,
  statusHabito,
  type Habito,
} from '@domain/entities/habito'

/**
 * Card de hábito — fiel ao print do usuário, com a voz recalibrada.
 *
 * Mudanças frente ao print: nome limpo (sem "vício em"), selo "Firme",
 * e o botão de tropeço em ROXO (acolhe, não alarma). O streak fica em
 * destaque (o número que importa). Peso sem punição.
 *
 * Card burro: quem reage aos botões é a tela-mãe.
 */
export function HabitCard(props: {
  habito: Habito
  onEstouComVontade: () => void
  onTropeco: () => void
}) {
  const { habito } = props
  const status = statusHabito(habito)
  const firme = status === 'firme'
  const pct = progressoConquista(habito.streakAtual, habito.proximaConquista)
  const faltam = faltamParaConquista(habito.streakAtual, habito.proximaConquista)

  // Cor de acento do card: verde quando firme, âmbar em atenção (sóbrio).
  const acento = firme ? '#22c55e' : '#f97316'

  return (
    <div
      className="rounded-2xl border border-surface-4 bg-surface-2 p-4"
      style={{ borderLeftWidth: 3, borderLeftColor: acento }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden="true">{habito.emoji}</span>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-content-hi">{habito.nome}</h3>
          {habito.gatilhos.length > 0 && (
            <p className="text-micro text-content-low">
              Gatilhos: {habito.gatilhos.join(', ')}
            </p>
          )}
        </div>

        {/* Selo + streak em destaque */}
        <div className="flex flex-col items-end">
          <span
            className="rounded-pill px-2.5 py-1 text-micro font-bold"
            style={{ color: acento, backgroundColor: `${acento}22` }}
          >
            {rotuloStatus(status)}
          </span>
          <span className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold" style={{ color: acento }}>
              {habito.streakAtual}
            </span>
            <span className="text-micro text-content-low">dias</span>
          </span>
        </div>
      </div>

      {/* Barra de próxima conquista */}
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-4">
          <div
            className="h-full rounded-full transition-all duration-500 ease-athos"
            style={{ width: `${pct}%`, backgroundColor: acento }}
          />
        </div>
        <p className="mt-1.5 text-micro text-content-low">
          Próxima conquista: {faltam} dias 🎯
        </p>
      </div>

      {/* Ações */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={props.onEstouComVontade}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-[#04120a] transition-transform active:scale-[0.98]"
        >
          Estou com vontade
        </button>
        <button
          type="button"
          onClick={props.onTropeco}
          className="flex-1 rounded-xl border border-accent-recaida/50 py-3 text-sm font-semibold text-accent-recaida transition-colors active:bg-accent-recaida/10"
        >
          Hoje eu cedi
        </button>
      </div>
    </div>
  )
}
