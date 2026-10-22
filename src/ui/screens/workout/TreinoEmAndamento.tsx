import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActivityIcon } from '@ui/components/ActivityIcon'
import { useSessaoTreino } from '@app/SessaoTreinoProvider'
import {
  emPreparo,
  exercicioAtual,
  formatarRelogio,
  indiceSerie,
  resumirSessao,
  segundosRestantes,
} from '@domain/entities/sessaoTreino'
import { useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { avisar, vibrar } from '@ui/feedback'

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
  const [erro, setErro] = useState(false)
  const { m, idioma } = useI18n()
  const tx = m.treino.andamento
  const navigate = useNavigate()
  // Voltar do Android fecha a janela de Parar/Resumo antes de qualquer coisa.
  useFecharNoVoltar(painel !== null, () => setPainel(null))

  useEffect(() => {
    const id = window.setInterval(() => setRelogio(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (!sessao) return null
  const t = Math.max(agora, relogio)
  const ex = exercicioAtual(sessao)

  let status: string
  let cor = 'bg-brand'
  if (sessao.status === 'concluida' || !ex) {
    status = tx.tudoFeito
  } else if (sessao.status === 'descanso') {
    status = tx.descanso(formatarRelogio(segundosRestantes(sessao.descansoFimEm, t)))
    cor = 'bg-accent-energy'
  } else if (emPreparo(sessao, t)) {
    status = tx.preparo(ex.nome, segundosRestantes(sessao.cronometroInicioEm, t))
  } else if (sessao.status === 'cronometro') {
    status = `${ex.nome} · ${formatarRelogio(segundosRestantes(sessao.cronometroFimEm, t))}`
  } else {
    status = tx.serieDe(ex.nome, indiceSerie(ex) + 1, ex.alvo.length)
  }

  async function salvar(story = false) {
    setSalvando(true)
    setErro(false)
    try {
      const salvou = r.seriesFeitas > 0
      await finalizar()
      setPainel(null)
      if (salvou) {
        vibrar.sucesso()
        avisar.ok(tx.salvo)
      }
      // O editor lê o treino recém-salvo do histórico (com recorde pessoal).
      if (story && salvou) navigate('/story', { state: { modo: 'gym' } })
    } catch {
      setErro(true)
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
          <span className={`absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping ${cor}`} />
          <span className={`relative h-2.5 w-2.5 rounded-full ${cor}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-micro font-bold uppercase tracking-[2px] text-brand">
            {tx.titulo(formatarRelogio((t - sessao.iniciadoEm) / 1000))}
          </div>
          <div className="truncate text-sm text-content-mid" aria-live="polite">{status}</div>
          <div className="text-micro text-content-low">{tx.bloqueio}</div>
        </div>
        <div className="flex flex-none flex-col gap-1.5">
          <button
            onClick={() => setPainel('resumo')}
            className="min-h-11 rounded-pill bg-brand px-4 text-sm font-bold text-brand-ink active:scale-95"
          >
            {tx.encerrar}
          </button>
          <button
            onClick={() => setPainel('parar')}
            aria-label={tx.pararAria}
            className="min-h-11 rounded-pill border border-accent-danger/50 px-4 text-sm font-bold text-accent-danger active:bg-accent-danger/10"
          >
            {tx.parar}
          </button>
        </div>
      </div>

      {painel === 'parar' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={tx.pararTitulo}>
          <button aria-label={tx.continuar} onClick={() => setPainel(null)} className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-2 p-5 pb-safe-b animate-rise">
            <h2 className="text-center text-lg font-extrabold text-content-hi">{tx.pararTitulo}</h2>
            <p className="mt-1 text-center text-sm text-content-low">{tx.pararTexto}</p>
            <button
              onClick={() => {
                descartar()
                setPainel(null)
              }}
              className="mt-5 min-h-12 w-full rounded-pill bg-accent-danger text-sm font-bold text-white active:scale-[0.98]"
            >
              {tx.pararConfirmar}
            </button>
            <button onClick={() => setPainel(null)} className="mt-1 min-h-12 w-full text-sm font-semibold text-content-mid">
              {tx.continuar}
            </button>
          </div>
        </div>
      )}

      {(painel === 'resumo' || sessao.status === 'concluida') && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={tx.resumoAria}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-2 p-5 pb-safe-b animate-rise">
            <div className="text-center text-4xl">{r.completo ? '🏆' : '💪'}</div>
            <h2 className="mt-2 text-center text-xl font-extrabold text-content-hi">
              {nada ? tx.semSeries : r.completo ? tx.completo : tx.bom}
            </h2>
            <p className="mt-1 text-center text-sm text-content-low">
              {nada ? tx.nadaVai : tx.vaiPro}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(
                [
                  [tx.duracao, `${r.duracaoMin} min`],
                  [tx.seriesRot, `${r.seriesFeitas}/${r.seriesTotal}`],
                  [tx.exercicios, `${r.exerciciosFeitos}/${r.exerciciosTotal}`],
                  [tx.volume, `${r.volumeKg.toLocaleString(idioma)} kg`],
                ] as const
              ).map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-xl bg-surface-3 p-3 text-center">
                  <div className="text-micro text-content-low">{rotulo}</div>
                  <div className="font-mono text-base font-semibold text-content-hi">{valor}</div>
                </div>
              ))}
            </div>
            {erro && <p role="alert" className="mt-3 text-center text-sm font-medium text-accent-danger">{tx.erroSalvar}</p>}
            <button
              onClick={() => void salvar()}
              disabled={salvando}
              className="mt-4 min-h-12 w-full rounded-pill bg-brand text-sm font-bold text-surface-1 active:scale-[0.98] disabled:opacity-60"
            >
              {salvando ? tx.salvando : nada ? tx.fechar : tx.salvar}
            </button>
            {!nada && (
              <button
                onClick={() => void salvar(true)}
                disabled={salvando}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-surface-4 text-sm font-semibold text-content-hi active:bg-content-hi/5 disabled:opacity-60"
              >
                <ActivityIcon icone="camera" tile={false} cor="inherit" className="h-5 w-5" />
                {m.story.postar}
              </button>
            )}
            {sessao.status !== 'concluida' && (
              <button
                onClick={() => setPainel(null)}
                disabled={salvando}
                className="mt-1 min-h-12 w-full text-sm font-semibold text-content-mid"
              >
                {tx.continuar}
              </button>
            )}
            {!nada && (
              <button
                onClick={() => {
                  descartar()
                  setPainel(null)
                }}
                disabled={salvando}
                className="min-h-12 w-full text-sm font-semibold text-accent-danger"
              >
                {tx.descartar}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
