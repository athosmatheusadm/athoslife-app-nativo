import { assert, assertEquals } from 'jsr:@std/assert@1'
import { gramasDoItem, lerEstimativas, podeGuardar, lerItens, pedeIdeia, prometeuRegistro, refeicaoPelaHora, singularDe, TXT_REGISTRO } from './refeicaoDigitada.ts'

const ok = (v: unknown, msg?: string) => assert(v, msg)
const igual = assertEquals

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

Deno.test('singularDe: plural vira singular só pra 2ª tentativa', () => {
  assertEquals(singularDe('tacos'), 'taco')
  assertEquals(singularDe('ovos'), 'ovo')
  assertEquals(singularDe('limões'), 'limão')
  assertEquals(singularDe('pães'), 'pão')
  assertEquals(singularDe('frijoles'), 'frijol')
  assertEquals(singularDe('pão de queijo'), null)
  assertEquals(singularDe('tortillas de maíz'), null)
  assertEquals(singularDe('eggs'), 'egg')
  assertEquals(singularDe('gás'), null)
})

Deno.test('prometeuRegistro: refeição contada + resposta prometendo o cartão', () => {
  assertEquals(prometeuRegistro('life hj eu comi um arroz e um file de frango', 'Mandei pra conferir. Comer frango com arroz dá uma base firme pro dia.'), true)
  assertEquals(prometeuRegistro('I had eggs and toast', 'Sent it for you to check.'), true)
  assertEquals(prometeuRegistro('comí tacos', 'Revisa las cantidades.'), true)
  assertEquals(prometeuRegistro('comi demais hoje, to mal', 'Calma, um dia não define nada. Quer conversar?'), false)
  assertEquals(prometeuRegistro('qual a melhor fruta?', 'Mandei umas ideias.'), false)
})

Deno.test('pedeIdeia: pedido de sugestão sem ter comido', () => {
  for (const m of ['me dá uma ideia de lanche rápido', 'o que eu janto hoje?', 'sugere um café da manhã', 'what should I eat tonight?', 'dame ideas para la cena', 'Tu as des idées de goûter ?']) assertEquals(pedeIdeia(m), true, m)
})

Deno.test('pedeIdeia: contou o que comeu ou pediu pra registrar não é ideia', () => {
  for (const m of ['almocei arroz e feijão', 'comi 2 ovos, me dá uma ideia pra janta', 'registra uma banana', 'pode colocar no meu lanche de hoje', 'I had a sandwich']) assertEquals(pedeIdeia(m), false, m)
})

Deno.test('fala do registro: comentário de amigo entra, o que parece robô ou número sai', async () => {
  const { falaRegistro, limparComentario } = await import('./refeicaoDigitada.ts')
  assertEquals(limparComentario('Café reforçado, hein!'), 'Café reforçado, hein!')
  assertEquals(limparComentario('Clássico que não falha'), 'Clássico que não falha.')
  assertEquals(limparComentario('Registrei seu café'), '')
  assertEquals(limparComentario('Uns 450 kcal aí'), '')
  assertEquals(limparComentario(''), '')
  assertEquals(limparComentario(null), '')
  for (const idioma of ['pt-BR', 'en', 'es', 'fr', 'hi'] as const) {
    const falas = [0, 0.4, 0.99].map((s) => falaRegistro(idioma, 'X', '', s))
    assertEquals(new Set(falas).size, 3)
  }
  const f = falaRegistro('pt-BR', 'o café da manhã de hoje', 'Café reforçado, hein!', 0)
  assertEquals(true, f.startsWith('Café reforçado, hein! ') && f.includes('o café da manhã de hoje') && !f.includes('Achei isso'))
})

// 22/11: o que a base não tem vira estimativa (geleia de goiaba, capuccino gelado, empadão).
Deno.test('lerEstimativas: valida, corrige kcal pela conta e descarta o que não é comida', () => {
  const pedidos = [
    { nome: 'geleia de goiaba', quantidade: 1, unidade: 'colher de sopa' },
    { nome: 'empadão de frango', quantidade: 150, unidade: 'g' },
    { nome: 'pedra', quantidade: null, unidade: null },
    { nome: 'capuccino gelado', quantidade: null, unidade: null },
  ]
  const r = lerEstimativas({
    itens: [
      { reconhecido: true, nome: 'Geleia de goiaba', porcao_g: 20, calorias: 52, proteina: 0, carboidrato: 13, gordura: 0 },
      { reconhecido: true, nome: 'Empadão de frango', porcao_g: 150, calorias: 999, proteina: 15, carboidrato: 40, gordura: 18 },
      { reconhecido: false },
      { reconhecido: true, nome: 'Cappuccino gelado', porcao_g: 300, calorias: 5000, proteina: 1, carboidrato: 1, gordura: 1 },
    ],
  }, pedidos)
  ok(r[0] && r[0].estimado === true && r[0].gramas === 15 && r[0].calorias === 52)
  ok(r[1] && r[1].calorias === Math.round(15 * 4 + 40 * 4 + 18 * 9) && r[1].gramas === 150)
  ok(r[2] === null)
  // kcal absurda é trocada pela conta dos macros (17 kcal), que é plausível
  ok(r[3] && r[3].calorias === 17)
  ok(new Set(r.filter(Boolean).map((x) => x!.alimentoId)).size === 3)
})

Deno.test('lerEstimativas: resposta quebrada não derruba nada', () => {
  const p = [{ nome: 'x', quantidade: null, unidade: null }]
  igual(lerEstimativas(null, p), [null])
  igual(lerEstimativas({ itens: 'oi' }, p), [null])
  igual(lerEstimativas({ itens: [] }, p), [null])
})

Deno.test('texto de estimativa nos 5 idiomas', () => {
  for (const i of ['pt-BR', 'en', 'es', 'fr', 'hi'] as const) ok(TXT_REGISTRO[i].estimei('geleia').includes('geleia'))
})

Deno.test('podeGuardar: só nome genérico de comida vai pra base', () => {
  for (const n of ['Geleia de goiaba', 'Cappuccino gelado', 'Empadão de frango', 'Pão de queijo mineiro']) ok(podeGuardar(n), n)
  for (const n of ['bolo da minha vó', 'lasanha da mãe', 'x', 'pão 2', 'http://site.com', 'teste', 'uma comida com nome comprido demais pra base']) ok(!podeGuardar(n), n)
})
