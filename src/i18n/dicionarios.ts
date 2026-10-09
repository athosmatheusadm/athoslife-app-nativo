import type { Idioma } from '@domain/rules/localidade'
import { localidadeAtual } from '@data/localidadeAtual'
import { ptBR } from './mensagens/pt-BR'
import { en } from './mensagens/en'
import { es } from './mensagens/es'
import type { Mensagens } from './mensagens/tipo'

export const DICIONARIOS: Record<Idioma, Mensagens> = { 'pt-BR': ptBR, en, es }

/** Textos no idioma em uso, pra quem não é React (avisos do sistema, repositórios). */
export function mensagensAtuais(): Mensagens {
  return DICIONARIOS[localidadeAtual().idioma] ?? ptBR
}
