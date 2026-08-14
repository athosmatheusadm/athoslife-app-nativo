/**
 * Navegação de dias do diário alimentar.
 *
 * A Dieta é um DIÁRIO (registro o que comi), com Hoje como padrão.
 * Os outros dias existem numa tirinha horizontal: passado para consultar,
 * futuro para (opcionalmente) planejar. TypeScript puro.
 */

export interface DiaTira {
  readonly data: Date
  readonly rotulo: string // "Hoje", "Seg", "Ter"...
  readonly ehHoje: boolean
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

function mesmaData(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Gera a tira de dias em torno de hoje: `antes` dias no passado e
 * `depois` no futuro. O de hoje ganha rótulo "Hoje".
 */
export function gerarTiraDias(antes = 3, depois = 2, hoje = new Date()): DiaTira[] {
  const tira: DiaTira[] = []
  for (let offset = -antes; offset <= depois; offset++) {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + offset)
    const ehHoje = mesmaData(d, hoje)
    tira.push({
      data: d,
      ehHoje,
      rotulo: ehHoje ? 'Hoje' : (DIAS_SEMANA[d.getDay()] ?? ''),
    })
  }
  return tira
}

/** Cabeçalho do dia selecionado: "Hoje — Segunda" ou "Terça, 04/08". */
export function tituloDia(data: Date, hoje = new Date()): string {
  const nomeCompleto = [
    'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado',
  ][data.getDay()]
  if (mesmaData(data, hoje)) return `Hoje — ${nomeCompleto}`
  const dd = String(data.getDate()).padStart(2, '0')
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  return `${nomeCompleto}, ${dd}/${mm}`
}
