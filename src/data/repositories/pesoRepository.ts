import { supabase } from '@data/supabase/client'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import { atualizarPerfil } from './profileRepository'
import { resumirPesos, type RegistroPeso, type ResumoPeso } from '@domain/entities/weight'
import { dataDeISO, dataLocalISO } from '@domain/rules/datas'

interface PesoRow {
  peso_kg: number
  data: string
}

function paraDominio(row: PesoRow): RegistroPeso {
  return { pesoKg: Number(row.peso_kg), data: dataDeISO(row.data) }
}

export const CHAVE_HISTORICO_PESO = 'peso:historico'

/**
 * Único ponto que conhece registros_peso.
 * A tabela tem UNIQUE (user_id, data): 1 registro por dia. Por isso o
 * "adicionar" é um upsert — registrar de novo no mesmo dia atualiza.
 */
export const pesoRepository = {
  /** Histórico ordenado por data (antigo -> recente) para desenhar a linha. */
  async historico(): Promise<RegistroPeso[]> {
    return (await this.linhas()).map(paraDominio)
  },

  /** Linhas cruas (data ISO) — também alimentam o card Energia e peso sem rede. */
  async linhas(): Promise<PesoRow[]> {
    const userId = await usuarioId()
    return lerComCache(
      CHAVE_HISTORICO_PESO,
      async () => {
        const { data, error } = await supabase
          .from('registros_peso')
          .select('peso_kg, data')
          .eq('user_id', userId)
          .order('data', { ascending: true })
          .returns<PesoRow[]>()
        if (error) throw error
        return data ?? []
      },
      { padrao: [] },
    )
  },

  /** Monta o resumo do card (inicial, atual, variação) a partir do histórico. */
  async resumo(): Promise<ResumoPeso> {
    return resumirPesos(await this.historico())
  },

  /**
   * Registra o peso de hoje (upsert: 1 por dia) e deixa o perfil com o mesmo
   * número — Conta, chat e card de peso mostram sempre o mesmo peso.
   */
  async registrar(pesoKg: number): Promise<void> {
    if (pesoKg <= 0) throw new Error('peso_invalido')
    const userId = await usuarioId()

    // Data do aparelho, não UTC: pesar às 22h conta pra hoje.
    const hoje = dataLocalISO()
    await escrever(
      {
        op: 'upsert',
        tabela: 'registros_peso',
        valores: { user_id: userId, peso_kg: pesoKg, data: hoje },
        onConflict: 'user_id,data',
      },
      () =>
        mexerNoCache<PesoRow[]>(CHAVE_HISTORICO_PESO, (atual = []) =>
          [...atual.filter((r) => r.data !== hoje), { peso_kg: pesoKg, data: hoje }].sort((a, b) => a.data.localeCompare(b.data)),
        ),
    )
    await atualizarPerfil({ peso_atual: pesoKg }).catch(() => {})
    avisarRegistroDoDia()
  },

  /** Apaga o registro de um dia (pesou errado). */
  async excluir(data: Date): Promise<void> {
    const userId = await usuarioId()
    const dia = dataLocalISO(data)
    await escrever(
      { op: 'delete', tabela: 'registros_peso', filtros: [['user_id', userId], ['data', dia]] },
      () => mexerNoCache<PesoRow[]>(CHAVE_HISTORICO_PESO, (atual) => atual?.filter((r) => r.data !== dia)),
    )
    avisarRegistroDoDia()
  },
}
