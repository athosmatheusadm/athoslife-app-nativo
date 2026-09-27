/**
 * Datas "de calendário" (YYYY-MM-DD) no fuso do APARELHO, não em UTC.
 *
 * `new Date().toISOString().slice(0, 10)` devolve a data de Londres: no
 * Brasil, das 21h à meia-noite, já é "amanhã". E `new Date('2026-09-27')`
 * é meia-noite UTC — formatado aqui vira dia 26. Estas duas funções evitam
 * os dois erros. (O resto do app ainda usa o jeito antigo — ver WORKLOG
 * 2026-09-27, correção única pendente junto com as funções do banco.)
 */

export function dataLocalISO(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

/** "2026-09-27" -> meia-noite LOCAL desse dia. */
export function dataDeISO(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}
