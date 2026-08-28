import { supabase } from '@data/supabase/client'
import type { MascoteModo, Plano, Profile } from '@domain/entities/profile'

/** Linha crua da tabela profiles. snake_case morre nesta fronteira. */
interface ProfileRow {
  id: string
  nome: string | null
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
}
