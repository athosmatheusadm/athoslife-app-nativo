// Treino pelo chat (02/11, docs/PLANO_LIFE_ACOES.md, Fase 3; guia "Ações
// no treino").
//
// "Põe o supino inclinado no meu treino de quinta", "copia o treino de
// quinta pra hoje". O Life adiciona do jeito que a pessoa faria à mão: séries
// e repetições que ela disse ou o padrão do catálogo, CARGA VAZIA (nunca
// sugere carga). Sempre com confirmação em um toque (life_acoes, botões que o
// APK atual já mostra). Bloqueia com check de saúde travado e com dor/lesão.

import type { Idioma } from './life.ts'

export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
export type Local = 'casa' | 'academia'
export const DIAS: readonly DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'] // índice = getUTCDay()

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

const SIN_DIA: Record<string, DiaSemana> = {
  seg: 'seg', segunda: 'seg', 'segunda feira': 'seg', monday: 'seg', mon: 'seg', lunes: 'seg', lundi: 'seg',
  ter: 'ter', terca: 'ter', 'terca feira': 'ter', tuesday: 'ter', tue: 'ter', martes: 'ter', mardi: 'ter',
  qua: 'qua', quarta: 'qua', 'quarta feira': 'qua', wednesday: 'qua', wed: 'qua', miercoles: 'qua', mercredi: 'qua',
  qui: 'qui', quinta: 'qui', 'quinta feira': 'qui', thursday: 'qui', thu: 'qui', jueves: 'qui', jeudi: 'qui',
  sex: 'sex', sexta: 'sex', 'sexta feira': 'sex', friday: 'sex', fri: 'sex', viernes: 'sex', vendredi: 'sex',
  sab: 'sab', sabado: 'sab', saturday: 'sab', sat: 'sab', samedi: 'sab',
  dom: 'dom', domingo: 'dom', sunday: 'dom', sun: 'dom', dimanche: 'dom',
}

export const diaDaData = (iso: string): DiaSemana => DIAS[new Date(iso + 'T12:00:00Z').getUTCDay()]

/** 'hoje', 'quinta', 'thu' → dia da semana. */
export function lerDia(v: unknown, hoje: string): DiaSemana | null {
  const t = sem(String(v ?? ''))
  if (['hoje', 'today', 'hoy', 'aujourd hui', 'aaj'].includes(t)) return diaDaData(hoje)
  return SIN_DIA[t] ?? null
}

export function lerDias(v: unknown, hoje: string): DiaSemana[] {
  const lista = Array.isArray(v) ? v : v ? [v] : []
  return [...new Set(lista.map((x) => lerDia(x, hoje)).filter((d): d is DiaSemana => !!d))].slice(0, 7)
}

export interface ExercicioCatalogo {
  id: string
  nome: string
  ambientes: string[] | null
  series_padrao: number | null
  repeticoes_padrao: number | null
  medida: string | null
  segundos_padrao: number | null
  traducoes: Record<string, { nome?: string }> | null
}

function nomesDe(e: ExercicioCatalogo): string[] {
  // Filtra DEPOIS de normalizar: nome em hindi (devanágari) vira '' e '' "cabia" em qualquer pedido.
  return [e.nome, ...Object.values(e.traducoes ?? {}).map((t) => t?.nome ?? '')].map(sem).filter((n) => n.length >= 3)
}

function pontos(pedido: string, nome: string): number {
  if (pedido === nome) return 100
  if (nome.includes(pedido) || pedido.includes(nome)) return 60 + Math.min(pedido.length, nome.length)
  const a = new Set(pedido.split(' ').filter((w) => w.length > 2))
  const b = new Set(nome.split(' ').filter((w) => w.length > 2))
  if (!a.size || !b.size) return 0
  const comum = [...a].filter((w) => b.has(w) || [...b].some((x) => x.startsWith(w) || w.startsWith(x))).length
  return Math.round((comum / Math.max(a.size, b.size)) * 50)
}

// Como se fala na academia → nome do catálogo (já normalizados). Vale se o pedido contém o apelido.
const APELIDOS: [RegExp, string][] = [
  [/\b(crucifixo|fly|flyes?) (na |no |de )?(maquina|aparelho)\b|\bpec?k? ?deck\b|\bmachine fly\b|\baperturas? en maquina\b/, 'voador pec deck'],
  [/\bcross ?over\b|\bcrucifixo (na |no )?(polia|cabo)\b|\bcable (fly|crossover)\b|\bcruce de poleas\b/, 'crossover'],
]

/** Acha o exercício pelo nome (pt e traduções). Duas opções próximas → as duas, pra perguntar. */
export function acharExercicio(
  pedido: string, catalogo: ExercicioCatalogo[],
): { tipo: 'um'; e: ExercicioCatalogo } | { tipo: 'varios'; opcoes: ExercicioCatalogo[] } | null {
  let p = sem(pedido)
  for (const [re, nome] of APELIDOS) if (re.test(p)) { p = nome; break }
  if (p.length < 3) return null
  const notas = catalogo
    .map((e) => ({ e, n: Math.max(...nomesDe(e).map((x) => pontos(p, x))) }))
    .filter((x) => x.n >= 30)
    .sort((a, b) => b.n - a.n)
  if (!notas.length) return null
  if (notas[0].n === 100 || notas.length === 1 || notas[0].n - notas[1].n >= 10) return { tipo: 'um', e: notas[0].e }
  return { tipo: 'varios', opcoes: notas.slice(0, 2).map((x) => x.e) }
}

/** Dor, lesão, limitação física: o Life não mexe no treino (acolhe e indica profissional). */
export const FALA_DE_DOR =
  /\b(dor|dores|doi|doendo|doeu|lesao|lesionad\w*|machuc\w*|machuq\w*|torci|torcao|tendinite|bursite|hernia|luxa\w*|fratur\w*|fisioterap\w*|pain|hurts?|injur\w*|dolor|duele|lesion|blessure|douleur)\b/

export interface SerieDetalhe { reps: number | null; carga_kg: number | null; segundos: number | null }

/** Séries do jeito que a pessoa faria à mão: o que ela disse, ou o padrão; carga só se ela disse. */
export function montarSeries(e: ExercicioCatalogo, series?: number | null, reps?: number | null, carga?: number | null): SerieDetalhe[] {
  const n = Math.min(Math.max(Math.round(Number(series) || e.series_padrao || 3), 1), 10)
  const tempo = e.medida === 'segundos'
  const r = tempo ? null : Math.min(Math.max(Math.round(Number(reps) || e.repeticoes_padrao || 12), 1), 100)
  const s = tempo ? (e.segundos_padrao ?? 30) : null
  const c = Number(carga) > 0 && Number(carga) <= 500 ? Number(carga) : null
  return Array.from({ length: n }, () => ({ reps: r, carga_kg: c, segundos: s }))
}

const NOME_DIA: Record<Idioma, Record<DiaSemana, string>> = {
  'pt-BR': { seg: 'segunda', ter: 'terça', qua: 'quarta', qui: 'quinta', sex: 'sexta', sab: 'sábado', dom: 'domingo' },
  en: { seg: 'Monday', ter: 'Tuesday', qua: 'Wednesday', qui: 'Thursday', sex: 'Friday', sab: 'Saturday', dom: 'Sunday' },
  es: { seg: 'lunes', ter: 'martes', qua: 'miércoles', qui: 'jueves', sex: 'viernes', sab: 'sábado', dom: 'domingo' },
  fr: { seg: 'lundi', ter: 'mardi', qua: 'mercredi', qui: 'jeudi', sex: 'vendredi', sab: 'samedi', dom: 'dimanche' },
  hi: { seg: 'सोमवार', ter: 'मंगलवार', qua: 'बुधवार', qui: 'गुरुवार', sex: 'शुक्रवार', sab: 'शनिवार', dom: 'रविवार' },
}
const NOME_LOCAL: Record<Idioma, Record<Local, string>> = {
  'pt-BR': { academia: 'da academia', casa: 'de casa' }, en: { academia: 'gym', casa: 'home' },
  es: { academia: 'del gimnasio', casa: 'de casa' }, fr: { academia: 'en salle', casa: 'à la maison' },
  hi: { academia: 'जिम', casa: 'घर' },
}
export const nomeDias = (ds: DiaSemana[], idioma: Idioma) => {
  const n = ds.map((d) => NOME_DIA[idioma][d])
  const e = { 'pt-BR': 'e', en: 'and', es: 'y', fr: 'et', hi: 'और' }[idioma]
  return n.length <= 1 ? (n[0] ?? '') : `${n.slice(0, -1).join(', ')} ${e} ${n[n.length - 1]}`
}

export const TXT_TREINO: Record<Idioma, {
  confira: (ex: string, series: string, dias: string, local: string) => string
  seriesReps: (n: number, r: number) => string
  seriesSeg: (n: number, s: number) => string
  jaEsta: (ex: string, dias: string) => string
  qualDia: string
  qual: (a: string, b: string) => string
  naoTem: (ex: string) => string
  localErrado: (ex: string, local: string) => string
  bloqueado: string
  ressalva: string
  dor: string
  copiarConfira: (origem: string, destino: string, local: string) => string
  copiarOcupado: (destino: string, n: number) => string
  copiarVazio: (origem: string) => string
  soHoje: (origem: string) => string
  soHojeOuSemana: string
  mesmoDia: string
  adicionado: (ex: string, dias: string) => string
  copiado: (n: number, destino: string) => string
  adicionar: string
  deixa: string
  falhou: string
}> = {
  'pt-BR': {
    confira: (ex, se, d, l) => `Confere: ${ex}, ${se}, entra no treino de ${d} ${l}, toda semana. A carga você define na hora.`,
    seriesReps: (n, r) => `${n} séries de ${r}`,
    seriesSeg: (n, s) => `${n} séries de ${s} s`,
    jaEsta: (ex, d) => `${ex} já está no treino de ${d}.`,
    qualDia: 'Em qual dia do treino? (ex.: quinta)',
    qual: (a, b) => `Você quis dizer ${a} ou ${b}?`,
    naoTem: (ex) => `${ex} ainda não está no app. Anotei pra gente incluir.`,
    localErrado: (ex, l) => `${ex} não dá pra fazer no treino ${l}. Quer que eu ponha no outro?`,
    bloqueado: 'Por segurança, o app não monta nem mexe no treino nesse caso. Mas sigo contigo no resto.',
    ressalva: 'Com a ressalva do check de saúde, mexer no treino é pelo botão "Montar treino", depois do "Quero mesmo assim".',
    dor: 'Com dor ou lesão, melhor não mexer no treino agora. Vale falar com um educador físico ou fisioterapeuta antes — e se piorar, com um médico.',
    copiarConfira: (o, d, l) => `Confere: copio o treino de ${o} pra ${d} ${l}, toda semana. Sua ficha de ${o} continua igual.`,
    copiarOcupado: (d, n) => `${d.charAt(0).toUpperCase() + d.slice(1)} já tem ${n} exercício${n === 1 ? '' : 's'}. Somo ou troco?`,
    copiarVazio: (o) => `O treino de ${o} está vazio, não tem o que copiar.`,
    soHoje: (o) => `Fechou: abre a ficha de ${o} na tela de Treino e treina por ela hoje. Sua ficha continua igual.`,
    soHojeOuSemana: 'Só hoje, ou quer que fique assim toda semana?',
    mesmoDia: 'É o mesmo dia, não tem o que copiar.',
    adicionado: (ex, d) => `Pronto, ${ex} entrou no treino de ${d}. A carga você anota na hora.`,
    copiado: (n, d) => `Pronto, copiei ${n} exercício${n === 1 ? '' : 's'} pro treino de ${d}.`,
    adicionar: 'Adicionar',
    deixa: 'Deixa pra lá',
    falhou: 'Não consegui mexer no treino agora. Dá pra fazer na tela de Treino.',
  },
  en: {
    confira: (ex, se, d, l) => `Check: ${ex}, ${se}, goes into your ${l} ${d} workout, every week. You set the weight on the spot.`,
    seriesReps: (n, r) => `${n} sets of ${r}`,
    seriesSeg: (n, s) => `${n} sets of ${s} s`,
    jaEsta: (ex, d) => `${ex} is already in your ${d} workout.`,
    qualDia: 'Which workout day? (e.g. Thursday)',
    qual: (a, b) => `Did you mean ${a} or ${b}?`,
    naoTem: (ex) => `${ex} isn't in the app yet. I noted it so we can add it.`,
    localErrado: (ex, l) => `${ex} can't be done in the ${l} workout. Want me to put it in the other one?`,
    bloqueado: "For safety, the app doesn't build or change workouts in this case. I'm still here for the rest.",
    ressalva: 'With the health check caveat, changing the workout goes through "Build workout", after "I want it anyway".',
    dor: "With pain or an injury, better not to change the workout now. Talk to a trainer or physio first — and a doctor if it gets worse.",
    copiarConfira: (o, d, l) => `Check: I copy your ${o} workout to ${d} (${l}), every week. Your ${o} stays the same.`,
    copiarOcupado: (d, n) => `${d} already has ${n} exercise${n === 1 ? '' : 's'}. Add to it or replace?`,
    copiarVazio: (o) => `Your ${o} workout is empty, nothing to copy.`,
    soHoje: (o) => `Got it: open your ${o} routine on the Workout screen and train with it today. Your plan stays the same.`,
    soHojeOuSemana: 'Just today, or every week?',
    mesmoDia: "It's the same day, nothing to copy.",
    adicionado: (ex, d) => `Done, ${ex} is in your ${d} workout. You log the weight on the spot.`,
    copiado: (n, d) => `Done, I copied ${n} exercise${n === 1 ? '' : 's'} to your ${d} workout.`,
    adicionar: 'Add',
    deixa: 'Never mind',
    falhou: "I couldn't change the workout now. You can do it on the Workout screen.",
  },
  es: {
    confira: (ex, se, d, l) => `Revisa: ${ex}, ${se}, entra en el entreno del ${d} ${l}, cada semana. El peso lo defines tú en el momento.`,
    seriesReps: (n, r) => `${n} series de ${r}`,
    seriesSeg: (n, s) => `${n} series de ${s} s`,
    jaEsta: (ex, d) => `${ex} ya está en el entreno del ${d}.`,
    qualDia: '¿En qué día del entreno? (ej.: jueves)',
    qual: (a, b) => `¿Quisiste decir ${a} o ${b}?`,
    naoTem: (ex) => `${ex} todavía no está en la app. Lo anoté para incluirlo.`,
    localErrado: (ex, l) => `${ex} no se puede hacer en el entreno ${l}. ¿Lo pongo en el otro?`,
    bloqueado: 'Por seguridad, la app no arma ni cambia el entreno en este caso. Sigo contigo en lo demás.',
    ressalva: 'Con la observación del check de salud, cambiar el entreno es por el botón "Armar entreno", después de "Quiero igual".',
    dor: 'Con dolor o lesión, mejor no cambiar el entreno ahora. Habla antes con un entrenador o fisioterapeuta — y con un médico si empeora.',
    copiarConfira: (o, d, l) => `Revisa: copio el entreno del ${o} al ${d} ${l}, cada semana. Tu ${o} queda igual.`,
    copiarOcupado: (d, n) => `El ${d} ya tiene ${n} ejercicio${n === 1 ? '' : 's'}. ¿Sumo o reemplazo?`,
    copiarVazio: (o) => `El entreno del ${o} está vacío, no hay qué copiar.`,
    soHoje: (o) => `Listo: abre la rutina del ${o} en la pantalla de Entreno y entrena con ella hoy. Tu plan queda igual.`,
    soHojeOuSemana: '¿Solo hoy, o que quede así cada semana?',
    mesmoDia: 'Es el mismo día, no hay qué copiar.',
    adicionado: (ex, d) => `Listo, ${ex} entró en el entreno del ${d}. El peso lo anotas en el momento.`,
    copiado: (n, d) => `Listo, copié ${n} ejercicio${n === 1 ? '' : 's'} al entreno del ${d}.`,
    adicionar: 'Añadir',
    deixa: 'Déjalo',
    falhou: 'No pude cambiar el entreno ahora. Puedes hacerlo en la pantalla de Entreno.',
  },
  fr: {
    confira: (ex, se, d, l) => `Regarde : ${ex}, ${se}, dans ta séance du ${d} ${l}, chaque semaine. La charge, tu la choisis sur place.`,
    seriesReps: (n, r) => `${n} séries de ${r}`,
    seriesSeg: (n, s) => `${n} séries de ${s} s`,
    jaEsta: (ex, d) => `${ex} est déjà dans ta séance du ${d}.`,
    qualDia: 'Quel jour de séance ? (ex. : jeudi)',
    qual: (a, b) => `Tu voulais dire ${a} ou ${b} ?`,
    naoTem: (ex) => `${ex} n'est pas encore dans l'app. Je l'ai noté pour l'ajouter.`,
    localErrado: (ex, l) => `${ex} ne se fait pas dans la séance ${l}. Je le mets dans l'autre ?`,
    bloqueado: "Par sécurité, l'app ne crée ni ne modifie la séance dans ce cas. Je reste là pour le reste.",
    ressalva: 'Avec la réserve du bilan santé, modifier la séance passe par « Créer ma séance », après « Je le veux quand même ».',
    dor: "Avec une douleur ou une blessure, mieux vaut ne pas toucher à la séance. Parle d'abord à un coach ou un kiné — et à un médecin si ça empire.",
    copiarConfira: (o, d, l) => `Regarde : je copie la séance du ${o} vers le ${d} ${l}, chaque semaine. Ton ${o} reste pareil.`,
    copiarOcupado: (d, n) => `Le ${d} a déjà ${n} exercice${n === 1 ? '' : 's'}. J'ajoute ou je remplace ?`,
    copiarVazio: (o) => `La séance du ${o} est vide, rien à copier.`,
    soHoje: (o) => `Ok : ouvre la séance du ${o} dans l'écran Entraînement et fais-la aujourd'hui. Ton programme reste pareil.`,
    soHojeOuSemana: "Juste aujourd'hui, ou chaque semaine ?",
    mesmoDia: "C'est le même jour, rien à copier.",
    adicionado: (ex, d) => `C'est fait, ${ex} est dans ta séance du ${d}. La charge, tu la notes sur place.`,
    copiado: (n, d) => `C'est fait, j'ai copié ${n} exercice${n === 1 ? '' : 's'} vers la séance du ${d}.`,
    adicionar: 'Ajouter',
    deixa: 'Laisse tomber',
    falhou: "Je n'ai pas pu modifier la séance. Tu peux le faire dans l'écran Entraînement.",
  },
  hi: {
    confira: (ex, se, d, l) => `देख लीजिए: ${ex}, ${se}, ${l} के ${d} वाले वर्कआउट में, हर हफ़्ते। वज़न आप वहीं तय करेंगे।`,
    seriesReps: (n, r) => `${n} सेट × ${r}`,
    seriesSeg: (n, s) => `${n} सेट × ${s} से.`,
    jaEsta: (ex, d) => `${ex} पहले से ${d} वाले वर्कआउट में है।`,
    qualDia: 'वर्कआउट का कौन सा दिन? (जैसे: गुरुवार)',
    qual: (a, b) => `आपका मतलब ${a} था या ${b}?`,
    naoTem: (ex) => `${ex} अभी ऐप में नहीं है। जोड़ने के लिए नोट कर लिया।`,
    localErrado: (ex, l) => `${ex} ${l} वाले वर्कआउट में नहीं हो सकता। दूसरे में डाल दूँ?`,
    bloqueado: 'सुरक्षा के लिए, ऐसे में ऐप वर्कआउट नहीं बनाता या बदलता। बाकी में मैं साथ हूँ।',
    ressalva: 'स्वास्थ्य जाँच की सावधानी के साथ, वर्कआउट "वर्कआउट बनाएँ" बटन से बदलता है, "फिर भी चाहिए" के बाद।',
    dor: 'दर्द या चोट में अभी वर्कआउट न बदलें। पहले ट्रेनर या फ़िज़ियोथेरेपिस्ट से बात करें — और बढ़े तो डॉक्टर से।',
    copiarConfira: (o, d, l) => `देख लीजिए: ${o} का वर्कआउट ${d} में (${l}) कॉपी करूँगा, हर हफ़्ते। ${o} वैसा ही रहेगा।`,
    copiarOcupado: (d, n) => `${d} में पहले से ${n} एक्सरसाइज़ हैं। जोड़ूँ या बदलूँ?`,
    copiarVazio: (o) => `${o} का वर्कआउट खाली है, कॉपी करने को कुछ नहीं।`,
    soHoje: (o) => `ठीक है: वर्कआउट स्क्रीन पर ${o} वाला खोलिए और आज उसी से कीजिए। आपका प्लान वैसा ही रहेगा।`,
    soHojeOuSemana: 'सिर्फ़ आज, या हर हफ़्ते ऐसा ही?',
    mesmoDia: 'यह वही दिन है, कॉपी करने को कुछ नहीं।',
    adicionado: (ex, d) => `हो गया, ${ex} ${d} वाले वर्कआउट में आ गया। वज़न वहीं लिखिए।`,
    copiado: (n, d) => `हो गया, ${n} एक्सरसाइज़ ${d} वाले वर्कआउट में कॉपी कर दीं।`,
    adicionar: 'जोड़ें',
    deixa: 'रहने दो',
    falhou: 'अभी वर्कआउट नहीं बदल पाया। वर्कआउट स्क्रीन पर कर सकते हैं।',
  },
}
export const nomeLocal = (l: Local, idioma: Idioma) => NOME_LOCAL[idioma][l]
