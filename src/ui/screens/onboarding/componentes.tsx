import { useState, type ReactNode } from 'react'

/**
 * Peças visuais do onboarding — cores e formas da referência do dono
 * (verde-lima sobre fundo quase preto), com o piso de 12px do app em vez
 * dos 9–10px do mockup.
 */

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="mb-2 mt-1 text-micro font-bold uppercase tracking-wide text-[#9cff45]">{children}</div>
}

export function Titulo({ children }: { children: ReactNode }) {
  return <h1 className="mb-2 text-[22px] font-extrabold leading-tight tracking-tight text-content-hi">{children}</h1>
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-[#98a69d]">{children}</p>
}

export function Rotulo({ children }: { children: ReactNode }) {
  return <div className="mb-2 mt-5 text-sm font-semibold text-[#d8e2da]">{children}</div>
}

export function Opcoes({ colunas = 2, children }: { colunas?: 2 | 3 | 4; children: ReactNode }) {
  const cols = colunas === 4 ? 'grid-cols-4' : colunas === 3 ? 'grid-cols-3' : 'grid-cols-2'
  return <div className={`grid gap-2 ${cols}`}>{children}</div>
}

export function Opcao(props: {
  selecionada: boolean
  onClick: () => void
  icone?: string
  inteira?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.selecionada}
      className={[
        'flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center text-sm leading-tight transition-colors',
        props.inteira ? 'col-span-full' : '',
        props.selecionada
          ? 'border-[#7be153] bg-gradient-to-b from-[#18351f] to-[#102719] text-[#f0ffe9]'
          : 'border-[#2b4a37] bg-[#09130e] text-[#b9c6bd]',
      ].join(' ')}
    >
      {props.icone && <span aria-hidden="true">{props.icone}</span>}
      <span>{props.children}</span>
    </button>
  )
}

export const CAMPO =
  'h-12 w-full rounded-xl border border-[#294633] bg-[#08110c] px-3 text-base text-[#f4f8f4] placeholder:text-[#536258] focus:border-[#71d94f] focus:outline-none'

export function Medida(props: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block rounded-xl border border-[#294633] bg-[#08110c] px-3 py-2">
      <small className="mb-1 block text-micro text-[#65756a]">{props.rotulo}</small>
      {props.children}
    </label>
  )
}

/** Lista de alimentos editável: chips com × + campo pra digitar + sugestões. */
export function ListaTags(props: {
  itens: readonly string[]
  sugestoes: readonly string[]
  placeholder: string
  rotuloAdicionar: string
  rotuloRemover: string
  onMudar: (itens: string[]) => void
}) {
  const [texto, setTexto] = useState('')

  function adicionar(valor: string) {
    const v = valor.trim()
    if (!v || props.itens.some((x) => x.toLowerCase() === v.toLowerCase())) return
    props.onMudar([...props.itens, v].slice(0, 20))
    setTexto('')
  }

  const sugestoesLivres = props.sugestoes.filter(
    (s) => !props.itens.some((x) => x.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div>
      {props.itens.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {props.itens.map((x) => (
            <span
              key={x}
              className="flex items-center gap-1 rounded-lg border border-[#31533e] bg-[#0b1710] px-2.5 py-1.5 text-sm text-[#c4d0c7]"
            >
              {x}
              <button
                type="button"
                aria-label={`${props.rotuloRemover} ${x}`}
                onClick={() => props.onMudar(props.itens.filter((i) => i !== x))}
                className="px-0.5 text-[#86e85b]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          adicionar(texto)
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={props.placeholder}
          maxLength={40}
          className={`${CAMPO} h-10 text-sm`}
        />
        <button
          type="submit"
          aria-label={props.rotuloAdicionar}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-[#31533e] bg-[#0d1a12] text-lg text-[#a7ef75]"
        >
          +
        </button>
      </form>
      {sugestoesLivres.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sugestoesLivres.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => adicionar(s)}
              className="rounded-lg border border-dashed border-[#31533e] px-2.5 py-1 text-micro text-[#8f9f94]"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LifeImagem({ src, altura = 170 }: { src: string; altura?: number }) {
  return (
    <div className="flex items-end justify-center" style={{ height: altura }}>
      <img
        src={src}
        alt="Life"
        className="h-full w-auto max-w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.45)]"
      />
    </div>
  )
}

export function Cta(props: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="min-h-[50px] w-full rounded-xl bg-gradient-to-b from-[#a7ff52] to-[#8df13d] text-base font-extrabold text-[#061006] shadow-[0_10px_25px_rgba(120,255,61,0.10)] transition-transform active:translate-y-px disabled:opacity-60"
    >
      {props.children} →
    </button>
  )
}
