import { assertEquals } from 'jsr:@std/assert@1'
import { lerComandoPeso, textoHistorico } from './peso.ts'

Deno.test('registrar peso em pt/en/es', () => {
  assertEquals(lerComandoPeso('pesei 80,5 hoje'), { tipo: 'registrar', kg: 80.5 })
  assertEquals(lerComandoPeso('Meu peso hoje é 79.8 kg'), { tipo: 'registrar', kg: 79.8 })
  assertEquals(lerComandoPeso('tô com 82 kg'), { tipo: 'registrar', kg: 82 })
  assertEquals(lerComandoPeso('registra meu peso: 81 quilos'), { tipo: 'registrar', kg: 81 })
  assertEquals(lerComandoPeso('I weigh 176 lbs'), { tipo: 'registrar', kg: 79.8 })
  assertEquals(lerComandoPeso('mi peso hoy es 70 kg'), { tipo: 'registrar', kg: 70 })
  // frases de exemplo que o app mostra no card
  assertEquals(lerComandoPeso('pesei 80 kg'), { tipo: 'registrar', kg: 80 })
  assertEquals(lerComandoPeso('I weigh 80 kg'), { tipo: 'registrar', kg: 80 })
  assertEquals(lerComandoPeso('hoy peso 80 kg'), { tipo: 'registrar', kg: 80 })
})

Deno.test('mudar meta', () => {
  assertEquals(lerComandoPeso('minha meta é 75'), { tipo: 'meta', kg: 75 })
  assertEquals(lerComandoPeso('quero chegar a 72,5 kg'), { tipo: 'meta', kg: 72.5 })
  assertEquals(lerComandoPeso('change my goal to 70 kg'), { tipo: 'meta', kg: 70 })
  assertEquals(lerComandoPeso('mi meta es 68 kilos'), { tipo: 'meta', kg: 68 })
})

Deno.test('histórico', () => {
  assertEquals(lerComandoPeso('me mostra meu histórico de peso'), { tipo: 'historico' })
  assertEquals(lerComandoPeso('show my weight history'), { tipo: 'historico' })
  assertEquals(lerComandoPeso('historial de peso'), { tipo: 'historico' })
})

Deno.test('não confunde com outros assuntos (vai pra IA)', () => {
  for (const m of [
    'minha meta de proteína é 150 g',
    'comi 100g de arroz',
    'meta de 10000 passos',
    'estou com fome',
    'supino com 80 kg hoje',
    'tomei 2 litros de água',
    'pesei 80 e minha meta é 75',
    'quanto devo pesar com 1,80?',
    'meta de 2000 kcal',
    'treinei 60 min',
    'oi Life, tudo bem?',
  ]) assertEquals(lerComandoPeso(m), null, m)
})

Deno.test('peso fora da faixa humana não grava', () => {
  assertEquals(lerComandoPeso('pesei 12 kg'), null)
  assertEquals(lerComandoPeso('pesei 900 kg'), null)
})

Deno.test('texto do histórico', () => {
  const t = textoHistorico([{ data: '2026-10-01', peso_kg: 82 }, { data: '2026-10-15', peso_kg: 80.6 }], 'pt-BR')
  assertEquals(t.includes('01/10 · 82,0 kg'), true)
  assertEquals(t.includes('Variação em 14 dias: −1,4 kg.'), true)
  assertEquals(textoHistorico([], 'en').startsWith('You have no weigh-ins'), true)
})
