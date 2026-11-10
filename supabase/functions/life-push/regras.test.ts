// Testes do push do Life. Rodar: deno test -A supabase/functions/life-push/
import { equal, ok } from 'node:assert'
import { decidirPush, motivoDescansando, podeFalarAgora, type DadosPush } from './regras.ts'
import { fraseValida, lerJsonTexto, textoFixo } from './textos.ts'
import type { Idioma } from '../ai-proxy/life.ts'

const AGORA = new Date('2026-11-10T18:00:00Z') // 15h em São Paulo
const base = (x: Partial<DadosPush> = {}): DadosPush => ({
  agora: AGORA,
  hoje: '2026-11-10',
  minutoLocal: 15 * 60,
  acordar: 7 * 60,
  dormir: 23 * 60,
  momentos: ['manha', 'meio_dia', 'noite'],
  pausadoHoje: false,
  sinalSensivel: false,
  ultimaConversa: null,
  envios: [],
  iniciativas: [],
  eventos: [],
  habitos: [],
  riscos: [],
  agradavelUltimosDias: [],
  ultimaAtividade: '2026-11-10',
  ...x,
})
const horasAtras = (h: number) => new Date(AGORA.getTime() - h * 3_600_000).toISOString()

Deno.test('dia normal: nenhum motivo, nenhum push', () => {
  equal(decidirPush(base()), null)
})

Deno.test('sumiu 2+ dias: chama de tarde, não de madrugada', () => {
  equal(decidirPush(base({ ultimaAtividade: '2026-11-08' }))?.motivo, 'sumiu')
  equal(decidirPush(base({ ultimaAtividade: '2026-11-09' })), null)
  equal(decidirPush(base({ ultimaAtividade: '2026-11-08', minutoLocal: 9 * 60 })), null)
  equal(decidirPush(base({ ultimaAtividade: '2026-11-08', minutoLocal: 2 * 60 })), null)
})

Deno.test('travas: pausa, conversa sensível, conversa recente, perto de dormir, momento não liberado', () => {
  const s = { ultimaAtividade: '2026-11-07' }
  equal(decidirPush(base({ ...s, pausadoHoje: true })), null)
  equal(decidirPush(base({ ...s, sinalSensivel: true })), null)
  equal(decidirPush(base({ ...s, ultimaConversa: new Date(horasAtras(2)) })), null)
  ok(decidirPush(base({ ...s, ultimaConversa: new Date(horasAtras(4)) })))
  equal(podeFalarAgora(base({ minutoLocal: 22 * 60 + 30 })), false)
  equal(decidirPush(base({ ...s, momentos: ['manha', 'noite'] })), null)
  equal(decidirPush(base({ ...s, momentos: [] })), null)
})

Deno.test('teto: 2 por dia e 4 h entre um e outro', () => {
  const s = { eventos: [{ texto: 'Prova de cálculo', data: '2026-11-09' }] }
  ok(decidirPush(base(s)))
  equal(decidirPush(base({ ...s, envios: [{ motivo: 'risco:x', criadoEm: horasAtras(2), abertoEm: null }] })), null)
  equal(decidirPush(base({ ...s, envios: [
    { motivo: 'risco:x', criadoEm: horasAtras(5), abertoEm: null },
    { motivo: 'marco:y:7', criadoEm: horasAtras(10), abertoEm: null },
  ] })), null)
  ok(decidirPush(base({ ...s, envios: [{ motivo: 'risco:x', criadoEm: horasAtras(5), abertoEm: null }] })))
})

Deno.test('evento: amanhã à noite, hoje de manhã, ontem pergunta como foi (uma vez)', () => {
  const ev = (data: string) => [{ texto: 'Entrevista de emprego', data }]
  equal(decidirPush(base({ eventos: ev('2026-11-11'), minutoLocal: 20 * 60 }))?.motivo, 'evento_amanha')
  equal(decidirPush(base({ eventos: ev('2026-11-11') })), null) // 15h: espera a noite
  equal(decidirPush(base({ eventos: ev('2026-11-10'), minutoLocal: 9 * 60 }))?.motivo, 'evento_hoje')
  equal(decidirPush(base({ eventos: ev('2026-11-09') }))?.motivo, 'evento_ontem')
  equal(decidirPush(base({ eventos: ev('2026-11-09'), iniciativas: [{ motivo: 'depois:Entrevista de emprego', dia: '2026-11-10' }] })), null)
})

Deno.test('horário de risco: chega 15–45 min antes, e não repete em 3 dias', () => {
  const riscos = [{ nome: 'Doce à noite', minuto: 15 * 60 + 30 }]
  equal(decidirPush(base({ riscos }))?.motivo, 'risco')
  equal(decidirPush(base({ riscos, minutoLocal: 15 * 60 + 20 })), null)
  equal(decidirPush(base({ riscos, envios: [{ motivo: 'risco:Doce à noite', criadoEm: horasAtras(30), abertoEm: horasAtras(29) }] })), null)
})

Deno.test('marco e dias pesados', () => {
  equal(decidirPush(base({ habitos: [{ nome: 'Cigarro', dias: 14 }] }))?.motivo, 'marco')
  equal(decidirPush(base({ habitos: [{ nome: 'Cigarro', dias: 13 }] })), null)
  const pesado = [{ data: '2026-11-09', agradavel: 1 }, { data: '2026-11-10', agradavel: 2 }]
  equal(decidirPush(base({ agradavelUltimosDias: pesado, minutoLocal: 19 * 60 }))?.motivo, 'pesado')
  equal(decidirPush(base({ agradavelUltimosDias: [...pesado, { data: '2026-11-08', agradavel: 4 }], minutoLocal: 19 * 60 })), null)
})

Deno.test('ignorou 3 vezes seguidas: o motivo descansa 14 dias', () => {
  const ign = (h: number) => ({ motivo: 'sumiu', criadoEm: horasAtras(h), abertoEm: null })
  equal(motivoDescansando('sumiu', [ign(80), ign(160), ign(240)], AGORA), true)
  equal(motivoDescansando('sumiu', [ign(80), { ...ign(160), abertoEm: horasAtras(150) }, ign(240)], AGORA), false)
  equal(motivoDescansando('sumiu', [ign(15 * 24), ign(18 * 24), ign(21 * 24)], AGORA), false)
  equal(decidirPush(base({ ultimaAtividade: '2026-11-01', envios: [ign(80), ign(160), ign(240)] })), null)
})

Deno.test('frases prontas: em todo idioma, sem palavra da tela bloqueada', () => {
  const idiomas: Idioma[] = ['pt-BR', 'en', 'es', 'fr', 'hi']
  for (const idioma of idiomas) {
    for (const motivo of ['evento_hoje', 'evento_amanha', 'evento_ontem', 'marco', 'pesado', 'sumiu', 'risco'] as const) {
      const t = textoFixo({ motivo, chave: motivo, detalhe: { texto: 'Viagem pra praia', dias: 14, nome: 'Cigarro' } }, idioma, 'Ana', '2026-11-10', 15)
      ok(t.length > 5 && !/cigarro/i.test(t), `${idioma}/${motivo}: ${t}`)
    }
  }
})

Deno.test('filtro da frase da IA', () => {
  ok(fraseValida('Oi, Ana! Como tá a tarde por aí? 🙂', [], false))
  ok(!fraseValida('Lembrete: beba água!', [], false))
  ok(!fraseValida('Bora resistir ao cigarro hoje?', [], false))
  ok(!fraseValida('Como vai a dieta?', [], false))
  ok(!fraseValida('E o Doce à noite, como tá?', ['Doce à noite'], false))
  ok(!fraseValida('Faltam 3 dias!', [], false))
  ok(fraseValida('14 dias firme! Que orgulho 💚', [], true))
  ok(!fraseValida('veja https://x.com', [], false))
  equal(lerJsonTexto('{"texto": "Oi!"}'), 'Oi!')
  equal(lerJsonTexto('lixo'), null)
})
