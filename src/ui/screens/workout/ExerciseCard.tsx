import { useState, type MouseEvent } from 'react'
import {
  iconeDoExercicio,
  resumoSeries,
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
          <button
            onClick={props.onToggleConcluido}
            aria-label={concluido ? 'Marcar como não concluído' : 'Marcar como concluído'}
            className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
              concluido ? 'border-brand bg-brand text-[#04120a]' : 'border-surface-4 text-transparent'
            }`}
          >
            ✓
          </button>
        )}

        <button
          onClick={alternarExecucao}
          aria-label={`Ver execução de ${exercicio.nome}`}
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
          className={`flex min-w-0 flex-1 items-center gap-3 text-left ${concluido ? 'opacity-60' : ''}`}
        >
          <span className="min-w-0 flex-1">
            <span
              className={`block truncate font-semibold text-content-hi ${concluido ? 'line-through' : ''}`}
            >
              {exercicio.nome}
            </span>
            <span className="block text-micro text-content-low">{resumoSeries(item.series)}</span>
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
            className={`flex-none text-content-dim transition-transform duration-300 ${expandido ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {mostrarExecucao && exercicio.pranchaUrl && (
        <div className="mt-3 -mx-1 overflow-x-auto rounded-xl border border-surface-4 px-1">
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
                <div className="text-sm font-bold text-content-hi">Como executar</div>
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
                  <span className="w-14 flex-none text-micro text-content-dim">Série {index + 1}</span>
                  {porTempo ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Seg"
                      aria-label={`Segundos da série ${index + 1}`}
                      value={serie.segundos ?? exercicio.segundosPadrao ?? ''}
                      onChange={(e) =>
                        atualizarSerie(index, { segundos: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className="w-16 rounded-lg border border-surface-4 bg-surface-2 px-2 py-1.5 text-sm text-content-hi"
                    />
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Reps"
                      value={serie.reps ?? ''}
                      onChange={(e) =>
                        atualizarSerie(index, { reps: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className="w-16 rounded-lg border border-surface-4 bg-surface-2 px-2 py-1.5 text-sm text-content-hi"
                    />
                  )}
                  {porTempo && <span className="-ml-1 text-micro text-content-dim">s</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={porTempo ? 'Carga (opcional)' : 'Carga (kg)'}
                    aria-label={`Carga da série ${index + 1} em kg`}
                    value={serie.cargaKg ?? ''}
                    onChange={(e) =>
                      atualizarSerie(index, { cargaKg: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    className="flex-1 rounded-lg border border-surface-4 bg-surface-2 px-2 py-1.5 text-sm text-content-hi"
                  />
                  {item.series.length > 1 && (
                    <button
                      onClick={() => removerSerie(index)}
                      aria-label="Remover série"
                      className="flex-none px-1 text-content-dim"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-3 pt-1">
                <button onClick={adicionarSerie} className="text-sm font-semibold text-brand">
                  + adicionar série
                </button>
                <button
                  onClick={props.onRemover}
                  aria-label="Excluir exercício"
                  className="ml-auto flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-accent-danger/40 text-accent-danger"
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
