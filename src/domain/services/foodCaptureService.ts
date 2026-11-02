import { AiProxyError, analisarFoto, analisarScan, confirmarScan, type ItemScanCru, type RespostaScan } from '@data/ai/aiProxy'
import { alimentosRepository } from '@data/repositories/alimentosRepository'
import { itensRefeicaoRepository, type RefeicaoAlvo } from '@data/repositories/itensRefeicaoRepository'
import { refeicoesRepository } from '@data/repositories/refeicoesRepository'
import { montarRascunho } from '@domain/rules/foodReconciliation'
import { dataLocalISO } from '@domain/rules/datas'
import { somarMacros, type ItemRascunho, type Macros, type RefeicaoRascunho } from '@domain/entities/food'
import type { ProdutoRotulo } from '@data/repositories/produtoCodigoBarrasRepository'

// Scanner v1.1 (Gemini só reconhece, nutriente vem da base/TACO). Enquanto o
// servidor responder `scanner_v2_off`, a sessão fica no scanner antigo.
let scannerV2 = true

function deItemScan(i: ItemScanCru): ItemRascunho {
  const n = i.nutrientes
  const semNumeros = !i.base || !n || i.gramas === null
  return {
    id: i.itemId,
    nome: i.base?.nome ?? i.nomeVisto,
    quantidadeG: i.gramas ?? 0,
    alimentoBaseId: i.base?.alimentoId ?? null,
    fonte: 'base',
    incluir: i.incluir,
    calorias: n?.kcal ?? 0,
    proteina: n?.proteina ?? 0,
    carboidrato: n?.carboidrato ?? 0,
    gordura: n?.gordura ?? 0,
    scan: {
      itemId: i.itemId,
      nomeVisto: i.nomeVisto,
      resolucao: i.resolucao,
      base: i.base,
      candidatos: i.candidatos,
      variante: i.variante,
      varianteOrigem: i.varianteOrigem,
      faixa: i.faixa,
      motivos: i.motivos,
      semNumeros,
    },
  }
}

function deRespostaScan(r: RespostaScan): RefeicaoRascunho {
  const itens = (r.itens ?? []).map(deItemScan)
  const casados = itens.filter((i) => i.scan?.resolucao === 'matched').length
  return {
    descricao: r.titulo ?? '',
    // Não é "confiança da IA": é quantos itens casaram sozinhos com a base.
    confianca: itens.length ? Math.round((100 * casados) / itens.length) : 0,
    observacao: null,
    itens,
    scan: { scanId: r.scan_id, revisao: r.revisao, commitKey: crypto.randomUUID(), parcial: Boolean(r.parcial) },
  }
}

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
    if (scannerV2) {
      try {
        return deRespostaScan(await analisarScan(base64, mime ?? 'image/jpeg', crypto.randomUUID()))
      } catch (e) {
        const desligado = e instanceof AiProxyError && e.info.tipo === 'proxy_error' && e.info.detalhe === 'scanner_v2_off'
        if (!desligado) throw e
        scannerV2 = false
      }
    }
    const [visao, base] = await Promise.all([
      analisarFoto(base64, mime),
      alimentosRepository.carregarTodos(),
    ])
    const { descricao, confianca, observacao, itens } = montarRascunho(visao, base)
    return { descricao, confianca, observacao, itens }
  },

  /**
   * Código de barras: vira um rascunho de 1 item com os números do rótulo,
   * na porção do rótulo (ou 100 g/ml). A mesma revisão da foto ajusta a
   * quantidade antes de salvar. Não usa IA nem cota.
   */
  rascunhoDeProduto(p: ProdutoRotulo, avisoSemPorcao: string): RefeicaoRascunho {
    const g = p.porcaoG ?? 100
    const f = g / 100
    return {
      descricao: p.marca ? `${p.nome} · ${p.marca}` : p.nome,
      confianca: 100,
      observacao: p.porcaoG ? null : avisoSemPorcao,
      itens: [
        {
          id: `rotulo-${p.codigo}`,
          nome: p.marca && !p.nome.toLowerCase().includes(p.marca.toLowerCase()) ? `${p.nome} (${p.marca})` : p.nome,
          quantidadeG: g,
          alimentoBaseId: null,
          fonte: 'rotulo',
          incluir: true,
          calorias: Math.round(p.por100.calorias * f),
          proteina: Math.round(p.por100.proteina * f * 10) / 10,
          carboidrato: Math.round(p.por100.carboidrato * f * 10) / 10,
          gordura: Math.round(p.por100.gordura * f * 10) / 10,
        },
      ],
    }
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
  async confirmar(params: {
    rascunho: RefeicaoRascunho
    alvo: RefeicaoAlvo
    data: Date
    /** Código de barras não entra no histórico de scans da IA. */
    origem?: 'foto' | 'codigo'
  }): Promise<number> {
    const scan = params.rascunho.scan
    if (scan) {
      // Servidor recalcula cada item pela base e grava tudo numa transação;
      // o mesmo commitKey em dois toques não duplica.
      return confirmarScan({
        scanId: scan.scanId,
        revisao: scan.revisao,
        commitKey: scan.commitKey,
        data: dataLocalISO(params.data),
        alvo: params.alvo.tipo === 'extra' ? { tipo: 'extra', extraId: params.alvo.extraId } : { tipo: params.alvo.tipo },
        itens: params.rascunho.itens.map((i) => ({
          itemId: i.scan?.itemId ?? i.id,
          alimentoId: i.scan?.base?.alimentoId ?? null,
          gramas: i.quantidadeG,
          variante: i.scan?.variante ?? null,
          incluir: i.incluir,
        })),
      })
    }
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
    if (params.origem !== 'codigo') {
      await refeicoesRepository.registrarScan({ rascunho: params.rascunho, data: dataLocalISO(params.data) })
    }
    return incluidos.length
  },
}
