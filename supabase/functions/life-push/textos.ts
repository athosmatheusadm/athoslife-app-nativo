// ================================================================
// A frase do push. Grátis: frase pronta. Pago: o Luna escreve uma frase
// só daquela pessoa (nome, memórias, jeito dela), e a frase passa por
// filtros; se reprovar ou a IA falhar, vai a pronta.
//
// Tela bloqueada: o push aparece pra quem estiver do lado. Nunca cita
// hábito, vício, tropeço, peso, comida ou meta.
// ================================================================
import type { Idioma } from '../ai-proxy/life.ts'
import { papoLeve } from '../ai-proxy/aviso.ts'
import type { Decisao } from './regras.ts'

export const TITULO: Record<Idioma, string> = { 'pt-BR': 'Life', en: 'Life', es: 'Life', fr: 'Life', hi: 'Life' }

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const escolher = (lista: string[], semente: string) => {
  let h = 0
  for (let i = 0; i < semente.length; i++) h = (h * 31 + semente.charCodeAt(i)) | 0
  return lista[Math.abs(h) % lista.length]!
}

type Fixos = {
  eventoHoje: (t: string) => string[]
  eventoAmanha: (t: string) => string[]
  eventoOntem: (t: string) => string[]
  marco: (n: number) => string[]
  pesado: string[]
  sumiu: (nome: string | null) => string[]
}

const FIXOS: Record<Idioma, Fixos> = {
  'pt-BR': {
    eventoHoje: (t) => [`Hoje é o dia: ${minuscula(t)}! Torcendo por você 🍀`, `Chegou o dia: ${minuscula(t)}. Vai dar bom!`],
    eventoAmanha: (t) => [`Amanhã é o dia: ${minuscula(t)}. Como você tá se sentindo?`, `Véspera de ${minuscula(t)}… tudo certo por aí?`],
    eventoOntem: (t) => [`E aí, como foi ontem (${minuscula(t)})? Me conta!`, `Fiquei curioso: como foi ${minuscula(t)}?`],
    marco: (n) => [`${n} dias firme! Isso é muita coisa 💚`, `${n} dias seguidos. Passando só pra te dizer: que orgulho!`],
    pesado: ['Os últimos dias pareceram pesados. Sem pressa: se quiser conversar, tô aqui.', 'Passando pra saber de você. Se precisar desabafar, tô por aqui 💚'],
    sumiu: (n) => [`${n ? `${n}, s` : 'S'}enti sua falta por aqui! Bora recomeçar leve?`, `${n ? `Oi, ${n}! ` : 'Oi! '}Faz uns dias, hein. Como você tá?`],
  },
  en: {
    eventoHoje: (t) => [`Today's the day: ${minuscula(t)}! Rooting for you 🍀`, `It's here: ${minuscula(t)}. You've got this!`],
    eventoAmanha: (t) => [`Tomorrow's the day: ${minuscula(t)}. How are you feeling?`, `The eve of ${minuscula(t)}… all good?`],
    eventoOntem: (t) => [`So, how did it go yesterday (${minuscula(t)})? Tell me!`, `I'm curious: how was ${minuscula(t)}?`],
    marco: (n) => [`${n} days strong! That's a lot 💚`, `${n} days in a row. Just stopping by to say: so proud!`],
    pesado: ['The last few days seemed heavy. No rush: if you want to talk, I\'m here.', 'Checking in on you. If you need to vent, I\'m around 💚'],
    sumiu: (n) => [`${n ? `${n}, I` : 'I'} missed you around here! Shall we start light again?`, `${n ? `Hi, ${n}! ` : 'Hi! '}It's been a few days. How are you?`],
  },
  es: {
    eventoHoje: (t) => [`¡Hoy es el día: ${minuscula(t)}! Te mando buena vibra 🍀`, `Llegó el día: ${minuscula(t)}. ¡Te va a ir bien!`],
    eventoAmanha: (t) => [`Mañana es el día: ${minuscula(t)}. ¿Cómo te sientes?`, `Víspera de ${minuscula(t)}… ¿todo bien?`],
    eventoOntem: (t) => [`¿Y? ¿Cómo te fue ayer (${minuscula(t)})? ¡Cuéntame!`, `Me quedé con la duda: ¿cómo fue ${minuscula(t)}?`],
    marco: (n) => [`¡${n} días firme! Es muchísimo 💚`, `${n} días seguidos. Solo paso a decirte: ¡qué orgullo!`],
    pesado: ['Los últimos días parecieron pesados. Sin prisa: si quieres hablar, aquí estoy.', 'Paso a saber de ti. Si necesitas desahogarte, aquí estoy 💚'],
    sumiu: (n) => [`¡${n ? `${n}, t` : 'T'}e extrañé por aquí! ¿Empezamos suave otra vez?`, `${n ? `¡Hola, ${n}! ` : '¡Hola! '}Pasaron unos días. ¿Cómo estás?`],
  },
  fr: {
    eventoHoje: (t) => [`C’est le grand jour : ${minuscula(t)} ! Je croise les doigts 🍀`, `On y est : ${minuscula(t)}. Tu vas assurer !`],
    eventoAmanha: (t) => [`C’est demain : ${minuscula(t)}. Comment tu te sens ?`, `Veille de ${minuscula(t)}… tout va bien ?`],
    eventoOntem: (t) => [`Alors, c’était comment hier (${minuscula(t)}) ? Raconte !`, `Je suis curieux : comment s’est passé ${minuscula(t)} ?`],
    marco: (n) => [`${n} jours que tu tiens bon ! C’est énorme 💚`, `${n} jours d’affilée. Je passe juste te dire : bravo !`],
    pesado: ['Les derniers jours avaient l’air lourds. Aucune pression : si tu veux parler, je suis là.', 'Je passe prendre de tes nouvelles. Besoin de vider ton sac ? Je suis là 💚'],
    sumiu: (n) => [`${n ? `${n}, tu` : 'Tu'} m’as manqué ! On reprend en douceur ?`, `${n ? `Coucou ${n} ! ` : 'Coucou ! '}Ça fait quelques jours. Comment tu vas ?`],
  },
  hi: {
    eventoHoje: (t) => [`आज वह दिन है: ${t}! आपके लिए दुआ कर रहा हूँ 🍀`, `आ गया दिन: ${t}। आप कर लेंगे!`],
    eventoAmanha: (t) => [`कल वह दिन है: ${t}। कैसा महसूस कर रहे हैं?`, `${t} से एक दिन पहले… सब ठीक?`],
    eventoOntem: (t) => [`तो, कल कैसा रहा (${t})? बताइए!`, `जानना है: ${t} कैसा रहा?`],
    marco: (n) => [`${n} दिन से डटे हुए हैं! यह बहुत बड़ी बात है 💚`, `लगातार ${n} दिन। बस इतना कहना था: बहुत बढ़िया!`],
    pesado: ['पिछले कुछ दिन भारी लगे। कोई जल्दी नहीं: बात करनी हो तो मैं यहीं हूँ।', 'आपका हाल पूछने आया। मन हल्का करना हो तो मैं हूँ 💚'],
    sumiu: (n) => [`${n ? `${n}, आपकी` : 'आपकी'} याद आई! फिर से हल्के से शुरू करें?`, `${n ? `हाय ${n}! ` : 'हाय! '}कुछ दिन हो गए। आप कैसे हैं?`],
  },
}

/** Frase pronta (grátis e reserva do pago). */
export function textoFixo(dec: Decisao, idioma: Idioma, nome: string | null, hoje: string, hora: number): string {
  const f = FIXOS[idioma]
  const semente = `${hoje}:${dec.chave}`
  const ev = dec.detalhe?.texto ?? ''
  switch (dec.motivo) {
    case 'evento_hoje': return escolher(f.eventoHoje(ev), semente)
    case 'evento_amanha': return escolher(f.eventoAmanha(ev), semente)
    case 'evento_ontem': return escolher(f.eventoOntem(ev), semente)
    case 'marco': return escolher(f.marco(dec.detalhe?.dias ?? 7), semente)
    case 'pesado': return escolher(f.pesado, semente)
    case 'sumiu': return escolher(f.sumiu(nome), semente)
    // Horário de risco: papo leve, sem citar nada (mesma régua do alô da Fase 5).
    case 'risco': return papoLeve(hoje, hora, idioma)
  }
}

const IDIOMA_NOME: Record<Idioma, string> = { 'pt-BR': 'português do Brasil', en: 'inglês', es: 'espanhol', fr: 'francês', hi: 'hindi' }

/** O que o Life sabe do motivo, em palavras (vai pro prompt, não pra tela). */
function explicarMotivo(dec: Decisao): string {
  const d = dec.detalhe
  switch (dec.motivo) {
    case 'evento_hoje': return `Hoje é um dia importante que a pessoa te contou: "${d?.texto}". Deseje sorte com carinho.`
    case 'evento_amanha': return `Amanhã é um dia importante que a pessoa te contou: "${d?.texto}". Pergunte como ela está se sentindo.`
    case 'evento_ontem': return `Ontem foi um dia importante que a pessoa te contou: "${d?.texto}". Pergunte como foi, curioso de verdade.`
    case 'marco': return `A pessoa completou ${d?.dias} dias firme num hábito. Comemore. NÃO diga qual é o hábito.`
    case 'pesado': return 'Os últimos check-ins da pessoa foram de dias pesados. Só mostre que você está ali, sem conselho, sem pergunta invasiva.'
    case 'sumiu': return `A pessoa não abre o app há ${d?.dias} dias. Diga que sentiu falta, sem culpa, sem cobrar nada, convidando a voltar leve.`
    case 'risco': return 'Está chegando um horário em que a pessoa costuma ter vontade de um hábito que quer largar. Só puxe um papo leve sobre o dia dela. NÃO cite hábito, vontade, nem nada relacionado.'
  }
}

export function pedidoIA(dec: Decisao, p: {
  idioma: Idioma
  nome: string | null
  memorias: readonly string[]
  periodo: string
}): { sistema: string; mensagem: string } {
  const sistema = `Você é o Life, o companheiro do app ATHOSlife: amigo, leve, caloroso, nunca chato. Escreva UMA notificação push curta pra uma pessoa.

Regras (todas obrigatórias):
- Em ${IDIOMA_NOME[p.idioma]}, até 110 caracteres, 1 ou 2 frases, no máximo 1 emoji.
- Soe como um amigo mandando mensagem, não como app. Nada de "Lembrete", "Não esqueça", "Você precisa".
- A notificação aparece na tela bloqueada: NUNCA cite hábito, vício, cigarro, bebida, doce, tropeço, recaída, peso, dieta, calorias, meta, remédio ou saúde.
- Sem números, exceto a quantidade de dias de um marco.
- Use o primeiro nome só se ficar natural. Pode usar UMA coisa das memórias se combinar com o motivo; se não combinar, ignore.
- Nada de cobrança, culpa ou pressão.
Responda só JSON: {"texto": "..."}`
  const mensagem = [
    `Motivo: ${explicarMotivo(dec)}`,
    `Agora é ${p.periodo} pra pessoa.`,
    p.nome ? `Primeiro nome: ${p.nome}` : 'Nome: não sabemos.',
    p.memorias.length ? `O que você sabe dela:\n- ${p.memorias.slice(0, 5).join('\n- ')}` : 'Memórias: nenhuma.',
  ].join('\n')
  return { sistema, mensagem }
}

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
// Tudo que não pode aparecer na tela bloqueada, nos 4 idiomas latinos.
const PROIBIDAS = /\b(vici|habito|tropec|recaid|reca[ií]|cigarr|fum|bebid|alcool|cerveja|doce|aposta|porn|peso|kg|dieta|calori|kcal|meta|remedio|lembrete|nao esquec|habit|addict|smok|drink|alcohol|relaps|slip|weight|diet|goal|reminder|don.?t forget|adicci|fumar|recaida|bebida|azucar|habitude|rechute|tabac|alcool|regime|objectif|rappel)/

/** A frase da IA serve? Curta, sem link, sem palavra proibida, sem o nome do hábito. */
export function fraseValida(texto: string, proibidosExtras: readonly string[], permitirNumero: boolean): boolean {
  const t = texto.trim()
  if (t.length < 8 || t.length > 140) return false
  if (/https?:|www\.|[<>{}[\]]/.test(t)) return false
  const s = sem(t)
  if (PROIBIDAS.test(s)) return false
  if (!permitirNumero && /\d/.test(t)) return false
  return proibidosExtras.every((x) => x.trim().length < 3 || !s.includes(sem(x.trim())))
}

export function lerJsonTexto(bruto: string): string | null {
  try {
    const m = /\{[\s\S]*\}/.exec(bruto)
    const v = JSON.parse(m ? m[0] : bruto) as { texto?: unknown }
    return typeof v.texto === 'string' ? v.texto.trim() : null
  } catch {
    return null
  }
}
