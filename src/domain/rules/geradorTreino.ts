import type { DiaSemana, ExercicioCatalogo, GrupoMuscular, LocalTreino, NivelTreino } from '@domain/entities/treino'

/**
 * Gerador do PLANO DE REFERÊNCIA de treino — regras em
 * docs/PLANOS_TREINO_DIETA_DIRETRIZ.md (seção 4). TypeScript puro e
 * determinístico: mesmas escolhas -> mesmo plano.
 *
 * Não inventa nada fora dos modelos abaixo: divisão por nº de dias e travas
 * de volume. Séries e repetições saem como referência geral editável; carga
 * NUNCA sai daqui — é a pessoa quem define. O servidor (RPC aplicar_plano_treino) confere tudo de
 * novo antes de gravar; validarPlanoTreino() é o mesmo conjunto de travas,
 * só pra avisar antes.
 *
 * v2 (12/11/2026, pedido do dono — "o treino saiu genérico"):
 *  - FOCO: até 2 partes do corpo escolhidas no boneco ganham um exercício a
 *    mais nos dias em que cabem e vêm primeiro na sessão (grupos grandes).
 *  - VARIANTE: "ver outra opção" troca os exercícios escolhidos, mesmas regras.
 *  - Posterior de coxa tem lugar próprio nos dias de perna.
 *  - Séries/reps são REFERÊNCIA GERAL editável (faixa do ACSM); sem carga nem progressão.
 *  - O teto semanal por grupo é repartido entre os dias antes de montar
 *    (antes o último dia perdia exercício).
 * As travas (séries, reps, volume, nível, local) são as mesmas da v1.
 */

export const VERSAO_GERADOR = 'treino-v4-2026-11-12'

export type ObjetivoTreino = 'hipertrofia' | 'condicionamento' | 'saude'

/** Partes do corpo que dá pra priorizar (as do boneco). */
export type FocoTreino = Exclude<GrupoMuscular, 'lombar'>
export const FOCOS_TREINO: readonly FocoTreino[] = ['peito', 'costas', 'ombro', 'bracos', 'abdominal', 'pernas', 'gluteos', 'panturrilha']
export const MAX_FOCO = 2

export interface ParametrosTreino {
  /** Não muda mais o plano (era só pra séries/reps); o servidor ainda pede um valor. */
  readonly objetivo?: ObjetivoTreino
  readonly nivel: NivelTreino
  /** Dias escolhidos (2 a 6; iniciante até 4). */
  readonly dias: readonly DiaSemana[]
  readonly local: LocalTreino
  /** 30 a 90. */
  readonly minutos: number
  /** Até MAX_FOCO partes do corpo pra dar mais atenção. Vazio = equilibrado. */
  readonly foco?: readonly FocoTreino[]
  /** 0 = primeira opção; cada "ver outra opção" soma 1 e troca os exercícios. */
  readonly variante?: number
}

export type TipoSessao =
  | 'corpo_inteiro_a'
  | 'corpo_inteiro_b'
  | 'corpo_inteiro_c'
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
  /** Referência geral editável (faixa pública do ACSM); não é prescrição. */
  readonly series: readonly SeriePlanejada[]
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

/** Subgrupos: bíceps (puxar) x tríceps (empurrar), e posterior de coxa x resto da perna. */
type Slot = GrupoMuscular | 'biceps' | 'triceps' | 'posterior'

const MODELOS: Record<TipoSessao, readonly Slot[]> = {
  corpo_inteiro_a: ['pernas', 'peito', 'costas', 'ombro', 'gluteos', 'abdominal', 'biceps'],
  corpo_inteiro_b: ['pernas', 'costas', 'peito', 'ombro', 'posterior', 'triceps', 'abdominal'],
  corpo_inteiro_c: ['gluteos', 'peito', 'costas', 'pernas', 'ombro', 'abdominal', 'biceps'],
  superior_a: ['peito', 'costas', 'ombro', 'peito', 'costas', 'biceps', 'triceps'],
  superior_b: ['costas', 'peito', 'ombro', 'costas', 'triceps', 'biceps', 'abdominal'],
  inferior_a: ['pernas', 'posterior', 'gluteos', 'pernas', 'panturrilha', 'abdominal', 'lombar'],
  inferior_b: ['pernas', 'gluteos', 'posterior', 'pernas', 'panturrilha', 'abdominal', 'abdominal'],
  empurrar: ['peito', 'peito', 'ombro', 'ombro', 'triceps', 'triceps', 'abdominal'],
  puxar: ['costas', 'costas', 'costas', 'ombro', 'biceps', 'biceps', 'abdominal'],
  pernas: ['pernas', 'posterior', 'gluteos', 'pernas', 'panturrilha', 'lombar', 'abdominal'],
}

const DIVISAO: Record<number, readonly TipoSessao[]> = {
  2: ['corpo_inteiro_a', 'corpo_inteiro_b'],
  3: ['corpo_inteiro_a', 'corpo_inteiro_b', 'corpo_inteiro_c'],
  4: ['superior_a', 'inferior_a', 'superior_b', 'inferior_b'],
  5: ['empurrar', 'puxar', 'pernas', 'superior_b', 'inferior_b'],
  6: ['empurrar', 'puxar', 'pernas', 'empurrar', 'puxar', 'pernas'],
}

const TODOS: readonly GrupoMuscular[] = ['peito', 'costas', 'ombro', 'bracos', 'pernas', 'gluteos', 'panturrilha', 'abdominal', 'lombar']
const DE_CIMA: readonly GrupoMuscular[] = ['peito', 'costas', 'ombro', 'bracos', 'abdominal']
const DE_BAIXO: readonly GrupoMuscular[] = ['pernas', 'gluteos', 'panturrilha', 'abdominal']

/** Em que dias cada foco cabe (glúteo não entra no dia de peito). */
const TEMA: Record<TipoSessao, readonly GrupoMuscular[]> = {
  corpo_inteiro_a: TODOS,
  corpo_inteiro_b: TODOS,
  corpo_inteiro_c: TODOS,
  superior_a: DE_CIMA,
  superior_b: DE_CIMA,
  inferior_a: DE_BAIXO,
  inferior_b: DE_BAIXO,
  empurrar: ['peito', 'ombro', 'bracos', 'abdominal'],
  puxar: ['costas', 'ombro', 'bracos', 'abdominal'],
  pernas: DE_BAIXO,
}

/** Foco em grupo grande vem primeiro na sessão; os pequenos ficam onde estão (abdômen não vai antes do agachamento). */
const FOCO_VEM_PRIMEIRO: ReadonlySet<GrupoMuscular> = new Set(['peito', 'costas', 'ombro', 'pernas', 'gluteos'])
/** Fecham a sessão: mais repetições, descanso curto. */
const SLOTS_FINAIS: ReadonlySet<Slot> = new Set<Slot>(['abdominal', 'panturrilha', 'lombar'])
/** Quantos exercícios o foco tem nos dias em que cabe (iniciante fica em 2: o teto semanal dele é baixo). */
function exerciciosDoFoco(nivel: NivelTreino, n: number): number {
  return nivel === 'iniciante' || n < 6 ? 2 : 3
}
/** O foco nunca apaga a base do dia: sempre sobra pelo menos um exercício destes grupos. */
const BASE_DO_DIA: Record<TipoSessao, readonly GrupoMuscular[]> = {
  corpo_inteiro_a: ['pernas', 'peito', 'costas'],
  corpo_inteiro_b: ['pernas', 'peito', 'costas'],
  corpo_inteiro_c: ['pernas', 'peito', 'costas'],
  superior_a: ['peito', 'costas'],
  superior_b: ['peito', 'costas'],
  inferior_a: ['pernas'],
  inferior_b: ['pernas'],
  empurrar: ['peito'],
  puxar: ['costas'],
  pernas: ['pernas'],
}
/** Quem entra no lugar quando um grupo estoura o teto da semana. */
const REPOSICAO: readonly Slot[] = ['abdominal', 'ombro', 'costas', 'peito', 'biceps', 'triceps', 'panturrilha', 'gluteos', 'pernas']

/** Grupo sem exercício no local (ex.: glúteo em casa) cai no substituto. */
const SUBSTITUTO: Partial<Record<Slot, Slot>> = {
  gluteos: 'pernas',
  panturrilha: 'pernas',
  posterior: 'pernas',
  lombar: 'abdominal',
  biceps: 'costas',
  triceps: 'peito',
}

const POSTERIOR_DE_COXA: ReadonlySet<string> = new Set(['Stiff', 'Mesa Flexora', 'Cadeira Flexora', 'Levantamento Terra (Deadlift)', 'Flexão Nórdica'])

/**
 * Ordem de preferência por grupo (composto antes de isolado). Nome fora da
 * lista entra depois, na ordem do catálogo; os de BAIXA_PRIORIDADE por último
 * (não são escolha natural pra "treino de costas/ombro").
 */
const PREFERIDOS: Partial<Record<Slot, readonly string[]>> = {
  pernas: ['Agachamento Livre com Barra', 'Leg Press 45°', 'Agachamento Goblet', 'Agachamento Hack', 'Afundo com Halteres', 'Cadeira Extensora', 'Agachamento Búlgaro', 'Passada Reversa', 'Agachamento Sumô com Halter', 'Step-up no Banco'],
  posterior: ['Stiff', 'Mesa Flexora', 'Cadeira Flexora'],
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

function grupoDoSlot(slot: Slot): GrupoMuscular {
  if (slot === 'biceps' || slot === 'triceps') return 'bracos'
  if (slot === 'posterior') return 'pernas'
  return slot
}

function encaixa(ex: ExercicioCatalogo, slot: Slot): boolean {
  const nome = ex.nomeBase.toLowerCase()
  if (slot === 'biceps') return ex.grupoMuscular === 'bracos' && nome.includes('rosca')
  if (slot === 'triceps') return ex.grupoMuscular === 'bracos' && !nome.includes('rosca')
  if (slot === 'posterior') return ex.grupoMuscular === 'pernas' && POSTERIOR_DE_COXA.has(ex.nomeBase)
  if (slot === 'pernas') return ex.grupoMuscular === 'pernas' && !POSTERIOR_DE_COXA.has(ex.nomeBase)
  return ex.grupoMuscular === slot
}

/** Qual pedaço do grupo em foco entra como exercício a mais naquele dia. */
function slotDoFoco(grupo: GrupoMuscular, tipo: TipoSessao, jaTem: readonly Slot[]): Slot {
  if (grupo === 'bracos') {
    if (tipo === 'empurrar') return 'triceps'
    if (tipo === 'puxar') return 'biceps'
    return jaTem.filter((s) => s === 'biceps').length <= jaTem.filter((s) => s === 'triceps').length ? 'biceps' : 'triceps'
  }
  if (grupo === 'pernas') return jaTem.includes('posterior') ? 'pernas' : 'posterior'
  return grupo
}

/** Lugares da sessão com o foco: o exercício a mais entra no lugar do último que pode sair. */
function slotsComFoco(tipo: TipoSessao, n: number, foco: readonly GrupoMuscular[], nivel: NivelTreino): Slot[] {
  const slots = (MODELOS[tipo] ?? []).slice(0, n)
  const quantos = (g: GrupoMuscular) => slots.filter((s) => grupoDoSlot(s) === g).length
  for (const grupo of foco) {
    if (!TEMA[tipo].includes(grupo)) continue
    while (quantos(grupo) < exerciciosDoFoco(nivel, n)) {
      let alvo = -1
      for (let i = slots.length - 1; i >= 0; i--) {
        const g = grupoDoSlot(slots[i]!)
        if (foco.includes(g)) continue
        if (BASE_DO_DIA[tipo].includes(g) && quantos(g) <= 1) continue
        alvo = i
        break
      }
      if (alvo < 0) break
      slots[alvo] = slotDoFoco(grupo, tipo, slots)
    }
  }
  return slots
}

/** Foco em grupo grande vai pra frente (vira o exercício principal do dia). */
function ordenarPeloFoco(slots: readonly Slot[], foco: readonly GrupoMuscular[]): Slot[] {
  const naFrente = (s: Slot) => foco.includes(grupoDoSlot(s)) && FOCO_VEM_PRIMEIRO.has(grupoDoSlot(s))
  return [...slots.filter(naFrente), ...slots.filter((s) => !naFrente(s))]
}

/**
 * Semana inteira de lugares, já cabendo no teto de séries por grupo: se um
 * grupo tem lugares demais (mínimo de 2 séries cada), o excedente vira outro
 * grupo que ainda tem espaço — a sessão não encolhe.
 */
function planejarSemana(
  tipos: readonly TipoSessao[],
  n: number,
  foco: readonly GrupoMuscular[],
  nivel: NivelTreino,
  temExercicio: (slot: Slot) => boolean,
): Slot[][] {
  const efetivo = (slot: Slot): Slot | null => {
    if (temExercicio(slot)) return slot
    const sub = SUBSTITUTO[slot]
    return sub && temExercicio(sub) ? sub : null
  }
  const semana = tipos.map((tipo) => slotsComFoco(tipo, n, foco, nivel).map(efetivo).filter((s): s is Slot => s !== null))
  const maximo = Math.floor(TETO_SERIES_GRUPO[nivel] / 2)
  const naSemana = (g: GrupoMuscular) => semana.reduce((t, dia) => t + dia.filter((s) => grupoDoSlot(s) === g).length, 0)
  const noDia = (dia: readonly Slot[], g: GrupoMuscular) => dia.filter((s) => grupoDoSlot(s) === g).length

  for (const grupo of TODOS) {
    let voltas = 0
    while (naSemana(grupo) > maximo && voltas++ < 50) {
      // Tira do dia que mais tem o grupo (empate: o último dia), o último lugar dele.
      let d = -1
      semana.forEach((dia, i) => {
        if (noDia(dia, grupo) > 0 && (d < 0 || noDia(dia, grupo) >= noDia(semana[d]!, grupo))) d = i
      })
      if (d < 0) break
      const dia = semana[d]!
      const tipo = tipos[d]!
      let pos = -1
      dia.forEach((s, i) => {
        if (grupoDoSlot(s) === grupo) pos = i
      })
      const novo = REPOSICAO.map(efetivo).find(
        (s): s is Slot =>
          s !== null &&
          grupoDoSlot(s) !== grupo &&
          TEMA[tipo].includes(grupoDoSlot(s)) &&
          naSemana(grupoDoSlot(s)) < maximo &&
          noDia(dia, grupoDoSlot(s)) < 2,
      )
      if (novo) dia[pos] = novo
      else dia.splice(pos, 1)
    }
  }
  return semana.map((dia) => ordenarPeloFoco(dia, foco))
}

type Papel = 'principal' | 'acessorio' | 'final'

/**
 * REFERÊNCIA GERAL, não prescrição (dono, 12/11/2026 — aprovado depois de
 * tirar tudo): a ficha chega com séries e repetições dentro da faixa pública
 * do ACSM pra treino de força (diretriz seção 4), como ponto de partida
 * editável. O Life não fala esses números no chat e NADA aqui orienta carga
 * ou progressão. Sem pergunta de objetivo: vale a faixa geral 8–12.
 */
export const FAIXA_REFERENCIA_REPS = '8–12'

function referenciaGeral(nivel: NivelTreino, papel: Papel): { series: number; reps: number; segundos: number } {
  const principal = papel === 'principal'
  return {
    series: nivel === 'iniciante' ? (principal ? 3 : 2) : nivel === 'intermediario' ? 3 : principal ? 4 : 3,
    reps: nivel === 'iniciante' ? 12 : 10,
    segundos: nivel === 'iniciante' ? 20 : nivel === 'intermediario' ? 30 : 45,
  }
}

// ---------------------------------------------------------------
// Gerar
// ---------------------------------------------------------------

/** Até quantas opções "boas" de cada lugar a variante percorre. */
const OPCOES_POR_VARIANTE = 3

interface Escolha {
  readonly sessao: number
  readonly exercicio: ExercicioCatalogo
  readonly slot: Slot
  readonly papel: Papel
  series: number
}

export function gerarPlanoTreino(p: ParametrosTreino, catalogo: readonly ExercicioCatalogo[]): PlanoTreinoGerado {
  const dias = ORDEM_SEMANA.filter((d) => p.dias.includes(d))
  const tipos = DIVISAO[dias.length] ?? DIVISAO[3] ?? []
  const n = exerciciosPorTempo(p.minutos, p.nivel)
  const foco = [...new Set(p.foco ?? [])].slice(0, MAX_FOCO)
  const variante = Math.max(0, Math.floor(p.variante ?? 0))

  const indice = new Map(catalogo.map((ex, i) => [ex.id, i]))
  const disponiveis = catalogo.filter(
    (ex) => ex.ambientes.includes(p.local) && RANK[ex.nivelMinimo] <= RANK[p.nivel],
  )

  // 1) Lugares da semana (foco + teto por grupo), depois os exercícios.
  // Uso na semana: a sessão B pega diferentes da A quando dá.
  const semana = planejarSemana(
    dias.map((_, i) => tipos[i] ?? 'corpo_inteiro_a'),
    n,
    foco,
    p.nivel,
    (slot) => disponiveis.some((ex) => encaixa(ex, slot)),
  )
  const usoSemana = new Map<string, number>()
  const escolhas: Escolha[] = []
  dias.forEach((_, sessao) => {
    const usadosHoje = new Set<string>()
    ;(semana[sessao] ?? []).forEach((slotOriginal, posicao) => {
      // Exercício "quebra-galho" (farmer's walk, burpee...) só entra depois de repetir um bom.
      const candidatos = (slot: Slot) =>
        disponiveis
          .filter((ex) => encaixa(ex, slot) && !usadosHoje.has(ex.id))
          .sort(
            (a, b) =>
              Number(BAIXA_PRIORIDADE.has(a.nomeBase)) - Number(BAIXA_PRIORIDADE.has(b.nomeBase)) ||
              (usoSemana.get(a.id) ?? 0) - (usoSemana.get(b.id) ?? 0) ||
              prioridade(a, slot, indice.get(a.id) ?? 0) - prioridade(b, slot, indice.get(b.id) ?? 0),
          )
      let slot = slotOriginal
      let lista = candidatos(slot)
      const sub = SUBSTITUTO[slotOriginal]
      if (lista.length === 0 && sub) {
        slot = sub
        lista = candidatos(sub)
      }
      // Variante: anda entre as melhores opções ainda não usadas na semana.
      const frescos = lista.filter(
        (ex) => !BAIXA_PRIORIDADE.has(ex.nomeBase) && (usoSemana.get(ex.id) ?? 0) === (usoSemana.get(lista[0]?.id ?? '') ?? 0),
      )
      const ex = frescos[variante % Math.max(Math.min(frescos.length, OPCOES_POR_VARIANTE), 1)] ?? lista[0]
      if (!ex) return
      usadosHoje.add(ex.id)
      usoSemana.set(ex.id, (usoSemana.get(ex.id) ?? 0) + 1)
      const papel: Papel = SLOTS_FINAIS.has(slot) ? 'final' : posicao < 2 ? 'principal' : 'acessorio'
      escolhas.push({ sessao, exercicio: ex, slot, papel, series: referenciaGeral(p.nivel, papel).series })
    })
  })

  // 2) Reparte o teto semanal de séries por grupo (trava do servidor) ANTES
  // de montar: primeiro tira 1 série de quem tem mais de 2, de trás pra
  // frente; só se ainda passar, sai o último exercício do grupo.
  const fora = new Set<Escolha>()
  for (const grupo of new Set(escolhas.map((e) => e.exercicio.grupoMuscular))) {
    const doGrupo = () => escolhas.filter((e) => e.exercicio.grupoMuscular === grupo && !fora.has(e))
    const total = () => doGrupo().reduce((s, e) => s + e.series, 0)
    while (total() > TETO_SERIES_GRUPO[p.nivel]) {
      const lista = doGrupo()
      const cortavel = [...lista].reverse().find((e) => e.series > 2 && e.papel !== 'principal') ?? [...lista].reverse().find((e) => e.series > 2)
      if (cortavel) cortavel.series -= 1
      else {
        const ultimo = [...lista].reverse().find((e) => e.papel !== 'principal') ?? lista[lista.length - 1]
        if (!ultimo) break
        fora.add(ultimo)
      }
    }
  }

  // 3) Monta as sessões.
  const sessoes: SessaoPlano[] = dias.map((dia, sessao) => ({
    dia,
    tipo: tipos[sessao] ?? 'corpo_inteiro_a',
    itens: escolhas
      .filter((e) => e.sessao === sessao && !fora.has(e))
      .map((e) => {
        const porTempo = e.exercicio.medida === 'tempo'
        const pr = referenciaGeral(p.nivel, e.papel)
        return {
          exercicio: e.exercicio,
          series: Array.from({ length: e.series }, () => ({
            reps: porTempo ? null : pr.reps,
            segundos: porTempo ? pr.segundos : null,
          })),
        }
      }),
  }))

  return { parametros: { ...p, foco, variante }, sessoes, versao: VERSAO_GERADOR }
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
      objetivo: plano.parametros.objetivo ?? 'saude',
      nivel: plano.parametros.nivel,
      dias: plano.sessoes.map((s) => s.dia),
      minutos: plano.parametros.minutos,
      foco: plano.parametros.foco ?? [],
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
