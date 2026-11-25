import { assertEquals } from 'jsr:@std/assert@1'
import { paraPtPt } from './ptPt.ts'

Deno.test('frases prontas do Life em pt-PT', () => {
  assertEquals(paraPtPt('Não tinha geleia de goiaba na minha base, então estimei.'), 'Não tinha geleia de goiaba na minha base, então estimei.')
  assertEquals(paraPtPt('Você tem 2 registros pra hoje.'), 'Tem 2 registos para hoje.')
  assertEquals(paraPtPt('Tá aqui o café da manhã de hoje: é só tocar em Registrar.'), 'Está aqui o pequeno-almoço de hoje: é só tocar em Registar.')
  assertEquals(paraPtPt('Coloquei no seu treino de sexta.'), 'Coloquei no seu treino de sexta.')
  assertEquals(paraPtPt('Seu treino está esperando.'), 'O seu treino está a esperar.')
  assertEquals(paraPtPt('Isso vai pra sua ficha, me conta depois.'), 'Isso vai para a sua ficha, conta-me depois.')
  assertEquals(paraPtPt('Oi! E aí, como foi de seu dia?'), 'Olá! Então, como foi do seu dia?')
  assertEquals(paraPtPt('Montei o almoço aqui embaixo — dá uma olhada nas quantidades.'), 'Montei o almoço aqui em baixo — vê as quantidades.')
  assertEquals(paraPtPt('Fiz pra você um suco no celular da academia.'), 'Fiz para si um sumo no telemóvel do ginásio.')
})

Deno.test('texto que já está em pt-PT fica igual', () => {
  const pt = 'Olá! Registei o teu pequeno-almoço. Estás a ir bem, bora lá?'
  assertEquals(paraPtPt(pt), pt)
})
