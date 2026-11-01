// Memória em camadas do Life (01/11, guia "Life: conversa e memória").
//
// Antes, o modelo marcava no máximo 1 coisa por resposta ([[LEMBRAR]]) e o
// resto do que a pessoa contava junto se perdia (o atum). Agora, depois da
// resposta e em segundo plano, uma chamada curta do modelo rápido lê a
// última troca + o que já está guardado e devolve OPERAÇÕES (criar,
// corrigir, fechar), que o banco aplica (life_memoria_aplicar). A pessoa não
// espera por isso. Só roda com o consentimento de memória ligado.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { memoriaPermitida, type CategoriaMemoria } from './life.ts'

type Sb = SupabaseClient

export const NIVEIS = ['nucleo', 'fato', 'estilo', 'evento', 'contexto', 'fragmento'] as const
export type Nivel = (typeof NIVEIS)[number]
const CATEGORIAS = ['gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto', 'fragmento'] as const

export interface OpMemoria {
  faz: 'criar' | 'corrigir' | 'fechar'
  chave: string | null
  nivel?: Nivel
  categoria?: (typeof CATEGORIAS)[number]
  texto?: string
  importancia?: number
  confianca?: number
  data_referencia?: string
  estado?: 'ativo' | 'aberto'
  retomar_em?: string
  expira_em?: string
}

export interface MemoriaGuardada { chave: string | null; nivel: string | null; texto: string }

const DATA = /^\d{4}-\d{2}-\d{2}$/
const CHAVE = /^[a-z0-9_]+(\.[a-z0-9_]+){1,4}$/
const dias = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86_400_000)

/** Mensagem que vale a extração: "ok", "sim", "kkk" não têm o que guardar. */
export function valeExtrair(mensagem: string): boolean {
  const t = mensagem.trim()
  if (t.length < 12) return false
  return t.split(/\s+/).length >= 3
}

/** "O que você lembra de mim?" → entram todos os fatos. */
export const PEDE_LEMBRANCAS =
  /\b(o que (vc|voce|você) (lembra|sabe)|do que (vc|voce|você) lembra|what do you (remember|know) about me|que (recuerdas|sabes) de m[ií]|qu'est-ce que tu (te souviens|sais))\b/i

export function promptExtracao(p: {
  agora: string
  guardadas: MemoriaGuardada[]
  troca: { autor: 'usuario' | 'life'; texto: string }[]
}): string {
  const lista = p.guardadas.length
    ? p.guardadas.map((m) => `- ${m.chave ?? '(sem chave)'} | ${m.nivel ?? '?'} | ${m.texto}`).join('\n')
    : '- (nada ainda)'
  const conversa = p.troca.map((m) => `${m.autor === 'usuario' ? 'PESSOA' : 'LIFE'}: ${m.texto.replace(/\s+/g, ' ').slice(0, 800)}`).join('\n')
  return `Você organiza a memória do Life, o companheiro do app de saúde ATHOSlife. Leia a conversa e devolva só JSON.

${p.agora}

O QUE JÁ ESTÁ GUARDADO (chave | nível | texto):
${lista}

ÚLTIMA CONVERSA:
${conversa}

Devolva {"ops": [...]} com o que a PESSOA contou que muda conversas futuras. Nada a guardar: {"ops": []}.
Cada op:
- criar/corrigir: {"faz":"criar"|"corrigir","nivel":..,"categoria":..,"chave":..,"texto":..,"importancia":1-3, e quando couber "data_referencia","estado","retomar_em","expira_em","confianca"}
- fechar: {"faz":"fechar","chave":..} quando um evento ou fase acabou ("a prova já foi", "a semana puxada passou").

NÍVEIS (categoria entre parênteses):
- nucleo: quem a pessoa é e não muda à toa — objetivo (objetivo), pessoas importantes sem sobrenome (pessoa), restrição alimentar e rotina-base (rotina). Ex.: "Evita lactose", "Trabalha das 8h às 17h".
- fato: gostos, aversões, hábitos, limites práticos (gosto ou rotina). Ex.: "Não gosta de atum", "Nas noites de curso tem uns 10 minutos pra cozinhar".
- estilo: como prefere que o Life fale ou pense com ela (estilo), com "confianca" 0.3 se for dedução sua e 1 se ela pediu. Ex.: "Prefere uma sugestão pronta, não opções", "Medidas caseiras, nada de gramas".
- evento: algo com data que aconteceu ou vai acontecer (evento), com "data_referencia". Se ficou algo em aberto pra retomar com cuidado, "estado":"aberto" e "retomar_em" (1 a 3 dias depois). Ex.: "Prova de 10 km do bairro".
- contexto: a fase atual, que passa (contexto), com "expira_em" de 3 a 14 dias. Ex.: "Semana puxada no serviço".
- fragmento: um momento marcante, nas palavras dela, em termos gerais (fragmento), "importancia":3. Ex.: "Chamou o que sente de 'sensação de esforço infinito'". No máximo 1 por conversa e só se foi marcante.

REGRAS:
- Chave estável em minúsculas, com pontos: area.assunto (ex.: comida.nao_gosta.atum, rotina.curso_dias, evento.prova_10km). Se o assunto JÁ está guardado, use a MESMA chave com "corrigir" — nunca duplique. A correção da pessoa sempre vence.
- Texto curto em terceira pessoa, até 150 caracteres, sem nome da pessoa.
- Datas AAAA-MM-DD contadas a partir da linha Agora ("sexta" = a próxima sexta).
- Saúde só como hábito, sem diagnóstico: "evita lactose" (não "intolerante"), "dorme 6 a 7 horas" (não "insônia"). Sentimento só como evento, contexto ou fragmento, em palavras gerais.
- NUNCA guarde: diagnóstico, remédio, saúde mental, conteúdo de crise, sexualidade, religião, política, dinheiro, documentos, endereço, telefone, e-mail, ou o que ela pediu pra não guardar.
- Não guarde o que o LIFE disse nem coisa do momento ("tô com fome agora"), nem o que já está guardado igual.
- No máximo 6 ops.`
}

/** Confere o que o modelo devolveu: só passa op bem formada e permitida. */
export function validarOps(bruto: unknown, hoje: string): OpMemoria[] {
  const lista = (bruto as { ops?: unknown })?.ops
  if (!Array.isArray(lista)) return []
  const ops: OpMemoria[] = []
  for (const o of lista.slice(0, 8)) {
    if (!o || typeof o !== 'object') continue
    const r = o as Record<string, unknown>
    const chave = typeof r.chave === 'string' && CHAVE.test(r.chave.trim().toLowerCase()) ? r.chave.trim().toLowerCase() : null
    if (r.faz === 'fechar') {
      if (chave) ops.push({ faz: 'fechar', chave })
      continue
    }
    if (r.faz !== 'criar' && r.faz !== 'corrigir') continue
    const categoria = CATEGORIAS.find((c) => c === r.categoria)
    const nivel = NIVEIS.find((n) => n === r.nivel)
    const texto = typeof r.texto === 'string' ? r.texto.replace(/\s+/g, ' ').trim() : ''
    if (!categoria || !nivel || texto.length < 3 || texto.length > 200) continue
    if (/@\w|https?:\/\//i.test(texto)) continue
    if (!memoriaPermitida({ categoria: categoria as CategoriaMemoria, texto, data: null })) continue
    const op: OpMemoria = { faz: r.faz, chave, nivel, categoria, texto }
    const imp = Number(r.importancia)
    if (Number.isFinite(imp)) op.importancia = Math.min(3, Math.max(1, Math.round(imp)))
    const conf = Number(r.confianca)
    if (Number.isFinite(conf)) op.confianca = Math.min(1, Math.max(0, conf))
    const data = (k: string, min: number, max: number) => {
      const v = r[k]
      if (typeof v !== 'string' || !DATA.test(v) || Number.isNaN(Date.parse(v))) return undefined
      const d = dias(hoje, v)
      return d >= min && d <= max ? v : undefined
    }
    op.data_referencia = data('data_referencia', -400, 400)
    if (r.estado === 'aberto') op.estado = 'aberto'
    op.retomar_em = data('retomar_em', 0, 30)
    op.expira_em = data('expira_em', 0, 30)
    if (nivel === 'evento' && !op.data_referencia) op.data_referencia = hoje
    if (nivel === 'contexto' && !op.expira_em) {
      const d = new Date(Date.parse(hoje + 'T12:00:00Z') + 7 * 86_400_000)
      op.expira_em = d.toISOString().slice(0, 10)
    }
    for (const k of Object.keys(op) as (keyof OpMemoria)[]) if (op[k] === undefined) delete op[k]
    ops.push(op)
  }
  // fragmento: no máximo 1 por vez
  let frag = 0
  return ops.filter((o) => o.nivel !== 'fragmento' || ++frag <= 1).slice(0, 6)
}

/** O que já está guardado, pra extração corrigir em vez de duplicar. */
export async function memoriasGuardadas(sb: Sb, userId: string): Promise<MemoriaGuardada[]> {
  const { data, error } = await sb.from('life_memorias').select('chave, nivel, texto')
    .eq('user_id', userId).neq('estado', 'fechado')
    .order('importancia', { ascending: false }).order('atualizado_em', { ascending: false }).limit(80)
  if (error) { console.warn('[memoria] ler guardadas falhou', error.message); return [] }
  return (data ?? []) as MemoriaGuardada[]
}

export async function aplicarOps(sb: Sb, userId: string, ops: OpMemoria[]): Promise<{ salvas: number; fechadas: number } | null> {
  if (!ops.length) return { salvas: 0, fechadas: 0 }
  const { data, error } = await sb.rpc('life_memoria_aplicar', { p_user_id: userId, p_ops: ops })
  if (error) { console.warn('[memoria] aplicar falhou', error.message); return null }
  const r = data as { status?: string; salvas?: number; fechadas?: number }
  return r?.status === 'ok' ? { salvas: r.salvas ?? 0, fechadas: r.fechadas ?? 0 } : null
}

// ================================================================
// Bloco do prompt, por camada (o que entra em cada resposta).
// ================================================================
export interface MemoriaCamada {
  texto: string
  categoria: string
  data_referencia: string | null
  fixada: boolean
  nivel?: string | null
  estado?: string | null
}

export function blocoMemoriaCamadas(memorias: MemoriaCamada[], hoje: string, tudo: boolean): string {
  const de = (n: string) => memorias.filter((m) => (m.nivel ?? 'fato') === n && !(m.fixada && n !== 'nucleo'))
  const fixadas = memorias.filter((m) => m.fixada && (m.nivel ?? 'fato') !== 'nucleo')
  const linha = (m: MemoriaCamada) => `- ${m.texto}`
  const partes: string[] = []
  const nucleo = [...de('nucleo'), ...fixadas]
  if (nucleo.length) partes.push(`QUEM ELA É (sempre vale):\n${nucleo.map(linha).join('\n')}`)
  const estilo = de('estilo')
  if (estilo.length) partes.push(`COMO FALAR COM ELA:\n${estilo.map(linha).join('\n')}`)
  const fatos = de('fato')
  if (fatos.length) partes.push(`FATOS (gostos, rotina, limites):\n${fatos.map(linha).join('\n')}`)
  const contexto = de('contexto')
  if (contexto.length) partes.push(`FASE ATUAL (passa sozinha):\n${contexto.map(linha).join('\n')}`)
  const eventos = de('evento')
  if (eventos.length) {
    partes.push(`EVENTOS:\n${eventos.map((m) => {
      const d = m.data_referencia ? dias(hoje, m.data_referencia) : null
      const quando = d === null ? '' : d === 0 ? ' (hoje)' : d === 1 ? ' (amanhã)' : d === -1 ? ' (ontem)' : d > 0 ? ` (daqui a ${d} dias, ${m.data_referencia})` : ` (há ${-d} dias)`
      return `- ${m.texto}${quando}${m.estado === 'aberto' ? ' — ficou em aberto: se fizer sentido, retome UMA vez, com leveza e saída fácil' : ''}`
    }).join('\n')}`)
  }
  const frag = de('fragmento')
  if (frag.length) partes.push(`MOMENTO MARCANTE (use só se a conversa for de desabafo ou reflexão, com delicadeza, sem citar literalmente se não ajudar):\n${frag.map(linha).join('\n')}`)
  const corpo = partes.length ? partes.join('\n\n') : '- (nada ainda)'
  const regraTudo = tudo
    ? '\nEla perguntou o que você lembra: conte com naturalidade o que importa pro pedido dela (rotina, horários, gostos E o que ela não gosta), sem recitar tudo como lista, e use isso pra propor algo.'
    : '\nUse no máximo duas destas lembranças por resposta, só quando mudam a resposta.'
  return `\n\nO QUE VOCÊ SABE DESTA PESSOA (ela contou antes; use com naturalidade, nunca diga "está registrado"):\n${corpo}${regraTudo}`
}

/** Memória ligada: o app guarda sozinho, o Life não precisa marcar. */
export const REGRAS_MEMORIA_AUTO = `

MEMÓRIA (ligada): o app guarda sozinho o que a pessoa conta — você NÃO precisa usar [[LEMBRAR]]. Não anuncie que anotou nada (no máximo um "anotado" quando ela corrigir um dado).
- Se ela pedir para esquecer algo: [[ESQUECER: trecho do que esquecer]] no fim e confirme numa frase.
- Se algo do que você sabe parecer desatualizado, pergunte de leve em vez de afirmar.`
