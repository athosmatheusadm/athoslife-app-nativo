// ================================================================
// Push do Life (09/11/2026, dono): QUANDO o Life pode chamar e POR QUÊ.
// Regra fixa, sem IA: a IA só escreve a frase depois que esta função
// decidiu que vale falar. Dia normal = nenhum motivo = custo zero.
//
// Travas (nunca a IA): até 2 por dia, 4 h entre um e outro, nada até 3 h
// depois de uma conversa, só no horário acordado e nos momentos que a
// pessoa liberou, nada no dia pausado nem depois de conversa sensível,
// e o motivo que a pessoa ignorou 3 vezes seguidas descansa 14 dias.
// ================================================================

export type MotivoPush = 'evento_hoje' | 'evento_amanha' | 'evento_ontem' | 'marco' | 'pesado' | 'risco' | 'sumiu'
export type Momento = 'manha' | 'meio_dia' | 'noite'

export const MAX_POR_DIA = 2
const ENTRE_ENVIOS_MS = 4 * 3_600_000
const DEPOIS_DE_CONVERSA_MS = 3 * 3_600_000
const IGNORADOS_PRA_DESCANSAR = 3
const DESCANSO_DIAS = 14
/** Push não aberto em 6 h conta como ignorado. */
const ABERTO_ATE_MS = 6 * 3_600_000

export const MARCOS = new Set([7, 14, 21, 30, 60, 90, 120, 180, 365])

export interface EnvioPassado {
  motivo: string
  criadoEm: string
  abertoEm: string | null
}

export interface DadosPush {
  agora: Date
  hoje: string
  /** Minutos desde a meia-noite, no fuso da pessoa. */
  minutoLocal: number
  acordar: number
  dormir: number
  momentos: readonly Momento[]
  pausadoHoje: boolean
  sinalSensivel: boolean
  ultimaConversa: Date | null
  /** Push dos últimos 14 dias, do mais novo pro mais velho. */
  envios: readonly EnvioPassado[]
  /** Motivos das iniciativas do Life (push e cartão da Home) dos últimos 14 dias. */
  iniciativas: readonly { motivo: string; dia: string }[]
  eventos: readonly { texto: string; data: string }[]
  habitos: readonly { nome: string; dias: number }[]
  /** Horário de risco dos hábitos (minutos do dia), só com consentimento. */
  riscos: readonly { nome: string; minuto: number }[]
  agradavelUltimosDias: readonly { data: string; agradavel: number }[]
  ultimaAtividade: string | null
}

export interface Decisao {
  motivo: MotivoPush
  /** Chave gravada em life_iniciativas — o mesmo assunto não se repete. */
  chave: string
  /** Detalhe pra frase (evento, nome do hábito, dias). Nunca vai cru pra tela bloqueada. */
  detalhe?: { texto?: string; dias?: number; nome?: string }
}

export function diffDias(de: string, ate: string): number {
  return Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 86_400_000)
}

/** "HH:MM[:SS]" -> minutos, ou null. */
export function minutosDe(hora: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hora ?? '')
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  return h > 23 || min > 59 ? null : h * 60 + min
}

function acordado(min: number, acordar: number, dormir: number): boolean {
  if (acordar === dormir) return true
  return acordar < dormir ? min >= acordar && min < dormir : min >= acordar || min < dormir
}

/** Manhã até 12h, meio do dia até 17h, noite depois. */
export function momentoDe(min: number): Momento {
  return min < 12 * 60 ? 'manha' : min < 17 * 60 ? 'meio_dia' : 'noite'
}

function entre(min: number, de: number, ate: number): boolean {
  return min >= de && min < ate
}

/** Os últimos N push deste motivo foram todos ignorados? */
export function motivoDescansando(motivo: MotivoPush, envios: readonly EnvioPassado[], agora: Date): boolean {
  const desteMotivo = envios.filter((e) => e.motivo.split(':')[0] === motivo)
  const ultimos = desteMotivo.slice(0, IGNORADOS_PRA_DESCANSAR)
  if (ultimos.length < IGNORADOS_PRA_DESCANSAR) return false
  const ignorados = ultimos.every((e) => !e.abertoEm && agora.getTime() - Date.parse(e.criadoEm) > ABERTO_ATE_MS)
  if (!ignorados) return false
  return agora.getTime() - Date.parse(ultimos[0]!.criadoEm) < DESCANSO_DIAS * 86_400_000
}

/** As travas: se alguma falha, o Life fica quieto agora. */
export function podeFalarAgora(d: DadosPush): boolean {
  if (d.pausadoHoje || d.sinalSensivel || d.momentos.length === 0) return false
  // Nem colado no sono: até 1 h antes de dormir.
  if (!acordado(d.minutoLocal, d.acordar, d.dormir) || !acordado(d.minutoLocal + 60, d.acordar, d.dormir)) return false
  if (!d.momentos.includes(momentoDe(d.minutoLocal))) return false
  const t = d.agora.getTime()
  const hoje = d.envios.filter((e) => t - Date.parse(e.criadoEm) < 20 * 3_600_000)
  if (hoje.length >= MAX_POR_DIA) return false
  if (d.envios[0] && t - Date.parse(d.envios[0].criadoEm) < ENTRE_ENVIOS_MS) return false
  if (d.ultimaConversa && t - d.ultimaConversa.getTime() < DEPOIS_DE_CONVERSA_MS) return false
  return true
}

/**
 * Decide o motivo do push, em ordem de importância. Cada um tem a sua
 * janela no dia (fora dela espera a próxima volta do relógio) e o seu
 * tempo sem repetir.
 */
export function decidirPush(d: DadosPush): Decisao | null {
  if (!podeFalarAgora(d)) return null
  const min = d.minutoLocal
  const recente = (chave: string, dias: number) =>
    d.iniciativas.some((i) => i.motivo === chave.slice(0, 120) && diffDias(i.dia, d.hoje) < dias) ||
    d.envios.some((e) => e.motivo === chave.slice(0, 120) && d.agora.getTime() - Date.parse(e.criadoEm) < dias * 86_400_000)
  const livre = (motivo: MotivoPush, chave: string, dias: number) => !motivoDescansando(motivo, d.envios, d.agora) && !recente(chave, dias)

  // 1. Evento que a pessoa contou (prova, entrevista, viagem).
  const evHoje = d.eventos.find((e) => e.data === d.hoje)
  if (evHoje && entre(min, d.acordar + 60, d.acordar + 240) && livre('evento_hoje', `evento:${evHoje.texto}`, 2)) {
    return { motivo: 'evento_hoje', chave: `evento:${evHoje.texto}`, detalhe: { texto: evHoje.texto } }
  }
  const evAmanha = d.eventos.find((e) => diffDias(d.hoje, e.data) === 1)
  if (evAmanha && entre(min, 19 * 60, 21 * 60 + 30) && livre('evento_amanha', `evento:${evAmanha.texto}`, 2)) {
    return { motivo: 'evento_amanha', chave: `evento:${evAmanha.texto}`, detalhe: { texto: evAmanha.texto } }
  }
  const evOntem = d.eventos.find((e) => diffDias(e.data, d.hoje) === 1)
  if (evOntem && entre(min, 12 * 60, 20 * 60) && livre('evento_ontem', `depois:${evOntem.texto}`, 7)) {
    return { motivo: 'evento_ontem', chave: `depois:${evOntem.texto}`, detalhe: { texto: evOntem.texto } }
  }

  // 2. Horário de risco de um hábito: chega um pouco antes (15–45 min).
  for (const r of d.riscos) {
    if (entre(min, r.minuto - 45, r.minuto - 15) && livre('risco', `risco:${r.nome}`, 3)) {
      return { motivo: 'risco', chave: `risco:${r.nome}`, detalhe: { nome: r.nome } }
    }
  }

  // 3. Marco de hábito (7, 14, 21, 30… dias firme).
  const marco = d.habitos.find((h) => MARCOS.has(h.dias))
  if (marco && entre(min, 10 * 60, 20 * 60) && livre('marco', `marco:${marco.nome}:${marco.dias}`, 30)) {
    return { motivo: 'marco', chave: `marco:${marco.nome}:${marco.dias}`, detalhe: { nome: marco.nome, dias: marco.dias } }
  }

  // 4. Dias pesados: os 2+ últimos check-ins foram ruins.
  const pesados = new Set(d.agradavelUltimosDias.filter((c) => c.agradavel <= 2).map((c) => c.data))
  const comCheckin = new Set(d.agradavelUltimosDias.map((c) => c.data))
  if (comCheckin.size >= 2 && pesados.size === comCheckin.size && entre(min, 18 * 60, 21 * 60) && livre('pesado', 'pesado', 3)) {
    return { motivo: 'pesado', chave: 'pesado' }
  }

  // 5. Sumiu: 2+ dias sem registrar nada. Volta a chamar a cada 3 dias, e
  // depois de 3 chamadas sem resposta descansa (motivoDescansando).
  if (d.ultimaAtividade) {
    const dias = diffDias(d.ultimaAtividade, d.hoje)
    if (dias >= 2 && entre(min, 11 * 60, 20 * 60) && livre('sumiu', 'sumiu', 3)) {
      return { motivo: 'sumiu', chave: 'sumiu', detalhe: { dias } }
    }
  }
  return null
}
