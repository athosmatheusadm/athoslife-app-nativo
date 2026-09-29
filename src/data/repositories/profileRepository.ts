import { supabase } from '@data/supabase/client'
import type { MascoteModo, Metas, Objetivo, Plano, Profile, Sexo } from '@domain/entities/profile'
import { normalizarIdioma, type Localidade, type Unidades } from '@domain/rules/localidade'

/** Linha crua da tabela profiles. snake_case morre nesta fronteira. */
interface ProfileRow {
  id: string
  nome: string | null
  avatar_url: string | null
  sexo: string | null
  altura_cm: number | null
  idade: number | null
  peso_atual: number | null
  objetivo: string | null
  peso_meta: number | null
  plano: string
  trial_expira: string | null
  assinatura_ativa: boolean | null
  is_admin: boolean | null
  onboarding_completo: boolean | null
  consentimento_aceito: boolean | null
  consentimento_habitos: boolean | null
  streak_atual: number | null
  maior_streak: number | null
  last_app_open: string | null
  mascote_modo_atual: string | null
  kcal_meta: number | null
  prot_meta: number | null
  carbo_meta: number | null
  gord_meta: number | null
  agua_meta_ml: number | null
  passos_meta: number | null
  idioma: string | null
  pais: string | null
  fuso: string | null
  unidades: string | null
}

/** Tudo que o onboarding grava de uma vez no fim (ver ui/screens/onboarding). */
export interface DadosOnboarding {
  readonly nome: string
  readonly idade: number
  readonly sexo: Sexo | null
  readonly alturaCm: number
  readonly pesoKg: number
  readonly objetivo: Objetivo
  readonly localTreino: 'casa' | 'academia' | 'ambos' | null
  readonly diasTreino: number | null
  readonly restricoes: readonly string[]
  readonly metas: Metas
  readonly localidade: Localidade
  /** Respostas sem coluna própria (rotina, sono, gostos, obstáculos...). */
  readonly respostas: Record<string, unknown>
}

function paraDominio(row: ProfileRow): Profile {
  return {
    id: row.id,
    nome: row.nome,
    avatarUrl: row.avatar_url,
    sexo: (row.sexo as Sexo | null) ?? null,
    alturaCm: row.altura_cm,
    idade: row.idade,
    pesoAtual: row.peso_atual,
    objetivo: (row.objetivo as Objetivo | null) ?? null,
    pesoMeta: row.peso_meta === null ? null : Number(row.peso_meta),
    plano: row.plano as Plano,
    trialExpira: row.trial_expira ? new Date(row.trial_expira) : null,
    assinaturaAtiva: row.assinatura_ativa ?? false,
    isAdmin: row.is_admin ?? false,
    onboardingCompleto: row.onboarding_completo ?? false,
    consentimentoAceito: row.consentimento_aceito ?? false,
    consentimentoHabitos: row.consentimento_habitos ?? false,
    streakAtual: row.streak_atual ?? 0,
    maiorStreak: row.maior_streak ?? 0,
    lastAppOpen: row.last_app_open ? new Date(row.last_app_open) : null,
    mascoteModoAtual: (row.mascote_modo_atual ?? 'active') as MascoteModo,
    metas: {
      kcal: row.kcal_meta ?? 0,
      proteina: row.prot_meta ?? 0,
      carboidrato: row.carbo_meta ?? 0,
      gordura: row.gord_meta ?? 0,
      aguaMl: row.agua_meta_ml ?? 0,
      passos: row.passos_meta ?? 0,
    },
    localidade: {
      idioma: normalizarIdioma(row.idioma),
      pais: row.pais,
      fuso: row.fuso || 'America/Sao_Paulo',
      unidades: (row.unidades === 'imperial' ? 'imperial' : 'metrico') as Unidades,
    },
  }
}

/**
 * Único ponto do app que conhece a tabela profiles.
 * A UI nunca vê snake_case nem string solta de plano.
 */
export const profileRepository = {
  async buscar(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<ProfileRow>()

    if (error) throw error
    return data ? paraDominio(data) : null
  },

  /** Rebaixa planos expirados. Autoridade é do backend. */
  async verificarAcesso(): Promise<void> {
    const { error } = await supabase.rpc('check_access_status')
    if (error) throw error
  },

  /**
   * Atualiza last_app_open e deixa o trigger handle_streak_on_open()
   * decidir o streak. O client NÃO calcula streak — a idempotência
   * contra multi-device depende de a decisão ser do Postgres.
   */
  async registrarAbertura(): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ last_app_open: new Date().toISOString() })
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    if (error) throw error
  },

  /** Aceite da tela de Consentimento (LGPD art. 11 / GDPR art. 9: dado de saúde). */
  async aceitarConsentimento(params: { habitos: boolean; versao: string }): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { error } = await supabase
      .from('profiles')
      .update({
        consentimento_aceito: true,
        consentimento_data: new Date().toISOString(),
        consentimento_versao: params.versao,
        consentimento_habitos: params.habitos,
      })
      .eq('id', userId)
    if (error) throw error
  },

  /** Liga (ou desliga) o consentimento de hábitos — Hábitos pede antes de abrir. */
  async definirConsentimentoHabitos(valor: boolean): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { error } = await supabase.from('profiles').update({ consentimento_habitos: valor }).eq('id', userId)
    if (error) throw error
  },

  /** Fim do onboarding: grava perfil, metas e localidade, e marca como completo. */
  async concluirOnboarding(d: DadosOnboarding): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { error } = await supabase
      .from('profiles')
      .update({
        nome: d.nome,
        idade: d.idade,
        sexo: d.sexo,
        altura_cm: d.alturaCm,
        peso_atual: d.pesoKg,
        peso_inicial: d.pesoKg,
        objetivo: d.objetivo,
        local_treino: d.localTreino,
        dias_treino: d.diasTreino,
        restricoes: d.restricoes,
        kcal_meta: d.metas.kcal,
        prot_meta: d.metas.proteina,
        carbo_meta: d.metas.carboidrato,
        gord_meta: d.metas.gordura,
        agua_meta_ml: d.metas.aguaMl,
        passos_meta: d.metas.passos,
        idioma: d.localidade.idioma,
        pais: d.localidade.pais,
        fuso: d.localidade.fuso,
        unidades: d.localidade.unidades,
        onboarding_respostas: d.respostas,
        onboarding_completo: true,
      })
      .eq('id', userId)
    if (error) throw error
  },

  /** O que o onboarding guardou sobre comida (pra pré-preencher o plano de dieta). */
  async preferenciasAlimentares(): Promise<{
    evitar: string[]
    refeicoesPorDia: string | null
    frequenciaTreino: string | null
  }> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { data, error } = await supabase
      .from('profiles')
      .select('restricoes, onboarding_respostas')
      .eq('id', userId)
      .single<{ restricoes: string[] | null; onboarding_respostas: Record<string, unknown> | null }>()
    if (error) throw error
    const r = data.onboarding_respostas ?? {}
    const naoGosta = Array.isArray(r.alimentos_nao_gosta) ? (r.alimentos_nao_gosta as unknown[]).map(String) : []
    return {
      evitar: [...new Set([...(data.restricoes ?? []), ...naoGosta])],
      refeicoesPorDia: typeof r.refeicoes_por_dia === 'string' ? r.refeicoes_por_dia : null,
      frequenciaTreino: typeof r.frequencia_treino === 'string' ? r.frequencia_treino : null,
    }
  },

  /** Idioma/unidades trocados depois (Perfil > Idioma e região). */
  async atualizarLocalidade(campos: Partial<Localidade>): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { error } = await supabase.from('profiles').update(campos).eq('id', userId)
    if (error) throw error
  },

  /** Atualiza a meta diária de água (litros escolhidos no painel do disco). */
  async atualizarMetaAgua(metaMl: number): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase
      .from('profiles')
      .update({ agua_meta_ml: metaMl })
      .eq('id', userId)
    if (error) throw error
  },

  /** Metas diárias — tela de Metas do Perfil (kcal/proteína/carbo/gordura/passos; água usa atualizarMetaAgua). */
  async atualizarMeta(
    campo: 'kcal_meta' | 'prot_meta' | 'carbo_meta' | 'gord_meta' | 'passos_meta',
    valor: number,
  ): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('profiles').update({ [campo]: valor }).eq('id', userId)
    if (error) throw error
  },

  /** Email vem da sessão de autenticação, não da tabela profiles (fonte única, sem risco de desincronizar). */
  async emailAtual(): Promise<string | null> {
    return (await supabase.auth.getUser()).data.user?.email ?? null
  },

  async atualizarNome(nome: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('profiles').update({ nome }).eq('id', userId)
    if (error) throw error
  },

  /** Objetivo + peso-meta — definidos no card de peso da Home. */
  async atualizarObjetivoPeso(objetivo: Objetivo | null, pesoMeta: number | null): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const { error } = await supabase
      .from('profiles')
      .update({ objetivo, peso_meta: pesoMeta })
      .eq('id', userId)
    if (error) throw error
  },

  /** Altura/idade/peso/sexo — tela de Conta, campos independentes (cada um salva no próprio blur). */
  async atualizarDadosPessoais(
    campo: 'altura_cm' | 'idade' | 'peso_atual' | 'sexo',
    valor: number | string | null,
  ): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('profiles').update({ [campo]: valor }).eq('id', userId)
    if (error) throw error
  },

  /**
   * Sobe a foto pro bucket público `avatars` (caminho `<user_id>/avatar.jpg`,
   * upsert — sempre sobrescreve a mesma foto) e grava a URL pública no perfil.
   */
  async atualizarAvatar(arquivo: Blob): Promise<string> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const caminho = `${userId}/avatar.jpg`
    const { error: erroUpload } = await supabase.storage
      .from('avatars')
      .upload(caminho, arquivo, { upsert: true, contentType: 'image/jpeg' })
    if (erroUpload) throw erroUpload

    const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)
    // Cache-bust: mesmo nome de arquivo sempre, sem isso a imagem antiga fica presa no cache do navegador/app.
    const url = `${data.publicUrl}?v=${Date.now()}`

    const { error: erroPerfil } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', userId)
    if (erroPerfil) throw erroPerfil

    return url
  },
}
