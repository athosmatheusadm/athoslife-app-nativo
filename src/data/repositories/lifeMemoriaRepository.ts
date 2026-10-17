import { supabase } from '@data/supabase/client'
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

async function userId(): Promise<string> {
  const id = (await supabase.auth.getSession()).data.session?.user.id
  if (!id) throw new Error('not_authenticated')
  return id
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
    const id = await userId()
    const { data, error } = await supabase
      .from('profiles')
      .select('consentimento_memoria')
      .eq('id', id)
      .maybeSingle<{ consentimento_memoria: boolean | null }>()
    if (error) throw error
    return data?.consentimento_memoria ?? null
  },

  async definirConsentimento(valor: boolean): Promise<void> {
    const id = await userId()
    const { error } = await supabase
      .from('profiles')
      .update({ consentimento_memoria: valor, consentimento_memoria_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async listar(): Promise<MemoriaLife[]> {
    const { data, error } = await supabase
      .from('life_memorias')
      .select('id, texto, categoria, data_referencia, fixada')
      .order('fixada', { ascending: false })
      .order('criado_em', { ascending: false })
      .returns<MemoriaRow[]>()
    if (error) throw error
    return (data ?? []).map((r) => ({
      id: r.id,
      texto: r.texto,
      categoria: r.categoria,
      dataReferencia: r.data_referencia,
      fixada: r.fixada,
    }))
  },

  async fixar(id: string, fixada: boolean): Promise<void> {
    const { error } = await supabase.from('life_memorias').update({ fixada }).eq('id', id)
    if (error) throw error
  },

  async apagar(id: string): Promise<void> {
    const { error } = await supabase.from('life_memorias').delete().eq('id', id)
    if (error) throw error
  },

  async apagarTudo(): Promise<void> {
    const id = await userId()
    const { error } = await supabase.from('life_memorias').delete().eq('user_id', id)
    if (error) throw error
  },

  /** A pessoa conta algo ao Life (só com a memória ligada — a regra do banco confere). */
  async contar(texto: string, categoria: CategoriaMemoria, dataReferencia: string | null): Promise<void> {
    const id = await userId()
    const { error } = await supabase.from('life_memorias').insert({
      user_id: id,
      texto,
      categoria,
      origem: 'usuario',
      data_referencia: categoria === 'evento' ? dataReferencia : null,
    })
    if (error) throw error
  },

  /** Check-in já feito neste momento do dia (pra mostrar só o "Hoje: …"). */
  async checkinDoMomento(
    data: string,
    momento: Momento,
  ): Promise<{ palavra: Sentimento; etiquetas: Etiqueta[] } | null> {
    const id = await userId()
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
}
