import { assertEquals } from 'jsr:@std/assert@1'
import { gramasDoItem, lerItens, refeicaoPelaHora } from './refeicaoDigitada.ts'

const arroz = { porcaoG: 100, unidadeG: null }
const ovo = { porcaoG: 100, unidadeG: 50 }

Deno.test('gramas pela medida que a pessoa disse', () => {
  assertEquals(gramasDoItem({ nome: 'arroz', quantidade: 200, unidade: 'g' }, arroz), 200)
  assertEquals(gramasDoItem({ nome: 'arroz', quantidade: 3, unidade: 'colher de sopa' }, arroz), 45)
  assertEquals(gramasDoItem({ nome: 'arroz', quantidade: 2, unidade: 'colher de sopa cheia' }, arroz), 30)
  assertEquals(gramasDoItem({ nome: 'feijão', quantidade: 1, unidade: 'concha' }, arroz), 120)
  assertEquals(gramasDoItem({ nome: 'leite', quantidade: 1, unidade: 'copo' }, arroz), 200)
  assertEquals(gramasDoItem({ nome: 'chicken', quantidade: 6, unidade: 'oz' }, arroz), 168)
})

Deno.test('unidades usam o peso de 1 unidade da base', () => {
  assertEquals(gramasDoItem({ nome: 'ovo', quantidade: 2, unidade: null }, ovo), 100)
  assertEquals(gramasDoItem({ nome: 'ovo', quantidade: 3, unidade: 'unidades' }, ovo), 150)
  assertEquals(gramasDoItem({ nome: 'ovo', quantidade: null, unidade: null }, ovo), 50)
  // sem quantidade e sem unidade conhecida: porção da base
  assertEquals(gramasDoItem({ nome: 'arroz', quantidade: null, unidade: null }, arroz), 100)
})

Deno.test('gramas sempre entre 1 g e 5 kg', () => {
  assertEquals(gramasDoItem({ nome: 'arroz', quantidade: 999999, unidade: 'g' }, arroz), 5000)
  assertEquals(gramasDoItem({ nome: 'sal', quantidade: 0.1, unidade: 'g' }, arroz), 1)
})

Deno.test('lerItens ignora lixo do modelo e corta em 12', () => {
  const itens = lerItens([
    { nome: '  Arroz branco ', quantidade: '150', unidade: 'G' },
    { nome: '' },
    'feijão',
    { nome: 'bife', quantidade: -2 },
    ...Array.from({ length: 20 }, (_, i) => ({ nome: `item ${i}` })),
  ])
  assertEquals(itens[0], { nome: 'Arroz branco', quantidade: 150, unidade: 'g' })
  assertEquals(itens[1], { nome: 'bife', quantidade: null, unidade: null })
  assertEquals(itens.length <= 12, true)
  assertEquals(lerItens('arroz'), [])
})

Deno.test('refeição pela hora (madrugada é jantar)', () => {
  assertEquals(refeicaoPelaHora(0), 'jantar')
  assertEquals(refeicaoPelaHora(7), 'cafe')
  assertEquals(refeicaoPelaHora(12), 'almoco')
  assertEquals(refeicaoPelaHora(16), 'lanche')
  assertEquals(refeicaoPelaHora(20), 'jantar')
})
