import { analisarFoto } from '@data/ai/aiProxy'
import { alimentosRepository } from '@data/repositories/alimentosRepository'
import { itensRefeicaoRepository, type RefeicaoAlvo } from '@data/repositories/itensRefeicaoRepository'
import { refeicoesRepository } from '@data/repositories/refeicoesRepository'
import { montarRascunho } from '@domain/rules/foodReconciliation'
import { dataLocalISO } from '@domain/rules/datas'
import { somarMacros, type Macros, type RefeicaoRascunho } from '@domain/entities/food'

/**
 * Serviço de captura de comida — a fachada do "scanner".
 *
 * A UI conversa só com este serviço. Ela não sabe que existe Gemini,
 * tabela `alimentos` ou onde os itens moram.
 *
 * Fluxo em duas etapas, de propósito:
 *   1) capturar(foto)  -> devolve um rascunho editável (NÃO salva nada)
 *   2) confirmar(rascunho, refeição) -> só aqui vira alimento no diário
 *
 * O passo do meio (usuário revisa) é o que tira a "casca vazia":
 * a IA propõe, a pessoa confirma. Nada de estimativa indo direto pro diário.
 */
export const foodCaptureService = {
  /**
   * Etapa 1: manda a foto pro Gemini, reconcilia com a base e devolve
   * um rascunho pronto para a tela de revisão. Não persiste nada.
   */
  async capturar(base64: string, mime?: string): Promise<RefeicaoRascunho> {
    const [visao, base] = await Promise.all([
      analisarFoto(base64, mime),
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
   * Etapa 2: grava cada item marcado como alimento da refeição escolhida
   * (a mesma lista da Dieta — dá pra excluir/copiar depois) e registra o
   * histórico do scan.
   */
  async confirmar(params: { rascunho: RefeicaoRascunho; alvo: RefeicaoAlvo; data: Date }): Promise<number> {
    const incluidos = params.rascunho.itens.filter((i) => i.incluir && i.nome.trim() !== '')
    if (incluidos.length === 0) throw new Error('nenhum_item_selecionado')
    for (const item of incluidos) {
      await itensRefeicaoRepository.adicionar(params.alvo, params.data, {
        nome: item.nome.trim(),
        quantidade: `${item.quantidadeG} g`,
        calorias: item.calorias,
        proteina: item.proteina,
        carboidrato: item.carboidrato,
        gordura: item.gordura,
      })
    }
    await refeicoesRepository.registrarScan({ rascunho: params.rascunho, data: dataLocalISO(params.data) })
    return incluidos.length
  },
}
