import type { Objetivo, Sexo } from '@domain/entities/profile'
import type { Localidade, Unidades } from '@domain/rules/localidade'
import { calcularMetasIniciais, type FrequenciaTreino } from '@domain/rules/metasIniciais'
import { lbParaKg, lerNumero, pesPolegadasParaCm } from '@domain/rules/unidades'
import type { DadosOnboarding } from '@data/repositories/profileRepository'

/**
 * Estado central do onboarding (referência do dono:
 * athoslife_onboarding_inteligente_CLAUDE_REFERENCE_v3_10_TELAS.html).
 *
 * Os valores guardados são CÓDIGOS neutros de idioma ('perder_gordura',
 * 'academia'...), não o texto da tela — assim o resumo, o banco e o Life
 * entendem igual em qualquer idioma.
 */

export type ObjetivoOnb = 'perder_gordura' | 'ganhar_massa' | 'melhorar_habitos' | 'outro'
export type RotinaOnb = 'trabalho_estudo' | 'flexivel' | 'remoto' | 'outro'
export type SonoOnb = '<6h' | '6-7h' | '8h+'
export type LocalOnb = 'academia' | 'casa' | 'ambos'
export type TipoTreinoOnb = 'musculacao' | 'funcional' | 'cardio' | 'outro'
export type RefeicoesOnb = '2-3' | '4' | '5+' | 'sem_rotina'
export type OndeComeOnb = 'casa' | 'trabalho' | 'restaurante' | 'depende'
export type ObstaculoOnb = 'doces' | 'comer_fora' | 'comer_tarde' | 'refrigerante' | 'motivacao' | 'rotina'
export type SuplementoOnb = 'whey' | 'creatina' | 'albumina' | 'nenhum' | 'outro'
export type AguaOnb = '<1L' | '1-2L' | '2-3L' | '3L+'
export type EstresseOnb = 'baixo' | 'moderado' | 'alto'
export type SexoOnb = 'masculino' | 'feminino' | 'prefiro_nao_dizer'

export interface EstadoOnboarding {
  etapa: number
  nome: string
  idade: string
  sexo: SexoOnb | null
  unidades: Unidades
  /** Métrico: "175" (cm). Imperial: pés + polegadas separados. */
  alturaCm: string
  alturaPes: string
  alturaPol: string
  /** Na unidade escolhida (kg ou lb). */
  peso: string
  objetivos: ObjetivoOnb[]
  rotina: RotinaOnb[]
  sono: SonoOnb | null
  frequencia: FrequenciaTreino | null
  locais: LocalOnb[]
  tiposTreino: TipoTreinoOnb[]
  refeicoes: RefeicoesOnb | null
  ondeCome: OndeComeOnb[]
  gosta: string[]
  naoGosta: string[]
  obstaculos: ObstaculoOnb[]
  alergia: boolean | null
  alergias: string[]
  suplementos: SuplementoOnb[]
  agua: AguaOnb | null
  estresse: EstresseOnb | null
}

export const TOTAL_ETAPAS = 10

export function estadoInicial(unidades: Unidades, nome: string | null): EstadoOnboarding {
  return {
    etapa: 0,
    nome: nome ?? '',
    idade: '',
    sexo: null,
    unidades,
    alturaCm: '',
    alturaPes: '',
    alturaPol: '',
    peso: '',
    objetivos: [],
    rotina: [],
    sono: null,
    frequencia: null,
    locais: [],
    tiposTreino: [],
    refeicoes: null,
    ondeCome: [],
    gosta: [],
    naoGosta: [],
    obstaculos: [],
    alergia: null,
    alergias: [],
    suplementos: [],
    agua: null,
    estresse: null,
  }
}

// ---------------------------------------------------------------
// Progresso salvo no aparelho: fechar o app e continuar de onde parou.
// ---------------------------------------------------------------
const CHAVE = 'athoslife:onboarding'

export function lerProgresso(userId: string): EstadoOnboarding | null {
  try {
    const cru = localStorage.getItem(`${CHAVE}:${userId}`)
    return cru ? (JSON.parse(cru) as EstadoOnboarding) : null
  } catch {
    return null
  }
}

export function salvarProgresso(userId: string, e: EstadoOnboarding): void {
  try {
    localStorage.setItem(`${CHAVE}:${userId}`, JSON.stringify(e))
  } catch {
    // sem storage: só perde o "continuar de onde parou"
  }
}

export function limparProgresso(userId: string): void {
  try {
    localStorage.removeItem(`${CHAVE}:${userId}`)
  } catch {
    // idem
  }
}

// ---------------------------------------------------------------
// Leitura dos campos numéricos (sempre devolve métrico)
// ---------------------------------------------------------------
export function idadeNumero(e: EstadoOnboarding): number | null {
  const n = lerNumero(e.idade)
  return n !== null && Number.isInteger(n) && n >= 16 && n <= 100 ? n : null
}

export function alturaEmCm(e: EstadoOnboarding): number | null {
  if (e.unidades === 'imperial') {
    const pes = lerNumero(e.alturaPes)
    const pol = e.alturaPol.trim() === '' ? 0 : Number(e.alturaPol.replace(',', '.'))
    if (pes === null || !Number.isFinite(pol) || pol < 0 || pol >= 12) return null
    const cm = pesPolegadasParaCm(pes, pol)
    return cm >= 100 && cm <= 250 ? cm : null
  }
  const cm = lerNumero(e.alturaCm)
  return cm !== null && cm >= 100 && cm <= 250 ? Math.round(cm) : null
}

export function pesoEmKg(e: EstadoOnboarding): number | null {
  const n = lerNumero(e.peso)
  if (n === null) return null
  const kg = e.unidades === 'imperial' ? lbParaKg(n) : n
  return kg >= 30 && kg <= 350 ? Math.round(kg * 10) / 10 : null
}

/** Objetivo principal no formato do banco (profiles.objetivo). */
export function objetivoPrincipal(e: EstadoOnboarding): Objetivo {
  if (e.objetivos.includes('perder_gordura')) return 'emagrecer'
  if (e.objetivos.includes('ganhar_massa')) return 'massa'
  return 'manter'
}

function sexoDominio(s: SexoOnb | null): Sexo | null {
  return s
}

const DIAS_POR_FREQUENCIA: Record<FrequenciaTreino, number> = { '1x': 1, '2-3x': 3, '4-5x': 5, '6x+': 6 }

export function metasDoEstado(e: EstadoOnboarding) {
  const pesoKg = pesoEmKg(e)
  const alturaCm = alturaEmCm(e)
  const idade = idadeNumero(e)
  if (pesoKg === null || alturaCm === null || idade === null) return null
  return calcularMetasIniciais({
    pesoKg,
    alturaCm,
    idade,
    sexo: sexoDominio(e.sexo),
    objetivo: objetivoPrincipal(e),
    frequencia: e.frequencia,
  })
}

/** Erro que impede avançar da etapa (null = pode seguir). Obrigatório só o que as metas precisam. */
export type ErroEtapa = 'nome' | 'idade' | 'medidas' | 'objetivo' | null

export function validarEtapa(e: EstadoOnboarding): ErroEtapa {
  if (e.etapa === 1) {
    if (!e.nome.trim()) return 'nome'
    if (idadeNumero(e) === null) return 'idade'
  }
  if (e.etapa === 2) {
    if (alturaEmCm(e) === null || pesoEmKg(e) === null) return 'medidas'
    if (e.objetivos.length === 0) return 'objetivo'
  }
  return null
}

export function paraDadosOnboarding(e: EstadoOnboarding, localidade: Localidade): DadosOnboarding | null {
  const metas = metasDoEstado(e)
  const idade = idadeNumero(e)
  const alturaCm = alturaEmCm(e)
  const pesoKg = pesoEmKg(e)
  if (!metas || idade === null || alturaCm === null || pesoKg === null) return null

  const localTreino: DadosOnboarding['localTreino'] = e.locais.includes('ambos')
    ? 'ambos'
    : e.locais.includes('academia') && e.locais.includes('casa')
      ? 'ambos'
      : (e.locais[0] ?? null)

  return {
    nome: e.nome.trim(),
    idade,
    sexo: sexoDominio(e.sexo),
    alturaCm,
    pesoKg,
    objetivo: objetivoPrincipal(e),
    localTreino,
    diasTreino: e.frequencia ? DIAS_POR_FREQUENCIA[e.frequencia] : null,
    restricoes: e.alergia ? e.alergias : [],
    metas,
    localidade: { ...localidade, unidades: e.unidades },
    respostas: {
      versao: 1,
      objetivos: e.objetivos,
      rotina: e.rotina,
      sono: e.sono,
      frequencia_treino: e.frequencia,
      locais_treino: e.locais,
      tipos_treino: e.tiposTreino,
      refeicoes_por_dia: e.refeicoes,
      onde_come: e.ondeCome,
      alimentos_gosta: e.gosta,
      alimentos_nao_gosta: e.naoGosta,
      obstaculos: e.obstaculos,
      tem_alergia: e.alergia,
      suplementos: e.suplementos,
      agua_habitual: e.agua,
      estresse: e.estresse,
    },
  }
}
