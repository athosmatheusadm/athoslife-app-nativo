// Rodar: node --test scripts/scanner-benchmark/metricas.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcular, mediana, mesmoComponente, portas } from './metricas.mjs'

const ref = (nome, gramas, kcal) => ({ nome, gramas, kcal, proteina: 0, carboidrato: 0, gordura: 0 })

test('componente casa pela primeira palavra', () => {
  assert.equal(mesmoComponente('Arroz branco cozido', 'arroz'), true)
  assert.equal(mesmoComponente('Feijão carioca', 'Feijao preto cozido'), true)
  assert.equal(mesmoComponente('Frango grelhado', 'Arroz'), false)
})

test('mediana', () => {
  assert.equal(mediana([3, 1, 2]), 2)
  assert.equal(mediana([1, 2, 3, 4]), 2.5)
  assert.equal(mediana([]), null)
})

test('recall, inventados, erro de kcal e graves', () => {
  const m = calcular([
    { id: 1, categoria: 'pf', itensRef: [ref('arroz', 150, 192), ref('feijão', 140, 106)], previsto: { ms: 4000, itens: [ref('Arroz', 120, 154), ref('Feijão', 140, 106), ref('Salada', 30, 5)] } },
    { id: 2, categoria: 'pf', itensRef: [ref('lasanha', 300, 450)], previsto: { ms: 9000, itens: [ref('Lasanha', 100, 150)] } },
    { id: 3, categoria: 'lanche', itensRef: [ref('pão', 50, 150)], previsto: null },
  ])
  assert.equal(m.refeicoes, 3)
  assert.equal(m.semResultado, 1) // falha conta no relatório
  assert.equal(m.recallComponentes, 3 / 4)
  assert.equal(m.inventados, 1 / 4)
  assert.equal(m.errosGraves, 1 / 2) // lasanha errou 67%
  assert.equal(m.latenciaP95, 9000)
  const p = portas(m)
  assert.equal(p.G1.recall, false)
  assert.equal(p.G2.p95, false)
})
