// Testes dos resumos (Fase 9). Rodar: deno test -A supabase/functions/ai-proxy/resumos.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { blocoResumos, diaLocal, diasParaResumir, limparResumo, promptResumoDia, segundaDaSemana } from './resumos.ts'

const FUSO = 'America/Sao_Paulo'
const HOJE = '2026-11-02' // segunda

Deno.test('dia local respeita o fuso', () => {
  igual(diaLocal('2026-11-02T02:00:00Z', FUSO), '2026-11-01') // 23h de domingo em SP
  igual(diaLocal('2026-11-02T04:00:00Z', FUSO), '2026-11-02')
})

Deno.test('semana começa na segunda', () => {
  igual(segundaDaSemana('2026-11-02'), '2026-11-02')
  igual(segundaDaSemana('2026-11-01'), '2026-10-26')
  igual(segundaDaSemana('2026-11-07'), '2026-11-02')
})

Deno.test('dias pra resumir: conversa de verdade, sem hoje, sem risco, sem repetir', () => {
  const m = (autor: string, iso: string) => ({ autor, texto: 'x', criado_em: iso })
  const msgs = [
    m('usuario', '2026-10-30T15:00:00Z'), m('life', '2026-10-30T15:00:01Z'), m('usuario', '2026-10-30T16:00:00Z'),
    m('usuario', '2026-10-31T15:00:00Z'), // só 1 mensagem dela
    m('usuario', '2026-11-01T12:00:00Z'), m('usuario', '2026-11-01T13:00:00Z'),
    m('usuario', '2026-10-29T12:00:00Z'), m('usuario', '2026-10-29T13:00:00Z'),
    m('usuario', '2026-11-02T12:00:00Z'), m('usuario', '2026-11-02T13:00:00Z'), // hoje
    m('usuario', '2026-10-20T12:00:00Z'), m('usuario', '2026-10-20T13:00:00Z'), // antigo demais
  ]
  igual(diasParaResumir(msgs, HOJE, FUSO, new Set(), new Set()), ['2026-11-01', '2026-10-30', '2026-10-29'])
  igual(diasParaResumir(msgs, HOJE, FUSO, new Set(['2026-11-01']), new Set(['2026-10-30'])), ['2026-10-29'])
})

Deno.test('limpar resumo: NADA vira vazio, no máximo 5 linhas', () => {
  igual(limparResumo('NADA'), '')
  igual(limparResumo(' nada. '), '')
  igual(limparResumo('a\nb\n\nc\nd\ne\nf'), 'a\nb\nc\nd\ne')
  igual(limparResumo(null), '')
})

Deno.test('bloco: 7 dias + semana passada, sem os vazios', () => {
  const b = blocoResumos([
    { tipo: 'dia', inicio: '2026-11-01', texto: 'Contou que o treino rendeu.' },
    { tipo: 'dia', inicio: '2026-10-31', texto: '' },
    { tipo: 'dia', inicio: '2026-10-20', texto: 'Antigo.' },
    { tipo: 'semana', inicio: '2026-10-26', texto: 'Semana puxada no serviço.' },
  ], HOJE)
  ok(b.includes('Semana passada:\nSemana puxada') && b.includes('2026-11-01:\nContou'), b)
  ok(!b.includes('Antigo') && !b.includes('2026-10-31'), b)
  igual(blocoResumos([], HOJE), '')
})

Deno.test('prompt do resumo leva a linha da saúde', () => {
  const p = promptResumoDia('2026-11-01', [{ autor: 'usuario', texto: 'oi', criado_em: '' }])
  ok(p.includes('NUNCA: diagnóstico, remédio, conteúdo de crise') && p.includes('responda exatamente: NADA'))
})
