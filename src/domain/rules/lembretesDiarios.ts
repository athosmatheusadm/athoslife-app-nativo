import type { DiaSemana } from '@domain/entities/treino'

/**
 * Lembretes do dia (água, refeições, treino, pesagem) — Camada 1 de
 * docs/ATHOSlife_Notificacoes_Life.md: regra fixa, agendada no aparelho.
 *
 * Aviso local não roda código na hora de tocar, então não dá pra "olhar se
 * já bebeu água" naquele momento. Por isso o app agenda avisos AVULSOS pros
 * próximos dias e refaz a lista toda vez que abre ou que algo é registrado:
 * o que já foi feito hoje sai da lista de hoje. Esta função só calcula
 * QUANDO avisar; quem agenda é data/notifications/lembretesDiarios.ts.
 */

export type TipoRefeicaoLembrete = 'cafe' | 'almoco' | 'lanche' | 'jantar'
export type TipoLembrete = 'agua' | TipoRefeicaoLembrete | 'treino' | 'pesagem'

export interface ConfigLembretes {
  readonly ligado: boolean
  /** "HH:mm" — nada toca entre dormir e acordar. */
  readonly acordar: string
  readonly dormir: string
  readonly agua: { readonly ligado: boolean; readonly intervaloMin: number }
  readonly refeicoes: Readonly<Record<TipoRefeicaoLembrete, { readonly ligado: boolean; readonly hora: string }>>
  readonly treino: { readonly ligado: boolean; readonly hora: string }
  readonly pesagem: { readonly ligado: boolean; readonly dia: DiaSemana; readonly hora: string }
}

export const CONFIG_PADRAO: ConfigLembretes = {
  ligado: false,
  acordar: '07:00',
  dormir: '23:00',
  agua: { ligado: true, intervaloMin: 180 },
  refeicoes: {
    cafe: { ligado: true, hora: '08:00' },
    almoco: { ligado: true, hora: '12:30' },
    lanche: { ligado: true, hora: '16:00' },
    jantar: { ligado: true, hora: '20:00' },
  },
  treino: { ligado: true, hora: '18:00' },
  pesagem: { ligado: true, dia: 'seg', hora: '07:30' },
}

export const INTERVALOS_AGUA_MIN: readonly number[] = [60, 90, 120, 180]

/** Teto por dia — regra fixa, nunca a IA (doc das notificações, "Travas"). */
export const MAX_POR_DIA = 10
/** Quantos dias pra frente — o app refaz tudo ao abrir; se sumir, ainda avisa por uma semana. */
export const DIAS_A_FRENTE = 7
/** iOS guarda no máximo 64 avisos pendentes; sobra espaço pros de hábito. */
export const MAX_PENDENTES = 56
/** Água não toca colada em outro lembrete (vira barulho). */
const FOLGA_AGUA_MIN = 30

/** O que já foi feito HOJE (só hoje: os outros dias ainda não aconteceram). */
export interface FeitoHoje {
  readonly aguaMetaBatida: boolean
  readonly refeicoes: ReadonlySet<TipoRefeicaoLembrete>
  readonly treino: boolean
  /** Pesou nos últimos 3 dias — não precisa do lembrete desta semana. */
  readonly pesouRecente: boolean
}

export interface LembretePlanejado {
  readonly tipo: TipoLembrete
  readonly quando: Date
}

const ORDEM_DIA: readonly DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

/** "HH:mm" -> minutos desde a meia-noite, ou null se inválido. */
export function minutosDe(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Está acordado nesse minuto do dia? Aceita dormir depois da meia-noite (ex.: 01:00). */
export function dentroDoHorarioAcordado(min: number, acordar: number, dormir: number): boolean {
  if (acordar === dormir) return true
  return acordar < dormir ? min >= acordar && min < dormir : min >= acordar || min < dormir
}

/** Horários de água: a partir de acordar + intervalo, até 30 min antes de dormir. */
function horariosAgua(acordar: number, dormir: number, intervalo: number): number[] {
  const fim = (dormir <= acordar ? dormir + 24 * 60 : dormir) - FOLGA_AGUA_MIN
  const lista: number[] = []
  for (let t = acordar + intervalo; t <= fim; t += intervalo) lista.push(t % (24 * 60))
  return lista
}

function noDia(base: Date, minutos: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  d.setMinutes(minutos)
  return d
}

export function planejarLembretes(params: {
  readonly config: ConfigLembretes
  readonly feitoHoje: FeitoHoje
  /** Dias da semana com exercício na ficha (qualquer local). */
  readonly diasComTreino: ReadonlySet<DiaSemana>
  readonly agora: Date
}): LembretePlanejado[] {
  const { config, feitoHoje, diasComTreino, agora } = params
  if (!config.ligado) return []
  const acordar = minutosDe(config.acordar)
  const dormir = minutosDe(config.dormir)
  if (acordar === null || dormir === null) return []
  const acordado = (min: number) => dentroDoHorarioAcordado(min, acordar, dormir)

  const todos: LembretePlanejado[] = []
  for (let i = 0; i < DIAS_A_FRENTE; i++) {
    const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i)
    const hoje = i === 0
    const diaSemana = ORDEM_DIA[dia.getDay()] ?? 'dom'
    const fixos: { tipo: TipoLembrete; min: number }[] = []

    for (const tipo of ['cafe', 'almoco', 'lanche', 'jantar'] as const) {
      const r = config.refeicoes[tipo]
      const min = minutosDe(r.hora)
      if (!r.ligado || min === null || !acordado(min)) continue
      if (hoje && feitoHoje.refeicoes.has(tipo)) continue
      fixos.push({ tipo, min })
    }

    const minTreino = minutosDe(config.treino.hora)
    if (config.treino.ligado && minTreino !== null && acordado(minTreino) && diasComTreino.has(diaSemana)) {
      if (!(hoje && feitoHoje.treino)) fixos.push({ tipo: 'treino', min: minTreino })
    }

    const minPeso = minutosDe(config.pesagem.hora)
    if (config.pesagem.ligado && minPeso !== null && acordado(minPeso) && config.pesagem.dia === diaSemana) {
      // Pesou há pouco: pula só a desta semana (a próxima segue de pé).
      if (!(i < 3 && feitoHoje.pesouRecente)) fixos.push({ tipo: 'pesagem', min: minPeso })
    }

    const doDia: { tipo: TipoLembrete; min: number }[] = [...fixos]
    if (config.agua.ligado && !(hoje && feitoHoje.aguaMetaBatida)) {
      const vagas = MAX_POR_DIA - fixos.length
      const agua = horariosAgua(acordar, dormir, Math.max(30, config.agua.intervaloMin)).filter((m) =>
        fixos.every((f) => Math.abs(f.min - m) >= FOLGA_AGUA_MIN),
      )
      for (const min of agua.slice(0, Math.max(0, vagas))) doDia.push({ tipo: 'agua', min })
    }

    for (const l of doDia.slice(0, MAX_POR_DIA)) {
      // Depois da meia-noite (quem dorme tarde) pertence ao dia seguinte.
      const quando = noDia(dia, l.min < acordar && dormir < acordar ? l.min + 24 * 60 : l.min)
      if (quando.getTime() > agora.getTime() + 60_000) todos.push({ tipo: l.tipo, quando })
    }
  }

  return todos.sort((a, b) => a.quando.getTime() - b.quando.getTime()).slice(0, MAX_PENDENTES)
}

/** Junta o que veio salvo com o padrão (versão antiga ou campo faltando não quebra). */
export function normalizarConfig(bruto: unknown): ConfigLembretes {
  if (!bruto || typeof bruto !== 'object') return CONFIG_PADRAO
  const b = bruto as Partial<ConfigLembretes>
  const hora = (v: unknown, padrao: string) => (typeof v === 'string' && minutosDe(v) !== null ? v : padrao)
  const bool = (v: unknown, padrao: boolean) => (typeof v === 'boolean' ? v : padrao)
  const p = CONFIG_PADRAO
  const ref = (tipo: TipoRefeicaoLembrete) => ({
    ligado: bool(b.refeicoes?.[tipo]?.ligado, p.refeicoes[tipo].ligado),
    hora: hora(b.refeicoes?.[tipo]?.hora, p.refeicoes[tipo].hora),
  })
  const intervalo = Number(b.agua?.intervaloMin)
  return {
    ligado: bool(b.ligado, p.ligado),
    acordar: hora(b.acordar, p.acordar),
    dormir: hora(b.dormir, p.dormir),
    agua: {
      ligado: bool(b.agua?.ligado, p.agua.ligado),
      intervaloMin: INTERVALOS_AGUA_MIN.includes(intervalo) ? intervalo : p.agua.intervaloMin,
    },
    refeicoes: { cafe: ref('cafe'), almoco: ref('almoco'), lanche: ref('lanche'), jantar: ref('jantar') },
    treino: { ligado: bool(b.treino?.ligado, p.treino.ligado), hora: hora(b.treino?.hora, p.treino.hora) },
    pesagem: {
      ligado: bool(b.pesagem?.ligado, p.pesagem.ligado),
      dia: ORDEM_DIA.includes(b.pesagem?.dia as DiaSemana) ? (b.pesagem?.dia as DiaSemana) : p.pesagem.dia,
      hora: hora(b.pesagem?.hora, p.pesagem.hora),
    },
  }
}
