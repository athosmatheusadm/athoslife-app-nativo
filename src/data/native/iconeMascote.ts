import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { dataLocalISO } from '@domain/rules/datas'

/**
 * Ícone do app que acompanha o dia (pacote "mascote-icone" do dono, 25/10):
 *
 *   1. Sono      → só se a pessoa cadastrou o horário de dormir/acordar
 *                  (Perfil > Notificações) E agora está dentro dele;
 *   2. Conquista → bateu a meta de calorias hoje OU desbloqueou uma
 *                  conquista hoje (vale até a meia-noite; o Life da Home
 *                  fica dourado junto — ver diaDeConquista);
 *   3. Normal    → todo o resto.
 *
 * Android: o plugin nativo `MascoteIcone` guarda os horários e troca sozinho,
 * inclusive com o app fechado (alarme no início/fim do sono e à meia-noite).
 * Com o app na tela ele espera o app sair — trocar ali pode fechar o app.
 * iOS ainda não tem projeto; no navegador não há ícone pra trocar.
 */

export type EstadoMascote = 'normal' | 'conquista' | 'sono'

/** "HH:MM" (24h). Pode atravessar a meia-noite, ex.: 23:00 → 07:00. */
export interface HorarioSono {
  inicio: string
  fim: string
}

export interface DadosMascote {
  sono: HorarioSono | null
  conquistaHoje: boolean
}

interface MascoteIconePlugin {
  sincronizar(opcoes: {
    sono: { inicio: number; fim: number } | null
    conquistaAte: number | null
  }): Promise<{ estado: EstadoMascote }>
}

const MascoteIcone = registerPlugin<MascoteIconePlugin>('MascoteIcone')

/** Mesma chave de lembretesDiarios.ts: só existe depois que a pessoa salvou os horários. */
const CHAVE_LEMBRETES = 'athoslife:lembretes-diarios'
const CHAVE_CONQUISTA = 'athos.icone.conquista'
/** Data (YYYY-MM-DD) em que a última conquista da galeria foi desbloqueada. */
const CHAVE_CONQUISTA_NOVA = 'athos.icone.conquistaNova'

/** Disparado quando o dia vira (ou deixa de ser) "dia de conquista". */
export const EVENTO_DIA_CONQUISTA = 'athos:dia-conquista'

/** "23:30" → 1410 (minutos desde a meia-noite); null se inválido. */
export function paraMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h > 23 || min > 59 ? null : h * 60 + min
}

export function estaNoHorarioDeSono(sono: HorarioSono, agora: Date = new Date()): boolean {
  const t = agora.getHours() * 60 + agora.getMinutes()
  const inicio = paraMinutos(sono.inicio)
  const fim = paraMinutos(sono.fim)
  if (inicio === null || fim === null || inicio === fim) return false
  return inicio < fim ? t >= inicio && t < fim : t >= inicio || t < fim
}

export function calcularEstado(dados: DadosMascote, agora: Date = new Date()): EstadoMascote {
  if (dados.sono && estaNoHorarioDeSono(dados.sono, agora)) return 'sono'
  if (dados.conquistaHoje) return 'conquista'
  return 'normal'
}

function proximaMeiaNoite(agora: Date): number {
  const d = new Date(agora)
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

async function horarioSonoCadastrado(): Promise<HorarioSono | null> {
  try {
    const { value } = await Preferences.get({ key: CHAVE_LEMBRETES })
    if (!value) return null
    const c = JSON.parse(value) as { acordar?: unknown; dormir?: unknown }
    if (typeof c.dormir !== 'string' || typeof c.acordar !== 'string') return null
    if (paraMinutos(c.dormir) === null || paraMinutos(c.acordar) === null) return null
    return { inicio: c.dormir, fim: c.acordar }
  } catch {
    return null
  }
}

function metaHoje(): boolean {
  try {
    return localStorage.getItem(CHAVE_CONQUISTA) === dataLocalISO()
  } catch {
    return false
  }
}

function conquistaNovaHoje(): boolean {
  try {
    return localStorage.getItem(CHAVE_CONQUISTA_NOVA) === dataLocalISO()
  } catch {
    return false
  }
}

/** Meta de calorias batida ou conquista desbloqueada hoje: Life dourado. */
export function diaDeConquista(): boolean {
  return metaHoje() || conquistaNovaHoje()
}

function avisarMudanca(): void {
  window.dispatchEvent(new Event(EVENTO_DIA_CONQUISTA))
  void atualizarIconeDoMascote()
}

let fila: Promise<unknown> = Promise.resolve()

async function aplicar(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return
  const sono = await horarioSonoCadastrado()
  const conquista = diaDeConquista()
  const ini = sono ? paraMinutos(sono.inicio) : null
  const fim = sono ? paraMinutos(sono.fim) : null
  await MascoteIcone.sincronizar({
    sono: ini !== null && fim !== null ? { inicio: ini, fim } : null,
    conquistaAte: conquista ? proximaMeiaNoite(new Date()) : null,
  })
}

/** Manda os dados atuais pro nativo (em fila: duas chamadas seguidas não brigam). */
export function atualizarIconeDoMascote(): Promise<void> {
  const execucao = fila.then(aplicar)
  fila = execucao.catch(() => undefined)
  return execucao.catch((e) => console.warn('[mascote] não foi possível atualizar o ícone', e))
}

/** Meta do dia batida (ou desfeita, se a pessoa apagou comida e saiu da faixa). */
export function marcarConquistaHoje(bateu: boolean): void {
  try {
    if (bateu === metaHoje()) return
    if (bateu) localStorage.setItem(CHAVE_CONQUISTA, dataLocalISO())
    else localStorage.removeItem(CHAVE_CONQUISTA)
  } catch {
    return
  }
  avisarMudanca()
}

/** Desbloqueou uma conquista da galeria (não se desfaz no mesmo dia). */
export function marcarConquistaDesbloqueadaHoje(): void {
  try {
    if (conquistaNovaHoje()) return
    localStorage.setItem(CHAVE_CONQUISTA_NOVA, dataLocalISO())
  } catch {
    return
  }
  avisarMudanca()
}
