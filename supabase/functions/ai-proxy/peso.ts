// ATHOSlife — peso pelo chat (v4.1): registrar pesagem, mudar a meta e ver o
// histórico pedindo ao Life. Sem IA e sem cota: o card "Meu peso" não tem
// mais botões, então isso não pode custar mensagem. Parser puro exportado
// para teste; `executarComandoPeso` toca o banco.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type Sb = SupabaseClient
export type Idioma = 'pt-BR' | 'en' | 'es'

export type ComandoPeso =
  | { tipo: 'registrar'; kg: number }
  | { tipo: 'meta'; kg: number }
  | { tipo: 'historico' }

const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

const KG_MIN = 25
const KG_MAX = 350
const LB_POR_KG = 2.20462

// Número de peso (70, 80,5, 80.5) com unidade opcional logo depois.
const NUMERO = /(\d{2,3}(?:[.,]\d{1,2})?)\s*(kg|kgs|quilos?|kilos?|lbs?|libras?|pounds?)?(?![\d.,]*\s*(?:g\b|gramas?|grams?|gramos?|kcal|cal\b|ml|l\b|litros?|liters?|passos|steps|pasos|min|reps?|x\b|%))/

// Assunto que NÃO é o peso do corpo — "meta de 150 g de proteína" não muda a meta.
const OUTRO_ASSUNTO =
  /\b(proteina|protein|carbo\w*|gordura|fat|grasa|caloria\w*|calorie\w*|kcal|agua|water|litros?|passos|steps|pasos|carga|supino|agachamento|halter|barra|bench|squat|serie|series|sets?|reps?|repeticoes|sono|sleep|horas?|hours?)\b/

const REGISTRAR = [
  /\b(pesei|me pesei|to pesando|tou pesando|estou pesando|t[oô] com|estou com|pesando hoje)\b/,
  /\bmeu peso\b.{0,20}\b(hoje|agora|atual|e|eh|esta|ta|deu)\b/,
  /\b(registr\w*|anot\w*|salv\w*|coloc\w*|lanc\w*)\b.{0,15}\b(meu )?peso\b/,
  /\bpeso (de )?hoje\b/,
  /\bbalanca (deu|marcou|mostrou)\b/,
  /\b(i weigh|i weighed|weighed in at|weighed|my weight is|my weight today|log (my )?weight|record (my )?weight|scale (says|said|showed))\b/,
  /\b(me pese|peso hoy|hoy peso|mi peso (es|hoy|actual)|registr\w* (mi )?peso|anot\w* (mi )?peso|la bascula (marco|dio))\b/,
]

const META = [
  /\b(meta|objetivo|alvo)\b/,
  /\b(quero chegar|chegar (a|aos|em|nos)|quero pesar|quero ficar com)\b/,
  /\b(goal|target)\b/,
  /\b(want to (reach|get to|weigh))\b/,
  /\b(quiero llegar|llegar a|quiero pesar)\b/,
]

const HISTORICO = [
  /\b(historico|evolucao|pesagens|ultimas pesagens|quanto eu pesava|meus pesos)\b/,
  /\b(history|weigh-ins|past weights|weight log|weight progress|how much did i weigh)\b/,
  /\b(historial|evolucion|pesajes|cuanto pesaba)\b/,
]
const FALA_DE_PESO = /\b(peso|pesagens|pesava|pesos|pesei|pesando|balanca|weight|weigh|weighed|weigh-ins|scale|pesajes|pesaba|pese|bascula)\b/

function lerKg(m: RegExpMatchArray): number | null {
  const valor = Number(m[1].replace(',', '.'))
  if (!Number.isFinite(valor)) return null
  const lb = m[2] !== undefined && /^(lb|lbs|libra|libras|pound|pounds)$/.test(m[2])
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
  const numeros = [...t.matchAll(new RegExp(NUMERO.source, 'g'))]
  const numero = numeros[0]
  // Dois pesos na mesma frase ("pesei 80, meta 75"): ambíguo, vai pra IA.
  if (numeros.length > 1) return null

  if (numero && !OUTRO_ASSUNTO.test(t)) {
    const kg = lerKg(numero)
    const comUnidade = numero[2] !== undefined || FALA_DE_PESO.test(t)
    if (kg !== null) {
      // "minha meta é 75": meta só existe pro peso aqui (outros assuntos já saíram).
      if (META.some((r) => r.test(t))) return { tipo: 'meta', kg }
      if (comUnidade && REGISTRAR.some((r) => r.test(t))) return { tipo: 'registrar', kg }
    }
  }
  if (!numero && FALA_DE_PESO.test(t) && HISTORICO.some((r) => r.test(t))) return { tipo: 'historico' }
  return null
}

// ---------------------------------------------------------------- textos

const fmtKg = (kg: number, idioma: Idioma) =>
  kg.toLocaleString(idioma, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const fmtDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

const TXT = {
  'pt-BR': {
    anotado: (kg: string) => `Anotei ${kg} kg hoje.`,
    anterior: (kg: string, dia: string) => `Na pesagem anterior (${dia}) eram ${kg} kg.`,
    faltam: (kg: string, meta: string) => `Faltam ${kg} kg pra sua meta de ${meta} kg.`,
    chegou: (meta: string) => `Você está na sua meta de ${meta} kg. 🎉`,
    metaNova: (kg: string) => `Meta atualizada: ${kg} kg. Ela aparece como linha-guia no seu gráfico de peso.`,
    semHistorico: 'Você ainda não tem pesagens. Quando quiser, é só me contar: "pesei 80 kg".',
    historico: 'Suas últimas pesagens:',
    variacao: (kg: string, dias: number) => `Variação em ${dias} dias: ${kg} kg.`,
    falhou: 'Não consegui salvar agora. Tenta de novo daqui a pouco?',
  },
  en: {
    anotado: (kg: string) => `Logged ${kg} kg for today.`,
    anterior: (kg: string, dia: string) => `Your previous weigh-in (${dia}) was ${kg} kg.`,
    faltam: (kg: string, meta: string) => `${kg} kg to go to your ${meta} kg goal.`,
    chegou: (meta: string) => `You're at your ${meta} kg goal. 🎉`,
    metaNova: (kg: string) => `Goal updated: ${kg} kg. It shows as a guide line on your weight chart.`,
    semHistorico: 'You have no weigh-ins yet. Whenever you want, just tell me: "I weigh 80 kg".',
    historico: 'Your latest weigh-ins:',
    variacao: (kg: string, dias: number) => `Change over ${dias} days: ${kg} kg.`,
    falhou: "I couldn't save that right now. Try again in a bit?",
  },
  es: {
    anotado: (kg: string) => `Anoté ${kg} kg hoy.`,
    anterior: (kg: string, dia: string) => `En el pesaje anterior (${dia}) eran ${kg} kg.`,
    faltam: (kg: string, meta: string) => `Faltan ${kg} kg para tu meta de ${meta} kg.`,
    chegou: (meta: string) => `Estás en tu meta de ${meta} kg. 🎉`,
    metaNova: (kg: string) => `Meta actualizada: ${kg} kg. Aparece como línea guía en tu gráfico de peso.`,
    semHistorico: 'Aún no tienes pesajes. Cuando quieras, solo dime: "hoy peso 80 kg".',
    historico: 'Tus últimos pesajes:',
    variacao: (kg: string, dias: number) => `Variación en ${dias} días: ${kg} kg.`,
    falhou: 'No pude guardarlo ahora. ¿Lo intentas de nuevo en un rato?',
  },
} as const

function frasesMeta(atual: number, meta: number | null, idioma: Idioma): string {
  if (meta === null) return ''
  const t = TXT[idioma]
  const falta = Math.abs(atual - meta)
  return falta < 0.3 ? t.chegou(fmtKg(meta, idioma)) : t.faltam(fmtKg(falta, idioma), fmtKg(meta, idioma))
}

export function textoHistorico(pesagens: { data: string; peso_kg: number }[], idioma: Idioma): string {
  const t = TXT[idioma]
  if (pesagens.length === 0) return t.semHistorico
  const ultimas = pesagens.slice(-8)
  const linhas = ultimas.map((p) => `• ${fmtDia(p.data)} · ${fmtKg(Number(p.peso_kg), idioma)} kg`)
  let texto = `${t.historico}\n${linhas.join('\n')}`
  if (ultimas.length > 1) {
    const primeiro = ultimas[0], ultimo = ultimas[ultimas.length - 1]
    const dias = Math.round((Date.parse(ultimo.data) - Date.parse(primeiro.data)) / 86_400_000)
    const dif = Number(ultimo.peso_kg) - Number(primeiro.peso_kg)
    const sinal = dif > 0 ? '+' : dif < 0 ? '−' : ''
    if (dias > 0) texto += `\n${t.variacao(sinal + fmtKg(Math.abs(dif), idioma), dias)}`
  }
  return texto
}

// ---------------------------------------------------------------- banco

export interface ResultadoPeso {
  resposta: string
  /** true quando gravou algo — o app recarrega o card e o perfil. */
  mudou: boolean
}

export async function executarComandoPeso(
  sb: Sb, userId: string, cmd: ComandoPeso, idioma: Idioma, hoje: string,
): Promise<ResultadoPeso> {
  const t = TXT[idioma]
  const { data: perfil } = await sb.from('profiles').select('peso_meta, peso_atual, objetivo').eq('id', userId).maybeSingle()
  const meta = perfil?.peso_meta == null ? null : Number(perfil.peso_meta)

  if (cmd.tipo === 'historico') {
    const { data } = await sb.from('registros_peso').select('data, peso_kg')
      .eq('user_id', userId).order('data', { ascending: false }).limit(8)
    return { resposta: textoHistorico([...(data ?? [])].reverse(), idioma), mudou: false }
  }

  if (cmd.tipo === 'meta') {
    const atual = perfil?.peso_atual == null ? null : Number(perfil.peso_atual)
    // Sem objetivo ainda: deduz pela direção da meta (manter se for ~igual).
    const objetivo = perfil?.objetivo ?? (atual === null ? null
      : cmd.kg < atual - 0.5 ? 'emagrecer' : cmd.kg > atual + 0.5 ? 'massa' : 'manter')
    const { error } = await sb.from('profiles').update({ peso_meta: cmd.kg, objetivo }).eq('id', userId)
    if (error) {
      console.error('[peso] meta falhou', error.message)
      return { resposta: t.falhou, mudou: false }
    }
    const resto = atual === null ? '' : ' ' + frasesMeta(atual, cmd.kg, idioma)
    return { resposta: t.metaNova(fmtKg(cmd.kg, idioma)) + resto, mudou: true }
  }

  const { data: anterior } = await sb.from('registros_peso').select('data, peso_kg')
    .eq('user_id', userId).lt('data', hoje).order('data', { ascending: false }).limit(1).maybeSingle()
  const { error } = await sb.from('registros_peso')
    .upsert({ user_id: userId, peso_kg: cmd.kg, data: hoje }, { onConflict: 'user_id,data' })
  if (error) {
    console.error('[peso] registrar falhou', error.message)
    return { resposta: t.falhou, mudou: false }
  }
  await sb.from('profiles').update({ peso_atual: cmd.kg }).eq('id', userId)
  const partes: string[] = [t.anotado(fmtKg(cmd.kg, idioma))]
  if (anterior) partes.push(t.anterior(fmtKg(Number(anterior.peso_kg), idioma), fmtDia(anterior.data)))
  const m = frasesMeta(cmd.kg, meta, idioma)
  if (m) partes.push(m)
  return { resposta: partes.join(' '), mudou: true }
}
