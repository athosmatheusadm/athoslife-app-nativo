import { useEffect, useMemo, useState } from 'react'
import {
  concluidos,
  formatarSeries,
  LOCAIS,
  progressoTreino,
  rotuloAba,
  rotuloLocal,
  type Exercicio,
  type LocalTreino,
  type Treino,
} from '@domain/entities/treino'
import { treinoRepository } from '@data/repositories/treinoRepository'
import { ExerciseIcon, chaveIconePorNome } from '@ui/components/ExerciseIcon'
import { AddExerciseDrawer } from './AddExerciseDrawer'

/**
 * Tela "Meu Treino" — três níveis: Local → Treinos (abas) → Exercícios.
 *
 * Local (casa/academia) em cima; abaixo, a tira de abas dos treinos daquele
 * local (Peito, Braço...), com "+ Novo". O treino selecionado mostra o card
 * HOJE, a lista de exercícios (acordeão) e a gaveta de adicionar.
 * Ícones em SVG (ExerciseIcon), nunca emoji.
 */
export function WorkoutScreen() {
  const [local, setLocal] = useState<LocalTreino>('academia')
  const [treinos, setTreinos] = useState<Treino[]>([])
  const [treinoSelId, setTreinoSelId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [addAberta, setAddAberta] = useState(false)
  const [listaAberta, setListaAberta] = useState(true)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    void treinoRepository
      .doLocal(local)
      .then((lista) => {
        if (!ativo) return
        setTreinos(lista)
        setTreinoSelId(lista[0]?.id ?? null)
      })
      .catch(() => ativo && setTreinos([]))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [local])

  const treino = useMemo(
    () => treinos.find((t) => t.id === treinoSelId) ?? null,
    [treinos, treinoSelId],
  )
  const exercicios = treino?.exercicios ?? []
  const feitos = concluidos(exercicios)
  const total = exercicios.length
  const pct = progressoTreino(exercicios)

  function patchExercicios(fn: (exs: readonly Exercicio[]) => Exercicio[]) {
    setTreinos((atual) =>
      atual.map((t) => (t.id === treinoSelId ? { ...t, exercicios: fn(t.exercicios) } : t)),
    )
  }

  async function alternar(ex: Exercicio) {
    patchExercicios((exs) =>
      exs.map((e) => (e.id === ex.id ? { ...e, concluido: !e.concluido } : e)),
    )
    try {
      await treinoRepository.definirConcluido(ex.id, !ex.concluido)
    } catch {
      patchExercicios((exs) =>
        exs.map((e) => (e.id === ex.id ? { ...e, concluido: ex.concluido } : e)),
      )
    }
  }

  async function adicionar(dados: { nome: string; series: number; repeticoes: number }) {
    if (!treino) return
    try {
      const novo = await treinoRepository.adicionarExercicio({
        treinoId: treino.id,
        nome: dados.nome,
        icone: chaveIconePorNome(dados.nome),
        series: dados.series,
        repeticoes: dados.repeticoes,
        ordem: exercicios.length,
      })
      patchExercicios((exs) => [...exs, novo])
      setAddAberta(false)
    } catch {
      /* mantém gaveta aberta se falhar */
    }
  }

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center justify-between px-4 pb-3 pt-3">
        <div>
          <div className="text-micro font-bold uppercase tracking-[4px] text-brand">Athos</div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-content-hi">
            <ExerciseIcon chave="corpo" className="inline-block h-7 w-7 text-brand" />
            Meu Treino
          </h1>
        </div>
      </header>

      {/* Seletor de local */}
      <div className="mx-4 mb-3 flex gap-1.5 rounded-2xl border border-surface-4 bg-[#0d0d0d] p-1.5">
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

      {/* Tira de abas de treinos (Peito, Braço...) + Novo */}
      <div className="mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {treinos.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTreinoSelId(t.id)
              setAddAberta(false)
            }}
            className={`flex-none rounded-pill px-4 py-2 text-sm font-semibold transition-colors ${
              t.id === treinoSelId
                ? 'bg-brand text-[#04120a]'
                : 'border border-surface-4 text-content-mid'
            }`}
          >
            {rotuloAba(t.nome)}
          </button>
        ))}
        <button
          onClick={() => {
            /* criar treino: fluxo de nome entra aqui (drawer futuro) */
          }}
          className="flex-none rounded-pill border border-dashed border-brand/50 px-4 py-2 text-sm font-semibold text-brand"
        >
          + Novo
        </button>
      </div>

      {carregando ? (
        <p className="py-10 text-center text-micro text-content-dim">Carregando…</p>
      ) : !treino ? (
        <p className="px-6 py-10 text-center text-micro text-content-low">
          Nenhum treino {rotuloLocal(local).toLowerCase()} ainda. Crie o primeiro em “+ Novo”.
        </p>
      ) : (
        <>
          {/* Card HOJE */}
          <div className="mx-4 mb-4 rounded-2xl border border-surface-4 p-4">
            <span className="inline-block rounded-pill border border-brand px-3 py-0.5 text-[11px] font-extrabold tracking-wide text-brand">
              HOJE
            </span>
            <div className="mt-3 flex items-start gap-3.5">
              <span className="flex h-13 w-13 flex-none items-center justify-center rounded-xl border border-brand/40 bg-[#0f1f0f] p-3 text-brand">
                <ExerciseIcon chave={treino.icone} className="h-full w-full" />
              </span>
              <div className="flex-1">
                <div className="text-xl font-extrabold text-content-hi">{treino.nome}</div>
                {treino.subtitulo && (
                  <div className="text-sm text-content-low">{treino.subtitulo}</div>
                )}
                <div className="text-micro text-content-dim">
                  {total} {total === 1 ? 'exercício' : 'exercícios'} • {rotuloLocal(local)}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
                <div
                  className="h-full rounded-full bg-brand shadow-[0_0_10px_rgba(34,197,94,0.6)] transition-all duration-500 ease-athos"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-lg font-extrabold text-brand">{pct}%</span>
            </div>
            <div className="mt-2 text-micro text-content-low">
              <span className="font-bold text-brand">
                {feitos} / {total}
              </span>{' '}
              exercícios concluídos
            </div>
          </div>

          {/* Lista de exercícios (acordeão) */}
          <section className="mx-4 mb-4 rounded-2xl border border-surface-4 p-4">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-content-hi">Exercícios</h2>
              <button
                onClick={() => setListaAberta((v) => !v)}
                aria-label={listaAberta ? 'Recolher' : 'Expandir'}
                className={`text-content-low transition-transform duration-300 ${listaAberta ? '' : 'rotate-180'}`}
              >
                ︿
              </button>
            </div>
            <div
              className="grid transition-all duration-300 ease-athos"
              style={{ gridTemplateRows: listaAberta ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                {exercicios.length === 0 ? (
                  <p className="py-6 text-center text-micro text-content-low">
                    Nenhum exercício ainda. Adicione o primeiro abaixo.
                  </p>
                ) : (
                  exercicios.map((ex, i) => (
                    <button
                      key={ex.id}
                      onClick={() => void alternar(ex)}
                      className={`flex w-full items-center gap-3.5 border-t border-surface-3 py-3 text-left first:border-t-0 ${
                        ex.concluido ? 'opacity-60' : ''
                      }`}
                    >
                      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#111] p-2.5 text-brand">
                        <ExerciseIcon chave={ex.icone} className="h-full w-full" />
                      </span>
                      <span className="flex-1">
                        <span
                          className={`block text-base font-semibold text-content-hi ${
                            ex.concluido ? 'text-content-low' : ''
                          }`}
                        >
                          {i + 1}. {ex.nome}
                        </span>
                        <span className="block text-micro text-content-low">
                          {formatarSeries(ex.series, ex.repeticoes)}
                        </span>
                      </span>
                      <span
                        className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-sm font-bold ${
                          ex.concluido ? 'border-brand text-brand' : 'border-surface-4'
                        }`}
                      >
                        {ex.concluido ? '✓' : ''}
                      </span>
                      <span className="flex-none text-content-dim">⠿</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Gaveta de adicionar exercício */}
          <div className="mt-3">
            <AddExerciseDrawer
              aberta={addAberta}
              onAbrir={() => setAddAberta(true)}
              onCancelar={() => setAddAberta(false)}
              onAdicionar={(d) => void adicionar(d)}
            />
          </div>
        </>
      )}
    </main>
  )
}
