/**
 * Check-in emocional — humor do dia (1 a 5).
 *
 * Grava em checkins_emocionais (tabela que já existe no banco, com RLS).
 * O registro alimenta os insights da IA depois — por isso guardamos o dia,
 * não só o valor solto.
 *
 * Voz: acolhe conforme o que a pessoa sente. Humor baixo não é problema a
 * resolver — é sentimento a acolher. TypeScript puro.
 */

export type NivelHumor = 1 | 2 | 3 | 4 | 5

export interface CheckinHumor {
  readonly nivel: NivelHumor
  readonly data: Date
}

/** Os cinco humores do card, na ordem do print (triste -> feliz). */
export const HUMORES: ReadonlyArray<{ nivel: NivelHumor; emoji: string }> = [
  { nivel: 1, emoji: '😞' },
  { nivel: 2, emoji: '😕' },
  { nivel: 3, emoji: '😐' },
  { nivel: 4, emoji: '🙂' },
  { nivel: 5, emoji: '😄' },
]

/**
 * Resposta acolhedora conforme o humor. Reconhece o que a pessoa sente
 * sem forçar positividade — dia difícil é acolhido, não "consertado".
 */
export function respostaHumor(nivel: NivelHumor): string {
  switch (nivel) {
    case 1:
      return 'Anotado. Dias difíceis também fazem parte — tô aqui com você.'
    case 2:
      return 'Obrigado por compartilhar. Vamos com calma hoje.'
    case 3:
      return 'Anotado! Um dia de cada vez.'
    case 4:
      return 'Que bom te ver assim! Bora manter o ritmo.'
    case 5:
      return 'Adorei essa energia! Segura essa onda 🔥'
  }
}
