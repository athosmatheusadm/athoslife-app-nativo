// ATHOSlife — peso pelo chat (v4.1): registrar pesagem, mudar a meta e ver o
// histórico pedindo ao Life. v4.2: corrigir ou apagar a última pesagem.
// v4.4: variação ("perdi 1 kg", "ganhei meio quilo") vira pesagem de hoje. Sem IA e sem cota: o card "Meu peso" não tem
// mais botões, então isso não pode custar mensagem. Parser puro exportado
// para teste; `executarComandoPeso` toca o banco.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type Sb = SupabaseClient
export type Idioma = 'pt-BR' | 'en' | 'es'

import { KG_MAX, KG_MIN, lerComandoPeso, type ComandoPeso } from '../_shared/pesoComando.ts'

// O leitor de frases mora em _shared: o app usa o mesmo sem internet.
export { lerComandoPeso, type ComandoPeso }

// ---------------------------------------------------------------- textos

const fmtKg = (kg: number, idioma: Idioma) =>
  kg.toLocaleString(idioma, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const fmtDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

const TXT = {
  'pt-BR': {
    confirmar: (kg: string) => `Quer que eu anote ${kg} kg como seu peso de hoje? Se sim, me diz "pesei ${kg} kg".`,
    anotado: (kg: string) => `Anotei ${kg} kg hoje.`,
    anterior: (kg: string, dia: string) => `Na pesagem anterior (${dia}) eram ${kg} kg.`,
    faltam: (kg: string, meta: string) => `Faltam ${kg} kg pra sua meta de ${meta} kg.`,
    chegou: (meta: string) => `Você está na sua meta de ${meta} kg. 🎉`,
    metaNova: (kg: string) => `Meta atualizada: ${kg} kg. Ela aparece como linha-guia no seu gráfico de peso.`,
    semHistorico: 'Você ainda não tem pesagens. Quando quiser, é só me contar: "pesei 80 kg".',
    historico: 'Suas últimas pesagens:',
    variacao: (kg: string, dias: number) => `Variação em ${dias} dias: ${kg} kg.`,
    falhou: 'Não consegui salvar agora. Tenta de novo daqui a pouco?',
    corrigido: (dia: string, de: string, para: string) => `Corrigi a pesagem de ${dia}: de ${de} kg para ${para} kg.`,
    apagado: (dia: string, kg: string) => `Apaguei a pesagem de ${dia} (${kg} kg).`,
    agoraUltima: (dia: string, kg: string) => `Agora a última é a de ${dia}: ${kg} kg.`,
    nadaPraMexer: 'Você ainda não tem pesagens pra mudar. Quando quiser, é só me contar: "pesei 80 kg".',
    semBase: 'Pra eu fazer a conta, me diz quanto você pesa hoje: "pesei 80 kg".',
  },
  en: {
    confirmar: (kg: string) => `Want me to log ${kg} kg as today's weight? If so, tell me "I weigh ${kg} kg".`,
    anotado: (kg: string) => `Logged ${kg} kg for today.`,
    anterior: (kg: string, dia: string) => `Your previous weigh-in (${dia}) was ${kg} kg.`,
    faltam: (kg: string, meta: string) => `${kg} kg to go to your ${meta} kg goal.`,
    chegou: (meta: string) => `You're at your ${meta} kg goal. 🎉`,
    metaNova: (kg: string) => `Goal updated: ${kg} kg. It shows as a guide line on your weight chart.`,
    semHistorico: 'You have no weigh-ins yet. Whenever you want, just tell me: "I weigh 80 kg".',
    historico: 'Your latest weigh-ins:',
    variacao: (kg: string, dias: number) => `Change over ${dias} days: ${kg} kg.`,
    falhou: "I couldn't save that right now. Try again in a bit?",
    corrigido: (dia: string, de: string, para: string) => `Fixed your ${dia} weigh-in: from ${de} kg to ${para} kg.`,
    apagado: (dia: string, kg: string) => `Deleted your ${dia} weigh-in (${kg} kg).`,
    agoraUltima: (dia: string, kg: string) => `Your latest is now ${dia}: ${kg} kg.`,
    nadaPraMexer: 'You have no weigh-ins to change yet. Whenever you want, just tell me: "I weigh 80 kg".',
    semBase: 'To do the math, tell me how much you weigh today: "I weigh 80 kg".',
  },
  es: {
    confirmar: (kg: string) => `¿Anoto ${kg} kg como tu peso de hoy? Si es así, dime "hoy peso ${kg} kg".`,
    anotado: (kg: string) => `Anoté ${kg} kg hoy.`,
    anterior: (kg: string, dia: string) => `En el pesaje anterior (${dia}) eran ${kg} kg.`,
    faltam: (kg: string, meta: string) => `Faltan ${kg} kg para tu meta de ${meta} kg.`,
    chegou: (meta: string) => `Estás en tu meta de ${meta} kg. 🎉`,
    metaNova: (kg: string) => `Meta actualizada: ${kg} kg. Aparece como línea guía en tu gráfico de peso.`,
    semHistorico: 'Aún no tienes pesajes. Cuando quieras, solo dime: "hoy peso 80 kg".',
    historico: 'Tus últimos pesajes:',
    variacao: (kg: string, dias: number) => `Variación en ${dias} días: ${kg} kg.`,
    falhou: 'No pude guardarlo ahora. ¿Lo intentas de nuevo en un rato?',
    corrigido: (dia: string, de: string, para: string) => `Corregí el pesaje del ${dia}: de ${de} kg a ${para} kg.`,
    apagado: (dia: string, kg: string) => `Borré el pesaje del ${dia} (${kg} kg).`,
    agoraUltima: (dia: string, kg: string) => `Ahora el último es el del ${dia}: ${kg} kg.`,
    nadaPraMexer: 'Aún no tienes pesajes para cambiar. Cuando quieras, solo dime: "hoy peso 80 kg".',
    semBase: 'Para hacer la cuenta, dime cuánto pesas hoy: "hoy peso 80 kg".',
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

  // Só o número: o app novo pergunta com botões; aqui (app antigo) pergunta em texto.
  if (cmd.tipo === 'confirmar') return { resposta: t.confirmar(fmtKg(cmd.kg, idioma)), mudou: false }

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

  if (cmd.tipo === 'corrigir' || cmd.tipo === 'apagar') {
    const { data: recentes } = await sb.from('registros_peso').select('data, peso_kg')
      .eq('user_id', userId).order('data', { ascending: false }).limit(2)
    const ultima = recentes?.[0]
    if (!ultima) return { resposta: t.nadaPraMexer, mudou: false }
    const dia = fmtDia(ultima.data)
    const antes = fmtKg(Number(ultima.peso_kg), idioma)

    if (cmd.tipo === 'corrigir') {
      const { error } = await sb.from('registros_peso').update({ peso_kg: cmd.kg })
        .eq('user_id', userId).eq('data', ultima.data)
      if (error) {
        console.error('[peso] corrigir falhou', error.message)
        return { resposta: t.falhou, mudou: false }
      }
      await sb.from('profiles').update({ peso_atual: cmd.kg }).eq('id', userId)
      const m = frasesMeta(cmd.kg, meta, idioma)
      return { resposta: [t.corrigido(dia, antes, fmtKg(cmd.kg, idioma)), m].filter(Boolean).join(' '), mudou: true }
    }

    const { error } = await sb.from('registros_peso').delete().eq('user_id', userId).eq('data', ultima.data)
    if (error) {
      console.error('[peso] apagar falhou', error.message)
      return { resposta: t.falhou, mudou: false }
    }
    const nova = recentes?.[1]
    // peso_atual acompanha a pesagem que sobrou; sem nenhuma, fica o que estava.
    if (nova) await sb.from('profiles').update({ peso_atual: Number(nova.peso_kg) }).eq('id', userId)
    const partes = [t.apagado(dia, antes)]
    if (nova) partes.push(t.agoraUltima(fmtDia(nova.data), fmtKg(Number(nova.peso_kg), idioma)))
    return { resposta: partes.join(' '), mudou: true }
  }

  let kg: number
  if (cmd.tipo === 'variar') {
    // Base = última pesagem (de qualquer dia); sem nenhuma, o peso do perfil.
    const { data: ultima } = await sb.from('registros_peso').select('peso_kg')
      .eq('user_id', userId).order('data', { ascending: false }).limit(1).maybeSingle()
    const base = ultima ? Number(ultima.peso_kg) : perfil?.peso_atual == null ? null : Number(perfil.peso_atual)
    if (base === null) return { resposta: t.semBase, mudou: false }
    kg = Math.round((base + cmd.deltaKg) * 10) / 10
    if (kg < KG_MIN || kg > KG_MAX) return { resposta: t.semBase, mudou: false }
  } else {
    kg = cmd.kg
  }

  const { data: anterior } = await sb.from('registros_peso').select('data, peso_kg')
    .eq('user_id', userId).lt('data', hoje).order('data', { ascending: false }).limit(1).maybeSingle()
  const { error } = await sb.from('registros_peso')
    .upsert({ user_id: userId, peso_kg: kg, data: hoje }, { onConflict: 'user_id,data' })
  if (error) {
    console.error('[peso] registrar falhou', error.message)
    return { resposta: t.falhou, mudou: false }
  }
  await sb.from('profiles').update({ peso_atual: kg }).eq('id', userId)
  const partes: string[] = [t.anotado(fmtKg(kg, idioma))]
  if (anterior) partes.push(t.anterior(fmtKg(Number(anterior.peso_kg), idioma), fmtDia(anterior.data)))
  const m = frasesMeta(kg, meta, idioma)
  if (m) partes.push(m)
  return { resposta: partes.join(' '), mudou: true }
}
