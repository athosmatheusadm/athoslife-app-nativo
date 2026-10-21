import { supabase } from '@data/supabase/client'
import {
  streakConstruir,
  streakEvitar,
  tipoDaCategoria,
  type Habito,
  type IntensidadeHabito,
} from '@domain/entities/habito'
import { dataLocalISO } from '@domain/rules/datas'
import { diasPausados } from '@data/lifePausa'

interface HabitoRow {
  icone?: string | null
  id: string
  nome: string
  categoria: string | null
  intensidade: IntensidadeHabito | null
  gatilhos: string[] | null
  horario_risco: string | null
  streak_atual: number | null
  melhor_streak: number | null
  total_recaidas: number | null
  ultima_recaida: string | null
  ultimo_checkin: string | null
  criado_em: string
  ativo: boolean | null
}

function hojeISO(): string {
  return dataLocalISO()
}

function diasAtras(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return dataLocalISO(d)
}

function paraDominio(r: HabitoRow, pausados: ReadonlySet<string>): Habito {
  const tipo = tipoDaCategoria(r.categoria)
  const hoje = hojeISO()
  const ultimaRecaida = r.ultima_recaida ? new Date(r.ultima_recaida) : null

  const streak =
    tipo === 'construir'
      ? streakConstruir(r.streak_atual ?? 0, r.ultimo_checkin, hoje, pausados)
      : streakEvitar(new Date(r.criado_em), ultimaRecaida, hoje)

  // proximaConquista: próximo marco de dias acima do streak atual.
  const marcos = [7, 14, 30, 60, 90, 180, 365]
  const proxima = marcos.find((m) => m > streak) ?? streak + 30

  return {
    id: r.id,
    nome: r.nome,
    emoji: emojiPorCategoria(r.categoria),
    icone: r.icone ?? r.categoria,
    categoria: r.categoria,
    tipo,
    gatilhos: r.gatilhos ?? [],
    horarioRisco: r.horario_risco,
    streakAtual: streak,
    melhorStreak: Math.max(r.melhor_streak ?? 0, streak),
    totalRecaidas: r.total_recaidas ?? 0,
    ultimaRecaida,
    proximaConquista: proxima,
    feitoHoje: r.ultimo_checkin === hoje,
  }
}

/** Emoji por categoria (o banco guarda categoria; o emoji é da UI). */
function emojiPorCategoria(cat: string | null): string {
  switch (cat) {
    case 'doce':
      return '🍫'
    case 'fast_food':
      return '🍟'
    case 'refrigerante':
      return '🥤'
    case 'leitura':
      return '📚'
    case 'sono':
      return '😴'
    case 'agua':
      return '💧'
    case 'meditar':
      return '🧘'
    case 'caminhar':
      return '🚶'
    case 'verduras':
      return '🥦'
    default:
      return '🎯'
  }
}

/**
 * Único ponto que conhece vicios_user/recaidas.
 * O streak é derivado de datas (criado_em/ultima_recaida/ultimo_checkin),
 * não de um contador que precisa de job pra crescer — ver
 * streakEvitar/streakConstruir em domain/entities/habito.ts e
 * db/athoslife_habitos_streak_confiavel_migration.sql.
 */
export const habitosRepository = {
  async listar(): Promise<Habito[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { data, error } = await supabase
      .from('vicios_user')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)
      .order('criado_em', { ascending: true })
      .returns<HabitoRow[]>()

    if (error) throw error
    const pausados = await diasPausados(diasAtras(90))
    return (data ?? []).map((r) => paraDominio(r, pausados))
  },

  /**
   * Registra uma recaída (sem punir). Grava o tropeço e zera o streak.
   * O gatilho e o contexto viram aprendizado — alimentam a IA e os
   * insights futuros ("você costuma escorregar às sextas à noite").
   */
  async registrarRecaida(params: {
    habitoId: string
    gatilho: string | null
    contexto: string | null
  }): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('recaidas').insert({
      user_id: userId,
      vicio_id: params.habitoId,
      gatilho: params.gatilho,
      contexto: params.contexto,
    })
    if (error) throw error
    // O trigger/servidor cuida de zerar streak_atual e incrementar
    // total_recaidas — o client não mexe nesses números diretamente.
  },

  /**
   * Check-in "Fiz hoje" do tipo "construir" — persiste de verdade (antes
   * era só um Set em memória na tela, sumia ao recarregar). A RPC no
   * servidor decide o novo streak (idempotente, quebra sozinha se pulou um
   * dia) — o client não inventa o número, só dispara a ação.
   */
  async registrarCheckin(habitoId: string): Promise<void> {
    const { error } = await supabase.rpc('registrar_checkin_habito', { p_habito_id: habitoId })
    if (error) throw error
  },

  /**
   * "Excluir" = desativar (ativo=false). A linha e as recaídas ficam no banco
   * pro histórico/conquistas e pra exportação de dados; o hábito some da lista
   * e deixa de contar no limite do grátis (trigger limitar_habitos_gratis só
   * olha os ativos).
   */
  async excluir(habitoId: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase
      .from('vicios_user')
      .update({ ativo: false })
      .eq('id', habitoId)
      .eq('user_id', userId)
    if (error) throw error
  },

  async criar(params: {
    icone?: string
    nome: string
    categoria: string | null
    intensidade: IntensidadeHabito
  }): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const { error } = await supabase.from('vicios_user').insert({
      user_id: userId,
      nome: params.nome,
      categoria: params.categoria,
      intensidade: params.intensidade,
      ...(params.icone ? { icone: params.icone } : {}),
    })
    // Triggers do banco: validar_habito (proibidos + consentimento) e
    // limitar_habitos_gratis (no grátis, só 1 hábito ativo).
    if (error?.message.includes('habito_nao_permitido')) throw new Error('habito_nao_permitido')
    if (error?.message.includes('sem_consentimento_habitos')) throw new Error('sem_consentimento_habitos')
    if (error?.message.includes('limite_habitos_gratis')) {
      throw new Error('No plano grátis dá pra acompanhar 1 hábito por vez. Com o plano pago, são quantos você quiser.')
    }
    if (error) throw error
  },
}
