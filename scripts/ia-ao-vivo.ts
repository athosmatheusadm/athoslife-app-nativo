// Teste AO VIVO da IA (08/11) — chama o Luna e o Haiku de verdade, com dados
// fictícios, ANTES de publicar a ai-proxy. Confere o formato dos pedidos e das
// respostas, que os testes unitários (com fetch falso) não pegam.
//
//   OPENAI_API_KEY=... ANTHROPIC_API_KEY=... npx deno run -A --node-modules-dir=none scripts/ia-ao-vivo.ts
//
// Gasta centavos. Sem ANTHROPIC_API_KEY, pula os casos do Haiku.
import { chamarIA, type Ferramenta, type PedidoIA } from '../supabase/functions/ai-proxy/ia.ts'
import { chamarOpenAI } from '../supabase/functions/ai-proxy/openai.ts'
import { chamarAnthropic } from '../supabase/functions/ai-proxy/anthropic.ts'

const LUNA = Deno.env.get('IA_MODELO') ?? 'gpt-6-luna'
const HAIKU = Deno.env.get('IA_MODELO_RESERVA') ?? 'claude-haiku-5-5'
const temHaiku = !!Deno.env.get('ANTHROPIC_API_KEY')

const SISTEMA = 'Você é o Life, companheiro de saúde do app ATHOSlife. Responda em português do Brasil, curto e caloroso, sem prescrever dose, calorias ou carga.'
const REGISTRAR: Ferramenta = {
  name: 'registrar_alimentos',
  description: 'Registra o que a pessoa comeu, quando ela contar uma refeição.',
  parameters: {
    type: 'object',
    properties: {
      refeicao: { type: 'string', description: 'cafe, almoco, lanche ou jantar' },
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: { nome: { type: 'string' }, quantidade: { type: 'number' }, unidade: { type: 'string' } },
          required: ['nome'],
        },
      },
    },
    required: ['itens'],
  },
}

const casos: { nome: string; pedido: PedidoIA; stream?: boolean; confere: (r: Awaited<ReturnType<typeof chamarIA>>) => string | null }[] = [
  {
    nome: 'conversa simples',
    pedido: { sistema: SISTEMA, mensagens: [{ papel: 'usuario', texto: 'oi, tudo bem? dormi mal hoje' }], maxSaida: 280 },
    confere: (r) => (r.texto.length > 5 ? null : 'texto vazio'),
  },
  {
    nome: 'conversa com raciocínio baixo (pago)',
    pedido: { sistema: SISTEMA, mensagens: [{ papel: 'usuario', texto: 'me dá uma ideia de lanche sem lactose' }], maxSaida: 400, pensar: true },
    confere: (r) => (r.texto.length > 5 ? null : 'texto vazio'),
  },
  {
    nome: 'streaming',
    stream: true,
    pedido: { sistema: SISTEMA, mensagens: [{ papel: 'usuario', texto: 'bom dia! bora treinar hoje?' }], maxSaida: 280 },
    confere: (r) => (r.texto.length > 5 && r.primeiraEm ? null : 'sem texto ou sem primeiro pedaço'),
  },
  {
    nome: 'ferramenta (refeição contada)',
    pedido: {
      sistema: SISTEMA,
      mensagens: [{ papel: 'usuario', texto: 'almocei 150 g de arroz, uma concha de feijão e um bife' }],
      ferramentas: [REGISTRAR],
      maxSaida: 280,
    },
    confere: (r) => (r.chamadas[0]?.nome === 'registrar_alimentos' ? null : `não chamou a ferramenta: ${r.texto.slice(0, 80)}`),
  },
  {
    nome: 'ferramenta forçada',
    pedido: {
      sistema: SISTEMA,
      mensagens: [{ papel: 'usuario', texto: 'comi 2 ovos' }],
      ferramentas: [REGISTRAR],
      forcar: 'registrar_alimentos',
      maxSaida: 280,
    },
    confere: (r) => (r.chamadas[0]?.nome === 'registrar_alimentos' ? null : 'não chamou a ferramenta'),
  },
  {
    nome: 'JSON (estimar)',
    pedido: {
      sistema: 'Estime valores nutricionais. Responda só JSON: {"reconhecido":true,"nome":"","porcao_g":0,"calorias":0}',
      mensagens: [{ papel: 'usuario', texto: '<alimento>pão de queijo</alimento>' }],
      maxSaida: 400,
      json: true,
    },
    confere: (r) => {
      try { return typeof JSON.parse(r.texto).calorias === 'number' ? null : 'JSON sem calorias' } catch { return `não é JSON: ${r.texto.slice(0, 80)}` }
    },
  },
]

let falhas = 0
const provedores: [string, string, typeof chamarOpenAI][] = [['Luna', LUNA, chamarOpenAI]]
if (temHaiku) provedores.push(['Haiku', HAIKU, chamarAnthropic])
else console.log('(sem ANTHROPIC_API_KEY: casos do Haiku pulados)\n')

for (const [rotulo, modelo, chamar] of provedores) {
  for (const c of casos) {
    const t0 = Date.now()
    const r = await chamar(c.pedido, modelo, 25_000, c.stream ? () => {} : undefined)
    const ms = Date.now() - t0
    const erro = r.ok ? c.confere(r) : 'falhou (ver log acima)'
    if (erro) falhas++
    console.log(`${erro ? 'FALHOU' : 'OK    '} ${rotulo.padEnd(5)} ${String(ms).padStart(5)}ms  US$ ${r.custo.toFixed(6)}  ${c.nome}${erro ? ` — ${erro}` : ''}`)
    console.log(`        → ${r.chamadas.length ? JSON.stringify(r.chamadas) : r.texto.replace(/\s+/g, ' ').slice(0, 120)}`)
  }
}

// Cadeia completa com o Luna "fora" (modelo inexistente) → precisa cair no Haiku.
if (temHaiku) {
  Deno.env.set('IA_MODELO', 'modelo-que-nao-existe')
  const { chamarIA: cadeia } = await import(`../supabase/functions/ai-proxy/ia.ts?fora=${Date.now()}`)
  const r = await cadeia({ sistema: SISTEMA, mensagens: [{ papel: 'usuario', texto: 'oi' }], maxSaida: 100 })
  const erro = r.ok && r.modelo === HAIKU ? null : `respondeu ${r.modelo}, ok=${r.ok}`
  if (erro) falhas++
  console.log(`${erro ? 'FALHOU' : 'OK    '} cadeia: Luna fora → Haiku${erro ? ` — ${erro}` : ''}`)
}

// Cache do Luna (só mede, não reprova): prompt fixo longo, 3 pedidos seguidos.
// Responde se a lista de ferramentas (muda por assunto) quebra o cache do prompt fixo.
{
  const longo = SISTEMA + '\n' + Array.from({ length: 120 }, (_, i) => `- Regra fixa ${i + 1}: fale com calma, sem julgar, e use o contexto só quando fizer sentido.`).join('\n')
  const base: PedidoIA = { sistema: longo, mensagens: [{ papel: 'usuario', texto: 'oi' }], maxSaida: 60 }
  console.log('\nCache do Luna (tokens de entrada / lidos do cache):')
  for (const [rotulo, p] of [
    ['1º sem ferramenta', base],
    ['2º sem ferramenta', base],
    ['3º com ferramenta', { ...base, ferramentas: [REGISTRAR] }],
    ['4º sem ferramenta', base],
  ] as [string, PedidoIA][]) {
    const r = await chamarOpenAI(p, LUNA, 25_000)
    console.log(`  ${rotulo.padEnd(18)} ${r.uso?.entrada ?? '?'} / ${r.uso?.cache ?? '?'}`)
  }
}

console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.')
Deno.exit(falhas ? 1 : 0)
