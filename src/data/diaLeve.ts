import { Preferences } from '@capacitor/preferences'
import { avisarEstadoDoLife } from '@data/lifePausa'
import { passosRepository } from '@data/repositories/passosRepository'
import { dataLocalISO } from '@domain/rules/datas'
import { metaPassosLeve, type TreinoDiaLeve } from '@domain/rules/diaLeve'

/**
 * Dia leve de hoje (regras em domain/rules/diaLeve). Fica no aparelho e vale
 * até a meia-noite; a meta de passos do dia vai pro banco (passos_diarios.meta),
 * então a Home mostra a meta aliviada em qualquer lugar.
 */
const CHAVE = 'athoslife:dia-leve'
const EVENTO = 'athoslife:dia-leve'

interface Salvo {
  readonly dia: string
  readonly treino: TreinoDiaLeve
}

export async function diaLeveHoje(): Promise<TreinoDiaLeve | null> {
  try {
    const { value } = await Preferences.get({ key: CHAVE })
    const s = value ? (JSON.parse(value) as Salvo) : null
    return s?.dia === dataLocalISO() ? s.treino : null
  } catch {
    return null
  }
}

function avisar(): void {
  window.dispatchEvent(new Event(EVENTO))
  // Os lembretes se refazem (menos água hoje).
  avisarEstadoDoLife()
}

export function aoMudarDiaLeve(fn: () => void): () => void {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}

export async function ativarDiaLeve(treino: TreinoDiaLeve, metaPassos: number): Promise<void> {
  await Preferences.set({ key: CHAVE, value: JSON.stringify({ dia: dataLocalISO(), treino } satisfies Salvo) })
  await passosRepository.definirMetaDoDia(metaPassosLeve(metaPassos)).catch(() => {})
  avisar()
}

export async function trocarTreinoDiaLeve(treino: TreinoDiaLeve): Promise<void> {
  await Preferences.set({ key: CHAVE, value: JSON.stringify({ dia: dataLocalISO(), treino } satisfies Salvo) })
  avisar()
}

/** "Voltar ao normal": metas de sempre de novo. */
export async function desativarDiaLeve(metaPassos: number): Promise<void> {
  await Preferences.remove({ key: CHAVE }).catch(() => {})
  await passosRepository.definirMetaDoDia(metaPassos).catch(() => {})
  avisar()
}
