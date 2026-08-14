import { useState } from 'react'

/**
 * Gaveta para anotar um exercício — desliza dentro da tela, sem página nova
 * (mesma pegada do acordeão da Dieta). Campo simples: nome + séries × reps.
 */
export function AddExerciseDrawer(props: {
  aberta: boolean
  onAbrir: () => void
  onCancelar: () => void
  onAdicionar: (dados: { nome: string; series: number; repeticoes: number }) => void
}) {
  const [nome, setNome] = useState('')
  const [series, setSeries] = useState(3)
  const [reps, setReps] = useState(12)

  function confirmar() {
    const n = nome.trim()
    if (!n) return
    props.onAdicionar({ nome: n, series, repeticoes: reps })
    setNome('')
    setSeries(3)
    setReps(12)
  }

  if (!props.aberta) {
    return (
      <button
        onClick={props.onAbrir}
        className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-dashed border-brand/40 p-3.5 text-left"
      >
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-3 text-xl text-brand">+</span>
        <span className="text-sm font-semibold text-content-hi">Adicionar exercício</span>
      </button>
    )
  }

  return (
    <div className="mx-4 rounded-xl border border-surface-4 bg-surface-2 p-4">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome do exercício"
        autoFocus
        className="min-h-11 w-full rounded-lg border border-surface-4 bg-surface-3 px-3 text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none"
      />

      <div className="mt-3 flex items-center gap-3">
        <Campo label="Séries" valor={series} onMudar={setSeries} />
        <span className="mt-5 text-content-dim">×</span>
        <Campo label="Repetições" valor={reps} onMudar={setReps} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={props.onCancelar}
          className="flex-1 rounded-lg border border-surface-4 py-2.5 text-sm font-medium text-content-mid active:bg-white/5"
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={!nome.trim()}
          className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-bold text-[#04120a] active:scale-[0.98] disabled:opacity-40"
        >
          Adicionar
        </button>
      </div>
    </div>
  )
}

function Campo(props: { label: string; valor: number; onMudar: (n: number) => void }) {
  return (
    <label className="flex-1">
      <span className="mb-1 block text-micro text-content-dim">{props.label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={props.valor}
        onChange={(e) => props.onMudar(Math.max(1, Number(e.target.value) || 1))}
        className="w-full rounded-lg border border-surface-4 bg-surface-3 px-3 py-2 text-center font-bold text-content-hi focus:border-brand focus:outline-none"
      />
    </label>
  )
}
