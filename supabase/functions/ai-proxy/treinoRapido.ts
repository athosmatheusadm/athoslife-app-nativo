// Treino de UMA parte do corpo pedido no chat (dono, 14/11/2026): "faz um
// treino só de bíceps, rápido" tem que virar isso mesmo, e não o plano da
// semana inteira nem "isso é no Life do Treino".
//
// Quem escolhe os exercícios é esta regra fixa, em cima do catálogo — não a
// IA. O Life só diz os NOMES; séries e repetições são o padrão do catálogo
// (referência geral, editável na ficha) e carga nunca. Entra na ficha do dia
// com confirmação em um toque, pelo mesmo caminho do adicionar_exercicio.

import type { Idioma } from './life.ts'
import { montarSeries, type ExercicioCatalogo, type SerieDetalhe } from './treino.ts'

export type ParteCorpo =
  | 'biceps' | 'triceps' | 'bracos' | 'peito' | 'costas' | 'ombro' | 'pernas' | 'gluteos' | 'panturrilha' | 'abdominal'

export type Nivel = 'iniciante' | 'intermediario' | 'avancado'
const RANK: Record<string, number> = { iniciante: 1, intermediario: 2, avancado: 3 }

export interface ExercicioDoGrupo extends ExercicioCatalogo {
  grupo_muscular: string | null
  nivel_minimo: string | null
  ordem: number | null
}

const sem = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

// Mais específico primeiro (bíceps antes de braço).
const SINONIMOS: [RegExp, ParteCorpo][] = [
  [/\b(bicep\w*|bicip\w*|rosca)\b/, 'biceps'],
  [/\b(tricep\w*|tricip\w*)\b/, 'triceps'],
  [/\b(bracos?|arms?|brazos?|bras)\b/, 'bracos'],
  [/\b(peito|peitoral|chest|pecho|pectoral\w*|pecs?|poitrine)\b/, 'peito'],
  [/\b(costas|dorsal|dorsais|back|espalda|lats?)\b|^(le )?dos$/, 'costas'],
  [/\b(ombros?|deltoides?|shoulders?|hombros?|epaules?)\b/, 'ombro'],
  [/\b(gluteos?|bumbum|glutes?|butt|booty|fessiers?)\b/, 'gluteos'],
  [/\b(panturrilhas?|gemeos|batata da perna|calves|calf|pantorrillas?|gemelos|mollets?)\b/, 'panturrilha'],
  [/\b(abdominal|abdominais|abdomen|abs|barriga|core|abdos?)\b/, 'abdominal'],
  [/\b(pernas?|coxas?|quadriceps|posterior\w*|inferiores?|legs?|piernas?|jambes?|cuisses?)\b/, 'pernas'],
]

/** "bíceps", "arms", "treino de perna" → parte do corpo. Sem parte clara → null (o Life pergunta). */
export function lerParte(v: unknown): ParteCorpo | null {
  const t = sem(String(v ?? ''))
  if (!t) return null
  for (const [re, parte] of SINONIMOS) if (re.test(t)) return parte
  return null
}

function ehDaParte(e: ExercicioDoGrupo, parte: ParteCorpo): boolean {
  const rosca = sem(e.nome).includes('rosca')
  if (parte === 'biceps') return e.grupo_muscular === 'bracos' && rosca
  if (parte === 'triceps') return e.grupo_muscular === 'bracos' && !rosca
  return e.grupo_muscular === parte
}

/** Quantos exercícios: curto de propósito (é uma parte só). */
export const QTD_RAPIDO = 3
export const QTD_NORMAL = 4
/** Teto de séries do treino montado aqui: o menor teto semanal por grupo do gerador (iniciante). */
export const TETO_SERIES = 10

export interface ItemRapido { exercicio_id: string; nome: string; series: SerieDetalhe[] }

/** Treino rápido no grátis: 1 por semana (dono, 17/11). Janela de 7 dias corridos. */
export const RAPIDO_GRATIS_DIAS = 7

/** O que a pessoa mudou no cartão antes de pôr na ficha: séries e reps (ou segundos) por exercício. */
export type AjusteRapido = { series?: unknown; reps?: unknown; segundos?: unknown }

const inteiro = (v: unknown, min: number, max: number): number | null => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

/**
 * Aplica no item o que a pessoa ajustou no cartão (18/11). Valor fora da
 * faixa é ignorado (fica o do app). Séries 1–5, reps 1–20, segundos 10–120 —
 * as mesmas faixas do aplicar_plano_treino. Carga nunca vem daqui.
 */
export function ajustarItem(item: ItemRapido, ajuste: AjusteRapido | undefined): ItemRapido {
  if (!ajuste || typeof ajuste !== 'object' || !item.series.length) return item
  const base = item.series[0]
  const porTempo = base.segundos != null
  const n = inteiro(ajuste.series, 1, 5) ?? item.series.length
  const reps = porTempo ? null : inteiro(ajuste.reps, 1, 20) ?? base.reps
  const segundos = porTempo ? inteiro(ajuste.segundos, 10, 120) ?? base.segundos : null
  return { ...item, series: Array.from({ length: n }, () => ({ reps, segundos, carga_kg: null })) }
}

export function lerAjustes(v: unknown): Record<string, AjusteRapido> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 10)
    .filter(([, a]) => a && typeof a === 'object') as [string, AjusteRapido][])
}

/**
 * Escolhe os exercícios da parte pedida: só os que dão pra fazer no local e
 * no nível dela, na ordem do catálogo, pulando os que já estão na ficha do
 * dia. Braço inteiro alterna bíceps e tríceps. `variante` troca a seleção
 * ("outra opção").
 */
export function escolherTreinoRapido(
  catalogo: readonly ExercicioDoGrupo[],
  parte: ParteCorpo,
  o: { local: 'casa' | 'academia'; nivel: Nivel; rapido: boolean; jaNoDia?: ReadonlySet<string>; variante?: number; nome?: (e: ExercicioDoGrupo) => string },
): ItemRapido[] {
  const pode = (e: ExercicioDoGrupo) =>
    (!Array.isArray(e.ambientes) || !e.ambientes.length || e.ambientes.includes(o.local)) &&
    (RANK[e.nivel_minimo ?? 'iniciante'] ?? 1) <= RANK[o.nivel] &&
    !o.jaNoDia?.has(e.id)
  const ordenar = (l: ExercicioDoGrupo[]) => [...l].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999))
  let lista = ordenar(catalogo.filter((e) => ehDaParte(e, parte) && pode(e)))
  if (parte === 'bracos') {
    const b = lista.filter((e) => ehDaParte(e, 'biceps'))
    const t = lista.filter((e) => ehDaParte(e, 'triceps'))
    lista = []
    for (let i = 0; i < Math.max(b.length, t.length); i++) {
      if (b[i]) lista.push(b[i])
      if (t[i]) lista.push(t[i])
    }
  }
  const qtd = Math.min(o.rapido ? QTD_RAPIDO : QTD_NORMAL, lista.length)
  if (!qtd) return []
  // Outra opção: anda na lista de um em um, dando a volta.
  const passo = Math.max(0, Math.floor(o.variante ?? 0)) % lista.length
  const escolhidos = Array.from({ length: qtd }, (_, i) => lista[(passo + i) % lista.length])

  // Séries: o padrão do catálogo (no máximo 3), e só os dois primeiros ficam
  // com 3 quando o total passaria do teto.
  let total = 0
  return escolhidos.map((e, i) => {
    const padrao = Math.min(Math.max(e.series_padrao ?? 3, 1), 3)
    const restam = escolhidos.length - i - 1
    const n = Math.max(1, Math.min(padrao, TETO_SERIES - total - restam * 2, i < 2 ? 3 : 2))
    total += n
    return { exercicio_id: e.id, nome: o.nome?.(e) ?? e.nome, series: montarSeries(e, n) }
  })
}

const NOME_PARTE: Record<Idioma, Record<ParteCorpo, string>> = {
  'pt-BR': { biceps: 'bíceps', triceps: 'tríceps', bracos: 'braços', peito: 'peito', costas: 'costas', ombro: 'ombros', pernas: 'pernas', gluteos: 'glúteos', panturrilha: 'panturrilha', abdominal: 'abdômen' },
  en: { biceps: 'biceps', triceps: 'triceps', bracos: 'arms', peito: 'chest', costas: 'back', ombro: 'shoulders', pernas: 'legs', gluteos: 'glutes', panturrilha: 'calves', abdominal: 'abs' },
  es: { biceps: 'bíceps', triceps: 'tríceps', bracos: 'brazos', peito: 'pecho', costas: 'espalda', ombro: 'hombros', pernas: 'piernas', gluteos: 'glúteos', panturrilha: 'pantorrillas', abdominal: 'abdomen' },
  fr: { biceps: 'biceps', triceps: 'triceps', bracos: 'bras', peito: 'pectoraux', costas: 'dos', ombro: 'épaules', pernas: 'jambes', gluteos: 'fessiers', panturrilha: 'mollets', abdominal: 'abdos' },
  hi: { biceps: 'बाइसेप्स', triceps: 'ट्राइसेप्स', bracos: 'बाँहों', peito: 'छाती', costas: 'पीठ', ombro: 'कंधों', pernas: 'पैरों', gluteos: 'ग्लूट्स', panturrilha: 'पिंडलियों', abdominal: 'पेट' },
}
export const nomeParte = (p: ParteCorpo, idioma: Idioma) => NOME_PARTE[idioma][p]

const E: Record<Idioma, string> = { 'pt-BR': 'e', en: 'and', es: 'y', fr: 'et', hi: 'और' }
export const listar = (nomes: string[], idioma: Idioma) =>
  nomes.length <= 1 ? (nomes[0] ?? '') : `${nomes.slice(0, -1).join(', ')} ${E[idioma]} ${nomes[nomes.length - 1]}`

/** Só nomes: nada de séries, repetições ou carga na fala (dono, 12/11). */
export const TXT_PARTE: Record<Idioma, {
  confira: (parte: string, lista: string, dia: string, local: string, rapido: boolean) => string
  /** Com o cartão no app (15/11): os exercícios aparecem no cartão, a fala só apresenta. */
  cartao: (parte: string, dia: string, local: string, rapido: boolean) => string
  qualParte: string
  semExercicio: (parte: string, local: string) => string
  jaTemTudo: (parte: string, dia: string) => string
  pronto: (n: number, dia: string) => string
  /** Grátis já usou o treino rápido da semana (dono, 17/11: 1 por semana). */
  limiteGratis: string
}> = {
  'pt-BR': {
    confira: (p, l, d, lo, r) => `Fechou, treino ${r ? 'rápido ' : ''}só de ${p}: ${l}. Coloco na sua ficha de ${d} ${lo}? A carga é você quem escolhe na hora.`,
    cartao: (p, d, lo, r) => `Fechou, montei um treino ${r ? 'rápido ' : ''}só de ${p}. Confere aí embaixo: coloco na sua ficha de ${d} ${lo}?`,
    qualParte: 'Monto sim! De qual parte do corpo você quer o treino? (ex.: bíceps, perna, peito)',
    semExercicio: (p, lo) => `Não achei exercício de ${p} pro treino ${lo} no app ainda. Quer que eu monte de outra parte?`,
    jaTemTudo: (p, d) => `Sua ficha de ${d} já tem os exercícios de ${p} que eu colocaria. É só abrir o Treino e mandar ver.`,
    pronto: (n, d) => `Pronto, ${n} exercício${n === 1 ? '' : 's'} na sua ficha de ${d}. Abre o Treino quando for começar — a carga você anota na hora.`,
    limiteGratis: 'Seu treino rápido desta semana já foi. No Premium eu monto quantos você quiser — e a ficha da semana inteira também. Enquanto isso, você monta o seu à vontade no Treino.',
  },
  en: {
    confira: (p, l, d, lo, r) => `Got it, a ${r ? 'quick ' : ''}${p}-only workout: ${l}. Shall I put it in your ${d} ${lo} routine? You choose the weight on the spot.`,
    cartao: (p, d, lo, r) => `Got it, here's a ${r ? 'quick ' : ''}${p}-only workout. Check it below: shall I put it in your ${d} ${lo} routine?`,
    qualParte: 'Sure! Which body part do you want the workout for? (e.g. biceps, legs, chest)',
    semExercicio: (p, lo) => `I couldn't find ${p} exercises for the ${lo} workout in the app yet. Want one for another body part?`,
    jaTemTudo: (p, d) => `Your ${d} routine already has the ${p} exercises I would add. Just open Workout and go.`,
    pronto: (n, d) => `Done, ${n} exercise${n === 1 ? '' : 's'} in your ${d} routine. Open Workout when you start — you log the weight on the spot.`,
    limiteGratis: "You've used this week's quick workout. With Premium I build as many as you want — and the whole week's routine too. Meanwhile, you can build your own in Workout.",
  },
  es: {
    confira: (p, l, d, lo, r) => `Listo, entreno ${r ? 'rápido ' : ''}solo de ${p}: ${l}. ¿Lo pongo en tu rutina del ${d} ${lo}? El peso lo eliges tú en el momento.`,
    cartao: (p, d, lo, r) => `Listo, armé un entreno ${r ? 'rápido ' : ''}solo de ${p}. Míralo abajo: ¿lo pongo en tu rutina del ${d} ${lo}?`,
    qualParte: '¡Claro! ¿De qué parte del cuerpo quieres el entreno? (ej.: bíceps, piernas, pecho)',
    semExercicio: (p, lo) => `Todavía no encontré ejercicios de ${p} para el entreno ${lo} en la app. ¿Te armo uno de otra parte?`,
    jaTemTudo: (p, d) => `Tu rutina del ${d} ya tiene los ejercicios de ${p} que pondría. Solo abre Entreno y dale.`,
    pronto: (n, d) => `Listo, ${n} ejercicio${n === 1 ? '' : 's'} en tu rutina del ${d}. Abre Entreno cuando empieces — el peso lo anotas en el momento.`,
    limiteGratis: 'Ya usaste tu entreno rápido de esta semana. Con Premium armo los que quieras — y la rutina de toda la semana también. Mientras tanto, puedes armar el tuyo en Entreno.',
  },
  fr: {
    confira: (p, l, d, lo, r) => `C'est parti, une séance ${r ? 'rapide ' : ''}spéciale ${p} : ${l}. Je l'ajoute à ta séance du ${d} ${lo} ? La charge, c'est toi qui la choisis sur le moment.`,
    cartao: (p, d, lo, r) => `C'est parti, voici une séance ${r ? 'rapide ' : ''}spéciale ${p}. Regarde ci-dessous : je l'ajoute à ta séance du ${d} ${lo} ?`,
    qualParte: 'Bien sûr ! Pour quelle partie du corps veux-tu la séance ? (ex. : biceps, jambes, pectoraux)',
    semExercicio: (p, lo) => `Je n'ai pas encore trouvé d'exercices pour ${p} ${lo} dans l'appli. Je t'en prépare une pour une autre partie ?`,
    jaTemTudo: (p, d) => `Ta séance du ${d} contient déjà les exercices pour ${p} que j'ajouterais. Ouvre Entraînement et c'est parti.`,
    pronto: (n, d) => `C'est fait, ${n} exercice${n === 1 ? '' : 's'} dans ta séance du ${d}. Ouvre Entraînement quand tu commences — tu notes la charge sur le moment.`,
    limiteGratis: "Tu as déjà utilisé ta séance rapide de la semaine. Avec Premium, je t'en prépare autant que tu veux — et le programme de toute la semaine aussi. En attendant, tu peux créer la tienne dans Entraînement.",
  },
  hi: {
    confira: (p, l, d, lo, r) => `ठीक है, सिर्फ़ ${p} का ${r ? 'छोटा ' : ''}वर्कआउट: ${l}। इसे आपके ${d} (${lo}) वाले वर्कआउट में डाल दूँ? वज़न आप वहीं चुनिए।`,
    cartao: (p, d, lo, r) => `ठीक है, सिर्फ़ ${p} का ${r ? 'छोटा ' : ''}वर्कआउट तैयार है। नीचे देखिए: इसे आपके ${d} (${lo}) वाले वर्कआउट में डाल दूँ?`,
    qualParte: 'ज़रूर! शरीर के किस हिस्से का वर्कआउट चाहिए? (जैसे: बाइसेप्स, पैर, छाती)',
    semExercicio: (p, lo) => `ऐप में अभी ${lo} के लिए ${p} की एक्सरसाइज़ नहीं मिली। किसी और हिस्से का बना दूँ?`,
    jaTemTudo: (p, d) => `आपके ${d} वाले वर्कआउट में ${p} की वे एक्सरसाइज़ पहले से हैं जो मैं डालता। बस वर्कआउट खोलिए और शुरू कीजिए।`,
    pronto: (n, d) => `हो गया, ${n} एक्सरसाइज़ आपके ${d} वाले वर्कआउट में आ गईं। शुरू करते समय वर्कआउट खोलिए — वज़न वहीं लिखिए।`,
    limiteGratis: 'इस हफ़्ते का छोटा वर्कआउट आप ले चुके हैं। Premium में मैं जितने चाहें उतने बना दूँगा — और पूरे हफ़्ते का प्लान भी। तब तक आप वर्कआउट में अपना खुद बना सकते हैं।',
  },
}
