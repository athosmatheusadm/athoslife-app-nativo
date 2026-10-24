import { supabase } from '@data/supabase/client'
import { lerComCache, mexerNoCache } from '@data/offline/cache'
import { escrever, inserir, novoId } from '@data/offline/fila'
import { usuarioId } from '@data/offline/usuario'
import { atualizarPerfil, linhaDoPerfil } from './profileRepository'
import type { Etiqueta, Momento, Sentimento } from '@domain/rules/checkinLife'

/** Tipos de memória (life_memorias.categoria). */
export type CategoriaMemoria = 'gosto' | 'rotina' | 'objetivo' | 'evento' | 'pessoa' | 'estilo' | 'contexto'

export interface MemoriaLife {
  readonly id: string
  readonly texto: string
  readonly categoria: CategoriaMemoria
  /** yyyy-mm-dd, só em evento. */
  readonly dataReferencia: string | null
  readonly fixada: boolean
}

interface MemoriaRow {
  id: string
  texto: string
  categoria: CategoriaMemoria
  data_referencia: string | null
  fixada: boolean
}

const userId = usuarioId
const CHAVE = 'life:memorias'

async function mexerNasMemorias(fn: (lista: MemoriaRow[]) => MemoriaRow[]): Promise<void> {
  await mexerNoCache<MemoriaRow[]>(CHAVE, (atual) => (atual ? fn(atual) : undefined))
}

/**
 * Único ponto que conhece life_memorias, o consentimento de memória e
 * life_checkins (db/athoslife_life_adaptativo_migration.sql). Quem guarda
 * memória vinda do chat é o servidor; aqui a pessoa vê, fixa, apaga e
 * conta algo pela tela "O que o Life lembra".
 */
export const lifeMemoriaRepository = {
  /** null = ainda não perguntado. */
  async consentimento(): Promise<boolean | null> {
    const row = await linhaDoPerfil()
    return row.consentimento_memoria ?? null
  },

  async definirConsentimento(valor: boolean): Promise<void> {
    await atualizarPerfil({ consentimento_memoria: valor, consentimento_memoria_em: new Date().toISOString() })
  },

  async listar(): Promise<MemoriaLife[]> {
    const data = await lerComCache(
      CHAVE,
      async () => {
        const { data: rows, error } = await supabase
          .from('life_memorias')
          .select('id, texto, categoria, data_referencia, fixada')
          .order('fixada', { ascending: false })
          .order('criado_em', { ascending: false })
          .returns<MemoriaRow[]>()
        if (error) throw error
        return rows ?? []
      },
      { padrao: [] },
    )
    return data.map((r) => ({
      id: r.id,
      texto: r.texto,
      categoria: r.categoria,
      dataReferencia: r.data_referencia,
      fixada: r.fixada,
    }))
  },

  async fixar(id: string, fixada: boolean): Promise<void> {
    await escrever({ op: 'update', tabela: 'life_memorias', valores: { fixada }, filtros: [['id', id]] }, () =>
      mexerNasMemorias((l) => l.map((m) => (m.id === id ? { ...m, fixada } : m))),
    )
  },

  async apagar(id: string): Promise<void> {
    await escrever({ op: 'delete', tabela: 'life_memorias', filtros: [['id', id]] }, () =>
      mexerNasMemorias((l) => l.filter((m) => m.id !== id)),
    )
  },

  async apagarTudo(): Promise<void> {
    const id = await userId()
    await escrever({ op: 'delete', tabela: 'life_memorias', filtros: [['user_id', id]] }, () => mexerNasMemorias(() => []))
  },

  /** A pessoa conta algo ao Life (só com a memória ligada — a regra do banco confere). */
  async contar(texto: string, categoria: CategoriaMemoria, dataReferencia: string | null): Promise<void> {
    const id = await userId()
    const row: MemoriaRow = { id: novoId(), texto, categoria, data_referencia: categoria === 'evento' ? dataReferencia : null, fixada: false }
    await escrever(inserir('life_memorias', { ...row, user_id: id, origem: 'usuario' }), () =>
      mexerNasMemorias((l) => [row, ...l]),
    )
  },

  /** Check-in já feito neste momento do dia (pra mostrar só o "Hoje: …"). */
  async checkinDoMomento(
    data: string,
    momento: Momento,
  ): Promise<{ palavra: Sentimento; etiquetas: Etiqueta[] } | null> {
    const id = await userId()
    return lerComCache(
      `life:checkin:${data}:${momento}`,
      async () => {
        const { data: row, error } = await supabase
          .from('life_checkins')
          .select('palavra, etiquetas')
          .eq('user_id', id)
          .eq('data', data)
          .eq('momento', momento)
          .maybeSingle<{ palavra: Sentimento; etiquetas: Etiqueta[] }>()
        if (error) throw error
        return row ?? null
      },
      { padrao: null },
    )
  },
}
