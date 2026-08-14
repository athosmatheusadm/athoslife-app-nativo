import { receitasRepository } from '@data/repositories/receitasRepository'
import { gerarReceitaComIA } from '@data/ai/recipeAi'
import { temAcessoPremium } from '@domain/rules/access'
import type { Profile } from '@domain/entities/profile'
import type {
  CategoriaReceita,
  ContextoReceita,
  Receita,
  ReceitaGerada,
} from '@domain/entities/receita'
import type { Macros } from '@domain/entities/food'

/**
 * Fachada da Cozinha ATHOSlife.
 *
 * A UI conversa só com este serviço. Ele decide o bloqueio premium (reusando
 * a MESMA regra de acesso do resto do app) e orquestra o Life.
 */
export const cozinhaService = {
  /**
   * Lista as receitas do mini e-book já com:
   *  - `bloqueada`: premium && usuário sem acesso (mostra cadeado);
   *  - `favoritada`: está nas favoritas.
   *
   * A decisão de acesso é a mesma de todo o app — nada de regra paralela.
   */
  async listar(profile: Pick<Profile, 'plano' | 'trialExpira'>): Promise<Receita[]> {
    const [cruas, favoritas] = await Promise.all([
      receitasRepository.listar(),
      receitasRepository.idsFavoritas(),
    ])
    const temAcesso = temAcessoPremium(profile)

    return cruas.map((r) => ({
      ...r,
      bloqueada: r.premium && !temAcesso,
      favoritada: favoritas.has(r.id),
    }))
  },

  /** Só as favoritadas — para a aba de favoritas. */
  async listarFavoritas(
    profile: Pick<Profile, 'plano' | 'trialExpira'>,
  ): Promise<Receita[]> {
    const todas = await this.listar(profile)
    return todas.filter((r) => r.favoritada)
  },

  async favoritar(receitaId: string): Promise<void> {
    await receitasRepository.favoritar(receitaId)
  },

  async desfavoritar(receitaId: string): Promise<void> {
    await receitasRepository.desfavoritar(receitaId)
  },

  /**
   * O Life monta uma receita com o que a pessoa tem.
   *
   * Regra de negócio: gerar receita é recurso premium (usa IA, que custa).
   * A checagem de acesso final é do backend/RLS; aqui a gente evita nem
   * chamar se o usuário claramente não tem acesso — economiza uma ida à IA.
   */
  async montarComLife(params: {
    profile: Pick<Profile, 'plano' | 'trialExpira'>
    ingredientesDisponiveis: readonly string[]
    restricoes: readonly string[]
    objetivo: string | null
    macrosRestantes: Macros
    categoriaDesejada?: CategoriaReceita | null
  }): Promise<ReceitaGerada> {
    if (!temAcessoPremium(params.profile)) {
      throw new Error('recurso_premium')
    }

    const contexto: ContextoReceita = {
      ingredientesDisponiveis: params.ingredientesDisponiveis,
      restricoes: params.restricoes,
      objetivo: params.objetivo,
      macrosRestantes: params.macrosRestantes,
      categoriaDesejada: params.categoriaDesejada ?? null,
    }
    return gerarReceitaComIA(contexto)
  },
}
