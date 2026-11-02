// Refeições planejadas pelo Life (02/11, docs/PLANO_LIFE_ACOES.md, Fase 1).
//
// "Põe pão com ovo no café de amanhã", "deixa amanhã igual a hoje": o Life
// propõe um cartão e o app grava em refeicoes_planejadas quando a pessoa
// confirma. Lá na Dieta o item aparece apagadinho na refeição e o ✓ da
// refeição registra de verdade (itens_refeicao). Nada conta antes do ✓.
// Aqui ficam as partes puras (testáveis); a execução está no index.ts.

import type { Idioma } from './life.ts'
import type { ItemAchado } from './refeicaoDigitada.ts'

export type TipoFixo = 'cafe' | 'almoco' | 'lanche' | 'jantar'
export const TIPOS_FIXOS: readonly TipoFixo[] = ['cafe', 'almoco', 'lanche', 'jantar']
/** Até quantos dias à frente o Life programa. */
export const MAX_DIAS_FRENTE = 14
/** Quantos dias num pedido só ("os 5 dias úteis"). */
export const MAX_DIAS_PEDIDO = 7

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function somar(dia: string, n: number): string {
  const d = new Date(Date.parse(dia + 'T12:00:00Z') + n * 86_400_000)
  return d.toISOString().slice(0, 10)
}

/** Datas pedidas → só as válidas (hoje até +14), sem repetir, em ordem, no máximo 7. */
export function resolverDiasFuturos(arg: unknown, hoje: string): string[] {
  const lista = Array.isArray(arg) ? arg : arg ? [arg] : []
  const ok = new Set<string>()
  for (const x of lista.slice(0, 14)) {
    const t = sem(String(x ?? ''))
    let d: string | null = null
    if (['hoje', 'today', 'hoy', "aujourd'hui", 'aujourd hui', 'aaj'].includes(t)) d = hoje
    else if (['amanha', 'tomorrow', 'manana', 'demain', 'kal'].includes(t)) d = somar(hoje, 1)
    else if (['depois de amanha', 'day after tomorrow', 'pasado manana', 'apres demain'].includes(t)) d = somar(hoje, 2)
    else if (/^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t))) d = t
    if (!d) continue
    const dist = Math.round((Date.parse(d + 'T12:00:00Z') - Date.parse(hoje + 'T12:00:00Z')) / 86_400_000)
    if (dist >= 0 && dist <= MAX_DIAS_FRENTE) ok.add(d)
  }
  return [...ok].sort().slice(0, MAX_DIAS_PEDIDO)
}

const SIN_REFEICAO: Record<string, TipoFixo> = {
  cafe: 'cafe', 'cafe da manha': 'cafe', 'cafe manha': 'cafe', breakfast: 'cafe', desayuno: 'cafe', 'petit dejeuner': 'cafe', 'petit-dejeuner': 'cafe',
  almoco: 'almoco', lunch: 'almoco', almuerzo: 'almoco', dejeuner: 'almoco',
  lanche: 'lanche', 'lanche da tarde': 'lanche', snack: 'lanche', merienda: 'lanche', gouter: 'lanche',
  jantar: 'jantar', janta: 'jantar', dinner: 'jantar', cena: 'jantar', diner: 'jantar', ceia: 'jantar',
}

/** "jantar" → 'jantar'; vazio ou "todas" → null (o dia inteiro). Desconhecido → undefined. */
export function resolverTipo(arg: unknown): TipoFixo | null | undefined {
  const t = sem(String(arg ?? '')).replace(/^(o|a|the|el|la|le) /, '')
  if (!t || ['todas', 'todos', 'tudo', 'dia todo', 'dia inteiro', 'all', 'todas las comidas', 'toutes'].includes(t)) return null
  return SIN_REFEICAO[t]
}

/**
 * Item já comido (itens_refeicao) → item do cartão. As macros da linha valem
 * pra quantidade inteira dela; o cartão escala a partir disso.
 */
export function itemDaCopia(
  row: { nome: string; quantidade_texto: string | null; calorias: number | null; proteina: number | null; carboidrato: number | null; gordura: number | null },
  i: number,
): ItemAchado {
  const g = /(\d+(?:[.,]\d+)?)\s*g\b/i.exec(row.quantidade_texto ?? '')
  const gramas = g ? Math.max(1, Math.round(Number(g[1].replace(',', '.')))) : 100
  return {
    alimentoId: `copia-${i}`,
    nome: row.nome,
    gramas,
    porcaoG: gramas,
    calorias: Number(row.calorias ?? 0),
    proteina: Number(row.proteina ?? 0),
    carboidrato: Number(row.carboidrato ?? 0),
    gordura: Number(row.gordura ?? 0),
    unidadeG: null,
  }
}

const NOME: Record<Idioma, Record<TipoFixo, string>> = {
  'pt-BR': { cafe: 'café da manhã', almoco: 'almoço', lanche: 'lanche', jantar: 'jantar' },
  en: { cafe: 'breakfast', almoco: 'lunch', lanche: 'snack', jantar: 'dinner' },
  es: { cafe: 'desayuno', almoco: 'almuerzo', lanche: 'merienda', jantar: 'cena' },
  fr: { cafe: 'petit-déjeuner', almoco: 'déjeuner', lanche: 'goûter', jantar: 'dîner' },
  hi: { cafe: 'नाश्ता', almoco: 'दोपहर का खाना', lanche: 'शाम का स्नैक', jantar: 'रात का खाना' },
}

const SEMANA: Record<Idioma, string[]> = {
  'pt-BR': ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
}
const AMANHA: Record<Idioma, [string, string]> = {
  'pt-BR': ['hoje', 'amanhã'], en: ['today', 'tomorrow'], es: ['hoy', 'mañana'], fr: ['aujourd’hui', 'demain'], hi: ['आज', 'कल'],
}

/** "amanhã (03/11)", "quarta (04/11)" — a data junto deixa a pessoa pegar um erro na hora. */
export function rotuloDiaFuturo(dia: string, hoje: string, idioma: Idioma): string {
  const [, m, d] = dia.split('-')
  const dm = idioma === 'en' ? `${m}/${d}` : `${d}/${m}`
  if (dia === hoje) return AMANHA[idioma][0]
  if (dia === somar(hoje, 1)) return `${AMANHA[idioma][1]} (${dm})`
  return `${SEMANA[idioma][new Date(dia + 'T12:00:00Z').getUTCDay()]} (${dm})`
}

function juntar(xs: string[], idioma: Idioma): string {
  if (xs.length <= 1) return xs[0] ?? ''
  const e = { 'pt-BR': 'e', en: 'and', es: 'y', fr: 'et', hi: 'और' }[idioma]
  return `${xs.slice(0, -1).join(', ')} ${e} ${xs[xs.length - 1]}`
}

export function nomesRefeicoes(tipos: TipoFixo[], idioma: Idioma): string {
  return juntar(tipos.map((t) => NOME[idioma][t]), idioma)
}
export function nomesDias(dias: string[], hoje: string, idioma: Idioma): string {
  return juntar(dias.map((d) => rotuloDiaFuturo(d, hoje, idioma)), idioma)
}

export const TXT_PROGRAMAR: Record<Idioma, {
  confira: (refeicoes: string, dias: string) => string
  qualDia: string
  qualRefeicao: string
  nadaNoDia: (dia: string) => string
  nada: string
}> = {
  'pt-BR': {
    confira: (r, d) => `Confere aí: ${r} de ${d}. Depois de confirmar, fica apagadinho na Dieta e é só tocar no ✓ da refeição quando comer.`,
    qualDia: 'Pra qual dia? Consigo deixar no lugar de hoje até daqui a 2 semanas.',
    qualRefeicao: 'Em qual refeição: café, almoço, lanche ou jantar?',
    nadaNoDia: (d) => `Não achei nada registrado ${d} pra copiar.`,
    nada: 'Não achei esses alimentos na base. Me diz com outro nome que eu tento de novo.',
  },
  en: {
    confira: (r, d) => `Take a look: ${r} for ${d}. Once you confirm, it shows faded in Diet — just tap the meal's ✓ when you eat.`,
    qualDia: 'For which day? I can set it up from today up to 2 weeks ahead.',
    qualRefeicao: 'Which meal: breakfast, lunch, snack or dinner?',
    nadaNoDia: (d) => `I didn't find anything logged ${d} to copy.`,
    nada: "I couldn't find these foods. Tell me another name and I'll try again.",
  },
  es: {
    confira: (r, d) => `Revisa: ${r} de ${d}. Al confirmar, queda tenue en Dieta y solo tocas el ✓ de la comida cuando comas.`,
    qualDia: '¿Para qué día? Puedo dejarlo listo desde hoy hasta dentro de 2 semanas.',
    qualRefeicao: '¿En qué comida: desayuno, almuerzo, merienda o cena?',
    nadaNoDia: (d) => `No encontré nada registrado ${d} para copiar.`,
    nada: 'No encontré esos alimentos. Dime otro nombre y lo intento de nuevo.',
  },
  fr: {
    confira: (r, d) => `Regarde : ${r} pour ${d}. Une fois confirmé, ça apparaît en clair dans Repas — touche juste le ✓ du repas quand tu manges.`,
    qualDia: "Pour quel jour ? Je peux préparer d'aujourd'hui jusqu'à dans 2 semaines.",
    qualRefeicao: 'Quel repas : petit-déjeuner, déjeuner, goûter ou dîner ?',
    nadaNoDia: (d) => `Je n'ai rien trouvé d'enregistré ${d} à copier.`,
    nada: 'Je ne trouve pas ces aliments. Donne-moi un autre nom et je réessaie.',
  },
  hi: {
    confira: (r, d) => `देख लीजिए: ${d} का ${r}। कन्फ़र्म करने के बाद यह डाइट में हल्का दिखेगा — खाने पर बस उस खाने का ✓ दबाइए।`,
    qualDia: 'किस दिन के लिए? आज से 2 हफ़्ते आगे तक तैयार कर सकता हूँ।',
    qualRefeicao: 'कौन सा खाना: नाश्ता, दोपहर का खाना, स्नैक या रात का खाना?',
    nadaNoDia: (d) => `${d} का कुछ दर्ज नहीं मिला जिसे कॉपी करूँ।`,
    nada: 'ये खाने नहीं मिले। कोई और नाम बताइए, मैं फिर कोशिश करूँगा।',
  },
}
