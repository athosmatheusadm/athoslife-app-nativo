// Tropeço contado no chat (02/11, docs/PLANO_LIFE_ACOES.md, Fase 2; guia,
// "Aviso de recaída").
//
// "Comi um doce agora, não aguentei": o Life acolhe sem drama e pergunta,
// com um toque, se anota no hábito. Só grava em `recaidas` depois do
// "Anotar" — pelo mesmo caminho dos botões que já existe (life_acoes), então
// funciona no APK atual e não gasta mensagem. Aqui ficam as partes puras.

import type { Idioma } from './life.ts'

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

export interface HabitoEvitar { id: string; nome: string; categoria: string | null }

/**
 * Qual hábito de evitar a pessoa quis dizer. Pelo nome (contém, nos dois
 * sentidos) ou pela categoria ("doce" acha "Parar com doce" / categoria
 * doce). Só um hábito de evitar: é ele. Ambíguo ou nenhum: null.
 */
export function acharHabito(pedido: string, habitos: HabitoEvitar[]): HabitoEvitar | null {
  if (!habitos.length) return null
  const p = sem(pedido)
  if (p) {
    const porNome = habitos.filter((h) => {
      const n = sem(h.nome)
      return n.includes(p) || p.includes(n) || (h.categoria && (p.includes(sem(h.categoria).replace('_', ' ')) || sem(h.categoria) === p))
    })
    if (porNome.length === 1) return porNome[0]
    if (porNome.length > 1) return null
  }
  return habitos.length === 1 ? habitos[0] : null
}

/** "15:30", "15h", "3 da tarde" não — só HH:MM ou HHh(MM). Inválida → null. */
export function lerHora(v: unknown): string | null {
  const m = /^(\d{1,2})(?::|h)?(\d{2})?$/i.exec(String(v ?? '').trim())
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2] ?? 0)
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export const TXT_TROPECO: Record<Idioma, {
  pergunta: (habito: string) => string
  qualHora: string
  qualHabito: (lista: string) => string
  semHabito: string
  anotar: string
  deixa: string
  anotado: string
  naoAnotei: string
  falhou: string
}> = {
  'pt-BR': {
    pergunta: (h) => `Tropeço faz parte, sem drama. Quer que eu anote no hábito "${h}"?`,
    qualHora: 'Faz parte, sem drama. Por volta de que horas foi? Assim eu anoto certinho.',
    qualHabito: (l) => `Faz parte, sem drama. Foi em qual hábito: ${l}?`,
    semHabito: 'Faz parte, sem drama. Você não tem um hábito de evitar isso no app, então não tem o que anotar — mas o que você vem fazendo continua valendo.',
    anotar: 'Anotar',
    deixa: 'Deixa pra lá',
    anotado: 'Anotado. A sequência recomeça daqui, e o que você já fez continua valendo.',
    naoAnotei: 'Tranquilo, não anotei nada.',
    falhou: 'Não consegui anotar agora. Dá pra marcar o tropeço na tela de Hábitos.',
  },
  en: {
    pergunta: (h) => `Slips happen, no drama. Want me to note it on the habit "${h}"?`,
    qualHora: 'It happens, no drama. Around what time was it? So I note it right.',
    qualHabito: (l) => `It happens, no drama. Which habit was it: ${l}?`,
    semHabito: "It happens, no drama. You don't have a habit to avoid that in the app, so there's nothing to note — what you've been doing still counts.",
    anotar: 'Note it',
    deixa: 'Never mind',
    anotado: "Noted. The streak starts again from here, and what you've done still counts.",
    naoAnotei: "No problem, I didn't note anything.",
    falhou: "I couldn't note it now. You can mark the slip on the Habits screen.",
  },
  es: {
    pergunta: (h) => `Tropezar es parte, sin drama. ¿Lo anoto en el hábito "${h}"?`,
    qualHora: 'Es parte, sin drama. ¿Más o menos a qué hora fue? Así lo anoto bien.',
    qualHabito: (l) => `Es parte, sin drama. ¿En qué hábito fue: ${l}?`,
    semHabito: 'Es parte, sin drama. No tienes un hábito para evitar eso en la app, así que no hay nada que anotar — lo que vienes haciendo sigue valiendo.',
    anotar: 'Anotar',
    deixa: 'Déjalo',
    anotado: 'Anotado. La racha empieza de nuevo desde aquí, y lo que ya hiciste sigue valiendo.',
    naoAnotei: 'Tranquilo, no anoté nada.',
    falhou: 'No pude anotarlo ahora. Puedes marcar el tropiezo en la pantalla de Hábitos.',
  },
  fr: {
    pergunta: (h) => `Un écart, ça arrive, sans drame. Je le note sur l'habitude « ${h} » ?`,
    qualHora: 'Ça arrive, sans drame. Vers quelle heure ? Comme ça je le note bien.',
    qualHabito: (l) => `Ça arrive, sans drame. C'était quelle habitude : ${l} ?`,
    semHabito: "Ça arrive, sans drame. Tu n'as pas d'habitude pour éviter ça dans l'app, donc rien à noter — ce que tu fais continue de compter.",
    anotar: 'Noter',
    deixa: 'Laisse tomber',
    anotado: 'Noté. La série repart d’ici, et ce que tu as déjà fait compte toujours.',
    naoAnotei: "Pas de souci, je n'ai rien noté.",
    falhou: "Je n'ai pas pu le noter. Tu peux marquer l'écart dans l'écran Habitudes.",
  },
  hi: {
    pergunta: (h) => `फिसलना भी सफ़र का हिस्सा है, कोई बात नहीं। क्या मैं इसे "${h}" आदत में लिख दूँ?`,
    qualHora: 'कोई बात नहीं। लगभग कितने बजे हुआ था? ताकि सही लिखूँ।',
    qualHabito: (l) => `कोई बात नहीं। किस आदत में: ${l}?`,
    semHabito: 'कोई बात नहीं। ऐप में इससे बचने की कोई आदत नहीं है, तो लिखने को कुछ नहीं — आपकी मेहनत अब भी गिनी जाती है।',
    anotar: 'लिख दो',
    deixa: 'रहने दो',
    anotado: 'लिख लिया। सिलसिला यहाँ से फिर शुरू, और जो आपने किया वह अब भी मायने रखता है।',
    naoAnotei: 'ठीक है, कुछ नहीं लिखा।',
    falhou: 'अभी लिख नहीं पाया। आदतें स्क्रीन पर फिसलन दर्ज कर सकते हैं।',
  },
}
