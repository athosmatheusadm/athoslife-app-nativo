import { useEffect, useMemo, useState } from 'react'
import { useSessaoTreino } from '@app/SessaoTreinoProvider'
import {
  DIAS_SEMANA,
  LOCAIS,
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
import { LifeFlutuante } from '@ui/components/life/LifeFlutuante'
import { aoAplicarPlano, localDoUltimoPlano } from '@app/eventosLife'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

/** Data deste dia da semana na semana atual (seg..dom). */
function dataDoDia(dia: DiaSemana): Date {
  const hoje = new Date()
  const idxHoje = (hoje.getDay() + 6) % 7
  const idx = DIAS_SEMANA.findIndex((d) => d.id === dia)
  const d = new Date(hoje)
  d.setDate(hoje.getDate() + (idx - idxHoje))
  return d
}

/**
 * Tela "Treino" — Local (casa/academia) → dia da semana → exercícios do dia.
 * Substitui o modelo anterior de "Treino nomeado" (Peito/Costas como aba).
 */
export function WorkoutScreen() {
  const [local, setLocal] = useState<LocalTreino>(() => localDoUltimoPlano() ?? 'academia')
  const [dia, setDia] = useState<DiaSemana>(diaSemanaHoje())
  const [itens, setItens] = useState<ExercicioPlano[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState(false)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [painelAberto, setPainelAberto] = useState(false)
  const { sessao, iniciar } = useSessaoTreino()
  const [recarga, setRecarga] = useState(0)
  const { m, idioma } = useI18n()
  const t = m.treino
  // Voltar do Android fecha o painel de adicionar (antes minimizava o app).
  useFecharNoVoltar(painelAberto, () => setPainelAberto(false))

  // Plano aplicado no chat do Life: mostra a ficha do local dele, recarregada.
  useEffect(
    () =>
      aoAplicarPlano((p) => {
        if (p.tipo !== 'treino') return
        setLocal(p.local)
        setRecarga((n) => n + 1)
      }),
    [],
  )

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErroCarga(false)
    void treinoPlanoRepository
      .doDia(local, dia)
      .then((lista) => ativo && setItens(lista))
      .catch(() => {
        if (!ativo) return
        setItens([])
        setErroCarga(true)
      })
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [local, dia, recarga])

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
      vibrar.leve()
    } catch {
      avisar.erro(t.erroSalvar)
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
      // O que está na tela já mudou; avisa pra pessoa não achar que salvou.
      avisar.erro(t.erroSalvar)
    }
  }

  /** Tirar do treino não pergunta: avisa com "Desfazer", que adiciona de volta com as mesmas séries. */
  async function remover(id: string, comDesfazer = false) {
    const anterior = itens
    const item = itens.find((i) => i.id === id)
    setItens((atual) => atual.filter((i) => i.id !== id))
    try {
      await treinoPlanoRepository.remover(id)
      vibrar.leve()
      if (comDesfazer && item) {
        avisar.desfazer(t.removido(item.exercicio.nome), t.desfazer, () => {
          void treinoPlanoRepository
            .adicionar({ local, diaSemana: dia, exercicioId: item.exercicio.id, series: item.series, ordem: item.ordem })
            .then(() => setRecarga((n) => n + 1))
            .catch(() => avisar.erro(t.erroSalvar))
        })
      }
    } catch {
      setItens(anterior)
      avisar.erro(t.erroSalvar)
    }
  }

  async function alternarConcluido(item: ExercicioPlano) {
    const novoValor = !item.concluidoHoje
    setItens((atual) =>
      atual.map((i) => (i.id === item.id ? { ...i, concluidoHoje: novoValor } : i)),
    )
    try {
      await treinoPlanoRepository.marcarConcluido(item.id, novoValor)
      if (novoValor) vibrar.sucesso()
    } catch {
      avisar.erro(t.erroSalvar)
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

  const diaCurto = new Intl.DateTimeFormat(idioma, { weekday: 'short' })
  const ehHojeSel = dia === diaSemanaHoje()

  return (
    <main className="pb-28 pt-safe-t">
      <header className="flex items-center justify-between px-4 pb-1 pt-3">
        <div>
          <div className="text-micro font-bold uppercase tracking-[4px] text-brand">{t.marca}</div>
          <h1 className="text-2xl font-extrabold text-content-hi">{t.titulo}</h1>
          <p className="text-sm text-content-low">{t.subtitulo}</p>
        </div>
        <ProfileAvatar />
      </header>

      {/* Seletor de local */}
      <div className="mx-4 mb-3 mt-3 flex gap-1.5 rounded-2xl border border-surface-4 bg-surface-1 p-1.5" role="group">
        {LOCAIS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLocal(l.id)}
            aria-pressed={local === l.id}
            className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
              local === l.id
                ? 'bg-brand text-brand-ink shadow-[0_0_20px_rgba(34,197,94,0.45)]'
                : 'text-content-low'
            }`}
          >
            <ExerciseIcon chave={l.icone} className="inline-block h-4 w-4" />
            {t.locais[l.id]}
          </button>
        ))}
      </div>

      {/* Tira de dias da semana */}
      <div className="mb-4 flex gap-2 overflow-x-auto sem-barra px-4 pb-1">
        {DIAS_SEMANA.map((d) => {
          const ehHoje = d.id === diaSemanaHoje()
          const ativo = d.id === dia
          const data = dataDoDia(d.id)
          const rotulo = diaCurto.format(data).replace('.', '')
          return (
            <button
              key={d.id}
              onClick={() => setDia(d.id)}
              aria-pressed={ativo}
              className={`flex min-h-12 w-14 flex-none flex-col items-center justify-center rounded-xl py-1.5 text-xs font-bold capitalize transition-colors active:scale-95 ${
                ativo ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
              }`}
            >
              <span>{ehHoje ? t.hoje : rotulo}</span>
              <span className={`text-micro font-semibold tabular-nums ${ativo ? 'text-brand-ink/70' : 'text-content-low'}`}>
                {ehHoje ? rotulo : data.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {sessao ? (
        <TreinoEmAndamento />
      ) : (
        ehHojeSel &&
        !carregando &&
        itens.length > 0 && (
          // Liga a sessão da Live Activity; a tela continua esta mesma.
          <button
            onClick={() => {
              vibrar.leve()
              iniciar({ itens, local, diaSemana: dia })
            }}
            className="mx-4 mb-4 min-h-14 w-[calc(100%-2rem)] rounded-2xl border border-brand/50 bg-brand/10 py-3 text-sm font-extrabold text-brand active:scale-[0.98]"
          >
            {t.comecar}
            <span className="block text-micro font-normal text-content-low">{t.comecarSub}</span>
          </button>
        )
      )}

      <div className="mx-4 mb-2 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-content-hi">{t.doDia}</h2>
        <span className="text-micro text-content-low">{t.contagem(itens.length)}</span>
      </div>

      <div className="mx-4 space-y-2.5">
        {carregando ? (
          <div className="space-y-2.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[82px] animate-pulse rounded-2xl border border-surface-4 bg-surface-2" />
            ))}
          </div>
        ) : erroCarga ? (
          <div className="rounded-2xl border border-surface-4 bg-surface-2 p-5 text-center">
            <p className="text-sm text-content-mid">{t.erroCarregar}</p>
            <button
              type="button"
              onClick={() => setRecarga((n) => n + 1)}
              className="mt-3 min-h-12 rounded-xl bg-surface-3 px-5 text-sm font-bold text-content-hi active:bg-surface-4"
            >
              {t.tentarDeNovo}
            </button>
          </div>
        ) : itens.length === 0 ? (
          <div className="rounded-2xl border border-surface-4 bg-surface-2 p-5 text-center">
            <p className="text-sm font-bold text-content-hi">{t.vazioTitulo}</p>
            <p className="mt-1 text-micro text-content-low">{t.vazioTexto}</p>
          </div>
        ) : (
          itens.map((item) => (
            <ExerciseCard
              key={item.id}
              item={item}
              expandido={expandidoId === item.id}
              podeMarcarConcluido={ehHojeSel}
              onToggleExpandir={() => setExpandidoId((v) => (v === item.id ? null : item.id))}
              onToggleConcluido={() => void alternarConcluido(item)}
              onAtualizar={(s) => void atualizar(item.id, s)}
              onRemover={() => void remover(item.id, true)}
            />
          ))
        )}

        <button
          onClick={() => setPainelAberto(true)}
          className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-dashed border-brand/40 p-3.5 text-left transition-colors active:bg-content-hi/5"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-surface-3 text-xl text-brand" aria-hidden="true">
            +
          </span>
          <span>
            <span className="block text-sm font-semibold text-content-hi">{t.adicionar}</span>
            <span className="block text-micro text-content-low">{t.adicionarSub}</span>
          </span>
        </button>
      </div>

      {/* O Life do Treino: sabe de tudo, mas puxa pro treino. */}
      <LifeFlutuante humor="treino" foco="treino" />
    </main>
  )
}
