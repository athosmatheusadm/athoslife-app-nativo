// Comandos rápidos do chat, sem IA e sem cota (02/11, docs/PLANO_LIFE_ACOES.md,
// Fase 4; guia "O que mais falta nas ações"):
//   "bebi 2 copos de água"  → grava em registros_agua na hora
//   "desfaz isso"           → volta a última ação do Life (até 30 min)
// E os textos do "marcar hábito" (ferramenta com confirmação em um toque).

import type { Idioma } from './life.ts'

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

const NUMEROS: Record<string, number> = {
  meio: 0.5, meia: 0.5, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, half: 0.5,
  un: 1, una: 1, dos: 2, cuatro: 4, medio: 0.5, une: 1, deux: 2, trois: 3, quatre: 4,
}
const UNIDADE: [RegExp, number][] = [
  [/^(ml|mililitros?)$/, 1],
  [/^(l|litros?|liters?|litres?)$/, 1000],
  [/^(garraf\w*|bottles?|botellas?|bouteilles?)$/, 500],
  [/^(copos?|copinhos?|glass(es)?|cups?|vasos?|verres?|tazas?)$/, 250],
]
/** Alguém contando que bebeu (não perguntando "quanto devo beber?"). */
const BEBEU = /\b(bebi|tomei|drank|had|bebe|tome|j ai bu|acabei de beber|ja bebi)\b/
const AGUA = /\b(agua|water|eau)\b/

/**
 * "bebi 2 copos de água" → 500; "tomei 1,5 litro de água" → 1500;
 * "bebi 500ml de agua" → 500. Precisa dizer água, quantidade e que bebeu.
 * Suco, refri, café: não (isso é comida). Pergunta: não.
 */
export function lerComandoAgua(mensagem: string): number | null {
  const t = sem(mensagem)
  if (t.includes('?') || !AGUA.test(t) || !BEBEU.test(t)) return null
  if (/\b(suco|refri\w*|cafe|cha|leite|cerveja|vinho|juice|soda|coffee|tea|milk|beer|jugo|leche|cerveza|jus|biere)\b/.test(t)) return null
  // palavra a palavra: número (ou "um", "dois"...) seguido de unidade
  const w = t.replace(/(\d)([a-z])/g, '$1 $2').split(/[^a-z0-9.,]+/).filter(Boolean)
  let total = 0
  for (let i = 0; i < w.length - 1; i++) {
    const n = /^\d/.test(w[i]) ? Number(w[i].replace(',', '.')) : NUMEROS[w[i]]
    const u = UNIDADE.find(([re]) => re.test(w[i + 1]))
    if (n && n > 0 && u) {
      total += n * u[1]
      i++
    }
  }
  // "bebi 500 de água": número solto antes de "de água" = ml
  if (!total) {
    const solto = /\b(\d{2,4})\s*(de )?(agua|water|eau)\b/.exec(t)
    if (solto) total = Number(solto[1])
  }
  total = Math.round(total)
  return total >= 50 && total <= 3000 ? total : null
}

/** "desfaz isso", "desfazer", "volta isso", "undo". Só mensagem curta. */
export function pedeDesfazer(mensagem: string): boolean {
  const t = sem(mensagem).replace(/[.!]+$/, '')
  if (t.length > 40) return false
  return /^(life,? )?(desfaz\w*|desfac\w*|desfaca|volta (isso|o que voce fez|atras)|cancela (isso|o que voce fez)|undo( that| it)?|deshac\w*|deshaz\w*|annule\w*|annuler)\b/.test(t)
}

export const TXT_RAPIDO: Record<Idioma, {
  agua: (ml: number, total: number, meta: number) => string
  aguaFalhou: string
  nadaPraDesfazer: string
  naoDaPraDesfazer: string
  desfeito: Record<'agua' | 'habito' | 'tropeco' | 'exercicio' | 'treino' | 'restricao', string>
  desfazerFalhou: string
  habitoPergunta: (h: string) => string
  habitoQual: (l: string) => string
  habitoSem: string
  habitoJa: (h: string) => string
  habitoFeito: (h: string, dias: number) => string
  marcar: string
  deixa: string
}> = {
  'pt-BR': {
    agua: (ml, t, m) => `Anotado: +${ml} ml de água. Hoje: ${t} de ${m} ml.`,
    aguaFalhou: 'Não consegui anotar a água agora. Dá pra marcar no card de água da Home.',
    nadaPraDesfazer: 'Não achei nada que eu tenha feito agora há pouco pra desfazer.',
    naoDaPraDesfazer: 'Essa eu não consigo desfazer pelo chat — dá pra ajustar direto na tela.',
    desfeito: {
      agua: 'Desfeito: tirei essa água.', habito: 'Desfeito: desmarquei o hábito de hoje.', tropeco: 'Desfeito: tirei o tropeço e a sequência voltou.',
      exercicio: 'Desfeito: tirei o exercício do treino.', treino: 'Desfeito: o treino desse dia voltou como era.', restricao: 'Desfeito: tirei do seu perfil.',
    },
    desfazerFalhou: 'Não consegui desfazer agora. Dá pra ajustar direto na tela.',
    habitoPergunta: (h) => `Boa! Marco "${h}" como feito hoje?`,
    habitoQual: (l) => `Boa! Em qual hábito eu marco: ${l}?`,
    habitoSem: 'Boa! Você ainda não tem esse hábito no app — dá pra criar na tela de Hábitos.',
    habitoJa: (h) => `"${h}" já está marcado hoje. Mandou bem!`,
    habitoFeito: (h, d) => `Marquei "${h}" hoje. ${d > 1 ? `${d} dias seguidos!` : 'Primeiro dia da sequência!'}`,
    marcar: 'Marcar',
    deixa: 'Deixa pra lá',
  },
  en: {
    agua: (ml, t, m) => `Noted: +${ml} ml of water. Today: ${t} of ${m} ml.`,
    aguaFalhou: "I couldn't log the water now. You can add it on the water card on Home.",
    nadaPraDesfazer: "I didn't find anything I just did to undo.",
    naoDaPraDesfazer: "I can't undo that one from the chat — you can adjust it on the screen.",
    desfeito: {
      agua: 'Undone: I removed that water.', habito: "Undone: I unchecked today's habit.", tropeco: 'Undone: I removed the slip and your streak is back.',
      exercicio: 'Undone: I removed the exercise.', treino: "Undone: that day's workout is back as it was.", restricao: 'Undone: I removed it from your profile.',
    },
    desfazerFalhou: "I couldn't undo it now. You can adjust it on the screen.",
    habitoPergunta: (h) => `Nice! Should I mark "${h}" as done today?`,
    habitoQual: (l) => `Nice! Which habit should I mark: ${l}?`,
    habitoSem: "Nice! You don't have that habit in the app yet — you can create it on the Habits screen.",
    habitoJa: (h) => `"${h}" is already marked today. Well done!`,
    habitoFeito: (h, d) => `Marked "${h}" today. ${d > 1 ? `${d} days in a row!` : 'First day of the streak!'}`,
    marcar: 'Mark it',
    deixa: 'Never mind',
  },
  es: {
    agua: (ml, t, m) => `Anotado: +${ml} ml de agua. Hoy: ${t} de ${m} ml.`,
    aguaFalhou: 'No pude anotar el agua ahora. Puedes sumarla en la tarjeta de agua de Inicio.',
    nadaPraDesfazer: 'No encontré nada que haya hecho recién para deshacer.',
    naoDaPraDesfazer: 'Eso no lo puedo deshacer desde el chat — puedes ajustarlo en la pantalla.',
    desfeito: {
      agua: 'Deshecho: quité esa agua.', habito: 'Deshecho: desmarqué el hábito de hoy.', tropeco: 'Deshecho: quité el tropiezo y la racha volvió.',
      exercicio: 'Deshecho: quité el ejercicio del entreno.', treino: 'Deshecho: el entreno de ese día volvió como estaba.', restricao: 'Deshecho: lo quité de tu perfil.',
    },
    desfazerFalhou: 'No pude deshacerlo ahora. Puedes ajustarlo en la pantalla.',
    habitoPergunta: (h) => `¡Bien! ¿Marco "${h}" como hecho hoy?`,
    habitoQual: (l) => `¡Bien! ¿En qué hábito lo marco: ${l}?`,
    habitoSem: '¡Bien! Todavía no tienes ese hábito en la app — puedes crearlo en la pantalla de Hábitos.',
    habitoJa: (h) => `"${h}" ya está marcado hoy. ¡Muy bien!`,
    habitoFeito: (h, d) => `Marqué "${h}" hoy. ${d > 1 ? `¡${d} días seguidos!` : '¡Primer día de la racha!'}`,
    marcar: 'Marcar',
    deixa: 'Déjalo',
  },
  fr: {
    agua: (ml, t, m) => `Noté : +${ml} ml d'eau. Aujourd'hui : ${t} sur ${m} ml.`,
    aguaFalhou: "Je n'ai pas pu noter l'eau. Tu peux l'ajouter sur la carte eau de l'Accueil.",
    nadaPraDesfazer: "Je n'ai rien trouvé que j'aie fait à l'instant à annuler.",
    naoDaPraDesfazer: "Ça, je ne peux pas l'annuler depuis le chat — tu peux l'ajuster à l'écran.",
    desfeito: {
      agua: "Annulé : j'ai retiré cette eau.", habito: "Annulé : j'ai décoché l'habitude du jour.", tropeco: "Annulé : j'ai retiré l'écart et ta série est revenue.",
      exercicio: "Annulé : j'ai retiré l'exercice.", treino: 'Annulé : la séance de ce jour est revenue comme avant.', restricao: "Annulé : je l'ai retiré de ton profil.",
    },
    desfazerFalhou: "Je n'ai pas pu annuler. Tu peux l'ajuster à l'écran.",
    habitoPergunta: (h) => `Bien joué ! Je coche « ${h} » pour aujourd'hui ?`,
    habitoQual: (l) => `Bien joué ! Quelle habitude je coche : ${l} ?`,
    habitoSem: "Bien joué ! Tu n'as pas encore cette habitude dans l'app — tu peux la créer dans Habitudes.",
    habitoJa: (h) => `« ${h} » est déjà cochée aujourd'hui. Bravo !`,
    habitoFeito: (h, d) => `J'ai coché « ${h} » aujourd'hui. ${d > 1 ? `${d} jours d'affilée !` : 'Premier jour de la série !'}`,
    marcar: 'Cocher',
    deixa: 'Laisse tomber',
  },
  hi: {
    agua: (ml, t, m) => `लिख लिया: +${ml} ml पानी। आज: ${m} में से ${t} ml।`,
    aguaFalhou: 'अभी पानी नहीं लिख पाया। होम पर पानी वाले कार्ड में जोड़ सकते हैं।',
    nadaPraDesfazer: 'अभी-अभी मैंने ऐसा कुछ नहीं किया जिसे वापस लूँ।',
    naoDaPraDesfazer: 'इसे मैं चैट से वापस नहीं ले सकता — स्क्रीन पर बदल सकते हैं।',
    desfeito: {
      agua: 'वापस लिया: वह पानी हटा दिया।', habito: 'वापस लिया: आज की आदत का निशान हटा दिया।', tropeco: 'वापस लिया: फिसलन हटा दी, सिलसिला लौट आया।',
      exercicio: 'वापस लिया: एक्सरसाइज़ हटा दी।', treino: 'वापस लिया: उस दिन का वर्कआउट पहले जैसा हो गया।', restricao: 'वापस लिया: प्रोफ़ाइल से हटा दिया।',
    },
    desfazerFalhou: 'अभी वापस नहीं ले पाया। स्क्रीन पर बदल सकते हैं।',
    habitoPergunta: (h) => `बढ़िया! क्या "${h}" आज के लिए हो गया मार्क कर दूँ?`,
    habitoQual: (l) => `बढ़िया! किस आदत में मार्क करूँ: ${l}?`,
    habitoSem: 'बढ़िया! यह आदत अभी ऐप में नहीं है — आदतें स्क्रीन पर बना सकते हैं।',
    habitoJa: (h) => `"${h}" आज पहले से मार्क है। शाबाश!`,
    habitoFeito: (h, d) => `आज "${h}" मार्क कर दिया। ${d > 1 ? `लगातार ${d} दिन!` : 'सिलसिले का पहला दिन!'}`,
    marcar: 'मार्क करें',
    deixa: 'रहने दो',
  },
}
