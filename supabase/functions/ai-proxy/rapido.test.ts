// Testes dos comandos rápidos (água e desfazer). Rodar: deno test -A supabase/functions/ai-proxy/rapido.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { lerComandoAgua, pedeDesfazer } from './rapido.ts'

Deno.test('água: copos, ml, litro, garrafa, por extenso', () => {
  igual(lerComandoAgua('bebi 2 copos de água'), 500)
  igual(lerComandoAgua('Bebi 500ml de agua'), 500)
  igual(lerComandoAgua('tomei 1,5 litro de água'), 1500)
  igual(lerComandoAgua('bebi uma garrafa de água'), 500)
  igual(lerComandoAgua('acabei de beber um copo de água'), 250)
  igual(lerComandoAgua('I drank 2 glasses of water'), 500)
  igual(lerComandoAgua('bebí dos vasos de agua'), 500)
  igual(lerComandoAgua('bebi 500 de água'), 500)
})

Deno.test('água: não dispara em pergunta, outra bebida ou sem quantidade', () => {
  igual(lerComandoAgua('quantos copos de água eu devo beber?'), null)
  igual(lerComandoAgua('bebi 2 copos de suco'), null)
  igual(lerComandoAgua('bebi água de coco e suco'), null)
  igual(lerComandoAgua('bebi água'), null)
  igual(lerComandoAgua('preciso beber mais água'), null)
  igual(lerComandoAgua('bebi 20 litros de água'), null) // absurdo: deixa pro Life
})

Deno.test('desfazer: curto e direto', () => {
  ok(pedeDesfazer('desfaz isso'))
  ok(pedeDesfazer('Desfazer'))
  ok(pedeDesfazer('life, desfaz'))
  ok(pedeDesfazer('undo that'))
  ok(pedeDesfazer('volta isso'))
  ok(!pedeDesfazer('como eu desfaço um hábito ruim de anos que me atrapalha muito no dia a dia?'))
  ok(!pedeDesfazer('quero voltar a treinar'))
})
