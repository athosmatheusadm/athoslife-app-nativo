// Catálogo pequeno pros testes, com números da TACO 4ª ed. (por 100 g).
import { montarCatalogo } from './resolver.ts'
import type { AlimentoCatalogo, ItemVisual, RespostaVisual } from './tipos.ts'

const base = (o: Partial<AlimentoCatalogo> & Pick<AlimentoCatalogo, 'id' | 'nome'>): AlimentoCatalogo => ({
  nomeEn: null, nomeEs: null, categoria: null, porcaoG: 100, kcal: null, proteina: null, carboidrato: null, gordura: null,
  preparo: null, aliases: [], porcaoTipicaG: null, representacao: null, gorduraPreparoPct: null, densidadeGMl: null,
  tacoId: null, scanner: true, medidas: [], ...o,
})

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const IDS = {
  arroz: ID(1), arrozCru: ID(2), feijao: ID(3), frango: ID(4), frangoFrito: ID(5), ovo: ID(6), suco: ID(7),
  estrogonofe: ID(8), combo: ID(9), arroz150: ID(10), batata: ID(11), feijaoPreto: ID(12), lasanha: ID(13),
}

export const LINHAS: AlimentoCatalogo[] = [
  base({ id: IDS.arroz, nome: 'Arroz branco cozido', nomeEn: 'Cooked white rice', categoria: 'carboidrato', kcal: 128, proteina: 2.5, carboidrato: 28.1, gordura: 0.2, preparo: 'boiled', porcaoTipicaG: 120, gorduraPreparoPct: 2.5, tacoId: 3,
    medidas: [{ medida: 'colher de servir', gramas: 45, confiavel: false }, { medida: 'escumadeira', gramas: 90, confiavel: true }] }),
  base({ id: IDS.arrozCru, nome: 'Arroz branco cru', categoria: 'carboidrato', kcal: 358, proteina: 7.2, carboidrato: 78.8, gordura: 0.3, preparo: 'raw', tacoId: 4 }),
  base({ id: IDS.feijao, nome: 'Feijão carioca cozido', categoria: 'leguminosa', kcal: 76, proteina: 4.8, carboidrato: 13.6, gordura: 0.5, preparo: 'boiled', porcaoTipicaG: 140, gorduraPreparoPct: 1.5, tacoId: 561 }),
  base({ id: IDS.feijaoPreto, nome: 'Feijão preto cozido', categoria: 'leguminosa', kcal: 77, proteina: 4.5, carboidrato: 14, gordura: 0.5, preparo: 'boiled', tacoId: 567 }),
  base({ id: IDS.frango, nome: 'Frango peito grelhado', categoria: 'proteina', kcal: 159, proteina: 32, carboidrato: 0, gordura: 2.5, preparo: 'grilled', porcaoTipicaG: 120, gorduraPreparoPct: 2, tacoId: 410 }),
  base({ id: IDS.frangoFrito, nome: 'Frango frito empanado', categoria: 'proteina', kcal: 260, proteina: 20, carboidrato: 10, gordura: 15, preparo: 'fried' }),
  base({ id: IDS.ovo, nome: 'Ovo cozido', categoria: 'proteina', kcal: 146, proteina: 13.3, carboidrato: 0.6, gordura: 9.5, preparo: 'boiled', tacoId: 488,
    medidas: [{ medida: 'unidade', gramas: 50, confiavel: false }] }),
  base({ id: IDS.suco, nome: 'Suco de laranja natural', categoria: 'bebida', porcaoG: 200, kcal: 66, proteina: 1.4, carboidrato: 15.2, gordura: 0, densidadeGMl: 1, tacoId: 215 }),
  base({ id: IDS.estrogonofe, nome: 'Estrogonofe de frango', categoria: 'refeicao', kcal: 157, proteina: 17.6, carboidrato: 2.6, gordura: 8, representacao: 'prato', tacoId: 538 }),
  base({ id: IDS.lasanha, nome: 'Lasanha bolonhesa', categoria: 'refeicao', porcaoG: 250, kcal: 375, proteina: 20, carboidrato: 35, gordura: 17, representacao: 'prato' }),
  base({ id: IDS.combo, nome: 'Arroz com feijão e bife', categoria: 'refeicao', porcaoG: 250, kcal: 375, proteina: 22.5, carboidrato: 42.5, gordura: 12.5, representacao: 'componentes' }),
  base({ id: IDS.arroz150, nome: 'Arroz branco cozido — porção 150g', categoria: 'carboidrato', porcaoG: 150, kcal: 192, proteina: 3.8, carboidrato: 42.2, gordura: 0.3, scanner: false }),
  base({ id: IDS.batata, nome: 'Batata inglesa cozida', categoria: 'carboidrato', kcal: 52, proteina: 1.2, carboidrato: 11.9, gordura: 0, preparo: 'boiled', tacoId: 91 }),
]

export const CAT = montarCatalogo(LINHAS)

export function item(o: Partial<ItemVisual> & Pick<ItemVisual, 'name'>): ItemVisual {
  return {
    localId: 'i1', preparation: 'unknown', representation: 'single_food', alternatives: [],
    amount: { value: 100, unit: 'g', lower: null, upper: null, evidence: 'visible' },
    portionEvidence: 'usable', uncertaintyReasons: [], canonicalHint: null, householdMeasure: null, visibleFatSignal: 'unknown',
    ...o,
  }
}

export function visao(items: ItemVisual[], o: Partial<RespostaVisual> = {}): RespostaVisual {
  return { schemaVersion: '2', status: 'ok', mealTitle: 'Almoço', portionAnchors: ['plate', 'cutlery'], items, imageIssues: [], ...o }
}
