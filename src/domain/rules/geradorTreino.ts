import type { DiaSemana, ExercicioCatalogo, GrupoMuscular, LocalTreino, NivelTreino } from '@domain/entities/treino'

/**
 * Gerador do PLANO DE REFERÊNCIA de treino — regras em
 * docs/PLANOS_TREINO_DIETA_DIRETRIZ.md (seção 4). TypeScript puro e
 * determinístico: mesmas escolhas -> mesmo plano.
 *
 * Não inventa nada fora dos modelos abaixo: divisão por nº de dias, faixas
 * de séries/reps do ACSM e travas de volume. Carga NUNCA sai daqui — é a
 * pessoa quem anota. O servidor (RPC aplicar_plano_treino) confere tudo de
 * novo antes de gravar; validarPlanoTreino() é o mesmo conjunto de travas,
 * só pra avisar antes.
 */

export const VERSAO_GERADOR = 'treino-v1-2026-09-28'

export type ObjetivoTreino = 'hipertrofia' | 'condicionamento' | 'saude'

export interface ParametrosTreino {
  readonly objetivo: ObjetivoTreino
  readonly nivel: NivelTreino
  /** Dias escolhidos (2 a 6; iniciante até 4). */
  readonly dias: readonly DiaSemana[]
  readonly local: LocalTreino
  /** 30 a 90. */
  readonly minutos: number
}

export type TipoSessao =
  | 'corpo_inteiro_a'
  | 'corpo_inteiro_b'
  | 'superior_a'
  | 'superior_b'
  | 'inferior_a'
  | 'inferior_b'
  | 'empurrar'
  | 'puxar'
  | 'pernas'

export interface SeriePlanejada {
  readonly reps: number | null
  readonly segundos: number | null
}

export interface ItemPlano {
  readonly exercicio: ExercicioCatalogo
  readonly series: readonly SeriePlanejada[]
  /** Texto da faixa, ex. "8–12" ou "30 s". */
  readonly faixa: string
  readonly descansoSeg: number
}

export interface SessaoPlano {
  readonly dia: DiaSemana
  readonly tipo: TipoSessao
  readonly itens: readonly ItemPlano[]
}

export interface PlanoTreinoGerado {
  readonly parametros: ParametrosTreino
  readonly sessoes: readonly SessaoPlano[]
  readonly versao: string
}

// ---------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------

/** Subgrupo pra separar bíceps (puxar) de tríceps (empurrar). */
type Slot = GrupoMuscular | 'biceps' | 'triceps'

const MODELOS: Record<TipoSessao, readonly Slot[]> = {
  corpo_inteiro_a: ['pernas', 'peito', 'costas', 'ombro', 'gluteos', 'abdominal', 'biceps'],
  corpo_inteiro_b: ['pernas', 'costas', 'peito', 'ombro', 'pernas', 'triceps', 'abdominal'],
  superior_a: ['peito', 'costas', 'ombro', 'peito', 'costas', 'biceps', 'triceps'],
  superior_b: ['costas', 'peito', 'ombro', 'costas', 'triceps', 'biceps', 'abdominal'],
  inferior_a: ['pernas', 'pernas', 'gluteos', 'pernas', 'panturrilha', 'abdominal', 'lombar'],
  inferior_b: ['pernas', 'gluteos', 'pernas', 'panturrilha', 'pernas', 'abdominal', 'abdominal'],
  empurrar: ['peito', 'peito', 'ombro', 'ombro', 'triceps', 'triceps', 'abdominal'],
  puxar: ['costas', 'costas', 'costas', 'ombro', 'biceps', 'biceps', 'abdominal'],
  pernas: ['pernas', 'pernas', 'gluteos', 'pernas', 'panturrilha', 'lombar', 'abdominal'],
}

const DIVISAO: Record<number, readonly TipoSessao[]> = {
  2: ['corpo_inteiro_a', 'corpo_inteiro_b'],
  3: ['corpo_inteiro_a', 'corpo_inteiro_b', 'corpo_inteiro_a'],
  4: ['superior_a', 'inferior_a', 'superior_b', 'inferior_b'],
  5: ['superior_a', 'inferior_a', 'empurrar', 'puxar', 'pernas'],
  6: ['empurrar', 'puxar', 'pernas', 'empurrar', 'puxar', 'pernas'],
}

/** Grupo sem exercício no local (ex.: glúteo em casa) cai no substituto. */
const SUBSTITUTO: Partial<Record<Slot, Slot>> = {
  gluteos: 'pernas',
  panturrilha: 'pernas',
  lombar: 'abdominal',
  biceps: 'costas',
  triceps: 'peito',
}

/**
 * Ordem de preferência por grupo (composto antes de isolado). Nome fora da
 * lista entra depois, na ordem do catálogo; os de BAIXA_PRIORIDADE por último
 * (não são escolha natural pra "treino de costas/ombro").
 */
const PREFERIDOS: Partial<Record<Slot, readonly string[]>> = {
  pernas: ['Agachamento Livre com Barra', 'Leg Press 45°', 'Agachamento Goblet', 'Agachamento Hack', 'Afundo com Halteres', 'Stiff', 'Cadeira Extensora', 'Mesa Flexora', 'Passada Reversa', 'Agachamento Sumô com Halter', 'Step-up no Banco'],
  peito: ['Supino Reto com Barra', 'Supino Inclinado com Halteres', 'Flexão de Braço', 'Supino Máquina Convergente', 'Supino Articulado', 'Crucifixo Reto com Halteres', 'Crossover', 'Voador (Pec Deck)', 'Flexão Inclinada'],
  costas: ['Puxada Alta (Pulldown)', 'Remada Baixa no Cabo', 'Remada Unilateral com Halter (Serrote)', 'Barra Fixa', 'Remada Curvada com Barra', 'Remada Máquina Articulada', 'Pulldown Pegada Neutra', 'Puxada Articulada', 'Pullover com Halter'],
  ombro: ['Desenvolvimento com Halteres', 'Desenvolvimento na Máquina', 'Elevação Lateral com Halteres', 'Arnold Press', 'Crucifixo Invertido com Halteres', 'Face Pull', 'Elevação Lateral na Máquina'],
  gluteos: ['Elevação Pélvica', 'Glúteo na Máquina', 'Cadeira Abdutora', 'Glúteo na Polia (Coice)'],
  abdominal: ['Prancha Frontal', 'Abdominal Supra (Crunch)', 'Dead Bug', 'Abdominal Infra (Elevação de Pernas)', 'Abdominal Bicicleta', 'Prancha Lateral'],
  biceps: ['Rosca Direta com Barra', 'Rosca Alternada com Halteres', 'Rosca Martelo', 'Rosca Scott', 'Rosca Concentrada'],
  triceps: ['Tríceps na Polia', 'Tríceps Corda', 'Tríceps Francês', 'Tríceps Testa', 'Tríceps no Banco', 'Tríceps Coice com Halter'],
  panturrilha: ['Gêmeos em Pé', 'Gêmeos Sentados', 'Elevação de Panturrilha no Leg Press'],
  lombar: ['Extensão Lombar (Banco Romano)'],
}
const BAIXA_PRIORIDADE = new Set(["Farmer's Walk", 'Encolhimento com Halteres', 'Burpee', 'Mountain Climber', 'Remada Alta no Cabo'])

function prioridade(ex: ExercicioCatalogo, slot: Slot, indiceCatalogo: number): number {
  if (BAIXA_PRIORIDADE.has(ex.nomeBase)) return 10_000 + indiceCatalogo
  const i = PREFERIDOS[slot]?.indexOf(ex.nomeBase) ?? -1
  return i >= 0 ? i : 1_000 + indiceCatalogo
}

const RANK: Record<NivelTreino, number> = { iniciante: 1, intermediario: 2, avancado: 3 }

const ORDEM_SEMANA: readonly DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

export const TETO_SERIES_GRUPO: Record<NivelTreino, number> = { iniciante: 10, intermediario: 16, avancado: 20 }
export const MAX_EXERCICIOS_DIA: Record<NivelTreino, number> = { iniciante: 5, intermediario: 7, avancado: 7 }
export const MAX_DIAS: Record<NivelTreino, number> = { iniciante: 4, intermediario: 6, avancado: 6 }

function exerciciosPorTempo(minutos: number, nivel: NivelTreino): number {
  const n = minutos <= 30 ? 4 : minutos <= 45 ? 5 : minutos <= 60 ? 6 : 7
  return Math.min(n, MAX_EXERCICIOS_DIA[nivel])
}

function encaixa(ex: ExercicioCatalogo, slot: Slot): boolean {
  const nome = ex.nomeBase.toLowerCase()
  if (slot === 'biceps') return ex.grupoMuscular === 'bracos' && nome.includes('rosca')
  if (slot === 'triceps') return ex.grupoMuscular === 'bracos' && !nome.includes('rosca')
  return ex.grupoMuscular === slot
}

/** Faixas do ACSM (diretriz seção 4). Primeiro(s) exercício(s) do dia = principais. */
function prescricao(
  objetivo: ObjetivoTreino,
  nivel: NivelTreino,
  principal: boolean,
  porTempo: boolean,
): { series: number; reps: number; faixa: string; segundos: number; descanso: number } {
  const segundos = nivel === 'iniciante' ? 20 : nivel === 'intermediario' ? 30 : 45
  if (objetivo === 'hipertrofia') {
    const series =
      nivel === 'iniciante' ? (principal ? 3 : 2) : nivel === 'intermediario' ? 3 : principal ? 4 : 3
    const reps = nivel === 'iniciante' ? 12 : nivel === 'intermediario' ? 10 : 8
    const faixa = nivel === 'avancado' ? '6–12' : '8–12'
    return { series, reps, faixa: porTempo ? `${segundos} s` : faixa, segundos, descanso: nivel === 'avancado' ? 120 : 90 }
  }
  if (objetivo === 'condicionamento') {
    return {
      series: nivel === 'iniciante' ? 2 : 3,
      reps: nivel === 'iniciante' ? 15 : 12,
      faixa: porTempo ? `${segundos} s` : '12–15',
      segundos,
      descanso: 45,
    }
  }
  return { series: 2, reps: 12, faixa: porTempo ? `${segundos} s` : '10–15', segundos, descanso: 60 }
}

// ---------------------------------------------------------------
// Gerar
// ---------------------------------------------------------------

export function gerarPlanoTreino(p: ParametrosTreino, catalogo: readonly ExercicioCatalogo[]): PlanoTreinoGerado {
  const dias = ORDEM_SEMANA.filter((d) => p.dias.includes(d))
  const tipos = DIVISAO[dias.length] ?? DIVISAO[3] ?? []
  const n = exerciciosPorTempo(p.minutos, p.nivel)

  const indice = new Map(catalogo.map((ex, i) => [ex.id, i]))
  const disponiveis = catalogo.filter(
    (ex) => ex.ambientes.includes(p.local) && RANK[ex.nivelMinimo] <= RANK[p.nivel],
  )

  // Uso na semana: a sessão B pega exercícios diferentes da A quando dá.
  const usoSemana = new Map<string, number>()
  const seriesPorGrupo = new Map<GrupoMuscular, number>()

  const sessoes: SessaoPlano[] = dias.map((dia, i) => {
    const tipo = tipos[i] ?? 'corpo_inteiro_a'
    const slots = (MODELOS[tipo] ?? []).slice(0, n)
    const usadosHoje = new Set<string>()
    const itens: ItemPlano[] = []

    slots.forEach((slotOriginal, posicao) => {
      const candidatos = (slot: Slot) =>
        disponiveis
          .filter((ex) => encaixa(ex, slot) && !usadosHoje.has(ex.id))
          .sort(
            (a, b) =>
              (usoSemana.get(a.id) ?? 0) - (usoSemana.get(b.id) ?? 0) ||
              prioridade(a, slot, indice.get(a.id) ?? 0) - prioridade(b, slot, indice.get(b.id) ?? 0),
          )
      let lista = candidatos(slotOriginal)
      const sub = SUBSTITUTO[slotOriginal]
      if (lista.length === 0 && sub) lista = candidatos(sub)
      const ex = lista[0]
      if (!ex) return

      const porTempo = ex.medida === 'tempo'
      const pr = prescricao(p.objetivo, p.nivel, posicao < 2, porTempo)

      // Trava de volume semanal por grupo: corta séries, mas exercício com
      // 1 série só não vale a pena — nesse caso pula.
      const jaTem = seriesPorGrupo.get(ex.grupoMuscular) ?? 0
      const cabe = TETO_SERIES_GRUPO[p.nivel] - jaTem
      const series = Math.min(pr.series, cabe)
      if (series < Math.min(2, pr.series)) return

      usadosHoje.add(ex.id)
      usoSemana.set(ex.id, (usoSemana.get(ex.id) ?? 0) + 1)
      seriesPorGrupo.set(ex.grupoMuscular, jaTem + series)

      itens.push({
        exercicio: ex,
        series: Array.from({ length: series }, () => ({
          reps: porTempo ? null : pr.reps,
          segundos: porTempo ? pr.segundos : null,
        })),
        faixa: pr.faixa,
        descansoSeg: pr.descanso,
      })
    })

    return { dia, tipo, itens }
  })

  return { parametros: p, sessoes, versao: VERSAO_GERADOR }
}

// ---------------------------------------------------------------
// Travas (espelho do RPC aplicar_plano_treino)
// ---------------------------------------------------------------

export type ErroPlano =
  | 'dias'
  | 'dias_iniciante'
  | 'minutos'
  | 'vazio'
  | 'exercicio_local'
  | 'exercicio_nivel'
  | 'series'
  | 'reps'
  | 'segundos'
  | 'exercicios_por_dia'
  | 'volume_grupo'

export function validarParametros(p: ParametrosTreino): ErroPlano | null {
  const unicos = new Set(p.dias)
  if (unicos.size !== p.dias.length || p.dias.length < 2 || p.dias.length > 6) return 'dias'
  if (p.dias.length > MAX_DIAS[p.nivel]) return 'dias_iniciante'
  if (p.minutos < 30 || p.minutos > 90) return 'minutos'
  return null
}

export function validarPlanoTreino(plano: PlanoTreinoGerado): ErroPlano | null {
  const p = plano.parametros
  const erroParam = validarParametros(p)
  if (erroParam) return erroParam
  const itens = plano.sessoes.flatMap((s) => s.itens)
  if (itens.length === 0) return 'vazio'
  const porGrupo = new Map<GrupoMuscular, number>()
  for (const s of plano.sessoes) {
    if (s.itens.length > MAX_EXERCICIOS_DIA[p.nivel]) return 'exercicios_por_dia'
    for (const it of s.itens) {
      if (!it.exercicio.ambientes.includes(p.local)) return 'exercicio_local'
      if (RANK[it.exercicio.nivelMinimo] > RANK[p.nivel]) return 'exercicio_nivel'
      if (it.series.length < 1 || it.series.length > 5) return 'series'
      for (const se of it.series) {
        if (it.exercicio.medida === 'tempo') {
          if (!se.segundos || se.segundos < 10 || se.segundos > 120) return 'segundos'
        } else if (!se.reps || se.reps < 1 || se.reps > 20) return 'reps'
      }
      porGrupo.set(it.exercicio.grupoMuscular, (porGrupo.get(it.exercicio.grupoMuscular) ?? 0) + it.series.length)
    }
  }
  for (const total of porGrupo.values()) if (total > TETO_SERIES_GRUPO[p.nivel]) return 'volume_grupo'
  return null
}

/** Formato que o RPC aplicar_plano_treino espera. */
export function paraEnvio(plano: PlanoTreinoGerado) {
  return {
    p_local: plano.parametros.local,
    p_parametros: {
      objetivo: plano.parametros.objetivo,
      nivel: plano.parametros.nivel,
      dias: plano.sessoes.map((s) => s.dia),
      minutos: plano.parametros.minutos,
    },
    p_itens: plano.sessoes.flatMap((s) =>
      s.itens.map((it, ordem) => ({
        dia_semana: s.dia,
        exercicio_id: it.exercicio.id,
        ordem,
        series: it.series.map((se) => ({ reps: se.reps, segundos: se.segundos })),
      })),
    ),
    p_gerador_versao: plano.versao,
  }
}
