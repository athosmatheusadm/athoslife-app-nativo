/**
 * Alergias e restrições da pessoa × alérgenos das receitas.
 *
 * As restrições são texto livre (onboarding, Perfil > Metas, chat), em
 * qualquer dos três idiomas e do jeito que a pessoa escreveu ("Amendoim",
 * "glúten", "intolerante a lactose", "sou vegana"). As receitas guardam
 * chaves fixas (`receitas_cozinha.alergenos`: amendoim, gluten, lactose,
 * ovo, peixe, soja, gergelim, mel, carne). Aqui as duas coisas se encontram.
 */
export type Alergeno = 'amendoim' | 'gluten' | 'lactose' | 'ovo' | 'peixe' | 'soja' | 'gergelim' | 'mel' | 'carne'

/** Palavras (sem acento, minúsculas) que, numa restrição, indicam cada alérgeno. */
const PALAVRAS: Record<Alergeno, readonly string[]> = {
  amendoim: ['amendoim', 'peanut', 'mani', 'cacahuete'],
  gluten: ['gluten', 'trigo', 'wheat', 'celiac', 'celiaca', 'celiaco', 'celiaquia'],
  lactose: ['lactose', 'lactosa', 'leite', 'leche', 'lacteo', 'laticinio', 'milk', 'dairy', 'queijo', 'cheese', 'queso'],
  ovo: ['ovo', 'ovos', 'egg', 'eggs', 'huevo', 'huevos'],
  peixe: ['peixe', 'peixes', 'fish', 'pescado', 'frutos do mar', 'seafood', 'mariscos', 'marisco', 'atum', 'tuna', 'atun'],
  soja: ['soja', 'soy', 'soya', 'tofu'],
  gergelim: ['gergelim', 'sesame', 'sesamo', 'ajonjoli'],
  mel: ['mel', 'honey', 'miel', 'vegan', 'vegano', 'vegana'],
  carne: ['carne', 'meat', 'frango', 'chicken', 'pollo', 'vegetariano', 'vegetariana', 'vegetarian', 'vegano', 'vegana', 'vegan'],
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Quais alérgenos as restrições da pessoa cobrem. */
export function alergenosDasRestricoes(restricoes: readonly string[]): Set<Alergeno> {
  const achados = new Set<Alergeno>()
  for (const r of restricoes) {
    const texto = ` ${normalizar(r).replace(/[^a-z ]+/g, ' ')} `
    for (const [alergeno, palavras] of Object.entries(PALAVRAS) as [Alergeno, readonly string[]][]) {
      if (palavras.some((p) => texto.includes(` ${p} `))) achados.add(alergeno)
    }
  }
  return achados
}

/** Alérgenos da receita que batem com as restrições (vazio = pode comer). */
export function conflitosDeAlergia(alergenosReceita: readonly string[], daPessoa: ReadonlySet<Alergeno>): Alergeno[] {
  return alergenosReceita
    .map((a) => normalizar(a).trim() as Alergeno)
    .filter((a, i, lista) => daPessoa.has(a) && lista.indexOf(a) === i)
}
