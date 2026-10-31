// Scanner v1.1: a conta do app (src/domain/rules/scanCalculo.ts) tem que
// bater com a do servidor (supabase/functions/ai-proxy/scanner/nutricao.ts).
// Rodar: node --test scripts/testar-scanner-calculo.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { atualizarItemScan, macrosDaBase } from '../src/domain/rules/scanCalculo.ts'
import { arredondar, nutrientesDaPorcao } from '../supabase/functions/ai-proxy/scanner/nutricao.ts'

// TACO 4ª ed.: arroz tipo 1 cozido e peito de frango grelhado (por 100 g).
const arroz = { alimentoId: 'a', nome: 'Arroz branco cozido', porcaoG: 100, kcal: 128, proteina: 2.5, carboidrato: 28.1, gordura: 0.2, gorduraPreparoPct: 2.5, fonte: 'taco' as const }
const frango = { alimentoId: 'f', nome: 'Frango peito grelhado', porcaoG: 100, kcal: 159, proteina: 32, carboidrato: 0, gordura: 2.5, gorduraPreparoPct: 2, fonte: 'taco' as const }
const suco = { alimentoId: 's', nome: 'Suco de laranja', porcaoG: 200, kcal: 66, proteina: 1.4, carboidrato: 15.2, gordura: 0, gorduraPreparoPct: null, fonte: 'taco' as const }

test('app e servidor dão o mesmo número', () => {
  for (const base of [arroz, frango, suco]) {
    for (const g of [1, 37, 100, 150, 233, 480]) {
      for (const v of [null, 'sem_oleo', 'caseiro', 'bastante_oleo'] as const) {
        const app = macrosDaBase(base, g, base.gorduraPreparoPct === null ? null : v)
        const srv = arredondar(nutrientesDaPorcao(base, g, base.gorduraPreparoPct === null ? null : v)!)
        assert.deepEqual(
          { calorias: app.calorias, proteina: app.proteina, carboidrato: app.carboidrato, gordura: app.gordura },
          { calorias: srv.kcal, proteina: srv.proteina, carboidrato: srv.carboidrato, gordura: srv.gordura },
          `${base.nome} ${g} g ${v}`,
        )
      }
    }
  }
})

const item = {
  id: 'it1', nome: 'arroz', quantidadeG: 0, alimentoBaseId: null, fonte: 'base' as const, incluir: true,
  calorias: 0, proteina: 0, carboidrato: 0, gordura: 0,
  scan: { itemId: 'it1', nomeVisto: 'arroz', resolucao: 'needs_choice' as const, base: null, candidatos: [arroz], variante: null, varianteOrigem: null, faixa: null, motivos: ['escolher_alimento'], semNumeros: true },
}

test('escolher o alimento sem gramas começa na porção da base, com óleo caseiro', () => {
  const r = atualizarItemScan(item, { base: arroz })
  assert.equal(r.quantidadeG, 100)
  assert.equal(r.scan!.variante, 'caseiro')
  assert.equal(r.scan!.semNumeros, false)
  assert.equal(r.calorias, 151) // 128 + 2,5 g de óleo × 9
  assert.equal(r.nome, 'Arroz branco cozido')
})

test('trocar gramas e preparo recalcula sem IA', () => {
  const r = atualizarItemScan(atualizarItemScan(item, { base: arroz }), { gramas: 200 })
  assert.equal(r.calorias, 301)
  const s = atualizarItemScan(r, { variante: 'sem_oleo' })
  assert.equal(s.calorias, 256)
  assert.equal(s.quantidadeG, 200)
})

test('sem alimento continua sem número (não vira zero no total)', () => {
  const r = atualizarItemScan(item, { gramas: 150 })
  assert.equal(r.scan!.semNumeros, true)
})
