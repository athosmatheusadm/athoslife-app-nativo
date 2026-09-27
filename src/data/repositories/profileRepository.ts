import { supabase } from '@data/supabase/client'
import type { MascoteModo, Plano, Profile, Sexo } from '@domain/entities/profile'

/** Linha crua da tabela profiles. snake_case morre nesta fronteira. */
interface ProfileRow {
  id: string
  nome: string | null
  avatar_url: string | null
  sexo: string | null
  altura_cm: number | null
  idade: number | null
  peso_atual: number | null
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
