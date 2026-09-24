import { useEffect, useState } from 'react'
import {
  faltamParaConquista,
  progressoConquista,
  rotuloStatus,
  statusHabito,
  type Habito,
} from '@domain/entities/habito'
import { agendarLembrete, buscarLembrete, cancelarLembrete } from '@data/notifications/habitReminders'

/**
 * Card de hábito — fiel ao print do usuário, com a voz recalibrada.
 *
 * Colapsado por padrão: só nome, streak e a cor (verde firme / roxo atenção
 * — mesma paleta do "termômetro" do Life, nunca vermelho/laranja de alarme).
 * Tocar expande e mostra gatilhos, progresso e os dois botões de ação.
 *
 * Tipo "evitar" (reduzir algo): "Estou com vontade" / "Hoje eu cedi".
 * Tipo "construir" (aumentar algo, ex. leitura): não faz sentido abrir o
 * assistente de vontade, então vira "Fiz hoje" / "Não consegui hoje" — o
 * segundo ainda cai em onTropeco (zera o streak, o mecanismo serve pros
 * dois sentidos), o primeiro chama a RPC registrar_checkin_habito (ver
 * habitosRepository.registrarCheckin) — persiste de verdade.
 *
 * Card burro: quem reage aos botões é a tela-mãe.
 */
export function HabitCard(props: {
  habito: Habito
  onEstouComVontade: () => void
  onTropeco: () => void
  /** Check-in "Fiz hoje" do tipo "construir" — persiste via RPC. */
  onFizHoje: () => void
  feitoHoje: boolean
}) {
  const { habito } = props
  const [aberto, setAberto] = useState(false)
  const status = statusHabito(habito)
  const firme = status === 'firme'
  const pct = progressoConquista(habito.streakAtual, habito.proximaConquista)
  const faltam = faltamParaConquista(habito.streakAtual, habito.proximaConquista)

  // Lembrete local (Camada 1 — ver docs/ATHOSlife_Notificacoes_Life.md).
  // Só carrega quando o card abre, pra não pedir permissão de notificação
  // sem o usuário ter pedido nada ainda.
  const [lembrete, setLembrete] = useState<string | null>(null)
  const [lembreteErro, setLembreteErro] = useState<string | null>(null)
  const [horaEscolhida, setHoraEscolhida] = useState('19:00')

  useEffect(() => {
    if (!aberto || habito.tipo !== 'construir') return
    buscarLembrete(habito.id)
      .then(setLembrete)
      .catch(() => setLembreteErro('Lembrete só funciona no app instalado, não aqui no navegador.'))
  }, [aberto, habito.id, habito.tipo])

  async function salvarLembrete() {
    setLembreteErro(null)
    try {
      await agendarLembrete({ habitoId: habito.id, nomeHabito: habito.nome, horaMinuto: horaEscolhida })
      setLembrete(horaEscolhida)
    } catch {
      setLembreteErro('Não deu pra agendar — checa a permissão de notificação do app.')
    }
  }

  async function removerLembrete() {
    setLembreteErro(null)
    try {
      await cancelarLembrete(habito.id)
      setLembrete(null)
    } catch {
      setLembreteErro('Não deu pra remover o lembrete agora.')
    }
  }

  // Verde firme / roxo atenção — a mesma dupla que já rege a recaída no app.
  const acento = firme ? '#22c55e' : '#8b5cf6'

  return (
    <div
      className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2"
      style={{ borderLeftWidth: 3, borderLeftColor: acento }}
    >
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="text-2xl" aria-hidden="true">{habito.emoji}</span>

        <span className="min-w-0 flex-1 truncate font-bold text-content-hi">{habito.nome}</span>

        <span className="flex flex-none items-center gap-2">
          <span className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold" style={{ color: acento }}>
              {habito.streakAtual}
            </span>
            <span className="text-micro text-content-low">dias</span>
          </span>
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: acento }}
            aria-hidden="true"
          />
        </span>
      </button>

      {aberto && (
        <div className="px-4 pb-4">
          {habito.gatilhos.length > 0 && (
            <p className="text-micro text-content-low">
              Gatilhos: {habito.gatilhos.join(', ')}
            </p>
          )}

          <span
            className="mt-2 inline-block rounded-pill px-2.5 py-1 text-micro font-bold"
            style={{ color: acento, backgroundColor: `${acento}22` }}
          >
            {rotuloStatus(status)}
          </span>

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

          {habito.tipo === 'construir' ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={props.feitoHoje}
                onClick={props.onFizHoje}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-[#04120a] transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {props.feitoHoje ? 'Feito hoje ✓' : 'Fiz hoje'}
              </button>
              <button
                type="button"
                onClick={props.onTropeco}
                className="flex-1 rounded-xl border border-accent-recaida/50 py-3 text-sm font-semibold text-accent-recaida transition-colors active:bg-accent-recaida/10"
              >
                Não consegui hoje
              </button>
            </div>
          ) : null}

          {habito.tipo === 'construir' && (
            <div className="mt-3 rounded-xl border border-surface-4 bg-surface-3 p-3">
              <p className="text-micro font-bold uppercase tracking-wide text-content-dim">
                Lembrete diário
              </p>
              {lembrete ? (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-content-hi">Todo dia às {lembrete}</span>
                  <button
                    type="button"
                    onClick={() => void removerLembrete()}
                    className="text-micro font-bold text-accent-recaida"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="time"
                    value={horaEscolhida}
                    onChange={(e) => setHoraEscolhida(e.target.value)}
                    className="rounded-lg border border-surface-4 bg-surface-2 px-2 py-1.5 text-sm text-content-hi"
                  />
                  <button
                    type="button"
                    onClick={() => void salvarLembrete()}
                    className="flex-1 rounded-lg bg-brand py-1.5 text-sm font-bold text-[#04120a]"
                  >
                    Lembrar
                  </button>
                </div>
              )}
              {lembreteErro && <p className="mt-1.5 text-[11px] text-accent-danger">{lembreteErro}</p>}
            </div>
          )}

          {habito.tipo !== 'construir' && (
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
          )}
        </div>
      )}
    </div>
  )
}
