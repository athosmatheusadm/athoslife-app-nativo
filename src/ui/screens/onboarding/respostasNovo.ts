import type { Objetivo, Sexo } from '@domain/entities/profile'
import type { Localidade } from '@domain/rules/localidade'
import { calcularMetasIniciais, type FrequenciaTreino } from '@domain/rules/metasIniciais'
import type { DadosOnboarding } from '@data/repositories/profileRepository'

/**
 * Respostas do onboarding novo (public/onboarding, HTML do dono aprovado em
 * 29/10) -> o mesmo DadosOnboarding que o antigo gravava.
 *
 * A página guarda os VALORES em português ("Perder gordura", "Em casa"),
 * em qualquer idioma: aqui eles viram os códigos do banco. O que a pessoa
 * digitou (alimentos, alergia, dificuldade, suplemento) vai como veio.
 */

/** Formato de window.athosOnboarding.getData() (schemaVersion 1). */
export interface RespostasNovo {
  schemaVersion: number
  locale: string
  profile: { name: string; age: number | null; sex: string | null }
  body: { heightCm: number; weightKg: number; units: 'metric' | 'imperial'; goal: string | null }
  training?: { perWeek: string | null; places: string[] }
  sleep: { minutes: number | null; varies: boolean; wakeFeeling: string | null }
  food: {
    mealsChoice: string | null
    locations: string[]
    likesList: string[]
    dislikesList: string[]
    allergies: { answer: string | null; details: string | null }
  }
  habits: { selected: string[]; none: boolean }
  supplements: { answer: string | null; items: string[] }
  hydration: { litres: number | null; unknown: boolean; stress: string | null }
}

const SEXO: Record<string, Sexo> = {
  Masculino: 'masculino',
  Feminino: 'feminino',
  'Prefiro não dizer': 'prefiro_nao_dizer',
}

const OBJETIVO: Record<string, { codigo: string; objetivo: Objetivo }> = {
  'Perder gordura': { codigo: 'perder_gordura', objetivo: 'emagrecer' },
  'Ganhar massa muscular': { codigo: 'ganhar_massa', objetivo: 'massa' },
  'Melhorar hábitos': { codigo: 'melhorar_habitos', objetivo: 'manter' },
  'Melhorar meu condicionamento': { codigo: 'condicionamento', objetivo: 'manter' },
}

const FREQUENCIAS: readonly FrequenciaTreino[] = ['1x', '2-3x', '4-5x', '6x+']
const DIAS_POR_FREQUENCIA: Record<FrequenciaTreino, number> = { '1x': 1, '2-3x': 3, '4-5x': 5, '6x+': 6 }

const LOCAL_TREINO: Record<string, string> = { Academia: 'academia', 'Em casa': 'casa', 'Ao ar livre': 'ar_livre' }
const ONDE_COME: Record<string, string> = {
  'Em casa': 'casa',
  'No trabalho': 'trabalho',
  'Em restaurantes': 'restaurante',
  'Depende do dia': 'depende',
}
const REFEICOES: Record<string, string> = { '2-3': '2-3', '4': '4', '5+': '5+', varia: 'sem_rotina' }
const ACORDAR: Record<string, string> = {
  Descansado: 'descansado',
  'Mais ou menos descansado': 'mais_ou_menos',
  Cansado: 'cansado',
  'Varia muito': 'varia',
}
const ESTRESSE: Record<string, string> = { Baixo: 'baixo', Moderado: 'moderado', Alto: 'alto' }

function faixaSono(minutos: number | null): string | null {
  if (minutos === null) return null
  if (minutos < 360) return '<6h'
  if (minutos < 480) return '6-7h'
  return '8h+'
}

function faixaAgua(litros: number | null): string | null {
  if (litros === null) return null
  if (litros < 1) return '<1L'
  if (litros < 2) return '1-2L'
  if (litros < 3) return '2-3L'
  return '3L+'
}

/** Academia + casa/ar livre = ambos; ar livre sozinho treina como em casa (sem aparelhos). */
function localTreino(locais: string[]): DadosOnboarding['localTreino'] {
  const academia = locais.includes('academia')
  const fora = locais.includes('casa') || locais.includes('ar_livre')
  if (academia && fora) return 'ambos'
  if (academia) return 'academia'
  return fora ? 'casa' : null
}

/** "Amendoim, lactose; glúten" -> ["Amendoim", "lactose", "glúten"] */
function listaDigitada(texto: string | null): string[] {
  return (texto ?? '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20)
}

/** null = falta algo que as metas precisam (a página já valida; aqui é a última barreira). */
export function paraDadosOnboarding(r: RespostasNovo, localidade: Localidade): DadosOnboarding | null {
  const nome = r.profile.name.trim()
  const idade = r.profile.age
  const alturaCm = Math.round(r.body.heightCm)
  const pesoKg = Math.round(r.body.weightKg * 10) / 10
  if (!nome || idade === null || !Number.isInteger(idade) || idade < 18 || idade > 100) return null
  if (!(alturaCm >= 100 && alturaCm <= 250) || !(pesoKg >= 30 && pesoKg <= 350)) return null
  if (!r.body.goal) return null

  const objetivo = OBJETIVO[r.body.goal] ?? { codigo: 'outro', objetivo: 'manter' as Objetivo }
  const frequencia = FREQUENCIAS.find((f) => f === r.training?.perWeek) ?? null
  const sexo = r.profile.sex ? SEXO[r.profile.sex] ?? null : null
  const locais = (r.training?.places ?? []).map((l) => LOCAL_TREINO[l]).filter((l): l is string => !!l)
  const alergias = r.food.allergies.answer === 'yes' ? listaDigitada(r.food.allergies.details) : []

  const metas = calcularMetasIniciais({ pesoKg, alturaCm, idade, sexo, objetivo: objetivo.objetivo, frequencia })

  return {
    nome,
    idade,
    sexo,
    alturaCm,
    pesoKg,
    pesoMeta: null,
    objetivo: objetivo.objetivo,
    localTreino: localTreino(locais),
    diasTreino: frequencia ? DIAS_POR_FREQUENCIA[frequencia] : null,
    restricoes: alergias,
    metas,
    localidade: { ...localidade, unidades: r.body.units === 'imperial' ? 'imperial' : 'metrico' },
    respostas: {
      versao: 2,
      objetivos: [objetivo.codigo],
      // "Outro": o que a pessoa escreveu.
      objetivo_texto: OBJETIVO[r.body.goal] ? null : r.body.goal,
      sono: faixaSono(r.sleep.minutes),
      sono_minutos: r.sleep.minutes,
      sono_varia: r.sleep.varies,
      ao_acordar: r.sleep.wakeFeeling ? ACORDAR[r.sleep.wakeFeeling] ?? null : null,
      frequencia_treino: frequencia,
      locais_treino: locais,
      refeicoes_por_dia: r.food.mealsChoice ? REFEICOES[r.food.mealsChoice] ?? null : null,
      onde_come: r.food.locations.map((l) => ONDE_COME[l]).filter(Boolean),
      alimentos_gosta: r.food.likesList,
      alimentos_nao_gosta: r.food.dislikesList,
      // Dificuldades da tela de hábitos ("Cansaço", "Falta de tempo" ou o que a pessoa escreveu).
      obstaculos: r.habits.none ? [] : r.habits.selected,
      tem_alergia: r.food.allergies.answer === 'yes' ? true : r.food.allergies.answer === 'no' ? false : null,
      suplementos: r.supplements.items,
      suplementos_resposta: r.supplements.answer,
      agua_habitual: r.hydration.unknown ? null : faixaAgua(r.hydration.litres),
      agua_litros: r.hydration.unknown ? null : r.hydration.litres,
      estresse: r.hydration.stress ? ESTRESSE[r.hydration.stress] ?? null : null,
    },
  }
}
