import { ActivityIcon, ActivityIconPicker, HABIT_ICONS } from '@ui/components/ActivityIcon'
import { useState } from 'react'
import { habitoNomeProibido, type IntensidadeHabito, type TipoHabito } from '@domain/entities/habito'
import { useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'

/**
 * De propósito SEM álcool/cigarro/drogas/apostas: o app é um acompanhador
 * de hábitos do dia a dia (reduzir doce, aumentar leitura), não uma
 * ferramenta pra dependência. Digitar um desses no nome é recusado aqui
 * (habitoNomeProibido) e no banco (trigger validar_habito).
 */
type ChaveCategoria = 'doce' | 'fast_food' | 'refrigerante' | 'leitura' | 'sono' | 'agua' | 'meditar' | 'caminhar' | 'verduras' | 'outro'

const CATEGORIAS_EVITAR: readonly { valor: string | null; chave: ChaveCategoria }[] = [
  { valor: 'doce', chave: 'doce' },
  { valor: 'fast_food', chave: 'fast_food' },
  { valor: 'refrigerante', chave: 'refrigerante' },
  { valor: null, chave: 'outro' },
]

/** Categorias aqui precisam bater com CATEGORIAS_CONSTRUIR em domain/entities/habito.ts. */
const CATEGORIAS_CONSTRUIR: readonly { valor: string | null; chave: ChaveCategoria }[] = [
  { valor: 'sono', chave: 'sono' },
  { valor: 'agua', chave: 'agua' },
  { valor: 'leitura', chave: 'leitura' },
  { valor: 'meditar', chave: 'meditar' },
  { valor: 'caminhar', chave: 'caminhar' },
  { valor: 'verduras', chave: 'verduras' },
  { valor: 'construir', chave: 'outro' },
]

const INTENSIDADES: readonly IntensidadeHabito[] = ['leve', 'medio', 'forte']

/**
 * Painel "Acompanhar novo hábito" — mesmo padrão de bottom sheet do
 * CravingAssistant (aqui também vale interromper: é uma decisão pontual de
 * configuração, não um registro do dia a dia como na Dieta).
 *
 * Dois tipos: "evitar" (reduzir algo, fluxo original com vontade/recaída) e
 * "construir" (aumentar algo, ex. dormir melhor). O tipo não vai pro banco —
 * é inferido da categoria por `tipoDaCategoria` na leitura (ver
 * habitosRepository); "Outro" dentro de Construir grava a categoria
 * 'construir' pra não virar "evitar".
 */
export function AddHabitSheet(props: {
  onSalvar: (params: {
    nome: string
    categoria: string | null
    intensidade: IntensidadeHabito
    icone: string
  }) => Promise<void>
  onFechar: () => void
}) {
  const [tipo, setTipo] = useState<TipoHabito>('evitar')
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState('doce')
  const [categoria, setCategoria] = useState<string | null>('doce')
  const [intensidade, setIntensidade] = useState<IntensidadeHabito>('medio')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { m } = useI18n()
  const t = m.habitos.novoSheet
  useFecharNoVoltar(true, props.onFechar)
  const categorias = tipo === 'construir' ? CATEGORIAS_CONSTRUIR : CATEGORIAS_EVITAR
  const proibido = habitoNomeProibido(nome)

  function trocarTipo(t: TipoHabito) {
    setTipo(t)
    setIcone(t === 'construir' ? 'sono' : 'doce')
    setCategoria(t === 'construir' ? 'sono' : 'doce')
  }

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      await props.onSalvar({ nome: nome.trim(), categoria, intensidade, icone })
      // Sucesso: o pai fecha o painel (desmonta), sem precisar zerar `salvando` aqui.
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setErro(msg === 'habito_nao_permitido' ? m.habitos.naoPermitido : msg === 'limite_habitos_gratis' ? m.habitos.limiteGratis : t.erro)
      setSalvando(false)
    }
  }

  const podeSalvar = nome.trim().length > 0 && !salvando && !proibido

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t.titulo}
    >
      <button
        aria-label={t.fechar}
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />

        <h2 className="text-xl font-bold text-content-hi">{t.titulo}</h2>
        <p className="mt-1 text-sm text-content-low">{tipo === 'construir' ? t.leadConstruir : t.leadEvitar}</p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => trocarTipo('evitar')}
            aria-pressed={tipo === 'evitar'}
            className={`min-h-12 flex-1 rounded-xl border px-2 text-sm font-semibold transition-colors ${
              tipo === 'evitar' ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
            }`}
          >
            {t.evitar}
          </button>
          <button
            type="button"
            onClick={() => trocarTipo('construir')}
            aria-pressed={tipo === 'construir'}
            className={`min-h-12 flex-1 rounded-xl border px-2 text-sm font-semibold transition-colors ${
              tipo === 'construir' ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
            }`}
          >
            {t.construir}
          </button>
        </div>

        <label htmlFor="novo-habito-nome" className="mt-4 block text-micro font-bold uppercase tracking-wide text-content-low">
          {t.nome}
        </label>
        <input
          id="novo-habito-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={tipo === 'construir' ? t.exConstruir : t.exEvitar}
          autoFocus
          className="mt-1 min-h-12 w-full rounded-xl border border-surface-4 bg-surface-2 px-3.5 text-base font-semibold text-content-hi placeholder:font-normal placeholder:text-content-low focus:border-brand focus:outline-none"
        />

        {proibido && (
          <p className="mt-2 rounded-xl border border-accent-recaida/40 bg-accent-recaida/10 p-3 text-sm leading-snug text-content-mid">
            {m.habitos.naoPermitido}
          </p>
        )}

        <p className="mt-4 block text-micro font-bold uppercase tracking-wide text-content-low">{t.categoria}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c.chave}
              type="button"
              onClick={() => { setCategoria(c.valor); setIcone(c.valor === null || c.valor === 'construir' ? 'outro' : c.valor) }}
              aria-pressed={categoria === c.valor}
              className={`min-h-11 rounded-pill px-4 text-sm font-bold transition-colors active:scale-95 ${
                categoria === c.valor
                  ? 'border border-brand bg-brand/10 text-brand'
                  : 'border border-surface-4 bg-surface-2 text-content-mid'
              }`}
            >
              <span className="inline-flex items-center gap-2"><ActivityIcon icone={c.valor} className="h-6 w-6" tile={false} />{t.categorias[c.chave]}</span>
            </button>
          ))}
        </div>
        <ActivityIconPicker valor={icone} opcoes={HABIT_ICONS} onChange={setIcone} disabled={salvando} />

        <p className="mt-4 block text-micro font-bold uppercase tracking-wide text-content-low">{t.intensidade}</p>
        <div className="mt-1.5 flex gap-2">
          {INTENSIDADES.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIntensidade(i)}
              aria-pressed={intensidade === i}
              className={`min-h-12 flex-1 rounded-xl border text-sm font-semibold transition-colors ${
                intensidade === i ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
              }`}
            >
              {t.intensidades[i]}
            </button>
          ))}
        </div>

        {erro && <p role="alert" className="mt-2 text-sm text-accent-danger">{erro}</p>}

        <button
          type="button"
          disabled={!podeSalvar}
          onClick={() => void salvar()}
          className="mt-5 min-h-14 w-full rounded-2xl bg-brand font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          {salvando ? t.salvando : t.salvar}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
