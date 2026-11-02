// Testes da cota humana e do humor (Fase 8). Rodar: deno test -A supabase/functions/ai-proxy/cota.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { ehAceiteCurto, extrairHumor, humorFinal, lifeOfereceu, linhaCota } from './cota.ts'
import { extrairResumo } from './historico.ts'

Deno.test('aceite curto: só o "sim", sem pedido novo', () => {
  for (const m of ['Sim', 'sim!', 'pode sim', 'Bora', 'ok', 'yes please', 'dale', 'sí']) ok(ehAceiteCurto(m), m)
  for (const m of ['sim, e põe no jantar também', 'não', 'quero saber de proteína', '']) ok(!ehAceiteCurto(m), m)
})

Deno.test('oferta do Life: pergunta que oferece algo', () => {
  ok(lifeOfereceu('Quer que eu coloque no jantar de quarta?'))
  ok(lifeOfereceu('Posso montar uma ideia rápida pra hoje? [[RESUMO: x]]'))
  ok(lifeOfereceu('Want me to add it to Thursday?'))
  ok(!lifeOfereceu('Como foi teu dia?'))
  ok(!lifeOfereceu('Quer que eu coloque no jantar. Tá anotado.'))
  ok(!lifeOfereceu(null))
})

Deno.test('cota: o Life avisa com 2 e fecha a última; nunca no desabafo', () => {
  ok(linhaCota(2, false).includes('mais 2 mensagens'))
  ok(linhaCota(0, false).includes('ÚLTIMA RESPOSTA') && linhaCota(0, false).includes('nunca mande procurar um botão'))
  igual(linhaCota(2, true), '')
  igual(linhaCota(0, true), '')
  igual(linhaCota(5, false), '')
  igual(linhaCota(null, false), '')
})

Deno.test('humor: marca sai do texto, junto com o resumo', () => {
  const bruto = 'Bora de omelete hoje.\n[[RESUMO: pediu jantar; Life sugeriu omelete]]\n[[HUMOR: cozinhando]]'
  const h = extrairHumor(bruto)
  igual(h.humor, 'cozinhando')
  const r = extrairResumo(h.texto)
  igual(r.texto, 'Bora de omelete hoje.')
  igual(r.resumo, 'pediu jantar; Life sugeriu omelete')
  igual(extrairHumor('Oi [[HUMOR: escu').texto, 'Oi')
  igual(extrairHumor('Oi [[HUMOR: bravo]]').humor, null)
  igual(extrairHumor('Oi [[HUMOR: pensando]]').humor, 'normal')
})

Deno.test('humor final: desabafo sem chef, ação feita é feliz', () => {
  const base = { emocional: false, comida: true, treino: false, feito: false }
  igual(humorFinal('cozinhando', { ...base, emocional: true }), 'escutando')
  igual(humorFinal('cozinhando', base), 'cozinhando')
  igual(humorFinal('cozinhando', { ...base, comida: false }), 'normal')
  igual(humorFinal(null, { ...base, feito: true }), 'feliz')
  igual(humorFinal(null, base), 'normal')
})
