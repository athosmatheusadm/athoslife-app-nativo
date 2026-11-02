// Testes do treino pelo chat. Rodar: deno test -A supabase/functions/ai-proxy/treino.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { acharExercicio, FALA_DE_DOR, lerDia, lerDias, montarSeries, type ExercicioCatalogo } from './treino.ts'

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
