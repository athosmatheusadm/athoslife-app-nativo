/**
 * Tetos de registro. Ninguém come 5 kg de um item numa refeição nem bebe
 * 5 L de uma vez; acima disso é dedo escorregando (999.999 g de arroz viraram
 * 1,6 milhão de kcal no teste e estragaram gráficos e metas). O banco tem a
 * mesma trava (db/athoslife_limites_registro_migration.sql).
 */
export const MAX_GRAMAS_ITEM = 5000
export const MAX_KCAL_ITEM = 50000
export const MAX_ML_AGUA = 5000

/** Gramas digitadas -> inteiro entre 0 e o teto. */
export function limitarGramas(g: number): number {
  if (!Number.isFinite(g) || g <= 0) return 0
  return Math.min(Math.round(g), MAX_GRAMAS_ITEM)
}
