import test from 'node:test'
import assert from 'node:assert/strict'
import { sincronizarCoposWidget, rotaDoWidget } from '../src/data/native/sincronizarCoposWidget.ts'

const copo = (id, data = '2026-10-12') => ({ id, data, ml: 250, em: 1791810000000 })
function ambiente(iniciais) {
  let fila = [...iniciais]
  const banco = new Map()
  const deps = {
    listar: async () => [...fila],
    gravar: async (c) => { if (!banco.has(c.id)) banco.set(c.id, { ...c }) },
    confirmar: async (ids) => { fila = fila.filter((c) => !ids.includes(c.id)) },
  }
  return { deps, banco, fila: () => fila, adicionar: (c) => fila.push(c) }
}

test('vários copos são persistidos e confirmados individualmente', async () => {
  const a = ambiente([copo('a'), copo('b')])
  assert.equal(await sincronizarCoposWidget(a.deps), 2)
  assert.equal(a.banco.size, 2)
  assert.deepEqual(a.fila(), [])
})
test('sem rede: copo fica pendente, sem confirmação', async () => {
  const a = ambiente([copo('a')])
  a.deps.gravar = async () => { throw new Error('offline') }
  await assert.rejects(sincronizarCoposWidget(a.deps), /offline/)
  assert.equal(a.fila().length, 1)
  assert.equal(a.banco.size, 0)
})
test('falha parcial mantém apenas o restante para tentar novamente', async () => {
  const a = ambiente([copo('a'), copo('b')])
  const gravar = a.deps.gravar
  a.deps.gravar = async (c) => { if (c.id === 'b') throw new Error('offline'); await gravar(c) }
  await assert.rejects(sincronizarCoposWidget(a.deps))
  assert.deepEqual(a.fila().map((c) => c.id), ['b'])
  a.deps.gravar = gravar
  await sincronizarCoposWidget(a.deps)
  assert.equal(a.banco.size, 2)
  assert.equal(a.fila().length, 0)
})
test('resposta de confirmação perdida: reenvio com id estável não duplica no contrato de persistência', async () => {
  const a = ambiente([copo('a')])
  const confirmar = a.deps.confirmar
  a.deps.confirmar = async () => { throw new Error('ponte indisponível') }
  await assert.rejects(sincronizarCoposWidget(a.deps))
  assert.equal(a.banco.size, 1)
  assert.equal(a.fila().length, 1)
  a.deps.confirmar = confirmar
  await sincronizarCoposWidget(a.deps)
  assert.equal(a.banco.size, 1)
  assert.equal(a.fila().length, 0)
})
test('copo de ontem conserva data, volume e horário', async () => {
  const original = copo('ontem', '2026-10-11')
  const a = ambiente([original])
  await sincronizarCoposWidget(a.deps)
  assert.deepEqual(a.banco.get('ontem'), original)
})
test('toque durante sincronização não é apagado pela confirmação anterior', async () => {
  const a = ambiente([copo('a')])
  const gravar = a.deps.gravar
  a.deps.gravar = async (c) => { await gravar(c); a.adicionar(copo('b')) }
  await sincronizarCoposWidget(a.deps)
  assert.deepEqual(a.fila().map((c) => c.id), ['b'])
  a.deps.gravar = gravar
  await sincronizarCoposWidget(a.deps)
  assert.equal(a.banco.size, 2)
})
test('fila vazia não cria registros', async () => {
  const a = ambiente([])
  assert.equal(await sincronizarCoposWidget(a.deps), 0)
  assert.equal(a.banco.size, 0)
})
test('botão do Life aponta para a Home e câmera para scanner', () => {
  assert.equal(rotaDoWidget('athoslife://abrir/home'), '/home')
  assert.equal(rotaDoWidget('athoslife://abrir/scanner'), '/scanner')
})
test('link mantém rota mesmo com parâmetros e fragmento', () => {
  assert.equal(rotaDoWidget('athoslife://abrir/scanner?origem=widget#camera'), '/scanner')
})
test('links inválidos, origem diferente e rotas desconhecidas são ignorados', () => {
  for (const url of ['nada', 'https://abrir/scanner', 'athoslife://outro/scanner', 'athoslife://abrir/admin']) assert.equal(rotaDoWidget(url), null)
})
