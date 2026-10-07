import { receitasRepository } from '@data/repositories/receitasRepository'
import { criacoesRepository } from '@data/repositories/criacoesRepository'
import { gerarReceitaComIA } from '@data/ai/recipeAi'
import { temAcessoPremium } from '@domain/rules/access'
import type { Profile } from '@domain/entities/profile'
import type {
  ContextoReceita,
  Receita,
  ReceitaCriada,
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
   * Aberto pra todos: a cota é do servidor (limite_ia 'recipe' +
   * dia_da_cota: grátis 1/semana, pago 10/dia). O que é do pago aqui: mirar no que falta do dia —
   * pro grátis os macros não vão (a receita só respeita ingredientes e
   * restrições).
   */
  async montarComLife(params: {
    profile: Pick<Profile, 'plano' | 'trialExpira'>
    ingredientesDisponiveis: readonly string[]
    restricoes: readonly string[]
    objetivo: string | null
    macrosRestantes: Macros
    categoriaDesejada?: string | null
  }): Promise<ReceitaGerada> {
    const premium = temAcessoPremium(params.profile)
    const contexto: ContextoReceita = {
      ingredientesDisponiveis: params.ingredientesDisponiveis,
      restricoes: params.restricoes,
      objetivo: params.objetivo,
      macrosRestantes: premium ? params.macrosRestantes : { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 },
      categoriaDesejada: params.categoriaDesejada ?? null,
    }
    return gerarReceitaComIA(contexto)
  },

  // ── Minhas criações (receitas do Life que a pessoa salvou) ──

  listarCriacoes(): Promise<ReceitaCriada[]> {
    return criacoesRepository.listar()
  },

  buscarCriacao(id: string): Promise<ReceitaCriada | null> {
    return criacoesRepository.buscar(id)
  },

  salvarCriacao(receita: ReceitaGerada): Promise<string> {
    return criacoesRepository.salvar(receita)
  },

  /** "Fiz!" — guarda a foto do prato que a pessoa fez. Devolve a URL pra mostrar. */
  definirFotoCriacao(id: string, foto: { base64: string; mime: string }): Promise<string | null> {
    return criacoesRepository.definirFoto(id, foto)
  },

  excluirCriacao(id: string): Promise<void> {
    return criacoesRepository.excluir(id)
  },
}
