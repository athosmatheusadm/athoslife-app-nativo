// ================================================================
// Cota humana e humor do Life no chat (Fase 8, guia item 13).
//
// - O "sim" que só aceita uma oferta do Life não conta (até ACEITES_GRATIS/dia).
// - Desabafo não é cortado: com a cota no fim e a conversa marcada como
//   emocional, libera até EXTRAS_DESABAFO mensagens e esconde o contador.
// - Com 2 restantes, quem avisa é o Life (fora de desabafo); a última resposta
//   do dia resolve alguma coisa e diz que lembra de onde parou.
// - O rosto do Life no cabeçalho acompanha a resposta ([[HUMOR: ...]]).
// ================================================================

export const ACEITES_GRATIS = 3
export const EXTRAS_DESABAFO = 5

function sem(t: string): string {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[!.,;:…?¿¡"'()]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// Só o aceite, sem pedido novo junto ("sim, e põe no jantar" já é outra coisa).
const ACEITES = new Set([
  'sim', 's', 'ss', 'sim sim', 'pode', 'pode sim', 'pode ser', 'bora', 'claro', 'claro que sim', 'quero', 'quero sim',
  'ok', 'okay', 'blz', 'beleza', 'fechado', 'manda', 'manda ai', 'isso', 'isso ai', 'por favor', 'sim por favor', 'pode mandar', 'faz', 'faz isso', 'topo',
  'yes', 'yep', 'yeah', 'sure', 'ok sure', 'please', 'yes please', 'go ahead', 'do it',
  'si', 'si claro', 'dale', 'vale', 'claro que si', 'por favor si', 'hazlo',
  'oui', "d'accord", 'ok merci', 'haan', 'ha', 'theek hai',
])
export function ehAceiteCurto(mensagem: string): boolean {
  const t = sem(mensagem)
  return t.length > 0 && t.length <= 20 && ACEITES.has(t)
}

/** A última fala do Life ofereceu algo (pergunta de "quer que eu...", "posso...", "bora...?"). */
export function lifeOfereceu(ultimaDoLife: string | null | undefined): boolean {
  if (!ultimaDoLife) return false
  const t = sem(ultimaDoLife.replace(/\[\[[^\]]*\]\]/g, ''))
  if (!/\?\s*$/.test(ultimaDoLife.replace(/\[\[[^\]]*\]\]/g, '').trim())) return false
  return /\b(quer que eu|quer|posso|bora|topa|prefere que eu|te mando|te passo|monto|coloco|ponho|anoto|shall i|want me to|should i|do you want|can i|quieres que|te paso|lo pongo|puedo)\b/.test(t)
}

/** Linha do prompt sobre a cota, ou '' (nada a dizer, ou conversa emocional). */
export function linhaCota(restantes: number | null, emocional: boolean): string {
  if (restantes === null || emocional) return ''
  if (restantes === 2) {
    return '\n\nCOTA DE HOJE: depois desta resposta ela tem mais 2 mensagens hoje. No fim, numa frase natural e leve, diga isso do seu jeito (ex.: "Hoje a gente tem mais duas mensagens; me conta o que é mais importante."). Sem número de plano, sem preço.'
  }
  if (restantes === 0) {
    return '\n\nÚLTIMA RESPOSTA DE HOJE: esta é a última mensagem dela hoje. Resolva algo concreto agora, nesta resposta (nunca mande procurar um botão ou uma tela), e feche dizendo, numa frase, que amanhã você lembra de onde pararam. Não termine com pergunta.'
  }
  return ''
}

export type HumorChat = 'normal' | 'escutando' | 'feliz' | 'cozinhando' | 'treino'
const HUMORES: readonly HumorChat[] = ['normal', 'escutando', 'feliz', 'cozinhando', 'treino']

export const REGRA_HUMOR = `

ROSTO DO LIFE: na última linha, depois de tudo, escreva [[HUMOR: normal|escutando|feliz|cozinhando|treino]] com o rosto que combina com a sua resposta: escutando em desabafo, cansaço ou dia difícil; feliz quando ela conta algo bom ou uma conquista; cozinhando só quando o assunto é comida ou receita; treino quando é treino; normal no resto. O app esconde essa linha.`

const MARCA_HUMOR = /\[\[\s*HUMOR\s*:\s*([a-zà-ú_]+)\s*\]\]/i
const MARCA_HUMOR_QUALQUER = /\[\[\s*HUMOR\b[^\]]*\]\]/gi
const MARCA_HUMOR_ABERTA = /\[\[\s*HUMOR\b[^\]]*\]?\s*$/i

export function extrairHumor(resposta: string): { texto: string; humor: HumorChat | null } {
  const m = resposta.match(MARCA_HUMOR)
  const bruto = m ? sem(m[1]) : ''
  const humor = (HUMORES as readonly string[]).includes(bruto) ? bruto as HumorChat : bruto === 'pensando' ? 'normal' : null
  const texto = resposta.replace(MARCA_HUMOR_QUALQUER, '').replace(MARCA_HUMOR_ABERTA, '').trimEnd()
  return { texto, humor }
}

/**
 * O rosto que vai pro app. Em desabafo, nada de chapéu de chef nem festa:
 * escutando. Ação feita: feliz ("pronto"). Chef só com comida na conversa.
 */
export function humorFinal(
  doModelo: HumorChat | null,
  c: { emocional: boolean; comida: boolean; treino: boolean; feito: boolean },
): HumorChat {
  if (c.emocional) return 'escutando'
  if (c.feito) return 'feliz'
  if (doModelo === 'cozinhando' && !c.comida) return 'normal'
  if (doModelo === 'treino' && !c.treino) return 'normal'
  return doModelo ?? 'normal'
}
