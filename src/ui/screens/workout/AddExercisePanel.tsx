import { useEffect, useMemo, useState } from 'react'
import { exercicioCatalogoRepository } from '@data/repositories/exercicioCatalogoRepository'
import {
  iconeDoExercicio,
  rotuloGrupo,
  type ExercicioCatalogo,
  type GrupoMuscular,
} from '@domain/entities/treino'

/**
 * Tela cheia de adicionar exercício — mesma pegada do FoodSearchScreen da
 * Dieta: busca + lista, sem página nova de verdade (troca o conteúdo da
 * tela). Chips de grupo muscular calculados a partir do catálogo carregado,
 * não fixos, pra nunca mostrar filtro vazio.
 *
 * Mostra o catálogo inteiro, sem separar por local: o usuário decide o que
 * quer treinar em casa ou na academia, não a gente por ele.
 */
export function AddExercisePanel(props: {
  jaAdicionadosIds: ReadonlySet<string>
  onAlternar: (exercicio: ExercicioCatalogo) => void
  onFechar: () => void
}) {
  const [catalogo, setCatalogo] = useState<ExercicioCatalogo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [termo, setTermo] = useState('')
  const [grupo, setGrupo] = useState<GrupoMuscular | 'todos'>('todos')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    void exercicioCatalogoRepository
      .listar()
      .then((lista) => ativo && setCatalogo(lista))
      .catch(() => ativo && setCatalogo([]))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  const gruposDisponiveis = useMemo(() => {
    const vistos = new Set(catalogo.map((e) => e.grupoMuscular))
    return Array.from(vistos)
  }, [catalogo])

  const filtrados = useMemo(() => {
    const t = termo.trim().toLowerCase()
    return catalogo.filter((e) => {
      if (grupo !== 'todos' && e.grupoMuscular !== grupo) return false
      if (t && !e.nome.toLowerCase().includes(t)) return false
      return true
    })
  }, [catalogo, termo, grupo])

  return (
    <main className="fixed inset-0 z-20 flex flex-col overflow-hidden bg-surface-1 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-3 pt-3">
        <button onClick={props.onFechar} aria-label="Fechar" className="text-content-hi">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-content-hi">Adicionar exercício</h1>
      </header>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-card border border-surface-4 bg-surface-2 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar exercício…"
            autoFocus
            className="min-h-11 flex-1 bg-transparent text-content-hi placeholder:text-content-dim focus:outline-none"
          />
          {termo && (
            <button onClick={() => setTermo('')} aria-label="Limpar" className="text-content-dim">✕</button>
          )}
        </div>
      </div>

      <div className="mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip rotulo="Todos" ativo={grupo === 'todos'} onClick={() => setGrupo('todos')} />
        {gruposDisponiveis.map((g) => (
          <Chip key={g} rotulo={rotuloGrupo(g)} ativo={grupo === g} onClick={() => setGrupo(g)} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3">
        {carregando ? (
          <p className="py-10 text-center text-micro text-content-dim">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <p className="py-10 text-center text-micro text-content-low">Nenhum exercício encontrado.</p>
        ) : (
          <ul className="divide-y divide-surface-3">
            {filtrados.map((ex) => {
              const jaAdicionado = props.jaAdicionadosIds.has(ex.id)
              return (
                <li key={ex.id}>
                  <button
                    onClick={() => props.onAlternar(ex)}
                    aria-label={jaAdicionado ? `Remover ${ex.nome}` : `Adicionar ${ex.nome}`}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    {iconeDoExercicio(ex) ? (
                      <img
                        src={iconeDoExercicio(ex) ?? undefined}
                        alt=""
                        className={`h-12 w-12 flex-none rounded-lg object-cover ${jaAdicionado ? 'opacity-50' : ''}`}
                      />
                    ) : (
                      <span className="h-12 w-12 flex-none rounded-lg bg-surface-3" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate font-medium text-content-hi ${jaAdicionado ? 'opacity-50' : ''}`}
                      >
                        {ex.nome}
                      </span>
                      <span className="block text-micro text-content-low">{rotuloGrupo(ex.grupoMuscular)}</span>
                    </span>
                    <span
                      className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-lg font-bold ${
                        jaAdicionado ? 'bg-surface-3 text-content-dim' : 'bg-brand text-[#04120a]'
                      }`}
                    >
                      {jaAdicionado ? '✓' : '+'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mx-4 mb-1 rounded-xl bg-surface-2 px-3 py-2.5 text-center text-micro text-content-dim">
        Toque no exercício para adicionar ou remover do seu treino.
      </div>
      <div className="px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
        <button
          onClick={props.onFechar}
          className="w-full rounded-card bg-brand py-3.5 font-bold text-[#04120a] transition-transform active:scale-[0.98]"
        >
          Concluir
        </button>
      </div>
    </main>
  )
}

function Chip(props: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      className={`flex-none rounded-pill px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        props.ativo ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'
      }`}
    >
      {props.rotulo}
    </button>
  )
}
