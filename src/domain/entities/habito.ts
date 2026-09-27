import { dataLocalISO } from '@domain/rules/datas'

/**
 * Domínio de hábitos.
 *
 * A tabela do banco se chama vicios_user, mas na INTERFACE o tom é sempre
 * ADULTO e SÉRIO — respeita o tamanho da luta, sem punir e sem amenizar.
 * O card usa o nome limpo ("Chocolate", "Fast Food"), nunca "vício em...".
 *
 * Princípio de voz: acolher NÃO é amenizar. Reconhece que é difícil,
 * afirma que passa, devolve o poder pra pessoa. Peso sem acusação.
 *
 * O número que importa é o STREAK. O tropeço se registra em ROXO (acolhe),
 * nunca vermelho (alarme). TypeScript puro, reusável por Android e iOS.
 *
 * O app é um acompanhador de hábitos do dia a dia, não uma ferramenta pra
 * vícios que depreciam a vida humana (álcool, cigarro) — fora de escopo
 * de propósito, por isso não têm categoria aqui.
 *
 * Dois TIPOS de hábito, mesma tabela: "evitar" (reduzir doce, fast food —
 * o fluxo original, com vontade/recaída) e "construir" (aumentar leitura,
 * por exemplo — sem tela de vontade, só "fiz hoje"). O tipo é inferido da
 * categoria (ver `tipoDaCategoria`), sem coluna nova no banco.
 */

export type IntensidadeHabito = 'leve' | 'medio' | 'forte'
export type StatusHabito = 'firme' | 'atencao'
export type TipoHabito = 'evitar' | 'construir'

export interface Habito {
  readonly id: string
  /** Nome limpo, sem peso: "Chocolate", "Fast Food". */
  readonly nome: string
  readonly emoji: string
  readonly categoria: string | null
  readonly tipo: TipoHabito
  readonly gatilhos: readonly string[]
  readonly horarioRisco: string | null
  readonly streakAtual: number
  readonly melhorStreak: number
  readonly totalRecaidas: number
  readonly ultimaRecaida: Date | null
  readonly proximaConquista: number
  /** Só relevante pro tipo "construir": já fez o check-in de hoje. */
  readonly feitoHoje: boolean
}

/** Categorias hoje classificadas como "hábito a construir" (aumentar). */
const CATEGORIAS_CONSTRUIR = new Set(['leitura'])

export function tipoDaCategoria(categoria: string | null): TipoHabito {
  return categoria !== null && CATEGORIAS_CONSTRUIR.has(categoria) ? 'construir' : 'evitar'
}

/**
 * Streak confiável, calculado a partir de datas — sem cron, sem contador
 * que possa dessincronizar. Ver db/athoslife_habitos_streak_confiavel_migration.sql.
 *
 * "Evitar" (ex. Doce): sucesso é implícito (ausência de recaída), então o
 * streak é sempre `hoje − a data mais recente entre criação e última
 * recaída` — nunca precisa de escrita pra crescer.
 */
export function streakEvitar(criadoEm: Date, ultimaRecaida: Date | null, hojeISO: string): number {
  const base = ultimaRecaida && ultimaRecaida > criadoEm ? ultimaRecaida : criadoEm
  const baseISO = dataLocalISO(base)
  return Math.max(0, diasEntre(baseISO, hojeISO))
}

/**
 * "Construir" (ex. Leitura): sucesso é explícito (check-in "Fiz hoje"), por
 * isso precisa de um contador (streak_atual) — mas ele se autocorrige na
 * leitura: se o último check-in não foi hoje nem ontem, o streak já quebrou
 * sozinho (sem precisar de job noturno pra "descobrir" isso).
 */
export function streakConstruir(streakAtual: number, ultimoCheckin: string | null, hojeISO: string): number {
  if (!ultimoCheckin) return 0
  const gap = diasEntre(ultimoCheckin, hojeISO)
  return gap <= 1 ? streakAtual : 0
}

function diasEntre(deISO: string, ateISO: string): number {
  const MS_POR_DIA = 86_400_000
  return Math.round((Date.parse(ateISO) - Date.parse(deISO)) / MS_POR_DIA)
}

/** "Atenção" é alerta sóbrio (streak recente, mais frágil), nunca punição. */
export function statusHabito(h: Pick<Habito, 'streakAtual'>): StatusHabito {
  return h.streakAtual <= 3 ? 'atencao' : 'firme'
}

/** Rótulo do selo. "Firme" tem força — palavra de peso, não de fofura. */
export function rotuloStatus(s: StatusHabito): string {
  return s === 'firme' ? 'Firme' : 'Momento de atenção'
}

export function progressoConquista(streak: number, meta: number): number {
  if (meta <= 0) return 0
  return Math.min(100, (streak / meta) * 100)
}

export function faltamParaConquista(streak: number, meta: number): number {
  return Math.max(0, meta - streak)
}

/**
 * Mensagem do assistente no momento da vontade.
 * Peso sem punição: reconhece que é forte (respeita), afirma que passa
 * (esperança concreta), faz um pedido firme (não implora).
 */
export function mensagemVontade(temHorarioRisco: boolean): string {
  const abertura = temHorarioRisco
    ? 'Essa vontade costuma vir nesse horário — e ela é real e forte, eu sei.'
    : 'Essa vontade é real e é forte, eu sei.'
  return `${abertura}\n\nMas ela passa. Me dá 10 minutos antes de decidir. Se ainda quiser depois, a gente encara junto.`
}

/**
 * Alternativas concretas por categoria, pro caminho "Quero uma alternativa".
 * Regra fixa (burra), sem IA — mesma disciplina de mensagemVontade: nada
 * inventado na hora, só conteúdo já pensado com calma.
 */
const ALTERNATIVAS_POR_CATEGORIA: Record<string, readonly string[]> = {
  doce: [
    'Banana com pasta de amendoim — resolve o doce e ainda tem proteína',
    'Chá de canela com mel — ajuda a segurar a vontade de açúcar',
    '2 quadradinhos de chocolate 70% — se precisar mesmo, esse não quebra o ritmo',
  ],
  fast_food: [
    'Um lanche rápido em casa — ovo, pão integral, queijo',
    'Um copo de água antes — parte da fome é sede disfarçada',
    'Se for sair mesmo, escolhe o item mais leve do cardápio',
  ],
  refrigerante: [
    'Água com gás e limão — o gás sem o açúcar',
    'Chá gelado sem açúcar',
    'Um suco natural bem diluído',
  ],
}

const ALTERNATIVAS_PADRAO: readonly string[] = [
  'Bebe um copo de água e espera uns 5 minutos',
  'Levanta, anda um pouco, muda de ambiente',
  'Manda mensagem pra alguém de confiança contando que tá difícil agora',
]

export function alternativasPara(categoria: string | null): readonly string[] {
  const especifica = categoria ? ALTERNATIVAS_POR_CATEGORIA[categoria] : undefined
  if (especifica) return especifica
  return ALTERNATIVAS_PADRAO
}

/**
 * "Termômetro" do Life: nível agregado de bem-estar do usuário nos hábitos,
 * 0 (preocupante, roxo) a 100 (tranquilo, verde). Usa só o streak — que já
 * zera sozinho numa recaída (ver habitosRepository) — sem inventar peso novo.
 * 14 dias (mesmo marco de proximaConquista) conta como "tranquilo total".
 */
export function nivelBemEstar(habitos: readonly Habito[]): number {
  if (habitos.length === 0) return 100
  const soma = habitos.reduce((acc, h) => acc + Math.min(100, (h.streakAtual / 14) * 100), 0)
  return Math.round(soma / habitos.length)
}

const VERDE_TRANQUILO = { r: 0x22, g: 0xc5, b: 0x5e } // brand
const ROXO_PREOCUPANTE = { r: 0x8b, g: 0x5c, b: 0xf6 } // accent-recaida

/** Interpola verde↔roxo pelo nível — mesma paleta que já rege a recaída. */
export function corTermometro(nivel: number): string {
  const t = Math.min(100, Math.max(0, nivel)) / 100
  const r = Math.round(ROXO_PREOCUPANTE.r + (VERDE_TRANQUILO.r - ROXO_PREOCUPANTE.r) * t)
  const g = Math.round(ROXO_PREOCUPANTE.g + (VERDE_TRANQUILO.g - ROXO_PREOCUPANTE.g) * t)
  const b = Math.round(ROXO_PREOCUPANTE.b + (VERDE_TRANQUILO.b - ROXO_PREOCUPANTE.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

/** Frase curta e verdadeira (calculada, não gerada) pro card do Life sem insight de IA ainda. */
export function mensagemTermometro(nivel: number): string {
  if (nivel >= 80) return 'Você está bem — seus streaks estão firmes.'
  if (nivel >= 50) return 'No caminho certo. Segue assim.'
  if (nivel >= 20) return 'Momento de atenção em algum hábito seu.'
  return 'Foi um período difícil. Toque aqui se quiser conversar.'
}

/**
 * Mensagem no momento do tropeço.
 * Trata como o que foi (difícil), não minimiza, devolve o poder:
 * o streak que passou continua sendo conquista da pessoa.
 */
export function mensagemTropeco(melhorStreak: number): string {
  if (melhorStreak >= 7) {
    return `Foi difícil hoje. Isso não apaga os ${melhorStreak} dias que você aguentou — eles continuam sendo seus.`
  }
  return 'Foi difícil hoje, e tudo bem admitir. Amanhã você tem uma nova chance de recomeçar.'
}
