import { useEffect, useState } from 'react'
import { useSessaoTreino } from '@app/SessaoTreinoProvider'
import {
  exercicioAtual,
  formatarRelogio,
  indiceSerie,
  resumirSessao,
  segundosRestantes,
} from '@domain/entities/sessaoTreino'

const LARANJA = '#FF9159'

/**
 * Faixa de "treino em andamento" no topo da tela de Treino.
 *
 * Decisão do dono (2026-09-27): a tela de Treino continua a mesma de sempre;
 * "Começar treino" só liga a sessão que alimenta a Live Activity — o card com
 * peso/reps/descanso aparece na TELA DE BLOQUEIO, não dentro do app. Aqui fica
 * só o status (tempo, série/descanso) e o "Encerrar", que abre o resumo.
 */
export function TreinoEmAndamento() {
  const { sessao, agora, finalizar, descartar } = useSessaoTreino()
  const [relogio, setRelogio] = useState(() => Date.now())
  const [painel, setPainel] = useState<null | 'resumo' | 'parar'>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setRelogio(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!sessao) return null
  const t = Math.max(agora, relogio)
  const ex = exercicioAtual(sessao)

  let status: string
  let cor = '#22c55e'
  if (sessao.status === 'concluida' || !ex) {
    status = 'Todas as séries feitas 🏆'
  } else if (sessao.status === 'descanso') {
    status = `Descanso ${formatarRelogio(segundosRestantes(sessao.descansoFimEm, t))}`
    cor = LARANJA
  } else if (sessao.status === 'cronometro') {
    status = `${ex.nome} · ${formatarRelogio(segundosRestantes(sessao.cronometroFimEm, t))}`
  } else {
    status = `${ex.nome} · série ${indiceSerie(ex) + 1} de ${ex.alvo.length}`
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      await finalizar()
      setPainel(null)
    } catch {
      setErro('Não deu pra salvar o treino. Confere a internet e tenta de novo.')
    } finally {
      setSalvando(false)
    }
  }

  const r = resumirSessao(sessao, t)
  const nada = r.seriesFeitas === 0

  return (
    <>
      <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-brand/40 bg-brand/10 p-3">
        <span className="relative flex h-2.5 w-2.5 flex-none">
          <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: cor }} />
          <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-micro font-bold uppercase tracking-[2px] text-brand">
            Treino em andamento · {formatarRelogio((t - sessao.iniciadoEm) / 1000)}
          </div>
          <div className="truncate text-sm text-content-mid">{status}</div>
          <div className="text-[11px] text-content-dim">Controle pela tela de bloqueio 🔒</div>
        </div>
        <div className="flex flex-none flex-col gap-1.5">
          <button
            onClick={() => setPainel('resumo')}
            className="rounded-pill bg-brand px-3 py-1.5 text-micro font-bold text-[#04120a]"
          >
            Encerrar
          </button>
          <button
            onClick={() => setPainel('parar')}
            aria-label="Parar treino sem salvar"
            className="rounded-pill border border-accent-danger/50 px-3 py-1.5 text-micro font-bold text-accent-danger"
          >
            Parar
          </button>
        </div>
      </div>

      {painel === 'parar' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Parar treino">
          <button aria-label="Fechar" onClick={() => setPainel(null)} className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-2 p-5 pb-safe-b animate-rise">
            <h2 className="text-center text-lg font-extrabold text-content-hi">Parar o treino?</h2>
            <p className="mt-1 text-center text-sm text-content-low">
              Ele sai da tela de bloqueio e nada do que foi feito agora é salvo. Sua ficha continua igual.
            </p>
            <button
              onClick={() => {
                descartar()
                setPainel(null)
              }}
              className="mt-5 w-full rounded-pill bg-accent-danger py-3.5 text-sm font-bold text-white"
            >
              Parar treino
            </button>
            <button onClick={() => setPainel(null)} className="mt-1 w-full py-3 text-sm font-semibold text-content-mid">
              Continuar treinando
            </button>
          </div>
        </div>
      )}

      {(painel === 'resumo' || sessao.status === 'concluida') && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Resumo do treino">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-2 p-5 pb-safe-b animate-rise">
            <div className="text-center text-4xl">{r.completo ? '🏆' : '💪'}</div>
            <h2 className="mt-2 text-center text-xl font-extrabold text-content-hi">
              {nada ? 'Treino sem séries' : r.completo ? 'Treino completo!' : 'Bom treino!'}
            </h2>
            <p className="mt-1 text-center text-sm text-content-low">
              {nada
                ? 'Nenhuma série foi confirmada — nada vai pro histórico.'
                : 'Isso vai pro seu histórico e pras conquistas.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(
                [
                  ['Duração', `${r.duracaoMin} min`],
                  ['Séries', `${r.seriesFeitas}/${r.seriesTotal}`],
                  ['Exercícios', `${r.exerciciosFeitos}/${r.exerciciosTotal}`],
                  ['Volume', `${r.volumeKg.toLocaleString('pt-BR')} kg`],
                ] as const
              ).map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-xl bg-surface-3 p-3 text-center">
                  <div className="text-micro text-content-dim">{rotulo}</div>
                  <div className="font-mono text-base font-semibold text-content-hi">{valor}</div>
                </div>
              ))}
            </div>
            {erro && <p className="mt-3 text-center text-sm font-medium text-accent-danger">{erro}</p>}
            <button
              onClick={() => void salvar()}
              disabled={salvando}
              className="mt-4 w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-surface-1 disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : nada ? 'Fechar' : 'Salvar treino'}
            </button>
            {sessao.status !== 'concluida' && (
              <button
                onClick={() => setPainel(null)}
                disabled={salvando}
                className="mt-1 w-full py-3 text-sm font-semibold text-content-mid"
              >
                Continuar treinando
              </button>
            )}
            {!nada && (
              <button
                onClick={() => {
                  descartar()
                  setPainel(null)
                }}
                disabled={salvando}
                className="w-full py-2 text-sm font-semibold text-accent-danger"
              >
                Descartar treino
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
