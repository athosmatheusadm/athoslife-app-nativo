import { useEffect, useRef, useState } from 'react'

/**
 * O Life em PNG/WebP transparente, um humor por contexto (imagens do dono,
 * 2026-09-28 — fundo preto recortado; o roxo "calmo" veio do HTML do
 * onboarding):
 *
 *   normal      Home
 *   feliz       Hábitos firmes
 *   calmo       Hábitos em atenção, consentimento, fim do onboarding
 *   treino      Treinos, boas-vindas
 *   chef        Cozinha, Scanner, alimentação
 *   hidratado   água (Life azul)
 *   desidratado água abaixo da meta
 *   conquista   Conquistas (Life dourado)
 *   resgate     volta depois de dias sem abrir o app
 *
 * Life vivo (dono, 25/10 — life_foco.html): normal, feliz, treino e chef
 * são animados (respira, pisca, olha em volta, reage ao toque), no mesmo
 * tamanho do PNG. O motor do protótipo roda intacto em
 * public/life/vivo/foco.html (gerado por scripts/gerar_life_vivo.py) e este
 * componente só manda os comandos. O PNG fica na tela até a animação estar
 * pronta, e continua se o celular não abrir WebGL.
 *
 * Conquista (dono, 27/10): não é mais a imagem dourada parada. O Life vivo
 * toca a animação "ouro" do protótipo — entra na pose da medalha, o dourado
 * sobe dos pés e ele volta ao verde. `humor="conquista"` toca ao aparecer;
 * `celebrar` (contador) toca de novo a cada aumento.
 */
export type HumorLife =
  | 'normal'
  | 'feliz'
  | 'calmo'
  | 'treino'
  | 'chef'
  | 'hidratado'
  | 'desidratado'
  | 'conquista'
  | 'resgate'

export function srcLife(humor: HumorLife): string {
  return `/life/${humor}.webp`
}

/** Versão do protótipo pra cada humor animado (+ expressão inicial). */
const VIVO: Partial<Record<HumorLife, { v: string; ex?: string }>> = {
  normal: { v: 'padrao' },
  feliz: { v: 'padrao', ex: 'feliz' },
  treino: { v: 'treino' },
  chef: { v: 'chef' },
  conquista: { v: 'padrao' },
}

/*
 * Enquadramento: o palco do protótipo (1400 × 2050) tem folga em volta do
 * Life pra pulos. O corpo do Life padrão ocupa 84% da altura e 80% da
 * largura, com os pés a 4% do chão — o iframe é maior que a caixa na mesma
 * proporção, pra o Life ficar do tamanho do PNG.
 */
const PROPORCAO_CAIXA = 0.65

export function LifeMascote(props: {
  humor: HumorLife
  className?: string
  alt?: string
  /** Sempre a imagem parada (tamanhos pequenos, listas). */
  estatico?: boolean
  /** 0–100: Life de Hábitos, o roxo sobe dos pés conforme os hábitos ficam pra trás. */
  nivelHabitos?: number | undefined
  /** Cada aumento toca a animação dourada da conquista uma vez. */
  celebrar?: number | undefined
}) {
  const vivo = props.estatico ? undefined : VIVO[props.humor]
  if (!vivo) {
    return (
      <img
        src={srcLife(props.humor)}
        alt={props.alt ?? 'Life'}
        draggable={false}
        className={`w-auto select-none object-contain drop-shadow-xl ${props.className ?? 'h-24'}`}
      />
    )
  }
  const versao = props.nivelHabitos !== undefined && vivo.v === 'padrao' ? 'habitos' : vivo.v
  return (
    <LifeVivo
      humor={props.humor}
      versao={versao}
      expressao={vivo.ex}
      nivelHabitos={props.nivelHabitos}
      celebrar={(props.celebrar ?? 0) + (props.humor === 'conquista' ? 1 : 0)}
      className={props.className ?? 'h-24'}
      alt={props.alt ?? 'Life'}
    />
  )
}

function LifeVivo(props: {
  humor: HumorLife
  versao: string
  expressao: string | undefined
  nivelHabitos: number | undefined
  celebrar: number
  className: string
  alt: string
}) {
  const quadro = useRef<HTMLIFrameElement>(null)
  const [pronto, setPronto] = useState(false)
  const [falhou, setFalhou] = useState(false)

  // A URL só leva a configuração inicial; trocas depois vão por mensagem
  // (sem recarregar o Life a cada mudança de humor/nível).
  const [src] = useState(() => {
    const q = new URLSearchParams({ v: props.versao })
    if (props.nivelHabitos !== undefined) q.set('hab', String(Math.round(props.nivelHabitos)))
    if (props.expressao) q.set('ex', props.expressao)
    return `/life/vivo/foco.html?${q}`
  })

  const enviar = (msg: Record<string, unknown>) => quadro.current?.contentWindow?.postMessage({ lifeVivo: msg.tipo, ...msg }, '*')

  useEffect(() => {
    const aoReceber = (e: MessageEvent) => {
      if (e.source !== quadro.current?.contentWindow) return
      const tipo = (e.data as { lifeVivo?: string } | null)?.lifeVivo
      if (tipo === 'pronto') setPronto(true)
      if (tipo === 'falhou') setFalhou(true)
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [])

  const iniciado = useRef(false)
  useEffect(() => {
    if (!iniciado.current) {
      iniciado.current = true
      return
    }
    enviar({ tipo: 'versao', id: props.versao })
    enviar({ tipo: 'expr', id: props.expressao ?? 'normal' })
  }, [props.versao, props.expressao])

  useEffect(() => {
    if (props.nivelHabitos !== undefined) enviar({ tipo: 'hab', valor: Math.round(props.nivelHabitos) })
  }, [props.nivelHabitos])

  // Só manda depois do "pronto": antes disso o protótipo ainda não ouve.
  const celebrados = useRef(0)
  useEffect(() => {
    if (!pronto || props.celebrar <= celebrados.current) return
    celebrados.current = props.celebrar
    enviar({ tipo: 'conquista' })
  }, [pronto, props.celebrar])

  const mostrarVivo = pronto && !falhou

  return (
    <span
      role="img"
      aria-label={props.alt}
      className={`relative inline-block flex-none select-none ${props.className}`}
      style={{ aspectRatio: String(PROPORCAO_CAIXA) }}
      // Toque: pula e sorri (o protótipo decide; dois toques = cosquinha).
      onPointerDown={() => enviar({ tipo: 'toque' })}
    >
      <img
        // Conquista: verde enquanto carrega (o dourado vem na animação); parado dourado se não houver WebGL.
        src={srcLife(props.humor === 'conquista' && !falhou ? 'normal' : props.humor)}
        alt=""
        draggable={false}
        className={`absolute inset-0 h-full w-full object-contain object-bottom drop-shadow-xl transition-opacity duration-200 ${
          mostrarVivo ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {!falhou && (
        <iframe
          ref={quadro}
          src={src}
          title=""
          aria-hidden="true"
          tabIndex={-1}
          loading="eager"
          // Mesmo esquema de cor do lado de dentro, senão o WebView pinta um fundo opaco.
          style={{ colorScheme: 'normal' }}
          className={`pointer-events-none absolute bottom-[-4.8%] left-[-12.5%] h-[119%] w-[125%] max-w-none border-0 bg-transparent transition-opacity duration-200 ${
            mostrarVivo ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </span>
  )
}
