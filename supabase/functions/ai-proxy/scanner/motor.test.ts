// Porta G0 (seção 12.2): cálculo, unidade, cru/cozido, receita sem
// duplicação e null ≠ 0 — 100% verde antes de ligar na tela.
import { assert, assertAlmostEquals, assertEquals } from 'jsr:@std/assert@1'
import { CAT, IDS, item, visao } from './fixtures.ts'
import { divergenciaAtwater, nutrientesDaPorcao, somarTotais } from './nutricao.ts'
import { normalizar, paraBase, preparoCompativel, resolverItem, vocabularioCanonico } from './resolver.ts'
import { gramasDaMedida, lerMedidaCaseira, montarResultado, quantidadeEmGramas } from './revisao.ts'
import { validarVisao } from './validar.ts'

const arroz = paraBase(CAT.porId.get(IDS.arroz)!, 'pt-BR')

Deno.test('conta: exemplo da spec (130 kcal/100 g → 150 g = 195; 200 g = 260, sem IA)', () => {
  const b = { ...arroz, kcal: 130, proteina: 2.5, gorduraPreparoPct: null }
  assertEquals(nutrientesDaPorcao(b, 150, null)!.kcal, 195)
  assertAlmostEquals(nutrientesDaPorcao(b, 150, null)!.proteina!, 3.75)
  assertEquals(nutrientesDaPorcao(b, 200, null)!.kcal, 260)
  assertAlmostEquals(nutrientesDaPorcao(b, 200, null)!.proteina!, 5)
})

Deno.test('conta: porção-base diferente de 100 g escala certo', () => {
  const suco = paraBase(CAT.porId.get(IDS.suco)!, 'pt-BR') // 200 g = 66 kcal
  assertEquals(nutrientesDaPorcao(suco, 300, null)!.kcal, 99)
})

Deno.test('conta: óleo de preparo (caseiro 1×, bastante 2×, sem óleo 0×)', () => {
  // 100 g de arroz, 2,5% de óleo: +2,5 g de gordura, +22,5 kcal por "dose".
  assertAlmostEquals(nutrientesDaPorcao(arroz, 100, 'sem_oleo')!.kcal!, 128)
  assertAlmostEquals(nutrientesDaPorcao(arroz, 100, 'caseiro')!.kcal!, 150.5)
  assertAlmostEquals(nutrientesDaPorcao(arroz, 100, 'bastante_oleo')!.kcal!, 173)
  assertAlmostEquals(nutrientesDaPorcao(arroz, 100, 'caseiro')!.gordura!, 2.7)
  // Sem percentual no catálogo, a variante não muda nada (não soma óleo duas vezes).
  const batata = paraBase(CAT.porId.get(IDS.batata)!, 'pt-BR')
  assertEquals(nutrientesDaPorcao(batata, 100, 'bastante_oleo')!.kcal, 52)
})

Deno.test('null ≠ 0: nutriente não medido continua null e o total vira parcial', () => {
  const b = { ...arroz, proteina: null }
  assertEquals(nutrientesDaPorcao(b, 100, null)!.proteina, null)
  const { totais, parcial } = somarTotais([
    { incluir: true, nutrientes: { kcal: 100, proteina: null, carboidrato: 20, gordura: 1 } },
    { incluir: true, nutrientes: null },
    { incluir: false, nutrientes: { kcal: 999, proteina: 9, carboidrato: 9, gordura: 9 } },
  ])
  assertEquals(parcial, true)
  assertEquals(totais.kcal, 100)
})

Deno.test('quantidade inválida não calcula', () => {
  assertEquals(nutrientesDaPorcao(arroz, 0, null), null)
  assertEquals(nutrientesDaPorcao(arroz, -5, null), null)
  assertEquals(nutrientesDaPorcao(arroz, NaN, null), null)
})

Deno.test('Atwater é só diagnóstico', () => {
  const d = divergenciaAtwater({ kcal: 128, proteina: 2.5, carboidrato: 28.1, gordura: 0.2 })!
  assert(d < 0.05)
  assertEquals(divergenciaAtwater({ kcal: 100, proteina: null, carboidrato: 1, gordura: 1 }), null)
})

Deno.test('unidades: ml só com densidade; unidade só com medida', () => {
  const suco = CAT.porId.get(IDS.suco)!
  const ovo = CAT.porId.get(IDS.ovo)!
  const frango = CAT.porId.get(IDS.frango)!
  assertEquals(quantidadeEmGramas(250, 'ml', suco), { gramas: 250, motivo: null })
  assertEquals(quantidadeEmGramas(250, 'ml', frango), { gramas: null, motivo: 'sem_densidade' })
  assertEquals(quantidadeEmGramas(2, 'unit', ovo), { gramas: 100, motivo: 'conversao_estimada' })
  assertEquals(quantidadeEmGramas(2, 'unit', frango), { gramas: null, motivo: 'quantidade_invalida' })
  assertEquals(quantidadeEmGramas(null, 'g', frango).motivo, 'quantidade_invalida')
})

Deno.test('cru nunca casa com cozido', () => {
  assertEquals(preparoCompativel('raw', 'boiled'), false)
  assertEquals(preparoCompativel('boiled', 'raw'), false)
  assertEquals(preparoCompativel('grilled', 'fried'), false)
  assertEquals(preparoCompativel('unknown', 'raw'), true)
  const r = resolverItem(item({ name: 'arroz branco', preparation: 'boiled' }), CAT)
  assertEquals(r.alimento?.id ?? r.candidatos[0]?.id, IDS.arroz)
  assert(!r.candidatos.some((c) => c.id === IDS.arrozCru))
  const cru = resolverItem(item({ name: 'arroz branco', preparation: 'raw' }), CAT)
  assert(cru.alimento?.id !== IDS.arroz && !cru.candidatos.some((c) => c.id === IDS.arroz))
})

Deno.test('resolução: termo canônico, nome em inglês, escolha e não resolvido', () => {
  assertEquals(resolverItem(item({ name: 'rice', canonicalHint: 'Arroz branco cozido' }), CAT).alimento?.id, IDS.arroz)
  assertEquals(resolverItem(item({ name: 'Cooked white rice' }), CAT).alimento?.id, IDS.arroz)
  const feijao = resolverItem(item({ name: 'feijão cozido', preparation: 'boiled' }), CAT)
  assertEquals(feijao.resolucao, 'needs_choice') // carioca ou preto
  assert(feijao.candidatos.length >= 2 && feijao.candidatos.length <= 3)
  assertEquals(resolverItem(item({ name: 'sushi de salmão' }), CAT).resolucao, 'unresolved')
})

Deno.test('scanner ignora variação de porção e prato montado', () => {
  const vocab = vocabularioCanonico(CAT)
  assert(!vocab.some((n) => n.includes('— porção')))
  assert(!vocab.includes('Arroz com feijão e bife'))
  assertEquals(resolverItem(item({ name: 'Arroz com feijão e bife' }), CAT).alimento?.id === IDS.combo, false)
  assertEquals(normalizar('Arroz branco cozido — porção 150g'), 'arroz branco cozido')
})

Deno.test('medida caseira', () => {
  assertEquals(lerMedidaCaseira('2 colheres de servir'), { n: 2, texto: 'colheres de servir' })
  assertEquals(lerMedidaCaseira('1/2 concha'), { n: 0.5, texto: 'concha' })
  assertEquals(lerMedidaCaseira('uma escumadeira'), { n: 1, texto: 'escumadeira' })
  assertEquals(lerMedidaCaseira('bastante'), null)
  const a = CAT.porId.get(IDS.arroz)!
  assertEquals(gramasDaMedida('2 colheres de servir', a), { gramas: 90, confiavel: false })
})

Deno.test('validação: número ruim vira null, sem âncora a porção é fraca, excesso cortado', () => {
  const v = validarVisao({
    status: 'ok', portionAnchors: [], mealTitle: 'x',
    items: [
      { name: 'arroz', amount: { value: 'abc', unit: 'g' }, portionEvidence: 'usable' },
      { name: '', amount: { value: 10 } },
      ...Array.from({ length: 25 }, (_, i) => ({ name: `item ${i}`, amount: { value: 10, unit: 'g' } })),
    ],
  })
  assert(v !== 'INVALID_MODEL_OUTPUT')
  assertEquals(v.items[0].amount.value, null)
  assertEquals(v.items[0].portionEvidence, 'weak')
  assertEquals(v.items.length, 20)
  assert(v.imageIssues.includes('too_many_items'))
  assertEquals(validarVisao('lixo'), 'INVALID_MODEL_OUTPUT')
  const vazio = validarVisao({ status: 'ok', items: [] })
  assert(vazio !== 'INVALID_MODEL_OUTPUT' && vazio.status === 'recapture')
  const semComida = validarVisao({ status: 'no_food', items: [{ name: 'x' }] })
  assert(semComida !== 'INVALID_MODEL_OUTPUT' && semComida.status === 'no_food' && semComida.items.length === 0)
})

Deno.test('resultado: prato comum vira componentes com óleo caseiro como premissa', () => {
  const r = montarResultado(visao([
    item({ localId: 'a', name: 'Arroz branco', preparation: 'boiled', canonicalHint: 'Arroz branco cozido', amount: { value: 150, unit: 'g', lower: 120, upper: 180, evidence: 'visible' } }),
    item({ localId: 'b', name: 'Frango grelhado', preparation: 'grilled', canonicalHint: 'Frango peito grelhado', visibleFatSignal: 'high', amount: { value: 120, unit: 'g', lower: 100, upper: 140, evidence: 'visible' } }),
  ]), CAT, 'pt-BR')
  assertEquals(r.status, 'ready')
  assertEquals(r.itens[0].variante, 'caseiro')
  assertEquals(r.itens[0].varianteOrigem, 'padrao')
  assertEquals(r.itens[1].variante, 'bastante_oleo')
  assertEquals(r.itens[1].varianteOrigem, 'visual')
  assertEquals(r.itens[0].base?.fonte, 'taco')
  assertAlmostEquals(r.totais.kcal!, 150 * 1.28 + 150 * 0.025 * 9 + 120 * 1.59 + 120 * 0.02 * 2 * 9, 0.01)
  assertEquals(r.parcial, false)
})

Deno.test('resultado: prato inteiro não soma com o componente (8.1)', () => {
  const r = montarResultado(visao([
    item({ localId: 'a', name: 'Estrogonofe de frango', representation: 'composite_dish', canonicalHint: 'Estrogonofe de frango', amount: { value: 200, unit: 'g', lower: null, upper: null, evidence: 'visible' } }),
    item({ localId: 'b', name: 'Frango grelhado', preparation: 'grilled', amount: { value: 80, unit: 'g', lower: null, upper: null, evidence: 'visible' } }),
  ]), CAT, 'pt-BR')
  assertEquals(r.itens[1].incluir, false)
  assert(r.itens[1].motivos.includes('possivel_duplicado'))
  assertAlmostEquals(r.totais.kcal!, 314, 0.01)
})

Deno.test('resultado: escolha e não resolvido bloqueiam; porção estranha só sinaliza', () => {
  const r = montarResultado(visao([
    item({ localId: 'a', name: 'feijão cozido', preparation: 'boiled', amount: { value: 140, unit: 'g', lower: null, upper: null, evidence: 'visible' } }),
    item({ localId: 'b', name: 'sushi de salmão', amount: { value: 120, unit: 'g', lower: null, upper: null, evidence: 'visible' } }),
    item({ localId: 'c', name: 'Arroz branco cozido', amount: { value: 900, unit: 'g', lower: 300, upper: 1000, evidence: 'visible' } }),
  ], { portionAnchors: [] }), CAT, 'pt-BR')
  assertEquals(r.status, 'needs_review')
  assert(r.itens[0].motivos.includes('escolher_alimento'))
  assertEquals(r.itens[1].nutrientes, null)
  assert(r.itens[1].motivos.includes('sem_catalogo'))
  assert(r.itens[2].motivos.includes('porcao_atipica'))
  assert(r.itens[2].motivos.includes('porcao_fraca'))
  assert(r.itens[2].motivos.includes('faixa_ampla'))
  assertEquals(r.parcial, true)
})

Deno.test('resultado: medida caseira confiável corrige gramas divergentes', () => {
  const r = montarResultado(visao([
    item({ name: 'Arroz branco cozido', householdMeasure: '2 escumadeiras', amount: { value: 80, unit: 'g', lower: null, upper: null, evidence: 'visible' } }),
  ]), CAT, 'pt-BR')
  assertEquals(r.itens[0].gramas, 180) // 2 × 90 g (confiável) em vez de 80 g
  assertEquals(r.itens[0].gramasEstimadas, 80)
  assert(r.itens[0].motivos.includes('porcao_divergente'))
  // Medida só estimada pela equipe: sinaliza, mas não troca.
  const e = montarResultado(visao([
    item({ name: 'Arroz branco cozido', householdMeasure: '4 colheres de servir', amount: { value: 80, unit: 'g', lower: null, upper: null, evidence: 'visible' } }),
  ]), CAT, 'pt-BR')
  assertEquals(e.itens[0].gramas, 80)
  assert(e.itens[0].motivos.includes('porcao_divergente'))
})

Deno.test('resultado: alternativa com muita diferença de kcal vira pergunta', () => {
  const r = montarResultado(visao([
    item({ name: 'Frango peito grelhado', preparation: 'unknown', alternatives: ['Frango frito empanado'], amount: { value: 200, unit: 'g', lower: null, upper: null, evidence: 'visible' } }),
  ]), CAT, 'pt-BR')
  assertEquals(r.itens[0].resolucao, 'needs_choice')
  assertEquals(r.itens[0].candidatos.map((c) => c.alimentoId), [IDS.frango, IDS.frangoFrito])
})
