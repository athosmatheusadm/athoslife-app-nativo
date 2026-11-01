// Prompt por assunto (01/11, ideia do dono).
//
// O prompt fixo do Life tinha ~4.650 tokens e ia inteiro em toda mensagem —
// mais de 80% do custo. Agora vai a BASE (personalidade, como conversar,
// crise, NUNCA, fora do tema), o check-in de hoje e quem a pessoa é, sempre;
// e os módulos (comida, treino, hábitos, desabafo, peso) só quando o
// assunto aparece. O assunto "gruda": olha a mensagem atual, as 2 anteriores
// da pessoa e a última resposta do Life, e a tela de onde o chat foi aberto.

export type Assunto = 'comida' | 'treino' | 'habitos' | 'emocional' | 'peso'
export const TODOS_ASSUNTOS: readonly Assunto[] = ['comida', 'treino', 'habitos', 'emocional', 'peso']

const sem = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

const PALAVRAS: Record<Assunto, RegExp> = {
  comida: new RegExp('\\b(' + [
    'comi', 'comeu', 'comer', 'comendo', 'comida\\w*', 'almoc\\w*', 'jant\\w*', 'lanch\\w*', 'cafe', 'refeic\\w*', 'registr\\w*',
    'kcal', 'calori\\w*', 'proteina\\w*', 'carbo\\w*', 'gordura\\w*', 'macros?', 'dieta\\w*', 'cardapio', 'prato', 'porc\\w*',
    'arroz', 'feijao', 'frango', 'carne', 'peixe', 'ovos?', 'pao', 'frutas?', 'salada', 'legume\\w*', 'verdura\\w*', 'lactose',
    'gluten', 'alergi\\w*', 'alergic\\w*', 'intoleran\\w*', 'suplement\\w*', 'whey', 'creatina', 'nutri\\w*', 'suco', 'refri\\w*',
    'doces?', 'docinho', 'chocolate', 'sobremesa\\w*', 'pizza', 'hamburguer\\w*', 'marmita', 'cozinh\\w*', 'receita\\w*', 'fome',
    'beliscar', 'vontade de comer', 'repete', 'repetir', 'mercado', 'rotulo', 'cuscuz', 'tapioca', 'iogurte', 'leite', 'queijo',
    'food', 'meals?', 'breakfast', 'lunch', 'dinner', 'snacks?', 'eat\\w*', 'protein', 'calories?', 'diet', 'recipes?',
    'hungry', 'desayun\\w*', 'almuerz\\w*', 'cena', 'merienda', 'receta\\w*', 'hambre', 'repas', 'manger', 'mange', 'dejeuner',
    'diner', 'faim', 'recette\\w*',
  ].join('|') + ')\\b'),
  treino: new RegExp('\\b(' + [
    'trein\\w*', 'academia', 'exercic\\w*', 'series?', 'repetic\\w*', 'carga', 'supino', 'agachament\\w*', 'leg', 'musculac\\w*',
    'corrida', 'correr', 'corri', 'cardio', 'alongament\\w*', 'halter\\w*', 'ficha', 'esteira', 'bike', 'pedal\\w*', 'futebol',
    'natacao', 'nadar', 'crossfit', 'pilates', 'yoga', 'muscul\\w*', 'hipertrofia', 'em casa', 'remada', 'rosca', 'abdominal\\w*',
    'workout', 'gym', 'exercise\\w*', 'squat', 'running', 'entren\\w*', 'gimnasio', 'ejercicio\\w*', 'musculation', 'seance', 'sport',
  ].join('|') + ')\\b'),
  habitos: new RegExp('\\b(' + [
    'habito\\w*', 'sequencia', 'streak', 'vicio\\w*', 'parar de', 'tropec\\w*', 'recai\\w*', 'deslize', 'gatilho\\w*', 'leitura',
    'ler', 'li', 'meditar', 'meditac\\w*', 'dormir', 'dormi', 'sono', 'beber agua', 'firme', 'dias sem', 'resisti\\w*', 'escorreg\\w*',
    'habit\\w*', 'craving', 'relapse', 'habitud\\w*', 'recaida',
  ].join('|') + ')\\b'),
  emocional: new RegExp('\\b(' + [
    'triste\\w*', 'tristeza', 'cansad\\w*', 'cansaco', 'exaust\\w*', 'esgotad\\w*', 'ansios\\w*', 'ansiedade', 'estress\\w*',
    'chatead\\w*', 'desanim\\w*', 'sozinh\\w*', 'pessimo', 'horrivel', 'chor\\w*', 'desabaf\\w*', 'so quero conversar', 'briga\\w*',
    'terminei', 'termino', 'luto', 'morreu', 'faleceu', 'perdi', 'medo', 'preocupad\\w*', 'frustrad\\w*', 'frustrante', 'irritad\\w*',
    'raiva', 'pausa\\w*', 'pausar', 'congela\\w*', 'dia ruim', 'dia dificil', 'nao aguento', 'nao to bem', 'nao estou bem', 'mal hoje',
    'to mal', 'estou mal', 'sem energia', 'desmotivad\\w*', 'esforco infinito', 'pra tras', 'sad', 'tired', 'stressed', 'anxious',
    'lonely', 'upset', 'cansada', 'agotad\\w*', 'fatigue\\w*', 'epuise\\w*',
  ].join('|') + ')\\b'),
  peso: new RegExp('\\b(' + [
    'peso', 'pesei', 'pesando', 'pesagem', 'balanca', 'kg', 'quilos?', 'kilos?', 'emagrec\\w*', 'engord\\w*', 'barriga', 'medidas',
    'weight', 'weigh\\w*', 'lbs', 'adelgaz\\w*', 'poids', 'maigrir',
  ].join('|') + ')\\b'),
}

const FOCO_ASSUNTO: Record<string, Assunto> = { dieta: 'comida', treino: 'treino', habitos: 'habitos' }

export interface EntradaAssunto {
  mensagem: string
  /** Mensagens anteriores da pessoa, da mais antiga pra mais recente. */
  anterioresDaPessoa?: string[]
  ultimaDoLife?: string | null
  foco?: string
  /** Sinais que não vêm das palavras. */
  sensivel?: boolean
  checkinPesado?: boolean
  pausadoHoje?: boolean
}

export function detectarAssuntos(e: EntradaAssunto): Set<Assunto> {
  const janela = sem([...(e.anterioresDaPessoa ?? []).slice(-2), e.ultimaDoLife ?? '', e.mensagem].join(' \n '))
  const r = new Set<Assunto>()
  for (const a of TODOS_ASSUNTOS) if (PALAVRAS[a].test(janela)) r.add(a)
  const f = e.foco ? FOCO_ASSUNTO[e.foco] : undefined
  if (f) r.add(f)
  if (e.sensivel || e.checkinPesado || e.pausadoHoje) r.add('emocional')
  return r
}

/**
 * Fato da memória por assunto, pela chave (comida.*, treino.*, habito.*).
 * Sem chave ou de outro tema (rotina, pessoa...): vai sempre.
 */
export function fatoDoAssunto(chave: string | null | undefined, assuntos: Set<Assunto>): boolean {
  if (!chave) return true
  const area = chave.split('.')[0]
  if (area === 'comida') return assuntos.has('comida')
  if (area === 'treino') return assuntos.has('treino')
  if (area === 'habito' || area === 'habitos') return assuntos.has('habitos') || assuntos.has('comida')
  return true
}
