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

Deno.test('corrigir e apagar a última pesagem', () => {
  assertEquals(lerComandoPeso('corrige a última pesagem pra 80,2'), { tipo: 'corrigir', kg: 80.2 })
  assertEquals(lerComandoPeso('errei o peso, é 79,5'), { tipo: 'corrigir', kg: 79.5 })
  assertEquals(lerComandoPeso('altera meu último peso para 81 kg'), { tipo: 'corrigir', kg: 81 })
  assertEquals(lerComandoPeso('change my last weigh-in to 80 kg'), { tipo: 'corrigir', kg: 80 })
  assertEquals(lerComandoPeso('corrige mi último pesaje a 70 kg'), { tipo: 'corrigir', kg: 70 })
  assertEquals(lerComandoPeso('apaga a última pesagem'), { tipo: 'apagar' })
  assertEquals(lerComandoPeso('exclui meu peso de hoje'), { tipo: 'apagar' })
  assertEquals(lerComandoPeso('delete my last weigh-in'), { tipo: 'apagar' })
  assertEquals(lerComandoPeso('borra mi último pesaje'), { tipo: 'apagar' })
  // meta continua sendo meta, mesmo com "mudar"
  assertEquals(lerComandoPeso('muda minha meta pra 75'), { tipo: 'meta', kg: 75 })
  // apagar outra coisa vai pra IA
  assertEquals(lerComandoPeso('apaga o peso do supino'), null)
  assertEquals(lerComandoPeso('apaga o almoço'), null)
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

Deno.test('variação: perdi/ganhei vira pesagem de hoje', () => {
  assertEquals(lerComandoPeso('perdi um kg'), { tipo: 'variar', deltaKg: -1 })
  assertEquals(lerComandoPeso('Life, perdi 1 kg essa semana!'), { tipo: 'variar', deltaKg: -1 })
  assertEquals(lerComandoPeso('emagreci 2,5 quilos'), { tipo: 'variar', deltaKg: -2.5 })
  assertEquals(lerComandoPeso('perdi meio quilo'), { tipo: 'variar', deltaKg: -0.5 })
  assertEquals(lerComandoPeso('perdi um quilo e meio'), { tipo: 'variar', deltaKg: -1.5 })
  assertEquals(lerComandoPeso('perdi 1kg de gordura'), { tipo: 'variar', deltaKg: -1 })
  assertEquals(lerComandoPeso('ganhei 800 g'), { tipo: 'variar', deltaKg: 0.8 })
  assertEquals(lerComandoPeso('engordei 2 kg'), { tipo: 'variar', deltaKg: 2 })
  assertEquals(lerComandoPeso('I lost 2 kg'), { tipo: 'variar', deltaKg: -2 })
  assertEquals(lerComandoPeso('perdí un kilo'), { tipo: 'variar', deltaKg: -1 })
  // carga do treino e meta não são variação do corpo
  assertEquals(lerComandoPeso('ganhei 5 kg no supino'), null)
  assertEquals(lerComandoPeso('quero perder 5 kg'), null)
  assertEquals(lerComandoPeso('perdi o treino hoje'), null)
})

Deno.test('frases do relatório do APK (24/10) e número sozinho', () => {
  assertEquals(lerComandoPeso('hoje tô com 81'), { tipo: 'registrar', kg: 81 })
  assertEquals(lerComandoPeso('peso 79'), { tipo: 'registrar', kg: 79 })
  assertEquals(lerComandoPeso('acordei com 81,5kg'), { tipo: 'registrar', kg: 81.5 })
  assertEquals(lerComandoPeso('errei, é 81,2'), { tipo: 'corrigir', kg: 81.2 })
  assertEquals(lerComandoPeso('80 kg'), { tipo: 'confirmar', kg: 80 })
  assertEquals(lerComandoPeso('82'), { tipo: 'confirmar', kg: 82 })
  // continua ignorando o que não é o peso do corpo
  assertEquals(lerComandoPeso('tô com 40 graus de febre'), null)
  assertEquals(lerComandoPeso('tô com 30 anos'), null)
  assertEquals(lerComandoPeso('corri 45 minutos'), null)
})
