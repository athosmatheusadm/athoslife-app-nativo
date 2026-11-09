// Testes do treino pelo chat. Rodar: deno test -A supabase/functions/ai-proxy/treino.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { acharExercicio, decidirDor, FALA_DE_DOR, lerDia, lerDias, montarSeries, type ExercicioCatalogo } from './treino.ts'

const HOJE = '2026-11-02' // segunda
const ex = (id: string, nome: string, en: string, extra: Partial<ExercicioCatalogo> = {}): ExercicioCatalogo => ({
  id, nome, ambientes: ['academia'], series_padrao: 3, repeticoes_padrao: 12, medida: 'reps', segundos_padrao: null,
  traducoes: { en: { nome: en } }, ...extra,
})
const CAT = [
  ex('1', 'Supino Reto com Barra', 'Barbell Bench Press'),
  ex('2', 'Supino Inclinado com Halteres', 'Incline Dumbbell Press'),
  ex('3', 'Agachamento Livre', 'Back Squat'),
  ex('4', 'Prancha', 'Plank', { ambientes: ['casa', 'academia'], medida: 'segundos', segundos_padrao: 40, repeticoes_padrao: null }),
]

Deno.test('dias: nome, abreviação, inglês e hoje', () => {
  igual(lerDia('quinta', HOJE), 'qui')
  igual(lerDia('hoje', HOJE), 'seg')
  igual(lerDia('Thursday', HOJE), 'qui')
  igual(lerDias(['qua', 'sexta', 'qua'], HOJE), ['qua', 'sex'])
  igual(lerDia('amanhã', HOJE), null)
})

Deno.test('exercício: acha pelo nome, pela tradução, pergunta quando empata', () => {
  const r1 = acharExercicio('supino inclinado', CAT)
  ok(r1?.tipo === 'um' && r1.e.id === '2')
  const r2 = acharExercicio('back squat', CAT)
  ok(r2?.tipo === 'um' && r2.e.id === '3')
  const r3 = acharExercicio('supino', CAT)
  ok(r3?.tipo === 'varios' && r3.opcoes.length === 2)
  igual(acharExercicio('rosca scott', CAT), null) // não tem → vai pra lista de pedidos
})

Deno.test('séries: o que ela disse ou o padrão; carga só se ela disse; tempo em segundos', () => {
  igual(montarSeries(CAT[1]), Array(3).fill({ reps: 12, carga_kg: null, segundos: null }))
  igual(montarSeries(CAT[1], 4, 10, 20), Array(4).fill({ reps: 10, carga_kg: 20, segundos: null }))
  igual(montarSeries(CAT[3]), Array(3).fill({ reps: null, carga_kg: null, segundos: 40 }))
  igual(montarSeries(CAT[1], 50).length, 10) // teto
})

Deno.test('dor ou lesão trava o treino', () => {
  ok(FALA_DE_DOR.test('to com dor no joelho, poe leg press na quarta'))
  ok(FALA_DE_DOR.test('machuquei o ombro'))
  ok(!FALA_DE_DOR.test('poe o supino na quinta'))
})

Deno.test('dor nem sempre é lesão: dolorido passa, lesão trava, dúvida pergunta', () => {
  const d = (atual: string, ant: string[] = [], perguntou = false) => decidirDor(atual, ant, perguntou)
  // dolorido de treino
  igual(d('to com o peito dolorido do supino, poe rosca biceps amanha'), 'livre')
  igual(d('dor muscular do treino de ontem, coloca leg press na sexta'), 'livre')
  igual(d("i'm sore from yesterday, add bench press on thursday"), 'livre')
  igual(d('tengo agujetas, pon sentadilla el jueves'), 'livre')
  // lesão clara
  igual(d('torci o joelho, poe leg press na quarta'), 'trava')
  igual(d('machuquei o ombro'), 'trava')
  igual(d('senti uma pontada na lombar, poe terra na quinta'), 'trava')
  igual(d('meu tornozelo inchou'), 'trava')
  igual(d('i injured my knee, add squats'), 'trava')
  // sem detalhe → pergunta
  igual(d('to com dor na lombar, poe agachamento na quinta'), 'pergunta')
  igual(d('treinei semana passada e fiquei com dor na lombar'), 'pergunta')
  igual(d('my knee hurts, add lunges'), 'pergunta')
  // resposta à pergunta
  igual(d('e dolorido de treino', ['to com dor na lombar'], true), 'livre')
  igual(d('so muscular mesmo', ['dor na lombar'], true), 'livre')
  igual(d('nao e lesao, pode por', ['dor na lombar'], true), 'livre')
  igual(d('e uma pontada', ['dor na lombar'], true), 'trava')
  igual(d('incomoda bastante', ['dor na lombar'], true), 'trava')
  // falou da dor antes, pede depois
  igual(d('poe supino na quinta', ['torci o tornozelo ontem']), 'trava')
  igual(d('poe supino na quinta', ['to com dor no joelho']), 'pergunta')
  igual(d('poe supino na quinta', ['to com dor no joelho', 'e so dolorido de treino']), 'livre')
  igual(d('poe supino na quinta', ['torci o pe', 'ja passou']), 'livre')
  igual(d('poe supino na quinta'), 'livre')
  igual(d('poe supino na quinta, sem dor nenhuma'), 'livre')
})

Deno.test('exercício: nome em hindi não vira curinga; apelidos de academia', () => {
  const e = (nome: string, hi: string): ExercicioCatalogo => ({
    id: nome, nome, ambientes: ['academia'], series_padrao: 3, repeticoes_padrao: 12, medida: null, segundos_padrao: null,
    traducoes: { en: { nome }, hi: { nome: hi } },
  })
  const cat = [e('Gêmeos em Pé', 'स्टैंडिंग काफ़ रेज़'), e('Voador (Pec Deck)', 'पेक डेक'), e('Crossover', 'क्रॉसओवर'), e('Supino Reto', 'बेंच प्रेस')]
  const nome = (p: string) => { const r = acharExercicio(p, cat); return r?.tipo === 'um' ? r.e.nome : r ? 'varios' : null }
  igual(nome('crucifixo na máquina'), 'Voador (Pec Deck)')
  igual(nome('peck deck'), 'Voador (Pec Deck)')
  igual(nome('cross over'), 'Crossover')
  igual(nome('crucifixo na polia'), 'Crossover')
  igual(nome('remada curvada'), null) // antes: "Gêmeos em Pé" (o nome em hindi vazio cabia em tudo)
})
