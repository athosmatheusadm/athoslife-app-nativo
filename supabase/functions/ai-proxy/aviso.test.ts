// Testes do "oi" depois do tropeço. Rodar: deno test -A supabase/functions/ai-proxy/aviso.test.ts
import { ok } from 'node:assert'
import { papoLeve, pedeLigarAvisos, pedeParaAvisos, TXT_AVISO } from './aviso.ts'
import type { Idioma } from './life.ts'

const IDIOMAS: Idioma[] = ['pt-BR', 'en', 'es', 'fr', 'hi']
// Guia: palavras que nunca aparecem num alô (e no pedido de licença).
const PROIBIDAS = /trope|reca[ií]d|desliz|resist|cuidado|lembr|meta|doce|slip|relapse|resist|careful|remember|goal|tropiez|recaíd|écart|rechute|objectif|rappel/i

Deno.test('papo leve: nunca cita o hábito nem as palavras proibidas, em todo idioma e dia', () => {
  for (const idioma of IDIOMAS) {
    for (let d = 1; d <= 21; d++) {
      for (const hora of [9, 15, 21]) {
        const t = papoLeve(`2026-11-${String(d).padStart(2, '0')}`, hora, idioma)
        ok(t.length > 5 && !PROIBIDAS.test(t), `${idioma}: ${t}`)
      }
    }
  }
})

Deno.test('papo leve muda de uma semana pra outra', () => {
  ok(papoLeve('2026-11-02', 15, 'pt-BR') !== papoLeve('2026-11-09', 15, 'pt-BR'))
})

Deno.test('licença também não cita o tropeço', () => {
  for (const idioma of IDIOMAS) {
    const t = TXT_AVISO[idioma].licenca('2026-11-01')
    ok(!PROIBIDAS.test(t), `${idioma}: ${t}`)
  }
  ok(TXT_AVISO['pt-BR'].licenca('2026-11-01').includes('domingo que vem'))
})

Deno.test('parar e religar os ois pelo chat', () => {
  ok(pedeParaAvisos('não precisa me avisar'))
  ok(pedeParaAvisos('para de mandar oi'))
  ok(pedeParaAvisos('não quero mais os ois'))
  ok(!pedeParaAvisos('não precisa me ajudar com o almoço, valeu'))
  ok(pedeLigarAvisos('pode me dar um oi'))
  ok(!pedeLigarAvisos('pode me dar uma ideia de lanche?'))
})
