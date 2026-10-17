// Cálculos do card "Energia e peso" (src/domain/rules/energiaPeso.ts).
// Rodar: node --test scripts/testar-energia-peso.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  comparar,
  montarResumoEnergiaPeso,
  somarDias,
  tendenciaPeso,
  trechosComRegistro,
} from '../src/domain/rules/energiaPeso.ts'

const hoje = '2026-10-16'
const itens = [
  { data: hoje, calorias: '600.5' },
  { data: hoje, calorias: 400 },
  { data: somarDias(hoje, -1), calorias: 1800 },
  { data: somarDias(hoje, -2), calorias: 1900 },
  { data: somarDias(hoje, -4), calorias: 1700 },
  { data: somarDias(hoje, -5), calorias: 2000 },
  { data: somarDias(hoje, -40), calorias: 9999 },
]
const pesos = [
  { data: somarDias(hoje, -13), pesoKg: '82.0' },
  { data: somarDias(hoje, -6), pesoKg: 81.2 },
  { data: hoje, pesoKg: 80.6 },
]
const base = { itens, pesos, periodo: 14, hoje, metaKcal: 2000, objetivo: 'emagrecer' as const }

test('14 dias terminando hoje; dia sem registro é null, não zero', () => {
  const r = montarResumoEnergiaPeso(base)
  assert.equal(r.dias.length, 14)
  assert.equal(r.dias[13].data, hoje)
  assert.equal(r.dias[13].kcal, 1001)
  assert.equal(r.dias[10].kcal, null)
  assert.ok(!r.dias.some((d) => d.kcal === 9999), 'fora do período ignorado')
  assert.equal(r.diasComRegistro, 5)
})

test('média ignora hoje e dias vazios; emagrecer com peso caindo = alinhado', () => {
  const r = montarResumoEnergiaPeso(base)
  assert.equal(r.comparacao.tipo, 'ok')
  if (r.comparacao.tipo !== 'ok') return
  assert.equal(r.comparacao.mediaKcal, 1850)
  assert.equal(r.comparacao.direcao, 'caindo')
  assert.equal(r.comparacao.alinhado, true)
  assert.ok(r.comparacao.kgPorSemana < -0.5 && r.comparacao.kgPorSemana > -0.9)
})

test('objetivo massa com peso caindo = não alinhado; sem objetivo = null', () => {
  const massa = montarResumoEnergiaPeso({ ...base, objetivo: 'massa' })
  assert.ok(massa.comparacao.tipo === 'ok' && massa.comparacao.alinhado === false)
  const sem = montarResumoEnergiaPeso({ ...base, objetivo: null })
  assert.ok(sem.comparacao.tipo === 'ok' && sem.comparacao.alinhado === null)
})

test('faltam dados: refeições, peso, tudo', () => {
  assert.equal(montarResumoEnergiaPeso({ ...base, itens: itens.slice(0, 3) }).comparacao.tipo, 'faltaRefeicoes')
  assert.equal(montarResumoEnergiaPeso({ ...base, pesos: [] }).comparacao.tipo, 'faltaPeso')
  const vazio = montarResumoEnergiaPeso({ ...base, itens: [], pesos: [], periodo: 30, metaKcal: null })
  assert.equal(vazio.comparacao.tipo, 'semDados')
  assert.equal(vazio.dias.length, 30)
  assert.equal(vazio.metaKcal, null)
})

test('tendência exige 5+ dias de intervalo', () => {
  assert.equal(tendenciaPeso([{ data: 'x', peso: 80, indice: 0 }, { data: 'y', peso: 79, indice: 3 }], 14), null)
  assert.equal(comparar('manter', 2000, null, { kgPorSemana: 0.05, inicio: 80, fim: 80 }, 5, 3).tipo, 'ok')
})

test('virada de mês e trechos com registro', () => {
  assert.equal(somarDias('2026-02-28', 1), '2026-03-01')
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28')
  const t = trechosComRegistro([{ data: 'a', kcal: 1 }, { data: 'b', kcal: 2 }, { data: 'c', kcal: null }, { data: 'd', kcal: 3 }])
  assert.deepEqual(t, [[0, 1], [3, 3]])
})
