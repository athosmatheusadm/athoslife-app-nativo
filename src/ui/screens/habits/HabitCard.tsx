import { ActivityIcon } from '@ui/components/ActivityIcon'
import { useEffect, useState } from 'react'
import {
  faltamParaConquista,
  GATILHOS,
  progressoConquista,
  semanaDoHabito,
  statusHabito,
  vitoriasNaSemana,
  type EstadoDia,
  type EventoHabito,
  type Habito,
} from '@domain/entities/habito'
import { dataLocalISO } from '@domain/rules/datas'
import { agendarLembrete, buscarLembrete, cancelarLembrete } from '@data/notifications/habitReminders'
import { useI18n } from '@/i18n/I18nProvider'

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
  /** Vitórias e tropeços (todos os hábitos; o card filtra o dele). */
  eventos: readonly EventoHabito[]
  onEstouComVontade: () => void
  onTropeco: (gatilho: string | null) => void
  /** Check-in "Fiz hoje" do tipo "construir" — persiste via RPC. */
  onFizHoje: () => void
  /** Desativa o hábito (some da lista; histórico fica no banco). */
  onExcluir: () => Promise<void>
  feitoHoje: boolean
}) {
  const { habito } = props
  const { m } = useI18n()
  const t = m.habitos.card
  const [aberto, setAberto] = useState(false)
  // Recaída zera a sequência: pede um 2º toque (antes registrava no 1º, e um
  // toque sem querer apagava semanas). Texto acolhedor, nunca bronca.
  const [confirmandoTropeco, setConfirmandoTropeco] = useState(false)
  const [gatilhoTropeco, setGatilhoTropeco] = useState<string | null>(null)
  const nomeGatilho = (g: string) => (m.habitos.gatilhos as Record<string, string>)[g] ?? g
  const status = statusHabito(habito)
  const firme = status === 'firme'
  const pct = progressoConquista(habito.streakAtual, habito.proximaConquista)
  const faltam = faltamParaConquista(habito.streakAtual, habito.proximaConquista)
  const vitorias = vitoriasNaSemana(habito.id, props.eventos, dataLocalISO())

  // Lembrete local (Camada 1 — ver docs/ATHOSlife_Notificacoes_Life.md).
  // Só carrega quando o card abre, pra não pedir permissão de notificação
  // sem o usuário ter pedido nada ainda.
  const [lembrete, setLembrete] = useState<string | null>(null)
  const [lembreteErro, setLembreteErro] = useState<string | null>(null)
  const [horaEscolhida, setHoraEscolhida] = useState('19:00')

  // Excluir pede confirmação no próprio card (mesmo padrão do "Parar" do
  // treino): 1º toque mostra o aviso, 2º confirma.
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [exclusaoErro, setExclusaoErro] = useState<string | null>(null)

  async function excluir() {
    setExcluindo(true)
    setExclusaoErro(null)
    try {
      await props.onExcluir()
    } catch {
      setExclusaoErro(m.habitos.excluirErro)
      setExcluindo(false)
    }
  }

  useEffect(() => {
    if (!aberto || habito.tipo !== 'construir') return
    buscarLembrete(habito.id)
      .then(setLembrete)
      .catch(() => setLembreteErro(t.lembreteSoApp))
  }, [aberto, habito.id, habito.tipo])

  async function salvarLembrete() {
    setLembreteErro(null)
    try {
      await agendarLembrete({ habitoId: habito.id, nomeHabito: habito.nome, horaMinuto: horaEscolhida })
      setLembrete(horaEscolhida)
    } catch {
      setLembreteErro(t.lembreteErro)
    }
  }

  async function removerLembrete() {
    setLembreteErro(null)
    try {
      await cancelarLembrete(habito.id)
      setLembrete(null)
    } catch {
      setLembreteErro(t.lembreteRemoverErro)
    }
  }

  // Verde firme / roxo atenção — a mesma dupla que já rege a recaída no app.
  const acento = firme
    ? { texto: 'text-brand', fundo: 'bg-brand', borda: 'border-l-brand', selo: 'bg-brand/15 text-brand' }
    : { texto: 'text-accent-recaida', fundo: 'bg-accent-recaida', borda: 'border-l-accent-recaida', selo: 'bg-accent-recaida/15 text-accent-recaidaSoft' }

  const botaoTropeco = (rotulo: string) =>
    confirmandoTropeco ? (
      <div className="mt-3 rounded-xl border border-accent-recaida/40 bg-accent-recaida/10 p-3">
        <p className="text-sm text-content-mid">{t.confirmarTropeco}</p>
        {habito.tipo === 'evitar' && (
          <>
            <p className="mt-2 text-micro text-content-low">{t.gatilhoPergunta}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {GATILHOS.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gatilhoTropeco === g}
                  onClick={() => setGatilhoTropeco((v) => (v === g ? null : g))}
                  className={`min-h-9 rounded-pill border px-3 text-micro font-semibold transition-colors ${
                    gatilhoTropeco === g ? 'border-accent-recaida bg-accent-recaida/20 text-content-hi' : 'border-surface-4 text-content-mid'
                  }`}
                >
                  {nomeGatilho(g)}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirmandoTropeco(false)
              setGatilhoTropeco(null)
            }}
            className="min-h-11 flex-1 rounded-lg border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5"
          >
            {m.comum.cancelar}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmandoTropeco(false)
              props.onTropeco(gatilhoTropeco)
              setGatilhoTropeco(null)
            }}
            className="min-h-11 flex-1 rounded-lg bg-accent-recaida text-sm font-bold text-white active:scale-[0.98]"
          >
            {t.registrar}
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setConfirmandoTropeco(true)}
        className="min-h-12 flex-1 rounded-xl border border-accent-recaida/50 text-sm font-semibold text-accent-recaidaSoft transition-colors active:bg-accent-recaida/10"
      >
        {rotulo}
      </button>
    )

  return (
    <div className={`overflow-hidden rounded-2xl border border-l-[3px] border-surface-4 bg-surface-2 ${acento.borda}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex min-h-16 w-full items-center gap-3 p-4 text-left active:bg-content-hi/5"
      >
        <ActivityIcon icone={habito.icone ?? habito.categoria} />

        <span className="min-w-0 flex-1 truncate font-bold text-content-hi">{habito.nome}</span>

        <span className="flex flex-none items-center gap-2">
          <span className="flex items-baseline gap-1">
            <span className={`text-xl font-extrabold tabular-nums ${acento.texto}`}>
              {habito.streakAtual}
            </span>
            <span className="text-micro text-content-low">{t.dias(habito.streakAtual)}</span>
          </span>
          <span className={`h-2.5 w-2.5 rounded-full ${acento.fundo}`} aria-hidden="true" />
        </span>
      </button>

      {aberto && (
        <div className="px-4 pb-4">
          <SemanaDoHabito habito={habito} eventos={props.eventos} rotulo={t.semana} legenda={t.legenda} />
          <p className="mt-2 text-micro text-content-low">
            {t.melhor(habito.melhorStreak)}
            {habito.tipo === 'evitar' && vitorias > 0 && <span className="text-brand"> · {t.vitorias(vitorias)}</span>}
          </p>
          {habito.gatilhos.length > 0 && (
            <p className="mt-1 text-micro text-content-low">{t.gatilhos(habito.gatilhos.map(nomeGatilho).join(', '))}</p>
          )}
          {habito.tipo === 'evitar' && habito.horarioRisco && (
            <p className="mt-1 text-micro text-content-low">{t.horarioRisco(habito.horarioRisco.slice(0, 5))}</p>
          )}

          <span className={`mt-2 inline-block rounded-pill px-2.5 py-1 text-micro font-bold ${acento.selo}`}>
            {firme ? t.firme : t.atencao}
          </span>

          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-4">
              <div
                className={`h-full w-full origin-left rounded-full transition-transform duration-500 ease-athos ${acento.fundo}`}
                style={{ transform: `scaleX(${pct / 100})` }}
              />
            </div>
            <p className="mt-1.5 text-micro text-content-low">{t.proxima(faltam)}</p>
          </div>

          {habito.tipo === 'construir' ? (
            confirmandoTropeco ? (
              botaoTropeco(t.naoConsegui)
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={props.feitoHoje}
                  onClick={props.onFizHoje}
                  className="min-h-12 flex-1 rounded-xl bg-brand text-sm font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                  {props.feitoHoje ? t.feitoHoje : t.fizHoje}
                </button>
                {botaoTropeco(t.naoConsegui)}
              </div>
            )
          ) : null}

          {habito.tipo === 'construir' && (
            <div className="mt-3 rounded-xl border border-surface-4 bg-surface-3 p-3">
              <p className="text-micro font-bold uppercase tracking-wide text-content-low">{t.lembrete}</p>
              {lembrete ? (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-content-hi">{t.todoDia(lembrete)}</span>
                  <button
                    type="button"
                    onClick={() => void removerLembrete()}
                    className="-mr-2 min-h-11 px-3 text-sm font-bold text-content-mid active:text-content-hi"
                  >
                    {t.remover}
                  </button>
                </div>
              ) : (
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="time"
                    value={horaEscolhida}
                    onChange={(e) => setHoraEscolhida(e.target.value)}
                    aria-label={t.horaAria}
                    className="min-h-11 rounded-lg border border-surface-4 bg-surface-2 px-2 text-base text-content-hi"
                  />
                  <button
                    type="button"
                    onClick={() => void salvarLembrete()}
                    className="min-h-11 flex-1 rounded-lg bg-brand text-sm font-bold text-brand-ink active:scale-[0.98]"
                  >
                    {t.lembrar}
                  </button>
                </div>
              )}
              {lembreteErro && <p role="alert" className="mt-1.5 text-micro text-accent-danger">{lembreteErro}</p>}
            </div>
          )}

          {habito.tipo !== 'construir' && (
            confirmandoTropeco ? (
              botaoTropeco(t.cedi)
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={props.onEstouComVontade}
                  className="min-h-12 flex-1 rounded-xl bg-brand text-sm font-bold text-brand-ink transition-transform active:scale-[0.98]"
                >
                  {t.vontade}
                </button>
                {botaoTropeco(t.cedi)}
              </div>
            )
          )}

          <div className="mt-4 border-t border-surface-4 pt-3">
            {confirmarExclusao ? (
              <div className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3">
                <p className="text-sm font-semibold text-content-hi">{m.habitos.excluirTitulo(habito.nome)}</p>
                <p className="mt-1 text-micro text-content-low">
                  {m.habitos.excluirLead}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={excluindo}
                    onClick={() => setConfirmarExclusao(false)}
                    className="min-h-11 flex-1 rounded-lg border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5"
                  >
                    {m.comum.cancelar}
                  </button>
                  <button
                    type="button"
                    disabled={excluindo}
                    onClick={() => void excluir()}
                    className="min-h-11 flex-1 rounded-lg bg-accent-danger text-sm font-bold text-white disabled:opacity-60"
                  >
                    {excluindo ? m.habitos.excluindo : m.habitos.excluir}
                  </button>
                </div>
                {exclusaoErro && <p role="alert" className="mt-1.5 text-micro text-accent-danger">{exclusaoErro}</p>}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarExclusao(true)}
                className="min-h-11 w-full text-center text-sm font-semibold text-content-low active:text-content-hi"
              >
                {m.habitos.excluir}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const COR_DIA: Record<EstadoDia, string> = {
  antes: 'border border-dashed border-surface-4',
  vazio: 'bg-surface-4',
  firme: 'bg-brand/35',
  feito: 'bg-brand',
  venceu: 'bg-brand ring-2 ring-brand/40 ring-offset-2 ring-offset-surface-2',
  tropecou: 'bg-accent-recaida',
}

/** 7 bolinhas: firme, vontade vencida, tropeço (evitar) ou feito (construir). */
function SemanaDoHabito(props: { habito: Habito; eventos: readonly EventoHabito[]; rotulo: string; legenda: Record<string, string> }) {
  const { idioma } = useI18n()
  const dias = semanaDoHabito(props.habito, props.eventos, dataLocalISO())
  const letra = new Intl.DateTimeFormat(idioma, { weekday: 'narrow' })
  return (
    <div className="mt-3">
      <p className="text-micro font-bold uppercase tracking-wide text-content-low">{props.rotulo}</p>
      <ol className="mt-2 flex justify-between gap-1">
        {dias.map((d) => (
          <li key={d.data} className="flex flex-1 flex-col items-center gap-1" title={props.legenda[d.estado === 'antes' ? 'vazio' : d.estado]}>
            <span className={`h-3.5 w-3.5 rounded-full ${COR_DIA[d.estado]}`} />
            <span className="text-micro uppercase text-content-low" aria-hidden="true">{letra.format(new Date(`${d.data}T12:00:00`))}</span>
            <span className="sr-only">{`${d.data}: ${props.legenda[d.estado === 'antes' ? 'vazio' : d.estado]}`}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
