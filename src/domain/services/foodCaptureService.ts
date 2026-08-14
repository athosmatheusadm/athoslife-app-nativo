import { analisarFoto } from '@data/ai/aiProxy'
import { alimentosRepository } from '@data/repositories/alimentosRepository'
import {
  refeicoesRepository,
  type RefeicaoSalva,
  type TipoRefeicao,
} from '@data/repositories/refeicoesRepository'
import { montarRascunho } from '@domain/rules/foodReconciliation'
import {
  somarMacros,
  type Macros,
  type RefeicaoRascunho,
} from '@domain/entities/food'

/**
 * Serviço de captura de comida — a fachada do "scanner".
 *
 * A UI conversa só com este serviço. Ela não sabe que existe Gemini,
 * tabela `alimentos` ou dupla escrita. Isso mantém a tela burra (só
 * apresentação) e a lógica reutilizável por Android e iOS.
 *
 * Fluxo em duas etapas, de propósito:
 *   1) capturar(foto)  -> devolve um rascunho editável (NÃO salva nada)
 *   2) confirmar(rascunho) -> só aqui vira refeição no banco
 *
 * O passo do meio (usuário revisa) é o que tira a "casca vazia":
 * a IA propõe, a pessoa confirma. Nada de estimativa indo direto pro diário.
 */
export const foodCaptureService = {
  /**
   * Etapa 1: manda a foto pro Gemini, reconcilia com a base e devolve
   * um rascunho pronto para a tela de revisão. Não persiste nada.
   *
   * @param base64 imagem sem o prefixo `data:image/...;base64,`
   */
  async capturar(base64: string): Promise<RefeicaoRascunho> {
    // A base é pequena e de leitura pública: carrega junto para reconciliar.
    const [visao, base] = await Promise.all([
      analisarFoto(base64),
      alimentosRepository.carregarTodos(),
    ])

    const { descricao, confianca, observacao, itens } = montarRascunho(visao, base)
    return { descricao, confianca, observacao, itens }
  },

  /** Total ao vivo enquanto o usuário edita o rascunho na tela de revisão. */
  totalAtual(rascunho: RefeicaoRascunho): Macros {
    return somarMacros(rascunho.itens)
  },

  /**
   * Etapa 2: confirma o rascunho (já revisado) e salva como refeição.
   * Só o que estiver marcado com `incluir` entra.
   */
  async confirmar(params: {
    rascunho: RefeicaoRascunho
    tipo: TipoRefeicao
    fotoUrl?: string | null
  }): Promise<RefeicaoSalva> {
    return refeicoesRepository.salvarDoScanner({
      rascunho: params.rascunho,
      tipo: params.tipo,
      fotoUrl: params.fotoUrl ?? null,
    })
  },
}
