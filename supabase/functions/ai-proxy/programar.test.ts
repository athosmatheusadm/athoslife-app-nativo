// Testes das refeições planejadas. Rodar: deno test -A supabase/functions/ai-proxy/programar.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { itemDaCopia, nomesDias, nomesRefeicoes, resolverDiasFuturos, resolverTipo, rotuloDiaFuturo, TXT_PROGRAMAR } from './programar.ts'

const HOJE = '2026-11-02' // segunda

Deno.test('dias: hoje até +14, sem passado, sem repetir, no máximo 7', () => {
  igual(resolverDiasFuturos(['amanhã'], HOJE), ['2026-11-03'])
  igual(resolverDiasFuturos(['2026-11-04', '2026-11-06', '2026-11-04'], HOJE), ['2026-11-04', '2026-11-06'])
  igual(resolverDiasFuturos(['2026-11-01'], HOJE), []) // ontem não: isso é registro
  igual(resolverDiasFuturos(['2026-11-20'], HOJE), []) // passou de 14 dias
  igual(resolverDiasFuturos('tomorrow', HOJE), ['2026-11-03'])
  igual(resolverDiasFuturos(Array.from({ length: 10 }, (_, i) => `2026-11-${String(3 + i).padStart(2, '0')}`), HOJE).length, 7)
  igual(resolverDiasFuturos(['lixo', null], HOJE), [])
})

Deno.test('refeição: fixa, dia todo ou desconhecida', () => {
  igual(resolverTipo('jantar'), 'jantar')
  igual(resolverTipo('café da manhã'), 'cafe')
  igual(resolverTipo('o almoço'), 'almoco')
  igual(resolverTipo(''), null)
  igual(resolverTipo('todas'), null)
  igual(resolverTipo('ceia de natal'), undefined)
})

Deno.test('cópia de um dia comido vira item do cartão com as gramas do texto', () => {
  const i = itemDaCopia({ nome: 'Arroz', quantidade_texto: '150 g', calorias: 195, proteina: 4, carboidrato: 42, gordura: 0.3 }, 0)
  igual([i.gramas, i.porcaoG, i.calorias], [150, 150, 195])
  igual(itemDaCopia({ nome: 'Ovo', quantidade_texto: '2 unidades (100 g)', calorias: 156, proteina: 13, carboidrato: 1, gordura: 10 }, 1).gramas, 100)
  igual(itemDaCopia({ nome: 'X', quantidade_texto: 'um prato', calorias: null, proteina: null, carboidrato: null, gordura: null }, 2).gramas, 100)
})

Deno.test('texto do cartão diz refeições e datas', () => {
  igual(rotuloDiaFuturo('2026-11-03', HOJE, 'pt-BR'), 'amanhã (03/11)')
  igual(rotuloDiaFuturo('2026-11-04', HOJE, 'pt-BR'), 'quarta (04/11)')
  igual(rotuloDiaFuturo('2026-11-03', HOJE, 'en'), 'tomorrow (11/03)')
  const t = TXT_PROGRAMAR['pt-BR'].confira(nomesRefeicoes(['cafe', 'jantar'], 'pt-BR'), nomesDias(['2026-11-04', '2026-11-06'], HOJE, 'pt-BR'))
  ok(t.includes('café da manhã e jantar de quarta (04/11) e sexta (06/11)'), t)
  ok(t.includes('✓'))
})
