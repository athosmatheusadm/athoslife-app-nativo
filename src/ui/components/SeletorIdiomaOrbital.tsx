import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * Seletor orbital de idioma (pacote "ATHOSlife-seletor-orbital" do dono,
 * 27/10): um círculo com o ícone de idiomas, "Idioma" embaixo e uma bolinha
 * na borda por idioma. Tocar abre o anel em volta do centro com os nomes em
 * etiquetas finas; escolher troca e recolhe.
 *
 * Geometria do pacote preservada (não trocar por dropdown, bandeiras ou
 * lista): anel 35 → 80 px de raio (o pacote usa 96; o dono pediu menor), botão central 60 px, bolinhas 8 → 10 px,
 * etiquetas 12 px com 7 × 10 px de respiro, 420 ms em cubic-bezier(.2,.8,.2,1).
 * As cores saem dos tokens do app (seguem o tema do app, não só o do aparelho).
 *
 * Fechado ocupa só a faixa do anel; aberto, a órbita fica por cima do que
 * está em volta (sem empurrar a tela), com um disco do fundo atrás.
 */
export interface OpcaoIdioma {
  readonly id: string
  /** Nome no próprio idioma ("Français"), nunca traduzido. */
  readonly nome: string
  /** Lido pelo leitor de tela ("Português (Brasil)"). */
  readonly nomeAcessivel?: string
}

const CURVA = 'cubic-bezier(.2,.8,.2,1)'

export function SeletorIdiomaOrbital(props: {
  opcoes: readonly OpcaoIdioma[]
  valor: string
  rotulo: string
  onEscolher: (id: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const centro = useRef<HTMLButtonElement>(null)
  // Aberto um pouco menor que o pacote (96 px): o dono pediu pra ocupar menos tela.
  const raio = aberto ? 80 : 35
  const atual = props.opcoes.find((o) => o.id === props.valor) ?? props.opcoes[0]

  // Toque fora fecha.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (raiz.current && !e.composedPath().includes(raiz.current)) setAberto(false)
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberto])

  function fechar() {
    setAberto(false)
    centro.current?.focus()
  }

  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && aberto) {
      e.preventDefault()
      fechar()
      return
    }
    const botoes = [...(raiz.current?.querySelectorAll<HTMLButtonElement>('button[data-idioma]') ?? [])]
    const i = botoes.indexOf(e.target as HTMLButtonElement)
    if (i < 0 || !aberto) return
    let prox: number | undefined
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') prox = (i + 1) % botoes.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prox = (i - 1 + botoes.length) % botoes.length
    if (e.key === 'Home') prox = 0
    if (e.key === 'End') prox = botoes.length - 1
    if (prox !== undefined) {
      e.preventDefault()
      botoes[prox]?.focus()
    }
  }

  return (
    <div className="relative mx-auto h-[118px] w-full" onKeyDown={teclas}>
      <div ref={raiz} className={`absolute left-1/2 top-1/2 h-0 w-0 ${aberto ? 'z-30' : 'z-10'}`}>
        {/* Disco do fundo atrás da órbita aberta: o que está embaixo não briga com as etiquetas. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--c-surface-1))_70%,rgb(var(--c-surface-1)/0))] transition-opacity duration-300 motion-reduce:transition-none"
          style={{ opacity: aberto ? 1 : 0 }}
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface-4 motion-reduce:!transition-none"
          style={{ width: raio * 2, height: raio * 2, transition: `width .42s ${CURVA}, height .42s ${CURVA}` }}
        />
        <button
          ref={centro}
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-label={`${props.rotulo}: ${atual?.nomeAcessivel ?? atual?.nome ?? ''}`}
          className="absolute left-1/2 top-1/2 z-[2] grid h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform duration-[400ms] ${aberto ? 'scale-90' : ''}`}>
            <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
          </svg>
        </button>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] font-medium tracking-[.2px] text-content-low motion-reduce:!transition-none"
          style={{ top: aberto ? 25 : 48, transition: `top .42s ${CURVA}` }}
        >
          {props.rotulo}
        </span>

        <div role="group" aria-label={props.rotulo} aria-hidden={!aberto}>
          {props.opcoes.map((o, i) => {
            const angulo = -Math.PI / 2 + (i * 2 * Math.PI) / props.opcoes.length
            const dx = Math.cos(angulo)
            const dy = Math.sin(angulo)
            const emCima = dy < -0.15
            const escolhido = o.id === props.valor
            return (
              <button
                key={o.id}
                type="button"
                data-idioma={o.id}
                aria-pressed={escolhido}
                aria-label={o.nomeAcessivel ?? o.nome}
                tabIndex={aberto ? 0 : -1}
                onClick={() => {
                  if (o.id !== props.valor) props.onEscolher(o.id)
                  fechar()
                }}
                className={`group absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full motion-reduce:!transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${aberto ? 'pointer-events-auto' : 'pointer-events-none'}`}
                style={{ left: dx * raio, top: dy * raio, transition: `left .42s ${CURVA}, top .42s ${CURVA}` }}
              >
                <span
                  aria-hidden="true"
                  className={`rounded-full shadow-[0_0_0_4px_rgb(var(--c-surface-1))] transition-all duration-300 motion-reduce:transition-none ${escolhido ? 'bg-brand' : 'bg-content-low/60'} ${aberto ? 'h-2.5 w-2.5' : 'h-2 w-2'}`}
                />
                <span
                  lang={o.id}
                  className={`absolute left-1/2 flex items-center gap-[5px] whitespace-nowrap rounded-[20px] border px-2.5 py-[7px] text-[12px] font-medium transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
                    emCima ? 'bottom-[35px]' : 'top-[35px]'
                  } ${escolhido ? 'border-brand text-brand' : 'border-surface-4 text-content-hi group-hover:border-brand'} bg-surface-2 ${
                    aberto ? 'visible -translate-x-1/2 opacity-100 delay-[90ms]' : 'invisible -translate-x-1/2 -translate-y-[5px] opacity-0'
                  }`}
                >
                  {o.nome}
                  {escolhido && <span aria-hidden="true">✓</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{atual ? `${props.rotulo}: ${atual.nome}` : ''}</span>
    </div>
  )
}
