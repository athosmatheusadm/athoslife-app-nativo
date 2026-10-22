import type {
  DiaSemana,
  ExercicioPlano,
  GrupoMuscular,
  LocalTreino,
  MedidaSerie,
} from './treino'
import { iconeDoExercicio } from './treino'
import { seriesLeves } from '@domain/rules/diaLeve'

/**
 * Sessão de "treino em andamento" — a fonte única de estado que alimenta a
 * tela do treino no app E a Live Activity (card na tela de bloqueio). Ver
 * `athoslife-live-activity-mockup.html` (contrato WorkoutSession).
 *
 * Tudo aqui é função pura sobre um objeto serializável: a sessão é salva no
 * aparelho a cada mudança e sobrevive ao app ir pro fundo ou ser fechado.
 * Tempos (descanso, cronômetro) são guardados como HORÁRIO DE TÉRMINO em ms,
 * nunca como "segundos restantes" — assim o relógio continua certo mesmo sem
 * nenhum código rodando, e o nativo consegue desenhar a contagem sozinho.
 */

export type StatusSessao =
  /** Pronto pra executar a série (reps: ajustar e confirmar; tempo: iniciar cronômetro). */
  | 'serie'
  /** Exercício por tempo com o cronômetro correndo. */
  | 'cronometro'
  /** Descanso entre séries (ou antes do próximo exercício). */
  | 'descanso'
  | 'concluida'

export interface SerieAlvo {
  readonly reps: number | null
  readonly cargaKg: number | null
  readonly segundos: number | null
}

export interface SerieFeita {
  readonly reps: number | null
  readonly cargaKg: number | null
  readonly segundos: number | null
  readonly feitaEm: number
}

export interface ExercicioSessao {
  readonly planoId: string
  readonly exercicioId: string
  readonly nome: string
  readonly iconeUrl: string | null
  readonly grupoMuscular: GrupoMuscular
  readonly medida: MedidaSerie
  readonly alvo: readonly SerieAlvo[]
  readonly feitas: readonly SerieFeita[]
}

export interface SessaoTreino {
  readonly versao: 1
  readonly local: LocalTreino
  readonly diaSemana: DiaSemana
  readonly iniciadoEm: number
  readonly exercicios: readonly ExercicioSessao[]
  /** Índice do exercício em foco. */
  readonly atual: number
  /** Valores da série em foco (os steppers mexem aqui). */
  readonly cargaKg: number | null
  readonly reps: number | null
  readonly segundos: number | null
  readonly status: StatusSessao
  readonly descansoFimEm: number | null
  readonly cronometroFimEm: number | null
  readonly cronometroInicioEm: number | null
  /** Prancha pausada: quando pausou (o relógio fica parado até retomar). Ausente = correndo. */
  readonly cronometroPausadoEm?: number | null
  /** Descanso padrão entre séries, em segundos. */
  readonly descansoSeg: number
  /** Dia leve (rules/diaLeve): séries e carga aliviadas; a ficha não muda ao salvar. */
  readonly leve?: boolean
}

export const DESCANSO_PADRAO_SEG = 90
export const PASSO_CARGA_KG = 2.5
export const PASSO_SEGUNDOS = 5
/** Contagem antes do exercício por tempo (prancha): dá tempo de se posicionar. */
export const PREPARO_SEG = 3

// ── criação ────────────────────────────────────────────────────────────────

export function criarSessao(params: {
  itens: readonly ExercicioPlano[]
  local: LocalTreino
  diaSemana: DiaSemana
  agora: number
  leve?: boolean
}): SessaoTreino {
  const exercicios: ExercicioSessao[] = params.itens.map((item) => {
    const porTempo = item.exercicio.medida === 'tempo'
    const series = params.leve ? seriesLeves(item.series) : item.series
    const alvo = (series.length > 0 ? series : [{ reps: null, cargaKg: null }]).map((s) => ({
      reps: porTempo ? null : s.reps ?? item.exercicio.repeticoesPadrao,
      cargaKg: s.cargaKg,
      segundos: porTempo ? s.segundos ?? item.exercicio.segundosPadrao ?? 30 : null,
    }))
    return {
      planoId: item.id,
      exercicioId: item.exercicio.id,
      nome: item.exercicio.nome,
      iconeUrl: iconeDoExercicio(item.exercicio),
      grupoMuscular: item.exercicio.grupoMuscular,
      medida: item.exercicio.medida,
      alvo,
      feitas: [],
    }
  })
  const base: SessaoTreino = {
    versao: 1,
    local: params.local,
    diaSemana: params.diaSemana,
    iniciadoEm: params.agora,
    exercicios,
    atual: 0,
    cargaKg: null,
    reps: null,
    segundos: null,
    status: exercicios.length > 0 ? 'serie' : 'concluida',
    descansoFimEm: null,
    cronometroFimEm: null,
    cronometroInicioEm: null,
    descansoSeg: DESCANSO_PADRAO_SEG,
    ...(params.leve ? { leve: true } : {}),
  }
  return carregarValores(base)
}

// ── leitura ────────────────────────────────────────────────────────────────

export function exercicioAtual(s: SessaoTreino): ExercicioSessao | null {
  return s.exercicios[s.atual] ?? null
}

/** Índice (0-based) da série em foco no exercício atual. */
export function indiceSerie(ex: ExercicioSessao): number {
  return Math.min(ex.feitas.length, ex.alvo.length - 1)
}

function exercicioCompleto(ex: ExercicioSessao): boolean {
  return ex.feitas.length >= ex.alvo.length
}

/** Segundos que faltam (arredondado pra cima) até um horário de término. */
export function segundosRestantes(fimEm: number | null, agora: number): number {
  if (fimEm === null) return 0
  return Math.max(0, Math.ceil((fimEm - agora) / 1000))
}

export function formatarRelogio(totalSeg: number): string {
  const seg = Math.max(0, Math.floor(totalSeg))
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatarCarga(kg: number | null): string {
  if (kg === null) return '—'
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',')
}

// ── transições ─────────────────────────────────────────────────────────────

/**
 * Preenche os steppers com a série em foco: a última carga/reps feita nesse
 * exercício tem prioridade sobre o alvo (quem subiu a carga na série 1
 * normalmente mantém na 2).
 */
function carregarValores(s: SessaoTreino): SessaoTreino {
  const ex = exercicioAtual(s)
  if (!ex) return s
  const alvo = ex.alvo[indiceSerie(ex)]
  const ultima = ex.feitas[ex.feitas.length - 1]
  return {
    ...s,
    cargaKg: ultima?.cargaKg ?? alvo?.cargaKg ?? null,
    reps: ex.medida === 'reps' ? alvo?.reps ?? ultima?.reps ?? null : null,
    segundos: ex.medida === 'tempo' ? alvo?.segundos ?? ultima?.segundos ?? 30 : null,
  }
}

export function ajustarCarga(s: SessaoTreino, delta: number): SessaoTreino {
  const atual = s.cargaKg ?? 0
  const nova = Math.max(0, Math.round((atual + delta) * 10) / 10)
  return { ...s, cargaKg: nova === 0 && delta < 0 ? null : nova }
}

export function ajustarReps(s: SessaoTreino, delta: number): SessaoTreino {
  return { ...s, reps: Math.max(0, (s.reps ?? 0) + delta) }
}

export function ajustarSegundos(s: SessaoTreino, delta: number): SessaoTreino {
  return { ...s, segundos: Math.max(PASSO_SEGUNDOS, (s.segundos ?? 30) + delta) }
}

export function iniciarCronometro(s: SessaoTreino, agora: number): SessaoTreino {
  if (s.status !== 'serie') return s
  const seg = s.segundos ?? 30
  // O cronômetro começa depois do preparo; até lá, `agora < cronometroInicioEm`.
  const inicio = agora + PREPARO_SEG * 1000
  return { ...s, status: 'cronometro', cronometroInicioEm: inicio, cronometroFimEm: inicio + seg * 1000 }
}

/** Ainda na contagem de preparo (3, 2, 1) antes do cronômetro valer. */
export function emPreparo(s: SessaoTreino, agora: number): boolean {
  return s.status === 'cronometro' && s.cronometroInicioEm !== null && agora < s.cronometroInicioEm
}

export const pausado = (s: SessaoTreino) => s.status === 'cronometro' && s.cronometroPausadoEm != null

/** Pausa a prancha (só depois do preparo). */
export function pausarCronometro(s: SessaoTreino, agora: number): SessaoTreino {
  if (s.status !== 'cronometro' || pausado(s) || emPreparo(s, agora)) return s
  return { ...s, cronometroPausadoEm: agora }
}

/** Retoma: empurra início e fim pelo tempo que ficou parado. */
export function retomarCronometro(s: SessaoTreino, agora: number): SessaoTreino {
  if (!pausado(s) || s.cronometroInicioEm === null || s.cronometroFimEm === null) return s
  const parado = agora - s.cronometroPausadoEm!
  return { ...s, cronometroPausadoEm: null, cronometroInicioEm: s.cronometroInicioEm + parado, cronometroFimEm: s.cronometroFimEm + parado }
}

/**
 * Registra a série em foco e decide o próximo passo:
 * mais séries -> descanso; acabou o exercício -> descanso e já aponta pro
 * próximo pendente; acabou tudo -> concluída.
 * Em exercício por tempo parado antes do fim, grava o tempo que durou.
 */
export function confirmarSerie(s: SessaoTreino, agora: number): SessaoTreino {
  const ex = exercicioAtual(s)
  if (!ex || s.status === 'concluida' || exercicioCompleto(ex)) return s

  let segundosFeitos = s.segundos
  if (ex.medida === 'tempo' && s.status === 'cronometro' && s.cronometroInicioEm !== null) {
    const ate = s.cronometroPausadoEm ?? agora
    const decorrido = Math.round((ate - s.cronometroInicioEm) / 1000)
    segundosFeitos = Math.min(s.segundos ?? decorrido, Math.max(decorrido, 1))
  }
  const feita: SerieFeita = {
    reps: ex.medida === 'reps' ? s.reps : null,
    cargaKg: s.cargaKg,
    segundos: ex.medida === 'tempo' ? segundosFeitos : null,
    feitaEm: agora,
  }
  const exercicios = s.exercicios.map((e, i) => (i === s.atual ? { ...e, feitas: [...e.feitas, feita] } : e))
  const depois: SessaoTreino = { ...s, exercicios, cronometroFimEm: null, cronometroInicioEm: null, cronometroPausadoEm: null }

  const atualizado = exercicios[s.atual]!
  let proximo = s.atual
  if (exercicioCompleto(atualizado)) {
    proximo = proximoPendente(exercicios, s.atual)
    if (proximo === -1) return { ...depois, status: 'concluida', descansoFimEm: null }
  }
  return carregarValores({
    ...depois,
    atual: proximo,
    status: 'descanso',
    descansoFimEm: agora + s.descansoSeg * 1000,
  })
}

function proximoPendente(exercicios: readonly ExercicioSessao[], aPartirDe: number): number {
  for (let passo = 1; passo <= exercicios.length; passo++) {
    const i = (aPartirDe + passo) % exercicios.length
    if (!exercicioCompleto(exercicios[i]!)) return i
  }
  return -1
}

export function adicionarDescanso(s: SessaoTreino, segundos: number, agora: number): SessaoTreino {
  if (s.status !== 'descanso' || s.descansoFimEm === null) return s
  return { ...s, descansoFimEm: Math.max(s.descansoFimEm, agora) + segundos * 1000 }
}

export function pularDescanso(s: SessaoTreino): SessaoTreino {
  if (s.status !== 'descanso') return s
  return { ...s, status: 'serie', descansoFimEm: null }
}

/** Cancela o cronômetro sem gravar a série (tocou sem querer). */
export function cancelarCronometro(s: SessaoTreino): SessaoTreino {
  if (s.status !== 'cronometro') return s
  return { ...s, status: 'serie', cronometroFimEm: null, cronometroInicioEm: null, cronometroPausadoEm: null }
}

/** Troca o exercício em foco (lista da sessão). Descanso em curso é mantido. */
export function irParaExercicio(s: SessaoTreino, indice: number): SessaoTreino {
  if (indice < 0 || indice >= s.exercicios.length || s.status === 'cronometro') return s
  const ex = s.exercicios[indice]!
  if (exercicioCompleto(ex)) return s
  return carregarValores({ ...s, atual: indice })
}

/**
 * Avança o relógio: descanso que acabou volta pra "serie"; cronômetro que
 * acabou grava a série sozinho. Devolve o MESMO objeto se nada mudou, pra
 * quem chama poder comparar por referência e não re-renderizar à toa.
 */
export function avancarRelogio(s: SessaoTreino, agora: number): SessaoTreino {
  if (s.status === 'descanso' && s.descansoFimEm !== null && agora >= s.descansoFimEm) {
    return { ...s, status: 'serie', descansoFimEm: null }
  }
  if (s.status === 'cronometro' && !pausado(s) && s.cronometroFimEm !== null && agora >= s.cronometroFimEm) {
    return confirmarSerie(s, s.cronometroFimEm)
  }
  return s
}

// ── resumo ─────────────────────────────────────────────────────────────────

export interface ResumoSessao {
  readonly duracaoMin: number
  readonly seriesFeitas: number
  readonly seriesTotal: number
  readonly exerciciosFeitos: number
  readonly exerciciosTotal: number
  /** Soma de carga × reps (kg). Exercício por tempo não entra. */
  readonly volumeKg: number
  readonly completo: boolean
}

export function resumirSessao(s: SessaoTreino, agora: number): ResumoSessao {
  const seriesFeitas = s.exercicios.reduce((n, e) => n + e.feitas.length, 0)
  const seriesTotal = s.exercicios.reduce((n, e) => n + e.alvo.length, 0)
  const volumeKg = s.exercicios.reduce(
    (v, e) => v + e.feitas.reduce((x, f) => x + (f.cargaKg ?? 0) * (f.reps ?? 0), 0),
    0,
  )
  return {
    duracaoMin: Math.max(1, Math.round((agora - s.iniciadoEm) / 60_000)),
    seriesFeitas,
    seriesTotal,
    exerciciosFeitos: s.exercicios.filter((e) => e.feitas.length > 0).length,
    exerciciosTotal: s.exercicios.length,
    volumeKg: Math.round(volumeKg),
    completo: s.exercicios.every(exercicioCompleto),
  }
}

/** Grupo muscular que mais apareceu (pro campo `grupo_muscular` do histórico). */
export function grupoPrincipal(s: SessaoTreino): GrupoMuscular | null {
  const contagem = new Map<GrupoMuscular, number>()
  for (const e of s.exercicios) contagem.set(e.grupoMuscular, (contagem.get(e.grupoMuscular) ?? 0) + 1)
  let melhor: GrupoMuscular | null = null
  let max = 0
  for (const [g, n] of contagem) {
    if (n > max) {
      melhor = g
      max = n
    }
  }
  return melhor
}

// ── Live Activity ──────────────────────────────────────────────────────────

/**
 * O que o card da tela de bloqueio precisa — contrato do mockup
 * (`WorkoutSession`), achatado. Horários em ms epoch: o nativo usa eles como
 * base do cronômetro e a contagem anda sem o app acordado.
 */
export interface EstadoLiveActivity {
  readonly nomeExercicio: string
  readonly serieAtual: number
  readonly totalSeries: number
  readonly medida: MedidaSerie
  readonly cargaKg: number | null
  readonly reps: number | null
  readonly segundos: number | null
  readonly status: StatusSessao
  readonly descansoFimEm: number | null
  readonly cronometroFimEm: number | null
  /** Fim do preparo de 3 s (o cronômetro vale a partir daqui). */
  readonly cronometroInicioEm: number | null
  /** Prancha pausada desde (ms epoch); null = correndo. */
  readonly cronometroPausadoEm: number | null
  /** Treino concluído: o card vira "Treino concluído" com o resumo. */
  readonly resumoSeries: number | null
  readonly resumoVolumeKg: number | null
  /** Nome do próximo exercício, pra mostrar no descanso. */
  readonly proximo: string | null
  /** Descanso padrão — o nativo usa se tocarem "confirmar" com o app dormindo. */
  readonly descansoSeg: number
}

export function paraLiveActivity(s: SessaoTreino, agora: number = Date.now()): EstadoLiveActivity | null {
  if (s.status === 'concluida') {
    // Tudo feito: o card fica com o resumo até a pessoa salvar no app.
    const r = resumirSessao(s, agora)
    return {
      nomeExercicio: '', serieAtual: 0, totalSeries: 0, medida: 'reps', cargaKg: null, reps: null, segundos: null,
      status: 'concluida', descansoFimEm: null, cronometroFimEm: null, cronometroInicioEm: null, cronometroPausadoEm: null,
      resumoSeries: r.seriesFeitas, resumoVolumeKg: r.volumeKg, proximo: null, descansoSeg: s.descansoSeg,
    }
  }
  const ex = exercicioAtual(s)
  if (!ex) return null
  return {
    nomeExercicio: ex.nome,
    serieAtual: indiceSerie(ex) + 1,
    totalSeries: ex.alvo.length,
    medida: ex.medida,
    cargaKg: s.cargaKg,
    reps: s.reps,
    segundos: s.segundos,
    status: s.status,
    descansoFimEm: s.descansoFimEm,
    cronometroFimEm: s.cronometroFimEm,
    cronometroInicioEm: s.cronometroInicioEm,
    cronometroPausadoEm: s.cronometroPausadoEm ?? null,
    resumoSeries: null,
    resumoVolumeKg: null,
    proximo: ex.feitas.length === 0 && s.status === 'descanso' ? ex.nome : null,
    descansoSeg: s.descansoSeg,
  }
}
