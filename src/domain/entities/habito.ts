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
  readonly icone?: string | null
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
  readonly intensidade: IntensidadeHabito
  /** Dia (AAAA-MM-DD, local) em que começou a acompanhar. */
  readonly criadoEm: string
}

/** Vontade vencida (habitos_vontades) ou tropeço (recaidas), com dia e hora locais. */
export interface EventoHabito {
  readonly id: string
  readonly vicioId: string
  readonly tipo: 'vitoria' | 'tropeco'
  readonly data: string
  readonly horario: string | null
  readonly gatilho: string | null
  readonly alternativa: string | null
}

export type CaminhoVitoria = 'esperar' | 'alternativa' | 'passou'
export const GATILHOS = ['tedio', 'ansiedade', 'cansaco', 'fome', 'estresse', 'social', 'rotina'] as const
export type Gatilho = (typeof GATILHOS)[number]

/** Espera da vontade pela intensidade que a pessoa escolheu: leve 5, médio 10, forte 15 min. */
export function minutosDeEspera(intensidade: IntensidadeHabito): number {
  return intensidade === 'leve' ? 5 : intensidade === 'forte' ? 15 : 10
}

export type EstadoDia = 'antes' | 'firme' | 'venceu' | 'tropecou' | 'feito' | 'vazio'

function somarDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return dataLocalISO(d)
}

/**
 * Os últimos 7 dias do hábito, do mais antigo pra hoje. Evitar: tropeço >
 * vitória > firme. Construir: feito (pela sequência atual) ou tropeço.
 */
export function semanaDoHabito(
  h: Pick<Habito, 'id' | 'tipo' | 'criadoEm' | 'streakAtual' | 'feitoHoje'>,
  eventos: readonly EventoHabito[],
  hoje: string,
): { data: string; estado: EstadoDia }[] {
  const meus = eventos.filter((e) => e.vicioId === h.id)
  // Construir: a sequência atual termina hoje (se feito hoje) ou ontem.
  const fimSeq = h.feitoHoje ? hoje : somarDias(hoje, -1)
  const iniSeq = somarDias(fimSeq, -(h.streakAtual - 1))
  return Array.from({ length: 7 }, (_, i) => {
    const data = somarDias(hoje, i - 6)
    if (data < h.criadoEm) return { data, estado: 'antes' as const }
    const doDia = meus.filter((e) => e.data === data)
    if (doDia.some((e) => e.tipo === 'tropeco')) return { data, estado: 'tropecou' as const }
    if (h.tipo === 'construir') {
      const feito = h.streakAtual > 0 && data >= iniSeq && data <= fimSeq
      return { data, estado: feito ? ('feito' as const) : ('vazio' as const) }
    }
    if (doDia.some((e) => e.tipo === 'vitoria')) return { data, estado: 'venceu' as const }
    return { data, estado: 'firme' as const }
  })
}

export function vitoriasNaSemana(vicioId: string, eventos: readonly EventoHabito[], hoje: string): number {
  const desde = somarDias(hoje, -6)
  return eventos.filter((e) => e.vicioId === vicioId && e.tipo === 'vitoria' && e.data >= desde).length
}

export type Periodo = 'madrugada' | 'manha' | 'tarde' | 'noite'
function periodoDaHora(h: number): Periodo {
  return h < 6 ? 'madrugada' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite'
}

/**
 * O que o Life percebeu de verdade (sem frase inventada): o hábito de evitar
 * com mais registros em 30 dias, se tiver 3+; o período que mais aparece (só
 * se for metade ou mais dos registros) e o gatilho que se repete (2+).
 */
export function percepcaoHabitos(
  habitos: readonly Pick<Habito, 'id' | 'nome' | 'tipo'>[],
  eventos: readonly EventoHabito[],
  hoje: string,
): { habitoId: string; nome: string; periodo: Periodo; gatilho: string | null; vitorias: number } | null {
  const desde = somarDias(hoje, -29)
  let melhor: { h: Pick<Habito, 'id' | 'nome' | 'tipo'>; evs: EventoHabito[] } | null = null
  for (const h of habitos) {
    if (h.tipo !== 'evitar') continue
    const evs = eventos.filter((e) => e.vicioId === h.id && e.data >= desde)
    if (evs.length >= 3 && (!melhor || evs.length > melhor.evs.length)) melhor = { h, evs }
  }
  if (!melhor) return null
  const conta = <K extends string>(lista: K[]) => {
    const m = new Map<K, number>()
    lista.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? null
  }
  const horas = melhor.evs.flatMap((e) => (e.horario ? [periodoDaHora(Number(e.horario.slice(0, 2)))] : []))
  const per = conta(horas)
  if (!per || per[1] * 2 < horas.length) return null
  const gat = conta(melhor.evs.flatMap((e) => (e.gatilho ? [e.gatilho] : [])))
  return {
    habitoId: melhor.h.id,
    nome: melhor.h.nome,
    periodo: per[0],
    gatilho: gat && gat[1] >= 2 ? gat[0] : null,
    vitorias: vitoriasNaSemana(melhor.h.id, eventos, hoje),
  }
}

/** Categorias hoje classificadas como "hábito a construir" (aumentar). */
// Igual a ehConstruir (ai-proxy/life.ts) e public.categoria_construir (banco).
// 'construir' = "Outro" dentro de Construir (antes virava "evitar" ao recarregar).
const CATEGORIAS_CONSTRUIR = new Set(['leitura', 'sono', 'agua', 'meditar', 'caminhar', 'verduras', 'construir'])

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
 * sozinho (sem precisar de job noturno pra "descobrir" isso) — a não ser que
 * os dias do meio tenham sido pausados (mesma regra do registrar_checkin_habito).
 */
export function streakConstruir(
  streakAtual: number,
  ultimoCheckin: string | null,
  hojeISO: string,
  /** Dias com o Life pausado (08/10): congelam — não quebram a sequência. */
  pausados: ReadonlySet<string> = new Set(),
): number {
  if (!ultimoCheckin) return 0
  const gap = diasEntre(ultimoCheckin, hojeISO)
  if (gap <= 1) return streakAtual
  for (let i = 1; i < gap; i++) {
    const d = new Date(`${ultimoCheckin}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    if (!pausados.has(d.toISOString().slice(0, 10))) return 0
  }
  return streakAtual
}

function diasEntre(deISO: string, ateISO: string): number {
  const MS_POR_DIA = 86_400_000
  return Math.round((Date.parse(ateISO) - Date.parse(deISO)) / MS_POR_DIA)
}

/** "Atenção" é alerta sóbrio (streak recente, mais frágil), nunca punição. */
/**
 * Roxo é só para quem acabou de tropeçar (até 3 dias depois da recaída).
 * Hábito novo, sem recaída nenhuma, começa verde: começo não é recaída
 * (dono, 30/10 — o Life ficava roxo desde o 1º dia).
 */
export function statusHabito(h: Pick<Habito, 'streakAtual' | 'ultimaRecaida'>): StatusHabito {
  return h.ultimaRecaida !== null && h.streakAtual <= 3 ? 'atencao' : 'firme'
}

export function progressoConquista(streak: number, meta: number): number {
  if (meta <= 0) return 0
  return Math.min(100, (streak / meta) * 100)
}

export function faltamParaConquista(streak: number, meta: number): number {
  return Math.max(0, meta - streak)
}

// Textos da vontade (mensagem e alternativas) moram no i18n: m.habitos.vontade.

/**
 * "Termômetro" do Life: nível agregado de bem-estar do usuário nos hábitos,
 * 0 (preocupante, roxo) a 100 (tranquilo, verde). Usa só o streak — que já
 * zera sozinho numa recaída (ver habitosRepository) — sem inventar peso novo.
 * 14 dias depois da recaída (mesmo marco de proximaConquista) volta ao
 * "tranquilo total". Hábito sem recaída nenhuma conta como tranquilo: o
 * começo de um hábito não é motivo de preocupação.
 */
/**
 * Quanto de roxo cada tropeço recente põe no Life (dono, 09/11: "fica roxo
 * muito rápido quando falo que cedi"). Um tropeço sozinho dá só um toque;
 * o roxo cheio fica pra quem tropeçou 4+ vezes em 14 dias.
 */
const ROXO_POR_TROPECOS = [0, 30, 55, 75, 100] as const

export function nivelBemEstar(
  habitos: readonly Pick<Habito, 'id' | 'streakAtual' | 'ultimaRecaida'>[],
  eventos: readonly EventoHabito[] = [],
  hoje: string = new Date().toISOString().slice(0, 10),
): number {
  if (habitos.length === 0) return 100
  const desde = somarDias(hoje, -13)
  const soma = habitos.reduce((acc, h) => {
    if (h.ultimaRecaida === null || h.streakAtual >= 14) return acc + 100
    const tropecos = eventos.filter((e) => e.vicioId === h.id && e.tipo === 'tropeco' && e.data >= desde).length
    const roxo = ROXO_POR_TROPECOS[Math.min(Math.max(tropecos, 1), 4)]!
    // Volta ao verde aos poucos: 14 dias firme apagam o roxo todo.
    return acc + 100 - roxo * (1 - h.streakAtual / 14)
  }, 0)
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

/**
 * O ATHOSlife NÃO acompanha álcool, cigarro/nicotina, drogas, apostas nem
 * conteúdo sexual (decisão do dono, 2026-09-28): é dado sensível de
 * dependência / vida sexual e fora do escopo do produto (lista ampliada em
 * 2026-09-29). Espelho da função do banco
 * `habito_nome_proibido` (db/athoslife_habitos_proibidos_v2_migration.sql)
 * — quem manda é o servidor; aqui é só pra avisar antes de enviar.
 */
const TERMOS_PROIBIDOS = [
  // álcool
  'cerveja', 'cervejas', 'breja', 'chopp', 'chope', 'alcool', 'alcoolica', 'alcoolicas', 'alcoolico',
  'bebida alcoolica', 'bebidas alcoolicas', 'vinho', 'vinhos', 'vodka', 'vodca', 'whisky', 'whiskey', 'uisque',
  'cachaca', 'pinga', 'caipirinha', 'caipiroska', 'tequila', 'gin', 'rum', 'licor', 'espumante', 'champagne',
  'champanhe', 'sake', 'conhaque', 'absinto', 'cerveza', 'cervezas', 'vino', 'vinos', 'borrachera', 'beer',
  'beers', 'alcohol', 'alcoholic', 'wine', 'liquor', 'booze', 'drunk', 'bebado', 'bebada', 'embriagar',
  'ressaca', 'hangover', 'drinks', 'bebedeira', 'happy hour', 'cocktail', 'coquetel', 'open bar',
  'biere', 'bieres', 'vin', 'vins', 'pinard', 'alcoolise', 'alcoolisee', 'apero', 'aperitif', 'ivre',
  'soiree arrosee', 'daru', 'daaru', 'sharab', 'sharaab',
  // tabaco / nicotina
  'cigarro', 'cigarros', 'cigarrinho', 'fumar', 'fumo', 'fumando', 'fumante', 'tabagismo', 'tabaco',
  'nicotina', 'vape', 'vapes', 'vaper', 'cigarro eletronico', 'pod de nicotina', 'narguile', 'charuto',
  'charutos', 'palheiro', 'cigarrillo', 'cigarrillos', 'cigarette', 'cigarettes', 'smoking', 'smoke',
  'tobacco', 'cigar', 'cigars', 'hookah', 'shisha', 'juul', 'snus',
  'clope', 'clopes', 'tabac', 'fumer', 'cigare', 'cigares', 'chicha', 'bidi', 'beedi', 'gutka', 'gutkha',
  'khaini', 'paan masala', 'pan masala', 'zarda',
  // drogas e remédio controlado
  'maconha', 'cannabis', 'marijuana', 'marihuana', 'weed', 'thc', 'cbd', 'haxixe', 'hashish', 'skunk',
  'cocaina', 'cocaine', 'crack', 'droga', 'drogas', 'drug', 'drugs', 'entorpecente', 'entorpecentes',
  'estupefaciente', 'heroina', 'heroin', 'metanfetamina', 'meth', 'ecstasy', 'mdma', 'bala de festa', 'lsd',
  'cetamina', 'ketamine', 'lanca perfume', 'lolo', 'poppers', 'ayahuasca', 'psilocibina', 'cogumelo magico',
  'magic mushrooms', 'kratom', 'opioide', 'opioides', 'opioid', 'opioids', 'codeina', 'codeine', 'oxicodona',
  'oxycodone', 'fentanil', 'fentanyl', 'tramadol', 'anfetamina', 'anfetaminas', 'amphetamine', 'ritalina',
  'venvanse', 'adderall', 'rivotril', 'clonazepam', 'zolpidem', 'benzo', 'benzodiazepina', 'benzodiazepinico',
  'porro', 'porros',
  'drogue', 'drogues', 'beuh', 'shit', 'ganja', 'charas', 'afeem', 'afim', 'nasha',
  // apostas e jogos de azar
  'aposta', 'apostas', 'apostar', 'apostador', 'apuestas', 'bet', 'bets', 'betano', 'bet365', 'sportingbet',
  'sports betting', 'cassino', 'casino', 'gambling', 'jogo de azar', 'jogos de azar', 'juegos de azar',
  'jogo do bicho', 'tigrinho', 'fortune tiger', 'aviator', 'blaze', 'roleta', 'poker', 'poquer', 'slot',
  'slots', 'caca niquel', 'caca niqueis', 'loteria', 'loterias', 'mega sena', 'raspadinha', 'raspadinhas',
  'bingo',
  'pari', 'paris sportifs', 'jeux d argent', 'jeu d argent', 'roulette', 'loto', 'grattage', 'satta', 'juaa',
  'jua', 'teen patti', 'rummy', 'dream11',
  // conteúdo e vida sexual
  'pornografia', 'porno', 'porn', 'pornhub', 'xvideos', 'xxx', 'nsfw', 'hentai', 'onlyfans', 'putaria',
  'masturbacao', 'masturbar', 'masturbarse', 'masturbation', 'masturbate', 'punheta', 'siririca', 'nofap',
  'no fap', 'fap', 'sexo', 'sex', 'sexual', 'sexuais', 'sexting', 'nudes', 'nude', 'nudez', 'desnudo',
  'desnuda', 'erotico', 'erotica', 'fetiche', 'fetish', 'tesao', 'ejacular', 'ejaculacao', 'ejaculation',
  'retencao de semen', 'semen', 'prostituicao', 'prostituta', 'prostitution', 'garota de programa', 'camgirl',
  'orgia', 'tinder', 'grindr', 'viagra', 'sildenafila', 'tadalafila',
  'pornographie', 'sexe', 'branlette', 'prostituee',
]

/** Hindi: procurado em qualquer parte do nome (o devanágari não separa palavra como o latim). */
const TERMOS_PROIBIDOS_HI = [
  'शराब', 'दारू', 'दारु', 'बियर', 'बीयर', 'वाइन', 'व्हिस्की', 'वोदका',
  'सिगरेट', 'बीडी', 'तंबाकू', 'तम्बाकू', 'गुटखा', 'खैनी', 'पान मसाला', 'हुक्का', 'जर्दा',
  'गांजा', 'चरस', 'अफीम', 'ड्रग', 'नशा', 'कोकीन', 'हेरोइन',
  'जुआ', 'सट्टा', 'बेटिंग', 'कैसीनो', 'लॉटरी', 'लाटरी',
  'पोर्न', 'सेक्स', 'अश्लील', 'हस्तमैथुन', 'वेश्या',
]

function normalizarNome(t: string): string {
  return ` ${t
    .replace(/œ/gi, 'oe')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ\u093c]/g, '')
    .replace(/[^a-z0-9\u0900-\u097f]+/g, ' ')
    .trim()} `
}

export function habitoNomeProibido(nome: string): boolean {
  const n = normalizarNome(nome)
  return TERMOS_PROIBIDOS.some((t) => n.includes(` ${t} `)) || TERMOS_PROIBIDOS_HI.some((t) => n.includes(t))
}
