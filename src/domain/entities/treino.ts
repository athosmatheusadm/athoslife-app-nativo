/**
 * Domínio de treino v3 — Local → Dia da semana → Exercícios do dia.
 *
 * O usuário escolhe o LOCAL (casa/academia) e o DIA DA SEMANA (tira Seg..Dom,
 * "Hoje" destacado no dia atual), e vê/edita os exercícios daquele dia+local.
 * Cada exercício vem do catálogo curado (ExercicioCatalogo, conteúdo
 * compartilhado com foto/instruções) e o usuário anota séries/reps por cima
 * (ExercicioPlano, pessoal). Substitui o modelo anterior de "Treino nomeado"
 * (Treino A/B/C por grupo muscular) — ver db/athoslife_treinos_catalogo_v3.sql.
 */

export type LocalTreino = 'casa' | 'academia'
export type DiaSemana = 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'
export type GrupoMuscular =
  | 'peito'
  | 'costas'
  | 'ombro'
  | 'pernas'
  | 'gluteos'
  | 'panturrilha'
  | 'lombar'
  | 'bracos'
  | 'abdominal'

export const LOCAIS: ReadonlyArray<{ id: LocalTreino; rotulo: string; icone: string }> = [
  { id: 'casa', rotulo: 'Em casa', icone: 'corpo' },
  { id: 'academia', rotulo: 'Academia', icone: 'peito' },
]

export const DIAS_SEMANA: ReadonlyArray<{ id: DiaSemana; rotulo: string }> = [
  { id: 'seg', rotulo: 'Seg' },
  { id: 'ter', rotulo: 'Ter' },
  { id: 'qua', rotulo: 'Qua' },
  { id: 'qui', rotulo: 'Qui' },
  { id: 'sex', rotulo: 'Sex' },
  { id: 'sab', rotulo: 'Sáb' },
  { id: 'dom', rotulo: 'Dom' },
]

export const GRUPOS_MUSCULARES: ReadonlyArray<{ id: GrupoMuscular; rotulo: string }> = [
  { id: 'peito', rotulo: 'Peito' },
  { id: 'costas', rotulo: 'Costas' },
  { id: 'pernas', rotulo: 'Pernas' },
  { id: 'bracos', rotulo: 'Braços' },
  { id: 'ombro', rotulo: 'Ombro' },
  { id: 'gluteos', rotulo: 'Glúteos' },
  { id: 'panturrilha', rotulo: 'Panturrilha' },
  { id: 'lombar', rotulo: 'Lombar' },
  { id: 'abdominal', rotulo: 'Abdômen' },
]

/** Conteúdo curado do catálogo — igual pra todo mundo, não pertence a um usuário. */
export interface ExercicioCatalogo {
  readonly id: string
  readonly nome: string
  readonly grupoMuscular: GrupoMuscular
  readonly musculosTrabalhados: string | null
  readonly ambientes: readonly LocalTreino[]
  /** Ícone único do card (fechado/lista de busca). */
  readonly iconeUrl: string | null
  /** Imagem grande (diagrama + início + execução) — só na tela expandida. Fica pros 36 que só têm foto solta, sem prancha ainda. */
  readonly imagemUrl: string | null
  /** Prancha panorâmica (título+músculo/início/execução, mascote ATHOS) — 2026-09-24, cobre os 100. Prioridade sobre imagemUrl quando existe. */
  readonly pranchaUrl: string | null
  readonly comoExecutar: readonly string[]
  readonly seriesPadrao: number
  readonly repeticoesPadrao: number
  readonly dica: string | null
}

/** Uma série individual, com sua própria carga — editável no card expandido. */
export interface SerieDetalhe {
  readonly reps: number | null
  readonly cargaKg: number | null
}

/** Exercício do catálogo que o usuário colocou num (local, dia da semana). */
export interface ExercicioPlano {
  readonly id: string
  readonly exercicio: ExercicioCatalogo
  readonly local: LocalTreino
  readonly diaSemana: DiaSemana
  readonly series: readonly SerieDetalhe[]
  readonly ordem: number
  /** true quando foi marcado concluído hoje (compara `concluido_em` com a data de hoje). */
  readonly concluidoHoje: boolean
}

const ORDEM_DIA: readonly DiaSemana[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']

export function diaSemanaHoje(): DiaSemana {
  return ORDEM_DIA[new Date().getDay()] ?? 'dom'
}

/** Data de hoje em ISO (YYYY-MM-DD), pra comparar com `concluido_em`. */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Data (dia do mês) de cada dia da semana na semana atual, pra tira de dias.
 * DIAS_SEMANA está em ordem seg..dom (visual da tira) — o índice usado aqui
 * precisa seguir essa mesma ordem, não o getDay() nativo (que começa no
 * domingo=0), senão o cálculo de "quantos dias somar" erra o sentido pros
 * dias antes de hoje na semana (ex.: domingo apareceria como "ontem" em vez
 * do domingo que fecha a semana atual).
 */
export function dataDaSemana(dia: DiaSemana): number {
  const hoje = new Date()
  const idxHojeSeg0 = (hoje.getDay() + 6) % 7 // converte 0=dom..6=sab -> 0=seg..6=dom
  const idxAlvoSeg0 = DIAS_SEMANA.findIndex((d) => d.id === dia)
  const diff = idxAlvoSeg0 - idxHojeSeg0
  const data = new Date(hoje)
  data.setDate(hoje.getDate() + diff)
  return data.getDate()
}

export function rotuloDia(dia: DiaSemana): string {
  return DIAS_SEMANA.find((d) => d.id === dia)?.rotulo ?? dia
}

export function rotuloLocal(local: LocalTreino): string {
  return LOCAIS.find((l) => l.id === local)?.rotulo ?? local
}

/**
 * Recorte quadrado antigo (só a foto de execução) — mantido como fallback
 * pra quando um exercício ainda não tem `iconeUrl` dedicado.
 */
function imagemMiniatura(imagemUrl: string | null): string | null {
  if (!imagemUrl) return null
  return imagemUrl.replace(/\.jpg$/, '-thumb.jpg')
}

/**
 * Ícone do card fechado / lista de busca. Usa o ícone dedicado do exercício
 * quando existe; senão cai no recorte antigo da foto de execução, pra nunca
 * ficar sem imagem nenhuma. A imagem larga (diagrama+início+execução) fica
 * só pra tela expandida — ver `ExercicioCatalogo.imagemUrl`.
 */
export function iconeDoExercicio(exercicio: Pick<ExercicioCatalogo, 'iconeUrl' | 'imagemUrl'>): string | null {
  return exercicio.iconeUrl ?? imagemMiniatura(exercicio.imagemUrl)
}

export function rotuloGrupo(grupo: GrupoMuscular): string {
  return GRUPOS_MUSCULARES.find((g) => g.id === grupo)?.rotulo ?? grupo
}

export function resumoSeries(series: readonly SerieDetalhe[]): string {
  return series.length === 1 ? '1 série' : `${series.length} séries`
}

/** Série vazia (sem reps/carga preenchidos) — usada ao adicionar uma nova linha. */
export function serieVazia(): SerieDetalhe {
  return { reps: null, cargaKg: null }
}
