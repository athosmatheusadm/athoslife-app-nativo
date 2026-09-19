import { useState } from 'react'
import { tipoDaCategoria, type IntensidadeHabito, type TipoHabito } from '@domain/entities/habito'

/**
 * De propósito SEM álcool/cigarro: o app é um acompanhador de hábitos do
 * dia a dia (reduzir doce, aumentar leitura), não uma ferramenta pra vícios
 * que depreciam a vida humana — isso está fora do escopo do produto.
 */
const CATEGORIAS_EVITAR: readonly { valor: string | null; emoji: string; rotulo: string }[] = [
  { valor: 'doce', emoji: '🍫', rotulo: 'Doce/Açúcar' },
  { valor: 'fast_food', emoji: '🍟', rotulo: 'Fast food' },
  { valor: 'refrigerante', emoji: '🥤', rotulo: 'Refrigerante' },
  { valor: null, emoji: '🎯', rotulo: 'Outro' },
]

/** Categorias aqui precisam bater com CATEGORIAS_CONSTRUIR em domain/entities/habito.ts. */
const CATEGORIAS_CONSTRUIR: readonly { valor: string | null; emoji: string; rotulo: string }[] = [
  { valor: 'leitura', emoji: '📚', rotulo: 'Leitura' },
  { valor: null, emoji: '🎯', rotulo: 'Outro' },
]

const INTENSIDADES: readonly { valor: IntensidadeHabito; rotulo: string }[] = [
  { valor: 'leve', rotulo: 'Leve' },
  { valor: 'medio', rotulo: 'Médio' },
  { valor: 'forte', rotulo: 'Forte' },
]

/**
 * Painel "Acompanhar novo hábito" — mesmo padrão de bottom sheet do
 * CravingAssistant (aqui também vale interromper: é uma decisão pontual de
 * configuração, não um registro do dia a dia como na Dieta).
 *
 * Dois tipos: "evitar" (reduzir algo, fluxo original com vontade/recaída) e
 * "construir" (aumentar algo, ex. leitura). O tipo não vai pro banco — é
 * inferido da categoria por `tipoDaCategoria` na leitura (ver
 * habitosRepository). Por isso escolher "Outro" dentro de "Construir"
 * ainda cai como tipo "evitar" ao recarregar — teste consciente, categoria
 * livre por nome só funciona bem hoje pra "evitar".
 */
export function AddHabitSheet(props: {
  onSalvar: (params: {
    nome: string
    categoria: string | null
    intensidade: IntensidadeHabito
  }) => Promise<void>
  onFechar: () => void
}) {
  const [tipo, setTipo] = useState<TipoHabito>('evitar')
  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState<string | null>('doce')
  const [intensidade, setIntensidade] = useState<IntensidadeHabito>('medio')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const categorias = tipo === 'construir' ? CATEGORIAS_CONSTRUIR : CATEGORIAS_EVITAR

  function trocarTipo(t: TipoHabito) {
    setTipo(t)
    setCategoria(t === 'construir' ? 'leitura' : 'doce')
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      await props.onSalvar({ nome: nome.trim(), categoria, intensidade })
      // Sucesso: o pai fecha o painel (desmonta), sem precisar zerar `salvando` aqui.
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu pra salvar. Tenta de novo.')
      setSalvando(false)
    }
  }

  const podeSalvar = nome.trim().length > 0 && !salvando

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Acompanhar novo hábito"
    >
      <button
        aria-label="Fechar"
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />

        <h2 className="text-xl font-bold text-content-hi">Acompanhar novo hábito</h2>
        <p className="mt-1 text-sm text-content-low">
          {tipo === 'construir' ? 'O que você quer aumentar a partir de hoje?' : 'O que você quer superar a partir de hoje?'}
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => trocarTipo('evitar')}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
              tipo === 'evitar' ? 'border-brand text-brand' : 'border-surface-4 text-content-mid'
            }`}
          >
            Quero evitar algo
          </button>
          <button
            type="button"
            onClick={() => trocarTipo('construir')}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
              tipo === 'construir' ? 'border-brand text-brand' : 'border-surface-4 text-content-mid'
            }`}
          >
            Quero construir um hábito
          </button>
        </div>

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
          Nome
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={tipo === 'construir' ? 'Ex.: Leitura, Meditação…' : 'Ex.: Refrigerante, Doce…'}
          autoFocus
          className="mt-1 w-full rounded-xl border border-surface-4 bg-surface-2 px-3.5 py-3 text-sm font-semibold text-content-hi placeholder:font-normal placeholder:text-content-dim focus:border-brand focus:outline-none"
        />

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
          Categoria
        </label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c.rotulo}
              type="button"
              onClick={() => setCategoria(c.valor)}
              className={`rounded-pill px-3.5 py-1.5 text-micro font-bold transition-colors ${
                categoria === c.valor
                  ? 'bg-brand text-[#04120a]'
                  : 'border border-surface-4 bg-surface-2 text-content-mid'
              }`}
            >
              {c.emoji} {c.rotulo}
            </button>
          ))}
        </div>
        {tipoDaCategoria(categoria) !== tipo && (
          <p className="mt-1.5 text-[11px] text-accent-danger">
            "Outro" ainda não guarda o tipo — esse hábito vai aparecer como "evitar" depois de salvo.
          </p>
        )}

        <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
          Intensidade
        </label>
        <div className="mt-1.5 flex gap-2">
          {INTENSIDADES.map((i) => (
            <button
              key={i.valor}
              type="button"
              onClick={() => setIntensidade(i.valor)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                intensidade === i.valor
                  ? 'border-brand text-brand'
                  : 'border-surface-4 text-content-mid'
              }`}
            >
              {i.rotulo}
            </button>
          ))}
        </div>

        {erro && <p className="mt-2 text-[11px] text-accent-danger">{erro}</p>}

        <button
          type="button"
          disabled={!podeSalvar}
          onClick={() => void salvar()}
          className="mt-5 w-full rounded-2xl bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {salvando ? 'Salvando…' : 'Começar a acompanhar'}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
