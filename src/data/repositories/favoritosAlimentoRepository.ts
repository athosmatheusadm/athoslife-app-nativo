import { supabase } from '@data/supabase/client'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import type { AlimentoBase, CategoriaAlimento } from '@domain/entities/food'

interface FavoritoRow {
  alimento_id: string
  alimentos: {
    id: string
    nome: string
    porcao_g: number | null
    calorias: number | null
    proteina: number | null
    carboidrato: number | null
    gordura: number | null
    categoria: string | null
  } | null
}

function paraDominio(row: FavoritoRow['alimentos']): AlimentoBase | null {
  if (!row) return null
  return {
    id: row.id,
    nome: row.nome,
    porcaoG: row.porcao_g ?? 100,
    calorias: row.calorias ?? 0,
    proteina: row.proteina ?? 0,
    carboidrato: row.carboidrato ?? 0,
    gordura: row.gordura ?? 0,
    categoria: (row.categoria as CategoriaAlimento | null) ?? null,
  }
}

const CHAVE = 'alimentos-favoritos'

/**
 * Alimentos que o usuário marcou com a estrela pra não precisar pesquisar
 * de novo toda vez ("Alimentos salvos" no menu da refeição).
 * Funciona sem rede: a lista fica no aparelho e a estrela vai pela fila.
 */
export const favoritosAlimentoRepository = {
  async listar(): Promise<AlimentoBase[]> {
    const userId = await usuarioId()
    const linhas = await lerComCache(
      CHAVE,
      async () => {
        const { data, error } = await supabase
          .from('alimentos_favoritos')
          .select('alimento_id, alimentos(*)')
          .eq('user_id', userId)
          .order('criado_em', { ascending: false })
          .returns<FavoritoRow[]>()
        if (error) throw error
        return data ?? []
      },
      { padrao: [] },
    )
    return linhas.map((r) => paraDominio(r.alimentos)).filter((a): a is AlimentoBase => a !== null)
  },

  async estaFavoritado(alimentoId: string): Promise<boolean> {
    return (await this.listar()).some((a) => a.id === alimentoId)
  },

  /** `alimento` (opcional) deixa a lista local completa na hora, sem esperar a rede. */
  async favoritar(alimentoId: string, alimento?: AlimentoBase): Promise<void> {
    const userId = await usuarioId()
    await escrever(
      { op: 'upsert', tabela: 'alimentos_favoritos', valores: { user_id: userId, alimento_id: alimentoId }, ignorarDuplicados: true },
      () =>
        mexerNoCache<FavoritoRow[]>(CHAVE, (atual = []) =>
          atual.some((f) => f.alimento_id === alimentoId)
            ? atual
            : [
                {
                  alimento_id: alimentoId,
                  alimentos: alimento
                    ? {
                        id: alimento.id,
                        nome: alimento.nome,
                        porcao_g: alimento.porcaoG,
                        calorias: alimento.calorias,
                        proteina: alimento.proteina,
                        carboidrato: alimento.carboidrato,
                        gordura: alimento.gordura,
                        categoria: alimento.categoria,
                      }
                    : null,
                },
                ...atual,
              ],
        ),
    )
  },

  async desfavoritar(alimentoId: string): Promise<void> {
    const userId = await usuarioId()
    await escrever(
      { op: 'delete', tabela: 'alimentos_favoritos', filtros: [['user_id', userId], ['alimento_id', alimentoId]] },
      () => mexerNoCache<FavoritoRow[]>(CHAVE, (atual) => atual?.filter((f) => f.alimento_id !== alimentoId)),
    )
  },
}
