// Quem é a pessoa (15/11/2026): sexo, idade, corpo e o que ela respondeu no
// onboarding. Antes o Life só recebia nome, objetivo, restrições e gostos de
// comida — não sabia se falava com homem ou mulher e errava a concordância.
//
// Tudo aqui é código neutro vindo do perfil (nada digitado livre além do que
// já passa por `texto`), traduzido para frases curtas do contexto.

import type { Assunto } from './assuntos.ts'

export interface LinhaPerfil {
  t: string
  a: Assunto[] | null
}

export interface DadosPerfil {
  sexo?: unknown
  idade?: unknown
  altura_cm?: unknown
  peso_meta?: unknown
  onboarding_respostas?: unknown
}

/** Linha de tratamento: sempre vai (concordância vale para qualquer assunto). */
export function linhaTratamento(sexo: unknown): string {
  if (sexo === 'masculino') {
    return 'Sexo: homem — fale com ele no masculino, no idioma da conversa (ex.: "cansado", "pronto", "bem-vindo"; es "cansado"; fr "fatigué").'
  }
  if (sexo === 'feminino') {
    return 'Sexo: mulher — fale com ela no feminino, no idioma da conversa (ex.: "cansada", "pronta", "bem-vinda"; es "cansada"; fr "fatiguée").'
  }
  return 'Sexo: não informado — não presuma gênero; prefira frases sem flexão ("bateu cansaço?", "tudo pronto?", "que bom te ver") em vez de escolher masculino ou feminino.'
}

const OBJETIVOS: Record<string, string> = {
  perder_gordura: 'perder gordura',
  ganhar_massa: 'ganhar massa',
  melhorar_habitos: 'melhorar hábitos',
  condicionamento: 'melhorar o condicionamento',
}
const TIPOS_TREINO: Record<string, string> = {
  musculacao: 'musculação', cardio: 'cardio', funcional: 'funcional',
}
const LOCAIS: Record<string, string> = {
  academia: 'academia', casa: 'casa', ar_livre: 'ar livre', ambos: 'academia e casa',
}
const ONDE_COME: Record<string, string> = {
  casa: 'em casa', trabalho: 'no trabalho', restaurante: 'em restaurante', depende: 'onde der',
}
const ROTINA: Record<string, string> = { flexivel: 'flexível', trabalho_estudo: 'de trabalho/estudo' }
const ACORDAR: Record<string, string> = {
  descansado: 'com energia', mais_ou_menos: 'mais ou menos', cansado: 'com cansaço', varia: 'varia muito',
}

const codigo = (v: unknown): string =>
  typeof v === 'string' ? v.replace(/[^\p{L}\p{N}_+<>.\- ]/gu, '').slice(0, 30) : ''

function lista(v: unknown, mapa: Record<string, string>): string {
  if (!Array.isArray(v)) return ''
  return v.map((x) => mapa[codigo(x)] ?? codigo(x).replace(/_/g, ' ')).filter(Boolean).slice(0, 6).join(', ')
}

const numero = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : null
}

/** Linhas do perfil vindas do onboarding (sexo, idade, corpo, rotina, treino, comida). */
export function linhasPerfil(p: DadosPerfil): LinhaPerfil[] {
  const linhas: LinhaPerfil[] = [{ t: linhaTratamento(p.sexo), a: null }]
  const o = (p.onboarding_respostas && typeof p.onboarding_respostas === 'object'
    ? p.onboarding_respostas : {}) as Record<string, unknown>

  const geral: string[] = []
  const idade = numero(p.idade, 10, 110)
  if (idade !== null) geral.push(`${idade} anos`)
  const objetivos = lista((o.objetivos as unknown[] | undefined)?.filter?.((x) => x !== 'outro'), OBJETIVOS)
  // "Outro": o que ela escreveu no onboarding (texto livre, curto e limpo).
  const outro = typeof o.objetivo_texto === 'string'
    ? o.objetivo_texto.replace(/[\r\n\t"`]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 60) : ''
  if (objetivos || outro) geral.push(`quer: ${[objetivos, outro].filter(Boolean).join(', ')}`)
  const rotina = lista(o.rotina, ROTINA)
  if (rotina) geral.push(`rotina ${rotina}`)
  const acordar = ACORDAR[codigo(o.ao_acordar)]
  if (acordar) geral.push(`como acorda: ${acordar}`)
  if (geral.length) linhas.push({ t: `Sobre a pessoa: ${geral.join(' · ')}`, a: null })

  const corpo: string[] = []
  const altura = numero(p.altura_cm, 100, 250)
  if (altura !== null) corpo.push(`altura ${altura} cm`)
  const meta = numero(p.peso_meta, 25, 350)
  if (meta !== null) corpo.push(`peso que quer chegar ${meta} kg`)
  if (corpo.length) linhas.push({ t: `Corpo: ${corpo.join(' · ')}`, a: ['peso', 'comida'] })

  const treino: string[] = []
  const freq = codigo(o.frequencia_treino)
  if (freq) treino.push(`treinava ${freq} por semana`)
  const tipos = lista(o.tipos_treino, TIPOS_TREINO)
  if (tipos) treino.push(`gosta de ${tipos}`)
  const locais = lista(o.locais_treino, LOCAIS)
  if (locais) treino.push(`onde: ${locais}`)
  if (treino.length) linhas.push({ t: `Treino (do onboarding): ${treino.join(' · ')}`, a: ['treino'] })

  const comida: string[] = []
  const refeicoes = codigo(o.refeicoes_por_dia)
  if (refeicoes) comida.push(refeicoes === 'sem_rotina' ? 'refeições sem horário certo' : `${refeicoes} refeições por dia`)
  const onde = lista(o.onde_come, ONDE_COME)
  if (onde) comida.push(`come ${onde}`)
  if (comida.length) linhas.push({ t: `Rotina de comida: ${comida.join(' · ')}`, a: ['comida'] })

  return linhas
}
