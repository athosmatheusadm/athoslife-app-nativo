/**
 * Regras puras da Cozinha ATHOSlife: ler o texto da receita em partes,
 * recalcular porções e escolher as receitas que cabem no resto do dia.
 *
 * TypeScript puro. Sem React, sem Supabase.
 */

import type { Macros } from '@domain/entities/food'
import { formatarConteudo, type Receita, type ReceitaGerada } from '@domain/entities/receita'

/** Receita no formato que a tela mostra — vale pra curada e pra criação do Life. */
export interface ReceitaEstruturada {
  /** "SOBRE O PRATO" (ou o antigo "POR QUE") da curada; subtítulo da criação. */
  readonly porque: string | null
  /** Quantas porções os ingredientes rendem como estão escritos. */
  readonly porcoesBase: number
  /** "porção", "xícara"… — como o rendimento foi escrito. */
  readonly unidadePorcao: string
  readonly ingredientes: readonly string[]
  readonly preparo: readonly string[]
  /** Como servir — separado do preparo pra pessoa achar fácil. */
  readonly montagem: readonly string[]
  readonly dica: string | null
  /** Blocos que não se encaixaram em nenhuma parte (mostrados como texto). */
  readonly extras: readonly { rotulo: string | null; texto: string }[]
}

// Rótulos em pt, en e es (o conteúdo traduzido segue o mesmo formato).
const RE_ROTULO_INGREDIENTES = /^(INGREDIENTES|INGREDIENTS)/i
const RE_ROTULO_PREPARO = /(PREPARO|PREPARATION|PREPARACI[OÓ]N)/i
const RE_ROTULO_DICA = /LIFE/i
const RE_ROTULO_PORQUE = /^(POR QUE|SOBRE|ABOUT)/i
const RE_ROTULO_MONTAGEM = /^(MONTAGEM|PRA SERVIR|TO SERVE|MONTAJE)/i

/** Unidade "porção" em qualquer dos 3 idiomas — a tela traduz pra pessoa. */
export const PORCAO = 'porção'
const SINONIMOS_PORCAO = new Set(['porção', 'serving', 'porción'])

/** Tira o marcador "- " ou "1. " do começo da linha. */
function semMarcador(linha: string): string {
  return linha.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim()
}

function linhas(texto: string): string[] {
  return texto
    .split('\n')
    .map(semMarcador)
    .filter(Boolean)
}

/**
 * Lê "INGREDIENTES (2 porções):" -> 2 porções; "(1 xícara)" -> 1 xícara.
 * Sem número: 1 porção.
 */
export function lerRendimento(rotulo: string): { porcoes: number; unidade: string } {
  const m = rotulo.match(/\((\d+(?:[.,]\d+)?)\s*([^)]*)\)/)
  if (!m) return { porcoes: 1, unidade: PORCAO }
  const n = Number(m[1]!.replace(',', '.'))
  const singular = (m[2] ?? '').trim().replace(/ões$/, 'ão').replace(/iones$/, 'ión').replace(/s$/, '') || PORCAO
  return { porcoes: n > 0 ? n : 1, unidade: SINONIMOS_PORCAO.has(singular) ? PORCAO : singular }
}

/** Quebra o `conteudo` da receita curada nas partes que a tela usa. */
export function estruturarConteudo(conteudo: string): ReceitaEstruturada {
  let porque: string | null = null
  let dica: string | null = null
  let ingredientes: string[] = []
  let preparo: string[] = []
  let montagem: string[] = []
  let rendimento = { porcoes: 1, unidade: PORCAO }
  const extras: { rotulo: string | null; texto: string }[] = []

  for (const bloco of formatarConteudo(conteudo)) {
    const rotulo = bloco.rotulo ?? ''
    if (RE_ROTULO_INGREDIENTES.test(rotulo)) {
      ingredientes = linhas(bloco.texto)
      rendimento = lerRendimento(rotulo)
    } else if (RE_ROTULO_MONTAGEM.test(rotulo)) {
      montagem = linhas(bloco.texto)
    } else if (RE_ROTULO_PREPARO.test(rotulo)) {
      preparo = linhas(bloco.texto)
    } else if (RE_ROTULO_DICA.test(rotulo)) {
      dica = bloco.texto
    } else if (RE_ROTULO_PORQUE.test(rotulo)) {
      porque = bloco.texto
    } else {
      extras.push(bloco)
    }
  }

  return {
    porque,
    porcoesBase: rendimento.porcoes,
    unidadePorcao: rendimento.unidade,
    ingredientes,
    preparo,
    montagem,
    dica,
    extras,
  }
}

/** A criação do Life já vem em partes — só traz pro mesmo formato. */
export function estruturarGerada(r: ReceitaGerada): ReceitaEstruturada {
  const n = Number((r.rendimento.match(/\d+/) ?? ['1'])[0])
  return {
    porque: r.subtitulo || null,
    porcoesBase: n > 0 ? n : 1,
    unidadePorcao: PORCAO,
    ingredientes: [...r.ingredientes],
    preparo: [...r.modoPreparo],
    montagem: [],
    dica: r.dicaLife || null,
    extras: [],
  }
}

// ── Porções ────────────────────────────────────────────────────────────

const FRACOES: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

function formatarNumero(n: number, temUnidadeDeMassa: boolean): string {
  if (temUnidadeDeMassa) return String(n >= 20 ? Math.round(n / 5) * 5 : Math.max(1, Math.round(n)))
  const inteiro = Math.floor(n + 1e-9)
  const resto = n - inteiro
  const simbolo =
    Math.abs(resto) < 0.07 ? '' :
    Math.abs(resto - 0.25) < 0.07 ? '¼' :
    Math.abs(resto - 1 / 3) < 0.05 ? '⅓' :
    Math.abs(resto - 0.5) < 0.07 ? '½' :
    Math.abs(resto - 2 / 3) < 0.05 ? '⅔' :
    Math.abs(resto - 0.75) < 0.07 ? '¾' : null
  if (simbolo === null) return (Math.round(n * 10) / 10).toString().replace('.', ',')
  if (inteiro === 0) return simbolo || '0'
  return `${inteiro}${simbolo}`
}

/**
 * Recalcula os números de uma linha de ingrediente. "100g de frango" x2 ->
 * "200g de frango"; "1/2 banana" x2 -> "1 banana". Percentuais ("cacau
 * 100%") ficam como estão; linha sem número ("Sal a gosto") também.
 */
export function escalarIngrediente(linha: string, fator: number): string {
  if (fator === 1) return linha
  return linha.replace(
    /(\d+(?:[.,]\d+)?\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])(\s*)(%|kg|g|ml|l\b)?/gi,
    (tudo, num: string, espaco: string, unidade: string | undefined) => {
      if (unidade === '%') return tudo
      let valor: number
      if (num in FRACOES) valor = FRACOES[num]!
      else if (num.includes('/')) {
        const [a, b] = num.split('/').map((x) => Number(x.trim().replace(',', '.')))
        valor = b ? a! / b : a!
      } else valor = Number(num.replace(',', '.'))
      if (!Number.isFinite(valor)) return tudo
      const massa = !!unidade && /^(g|kg|ml|l)$/i.test(unidade)
      return `${formatarNumero(valor * fator, massa)}${espaco}${unidade ?? ''}`
    },
  )
}

export function escalarMacros(m: Macros, fator: number): Macros {
  return {
    calorias: Math.round(m.calorias * fator),
    proteina: Math.round(m.proteina * fator),
    carboidrato: Math.round(m.carboidrato * fator),
    gordura: Math.round(m.gordura * fator),
  }
}

// ── Receitas que fecham o dia ──────────────────────────────────────────

/** Abaixo disso não faz sentido sugerir uma receita "pra fechar o dia". */
export const KCAL_MINIMA_SUGESTAO = 150

/**
 * Escolhe até `max` receitas que cabem no que falta do dia. Só considera
 * as liberadas (sugestão trancada frustra) e sem alérgeno da pessoa. Cabe = até 10% acima das kcal
 * que faltam. Entre as que cabem, ganha quem cobre mais da proteína que
 * falta por caloria — proteína é o macro que mais fica pra trás.
 *
 * Variedade (dono, 24/10: "sempre mostra a mesma receita"): a nota ganha um
 * sorteio que muda a cada turno do dia (manhã/tarde/noite). Continua só
 * receita que cabe, mas não é sempre a mesma campeã.
 */
export function receitasQueFechamODia(
  receitas: readonly Receita[],
  restante: Macros,
  max = 3,
  agora: Date = new Date(),
): Receita[] {
  if (restante.calorias < KCAL_MINIMA_SUGESTAO) return []
  const teto = restante.calorias * 1.1
  const turno = `${agora.getFullYear()}-${agora.getMonth()}-${agora.getDate()}-${Math.floor(agora.getHours() / 8)}`
  return receitas
    // Um chá de 5 kcal não "fecha" o dia de ninguém: precisa ocupar ao menos 20% do que falta.
    .filter((r) => !r.bloqueada && r.contemRestricao.length === 0 && r.macros.calorias >= restante.calorias * 0.2 && r.macros.calorias <= teto)
    .map((r) => {
      const prot = restante.proteina > 0 ? Math.min(r.macros.proteina / restante.proteina, 1) : 0
      const ocupa = r.macros.calorias / restante.calorias
      // Receita que usa ~40–90% do que falta "fecha" melhor que um chá de 5 kcal.
      const encaixe = ocupa >= 0.4 && ocupa <= 1.1 ? 1 : ocupa
      return { r, nota: prot * 2 + encaixe + sorteio(`${turno}:${r.id}`) * 1.5 }
    })
    .sort((a, b) => b.nota - a.nota)
    .slice(0, max)
    .map((x) => x.r)
}

/** Número de 0 a 1 que depende só do texto (mesmo turno = mesma ordem, sem pular na tela). */
function sorteio(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

export function macrosRestantes(metas: Macros, consumido: Macros): Macros {
  return {
    calorias: Math.max(metas.calorias - consumido.calorias, 0),
    proteina: Math.max(metas.proteina - consumido.proteina, 0),
    carboidrato: Math.max(metas.carboidrato - consumido.carboidrato, 0),
    gordura: Math.max(metas.gordura - consumido.gordura, 0),
  }
}

/** Refeição mais provável pelo horário — o padrão do "Registrar na refeição". */
export function refeicaoPeloHorario(agora: Date = new Date()): 'cafe' | 'almoco' | 'lanche' | 'jantar' {
  const h = agora.getHours()
  if (h < 5) return 'jantar' // madrugada: ceia/jantar tardio, não café
  if (h < 10) return 'cafe'
  if (h < 15) return 'almoco'
  if (h < 18) return 'lanche'
  return 'jantar'
}

/** "Salada Power de Frango e Grão-de-Bico" -> "salada-power-de-frango-e-grao-de-bico" (nome do arquivo da foto). */
export function slugReceita(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
