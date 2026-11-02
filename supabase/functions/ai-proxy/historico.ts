// ATHOSlife — histórico do chat em camadas (2026-10-27).
//
// Antes: as 15 últimas mensagens iam inteiras para o modelo em toda chamada.
// Agora: as mais recentes vão inteiras e as mais antigas vão como uma linha
// curta por troca. O Life enxerga mais conversa gastando menos tokens.
//
// A linha curta é escrita pelo próprio modelo, na mesma resposta, numa marca
// escondida no fim: [[RESUMO: ...]]. O servidor tira a marca do texto e grava
// em life_chat_mensagens.resumo (na linha da resposta do Life). Sem chamada
// extra de IA. Mensagem sem resumo (antigas, ou quando o Life usou uma
// ferramenta) entra cortada no começo.

/** Mensagens buscadas no banco: o dobro da janela antiga (15). */
export const JANELA_TOTAL = 30
/** Quantas das mais recentes vão com o texto inteiro. */
export const JANELA_LITERAL = 6
const MAX_RESUMO = 200
const CORTE_RESERVA = 90

export interface MensagemSalva { autor: string; texto: string; resumo?: string | null }

const MARCA_RESUMO = /\[\[\s*RESUMO\s*:\s*([^\]]+?)\s*\]\]/i
const MARCA_RESUMO_QUALQUER = /\[\[\s*RESUMO\b[^\]]*\]\]/gi
// Resposta cortada no limite de tokens pode deixar "[[RESUMO: pediu jan" sem fechar.
const MARCA_RESUMO_ABERTA_NO_FIM = /\[\[\s*RESUMO\b[^\]]*\]?$/i

export function extrairResumo(resposta: string): { texto: string; resumo: string | null } {
  const m = resposta.match(MARCA_RESUMO)
  const resumo = m ? m[1].replace(/\s+/g, ' ').trim().slice(0, MAX_RESUMO) || null : null
  const texto = resposta.replace(MARCA_RESUMO_QUALQUER, '').replace(MARCA_RESUMO_ABERTA_NO_FIM, '')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { texto, resumo }
}

function cortar(t: string): string {
  const limpo = t.replace(/\s+/g, ' ').trim()
  return limpo.length <= CORTE_RESERVA ? limpo : `${limpo.slice(0, CORTE_RESERVA).trimEnd()}…`
}

/**
 * Separa o histórico (mais antiga primeiro) em: as últimas mensagens inteiras
 * e as linhas curtas das anteriores. A mensagem da pessoa logo antes de uma
 * resposta com resumo não vira linha própria: o resumo já cobre a troca.
 */
export function dividirHistorico(
  mensagens: readonly MensagemSalva[],
  literais = JANELA_LITERAL,
): { literais: MensagemSalva[]; linhas: string[] } {
  const corte = Math.max(mensagens.length - literais, 0)
  const antigas = mensagens.slice(0, corte)
  const linhas: string[] = []
  antigas.forEach((m, i) => {
    const proxima = antigas[i + 1]
    if (m.autor !== 'life' && proxima?.autor === 'life' && proxima.resumo) return
    if (m.autor === 'life' && m.resumo) linhas.push(`- ${m.resumo}`)
    else if (m.texto.trim()) linhas.push(`- ${m.autor === 'life' ? 'Life' : 'Pessoa'}: ${cortar(m.texto)}`)
  })
  return { literais: mensagens.slice(corte), linhas }
}

export function blocoConversaAnterior(linhas: readonly string[]): string {
  if (!linhas.length) return ''
  return '\n\nCONVERSA ANTERIOR (resumida, da mais antiga para a mais nova; as últimas mensagens vêm inteiras depois):\n' +
    linhas.join('\n')
}

export const REGRA_RESUMO = `

RESUMO DA TROCA: no FIM de toda resposta em texto, numa linha só, escreva [[RESUMO: o que a pessoa disse ou pediu e o que você respondeu ou combinou, em até 20 palavras, terceira pessoa, no idioma da conversa]]. Ex.: [[RESUMO: contou que dormiu mal; Life sugeriu treino leve e ela aceitou]]. O app esconde essa linha; ela serve para você lembrar desta conversa depois.`
