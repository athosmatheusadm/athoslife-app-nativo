/**
 * Quantos dias a pessoa ficou sem abrir o app — decide o Life "resgate"
 * (caneca "Cadê você?") na Home.
 *
 * Não dá pra usar profiles.last_app_open: o SessionProvider atualiza esse
 * campo no boot, antes da Home ler o perfil. Então o aparelho guarda a
 * última abertura dele, lida UMA vez por sessão do app.
 */
const CHAVE = 'athoslife:ultima-abertura'
let calculado: number | null = null

export function diasSemAbrir(): number {
  if (calculado !== null) return calculado
  let dias = 0
  try {
    const anterior = Number(localStorage.getItem(CHAVE))
    if (anterior > 0) dias = Math.floor((Date.now() - anterior) / 86_400_000)
    localStorage.setItem(CHAVE, String(Date.now()))
  } catch {
    dias = 0
  }
  calculado = dias
  return dias
}

/** A partir de quantos dias fora o Life aparece no modo resgate. */
export const DIAS_PARA_RESGATE = 3

/**
 * Life da Home: grande lá em cima só no PRIMEIRO acesso do dia à Home; nos
 * outros ele fica no canto inferior esquerdo (decisão do dono, 29/09).
 * Chamar uma vez por montagem da Home (useState inicial).
 */
const CHAVE_TOPO = 'athoslife:life-topo-dia'

export function primeiroAcessoDoDiaNaHome(hojeISO: string): boolean {
  try {
    if (localStorage.getItem(CHAVE_TOPO) === hojeISO) return false
    localStorage.setItem(CHAVE_TOPO, hojeISO)
    return true
  } catch {
    return true
  }
}
