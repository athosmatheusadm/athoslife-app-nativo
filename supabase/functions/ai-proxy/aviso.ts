// O "oi" do Life na semana seguinte a um tropeço (02/11, docs/PLANO_LIFE_ACOES.md,
// Fase 5; guia "Aviso de recaída"). Começa DESLIGADO (life_config).
//
// A régua vale mais que o código: o alô é um papo leve que NÃO cita o hábito,
// o tropeço, nem sugere alternativa. Quem decide se o assunto é o doce é a
// pessoa. Palavras que nunca aparecem num alô: tropeço, recaída, deslize,
// resistiu, cuidado, lembra, meta (teste em aviso.test.ts).

import type { Idioma } from './life.ts'

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

/** "não precisa me avisar", "para de mandar oi" (mensagem curta). */
export function pedeParaAvisos(mensagem: string): boolean {
  const t = sem(mensagem)
  if (t.length > 60) return false
  return /\b(nao precisa (me )?(avisar|dar (um )?oi|mandar)|para de (me )?(avisar|mandar|dar oi)|nao quero (mais )?(os )?(ois|avisos|oi)|desliga (os )?(ois|avisos)|stop (the )?(check.?ins|reminders)|no me avises|deja de avisarme)\b/.test(t)
}

/** "pode me dar um oi", "liga os avisos de novo". */
export function pedeLigarAvisos(mensagem: string): boolean {
  const t = sem(mensagem)
  if (t.length > 60) return false
  return /\b(pode (me )?(dar (um )?oi|avisar)|liga (os )?(ois|avisos)( de novo)?|quero (os |de volta os )?(ois|avisos))\b/.test(t)
}

const SEMANA: Record<Idioma, string[]> = {
  'pt-BR': ['o domingo', 'a segunda', 'a terça', 'a quarta', 'a quinta', 'a sexta', 'o sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'],
  fr: ['ton dimanche', 'ton lundi', 'ton mardi', 'ton mercredi', 'ton jeudi', 'ton vendredi', 'ton samedi'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
}
const QUE_VEM: Record<Idioma, string[]> = {
  'pt-BR': ['domingo que vem', 'segunda que vem', 'terça que vem', 'quarta que vem', 'quinta que vem', 'sexta que vem', 'sábado que vem'],
  en: ['next Sunday', 'next Monday', 'next Tuesday', 'next Wednesday', 'next Thursday', 'next Friday', 'next Saturday'],
  es: ['el próximo domingo', 'el próximo lunes', 'el próximo martes', 'el próximo miércoles', 'el próximo jueves', 'el próximo viernes', 'el próximo sábado'],
  fr: ['dimanche prochain', 'lundi prochain', 'mardi prochain', 'mercredi prochain', 'jeudi prochain', 'vendredi prochain', 'samedi prochain'],
  hi: ['अगले रविवार', 'अगले सोमवार', 'अगले मंगलवार', 'अगले बुधवार', 'अगले गुरुवार', 'अगले शुक्रवार', 'अगले शनिवार'],
}
const diaDaSemana = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay()

/** Papo leve do alô: muda de uma semana pra outra, nunca cita o hábito. */
export function papoLeve(hoje: string, hora: number, idioma: Idioma): string {
  const dia = SEMANA[idioma][diaDaSemana(hoje)]
  const semana = Math.floor(Date.parse(hoje + 'T12:00:00Z') / (7 * 86_400_000))
  const periodo = {
    'pt-BR': hora < 12 ? 'a manhã' : hora < 18 ? 'a tarde' : 'a noite',
    en: hora < 12 ? 'the morning' : hora < 18 ? 'the afternoon' : 'the evening',
    es: hora < 12 ? 'la mañana' : hora < 18 ? 'la tarde' : 'la noche',
    fr: hora < 12 ? 'la matinée' : hora < 18 ? "l'après-midi" : 'la soirée',
    hi: hora < 12 ? 'सुबह' : hora < 18 ? 'दोपहर' : 'शाम',
  }[idioma]
  const opcoes: Record<Idioma, string[]> = {
    'pt-BR': [`E aí, como tá sendo ${dia}?`, 'Passando pra saber como você tá. Tudo tranquilo por aí?', `Oi! Como anda ${periodo}?`],
    en: [`Hey, how's your ${dia} going?`, "Just checking in. All good over there?", `Hi! How's ${periodo} going?`],
    es: [`¿Qué tal va ${dia}?`, 'Pasaba a saber cómo estás. ¿Todo tranquilo por ahí?', `¡Hola! ¿Cómo va ${periodo}?`],
    fr: [`Alors, comment se passe ${dia} ?`, 'Je passe voir comment tu vas. Tout va bien ?', `Coucou ! Comment se passe ${periodo} ?`],
    hi: [`कैसा जा रहा है ${dia}?`, 'बस हाल पूछने आया। सब ठीक है?', `हाय! ${periodo} कैसी जा रही है?`],
  }
  const lista = opcoes[idioma]
  return lista[((semana % lista.length) + lista.length) % lista.length]
}

/** Linha do contexto do chat que vem depois do alô (o modelo lê; a pessoa não vê). */
export const linhaAlo = (habito: string) =>
  `\n\nALÔ DE HOJE: você deu um oi porque, na semana passada, por volta deste horário, foi difícil com "${habito}". ` +
  'Não fale do hábito, de tropeço nem sugira alternativa se a pessoa não trouxer. Se ela disser que está bem, responda no clima e encerre. ' +
  'Se ela falar de vontade ou de dia difícil, acolha primeiro e pergunte se ela quer uma ideia; só então ofereça UMA das alternativas da tela. Nada de sermão, lista de dicas ou meta.'

export const TXT_AVISO: Record<Idioma, {
  licenca: (diaIso: string) => string
  pode: string
  naoPrecisa: string
  combinado: string
  tudoBem: string
  parei: string
  religuei: string
}> = {
  'pt-BR': {
    licenca: (d) => `Se quiser, ${QUE_VEM['pt-BR'][diaDaSemana(d)]}, um pouco antes desse horário, eu passo pra dar um oi. Pode ser?`,
    pode: 'Pode', naoPrecisa: 'Não precisa',
    combinado: 'Combinado, eu passo pra dar um oi.',
    tudoBem: 'Tudo bem, não vou mandar.',
    parei: 'Tudo bem, parei os ois. Se mudar de ideia, é só me dizer "pode me dar um oi".',
    religuei: 'Combinado! Volto a passar pra dar um oi.',
  },
  en: {
    licenca: (d) => `If you want, ${QUE_VEM.en[diaDaSemana(d)]}, a little before this time, I'll drop by to say hi. Is that okay?`,
    pode: 'Sure', naoPrecisa: 'No need',
    combinado: "Deal, I'll drop by to say hi.",
    tudoBem: "Okay, I won't send it.",
    parei: 'Okay, I stopped the check-ins. If you change your mind, just tell me "you can check in".',
    religuei: "Deal! I'll start dropping by again.",
  },
  es: {
    licenca: (d) => `Si quieres, ${QUE_VEM.es[diaDaSemana(d)]}, un poco antes de esta hora, paso a saludarte. ¿Te parece?`,
    pode: 'Sí, dale', naoPrecisa: 'No hace falta',
    combinado: 'Hecho, paso a saludarte.',
    tudoBem: 'Vale, no lo mando.',
    parei: 'Vale, dejé de pasar a saludar. Si cambias de idea, dime "puedes saludarme".',
    religuei: '¡Hecho! Vuelvo a pasar a saludarte.',
  },
  fr: {
    licenca: (d) => `Si tu veux, ${QUE_VEM.fr[diaDaSemana(d)]}, un peu avant cette heure, je passe te dire coucou. Ça te va ?`,
    pode: 'Oui', naoPrecisa: 'Pas besoin',
    combinado: "D'accord, je passerai te dire coucou.",
    tudoBem: "D'accord, je n'enverrai rien.",
    parei: "D'accord, j'arrête les coucous. Si tu changes d'avis, dis-moi « tu peux passer ».",
    religuei: "D'accord ! Je recommence à passer te voir.",
  },
  hi: {
    licenca: (d) => `अगर चाहें, ${QUE_VEM.hi[diaDaSemana(d)]}, इस समय से थोड़ा पहले, मैं हाल पूछने आऊँ?`,
    pode: 'हाँ', naoPrecisa: 'ज़रूरत नहीं',
    combinado: 'ठीक है, मैं हाल पूछने आऊँगा।',
    tudoBem: 'ठीक है, नहीं भेजूँगा।',
    parei: 'ठीक है, हाल पूछना बंद कर दिया। मन बदले तो बस कहिए "हाल पूछ सकते हो"।',
    religuei: 'ठीक है! फिर से हाल पूछने आऊँगा।',
  },
}
