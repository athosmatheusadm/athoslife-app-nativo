// ATHOSlife — leitor de frases de peso, sem IA (v4.6, 24/10/2026).
// Compartilhado: o ai-proxy usa (peso.ts) e o app usa no chat do Life, pra
// funcionar sem internet e pra perguntar "Anoto 82 kg?" quando a mensagem é
// só um número. Puro, sem import — roda no Deno e no Vite.

export type ComandoPeso =
  | { tipo: 'registrar'; kg: number }
  | { tipo: 'meta'; kg: number }
  | { tipo: 'historico' }
  | { tipo: 'corrigir'; kg: number }
  | { tipo: 'apagar' }
  /** "perdi 1 kg": delta sobre a última pesagem (negativo = perdeu). */
  | { tipo: 'variar'; deltaKg: number }
  /** Só o número ("82", "80 kg"): provável peso, mas o Life pergunta antes de anotar. */
  | { tipo: 'confirmar'; kg: number }

// Também tira o nukta do hindi ("वज़न" = "वजन") e troca o apóstrofo por espaço ("j’ai").
const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u093c]/g, '').replace(/['’]/g, ' ').replace(/\s+/g, ' ').trim()

export const KG_MIN = 25
export const KG_MAX = 350
const LB_POR_KG = 2.20462

// Número de peso (70, 80,5, 80.5) com unidade opcional logo depois.
const NUMERO = /(\d{2,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|quilos?|kilos?|lbs?|libras?|pounds?|किलो|केजी)?(?![\d.,]*\s*(?:g\b|gramas?|grams?|gramos?|kcal|cal\b|ml|l\b|litros?|liters?|passos|steps|pasos|min|reps?|x\b|%))/

// Assunto que NÃO é o peso do corpo — "meta de 150 g de proteína" não muda a meta.
const OUTRO_ASSUNTO =
  /\b(proteina|protein|carbo\w*|gordura|fat|grasa|caloria\w*|calorie\w*|kcal|agua|water|litros?|passos|steps|pasos|carga|supino|agachamento|halter|barra|bench|squat|serie|series|sets?|reps?|repeticoes|sono|sleep|horas?|hours?|anos|years?|anos de idade|idade|age|edad|febre|fever|fiebre|graus|degrees|grados|dias|days|minutos?|minutes?|reais|dolares|dollars|pesos mexicanos|batimentos|bpm|pressao|proteines?|glucides|lipides|eau|pas|repetitions|heures|jours|ans)\b|प्रोटीन|कैलोरी|पानी|कदम|घंटे|साल|दिन/

const REGISTRAR = [
  /\b(pesei|me pesei|to pesando|tou pesando|estou pesando|t[oô] com|estou com|pesando hoje|acordei com|amanheci com)\b/,
  /^peso:? \d/,
  /\bmeu peso\b.{0,20}\b(hoje|agora|atual|e|eh|esta|ta|deu)\b/,
  /\b(registr\w*|anot\w*|salv\w*|coloc\w*|lanc\w*)\b.{0,15}\b(meu )?peso\b/,
  /\bpeso (de )?hoje\b/,
  /\bbalanca (deu|marcou|mostrou)\b/,
  /\b(i weigh|i weighed|weighed in at|weighed|my weight is|my weight today|log (my )?weight|record (my )?weight|scale (says|said|showed))\b/,
  /\b(me pese|peso hoy|hoy peso|mi peso (es|hoy|actual)|registr\w* (mi )?peso|anot\w* (mi )?peso|la bascula (marco|dio))\b/,
  /\b(je pese|j ai pese|je me suis pese\w*|mon poids (est|aujourd hui|actuel|du jour)|note (mon )?poids|la balance (affiche|indique|dit|a dit))\b/,
  /मेरा वजन|आज वजन|आज मेरा वजन|वजन आज|वजन दर्ज|वजन लिख|\b(mera weight|mera wajan|mera vajan|aaj weight)\b/,
]

const META = [
  /\b(meta|objetivo|alvo)\b/,
  /\b(quero chegar|chegar (a|aos|em|nos)|quero pesar|quero ficar com)\b/,
  /\b(goal|target)\b/,
  /\b(want to (reach|get to|weigh))\b/,
  /\b(quiero llegar|llegar a|quiero pesar)\b/,
  /\b(objectif|cible|je veux peser|atteindre)\b/,
  /लक्ष्य|टारगेट|गोल/,
]

const HISTORICO = [
  /\b(historico|evolucao|pesagens|ultimas pesagens|quanto eu pesava|meus pesos)\b/,
  /\b(history|weigh-ins|past weights|weight log|weight progress|how much did i weigh)\b/,
  /\b(historial|evolucion|pesajes|cuanto pesaba)\b/,
  /\b(historique|evolution|pesees|combien je pesais)\b/,
  /इतिहास|पिछले वजन|पुराने वजन/,
]
// Corrigir/apagar mexem só na ÚLTIMA pesagem (sem data na frase).
const CORRIGIR = [
  /\b(corrig\w*|alter\w*|mud\w*|troc\w*|edit\w*|ajust\w*|errei|errado|na verdade)\b/,
  /\b(fix|change|correct|edit|wrong|actually)\b/,
  /\b(correg\w*|cambi\w*|modific\w*|equivoqu\w*|en realidad)\b/,
  /\b(corrig\w*|chang\w*|erreur|en fait|trompe)\b/,
  /ठीक कर|बदल|गलत/,
]
const APAGAR = [
  /\b(apag\w*|exclu\w*|remov\w*|delet\w*|desfaz\w*|tira a|tira o|tirar a|tirar o)\b/,
  /\b(delete|remove|erase|undo)\b/,
  /\b(borr\w*|elimin\w*|quit\w*|deshac\w*)\b/,
  /\b(supprim\w*|efface\w*|enleve|annule)\b/,
  /मिटा|हटा|डिलीट/,
]
// "tô com 81", "acordei com 81,5", "peso 79": o jeito da frase já diz que é o
// peso do corpo, mesmo sem "kg" (outros assuntos já foram descartados antes).
const ESTADO_DO_CORPO = /(\b(t[oô]|tou|estou|acordei|amanheci) com\b|^peso:? \d|\b(i'?m at|woke up at|amaneci con|estoy en|je suis a|je fais)\b)/
// Só o número, com ou sem unidade: "82", "80 kg", "81,5kg".
const SO_NUMERO = /^(\d{2,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|quilos?|kilos?|lbs?|libras?|pounds?|किलो|केजी)?[.!।]?$/
// "errei, é 81,2" logo depois de anotar: correção curta.
const CORRECAO_CURTA = /^(errei|ops|opa|oops|me equivoque|equivoque|na verdade|actually|wrong|en fait|oups)\b/

const FALA_DE_PESO = /\b(peso|pesagem|pesagens|pesaje|weigh-in|pesava|pesos|pesei|pesando|balanca|weight|weigh|weighed|weigh-ins|scale|pesajes|pesaba|pese|bascula|poids|pesee|pesees|balance|pesais)\b|वजन|वेट/

// Variação: "perdi 1 kg", "emagreci 2 quilos", "ganhei meio quilo", "lost 2 lbs".
const PERDEU = /\b(perdi|emagreci|eliminei|sequei|baixei|desci|lost|dropped|shed|perdi|baje|adelgace|elimine|perdu|maigri)\b|घटा|कम हुआ|कम किया/
const GANHOU = /\b(ganhei|engordei|aumentei|subi|gained|put on|gane|engorde|aumente|pris|grossi)\b|बढ/
const NUM_PALAVRA: Record<string, number> = { um: 1, uma: 1, un: 1, una: 1, one: 1, a: 1, dois: 2, duas: 2, dos: 2, two: 2, tres: 3, three: 3 }
const DELTA = /(\d{1,2}(?:[.,]\d{1,2})?|\d{3,4}|um|uma|un|una|one|a|dois|duas|dos|two|tres|three|meio|medio|half a?)\s*(kg|kgs|quilos?|kilos?|kilogramos?|lbs?|libras?|pounds?|किलो|g\b|gramas?|gramos?|grams?)(\s*e\s*meio|\s*y\s*medio|\s*and a half)?/
// Na variação "gordura" ainda é o corpo ("perdi 1 kg de gordura"); carga/supino não.
const OUTRO_ASSUNTO_VAR = /\b(proteina|protein|carbo\w*|caloria\w*|calorie\w*|kcal|agua|water|passos|steps|pasos|carga|supino|agachamento|halter|barra|bench|squat|serie|series|sets?|reps?|repeticoes)\b/

function lerDelta(t: string): number | null {
  const sentido = PERDEU.test(t) ? -1 : GANHOU.test(t) ? 1 : 0
  if (sentido === 0 || OUTRO_ASSUNTO_VAR.test(t)) return null
  const m = t.match(DELTA)
  if (!m) return null
  const bruto = m[1] ?? ''
  let valor = /^(meio|medio|half)/.test(bruto) ? 0.5 : NUM_PALAVRA[bruto] ?? Number(bruto.replace(',', '.'))
  if (!Number.isFinite(valor)) return null
  if (m[3]) valor += 0.5
  const un = m[2] ?? ''
  if (/^(g|gramas?|gramos?|grams?)$/.test(un)) valor /= 1000
  else if (/^(lb|lbs|libras?|pounds?)$/.test(un)) valor /= LB_POR_KG
  if (valor < 0.1 || valor > 15) return null
  return sentido * Math.round(valor * 10) / 10
}

function lerKg(m: RegExpMatchArray): number | null {
  const valor = Number((m[1] ?? '').replace(',', '.'))
  if (!Number.isFinite(valor)) return null
  const lb = m[2] !== undefined && /^(lb|lbs|libra|libras|pound|pounds)$/.test(m[2])
  // किलो/केजी = kg
  const kg = lb ? valor / LB_POR_KG : valor
  if (kg < KG_MIN || kg > KG_MAX) return null
  return Math.round(kg * 10) / 10
}

/**
 * Reconhece só pedido claro sobre o PESO DO CORPO. Na dúvida devolve null e a
 * mensagem segue pra IA normalmente (melhor gastar 1 mensagem que gravar peso
 * errado).
 */
export function lerComandoPeso(mensagem: string): ComandoPeso | null {
  const t = norm(mensagem)
  if (t.length > 160) return null // conversa longa: deixa a IA entender
  const delta = lerDelta(t)
  if (delta !== null) return { tipo: 'variar', deltaKg: delta }
  const numeros = [...t.matchAll(new RegExp(NUMERO.source, 'g'))]
  const numero = numeros[0]
  // Dois pesos na mesma frase ("pesei 80, meta 75"): ambíguo, vai pra IA.
  if (numeros.length > 1) return null

  if (numero && !OUTRO_ASSUNTO.test(t)) {
    const kg = lerKg(numero)
    const comUnidade = numero[2] !== undefined || FALA_DE_PESO.test(t) || ESTADO_DO_CORPO.test(t)
    if (kg !== null) {
      // "minha meta é 75": meta só existe pro peso aqui (outros assuntos já saíram).
      if (META.some((r) => r.test(t))) return { tipo: 'meta', kg }
      if (FALA_DE_PESO.test(t) && CORRIGIR.some((r) => r.test(t))) return { tipo: 'corrigir', kg }
      if (t.length <= 30 && CORRECAO_CURTA.test(t)) return { tipo: 'corrigir', kg }
      if (comUnidade && REGISTRAR.some((r) => r.test(t))) return { tipo: 'registrar', kg }
      if (SO_NUMERO.test(t)) return { tipo: 'confirmar', kg }
    }
  }
  if (!numero && FALA_DE_PESO.test(t) && !OUTRO_ASSUNTO.test(t)) {
    if (APAGAR.some((r) => r.test(t))) return { tipo: 'apagar' }
    if (HISTORICO.some((r) => r.test(t))) return { tipo: 'historico' }
  }
  return null
}
