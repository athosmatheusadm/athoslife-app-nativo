import { supabase } from '@data/supabase/client'
import { pesoRepository } from '@data/repositories/pesoRepository'
import type {
  CategoriaConquista,
  Conquista,
  NivelConquista,
} from '@domain/entities/conquista'
import type { Metas, Objetivo } from '@domain/entities/profile'

interface CatalogoRow {
  id: string
  nome: string
  descricao: string | null
  categoria: CategoriaConquista
  nivel: NivelConquista
  icone: string | null
  condicao_dias: number | null
  condicao_tipo: string | null
}

interface DesbloqueioRow {
  conquista_id: string
  data_desbloqueio: string
}

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Maior sequência de dias consecutivos dentro do conjunto de datas dado (ISO yyyy-mm-dd). */
function maiorSequencia(dias: ReadonlySet<string>): number {
  if (dias.size === 0) return 0
  const ordenados = Array.from(dias).sort()
  let maior = 1
  let atual = 1
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = new Date(`${ordenados[i - 1]}T00:00:00.000Z`)
    anterior.setUTCDate(anterior.getUTCDate() + 1)
    const esperado = anterior.toISOString().slice(0, 10)
    atual = ordenados[i] === esperado ? atual + 1 : 1
    maior = Math.max(maior, atual)
  }
  return maior
}

/** Quantas datas distintas em `dias` caem nos últimos `janela` dias (contando hoje). */
function contarNaJanela(dias: ReadonlySet<string>, janelaDias: number, hoje: string): number {
  const limite = new Date(`${hoje}T00:00:00.000Z`)
  limite.setUTCDate(limite.getUTCDate() - (janelaDias - 1))
  const limiteISO = limite.toISOString().slice(0, 10)
  let n = 0
  for (const d of dias) if (d >= limiteISO && d <= hoje) n++
  return n
}

/** Resultado de avaliar uma condição: se está cumprida agora e o progresso (0–100) até lá. */
interface Avaliacao {
  atingida: boolean
  progresso: number
}

function pct(atual: number, meta: number): number {
  if (meta <= 0) return 0
  return Math.min(100, Math.round((atual / meta) * 100))
}

/**
 * Único ponto que avalia as 26 condições do catálogo contra dado real das
 * outras tabelas (streak, treino, dieta, água, peso) e persiste o que
 * desbloqueou. Client-side de propósito — mesmo padrão do resto do app
 * (repositórios TS fazem a conta; Postgres só quando precisa de atomicidade,
 * que não é o caso aqui).
 *
 * `avaliar_conquistas()` nunca existiu de verdade no Postgres apesar do que
 * a documentação antiga do domínio dizia — conferido em 2026-09-24.
 */
export const conquistasRepository = {
  /**
   * Busca o catálogo + o que já está desbloqueado, avalia o que falta,
   * grava os desbloqueios novos (idempotente: UNIQUE user_id+conquista_id
   * já existe no banco) e devolve a lista completa pra galeria.
   */
  async avaliarEListar(metas: Metas): Promise<Conquista[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const [
      catalogo,
      desbloqueios,
      streakRow,
      treinoRows,
      itensRows,
      statusRows,
      aguaRows,
      pesoAlvo,
      resumoPeso,
    ] = await Promise.all([
      supabase
        .from('conquistas_catalogo')
        .select('id, nome, descricao, categoria, nivel, icone, condicao_dias, condicao_tipo')
        .order('ordem')
        .returns<CatalogoRow[]>(),
      supabase
        .from('conquistas_user')
        .select('conquista_id, data_desbloqueio')
        .eq('user_id', userId)
        .returns<DesbloqueioRow[]>(),
      supabase.from('streak').select('maior_streak').eq('user_id', userId).maybeSingle<{ maior_streak: number | null }>(),
      supabase.from('treino_plano').select('concluido_em').eq('user_id', userId).not('concluido_em', 'is', null).returns<{ concluido_em: string }[]>(),
      supabase.from('itens_refeicao').select('data, calorias, proteina, carboidrato, gordura').eq('user_id', userId).returns<{ data: string; calorias: number; proteina: number; carboidrato: number; gordura: number }[]>(),
      supabase.from('refeicoes_status').select('data, tipo, concluida').eq('user_id', userId).eq('concluida', true).returns<{ data: string; tipo: string }[]>(),
      supabase.from('registros_agua').select('data, quantidade_ml').eq('user_id', userId).returns<{ data: string; quantidade_ml: number }[]>(),
      supabase.from('profiles').select('peso_meta, objetivo').eq('id', userId).maybeSingle<{ peso_meta: number | null; objetivo: Objetivo | null }>(),
      pesoRepository.resumo(),
    ])

    if (catalogo.error) throw catalogo.error
    if (desbloqueios.error) throw desbloqueios.error

    const jaDesbloqueadas = new Map<string, string>(
      (desbloqueios.data ?? []).map((d) => [d.conquista_id, d.data_desbloqueio]),
    )

    const hoje = hojeISO()

    // --- sinais agregados, uma vez só, reaproveitados por várias condições ---
    const maiorStreak = streakRow.data?.maior_streak ?? 0

    const diasTreino = new Set((treinoRows.data ?? []).map((r) => r.concluido_em))
    const treinosTotal = diasTreino.size
    const treinosSemana = contarNaJanela(diasTreino, 7, hoje)
    const treinos30Dias = contarNaJanela(diasTreino, 30, hoje)

    const refeicoesTotal = (itensRows.data ?? []).length

    const macrosPorDia = new Map<string, { kcal: number; prot: number; carb: number; gord: number }>()
    for (const it of itensRows.data ?? []) {
      const m = macrosPorDia.get(it.data) ?? { kcal: 0, prot: 0, carb: 0, gord: 0 }
      m.kcal += it.calorias
      m.prot += it.proteina
      m.carb += it.carboidrato
      m.gord += it.gordura
      macrosPorDia.set(it.data, m)
    }

    const tiposPorDia = new Map<string, Set<string>>()
    for (const s of statusRows.data ?? []) {
      const set = tiposPorDia.get(s.data) ?? new Set<string>()
      set.add(s.tipo)
      tiposPorDia.set(s.data, set)
    }
    const diasCompletos = new Set(
      Array.from(tiposPorDia.entries())
        .filter(([, tipos]) => tipos.size >= 4)
        .map(([data]) => data),
    )
    const diaCompletoAlgumaVez = diasCompletos.size > 0
    const maiorSequenciaDietaCompleta = maiorSequencia(diasCompletos)

    const TOLERANCIA_MACRO = 0.1 // ±10% da meta conta como "certo"
    function dentroDaMeta(valor: number, meta: number): boolean {
      if (meta <= 0) return false
      return Math.abs(valor - meta) / meta <= TOLERANCIA_MACRO
    }
    const diasProteinaNaMeta = new Set(
      Array.from(macrosPorDia.entries())
        .filter(([, m]) => dentroDaMeta(m.prot, metas.proteina))
        .map(([data]) => data),
    )
    const maiorSequenciaProteina = maiorSequencia(diasProteinaNaMeta)

    const diasMacrosPerfeitos = new Set(
      Array.from(macrosPorDia.entries())
        .filter(
          ([, m]) =>
            dentroDaMeta(m.kcal, metas.kcal) &&
            dentroDaMeta(m.prot, metas.proteina) &&
            dentroDaMeta(m.carb, metas.carboidrato) &&
            dentroDaMeta(m.gord, metas.gordura),
        )
        .map(([data]) => data),
    )
    const maiorSequenciaMacros = maiorSequencia(diasMacrosPerfeitos)

    const aguaRegistrosTotal = (aguaRows.data ?? []).length
    const aguaPorDia = new Map<string, number>()
    for (const r of aguaRows.data ?? []) {
      aguaPorDia.set(r.data, (aguaPorDia.get(r.data) ?? 0) + r.quantidade_ml)
    }
    const diasAguaNaMeta = new Set(
      Array.from(aguaPorDia.entries())
        .filter(([, ml]) => metas.aguaMl > 0 && ml >= metas.aguaMl)
        .map(([data]) => data),
    )
    const maiorSequenciaAgua = maiorSequencia(diasAguaNaMeta)

    const pesoRegistrosTotal = resumoPeso.registros.length
    const semanasComPeso = new Set(
      resumoPeso.registros.map((r) => {
        const d = new Date(r.data)
        // Semana ISO simplificada: ano+número de semana (bom o bastante pra "1 registro por semana").
        const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        const semana = Math.ceil(((d.getTime() - inicioAno.getTime()) / 86_400_000 + inicioAno.getUTCDay() + 1) / 7)
        return `${d.getUTCFullYear()}-${semana}`
      }),
    )
    const variacaoPeso = Math.abs(resumoPeso.variacao)
    const pesoAtual = resumoPeso.atual
    const pesoMetaAlvo = pesoAlvo.data?.peso_meta ?? null
    const objetivo = pesoAlvo.data?.objetivo ?? null
    const pesoMetaAtingida =
      pesoMetaAlvo !== null && pesoAtual > 0
        ? objetivo === 'emagrecer'
          ? pesoAtual <= pesoMetaAlvo
          : objetivo === 'massa'
            ? pesoAtual >= pesoMetaAlvo
            : Math.abs(pesoAtual - pesoMetaAlvo) <= 1
        : false

    function avaliar(row: CatalogoRow): Avaliacao {
      const alvo = row.condicao_dias ?? 0
      switch (row.condicao_tipo) {
        case 'streak_dias':
          return { atingida: maiorStreak >= alvo, progresso: pct(maiorStreak, alvo) }
        case 'treinos_total':
          return { atingida: treinosTotal >= alvo, progresso: pct(treinosTotal, alvo) }
        case 'treinos_semana':
          return { atingida: treinosSemana >= alvo, progresso: pct(treinosSemana, alvo) }
        case 'treinos_30_dias':
          return { atingida: treinos30Dias >= alvo, progresso: pct(treinos30Dias, alvo) }
        case 'refeicoes_total':
          return { atingida: refeicoesTotal >= alvo, progresso: pct(refeicoesTotal, alvo) }
        case 'dia_completo':
          return { atingida: diaCompletoAlgumaVez, progresso: diaCompletoAlgumaVez ? 100 : 0 }
        case 'proteina_dias':
          return { atingida: maiorSequenciaProteina >= alvo, progresso: pct(maiorSequenciaProteina, alvo) }
        case 'dieta_dias':
          return { atingida: maiorSequenciaDietaCompleta >= alvo, progresso: pct(maiorSequenciaDietaCompleta, alvo) }
        case 'macros_perfeitos':
          return { atingida: maiorSequenciaMacros >= alvo, progresso: pct(maiorSequenciaMacros, alvo) }
        case 'agua_registros':
          return { atingida: aguaRegistrosTotal >= alvo, progresso: pct(aguaRegistrosTotal, alvo) }
        case 'agua_dias':
          return { atingida: maiorSequenciaAgua >= alvo, progresso: pct(maiorSequenciaAgua, alvo) }
        case 'peso_registros':
          return { atingida: pesoRegistrosTotal >= alvo, progresso: pct(pesoRegistrosTotal, alvo) }
        case 'peso_semanas':
          return { atingida: semanasComPeso.size >= alvo, progresso: pct(semanasComPeso.size, alvo) }
        case 'peso_variacao_3kg':
          return { atingida: variacaoPeso >= 3, progresso: variacaoPeso >= 3 ? 100 : 0 }
        case 'peso_meta':
          return { atingida: pesoMetaAtingida, progresso: pesoMetaAtingida ? 100 : 0 }
        default:
          return { atingida: false, progresso: 0 }
      }
    }

    const novasParaGravar: { user_id: string; conquista_id: string }[] = []
    const resultado: Conquista[] = (catalogo.data ?? []).map((row) => {
      const jaTinha = jaDesbloqueadas.get(row.id)
      if (jaTinha) {
        return {
          id: row.id,
          titulo: row.nome,
          descricao: row.descricao ?? '',
          categoria: row.categoria,
          nivel: row.nivel,
          icone: row.icone ?? '🏆',
          desbloqueada: true,
          desbloqueadaEm: new Date(jaTinha),
          progresso: 100,
        }
      }

      const { atingida, progresso } = avaliar(row)
      if (atingida) novasParaGravar.push({ user_id: userId, conquista_id: row.id })

      return {
        id: row.id,
        titulo: row.nome,
        descricao: row.descricao ?? '',
        categoria: row.categoria,
        nivel: row.nivel,
        icone: row.icone ?? '🏆',
        desbloqueada: atingida,
        desbloqueadaEm: atingida ? new Date() : null,
        progresso,
      }
    })

    if (novasParaGravar.length > 0) {
      const { error } = await supabase
        .from('conquistas_user')
        .upsert(novasParaGravar, { onConflict: 'user_id,conquista_id', ignoreDuplicates: true })
      if (error) throw error
    }

    return resultado
  },
}
