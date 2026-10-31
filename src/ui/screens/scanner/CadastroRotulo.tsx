import { useState } from 'react'
import type { ProdutoRotulo } from '@data/repositories/produtoCodigoBarrasRepository'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Produto que nenhuma base conhece (ou conhece sem tabela nutricional): a
 * pessoa copia a coluna de 100 g do rótulo. Grátis, sem IA, e vai pra base
 * própria — quem escanear depois já encontra.
 */
export function CadastroRotulo(props: {
  codigo: string
  nomeInicial: string
  marcaInicial: string | null
  imagemUrl: string | null
  /** Nome que a base já conhecia (cadastro sem tabela). */
  semTabela: boolean
  onPronto: (p: ProdutoRotulo) => void
}) {
  const { m } = useI18n()
  const t = m.scanner.rotulo2
  const [nome, setNome] = useState(props.nomeInicial)
  const [marca, setMarca] = useState(props.marcaInicial ?? '')
  const [v, setV] = useState({ kcal: '', proteina: '', carbo: '', gordura: '', porcao: '' })
  const [erro, setErro] = useState(false)

  const num = (s: string) => {
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) && n >= 0 ? n : NaN
  }
  const kcal = num(v.kcal)
  const p = num(v.proteina || '0')
  const c = num(v.carbo || '0')
  const g = num(v.gordura || '0')
  const porcao = v.porcao ? num(v.porcao) : null
  const pronto = nome.trim().length >= 2 && v.kcal !== '' && [kcal, p, c, g].every(Number.isFinite) && kcal <= 950

  function enviar() {
    if (!pronto) return
    if (p + c + g > 100.5 || (porcao !== null && !(porcao >= 1 && porcao <= 2000))) {
      setErro(true)
      return
    }
    props.onPronto({
      codigo: props.codigo,
      nome: nome.trim(),
      marca: marca.trim() || null,
      por100: { calorias: Math.round(kcal), proteina: p, carboidrato: c, gordura: g },
      porcaoG: porcao ? Math.round(porcao) : null,
      imagemUrl: props.imagemUrl,
    })
  }

  const campo = (k: keyof typeof v, rotulo: string, cor?: string) => (
    <label className="grid gap-1">
      <span className={`text-micro font-semibold ${cor ?? 'text-content-low'}`}>{rotulo}</span>
      <input
        type="text"
        inputMode="decimal"
        value={v[k]}
        onChange={(e) => {
          setErro(false)
          setV((x) => ({ ...x, [k]: e.target.value.replace(/[^\d.,]/g, '').slice(0, 6) }))
        }}
        className="min-h-11 w-full rounded-card border border-surface-4 bg-surface-1 px-3 font-mono text-base text-content-hi focus:border-brand focus:outline-none"
      />
    </label>
  )

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        enviar()
      }}
      className="rounded-card border border-brand/40 bg-surface-2 p-3"
    >
      <p className="text-sm font-semibold text-content-hi">{props.semTabela ? t.tituloSemTabela(props.nomeInicial) : t.titulo}</p>
      <p className="mt-0.5 text-micro text-content-low">{t.texto}</p>
      <div className="mt-3 grid gap-2">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value.slice(0, 120))}
          placeholder={t.nome}
          aria-label={t.nome}
          className="min-h-11 w-full rounded-card border border-surface-4 bg-surface-1 px-3 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
        />
        <input
          type="text"
          value={marca}
          onChange={(e) => setMarca(e.target.value.slice(0, 80))}
          placeholder={t.marca}
          aria-label={t.marca}
          className="min-h-11 w-full rounded-card border border-surface-4 bg-surface-1 px-3 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-micro font-bold uppercase tracking-wide text-content-mid">{t.por100}</p>
        <div className="grid grid-cols-2 gap-2">
          {campo('kcal', t.kcal)}
          {campo('proteina', t.proteina, 'text-macro-proteina')}
          {campo('carbo', t.carbo, 'text-macro-carbo')}
          {campo('gordura', t.gordura, 'text-macro-gordura')}
        </div>
        {campo('porcao', t.porcao)}
      </div>
      {erro && (
        <p role="alert" className="mt-2 text-sm font-medium text-accent-danger">
          {t.invalido}
        </p>
      )}
      <button
        type="submit"
        disabled={!pronto}
        className="mt-3 min-h-12 w-full rounded-pill bg-brand px-4 text-sm font-bold text-surface-1 active:scale-[0.98] disabled:opacity-50"
      >
        {t.salvar}
      </button>
    </form>
  )
}
