import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSessaoTreino } from '@app/SessaoTreinoProvider'
import {
  PASSO_CARGA_KG,
  PASSO_SEGUNDOS,
  adicionarDescanso,
  ajustarCarga,
  ajustarReps,
  ajustarSegundos,
  cancelarCronometro,
  confirmarSerie,
  exercicioAtual,
  formatarCarga,
  formatarRelogio,
  indiceSerie,
  iniciarCronometro,
  irParaExercicio,
  pularDescanso,
  resumirSessao,
  segundosRestantes,
  type SessaoTreino,
} from '@domain/entities/sessaoTreino'
import { rotuloLocal } from '@domain/entities/treino'

/**
 * Treino em andamento — tela cheia (sem bottom nav). Mesmo desenho da Live
 * Activity (athoslife-live-activity-mockup.html): série ativa com steppers de
 * carga/reps + confirmar; descanso em laranja com +15s/pular; e o terceiro
 * estado pedido pelo dono, cronômetro pra exercício por tempo (prancha…).
 * O estado mora no SessaoTreinoProvider — esta tela só mostra e dispara.
 */

const LARANJA = '#FF9159'

export function SessaoTreinoScreen() {
  const { sessao, carregando, agora, aplicar, finalizar, descartar } = useSessaoTreino()
  const navigate = useNavigate()
  const [menuSair, setMenuSair] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [relogio, setRelogio] = useState(() => Date.now())

  // Tempo total do treino (o provider só tica durante contagens).
  useEffect(() => {
    const id = window.setInterval(() => setRelogio(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (carregando) return null
  if (!sessao) return <Navigate to="/treinos" replace />

  const t = Math.max(agora, relogio)

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      await finalizar()
      navigate('/treinos', { replace: true })
    } catch {
      setErro('Não deu pra salvar o treino. Confere a internet e tenta de novo.')
      setSalvando(false)
    }
  }

  if (sessao.status === 'concluida') {
    return <Resumo sessao={sessao} agora={t} salvando={salvando} erro={erro} onSalvar={() => void salvar()} />
  }

  const ex = exercicioAtual(sessao)!
  const serie = indiceSerie(ex) + 1

  return (
    <main className="flex min-h-full flex-col bg-surface-1 px-4 pb-safe-b pt-safe-t">
      <header className="flex items-center justify-between py-3">
        <button
          onClick={() => setMenuSair(true)}
          aria-label="Sair do treino"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-4 text-content-mid"
        >
          ✕
        </button>
        <div className="text-center">
          <div className="text-micro font-bold uppercase tracking-[3px] text-brand">Treino · {rotuloLocal(sessao.local)}</div>
          <div className="font-mono text-sm text-content-low">{formatarRelogio((t - sessao.iniciadoEm) / 1000)}</div>
        </div>
        <span className="w-10" />
      </header>

      {/* Exercícios da sessão */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {sessao.exercicios.map((e, i) => {
          const feito = e.feitas.length >= e.alvo.length
          const ativo = i === sessao.atual
          return (
            <button
              key={e.planoId}
              onClick={() => aplicar((s) => irParaExercicio(s, i))}
              disabled={feito || sessao.status === 'cronometro'}
              className={`flex-none rounded-pill border px-3 py-1.5 text-micro font-semibold ${
                ativo
                  ? 'border-brand bg-brand/15 text-brand'
                  : feito
                    ? 'border-surface-4 text-content-dim line-through'
                    : 'border-surface-4 text-content-mid'
              }`}
            >
              {e.nome} · {e.feitas.length}/{e.alvo.length}
            </button>
          )
        })}
      </div>

      <section className="rounded-[22px] border border-surface-4 bg-surface-2 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="h-11 w-11 flex-none overflow-hidden rounded-xl border border-surface-4 bg-surface-3">
              {ex.iconeUrl && <img src={ex.iconeUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <span
              className="h-2 w-2 flex-none rounded-full"
              style={{ background: sessao.status === 'descanso' ? LARANJA : '#22c55e' }}
            />
            <span className="truncate text-base font-semibold text-content-hi">{ex.nome}</span>
          </div>
          <span className="flex-none rounded-pill bg-surface-3 px-2.5 py-1 font-mono text-micro text-content-low">
            Série {serie} de {ex.alvo.length}
          </span>
        </div>

        {sessao.status === 'descanso' && <Descanso sessao={sessao} agora={t} onAplicar={aplicar} />}
        {sessao.status === 'cronometro' && <Cronometro sessao={sessao} agora={t} onAplicar={aplicar} />}
        {sessao.status === 'serie' && ex.medida === 'reps' && <SerieReps sessao={sessao} onAplicar={aplicar} />}
        {sessao.status === 'serie' && ex.medida === 'tempo' && <SerieTempo sessao={sessao} onAplicar={aplicar} />}
      </section>

      {/* Séries já feitas deste exercício */}
      {ex.feitas.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {ex.feitas.map((f, i) => (
            <li key={i} className="flex justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <span className="text-content-low">Série {i + 1}</span>
              <span className="font-mono text-content-hi">
                {f.segundos !== null ? `${f.segundos}s` : `${f.reps ?? 0} reps`}
                {f.cargaKg !== null && ` · ${formatarCarga(f.cargaKg)} kg`} ✓
              </span>
            </li>
          ))}
        </ul>
      )}

      {menuSair && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Sair do treino">
          <button aria-label="Fechar" onClick={() => setMenuSair(false)} className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-md space-y-2 rounded-t-3xl border-t border-surface-4 bg-surface-2 p-5 pb-safe-b">
            <p className="mb-2 text-center text-sm text-content-low">O que fazer com este treino?</p>
            <button
              onClick={() => {
                setMenuSair(false)
                aplicar((s) => ({ ...s, status: 'concluida', descansoFimEm: null, cronometroFimEm: null }))
              }}
              className="w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-surface-1"
            >
              Encerrar e salvar o que fiz
            </button>
            <button
              onClick={() => navigate('/treinos')}
              className="w-full rounded-pill border border-surface-4 py-3.5 text-sm font-semibold text-content-hi"
            >
              Voltar depois (continua rodando)
            </button>
            <button
              onClick={() => {
                descartar()
                navigate('/treinos', { replace: true })
              }}
              className="w-full py-3 text-sm font-semibold text-accent-danger"
            >
              Descartar treino
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

type Aplicar = (fn: (s: SessaoTreino, agora: number) => SessaoTreino) => void

function Stepper(props: {
  rotulo: string
  valor: string
  onMenos: () => void
  onMais: () => void
}) {
  return (
    <div className="flex-1 rounded-2xl bg-surface-3 px-2 py-2.5 text-center">
      <div className="mb-1.5 text-micro text-content-low">{props.rotulo}</div>
      <div className="flex items-center justify-between gap-1">
        <button
          onClick={props.onMenos}
          aria-label={`Diminuir ${props.rotulo}`}
          className="h-9 w-9 rounded-full border border-surface-4 text-lg text-content-hi active:bg-surface-2"
        >
          −
        </button>
        <span className="min-w-[3rem] font-mono text-lg font-semibold text-content-hi">{props.valor}</span>
        <button
          onClick={props.onMais}
          aria-label={`Aumentar ${props.rotulo}`}
          className="h-9 w-9 rounded-full border border-surface-4 text-lg text-content-hi active:bg-surface-2"
        >
          +
        </button>
      </div>
    </div>
  )
}

function SerieReps({ sessao, onAplicar }: { sessao: SessaoTreino; onAplicar: Aplicar }) {
  return (
    <>
      <div className="flex gap-2.5">
        <Stepper
          rotulo="peso (kg)"
          valor={formatarCarga(sessao.cargaKg)}
          onMenos={() => onAplicar((s) => ajustarCarga(s, -PASSO_CARGA_KG))}
          onMais={() => onAplicar((s) => ajustarCarga(s, PASSO_CARGA_KG))}
        />
        <Stepper
          rotulo="reps"
          valor={String(sessao.reps ?? 0)}
          onMenos={() => onAplicar((s) => ajustarReps(s, -1))}
          onMais={() => onAplicar((s) => ajustarReps(s, 1))}
        />
      </div>
      <button
        onClick={() => onAplicar(confirmarSerie)}
        className="mt-3 w-full rounded-[14px] bg-brand py-3.5 text-sm font-bold text-[#04120a] active:scale-[0.98]"
      >
        Confirmar série ✓
      </button>
    </>
  )
}

function SerieTempo({ sessao, onAplicar }: { sessao: SessaoTreino; onAplicar: Aplicar }) {
  return (
    <>
      <div className="flex gap-2.5">
        <Stepper
          rotulo="tempo"
          valor={formatarRelogio(sessao.segundos ?? 30)}
          onMenos={() => onAplicar((s) => ajustarSegundos(s, -PASSO_SEGUNDOS))}
          onMais={() => onAplicar((s) => ajustarSegundos(s, PASSO_SEGUNDOS))}
        />
        <Stepper
          rotulo="peso (kg)"
          valor={formatarCarga(sessao.cargaKg)}
          onMenos={() => onAplicar((s) => ajustarCarga(s, -PASSO_CARGA_KG))}
          onMais={() => onAplicar((s) => ajustarCarga(s, PASSO_CARGA_KG))}
        />
      </div>
      <button
        onClick={() => onAplicar(iniciarCronometro)}
        className="mt-3 w-full rounded-[14px] bg-brand py-3.5 text-sm font-bold text-[#04120a] active:scale-[0.98]"
      >
        Iniciar cronômetro ▶
      </button>
    </>
  )
}

function Cronometro({ sessao, agora, onAplicar }: { sessao: SessaoTreino; agora: number; onAplicar: Aplicar }) {
  const restante = segundosRestantes(sessao.cronometroFimEm, agora)
  const total = sessao.segundos ?? 30
  const pct = Math.min(100, Math.max(0, ((total - restante) / total) * 100))
  return (
    <div className="py-1 text-center">
      <div className="font-mono text-6xl font-semibold text-brand">{formatarRelogio(restante)}</div>
      <div className="mt-1 text-micro text-content-low">segura firme — conta sozinho</div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAplicar(cancelarCronometro)}
          className="flex-1 rounded-xl border border-surface-4 bg-surface-3 py-2.5 text-sm font-semibold text-content-hi"
        >
          Cancelar
        </button>
        <button
          onClick={() => onAplicar(confirmarSerie)}
          className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-bold text-[#04120a]"
        >
          Concluir agora
        </button>
      </div>
    </div>
  )
}

function Descanso({ sessao, agora, onAplicar }: { sessao: SessaoTreino; agora: number; onAplicar: Aplicar }) {
  const ex = exercicioAtual(sessao)!
  const trocouExercicio = ex.feitas.length === 0
  return (
    <div className="py-1 text-center">
      <div className="font-mono text-6xl font-semibold" style={{ color: LARANJA }}>
        {formatarRelogio(segundosRestantes(sessao.descansoFimEm, agora))}
      </div>
      <div className="mt-1 text-micro text-content-low">
        {trocouExercicio ? `descanso · próximo: ${ex.nome}` : 'descanso até a próxima série'}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAplicar((s, t) => adicionarDescanso(s, 15, t))}
          className="flex-1 rounded-xl border border-surface-4 bg-surface-3 py-2.5 text-sm font-semibold text-content-hi"
        >
          +15s
        </button>
        <button
          onClick={() => onAplicar((s) => pularDescanso(s))}
          className="flex-1 rounded-xl py-2.5 text-sm font-bold text-[#2A1608]"
          style={{ background: LARANJA }}
        >
          Pular
        </button>
      </div>
    </div>
  )
}

function Resumo(props: {
  sessao: SessaoTreino
  agora: number
  salvando: boolean
  erro: string | null
  onSalvar: () => void
}) {
  const r = resumirSessao(props.sessao, props.agora)
  const nada = r.seriesFeitas === 0
  const itens: Array<[string, string]> = [
    ['Duração', `${r.duracaoMin} min`],
    ['Séries', `${r.seriesFeitas}/${r.seriesTotal}`],
    ['Exercícios', `${r.exerciciosFeitos}/${r.exerciciosTotal}`],
    ['Volume', `${r.volumeKg.toLocaleString('pt-BR')} kg`],
  ]
  return (
    <main className="flex min-h-full flex-col justify-center bg-surface-1 px-6 pb-safe-b pt-safe-t animate-rise">
      <div className="text-center text-5xl">{r.completo ? '🏆' : '💪'}</div>
      <h1 className="mt-3 text-center text-2xl font-extrabold text-content-hi">
        {nada ? 'Treino sem séries' : r.completo ? 'Treino completo!' : 'Bom treino!'}
      </h1>
      <p className="mt-1 text-center text-sm text-content-low">
        {nada ? 'Nenhuma série foi registrada — nada vai pro histórico.' : 'Isso vai pro seu histórico e pras conquistas.'}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-2xl border border-surface-4 bg-surface-2 p-3.5 text-center">
            <div className="text-micro text-content-dim">{rotulo}</div>
            <div className="mt-0.5 font-mono text-lg font-semibold text-content-hi">{valor}</div>
          </div>
        ))}
      </div>
      {props.erro && <p className="mt-4 text-center text-sm font-medium text-accent-danger">{props.erro}</p>}
      <button
        onClick={props.onSalvar}
        disabled={props.salvando}
        className="mt-6 w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-surface-1 disabled:opacity-60"
      >
        {props.salvando ? 'Salvando…' : nada ? 'Fechar' : 'Salvar treino'}
      </button>
    </main>
  )
}
