/**
 * Check-in v3 do Life: vocabulário fixo, o mesmo da ai-proxy
 * (supabase/functions/ai-proxy/life.ts → SENTIMENTOS). O servidor recusa
 * palavra fora desta lista e deriva energia/agradável dela.
 * Os rótulos (com gênero) moram no i18n: m.home.checkin.sentimentos.
 */

export type Momento = 'manha' | 'tarde' | 'noite'

export type Sentimento =
  | 'irritado' | 'agitado' | 'empolgado' | 'animado'
  | 'estressado' | 'ansioso' | 'motivado' | 'feliz'
  | 'desanimado' | 'entediado' | 'tranquilo' | 'grato'
  | 'esgotado' | 'cansado' | 'relaxado' | 'em_paz'

export type Etiqueta = 'sono' | 'trabalho' | 'treino' | 'comida' | 'familia' | 'relacionamento' | 'saude' | 'dinheiro' | 'nada'

/** Mapa 4×4: linha de cima = mais energia; da esquerda pra direita = mais agradável. */
export const MAPA_SENTIMENTOS: ReadonlyArray<{ chave: Sentimento; energia: number; agradavel: number }> = [
  { chave: 'irritado', energia: 4, agradavel: 1 }, { chave: 'agitado', energia: 4, agradavel: 2 },
  { chave: 'empolgado', energia: 4, agradavel: 3 }, { chave: 'animado', energia: 4, agradavel: 4 },
  { chave: 'estressado', energia: 3, agradavel: 1 }, { chave: 'ansioso', energia: 3, agradavel: 2 },
  { chave: 'motivado', energia: 3, agradavel: 3 }, { chave: 'feliz', energia: 3, agradavel: 4 },
  { chave: 'desanimado', energia: 2, agradavel: 1 }, { chave: 'entediado', energia: 2, agradavel: 2 },
  { chave: 'tranquilo', energia: 2, agradavel: 3 }, { chave: 'grato', energia: 2, agradavel: 4 },
  { chave: 'esgotado', energia: 1, agradavel: 1 }, { chave: 'cansado', energia: 1, agradavel: 2 },
  { chave: 'relaxado', energia: 1, agradavel: 3 }, { chave: 'em_paz', energia: 1, agradavel: 4 },
]

/** Primeiro toque: cinco palavras pra hora do dia. */
export const SUGESTOES_CHECKIN: Record<Momento, readonly Sentimento[]> = {
  manha: ['cansado', 'tranquilo', 'animado', 'ansioso', 'relaxado'],
  tarde: ['motivado', 'cansado', 'estressado', 'tranquilo', 'feliz'],
  noite: ['cansado', 'tranquilo', 'feliz', 'estressado', 'grato'],
}

export const ETIQUETAS_CHECKIN: readonly Etiqueta[] = [
  'sono', 'trabalho', 'treino', 'comida', 'familia', 'relacionamento', 'saude', 'dinheiro', 'nada',
]

/** Madrugada (0h–4h) ainda é noite: "Bom dia!" às 00:20 soa estranho. */
export function momentoAgora(d: Date = new Date()): Momento {
  const h = d.getHours()
  return h < 5 ? 'noite' : h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite'
}

export function ehSentimento(v: string): v is Sentimento {
  return MAPA_SENTIMENTOS.some((s) => s.chave === v)
}
