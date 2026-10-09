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

// Respostas ao humor moram no i18n: m.home.humor.respostas.
