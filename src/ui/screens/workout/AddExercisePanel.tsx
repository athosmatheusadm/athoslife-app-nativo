import { useEffect, useMemo, useState } from 'react'
import { exercicioCatalogoRepository } from '@data/repositories/exercicioCatalogoRepository'
import { useI18n } from '@/i18n/I18nProvider'
import {
  iconeDoExercicio,
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
  const { m } = useI18n()
  const t = m.treino.painel
  const rotuloGrupo = (g: GrupoMuscular) => m.treino.grupos[g]

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
        <button onClick={props.onFechar} aria-label={t.fechar} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-content-hi active:bg-content-hi/5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-content-hi">{t.titulo}</h1>
      </header>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 rounded-card border border-surface-4 bg-surface-2 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="flex-none text-content-low" aria-hidden="true" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder={t.buscar}
            aria-label={t.buscar}
            autoFocus
            className="min-h-12 flex-1 bg-transparent text-base text-content-hi placeholder:text-content-low focus:outline-none"
          />
          {termo && (
            <button onClick={() => setTermo('')} aria-label={t.limpar} className="-mr-2 flex h-11 w-11 items-center justify-center text-content-low active:text-content-hi">✕</button>
          )}
        </div>
      </div>

      <div className="mb-2 flex gap-2 overflow-x-auto sem-barra px-4 pb-1">
        <Chip rotulo={t.todos} ativo={grupo === 'todos'} onClick={() => setGrupo('todos')} />
        {gruposDisponiveis.map((g) => (
          <Chip key={g} rotulo={rotuloGrupo(g)} ativo={grupo === g} onClick={() => setGrupo(g)} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3">
        {carregando ? (
          <p className="py-10 text-center text-micro text-content-low">{m.treino.carregando}</p>
        ) : filtrados.length === 0 ? (
          <p className="py-10 text-center text-micro text-content-low">{t.nada}</p>
        ) : (
          <ul className="divide-y divide-surface-3">
            {filtrados.map((ex) => {
              const jaAdicionado = props.jaAdicionadosIds.has(ex.id)
              return (
                <li key={ex.id}>
                  <button
                    onClick={() => props.onAlternar(ex)}
                    aria-label={jaAdicionado ? t.removerEx(ex.nome) : t.adicionarEx(ex.nome)}
                    aria-pressed={jaAdicionado}
                    className="flex min-h-16 w-full items-center gap-3 py-2 text-left transition-colors active:bg-content-hi/5"
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
                      aria-hidden="true"
                      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-lg font-bold ${
                        jaAdicionado ? 'bg-surface-3 text-brand' : 'bg-brand text-brand-ink'
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

      <div className="mx-4 mb-1 rounded-xl bg-surface-2 px-3 py-2.5 text-center text-micro text-content-low">{t.dica}</div>
      <div className="px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3">
        <button
          onClick={props.onFechar}
          className="min-h-12 w-full rounded-card bg-brand font-bold text-brand-ink transition-transform active:scale-[0.98]"
        >
          {t.concluir}
        </button>
      </div>
    </main>
  )
}

function Chip(props: { rotulo: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      aria-pressed={props.ativo}
      className={`min-h-11 flex-none rounded-pill px-4 text-sm font-semibold transition-colors active:scale-95 ${
        props.ativo ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
      }`}
    >
      {props.rotulo}
    </button>
  )
}
