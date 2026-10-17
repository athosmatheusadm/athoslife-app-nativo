// ATHOSlife — Life adaptativo (v4.0): memória, padrões, jeito de falar,
// check-in v3 e mensagem de abertura. Funções puras exportadas para teste;
// as que tocam o banco recebem o cliente do Supabase.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type Sb = SupabaseClient
export type Idioma = 'pt-BR' | 'en' | 'es'

const norm = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// ================================================================
// MEMÓRIA
// O modelo marca no fim da resposta o que vale lembrar:
//   [[LEMBRAR: categoria | texto curto | AAAA-MM-DD (opcional)]]
//   [[ESQUECER: trecho]]
// O servidor tira as marcas do texto, filtra e grava. Mesmo padrão do [FORA].
// ================================================================
export const CATEGORIAS_MEMORIA = ['gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto'] as const
export type CategoriaMemoria = (typeof CATEGORIAS_MEMORIA)[number]

export interface Lembranca { categoria: CategoriaMemoria; texto: string; data: string | null }

const MARCA_LEMBRAR = /\[\[\s*LEMBRAR\s*:\s*([^\]|]+?)\s*\|\s*([^\]|]+?)\s*(?:\|\s*(\d{4}-\d{2}-\d{2})\s*)?\]\]/gi
const MARCA_ESQUECER = /\[\[\s*ESQUECER\s*:\s*([^\]]+?)\s*\]\]/gi
const MARCA_QUALQUER = /\[\[\s*(LEMBRAR|ESQUECER)\b[^\]]*\]\]/gi

export function extrairMarcasMemoria(resposta: string): { texto: string; lembrar: Lembranca[]; esquecer: string[] } {
  const lembrar: Lembranca[] = []
  const esquecer: string[] = []
  for (const m of resposta.matchAll(MARCA_LEMBRAR)) {
    const categoria = norm(m[1]) as CategoriaMemoria
    if (!CATEGORIAS_MEMORIA.includes(categoria)) continue
    const data = m[3] && !Number.isNaN(Date.parse(m[3])) ? m[3] : null
    lembrar.push({ categoria, texto: m[2].trim().slice(0, 200), data })
  }
  for (const m of resposta.matchAll(MARCA_ESQUECER)) esquecer.push(m[1].trim().slice(0, 120))
  const texto = resposta.replace(MARCA_QUALQUER, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { texto, lembrar: lembrar.slice(0, 2), esquecer: esquecer.slice(0, 2) }
}

// Nunca guardar: saúde mental e diagnósticos, remédios, sexualidade, religião,
// política, dinheiro detalhado, documentos, contato, endereço, crise.
const PROIBIDO_MEMORIA = new RegExp('\\b(' + [
  'depress\\w*', 'ansiedade generalizada', 'transtorno\\w*', 'bipolar\\w*', 'esquizofren\\w*', 'tdah', 'autis\\w*', 'borderline',
  'suicid\\w*', 'se matar', 'me matar', 'automutil\\w*', 'se cortar', 'me cortar', 'anorex\\w*', 'bulimi\\w*', 'compulsa\\w*',
  'diagnostic\\w*', 'psiquiatr\\w*', 'terapia', 'psicolog\\w*', 'remedio\\w*', 'medicament\\w*', 'antidepressiv\\w*', 'ansiolitic\\w*',
  'rivotril', 'fluoxetina', 'sertralina', 'ozempic', 'hiv', 'cancer', 'gravid\\w*', 'aborto',
  'gay', 'lesbica', 'bissexual', 'trans', 'sexo', 'sexual\\w*', 'religia\\w*', 'igreja', 'evangelic\\w*', 'catolic\\w*', 'espirita',
  'umbanda', 'candomble', 'ateu', 'partido', 'bolsonar\\w*', 'lula', 'petista', 'esquerda', 'direita',
  'salario', 'divida\\w*', 'emprestimo', 'cartao de credito', 'senha', 'cpf', 'rg', 'endereco', 'rua', 'telefone', 'whatsapp', 'email',
  'depression', 'disorder', 'medication', 'meds', 'pregnan\\w*', 'religion', 'church', 'salary', 'debt', 'password', 'address',
  'depresion', 'medicamento\\w*', 'embaraz\\w*', 'religion', 'deuda\\w*', 'direccion',
].join('|') + ')\\b')

export function memoriaPermitida(l: Lembranca, termosExtras: string[] = []): boolean {
  const t = norm(l.texto)
  if (t.length < 3 || t.length > 200) return false
  if (PROIBIDO_MEMORIA.test(t)) return false
  if (/\d{5,}/.test(t)) return false // números longos: documento, telefone, cartão
  if (termosExtras.some((x) => t.includes(norm(x)))) return false
  return true
}

export interface MemoriaContexto { texto: string; categoria: string; data_referencia: string | null; fixada: boolean }

export function blocoMemoria(memorias: MemoriaContexto[], consentimento: boolean | null): string {
  if (consentimento === false) {
    return `\n\nMEMÓRIA: desligada por esta pessoa. Não use [[LEMBRAR]] nem [[ESQUECER]] e nunca diga que vai lembrar de algo depois.`
  }
  if (consentimento === null) {
    return `\n\nMEMÓRIA: esta pessoa ainda não decidiu se você pode lembrar das coisas. Pode usar as marcas abaixo normalmente (o app pergunta a ela), mas NUNCA diga que vai lembrar nem que anotou.`
  }
  const linhas = memorias.map((m) => `- ${m.texto}${m.data_referencia ? ` (data: ${m.data_referencia})` : ''}`)
  return `\n\nO QUE VOCÊ JÁ SABE DESTA PESSOA (ela contou antes; use com naturalidade, só quando fizer sentido, sem recitar a lista nem dizer "está registrado"):\n${linhas.length ? linhas.join('\n') : '- (nada ainda)'}`
}

export const REGRAS_MEMORIA = `

COMO LEMBRAR (memória ligada):
- Quando a pessoa contar algo DURADOURO sobre ela que vai ajudar em conversas futuras, adicione no FIM da resposta, numa linha só: [[LEMBRAR: categoria | frase curta em terceira pessoa | AAAA-MM-DD se for um evento com data]]
  Categorias: gosto (comida, treino, coisas que curte ou não), rotina (horários, trabalho em turnos, quando treina), objetivo (o que quer alcançar), evento (algo com data: prova, viagem, consulta de rotina), pessoa (família e pets, sem sobrenome), estilo (como prefere que você fale), contexto (outras coisas úteis).
  Para evento, escreva só o nome do evento, sem verbo (o app usa a frase em lembretes): "Prova de 10 km do bairro", "Viagem para a praia".
  Ex.: [[LEMBRAR: rotina | Trabalha de madrugada e treina à tarde]] · [[LEMBRAR: evento | Prova de 10 km do bairro | 2026-10-20]] · [[LEMBRAR: estilo | Prefere respostas bem diretas]]
- No máximo 1 marca por resposta. Não marque o que já está em "O QUE VOCÊ JÁ SABE", nem coisas do momento ("tô com fome agora").
- NUNCA marque: saúde mental, diagnósticos, remédios, sexualidade, religião, política, dinheiro, documentos, endereço, telefone, ou algo que a pessoa pediu para não guardar.
- Se ela pedir para esquecer algo: [[ESQUECER: trecho do que esquecer]] e confirme numa frase.
- Não anuncie cada coisa que guardou. Às vezes um "anotado 😉" basta.
- Se algo do que você sabe parecer desatualizado, pergunte de leve em vez de afirmar.`

// ================================================================
// JEITO DE FALAR — sinais simples de como a pessoa escreve.
// ================================================================
const EMOJI = /\p{Extended_Pictographic}/u
const RISADA = /\b(k{3,}|(ha){2,}|(he){2,}|rs(rs)+|(ja){2,}|lol|kkk)\b/i

export function estiloDaPessoa(mensagens: string[]): string | null {
  const msgs = mensagens.map((m) => m.trim()).filter((m) => m.length > 0)
  if (msgs.length < 5) return null
  const media = msgs.reduce((s, m) => s + m.length, 0) / msgs.length
  const comEmoji = msgs.filter((m) => EMOJI.test(m)).length / msgs.length
  const risadas = msgs.filter((m) => RISADA.test(m)).length / msgs.length
  const dicas: string[] = []
  if (media < 45) dicas.push('escreve curto: responda em 1 ou 2 frases')
  else if (media > 180) dicas.push('escreve bastante: pode ir até 3 frases quando o assunto pedir')
  if (comEmoji < 0.1) dicas.push('quase não usa emoji: evite emoji')
  else if (comEmoji > 0.5) dicas.push('usa bastante emoji: 1 emoji combina')
  if (risadas >= 0.2) dicas.push('tem humor leve: brincadeiras curtas combinam, sem forçar')
  return dicas.length ? `\n\nJEITO DESTA PESSOA (adapte-se): ${dicas.join('; ')}. Se ela pedir outro jeito, vale o que ela pediu.` : null
}

export function blocoPadroes(linhas: string[]): string {
  if (!linhas.length) return ''
  return `\n\nPADRÕES DOS ÚLTIMOS 28 DIAS (calculados pelo app; use no máximo um, só se ajudar a conversa, como observação de amigo e nunca como diagnóstico ou cobrança):\n${linhas.map((l) => `- ${l}`).join('\n')}`
}

// ================================================================
// CHECK-IN v3 — vocabulário fixo; o servidor deriva energia/agradável.
// ================================================================
export const SENTIMENTOS: Record<string, { e: number; a: number; rotulo: Record<Idioma, string> }> = {
  irritado: { e: 4, a: 1, rotulo: { 'pt-BR': 'irritado', en: 'irritated', es: 'irritado' } },
  agitado: { e: 4, a: 2, rotulo: { 'pt-BR': 'agitado', en: 'restless', es: 'agitado' } },
  empolgado: { e: 4, a: 3, rotulo: { 'pt-BR': 'empolgado', en: 'excited', es: 'entusiasmado' } },
  animado: { e: 4, a: 4, rotulo: { 'pt-BR': 'animado', en: 'upbeat', es: 'animado' } },
  estressado: { e: 3, a: 1, rotulo: { 'pt-BR': 'estressado', en: 'stressed', es: 'estresado' } },
  ansioso: { e: 3, a: 2, rotulo: { 'pt-BR': 'ansioso', en: 'anxious', es: 'ansioso' } },
  motivado: { e: 3, a: 3, rotulo: { 'pt-BR': 'motivado', en: 'motivated', es: 'motivado' } },
  feliz: { e: 3, a: 4, rotulo: { 'pt-BR': 'feliz', en: 'happy', es: 'feliz' } },
  desanimado: { e: 2, a: 1, rotulo: { 'pt-BR': 'desanimado', en: 'down', es: 'desanimado' } },
  entediado: { e: 2, a: 2, rotulo: { 'pt-BR': 'entediado', en: 'bored', es: 'aburrido' } },
  tranquilo: { e: 2, a: 3, rotulo: { 'pt-BR': 'tranquilo', en: 'calm', es: 'tranquilo' } },
  grato: { e: 2, a: 4, rotulo: { 'pt-BR': 'grato', en: 'grateful', es: 'agradecido' } },
  esgotado: { e: 1, a: 1, rotulo: { 'pt-BR': 'esgotado', en: 'drained', es: 'agotado' } },
  cansado: { e: 1, a: 2, rotulo: { 'pt-BR': 'cansado', en: 'tired', es: 'cansado' } },
  relaxado: { e: 1, a: 3, rotulo: { 'pt-BR': 'relaxado', en: 'relaxed', es: 'relajado' } },
  em_paz: { e: 1, a: 4, rotulo: { 'pt-BR': 'em paz', en: 'at peace', es: 'en paz' } },
}
export const ETIQUETAS = ['sono', 'trabalho', 'treino', 'comida', 'familia', 'relacionamento', 'saude', 'dinheiro', 'nada'] as const
const ROTULO_ETIQUETA: Record<(typeof ETIQUETAS)[number], string> = {
  sono: 'sono', trabalho: 'trabalho ou estudo', treino: 'treino', comida: 'comida', familia: 'família e amigos',
  relacionamento: 'relacionamento', saude: 'saúde', dinheiro: 'dinheiro', nada: 'nada específico',
}
export type Momento = 'manha' | 'tarde' | 'noite'

export interface CheckinValido {
  palavra: string; energia: number; agradavel: number; etiquetas: string[]; nota: string | null; momento: Momento
}

export function validarCheckin(corpo: Record<string, unknown>, horaLocal: number): CheckinValido | null {
  const palavra = typeof corpo.palavra === 'string' ? corpo.palavra.trim().toLowerCase().replace(/\s+/g, '_') : ''
  const s = SENTIMENTOS[palavra]
  if (!s) return null
  const momento: Momento = corpo.momento === 'manha' || corpo.momento === 'tarde' || corpo.momento === 'noite'
    ? corpo.momento
    : horaLocal < 12 ? 'manha' : horaLocal < 18 ? 'tarde' : 'noite'
  const etiquetas = Array.isArray(corpo.etiquetas)
    ? [...new Set(corpo.etiquetas.filter((x): x is string => typeof x === 'string' && (ETIQUETAS as readonly string[]).includes(x)))].slice(0, 6)
    : []
  const nota = typeof corpo.nota === 'string' && corpo.nota.trim() ? corpo.nota.trim().slice(0, 140) : null
  return { palavra, energia: s.e, agradavel: s.a, etiquetas, nota, momento }
}

const NOME_MOMENTO: Record<Momento, string> = { manha: 'da manhã', tarde: 'da tarde', noite: 'da noite' }

// Resumo que fica no chat, no idioma da pessoa (o prompt continua em pt-BR).
const ETIQUETA_IDIOMA: Record<Exclude<Idioma, 'pt-BR'>, Record<(typeof ETIQUETAS)[number], string>> = {
  en: {
    sono: 'sleep', trabalho: 'work or study', treino: 'workout', comida: 'food', familia: 'family and friends',
    relacionamento: 'relationship', saude: 'health', dinheiro: 'money', nada: 'nothing specific',
  },
  es: {
    sono: 'sueño', trabalho: 'trabajo o estudio', treino: 'entrenamiento', comida: 'comida', familia: 'familia y amigos',
    relacionamento: 'pareja', saude: 'salud', dinheiro: 'dinero', nada: 'nada en especial',
  },
}
const CHECKIN_DO_MOMENTO: Record<Idioma, Record<Momento, string>> = {
  'pt-BR': { manha: 'Check-in da manhã', tarde: 'Check-in da tarde', noite: 'Check-in da noite' },
  en: { manha: 'Morning check-in', tarde: 'Afternoon check-in', noite: 'Evening check-in' },
  es: { manha: 'Check-in de la mañana', tarde: 'Check-in de la tarde', noite: 'Check-in de la noche' },
}

export function resumoCheckin(c: CheckinValido, idioma: Idioma = 'pt-BR'): string {
  const r = SENTIMENTOS[c.palavra].rotulo[idioma]
  const et = c.etiquetas
    .map((e) => {
      const k = e as (typeof ETIQUETAS)[number]
      return idioma === 'pt-BR' ? ROTULO_ETIQUETA[k] : ETIQUETA_IDIOMA[idioma][k]
    })
    .join(', ')
  return `${CHECKIN_DO_MOMENTO[idioma][c.momento]}: ${r}${et ? ` · ${et}` : ''}`
}

export function promptCheckin(c: CheckinValido): string {
  const r = SENTIMENTOS[c.palavra].rotulo['pt-BR']
  const et = c.etiquetas.map((e) => ROTULO_ETIQUETA[e as (typeof ETIQUETAS)[number]]).join(', ')
  return `A pessoa acabou de fazer o check-in ${NOME_MOMENTO[c.momento]}: sentimento "${r}" (energia ${c.energia}/4, quão agradável ${c.agradavel}/4)` +
    (et ? `; tem a ver com: ${et}` : '') + (c.nota ? `; ela escreveu: "${c.nota}"` : '') + '.'
}

export const REGRAS_CHECKIN = `

AGORA É UM CHECK-IN, NÃO UMA CONVERSA:
- Responda com UMA frase curta (no máximo 25 palavras), acolhendo o sentimento do jeito de um amigo. Pode usar o que você já sabe dela, se encaixar.
- Sentimento pesado (agradável 1 ou 2): acolha sem tentar consertar e sem dica; pode dizer que está por aqui se ela quiser conversar.
- Sentimento bom: celebre de leve.
- Não faça pergunta, não dê conselho de comida/treino, não fale de metas nem de registros. Sem marcas [[...]].`

const PADRAO_CHECKIN: Record<Idioma, (c: CheckinValido) => string> = {
  'pt-BR': (c) => {
    if (c.agradavel <= 1) return 'Dia pesado, né? Não precisa resolver nada agora. Tô por aqui se quiser falar.'
    if (c.agradavel === 2 && c.energia >= 3) return 'Bastante coisa na cabeça. Respira fundo uma vez; se quiser desabafar, tô aqui.'
    if (c.agradavel === 2) return c.momento === 'noite' ? 'Dia cansativo. Descansa bem, você merece.' : 'Modo economia hoje, né? Vai no seu ritmo.'
    if (c.energia <= 2) return c.momento === 'noite' ? 'Fechando o dia em paz. Dorme bem.' : 'Começando com calma. Boa forma de entrar no dia. 🌱'
    return c.momento === 'noite' ? 'Que dia bom! Guarda essa sensação.' : 'Boa! Aproveita essa energia hoje.'
  },
  en: (c) => {
    if (c.agradavel <= 1) return "Heavy day, huh? You don't need to fix anything right now. I'm here if you want to talk."
    if (c.agradavel === 2) return c.energia >= 3 ? "A lot on your mind. One deep breath; I'm here if you want to vent." : 'Low-battery mode today. Go at your own pace.'
    return c.energia <= 2 ? 'Taking it slow. A good way to go through the day. 🌱' : 'Nice! Enjoy that energy today.'
  },
  es: (c) => {
    if (c.agradavel <= 1) return 'Día pesado, ¿no? No hace falta resolver nada ahora. Aquí estoy si quieres hablar.'
    if (c.agradavel === 2) return c.energia >= 3 ? 'Mucha cosa en la cabeza. Respira hondo; aquí estoy si quieres desahogarte.' : 'Modo ahorro hoy. Ve a tu ritmo.'
    return c.energia <= 2 ? 'Con calma. Buena forma de llevar el día. 🌱' : '¡Bien! Aprovecha esa energía hoy.'
  },
}
export const respostaCheckinPadrao = (c: CheckinValido, idioma: Idioma) => PADRAO_CHECKIN[idioma](c)

// ================================================================
// ABERTURA — o Life puxa assunto no máximo 1 vez por dia.
// Regras fixas (sem IA): evento lembrado, marco de hábito, dias pesados
// seguidos, sumiço. Respeita pausa e a preferência "Life pode puxar conversa".
// ================================================================
export interface DadosAbertura {
  hoje: string
  idioma: Idioma
  nome: string | null
  pausadoHoje: boolean
  puxarConversa: boolean
  jaFalouHoje: boolean
  motivosRecentes: { motivo: string; dia: string }[] // últimos 14 dias
  eventos: { texto: string; data: string }[]           // memórias com data entre ontem e amanhã
  habitos: { nome: string; dias: number }[] // dias firmes (construir: sequência; evitar: desde o último tropeço). Só com consentimento
  agradavelUltimosDias: { data: string; agradavel: number }[] // check-ins dos últimos 3 dias
  ultimaAtividade: string | null // último registro de qualquer coisa
}

const MARCOS = new Set([7, 14, 21, 30, 60, 90, 120, 180, 365])
const diff = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86_400_000)

const TXT_ABERTURA: Record<Idioma, {
  eventoHoje: (t: string) => string; eventoAmanha: (t: string) => string; eventoOntem: (t: string) => string
  marco: (n: number, h: string) => string
  pesado: string; voltou: (nome: string | null) => string
}> = {
  'pt-BR': {
    eventoHoje: (t) => `Hoje é o dia: ${t.charAt(0).toLowerCase() + t.slice(1)}! Tô torcendo por você 🍀`,
    eventoAmanha: (t) => `Amanhã é o dia: ${t.charAt(0).toLowerCase() + t.slice(1)}. Como você tá se sentindo?`,
    eventoOntem: (t) => `E aí, como foi ontem (${t.charAt(0).toLowerCase() + t.slice(1)})? Quero saber!`,
    marco: (n, h) => `${n} dias firme em "${h}"! Isso é muito. Como tá sendo pra você?`,
    pesado: 'Os últimos dias pareceram mais pesados. Sem pressa nenhuma: se quiser conversar, tô aqui.',
    voltou: (nome) => `${nome ? `${nome}, que` : 'Que'} bom te ver por aqui! Sem cobrança: bora começar leve hoje?`,
  },
  en: {
    eventoHoje: (t) => `Today's the day: ${t.charAt(0).toLowerCase() + t.slice(1)}! Rooting for you 🍀`,
    eventoAmanha: (t) => `Tomorrow's the day: ${t.charAt(0).toLowerCase() + t.slice(1)}. How are you feeling?`,
    eventoOntem: (t) => `So, how did yesterday go (${t.charAt(0).toLowerCase() + t.slice(1)})? Tell me!`,
    marco: (n, h) => `${n} days strong on "${h}"! That's a lot. How's it going for you?`,
    pesado: "The last few days seemed heavier. No rush at all: if you want to talk, I'm here.",
    voltou: (nome) => `${nome ? `${nome}, good` : 'Good'} to see you here! No pressure: shall we start light today?`,
  },
  es: {
    eventoHoje: (t) => `¡Hoy es el día: ${t.charAt(0).toLowerCase() + t.slice(1)}! Te mando buena vibra 🍀`,
    eventoAmanha: (t) => `Mañana es el día: ${t.charAt(0).toLowerCase() + t.slice(1)}. ¿Cómo te sientes?`,
    eventoOntem: (t) => `¿Y? ¿Cómo te fue ayer (${t.charAt(0).toLowerCase() + t.slice(1)})? ¡Cuéntame!`,
    marco: (n, h) => `¡${n} días firme en "${h}"! Es muchísimo. ¿Cómo lo estás llevando?`,
    pesado: 'Los últimos días parecieron más pesados. Sin prisa: si quieres hablar, aquí estoy.',
    voltou: (nome) => `¡${nome ? `${nome}, qué` : 'Qué'} bueno verte por aquí! Sin presión: ¿empezamos suave hoy?`,
  },
}

export function escolherAbertura(d: DadosAbertura): { motivo: string; texto: string } | null {
  if (d.pausadoHoje || !d.puxarConversa || d.jaFalouHoje) return null
  const t = TXT_ABERTURA[d.idioma]
  const recente = (motivo: string, dias: number) => d.motivosRecentes.some((m) => m.motivo === motivo && diff(m.dia, d.hoje) < dias)
  const primeiroNome = d.nome?.trim().split(/\s+/)[0] ?? null

  const evHoje = d.eventos.find((e) => e.data === d.hoje)
  if (evHoje && !recente(`evento:${evHoje.texto}`, 2)) return { motivo: `evento:${evHoje.texto}`.slice(0, 120), texto: t.eventoHoje(evHoje.texto) }
  const evAmanha = d.eventos.find((e) => diff(d.hoje, e.data) === 1)
  if (evAmanha && !recente(`evento:${evAmanha.texto}`, 2)) return { motivo: `evento:${evAmanha.texto}`.slice(0, 120), texto: t.eventoAmanha(evAmanha.texto) }

  // Fechar o assunto: o evento foi ontem, pergunta como foi (uma vez).
  const evOntem = d.eventos.find((e) => diff(e.data, d.hoje) === 1)
  if (evOntem && !recente(`depois:${evOntem.texto}`, 7)) return { motivo: `depois:${evOntem.texto}`.slice(0, 120), texto: t.eventoOntem(evOntem.texto) }

  const marco = d.habitos.find((h) => MARCOS.has(h.dias))
  if (marco && !recente(`marco:${marco.nome}:${marco.dias}`, 30)) {
    return { motivo: `marco:${marco.nome}:${marco.dias}`.slice(0, 120), texto: t.marco(marco.dias, marco.nome) }
  }

  const ultimos = [...d.agradavelUltimosDias].sort((a, b) => (a.data < b.data ? 1 : -1))
  const diasPesados = new Set(ultimos.filter((c) => c.agradavel <= 2).map((c) => c.data))
  const diasComCheckin = new Set(ultimos.map((c) => c.data))
  if (diasComCheckin.size >= 2 && diasPesados.size >= 2 && [...diasComCheckin].every((dia) => diasPesados.has(dia)) && !recente('pesado', 3)) {
    return { motivo: 'pesado', texto: t.pesado }
  }

  if (d.ultimaAtividade && diff(d.ultimaAtividade, d.hoje) >= 4 && !recente('voltou', 7)) {
    return { motivo: 'voltou', texto: t.voltou(primeiroNome) }
  }
  return null
}

interface HabitoBruto {
  nome: string; streak_atual: number | null; ultimo_checkin: string | null; categoria: string | null
  criado_em: string; ultima_recaida: string | null
}

/** Mesma regra do contexto do Life: construir = sequência ainda válida; evitar = dias desde o último tropeço. */
export function diasFirme(h: HabitoBruto, hoje: string): number {
  if (h.categoria === 'leitura') {
    return h.ultimo_checkin && diff(h.ultimo_checkin, hoje) <= 1 ? h.streak_atual ?? 0 : 0
  }
  const base = Math.max(Date.parse(h.criado_em), h.ultima_recaida ? Date.parse(h.ultima_recaida) : 0)
  return Math.max(Math.floor((Date.parse(hoje + 'T23:59:59Z') - base) / 86_400_000), 0)
}

// ================================================================
// Acesso ao banco
// ================================================================
export async function lerConsentimentoMemoria(sb: Sb, userId: string): Promise<boolean | null> {
  const { data } = await sb.from('profiles').select('consentimento_memoria').eq('id', userId).maybeSingle()
  return typeof data?.consentimento_memoria === 'boolean' ? data.consentimento_memoria : null
}

export async function memoriasParaContexto(sb: Sb, userId: string, mensagem: string, hoje: string, limite = 10): Promise<MemoriaContexto[]> {
  const { data, error } = await sb.rpc('life_memorias_contexto', { p_user_id: userId, p_mensagem: mensagem, p_hoje: hoje, p_limite: limite })
  if (error) { console.warn('[memoria] contexto falhou', error.message); return [] }
  return (data ?? []) as MemoriaContexto[]
}

export async function padroesDaPessoa(sb: Sb, userId: string, hoje: string): Promise<string[]> {
  const { data, error } = await sb.rpc('life_padroes', { p_user_id: userId, p_hoje: hoje })
  if (error) { console.warn('[padroes] falhou', error.message); return [] }
  return Array.isArray(data) ? (data as string[]) : []
}

export async function mensagensDaPessoa(sb: Sb, userId: string): Promise<string[]> {
  const { data } = await sb.from('life_chat_mensagens').select('texto').eq('user_id', userId).eq('autor', 'usuario')
    .eq('tipo', 'conversa').order('criado_em', { ascending: false }).limit(40)
  return ((data ?? []) as { texto: string }[]).map((m) => m.texto)
}

export async function linhaCheckinsHoje(sb: Sb, userId: string, hoje: string): Promise<string> {
  const { data } = await sb.from('life_checkins').select('momento, palavra, etiquetas').eq('user_id', userId).eq('data', hoje)
  const lista = (data ?? []) as { momento: Momento; palavra: string; etiquetas: string[] }[]
  if (!lista.length) return ''
  const partes = lista.map((c) => `${NOME_MOMENTO[c.momento].replace('da ', '')} ${SENTIMENTOS[c.palavra]?.rotulo['pt-BR'] ?? c.palavra}` +
    (c.etiquetas?.length ? ` (${c.etiquetas.map((e) => ROTULO_ETIQUETA[e as (typeof ETIQUETAS)[number]] ?? e).join(', ')})` : ''))
  return `\nCheck-in de hoje: ${partes.join('; ')}.`
}

/** Grava o que o modelo marcou. Devolve se faltou consentimento para algo que valia guardar. */
export async function aplicarMarcasMemoria(
  sb: Sb, userId: string, consentimento: boolean | null, marcas: { lembrar: Lembranca[]; esquecer: string[] },
): Promise<{ sugerirMemoria: boolean; guardadas: number; esquecidas: number }> {
  const validas = marcas.lembrar.filter((l) => memoriaPermitida(l))
  if (consentimento !== true) return { sugerirMemoria: consentimento === null && validas.length > 0, guardadas: 0, esquecidas: 0 }
  let guardadas = 0, esquecidas = 0
  for (const l of validas) {
    const { data, error } = await sb.rpc('life_guardar_memoria', { p_user_id: userId, p_texto: l.texto, p_categoria: l.categoria, p_data: l.data })
    if (error) console.warn('[memoria] guardar falhou', error.message)
    else if (data === 'salva' || data === 'atualizada') guardadas++
  }
  for (const trecho of marcas.esquecer) {
    const { data, error } = await sb.rpc('life_esquecer_memoria', { p_user_id: userId, p_trecho: trecho })
    if (error) console.warn('[memoria] esquecer falhou', error.message)
    else if (data) esquecidas++
  }
  return { sugerirMemoria: false, guardadas, esquecidas }
}

export async function dadosAbertura(sb: Sb, userId: string, hoje: string, idioma: Idioma): Promise<DadosAbertura> {
  const amanha = new Date(Date.parse(hoje + 'T12:00:00Z') + 86_400_000).toISOString().slice(0, 10)
  const ontem = new Date(Date.parse(hoje + 'T12:00:00Z') - 86_400_000).toISOString().slice(0, 10)
  const de3 = new Date(Date.parse(hoje + 'T12:00:00Z') - 2 * 86_400_000).toISOString().slice(0, 10)
  const de14 = new Date(Date.parse(hoje + 'T12:00:00Z') - 14 * 86_400_000).toISOString().slice(0, 10)
  const de30 = new Date(Date.parse(hoje + 'T12:00:00Z') - 30 * 86_400_000).toISOString().slice(0, 10)
  const [perfil, pausa, inic, eventos, habitos, checkins, ref, agua, treino, chk] = await Promise.all([
    sb.from('profiles').select('nome, life_chat_ligado, consentimento_habitos, consentimento_memoria').eq('id', userId).maybeSingle(),
    sb.from('life_pausas').select('dia').eq('user_id', userId).eq('dia', hoje).maybeSingle(),
    sb.from('life_iniciativas').select('motivo, dia').eq('user_id', userId).gte('dia', de14),
    sb.from('life_memorias').select('texto, data_referencia').eq('user_id', userId).eq('categoria', 'evento').gte('data_referencia', ontem).lte('data_referencia', amanha),
    sb.from('vicios_user').select('nome, streak_atual, ultimo_checkin, categoria, criado_em, ultima_recaida').eq('user_id', userId).eq('ativo', true).limit(5),
    sb.from('life_checkins').select('data, agradavel').eq('user_id', userId).gte('data', de3).lte('data', hoje),
    sb.from('itens_refeicao').select('data').eq('user_id', userId).gte('data', de30).order('data', { ascending: false }).limit(1),
    sb.from('registros_agua').select('data').eq('user_id', userId).gte('data', de30).order('data', { ascending: false }).limit(1),
    sb.from('treinos_historico').select('data').eq('user_id', userId).gte('data', de30).order('data', { ascending: false }).limit(1),
    sb.from('life_checkins').select('data').eq('user_id', userId).gte('data', de30).order('data', { ascending: false }).limit(1),
  ])
  const p = perfil.data as { nome?: string; life_chat_ligado?: boolean; consentimento_habitos?: boolean; consentimento_memoria?: boolean } | null
  const ultimas = [ref, agua, treino, chk].map((r) => (r.data as { data: string }[] | null)?.[0]?.data).filter((x): x is string => !!x).sort()
  const motivos = ((inic.data ?? []) as { motivo: string; dia: string }[])
  return {
    hoje,
    idioma,
    nome: p?.nome ?? null,
    pausadoHoje: !!pausa.data,
    puxarConversa: p?.life_chat_ligado === true,
    jaFalouHoje: motivos.some((m) => m.dia === hoje),
    motivosRecentes: motivos,
    eventos: p?.consentimento_memoria === true
      ? ((eventos.data ?? []) as { texto: string; data_referencia: string }[]).map((e) => ({ texto: e.texto, data: e.data_referencia }))
      : [],
    habitos: p?.consentimento_habitos === true
      ? ((habitos.data ?? []) as HabitoBruto[]).map((h) => ({ nome: h.nome, dias: diasFirme(h, hoje) }))
      : [],
    agradavelUltimosDias: (checkins.data ?? []) as { data: string; agradavel: number }[],
    ultimaAtividade: ultimas.at(-1) ?? null,
  }
}
