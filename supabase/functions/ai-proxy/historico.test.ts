// Testes do histórico em camadas (funções puras). Rodar: deno test -A supabase/functions/ai-proxy/historico.test.ts
import { deepStrictEqual as assertEquals } from 'node:assert'
import { blocoConversaAnterior, dividirHistorico, extrairResumo, type MensagemSalva } from './historico.ts'

Deno.test('marca de resumo sai do texto e vira resumo', () => {
  const r = extrairResumo('Boa, treino leve hoje então 💪\n[[RESUMO: dormiu mal; Life sugeriu treino leve e ela aceitou]]')
  assertEquals(r.texto, 'Boa, treino leve hoje então 💪')
  assertEquals(r.resumo, 'dormiu mal; Life sugeriu treino leve e ela aceitou')
})

Deno.test('resumo cortado no limite de tokens some do texto', () => {
  const r = extrairResumo('Bora!\n[[RESUMO: pediu jan')
  assertEquals(r.texto, 'Bora!')
  assertEquals(r.resumo, null)
})

Deno.test('resposta sem marca fica igual', () => {
  assertEquals(extrairResumo('Oi! Tudo certo?'), { texto: 'Oi! Tudo certo?', resumo: null })
})

const troca = (n: number, resumo: string | null): MensagemSalva[] => [
  { autor: 'usuario', texto: `pergunta ${n}` },
  { autor: 'life', texto: `resposta ${n}`, resumo },
]

Deno.test('as mais recentes vão inteiras, as antigas viram uma linha por troca', () => {
  const msgs = [...troca(1, 'r1'), ...troca(2, 'r2'), ...troca(3, null), ...troca(4, 'r4'), ...troca(5, 'r5')]
  const d = dividirHistorico(msgs, 4)
  assertEquals(d.literais.map((m) => m.texto), ['pergunta 4', 'resposta 4', 'pergunta 5', 'resposta 5'])
  assertEquals(d.linhas, ['- r1', '- r2', '- Pessoa: pergunta 3', '- Life: resposta 3'])
})

Deno.test('histórico curto vai todo inteiro', () => {
  const d = dividirHistorico(troca(1, 'r1'), 6)
  assertEquals(d.literais.length, 2)
  assertEquals(d.linhas, [])
  assertEquals(blocoConversaAnterior(d.linhas), '')
})

Deno.test('mensagem antiga sem resumo entra cortada', () => {
  const longa = 'a'.repeat(200)
  const d = dividirHistorico([{ autor: 'usuario', texto: longa }, { autor: 'usuario', texto: 'oi' }], 1)
  assertEquals(d.linhas[0].length < 110, true)
  assertEquals(d.linhas[0].endsWith('…'), true)
})
