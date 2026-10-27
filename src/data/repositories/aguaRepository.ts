import { MAX_ML_AGUA } from '@domain/rules/limites'
import { supabase } from '@data/supabase/client'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever, inserir, novoId } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import type { AguaDoDia, RegistroAgua } from '@domain/entities/water'
import { dataLocalISO } from '@domain/rules/datas'

interface RegistroRow {
  id: string
  quantidade_ml: number
  created_at: string
}

function paraDominio(row: RegistroRow): RegistroAgua {
  return {
    id: row.id,
    quantidadeMl: row.quantidade_ml,
    criadoEm: new Date(row.created_at),
  }
}

function hojeISO(): string {
  return dataLocalISO()
}

const chaveDia = (data: string) => `agua:${data}`

/** Cópia local do dia: registro novo no topo (a lista vem do mais recente pro mais antigo). */
async function anotarLocal(data: string, row: RegistroRow): Promise<void> {
  await mexerNoCache<RegistroRow[]>(chaveDia(data), (atual = []) =>
    atual.some((r) => r.id === row.id) ? atual : [row, ...atual],
  )
}

/**
 * Único ponto que conhece as tabelas de água.
 * A meta (agua_meta_ml) vive no profile e chega por parâmetro — o
 * repositório de água não lê profiles, mantém a responsabilidade única.
 *
 * Funciona sem internet: o gole vai pra fila (com id do aparelho) e a cópia
 * local do dia já mostra o total novo.
 */
export const aguaRepository = {
  /** UUID gerado no Android torna reenvios seguros, inclusive depois de uma
   * resposta de rede perdida. Mantém a data e horário originais do toque. */
  async adicionarDoWidget(copo: { id: string; ml: number; data: string; em: number }, usuarioEsperado: string): Promise<void> {
    if (!Number.isInteger(copo.ml) || copo.ml <= 0 || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(copo.id) || !/^\d{4}-\d{2}-\d{2}$/.test(copo.data) || !Number.isFinite(copo.em) || copo.em <= 0) throw new Error('copo_widget_invalido')
    const userId = await usuarioId()
    if (userId !== usuarioEsperado) throw new Error('widget_sessao_alterada')
    const row: RegistroRow = { id: copo.id, quantidade_ml: copo.ml, created_at: new Date(copo.em).toISOString() }
    await escrever(
      inserir('registros_agua', { id: copo.id, user_id: userId, quantidade_ml: copo.ml, data: copo.data, created_at: row.created_at }),
      () => anotarLocal(copo.data, row),
    )
    avisarRegistroDoDia()
  },

  /** Registros de hoje (para montar o AguaDoDia com histórico). */
  async registrosDeHoje(): Promise<RegistroAgua[]> {
    const userId = await usuarioId()
    const hoje = hojeISO()
    const rows = await lerComCache(
      chaveDia(hoje),
      async () => {
        const { data, error } = await supabase
          .from('registros_agua')
          .select('id, quantidade_ml, created_at')
          .eq('user_id', userId)
          .eq('data', hoje)
          .order('created_at', { ascending: false })
          .returns<RegistroRow[]>()
        if (error) throw error
        return data ?? []
      },
      { padrao: [] },
    )
    return rows.map(paraDominio)
  },

  /** Monta o estado do dia juntando os registros com a meta do perfil. */
  async aguaDoDia(metaMl: number): Promise<AguaDoDia> {
    const registros = await this.registrosDeHoje()
    const totalMl = registros.reduce((s, r) => s + r.quantidadeMl, 0)
    return { totalMl, metaMl, registros }
  },

  /**
   * Adiciona um gole. quantidade_ml pode ser negativo? Não: o schema exige
   * > 0. "Desfazer" é remover o último registro, não somar negativo.
   */
  async adicionar(quantidadeMl: number): Promise<RegistroAgua> {
    if (quantidadeMl <= 0 || quantidadeMl > MAX_ML_AGUA) throw new Error('quantidade_invalida')
    const userId = await usuarioId()
    const hoje = hojeISO()
    const row: RegistroRow = { id: novoId(), quantidade_ml: quantidadeMl, created_at: new Date().toISOString() }
    await escrever(
      inserir('registros_agua', { ...row, user_id: userId, data: hoje }),
      () => anotarLocal(hoje, row),
    )
    avisarRegistroDoDia()
    return paraDominio(row)
  },

  /** Remove um registro específico (o "menos" do card = apagar o último). */
  async remover(registroId: string): Promise<void> {
    const hoje = hojeISO()
    await escrever({ op: 'delete', tabela: 'registros_agua', filtros: [['id', registroId]] }, () =>
      mexerNoCache<RegistroRow[]>(chaveDia(hoje), (atual) => atual?.filter((r) => r.id !== registroId)),
    )
    avisarRegistroDoDia()
  },
}
