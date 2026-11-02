// ================================================================
// Resumos do dia e da semana (Fase 9, guia item 14).
//
// Embaixo da memória em camadas ficam os resumos: 3 a 5 linhas por dia de
// conversa e um por semana. Entram no prompt os dos últimos 7 dias e o da
// semana passada — a memória cresce sem o prompt crescer.
//
// Sem cron: na primeira mensagem do dia, em segundo plano, a ai-proxy resume
// o que falta (só quem está ativo custa). Só com a memória ligada.
// ================================================================
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

type Sb = SupabaseClient
export interface Resumo { tipo: 'dia' | 'semana'; inicio: string; texto: string }
export interface MensagemDatada { autor: string; texto: string; criado_em: string }

const MAX_DIAS_POR_VEZ = 3
const MAX_TEXTO = 600

/** Data local (AAAA-MM-DD) de um instante, no fuso da pessoa. */
export function diaLocal(iso: string, fuso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function somarDiasISO(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Segunda-feira da semana de `dia`. */
export function segundaDaSemana(dia: string): string {
  const dow = new Date(`${dia}T12:00:00Z`).getUTCDay() // 0 = domingo
  return somarDiasISO(dia, -((dow + 6) % 7))
}

/**
 * Dias (mais novo primeiro) dos últimos 7, sem contar hoje, com conversa de
 * verdade (2+ mensagens dela) e sem resumo ainda. No máximo MAX_DIAS_POR_VEZ.
 */
export function diasParaResumir(
  mensagens: readonly MensagemDatada[], hoje: string, fuso: string, feitos: ReadonlySet<string>, comRisco: ReadonlySet<string>,
): string[] {
  const conta = new Map<string, number>()
  for (const m of mensagens) {
    if (m.autor === 'life') continue
    const d = diaLocal(m.criado_em, fuso)
    conta.set(d, (conta.get(d) ?? 0) + 1)
  }
  const limite = somarDiasISO(hoje, -7)
  return [...conta.entries()]
    .filter(([d, n]) => d < hoje && d >= limite && n >= 2 && !feitos.has(d) && !comRisco.has(d))
    .map(([d]) => d).sort().reverse().slice(0, MAX_DIAS_POR_VEZ)
}

const REGRAS_SAUDE = `- Guarde como hábito, sem diagnóstico ("evita lactose", não "intolerante"; "dormiu pouco", não "insônia").
- Sentimento só em palavras gerais ("dia puxado", "ficou chateada com o trabalho").
- NUNCA: diagnóstico, remédio, conteúdo de crise, sexualidade, religião, política, dinheiro, endereço, documentos.
- Nada de cardápio inteiro nem números de treino; o que importa é o que ela contou, pediu e o que ficou combinado.`

export function promptResumoDia(dia: string, msgs: readonly MensagemDatada[]): string {
  const conversa = msgs.map((m) => `${m.autor === 'life' ? 'Life' : 'Pessoa'}: ${m.texto.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n')
  return `Resuma a conversa de ${dia} entre a pessoa e o Life (assistente de saúde e hábitos) em 3 a 5 linhas curtas, em terceira pessoa, no idioma da conversa. Serve pro Life lembrar depois do que aconteceu, sem reler tudo.
${REGRAS_SAUDE}
- Se não houve nada que valha lembrar (só cumprimentos, perguntas soltas), responda exatamente: NADA

CONVERSA:
${conversa}`
}

export function promptResumoSemana(inicio: string, dias: readonly Resumo[]): string {
  return `Junte os resumos dos dias da semana que começou em ${inicio} num resumo da semana de 3 a 5 linhas curtas, em terceira pessoa, no idioma deles: o que se repetiu, o que mudou, o que ficou em aberto.
${REGRAS_SAUDE}
- Se não houver nada que valha lembrar, responda exatamente: NADA

RESUMOS DOS DIAS:
${dias.map((d) => `${d.inicio}: ${d.texto}`).join('\n')}`
}

/** Texto do modelo → o que vai pro banco ('' = nada a lembrar). */
export function limparResumo(t: string | null | undefined): string {
  const s = (t ?? '').replace(/\[\[[^\]]*\]\]/g, '').replace(/^```\w*|```$/g, '').trim()
  if (!s || /^nada\.?$/i.test(s)) return ''
  return s.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5).join('\n').slice(0, MAX_TEXTO)
}

/** Bloco do prompt do chat: últimos 7 dias + semana passada. */
export function blocoResumos(resumos: readonly Resumo[], hoje: string): string {
  const dias = resumos.filter((r) => r.tipo === 'dia' && r.texto && r.inicio < hoje && r.inicio >= somarDiasISO(hoje, -7))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
  const semanaPassada = somarDiasISO(segundaDaSemana(hoje), -7)
  const semana = resumos.find((r) => r.tipo === 'semana' && r.inicio === semanaPassada && r.texto)
  if (!dias.length && !semana) return ''
  const partes: string[] = []
  if (semana) partes.push(`Semana passada:\n${semana.texto}`)
  if (dias.length) partes.push(dias.map((d) => `${d.inicio}:\n${d.texto}`).join('\n'))
  return `\n\nRESUMOS DAS CONVERSAS ANTERIORES (o que já aconteceu; use pra dar continuidade, sem recitar nem dizer "está registrado"):\n${partes.join('\n')}`
}

/**
 * Resumos guardados dos últimos ~15 dias (pro prompt e pra saber o que falta).
 * null = tabela fora (migração não aplicada): não gera nada, pra não gastar IA à toa.
 */
export async function lerResumos(sb: Sb, userId: string, hoje: string): Promise<Resumo[] | null> {
  const { data, error } = await sb.from('life_resumos').select('tipo, inicio, texto')
    .eq('user_id', userId).gte('inicio', somarDiasISO(hoje, -15)).order('inicio', { ascending: false }).limit(30)
  if (error) return null
  return (data ?? []) as Resumo[]
}

/**
 * Gera o que falta (dias, depois a semana passada). `gerar` chama o modelo
 * barato e audita o custo; devolve o texto ou null se falhou (tenta de novo amanhã).
 */
export async function garantirResumos(
  sb: Sb, userId: string, fuso: string, hoje: string, jaTem: readonly Resumo[],
  gerar: (prompt: string) => Promise<string | null>,
): Promise<number> {
  const feitos = new Set(jaTem.filter((r) => r.tipo === 'dia').map((r) => r.inicio))
  const desde = `${somarDiasISO(hoje, -8)}T00:00:00Z`
  const [msgsRes, riscoRes] = await Promise.all([
    sb.from('life_chat_mensagens').select('autor, texto, criado_em')
      .eq('user_id', userId).eq('tipo', 'conversa').gte('criado_em', desde)
      .order('criado_em', { ascending: true }).limit(400),
    sb.from('eventos_seguranca').select('data').eq('user_id', userId).eq('tipo', 'palavra_risco').gte('data', desde),
  ])
  if (msgsRes.error) return 0
  const msgs = (msgsRes.data ?? []) as MensagemDatada[]
  const comRisco = new Set(((riscoRes.data ?? []) as { data: string }[]).map((r) => diaLocal(r.data, fuso)))
  let novos = 0
  const salvar = async (tipo: 'dia' | 'semana', inicio: string, texto: string) => {
    const { error } = await sb.from('life_resumos').upsert({ user_id: userId, tipo, inicio, texto }, { onConflict: 'user_id,tipo,inicio' })
    if (!error) novos++
  }

  // Dia com palavra de risco: marcado como visto, sem texto (nunca resumido).
  for (const d of comRisco) if (d < hoje && !feitos.has(d) && msgs.some((m) => diaLocal(m.criado_em, fuso) === d)) await salvar('dia', d, '')

  const todos = new Map(jaTem.filter((r) => r.tipo === 'dia').map((r) => [r.inicio, r]))
  for (const dia of diasParaResumir(msgs, hoje, fuso, feitos, comRisco)) {
    const doDia = msgs.filter((m) => diaLocal(m.criado_em, fuso) === dia).slice(-40)
    const t = await gerar(promptResumoDia(dia, doDia))
    if (t === null) continue
    const texto = limparResumo(t)
    await salvar('dia', dia, texto)
    todos.set(dia, { tipo: 'dia', inicio: dia, texto })
  }

  // Semana passada (segunda a domingo), quando ainda não tem.
  const inicio = somarDiasISO(segundaDaSemana(hoje), -7)
  if (!jaTem.some((r) => r.tipo === 'semana' && r.inicio === inicio)) {
    const dias = [...todos.values()].filter((r) => r.texto && r.inicio >= inicio && r.inicio < somarDiasISO(inicio, 7))
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
    if (dias.length >= 2) {
      const t = await gerar(promptResumoSemana(inicio, dias))
      if (t !== null) await salvar('semana', inicio, limparResumo(t))
    }
  }
  return novos
}
