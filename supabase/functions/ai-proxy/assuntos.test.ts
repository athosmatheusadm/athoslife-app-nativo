// Testes do prompt por assunto. Rodar: deno test -A supabase/functions/ai-proxy/assuntos.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { detectarAssuntos, fatoDoAssunto } from './assuntos.ts'

const a = (mensagem: string, extra: Record<string, unknown> = {}) => [...detectarAssuntos({ mensagem, ...extra })].sort()

Deno.test('conversa solta: só a base', () => {
  igual(a('oi, tudo bem?'), [])
  igual(a('até amanhã!'), []) // "até" sem acento não é "ate" (comeu)
  igual(a('vi o jogo ontem, que jogão'), [])
})

Deno.test('comida, treino, hábitos, peso pelas palavras (pt, en, es)', () => {
  igual(a('Só tenho ovos, pão e tomate. O que dá pra fazer?'), ['comida'])
  igual(a('comi 2 ovos no café'), ['comida'])
  igual(a('como faz o supino inclinado?'), ['treino'])
  igual(a('quantos dias firme eu tô no doce?'), ['comida', 'habitos'])
  igual(a('pesei 80 kg hoje'), ['peso'])
  igual(a('what should I eat for dinner'), ['comida'])
  igual(a('¿qué ceno hoy? tengo hambre'), ['comida'])
})

Deno.test('desabafo liga o módulo emocional, também por sinal e check-in', () => {
  igual(a('essa sensação de esforço infinito pesa'), ['emocional'])
  igual(a('hoje tô cansado de tudo'), ['emocional'])
  igual(a('oi', { checkinPesado: true }), ['emocional'])
  igual(a('oi', { pausadoHoje: true }), ['emocional'])
  igual(a('oi', { sensivel: true }), ['emocional'])
})

Deno.test('o assunto gruda: "e no jantar?" depois de falar de comida', () => {
  igual(a('e amanhã?', { anterioresDaPessoa: ['o que eu como no almoço?'] }), ['comida'])
  igual(a('e amanhã?', { ultimaDoLife: 'Que tal um treino de pernas leve?' }), ['treino'])
  // só as 2 últimas da pessoa contam
  igual(a('beleza', { anterioresDaPessoa: ['comi pizza', 'vi um filme', 'dormi tarde'] }), ['habitos'])
})

Deno.test('a tela de onde o chat abriu já liga o assunto', () => {
  igual(a('oi', { foco: 'dieta' }), ['comida'])
  igual(a('oi', { foco: 'treino' }), ['treino'])
  igual(a('oi', { foco: 'home' }), [])
})

Deno.test('fato da memória entra pelo assunto da chave', () => {
  const comida = new Set(['comida'] as const)
  const nada = new Set<never>()
  ok(fatoDoAssunto('comida.nao_gosta.atum', comida))
  ok(!fatoDoAssunto('comida.nao_gosta.atum', nada))
  ok(!fatoDoAssunto('treino.horario', comida))
  ok(fatoDoAssunto('rotina.curso_dias', nada)) // rotina vai sempre
  ok(fatoDoAssunto(null, nada))
})

Deno.test('quem escorregou liga hábitos (pra anotar o tropeço)', () => {
  igual(a('comi um doce agora, não aguentei'), ['comida', 'habitos'])
  igual(a('jaquei no fim de semana'), ['habitos'])
  igual(a('furei a dieta com pizza'), ['comida', 'habitos'])
})
