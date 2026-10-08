import { Preferences } from '@capacitor/preferences'
import { supabase } from '@data/supabase/client'
import { dataLocalISO } from '@domain/rules/datas'

/**
 * Pausa do Life (Life MVP, 08/10): a pessoa pausa o dia — pelo botão do
 * chat ou pedindo pro Life. Até o fim do dia: nenhum lembrete, check-in ou
 * mensagem que o Life puxe; ele só responde se ela chamar. No dia seguinte
 * volta sozinho. Sequências e metas ficam congeladas (dia pausado não quebra
 * nada — regra no banco e em habito.ts/conquistasRepository).
 *
 * Quem manda é o servidor (life_pausas, dia no fuso do perfil). A cópia
 * local serve pra cancelar os avisos na hora, mesmo sem rede.
 */
const CHAVE = 'athoslife:life-pausado-em'
const EVENTO = 'athoslife:pausa-life'

function avisar(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO))
}

/** Algo que muda o que o Life pode puxar mudou (ex.: "Life puxa conversa") — os avisos se refazem. */
export const avisarEstadoDoLife = avisar

export function aoMudarPausa(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}

/** Grava só no aparelho (o servidor já gravou — ex.: o Life pausou pelo chat). */
export async function marcarPausaLocal(): Promise<void> {
  await Preferences.set({ key: CHAVE, value: dataLocalISO() }).catch(() => {})
  avisar()
}

export async function pausarLifeHoje(): Promise<void> {
  const { error } = await supabase.rpc('pausar_life_hoje')
  if (error) throw error
  await marcarPausaLocal()
}

export async function retomarLifeHoje(): Promise<void> {
  const { error } = await supabase.rpc('retomar_life_hoje')
  if (error) throw error
  await Preferences.remove({ key: CHAVE }).catch(() => {})
  avisar()
}

async function pausadoLocal(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: CHAVE })
    return value === dataLocalISO()
  } catch {
    return false
  }
}

/** Pausado hoje? Local primeiro (rápido, sem rede); senão pergunta ao servidor. */
export async function lifePausadoHoje(): Promise<boolean> {
  if (await pausadoLocal()) return true
  const dias = await diasPausados(dataLocalISO())
  return dias.has(dataLocalISO())
}

/** Dias pausados a partir de `desdeISO`. Falha (sem rede, tabela ainda não criada) = nenhum. */
export async function diasPausados(desdeISO: string): Promise<Set<string>> {
  const { data: sessao } = await supabase.auth.getSession()
  const userId = sessao.session?.user.id
  if (!userId) return new Set()
  const { data, error } = await supabase
    .from('life_pausas')
    .select('dia')
    .eq('user_id', userId)
    .gte('dia', desdeISO)
    .returns<{ dia: string }[]>()
  if (error) return new Set()
  return new Set((data ?? []).map((d) => d.dia))
}

/** Última vez que a pessoa falou com o Life — check-in não toca colado numa conversa. */
const CHAVE_CONVERSA = 'athoslife:ultima-conversa-life'

export async function marcarConversaComLife(): Promise<void> {
  await Preferences.set({ key: CHAVE_CONVERSA, value: String(Date.now()) }).catch(() => {})
}

export async function ultimaConversaComLife(): Promise<Date | null> {
  try {
    const { value } = await Preferences.get({ key: CHAVE_CONVERSA })
    const ms = Number(value)
    return value && Number.isFinite(ms) ? new Date(ms) : null
  } catch {
    return null
  }
}
