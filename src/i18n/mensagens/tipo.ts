import type { ptBR } from './pt-BR'

/** Mesmo formato do pt-BR, mas aceitando qualquer texto (não o literal). */
type Alargar<T> = T extends string
  ? string
  : T extends readonly string[]
    ? readonly string[]
    : T extends (...args: infer A) => string
      ? (...args: A) => string
      : { readonly [K in keyof T]: Alargar<T[K]> }

export type Mensagens = Alargar<typeof ptBR>
