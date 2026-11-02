/**
 * Alergias e restrições da pessoa × alérgenos das receitas.
 *
 * As restrições são texto livre (onboarding, Perfil > Metas, chat), em
 * qualquer dos idiomas do app (pt, en, es, fr, hi) e do jeito que a pessoa escreveu ("Amendoim",
 * "glúten", "intolerante a lactose", "sou vegana"). As receitas guardam
 * chaves fixas (`receitas_cozinha.alergenos`: amendoim, gluten, lactose,
 * ovo, peixe, soja, gergelim, mel, carne). Aqui as duas coisas se encontram.
 */
export type Alergeno = 'amendoim' | 'gluten' | 'lactose' | 'ovo' | 'peixe' | 'soja' | 'gergelim' | 'mel' | 'carne'

/** Palavras (sem acento, minúsculas) que, numa restrição, indicam cada alérgeno. */
const PALAVRAS: Record<Alergeno, readonly string[]> = {
  amendoim: ['amendoim', 'peanut', 'mani', 'cacahuete', 'cacahuetes', 'arachide', 'arachides', 'मूंगफली', 'पीनट'],
  gluten: ['gluten', 'trigo', 'wheat', 'celiac', 'celiaca', 'celiaco', 'celiaquia', 'ble', 'coeliaque', 'ग्लूटेन', 'गेहूं'],
  lactose: ['lactose', 'lactosa', 'leite', 'leche', 'lacteo', 'laticinio', 'milk', 'dairy', 'queijo', 'cheese', 'queso', 'lait', 'laitier', 'laitiers', 'fromage', 'लैक्टोज', 'दूध', 'डेयरी'],
  ovo: ['ovo', 'ovos', 'egg', 'eggs', 'huevo', 'huevos', 'oeuf', 'oeufs', 'अंडा', 'अंडे', 'अंडों'],
  peixe: ['peixe', 'peixes', 'fish', 'pescado', 'frutos do mar', 'seafood', 'mariscos', 'marisco', 'atum', 'tuna', 'atun', 'poisson', 'poissons', 'fruits de mer', 'thon', 'मछली', 'सी फूड', 'सी-फूड', 'झींगा'],
  soja: ['soja', 'soy', 'soya', 'tofu', 'सोया', 'टोफू'],
  gergelim: ['gergelim', 'sesame', 'sesamo', 'ajonjoli', 'तिल'],
  mel: ['mel', 'honey', 'miel', 'vegan', 'vegano', 'vegana', 'végane', 'शहद', 'वीगन'],
  carne: ['carne', 'meat', 'frango', 'chicken', 'pollo', 'vegetariano', 'vegetariana', 'vegetarian', 'vegano', 'vegana', 'vegan', 'viande', 'poulet', 'vegetarien', 'vegetarienne', 'मांस', 'मीट', 'चिकन', 'शाकाहारी', 'वीगन'],
}

/** Sem acento e minúsculo; mantém o devanágari sem nukta ("फ़" = "फ") e com "ँ" = "ं". */
function normalizar(t: string): string {
  return t.replace(/œ/gi, 'oe').normalize('NFD').replace(/[̀-ͯ\u093c]/g, '').replace(/\u0901/g, '\u0902').toLowerCase()
}

/** Quais alérgenos as restrições da pessoa cobrem. */
export function alergenosDasRestricoes(restricoes: readonly string[]): Set<Alergeno> {
  const achados = new Set<Alergeno>()
  for (const r of restricoes) {
    const texto = ` ${normalizar(r).replace(/[^a-z\u0900-\u097f ]+/g, ' ')} `
    for (const [alergeno, palavras] of Object.entries(PALAVRAS) as [Alergeno, readonly string[]][]) {
      if (palavras.some((p) => texto.includes(` ${normalizar(p)} `))) achados.add(alergeno)
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
