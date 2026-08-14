import { supabase } from '@data/supabase/client'
import {
  somarMacros,
  type ItemRascunho,
  type RefeicaoRascunho,
} from '@domain/entities/food'

export type TipoRefeicao = 'cafe' | 'almoco' | 'lanche' | 'jantar' | 'extra'

export interface RefeicaoSalva {
  readonly id: string
  readonly nome: string
  readonly tipo: TipoRefeicao
  readonly calorias: number
}

/**
 * `refeicoes` guarda UMA linha por refeição, com macros somados.
 * O detalhe item-a-item da IA vai para `scan_historico`, ligado por
 * refeicao_id. Este repositório mantém essa dupla escrita consistente.
 */
export const refeicoesRepository = {
  /**
   * Salva uma refeição vinda do scanner (foto -> revisão -> confirmar).
   * Só entram os itens marcados com `incluir`. Registra o histórico do
   * scan para auditoria e para futura melhoria da base de alimentos.
   */
  async salvarDoScanner(params: {
    rascunho: RefeicaoRascunho
    tipo: TipoRefeicao
    fotoUrl: string | null
  }): Promise<RefeicaoSalva> {
    const { rascunho, tipo, fotoUrl } = params

    const incluidos = rascunho.itens.filter((i) => i.incluir)
    if (incluidos.length === 0) {
      throw new Error('nenhum_item_selecionado')
    }

    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')

    const macros = somarMacros(incluidos)
    const nome = montarNome(incluidos, rascunho.descricao)

    // 1) A refeição em si (macros somados).
    const { data: refeicao, error: erroRefeicao } = await supabase
      .from('refeicoes')
      .insert({
        user_id: userId,
        nome,
        tipo,
        calorias: macros.calorias,
        proteina: macros.proteina,
        carboidrato: macros.carboidrato,
        gordura: macros.gordura,
        foto_url: fotoUrl,
        origem: 'scanner',
      })
      .select('id, nome, tipo, calorias')
      .single<{ id: string; nome: string; tipo: TipoRefeicao; calorias: number }>()

    if (erroRefeicao) throw erroRefeicao

    // 2) O histórico do scan, ligado à refeição criada.
    const { error: erroHist } = await supabase.from('scan_historico').insert({
      user_id: userId,
      descricao_ia: rascunho.descricao,
      resultado_final: {
        itens: incluidos,
        observacao: rascunho.observacao,
      },
      confianca: rascunho.confianca,
      refeicao_id: refeicao.id,
    })

    // Falha no histórico não desfaz a refeição — o dado do usuário fica.
    // Apenas registra para observabilidade; não relança.
    if (erroHist) {
      console.warn('scan_historico falhou (refeição preservada):', erroHist.message)
    }

    return {
      id: refeicao.id,
      nome: refeicao.nome,
      tipo: refeicao.tipo,
      calorias: refeicao.calorias,
    }
  },
}

/** Nome legível: usa a descrição da IA, ou junta os nomes dos itens. */
function montarNome(itens: readonly ItemRascunho[], descricao: string): string {
  const d = descricao.trim()
  if (d) return d
  const nomes = itens.map((i) => i.nome).slice(0, 3)
  return nomes.join(', ') || 'Refeição'
}
