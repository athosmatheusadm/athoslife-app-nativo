import { useMemo, useState } from 'react'
import { MealAccordion } from './MealAccordion'
import type { ItemRefeicao, Refeicao } from '@domain/entities/meal'
import type { TipoRefeicao } from '@data/repositories/refeicoesRepository'
import { calcularProgresso, type Metas } from '@domain/entities/profile'
import { gerarTiraDias, tituloDia } from '@domain/entities/diaDieta'

/**
 * Tela Dieta ("Meu Plano") — um DIÁRIO alimentar.
 *
 * Decisão de UX validada: os outros dias viram uma TIRA horizontal no topo
 * (padrão: Hoje). Some a confusão do "por que tem Terça empilhada aqui".
 * Consultar ontem / planejar amanhã = deslizar. O foco é sempre Hoje.
 *
 * A tela-mãe guarda: qual refeição está aberta (uma por vez), se a busca
 * está aberta, e qual dia está selecionado.
 */
export function DietScreen(props: {
  metas: Metas
  refeicoes: readonly Refeicao[]
  consumido: { kcal: number; proteina: number; carboidrato: number }
}) {
  const { metas, consumido } = props
  const [abertaTipo, setAbertaTipo] = useState<TipoRefeicao | null>('cafe')
  const [buscaNoTipo, setBuscaNoTipo] = useState<TipoRefeicao | null>(null)
  const [aba, setAba] = useState<'plano' | 'shakes'>('plano')

  const tira = useMemo(() => gerarTiraDias(), [])
  const [diaSel, setDiaSel] = useState<Date>(() => new Date())

  // Estado local dos itens (numa versão real, vem do repositório por dia).
  const [refeicoes, setRefeicoes] = useState<Refeicao[]>(() => [...props.refeicoes])

  function adicionarItem(tipo: TipoRefeicao, item: ItemRefeicao) {
    setRefeicoes((atual) =>
      atual.map((r) =>
        r.tipo === tipo ? { ...r, itens: [...r.itens, item] } : r,
      ),
    )
  }

  return (
    <main className="space-y-4 px-4 pb-24 pt-safe-t">
      <header className="flex items-center justify-between pt-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <h1 className="text-xl font-bold text-content-hi">Meu Plano</h1>
        </div>
      </header>

      {/* Cards de macro */}
      <div className="flex gap-2">
        <MacroBar valor={`${consumido.kcal}`} label="kcal consumidas" pct={calcularProgresso(consumido.kcal, metas.kcal)} cor="#22c55e" />
        <MacroBar valor={`${consumido.proteina}g`} label="proteína" pct={calcularProgresso(consumido.proteina, metas.proteina)} cor="#f43f5e" />
        <MacroBar valor={`${consumido.carboidrato}g`} label="carbo" pct={calcularProgresso(consumido.carboidrato, metas.carboidrato)} cor="#3b82f6" />
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        <button onClick={() => setAba('plano')} className={`rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors ${aba === 'plano' ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'}`}>Meu Plano</button>
        <button onClick={() => setAba('shakes')} className={`rounded-pill px-5 py-2.5 text-sm font-semibold transition-colors ${aba === 'shakes' ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'}`}>Shakes & Chás</button>
      </div>

      {aba === 'plano' && (
        <>
          {/* TIRA DE DIAS — padrão Hoje */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tira.map((d) => {
              const sel = d.data.toDateString() === diaSel.toDateString()
              return (
                <button
                  key={d.data.toISOString()}
                  onClick={() => setDiaSel(d.data)}
                  className={`flex-none rounded-xl px-4 py-2 text-center transition-colors ${
                    sel ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'
                  }`}
                >
                  <span className="block text-sm font-bold">{d.rotulo}</span>
                  <span className="block text-[10px] opacity-80">{String(d.data.getDate()).padStart(2, '0')}</span>
                </button>
              )
            })}
          </div>

          {/* Cabeçalho do dia */}
          <div className="flex items-center gap-2 px-1">
            <span>📅</span>
            <div>
              <div className="font-semibold text-content-hi">{tituloDia(diaSel)}</div>
              <div className="text-micro text-content-low">{metas.kcal} kcal registradas</div>
            </div>
          </div>

          {/* Refeições em acordeão */}
          <div className="space-y-2">
            {refeicoes.map((r) => (
              <MealAccordion
                key={r.tipo}
                refeicao={r}
                aberto={abertaTipo === r.tipo}
                buscaAberta={buscaNoTipo === r.tipo}
                onToggle={() => {
                  setAbertaTipo((atual) => (atual === r.tipo ? null : r.tipo))
                  setBuscaNoTipo(null)
                }}
                onAbrirBusca={() => setBuscaNoTipo(r.tipo)}
                onFecharBusca={() => setBuscaNoTipo(null)}
                onAdicionarItem={(item) => adicionarItem(r.tipo, item)}
                onEditar={() => {}}
                onExcluir={() => {}}
                onToggleConcluida={() => {}}
              />
            ))}
          </div>
        </>
      )}

      {aba === 'shakes' && (
        <p className="py-10 text-center text-micro text-content-low">Seus shakes e chás aparecem aqui.</p>
      )}
    </main>
  )
}

function MacroBar({ valor, label, pct, cor }: { valor: string; label: string; pct: number; cor: string }) {
  return (
    <div className="flex-1 rounded-xl border border-surface-4 bg-surface-2 p-3">
      <div className="text-center text-lg font-bold" style={{ color: cor }}>{valor}</div>
      <div className="mb-2 text-center text-micro text-content-dim">{label}</div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-4">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
    </div>
  )
}
