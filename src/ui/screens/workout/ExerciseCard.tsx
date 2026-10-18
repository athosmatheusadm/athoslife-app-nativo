import { useState, type MouseEvent } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import {
  iconeDoExercicio,
  serieVazia,
  type ExercicioPlano,
  type SerieDetalhe,
} from '@domain/entities/treino'

/**
 * Card de um exercício do dia — dois toggles INDEPENDENTES:
 *
 * 1) Tocar no ÍCONE (miniatura) -> mostra/esconde a prancha (título+
 *    músculo/início/execução, com o mascote ATHOS, `pranchaUrl` — rolável
 *    de lado, já vem com o texto de execução desenhado dentro dela).
 *    Exercícios sem prancha caem no fallback antigo (`imagemUrl` +
 *    "Como executar" em texto). Sem mexer no formulário de séries.
 * 2) Tocar no CARD (nome/reps) -> abre/fecha o formulário de séries/reps
 *    (accordion controlado pelo pai, só um exercício expandido por vez).
 *
 * Separado assim porque o usuário quer conferir a execução sem precisar
 * abrir (ou sem fechar) o formulário de séries, e vice-versa.
 *
 * O check de concluído só aparece quando `podeMarcarConcluido` é true (dia
 * selecionado = hoje) — não faz sentido marcar "feito" num dia que não é
 * hoje sem um controle de data por exercício, que não existe ainda.
 */
export function ExerciseCard(props: {
  item: ExercicioPlano
  expandido: boolean
  podeMarcarConcluido: boolean
  onToggleExpandir: () => void
  onToggleConcluido: () => void
  onAtualizar: (series: readonly SerieDetalhe[]) => void
  onRemover: () => void
}) {
  const { item, expandido } = props
  const { exercicio } = item
  const concluido = item.concluidoHoje
  const [mostrarExecucao, setMostrarExecucao] = useState(false)
  const porTempo = exercicio.medida === 'tempo'
  const { m } = useI18n()
  const t = m.treino.card

  function alternarExecucao(e: MouseEvent) {
    e.stopPropagation()
    setMostrarExecucao((v) => !v)
  }

  function atualizarSerie(index: number, patch: Partial<SerieDetalhe>) {
    props.onAtualizar(item.series.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function adicionarSerie() {
    props.onAtualizar([...item.series, serieVazia()])
  }

  function removerSerie(index: number) {
    props.onAtualizar(item.series.filter((_, i) => i !== index))
  }

  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        expandido ? 'border-brand/50' : 'border-surface-4'
      }`}
    >
      <div className="flex w-full items-center gap-3">
        {props.podeMarcarConcluido && (
          // Alvo de 48px; o círculo visível continua de 28px.
          <button
            onClick={props.onToggleConcluido}
            role="checkbox"
            aria-checked={concluido}
            aria-label={t.marcarFeito(exercicio.nome)}
            className="-ml-2 -mr-1 flex h-12 w-12 flex-none items-center justify-center rounded-full active:bg-content-hi/5"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                concluido ? 'border-brand bg-brand text-brand-ink' : 'border-content-dim text-transparent'
              }`}
            >
              ✓
            </span>
          </button>
        )}

        <button
          onClick={alternarExecucao}
          aria-label={t.verExecucao(exercicio.nome)}
          aria-expanded={mostrarExecucao}
          className={`h-14 w-14 flex-none overflow-hidden rounded-xl border-2 transition-colors ${
            mostrarExecucao ? 'border-brand' : 'border-transparent'
          }`}
        >
          {iconeDoExercicio(exercicio) ? (
            <img
              src={iconeDoExercicio(exercicio) ?? undefined}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="block h-full w-full bg-surface-3" />
          )}
        </button>

        <button
          onClick={props.onToggleExpandir}
          aria-expanded={expandido}
          className={`flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left ${concluido ? 'opacity-60' : ''}`}
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate font-semibold text-content-hi ${concluido ? 'line-through' : ''}`}
            >
              {exercicio.nome}
            </span>
            <span className="block text-micro text-content-low">{m.treino.series(item.series.length)}</span>
          </span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`flex-none text-content-low transition-transform duration-300 ${expandido ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {mostrarExecucao && exercicio.pranchaUrl && (
        <div className="mt-3 -mx-1 overflow-x-auto sem-barra rounded-xl border border-surface-4 px-1">
          <img src={exercicio.pranchaUrl} alt="" className="h-auto max-w-none" style={{ height: 220 }} />
        </div>
      )}

      {mostrarExecucao && !exercicio.pranchaUrl && exercicio.imagemUrl && (
        <div className="mt-3 overflow-hidden rounded-xl border border-surface-4">
          <img src={exercicio.imagemUrl} alt="" className="w-full object-cover" />
        </div>
      )}

      <div
        className="grid transition-all duration-300 ease-athos"
        style={{ gridTemplateRows: expandido ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="mt-3">
            {!exercicio.pranchaUrl && exercicio.comoExecutar.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-bold text-content-hi">{t.comoExecutar}</div>
                <ol className="mt-1.5 space-y-1">
                  {exercicio.comoExecutar.map((passo, i) => (
                    <li key={i} className="flex gap-2 text-micro text-content-mid">
                      <span className="flex-none font-bold text-brand">{i + 1}</span>
                      <span>{passo}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="mt-3.5 space-y-2">
              {item.series.map((serie, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-14 flex-none text-micro text-content-low">{t.serie(index + 1)}</span>
                  {porTempo ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={t.seg}
                      aria-label={t.segAria(index + 1)}
                      value={serie.segundos ?? exercicio.segundosPadrao ?? ''}
                      onChange={(e) =>
                        atualizarSerie(index, { segundos: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className="min-h-11 w-16 rounded-lg border border-surface-4 bg-surface-2 px-2 text-center text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
                    />
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={t.reps}
                      aria-label={t.repsAria(index + 1)}
                      value={serie.reps ?? ''}
                      onChange={(e) =>
                        atualizarSerie(index, { reps: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className="min-h-11 w-16 rounded-lg border border-surface-4 bg-surface-2 px-2 text-center text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
                    />
                  )}
                  {porTempo && <span className="-ml-1 text-micro text-content-low">s</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={porTempo ? t.cargaOpcional : t.carga}
                    aria-label={t.cargaAria(index + 1)}
                    value={serie.cargaKg ?? ''}
                    onChange={(e) =>
                      atualizarSerie(index, { cargaKg: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-surface-4 bg-surface-2 px-2 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
                  />
                  {item.series.length > 1 && (
                    <button
                      onClick={() => removerSerie(index)}
                      aria-label={t.removerSerie(index + 1)}
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-content-low active:bg-content-hi/5 active:text-content-hi"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-3 pt-1">
                <button onClick={adicionarSerie} className="min-h-11 pr-3 text-sm font-semibold text-brand active:opacity-70">
                  {t.adicionarSerie}
                </button>
                <button
                  onClick={props.onRemover}
                  aria-label={t.excluir(exercicio.nome)}
                  className="ml-auto flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-accent-danger/40 text-accent-danger active:bg-accent-danger/10"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
