import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LifeMascote, type HumorLife } from '@ui/components/LifeMascote'
import { calcularMetasIniciais } from '@domain/rules/metasIniciais'
import type { Objetivo, Sexo } from '@domain/entities/profile'

/**
 * PROTÓTIPO do onboarding em conversa (ideia do dono, vídeo do Fitfolio,
 * 2026-10-01). Rota pública /prototipo/onboarding — NADA é salvo, nenhum
 * dado vai pro banco. Serve só pra aprovar o jeito antes de codar o real
 * (que vai juntar onboarding + check de saúde + montar plano, com as RPCs
 * de sempre). Textos só em pt-BR por enquanto.
 */

type Entrada =
  | { tipo: 'texto'; placeholder: string }
  | { tipo: 'opcoes'; opcoes: readonly { id: string; rotulo: string }[] }
  | { tipo: 'multi'; opcoes: readonly { id: string; rotulo: string }[]; max?: number; nenhum?: string }
  | { tipo: 'regua'; min: number; max: number; passo: number; inicial: (r: Respostas) => number; unidade: string }
  | { tipo: 'data' }
  | { tipo: 'corpo' }
  | { tipo: 'confirmar'; rotulo: string }

type Respostas = Record<string, string | number | string[]>

interface Passo {
  readonly id: string
  readonly humor?: HumorLife
  readonly pergunta: (r: Respostas) => string
  readonly entrada: Entrada
  /** Comentário do Life depois da resposta (o que faz parecer conversa). */
  readonly reacao?: (valor: Respostas[string], r: Respostas) => string | null
  readonly pular?: (r: Respostas) => boolean
}

const nome = (r: Respostas) => String(r.nome ?? '').split(' ')[0] ?? ''
const querPlano = (r: Respostas) => r.plano === 'sim'

const PASSOS: readonly Passo[] = [
  {
    id: 'objetivo',
    pergunta: (r) => `Prazer, ${nome(r)}! 😄 Vou te conhecer rapidinho pra deixar o app do seu jeito. Qual é o seu objetivo agora?`,
    entrada: {
      tipo: 'opcoes',
      opcoes: [
        { id: 'emagrecer', rotulo: 'Perder gordura' },
        { id: 'massa', rotulo: 'Ganhar massa' },
        { id: 'manter', rotulo: 'Ter mais saúde' },
      ],
    },
    reacao: (v) =>
      v === 'emagrecer'
        ? 'Boa! Vamos com calma e constância — sem dieta maluca.'
        : v === 'massa'
          ? 'Bora crescer! Comida boa e treino bem feito.'
          : 'Adoro esse objetivo. Saúde primeiro, sempre.',
  },
  {
    id: 'sexo',
    pergunta: () => 'Qual seu sexo biológico? Ele muda a conta de energia do seu corpo.',
    entrada: {
      tipo: 'opcoes',
      opcoes: [
        { id: 'masculino', rotulo: 'Masculino' },
        { id: 'feminino', rotulo: 'Feminino' },
        { id: 'prefiro_nao_dizer', rotulo: 'Prefiro não dizer' },
      ],
    },
  },
  {
    id: 'nascimento',
    pergunta: () => 'Quando você nasceu?',
    entrada: { tipo: 'data' },
  },
  {
    id: 'altura',
    pergunta: () => 'Qual a sua altura?',
    entrada: { tipo: 'regua', min: 130, max: 220, passo: 1, inicial: (r) => (r.sexo === 'feminino' ? 163 : 175), unidade: 'cm' },
  },
  {
    id: 'peso',
    pergunta: () => 'E o seu peso hoje?',
    entrada: { tipo: 'regua', min: 35, max: 200, passo: 0.5, inicial: (r) => (r.sexo === 'feminino' ? 65 : 80), unidade: 'kg' },
  },
  {
    id: 'pesoMeta',
    pergunta: () => 'Onde você quer chegar?',
    pular: (r) => r.objetivo === 'manter',
    entrada: {
      tipo: 'regua',
      min: 35,
      max: 200,
      passo: 0.5,
      inicial: (r) => Number(r.peso) + (r.objetivo === 'massa' ? 5 : -5),
      unidade: 'kg',
    },
    reacao: (v, r) => {
      const dif = Math.abs(Number(v) - Number(r.peso))
      return dif > 0 ? `${dif.toLocaleString('pt-BR')} kg. Dá pra chegar lá, um passo de cada vez. 💪` : null
    },
  },
  {
    id: 'ritmo',
    pergunta: () => 'Quanto por semana? Mais devagar é mais fácil de manter.',
    pular: (r) => r.objetivo !== 'emagrecer',
    entrada: { tipo: 'regua', min: 0.25, max: 0.75, passo: 0.05, inicial: () => 0.5, unidade: 'kg/sem' },
  },
  {
    id: 'plano',
    humor: 'treino',
    pergunta: (r) => `${nome(r)}, quer que eu monte um plano de treino e dieta pra você?`,
    entrada: {
      tipo: 'opcoes',
      opcoes: [
        { id: 'sim', rotulo: 'Quero!' },
        { id: 'nao', rotulo: 'Agora não' },
      ],
    },
    reacao: (v) =>
      v === 'sim'
        ? 'Fechado! Antes, umas perguntas rápidas de saúde — é só uma vez.'
        : 'Tranquilo! Quando quiser, é só me chamar.',
  },
  {
    id: 't1',
    humor: 'calmo',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Algum médico já disse que você tem problema no coração ou pressão alta? Ou sente dor no peito, tontura, ou já desmaiou?',
    entrada: { tipo: 'opcoes', opcoes: [{ id: 'nao', rotulo: 'Não' }, { id: 'sim', rotulo: 'Sim' }] },
    reacao: (v) => (v === 'sim' ? 'Anotado. O ideal é falar com um médico antes — eu monto algo mais leve.' : null),
  },
  {
    id: 't2',
    humor: 'calmo',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Tem doença crônica, toma remédio contínuo ou algum médico pediu pra só se exercitar com supervisão?',
    entrada: { tipo: 'opcoes', opcoes: [{ id: 'nao', rotulo: 'Não' }, { id: 'sim', rotulo: 'Sim' }] },
  },
  {
    id: 't3',
    humor: 'calmo',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Tem lesão em osso, articulação ou músculo, ou fez cirurgia nos últimos 6 meses?',
    entrada: { tipo: 'opcoes', opcoes: [{ id: 'nao', rotulo: 'Não' }, { id: 'sim', rotulo: 'Sim' }] },
  },
  {
    id: 't4',
    humor: 'calmo',
    pular: (r) => !querPlano(r) || r.sexo !== 'feminino',
    pergunta: () => 'Está grávida, pode estar ou está amamentando?',
    entrada: { tipo: 'opcoes', opcoes: [{ id: 'nao', rotulo: 'Não' }, { id: 'sim', rotulo: 'Sim' }] },
  },
  {
    id: 't5',
    humor: 'calmo',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Tem ou já teve transtorno alimentar, fez bariátrica ou segue dieta especial por orientação médica?',
    entrada: { tipo: 'opcoes', opcoes: [{ id: 'nao', rotulo: 'Não' }, { id: 'sim', rotulo: 'Sim' }] },
  },
  {
    id: 'declaracao',
    humor: 'calmo',
    pular: (r) => !querPlano(r),
    pergunta: () =>
      'Confirma pra mim: as respostas são verdadeiras, e você sabe que o plano é uma referência geral, que não substitui médico, nutricionista ou educador físico?',
    entrada: { tipo: 'confirmar', rotulo: 'Confirmo' },
    reacao: () => 'Valeu! Agora a parte boa: o treino. 🏋️',
  },
  {
    id: 'nivel',
    humor: 'treino',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Como você está nos treinos hoje?',
    entrada: {
      tipo: 'opcoes',
      opcoes: [
        { id: 'iniciante', rotulo: 'Começando agora' },
        { id: 'intermediario', rotulo: 'Já treino' },
        { id: 'avancado', rotulo: 'Treino pesado' },
      ],
    },
  },
  {
    id: 'foco',
    humor: 'treino',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Toque em até 3 músculos que você quer focar:',
    entrada: { tipo: 'corpo' },
    reacao: (v) => (Array.isArray(v) && v.length > 0 ? 'Boa escolha! Vou dar mais atenção pra eles.' : 'Beleza, corpo todo por igual.'),
  },
  {
    id: 'dias',
    humor: 'treino',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Em quais dias você consegue treinar?',
    entrada: {
      tipo: 'multi',
      opcoes: [
        { id: 'seg', rotulo: 'Seg' },
        { id: 'ter', rotulo: 'Ter' },
        { id: 'qua', rotulo: 'Qua' },
        { id: 'qui', rotulo: 'Qui' },
        { id: 'sex', rotulo: 'Sex' },
        { id: 'sab', rotulo: 'Sáb' },
        { id: 'dom', rotulo: 'Dom' },
      ],
    },
    reacao: (v) => {
      const n = Array.isArray(v) ? v.length : 0
      return n >= 5 ? `${n} dias! Vou deixar dia de descanso no meio, tá?` : n >= 3 ? `${n} dias já dá pra evoluir muito bem.` : 'Pouco tempo? Sem problema, treino curto e eficiente.'
    },
  },
  {
    id: 'local',
    humor: 'treino',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Onde você vai treinar?',
    entrada: { tipo: 'opcoes', opcoes: [{ id: 'academia', rotulo: 'Academia' }, { id: 'casa', rotulo: 'Em casa' }] },
  },
  {
    id: 'minutos',
    humor: 'treino',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Quanto tempo por treino?',
    entrada: {
      tipo: 'opcoes',
      opcoes: [
        { id: '30', rotulo: '30 min' },
        { id: '45', rotulo: '45 min' },
        { id: '60', rotulo: '1 hora' },
        { id: '90', rotulo: '1h30' },
      ],
    },
    reacao: () => 'Treino anotado. Agora a comida! 🍽️',
  },
  {
    id: 'refeicoes',
    humor: 'chef',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Quais refeições você costuma fazer?',
    entrada: {
      tipo: 'multi',
      opcoes: [
        { id: 'cafe', rotulo: 'Café da manhã' },
        { id: 'almoco', rotulo: 'Almoço' },
        { id: 'lanche', rotulo: 'Lanche' },
        { id: 'jantar', rotulo: 'Jantar' },
      ],
    },
  },
  {
    id: 'evitar',
    humor: 'chef',
    pular: (r) => !querPlano(r),
    pergunta: () => 'Tem algo que você não come, não gosta ou tem alergia?',
    entrada: {
      tipo: 'multi',
      nenhum: 'Como de tudo',
      opcoes: [
        { id: 'frutas', rotulo: 'Frutas' },
        { id: 'verduras', rotulo: 'Verduras' },
        { id: 'peixe', rotulo: 'Peixe' },
        { id: 'lactose', rotulo: 'Lactose' },
        { id: 'gluten', rotulo: 'Glúten' },
        { id: 'amendoim', rotulo: 'Amendoim' },
        { id: 'carne', rotulo: 'Carne (vegetariano)' },
      ],
    },
    reacao: (v) => (Array.isArray(v) && v.length > 0 ? 'Anotado, fica tudo de fora do seu cardápio.' : 'Ótimo, mais opções pra variar!'),
  },
  {
    id: 'lembretes',
    pergunta: () => 'Última! Quer que eu te lembre de beber água, comer e treinar? Fico quieto quando você já fez. 🤫',
    entrada: { tipo: 'opcoes', opcoes: [{ id: 'sim', rotulo: 'Quero' }, { id: 'nao', rotulo: 'Agora não' }] },
  },
]

const ROTULO_MUSCULO: Record<string, string> = {
  ombros: 'Ombros',
  peito: 'Peito',
  bracos: 'Braços',
  abdomen: 'Abdômen',
  pernas: 'Pernas',
  costas: 'Costas',
  gluteos: 'Glúteos',
  panturrilhas: 'Panturrilhas',
}

function textoDaResposta(passo: Passo, valor: Respostas[string]): string {
  const e = passo.entrada
  if (e.tipo === 'opcoes') return e.opcoes.find((o) => o.id === valor)?.rotulo ?? String(valor)
  if (e.tipo === 'multi') {
    const lista = valor as string[]
    if (lista.length === 0) return e.nenhum ?? 'Nenhum'
    return lista.map((id) => e.opcoes.find((o) => o.id === id)?.rotulo ?? id).join(', ')
  }
  if (e.tipo === 'regua') return `${Number(valor).toLocaleString('pt-BR')} ${e.unidade}`
  if (e.tipo === 'data') return new Date(`${String(valor)}T12:00:00`).toLocaleDateString('pt-BR')
  if (e.tipo === 'corpo') {
    const lista = valor as string[]
    return lista.length === 0 ? 'Corpo todo' : lista.map((m) => ROTULO_MUSCULO[m] ?? m).join(', ')
  }
  if (e.tipo === 'confirmar') return e.rotulo
  return String(valor)
}

interface Mensagem {
  readonly de: 'life' | 'pessoa'
  readonly texto: string
}

type Fase = 'abertura' | 'chat' | 'pensando' | 'plano'

export function OnboardingConversa() {
  const [fase, setFase] = useState<Fase>('abertura')
  const [respostas, setRespostas] = useState<Respostas>({})
  const [msgs, setMsgs] = useState<Mensagem[]>([])
  const [indice, setIndice] = useState(-1)
  const [digitando, setDigitando] = useState(false)
  const [humor, setHumor] = useState<HumorLife>('normal')
  const fim = useRef<HTMLDivElement>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, digitando, indice])

  function depois(ms: number, fn: () => void) {
    timers.current.push(setTimeout(fn, ms))
  }

  /** O Life "digita" e fala as frases em sequência; depois abre a próxima pergunta. */
  function lifeFala(frases: string[], proximo: number) {
    setIndice(-1)
    let atraso = 0
    for (const f of frases) {
      atraso += 350
      depois(atraso, () => setDigitando(true))
      atraso += Math.min(1400, 450 + f.length * 12)
      depois(atraso, () => {
        setDigitando(false)
        setMsgs((ms) => [...ms, { de: 'life', texto: f }])
      })
    }
    depois(atraso + 150, () => {
      if (proximo >= PASSOS.length) {
        setFase('pensando')
        depois(2600, () => setFase('plano'))
        return
      }
      setHumor(PASSOS[proximo]?.humor ?? 'normal')
      setIndice(proximo)
    })
  }

  function proximoPasso(de: number, r: Respostas): number {
    let i = de
    while (i < PASSOS.length && PASSOS[i]?.pular?.(r)) i++
    return i
  }

  function comecar(nomeDigitado: string) {
    const r = { nome: nomeDigitado.trim() }
    setRespostas(r)
    setMsgs([
      { de: 'life', texto: 'Oi! Eu sou o Life 👋 Como posso te chamar?' },
      { de: 'pessoa', texto: r.nome },
    ])
    setFase('chat')
    const prox = proximoPasso(0, r)
    lifeFala([PASSOS[prox]?.pergunta(r) ?? ''], prox)
  }

  function responder(valor: Respostas[string]) {
    const passo = PASSOS[indice]
    if (!passo) return
    const r = { ...respostas, [passo.id]: valor }
    setRespostas(r)
    setMsgs((ms) => [...ms, { de: 'pessoa', texto: textoDaResposta(passo, valor) }])
    const prox = proximoPasso(indice + 1, r)
    const reacao = passo.reacao?.(valor, r)
    const frases = [reacao, prox < PASSOS.length ? PASSOS[prox]?.pergunta(r) : null].filter((f): f is string => !!f)
    lifeFala(frases, prox)
  }

  function recomecar() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setFase('abertura')
    setRespostas({})
    setMsgs([])
    setIndice(-1)
    setHumor('normal')
  }

  if (fase === 'abertura') return <Abertura onNome={comecar} />
  if (fase === 'pensando') return <Pensando />
  if (fase === 'plano') return <PlanoPronto r={respostas} onRecomecar={recomecar} />

  const passo = indice >= 0 ? PASSOS[indice] : undefined
  const visiveis = PASSOS.filter((p) => !p.pular?.(respostas))
  const feitos = visiveis.filter((p) => p.id in respostas).length

  return (
    <main className="flex h-[100dvh] flex-col bg-surface-1">
      <FaixaPrototipo />
      <header className="flex items-center gap-3 border-b border-surface-4 px-4 py-2">
        <LifeMascote humor={humor} className="h-12" />
        <div className="flex-1">
          <p className="text-sm font-bold text-content-hi">Life</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-4">
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${(feitos / visiveis.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {msgs.map((msg, i) =>
          msg.de === 'life' ? (
            <div key={i} className="max-w-[85%] animate-[aparecer_.25s_ease-out] rounded-2xl rounded-tl-md border border-surface-4 bg-surface-2 p-3.5 text-sm leading-relaxed text-content-mid">
              {msg.texto}
            </div>
          ) : (
            <div key={i} className="ml-auto w-fit max-w-[85%] animate-[aparecer_.25s_ease-out] rounded-2xl rounded-tr-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-[#04120a]">
              {msg.texto}
            </div>
          ),
        )}
        {digitando && <Digitando />}
        <div ref={fim} />
      </div>

      {passo && (
        <div className="border-t border-surface-4 bg-surface-2 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
          <ControleDaEntrada key={passo.id} passo={passo} r={respostas} onResponder={responder} />
        </div>
      )}
    </main>
  )
}

// ---------------------------------------------------------------
// Peças
// ---------------------------------------------------------------

function FaixaPrototipo() {
  return (
    <div className="bg-accent-gold/15 px-4 py-1 text-center text-micro font-semibold text-accent-gold">
      Protótipo — nada é salvo
    </div>
  )
}

function Digitando() {
  return (
    <div className="flex w-fit gap-1 rounded-2xl rounded-tl-md border border-surface-4 bg-surface-2 px-4 py-3">
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-content-low" style={{ animationDelay: `${d}ms` }} />
      ))}
    </div>
  )
}

function Abertura(props: { onNome: (n: string) => void }) {
  const [etapa, setEtapa] = useState<'pensando' | 'pergunta'>('pensando')
  const [nomeDigitado, setNome] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setEtapa('pergunta'), 1400)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="flex h-[100dvh] flex-col bg-surface-1">
      <FaixaPrototipo />
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <span className="absolute h-64 w-64 rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
        <LifeMascote humor="normal" className="relative h-44 animate-[flutuar_3s_ease-in-out_infinite]" />
        <div className="relative mt-6 min-h-[88px] text-center">
          {etapa === 'pensando' ? (
            <div className="flex justify-center gap-1.5 pt-6">
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-2.5 w-2.5 animate-bounce rounded-full bg-content-low" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          ) : (
            <div className="animate-[aparecer_.4s_ease-out]">
              <p className="text-2xl font-bold text-content-hi">Oi! Eu sou o Life 👋</p>
              <p className="mt-1 text-lg text-content-mid">Como posso te chamar?</p>
            </div>
          )}
        </div>
      </div>
      {etapa === 'pergunta' && (
        <form
          className="flex animate-[aparecer_.4s_ease-out] gap-2 px-4 pb-[calc(20px+env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault()
            if (nomeDigitado.trim()) props.onNome(nomeDigitado)
          }}
        >
          <input
            autoFocus
            value={nomeDigitado}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className="flex-1 rounded-pill border border-surface-4 bg-surface-3 px-4 py-3 text-base text-content-hi outline-none focus:border-brand"
          />
          <BotaoEnviar desligado={!nomeDigitado.trim()} />
        </form>
      )}
    </main>
  )
}

function BotaoEnviar(props: { desligado: boolean; onClick?: () => void }) {
  return (
    <button
      type={props.onClick ? 'button' : 'submit'}
      onClick={props.onClick}
      disabled={props.desligado}
      aria-label="Enviar"
      className="grid h-12 w-12 flex-none place-items-center rounded-full bg-brand text-[#04120a] disabled:opacity-40"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
    </button>
  )
}

function Chip(props: { ativo?: boolean; onClick: () => void; children: ReactNode; desligado?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.desligado}
      onClick={props.onClick}
      className={`rounded-pill border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-40 ${
        props.ativo ? 'border-brand bg-brand text-[#04120a]' : 'border-brand/60 bg-brand/10 text-brand'
      }`}
    >
      {props.children}
    </button>
  )
}

function BotaoPrincipal(props: { onClick: () => void; children: ReactNode; desligado?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.desligado}
      className="mt-3 w-full rounded-pill bg-brand py-3 text-sm font-bold text-[#04120a] disabled:opacity-40"
    >
      {props.children}
    </button>
  )
}

function ControleDaEntrada(props: { passo: Passo; r: Respostas; onResponder: (v: Respostas[string]) => void }) {
  const e = props.passo.entrada
  const [lista, setLista] = useState<string[]>([])
  const [texto, setTexto] = useState('')

  if (e.tipo === 'opcoes')
    return (
      <div className="flex flex-wrap justify-end gap-2">
        {e.opcoes.map((o) => (
          <Chip key={o.id} onClick={() => props.onResponder(o.id)}>
            {o.rotulo}
          </Chip>
        ))}
      </div>
    )

  if (e.tipo === 'multi') {
    const alternar = (id: string) =>
      setLista((l) => (l.includes(id) ? l.filter((x) => x !== id) : e.max && l.length >= e.max ? l : [...l, id]))
    return (
      <>
        <div className="flex flex-wrap justify-end gap-2">
          {e.nenhum && (
            <Chip onClick={() => props.onResponder([])}>{e.nenhum}</Chip>
          )}
          {e.opcoes.map((o) => (
            <Chip key={o.id} ativo={lista.includes(o.id)} onClick={() => alternar(o.id)}>
              {o.rotulo}
            </Chip>
          ))}
        </div>
        <BotaoPrincipal desligado={lista.length === 0} onClick={() => props.onResponder(lista)}>
          Pronto
        </BotaoPrincipal>
      </>
    )
  }

  if (e.tipo === 'regua') return <Regua entrada={e} r={props.r} onConfirmar={props.onResponder} />

  if (e.tipo === 'data')
    return (
      <div className="flex gap-2">
        <input
          type="date"
          value={texto}
          max="2012-12-31"
          onChange={(ev) => setTexto(ev.target.value)}
          className="flex-1 rounded-pill border border-surface-4 bg-surface-3 px-4 py-3 text-base text-content-hi [color-scheme:dark]"
        />
        <BotaoEnviar desligado={!texto} onClick={() => props.onResponder(texto)} />
      </div>
    )

  if (e.tipo === 'corpo') return <EscolherMusculos onConfirmar={props.onResponder} />

  if (e.tipo === 'confirmar')
    return <BotaoPrincipal onClick={() => props.onResponder('ok')}>{e.rotulo}</BotaoPrincipal>

  return (
    <form
      className="flex gap-2"
      onSubmit={(ev) => {
        ev.preventDefault()
        if (texto.trim()) props.onResponder(texto.trim())
      }}
    >
      <input
        autoFocus
        value={texto}
        onChange={(ev) => setTexto(ev.target.value)}
        placeholder={e.placeholder}
        className="flex-1 rounded-pill border border-surface-4 bg-surface-3 px-4 py-3 text-base text-content-hi outline-none focus:border-brand"
      />
      <BotaoEnviar desligado={!texto.trim()} />
    </form>
  )
}

/** Roda de rolar (altura, peso, ritmo) — o valor do meio é o escolhido. */
function Regua(props: {
  entrada: Extract<Entrada, { tipo: 'regua' }>
  r: Respostas
  onConfirmar: (v: number) => void
}) {
  const { min, max, passo, unidade } = props.entrada
  const valores = useRef<number[]>([])
  if (valores.current.length === 0) {
    for (let v = min; v <= max + 1e-9; v += passo) valores.current.push(Math.round(v * 100) / 100)
  }
  const inicial = Math.min(max, Math.max(min, props.entrada.inicial(props.r)))
  const [valor, setValor] = useState(inicial)
  const caixa = useRef<HTMLDivElement>(null)
  const ALTURA = 44

  useEffect(() => {
    const i = valores.current.findIndex((v) => Math.abs(v - inicial) < passo / 2)
    if (caixa.current && i >= 0) caixa.current.scrollTop = i * ALTURA
  }, [inicial, passo])

  const casas = passo < 0.1 ? 2 : passo < 1 ? 1 : 0
  return (
    <>
      <div className="relative mx-auto h-[132px] w-48">
        <div className="pointer-events-none absolute inset-x-0 top-[44px] h-[44px] rounded-xl border border-brand/60 bg-brand/10" />
        <div
          ref={caixa}
          onScroll={(ev) => {
            const i = Math.round(ev.currentTarget.scrollTop / ALTURA)
            const v = valores.current[Math.min(valores.current.length - 1, Math.max(0, i))]
            if (v !== undefined) setValor(v)
          }}
          className="h-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ maskImage: 'linear-gradient(transparent, black 35%, black 65%, transparent)' }}
        >
          <div style={{ height: ALTURA }} />
          {valores.current.map((v) => (
            <div
              key={v}
              style={{ height: ALTURA }}
              className={`grid snap-center place-items-center text-xl tabular-nums ${
                v === valor ? 'font-bold text-content-hi' : 'text-content-dim'
              }`}
            >
              {v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}
            </div>
          ))}
          <div style={{ height: ALTURA }} />
        </div>
        <span className="pointer-events-none absolute right-2 top-[44px] grid h-[44px] place-items-center text-sm text-content-low">
          {unidade}
        </span>
      </div>
      <BotaoPrincipal onClick={() => props.onConfirmar(valor)}>Confirmar</BotaoPrincipal>
    </>
  )
}

/** Boneco frente/costas: toca no músculo pra marcar (até 3). */
function EscolherMusculos(props: { onConfirmar: (v: string[]) => void }) {
  const [sel, setSel] = useState<string[]>([])
  const alternar = (m: string) => setSel((s) => (s.includes(m) ? s.filter((x) => x !== m) : s.length >= 3 ? s : [...s, m]))
  const cor = (m: string) => (sel.includes(m) ? '#22c55e' : '#3a3a3a')

  // Função (não componente): um componente criado dentro do render remontaria a cada toque.
  const parte = (m: string, formas: ReactNode) => (
    <g onClick={() => alternar(m)} className="cursor-pointer" fill={cor(m)} style={{ transition: 'fill .2s' }}>
      <title>{ROTULO_MUSCULO[m]}</title>
      {formas}
    </g>
  )

  const cabecaTronco = (
    <>
      <circle cx="50" cy="14" r="10" fill="#2a2a2a" />
      <rect x="45" y="23" width="10" height="6" fill="#2a2a2a" />
    </>
  )

  return (
    <>
      <div className="flex justify-center gap-6">
        <figure className="text-center">
          <svg viewBox="0 0 100 200" className="h-48">
            {cabecaTronco}
            {parte('ombros', <><ellipse cx="28" cy="36" rx="10" ry="7" /><ellipse cx="72" cy="36" rx="10" ry="7" /></>)}
            {parte('peito', <><rect x="33" y="31" width="34" height="22" rx="6" /></>)}
            {parte('bracos', <><rect x="14" y="44" width="11" height="44" rx="5" /><rect x="75" y="44" width="11" height="44" rx="5" /></>)}
            {parte('abdomen', <><rect x="37" y="56" width="26" height="36" rx="5" /></>)}
            {parte('pernas', <><rect x="33" y="96" width="15" height="54" rx="6" /><rect x="52" y="96" width="15" height="54" rx="6" /></>)}
            {parte('panturrilhas', <><rect x="35" y="154" width="11" height="38" rx="5" /><rect x="54" y="154" width="11" height="38" rx="5" /></>)}
          </svg>
          <figcaption className="text-micro text-content-dim">Frente</figcaption>
        </figure>
        <figure className="text-center">
          <svg viewBox="0 0 100 200" className="h-48">
            {cabecaTronco}
            {parte('ombros', <><ellipse cx="28" cy="36" rx="10" ry="7" /><ellipse cx="72" cy="36" rx="10" ry="7" /></>)}
            {parte('costas', <><path d="M33 31h34l-4 54H37z" /></>)}
            {parte('bracos', <><rect x="14" y="44" width="11" height="44" rx="5" /><rect x="75" y="44" width="11" height="44" rx="5" /></>)}
            {parte('gluteos', <><rect x="34" y="87" width="32" height="20" rx="8" /></>)}
            {parte('pernas', <><rect x="33" y="109" width="15" height="42" rx="6" /><rect x="52" y="109" width="15" height="42" rx="6" /></>)}
            {parte('panturrilhas', <><rect x="35" y="154" width="11" height="38" rx="5" /><rect x="54" y="154" width="11" height="38" rx="5" /></>)}
          </svg>
          <figcaption className="text-micro text-content-dim">Costas</figcaption>
        </figure>
      </div>
      <p className="mt-1 text-center text-micro text-content-low">
        {sel.length === 0 ? 'Nenhum marcado = corpo todo' : sel.map((m) => ROTULO_MUSCULO[m]).join(' · ')}
      </p>
      <BotaoPrincipal onClick={() => props.onConfirmar(sel)}>{sel.length === 0 ? 'Corpo todo' : 'Pronto'}</BotaoPrincipal>
    </>
  )
}

function Pensando() {
  return (
    <main className="flex h-[100dvh] flex-col bg-surface-1">
      <FaixaPrototipo />
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="absolute h-64 w-64 animate-pulse rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
        <LifeMascote humor="treino" className="relative h-40 animate-[flutuar_1.6s_ease-in-out_infinite]" />
        <p className="relative mt-6 text-lg font-semibold text-content-hi">Montando seu plano…</p>
        <div className="relative mt-3 flex gap-1.5">
          {[0, 150, 300].map((d) => (
            <span key={d} className="h-2.5 w-2.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    </main>
  )
}

function idadeDe(iso: unknown): number {
  if (typeof iso !== 'string' || !iso) return 30
  const n = new Date(`${iso}T12:00:00`)
  const hoje = new Date()
  let idade = hoje.getFullYear() - n.getFullYear()
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) idade--
  return idade
}

function PlanoPronto(props: { r: Respostas; onRecomecar: () => void }) {
  const { r } = props
  const [aviso, setAviso] = useState<string | null>(null)
  const objetivo = (String(r.objetivo ?? 'manter') as Objetivo)
  const sexo = (r.sexo === 'prefiro_nao_dizer' ? 'prefiro_nao_dizer' : String(r.sexo ?? 'prefiro_nao_dizer')) as Sexo
  const dias = Array.isArray(r.dias) ? r.dias : []
  const metas = calcularMetasIniciais({
    pesoKg: Number(r.peso ?? 75),
    alturaCm: Number(r.altura ?? 170),
    idade: idadeDe(r.nascimento),
    sexo,
    objetivo,
    frequencia: dias.length >= 6 ? '6x+' : dias.length >= 4 ? '4-5x' : dias.length >= 2 ? '2-3x' : '1x',
  })
  const comPlano = r.plano === 'sim'
  const refeicoes = Array.isArray(r.refeicoes) && r.refeicoes.length > 0 ? r.refeicoes : ['cafe', 'almoco', 'lanche', 'jantar']
  const foco = Array.isArray(r.foco) && r.foco.length > 0 ? r.foco.map((m) => ROTULO_MUSCULO[m]).join(' + ') : 'Corpo todo'
  const fatia: Record<string, number> = { cafe: 0.25, almoco: 0.35, lanche: 0.15, jantar: 0.25 }
  const somaFatias = refeicoes.reduce((s, t) => s + (fatia[t] ?? 0), 0) || 1
  const ROT: Record<string, [string, string, string]> = {
    cafe: ['☕', 'Café da manhã', '08:00'],
    almoco: ['🍽️', 'Almoço', '12:30'],
    lanche: ['🍎', 'Lanche', '16:00'],
    jantar: ['🌙', 'Jantar', '20:00'],
  }

  const linhaDoDia: { icone: string; titulo: string; sub: string; hora: string }[] = refeicoes.map((t) => ({
    icone: ROT[t]?.[0] ?? '🍽️',
    titulo: ROT[t]?.[1] ?? t,
    sub: `~${Math.round(((fatia[t] ?? 0.25) / somaFatias) * metas.kcal / 10) * 10} kcal`,
    hora: ROT[t]?.[2] ?? '',
  }))
  if (comPlano) {
    linhaDoDia.push({
      icone: '💪',
      titulo: `Treino · ${foco}`,
      sub: `${String(r.minutos ?? 45)} min · ${r.local === 'casa' ? 'em casa' : 'academia'} · ${dias.length}x/semana`,
      hora: '18:00',
    })
  }
  linhaDoDia.sort((a, b) => a.hora.localeCompare(b.hora))
  linhaDoDia.push({ icone: '💧', titulo: 'Água', sub: `${(metas.aguaMl / 1000).toLocaleString('pt-BR')} L no dia`, hora: '' })

  const nos = [
    { valor: metas.kcal.toLocaleString('pt-BR'), rotulo: 'kcal' },
    { valor: `${metas.proteina}g`, rotulo: 'Prot' },
    { valor: `${metas.carboidrato}g`, rotulo: 'Carbo' },
    { valor: `${metas.gordura}g`, rotulo: 'Gord' },
  ]

  return (
    <main className="flex min-h-[100dvh] flex-col bg-surface-1">
      <FaixaPrototipo />
      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-6">
        <p className="text-center text-lg font-bold text-content-hi">
          {comPlano ? `Seu plano está pronto, ${nome(r)}!` : `Tudo pronto, ${nome(r)}!`}
        </p>
        <p className="mt-1 text-center text-micro text-content-low">Uma referência pra começar — dá pra ajustar quando quiser.</p>

        {/* Árvore: Life no topo, metas do dia embaixo */}
        <div className="relative mx-auto mt-4 w-full max-w-sm">
          <div className="flex justify-center">
            <LifeMascote humor="conquista" className="h-20 animate-[aparecer_.5s_ease-out]" />
          </div>
          <svg viewBox="0 0 320 40" className="h-10 w-full" preserveAspectRatio="none" aria-hidden="true">
            {[40, 120, 200, 280].map((x, i) => (
              <path key={x} d={`M160 0 C160 22, ${x} 18, ${x} 40`} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="200" strokeDashoffset="200" style={{ animation: `desenhar .8s ${i * 0.12}s ease-out forwards` }} />
            ))}
          </svg>
          <div className="grid grid-cols-4 gap-2">
            {nos.map((n, i) => (
              <div key={n.rotulo} className="flex flex-col items-center opacity-0" style={{ animation: `aparecer .4s ${0.5 + i * 0.12}s ease-out forwards` }}>
                <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-brand bg-brand/10 text-sm font-bold text-content-hi">
                  {n.valor}
                </span>
                <span className="mt-1 text-micro text-content-low">{n.rotulo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Linha do dia */}
        <div className="relative mx-auto mt-6 max-w-sm pl-6">
          <span className="absolute bottom-3 left-[9px] top-3 w-0.5 bg-brand/40" aria-hidden="true" />
          {linhaDoDia.map((l, i) => (
            <div key={l.titulo} className="relative mb-2.5 opacity-0" style={{ animation: `aparecer .35s ${1 + i * 0.1}s ease-out forwards` }}>
              <span className="absolute -left-[21px] top-4 h-3 w-3 rounded-full border-2 border-brand bg-surface-1" aria-hidden="true" />
              <div className="flex items-center gap-3 rounded-xl border border-surface-4 bg-surface-2 px-3.5 py-3">
                <span className="text-xl" aria-hidden="true">{l.icone}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-content-hi">{l.titulo}</span>
                  <span className="block text-micro text-content-low">{l.sub}</span>
                </span>
                {l.hora && <span className="text-micro tabular-nums text-content-dim">{l.hora}</span>}
              </div>
            </div>
          ))}
        </div>
        {r.lembretes === 'sim' && (
          <p className="mx-auto mt-2 max-w-sm text-center text-micro text-content-low">🔔 Lembretes de água, refeições e treino ligados.</p>
        )}
        {aviso && <p className="mx-auto mt-3 max-w-sm rounded-xl bg-accent-gold/10 p-3 text-center text-micro text-accent-gold">{aviso}</p>}
      </div>

      <div className="border-t border-surface-4 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => setAviso('No app de verdade: abre a Home já com as metas, a ficha de treino e os cards da Dieta preenchidos.')}
          className="w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-[#04120a]"
        >
          {comPlano ? 'Ver meu plano' : 'Entrar no app'}
        </button>
        {comPlano && (
          <button
            type="button"
            onClick={() => setAviso('No app de verdade: entra só com as metas; o plano fica guardado no chat do Life.')}
            className="mt-2 w-full py-2 text-sm text-content-low"
          >
            Entrar sem plano
          </button>
        )}
        <button type="button" onClick={props.onRecomecar} className="w-full py-1 text-micro text-content-dim underline">
          Recomeçar protótipo
        </button>
      </div>
    </main>
  )
}
