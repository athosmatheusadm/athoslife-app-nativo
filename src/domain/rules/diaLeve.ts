import type { SerieDetalhe } from '@domain/entities/treino'
import { MAPA_SENTIMENTOS, type Etiqueta, type Sentimento } from './checkinLife'

/**
 * Dia leve (pedido do dono, 22/10): no check-in de pouca energia ou com
 * sono/saúde pesando, o Life oferece aliviar as metas SÓ DE HOJE.
 *  - Treino: versão leve (1 série a menos por exercício, mín. 2, carga −20%)
 *    ou caminhada de 20 min no lugar — a pessoa escolhe.
 *  - Passos: meta 30% menor.
 *  - Dieta: igual (dormir mal não muda a necessidade).
 *  - Sequência: o dia conta normalmente.
 *  - Lembretes: menos água hoje.
 * A ficha não muda: carga e séries do treino leve não viram a carga da ficha.
 */

export type TreinoDiaLeve = 'leve' | 'caminhada'

export const DIA_LEVE = {
  seriesAMenos: 1,
  minSeries: 2,
  fatorCarga: 0.8,
  fatorPassos: 0.7,
  caminhadaMin: 20,
  /** Lembretes de água no dia leve (no dia normal vão até o limite diário). */
  maxAgua: 2,
} as const

const energia = (p: Sentimento) => MAPA_SENTIMENTOS.find((s) => s.chave === p)?.energia ?? 3
const agradavel = (p: Sentimento) => MAPA_SENTIMENTOS.find((s) => s.chave === p)?.agradavel ?? 3

/**
 * Oferece o dia leve? Palavra de pouca energia e pouco agradável (cansado,
 * esgotado, desanimado, entediado), ou energia baixa com sono/saúde marcados.
 */
export function sugereDiaLeve(palavra: Sentimento, etiquetas: readonly Etiqueta[]): boolean {
  if (energia(palavra) <= 2 && agradavel(palavra) <= 2) return true
  return energia(palavra) <= 2 && (etiquetas.includes('sono') || etiquetas.includes('saude'))
}

/** Carga em passos de 0,5 kg. */
const arredondarCarga = (kg: number) => Math.round(kg * 2) / 2

/** Séries do treino leve: tira a última (sem ficar abaixo de 2) e alivia a carga. */
export function seriesLeves(series: readonly SerieDetalhe[]): SerieDetalhe[] {
  const qtd = Math.max(Math.min(series.length, DIA_LEVE.minSeries), series.length - DIA_LEVE.seriesAMenos)
  return series.slice(0, qtd).map((s) => ({
    ...s,
    cargaKg: s.cargaKg === null ? null : arredondarCarga(s.cargaKg * DIA_LEVE.fatorCarga),
  }))
}

/** Meta de passos do dia leve, de 100 em 100. */
export const metaPassosLeve = (meta: number) => Math.max(1000, Math.round((meta * DIA_LEVE.fatorPassos) / 100) * 100)
