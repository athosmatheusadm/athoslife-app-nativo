import { useEffect, useMemo, useState } from 'react'
import { useSessaoTreino } from '@app/SessaoTreinoProvider'
import {
  DIAS_SEMANA,
  LOCAIS,
  dataDaSemana,
  diaSemanaHoje,
  type DiaSemana,
  type ExercicioCatalogo,
  type ExercicioPlano,
  type LocalTreino,
  type SerieDetalhe,
} from '@domain/entities/treino'
import { treinoPlanoRepository } from '@data/repositories/treinoPlanoRepository'
import { ExerciseIcon } from '@ui/components/ExerciseIcon'
import { ProfileAvatar } from '@ui/components/ProfileAvatar'
import { ExerciseCard } from './ExerciseCard'
import { AddExercisePanel } from './AddExercisePanel'
import { TreinoEmAndamento } from './TreinoEmAndamento'

/**
 * Tela "Treino" — Local (casa/academia) → dia da semana → exercícios do dia.
 * Substitui o modelo anterior de "Treino nomeado" (Peito/Costas como aba).
 */
export function WorkoutScreen() {
  const [local, setLocal] = useState<LocalTreino>('academia')
  const [dia, setDia] = useState<DiaSemana>(diaSemanaHoje())
  const [itens, setItens] = useState<ExercicioPlano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [painelAberto, setPainelAberto] = useState(false)
  const { sessao, iniciar } = useSessaoTreino()

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    void treinoPlanoRepository
      .doDia(local, dia)
      .then((lista) => ativo && setItens(lista))
      .catch(() => ativo && setItens([]))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [local, dia])

  const jaAdicionadosIds = useMemo(() => new Set(itens.map((i) => i.exercicio.id)), [itens])

  async function adicionar(exercicio: ExercicioCatalogo) {
    try {
      const porTempo = exercicio.medida === 'tempo'
      const seriesIniciais: SerieDetalhe[] = Array.from({ length: exercicio.seriesPadrao }, () => ({
        reps: porTempo ? null : exercicio.repeticoesPadrao,
        cargaKg: null,
        segundos: porTempo ? exercicio.segundosPadrao ?? 30 : null,
      }))
      const novo = await treinoPlanoRepository.adicionar({
        local,
        diaSemana: dia,
        exercicioId: exercicio.id,
        series: seriesIniciais,
        ordem: itens.length,
      })
      setItens((atual) => [...atual, novo])
    } catch {
      /* mantém painel aberto se falhar */
    }
  }

  /** Toque no exercício dentro do painel: adiciona se ainda não está no dia, remove se já está. */
  function alternarNoPainel(exercicio: ExercicioCatalogo) {
    const itemExistente = itens.find((i) => i.exercicio.id === exercicio.id)
    if (itemExistente) {
      void remover(itemExistente.id)
    } else {
      void adicionar(exercicio)
    }
  }

  async function atualizar(id: string, series: readonly SerieDetalhe[]) {
    setItens((atual) => atual.map((i) => (i.id === id ? { ...i, series } : i)))
    try {
      await treinoPlanoRepository.atualizarSeries(id, series)
    } catch {
      /* estado local já mudou; próxima troca de dia recarrega o real */
    }
  }

  async function remover(id: string) {
    const anterior = itens
    setItens((atual) => atual.filter((i) => i.id !== id))
    try {
      await treinoPlanoRepository.remover(id)
    } catch {
      setItens(anterior)
    }
  }

  async function alternarConcluido(item: ExercicioPlano) {
    const novoValor = !item.concluidoHoje
    setItens((atual) =>
      atual.map((i) => (i.id === item.id ? { ...i, concluidoHoje: novoValor } : i)),
    )
    try {
      await treinoPlanoRepository.marcarConcluido(item.id, novoValor)
    } catch {
      setItens((atual) =>
        atual.map((i) => (i.id === item.id ? { ...i, concluidoHoje: !novoValor } : i)),
      )
    }
  }

  if (painelAberto) {
    return (
      <AddExercisePanel
        jaAdicionadosIds={jaAdicionadosIds}
        onFechar={() => setPainelAberto(false)}
        onAlternar={alternarNoPainel}
      />
    )
  }

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        <div>
          <div className="text-micro font-bold uppercase tracking-[4px] text-brand">Athos</div>
          <h1 className="text-2xl font-extrabold text-content-hi">Treino</h1>
          <p className="text-sm text-content-low">Seu corpo, suas regras.</p>
        </div>
        <ProfileAvatar />
      </header>

      {/* Seletor de local */}
      <div className="mx-4 mb-3 mt-3 flex gap-1.5 rounded-2xl border border-surface-4 bg-[#0d0d0d] p-1.5">
        {LOCAIS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLocal(l.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
              local === l.id
                ? 'bg-brand text-[#04120a] shadow-[0_0_20px_rgba(34,197,94,0.45)]'
                : 'text-content-low'
            }`}
          >
            <ExerciseIcon chave={l.icone} className="inline-block h-4 w-4" />
            {l.rotulo}
          </button>
        ))}
      </div>

      {/* Tira de dias da semana */}
      <div className="mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {DIAS_SEMANA.map((d) => {
          const ehHoje = d.id === diaSemanaHoje()
          const ativo = d.id === dia
          return (
            <button
              key={d.id}
              onClick={() => setDia(d.id)}
              className={`flex w-14 flex-none flex-col items-center rounded-xl py-2 text-xs font-bold transition-colors ${
                ativo ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'
              }`}
            >
              <span>{ehHoje ? 'Hoje' : d.rotulo}</span>
              <span className={`text-[11px] font-semibold ${ativo ? 'text-[#04120a]/70' : 'text-content-dim'}`}>
                {ehHoje ? d.rotulo : dataDaSemana(d.id)}
              </span>
            </button>
          )
        })}
      </div>

      {sessao ? (
        <TreinoEmAndamento />
      ) : (
        dia === diaSemanaHoje() &&
        !carregando &&
        itens.length > 0 && (
          // Liga a sessão da Live Activity; a tela continua esta mesma.
          <button
            onClick={() => iniciar({ itens, local, diaSemana: dia })}
            className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-2xl border border-brand/50 bg-brand/10 py-3.5 text-sm font-extrabold text-brand active:scale-[0.98]"
          >
            ▶ Começar treino
            <span className="block text-micro font-normal text-content-low">
              Série, carga e descanso aparecem na tela de bloqueio
            </span>
          </button>
        )
      )}

      <div className="mx-4 mb-2 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-content-hi">Exercícios do dia</h2>
        <span className="text-micro text-content-dim">
          {itens.length} {itens.length === 1 ? 'exercício' : 'exercícios'}
        </span>
      </div>

      <div className="mx-4 space-y-2.5">
        {carregando ? (
          <p className="py-10 text-center text-micro text-content-dim">Carregando…</p>
        ) : (
          itens.map((item) => (
            <ExerciseCard
              key={item.id}
              item={item}
              expandido={expandidoId === item.id}
              podeMarcarConcluido={dia === diaSemanaHoje()}
              onToggleExpandir={() => setExpandidoId((v) => (v === item.id ? null : item.id))}
              onToggleConcluido={() => void alternarConcluido(item)}
              onAtualizar={(s) => void atualizar(item.id, s)}
              onRemover={() => void remover(item.id)}
            />
          ))
        )}

        <button
          onClick={() => setPainelAberto(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-brand/40 p-3.5 text-left"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-3 text-xl text-brand">
            +
          </span>
          <span>
            <span className="block text-sm font-semibold text-content-hi">Adicionar exercício</span>
            <span className="block text-micro text-content-low">Personalize seu treino do seu jeito</span>
          </span>
        </button>
      </div>
    </main>
  )
}
