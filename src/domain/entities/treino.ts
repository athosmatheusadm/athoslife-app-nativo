/**
 * Domínio de treino — três níveis: Local → Treinos nomeados → Exercícios.
 *
 * O usuário escolhe o LOCAL (casa/academia), depois o TREINO (Peito, Braço...)
 * numa tira de abas, e vê/edita os EXERCÍCIOS daquele treino. Alguns treinos
 * vêm prontos (modelos); o usuário cria os seus.
 *
 * Ícones são chaves de SVG (ver ExerciseIcon), nunca emoji.
 * TypeScript puro, reusável por Android e iOS.
 */

export type LocalTreino = 'casa' | 'academia'

export interface Exercicio {
  readonly id: string
  readonly nome: string
  readonly icone: string
  readonly series: number
  readonly repeticoes: number
  readonly concluido: boolean
}

export interface Treino {
  readonly id: string
  readonly local: LocalTreino
  readonly nome: string
  readonly subtitulo: string | null
  readonly icone: string | null
  readonly modelo: boolean
  readonly exercicios: readonly Exercicio[]
}

export const LOCAIS: ReadonlyArray<{ id: LocalTreino; rotulo: string; icone: string }> = [
  { id: 'casa', rotulo: 'Em casa', icone: 'corpo' },
  { id: 'academia', rotulo: 'Academia', icone: 'peito' },
]

export function concluidos(exs: readonly Exercicio[]): number {
  return exs.filter((e) => e.concluido).length
}

export function progressoTreino(exs: readonly Exercicio[]): number {
  if (exs.length === 0) return 0
  return Math.round((concluidos(exs) / exs.length) * 100)
}

export function formatarSeries(series: number, repeticoes: number): string {
  return `${series} × ${repeticoes} repetições`
}

export function rotuloLocal(local: LocalTreino): string {
  return LOCAIS.find((l) => l.id === local)?.rotulo ?? local
}

/** Rótulo curto do treino para a aba (ex.: "Treino A — Peito" -> "Peito"). */
export function rotuloAba(nome: string): string {
  const partes = nome.split('—')
  return (partes[partes.length - 1] ?? nome).trim()
}
