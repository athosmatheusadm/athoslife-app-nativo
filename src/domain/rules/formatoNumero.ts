/**
 * Números no padrão do idioma em uso ("20,4" em pt/es, "20.4" em en).
 * O I18nProvider avisa o idioma; as funções de formatação do domínio
 * (peso, água, carga) usam daqui em vez de trocar ponto por vírgula fixo.
 */
let idioma = 'pt-BR'
/** Unidades do perfil (Perfil > Idioma e região). O banco é sempre métrico. */
let imperial = false

export function definirIdiomaNumeros(i: string): void {
  idioma = i
}

export function definirUnidadesNumeros(u: 'metrico' | 'imperial'): void {
  imperial = u === 'imperial'
}

export function usaImperial(): boolean {
  return imperial
}

/** `casas` = máximo de casas decimais; `minimo` = casas sempre mostradas. */
export function formatarNumero(n: number, casas = 0, minimo = 0): string {
  return new Intl.NumberFormat(idioma, { maximumFractionDigits: casas, minimumFractionDigits: Math.min(minimo, casas) }).format(n)
}

/** kcal sempre inteira (215.7 -> "216"). */
export function fmtKcal(n: number): string {
  return formatarNumero(Math.round(Number(n)))
}

/** Gramas de macro com até 1 casa ("20,4" / "20.4"). */
export function fmtG(n: number): string {
  return formatarNumero(Number(n), 1)
}
