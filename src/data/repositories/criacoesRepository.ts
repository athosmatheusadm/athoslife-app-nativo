import { supabase } from '@data/supabase/client'
import type { ReceitaCriada, ReceitaGerada } from '@domain/entities/receita'

/**
 * "Minhas criações" — receitas que o Life montou e a pessoa salvou
 * (db/athoslife_cozinha_v2_migration.sql). A foto do prato fica no bucket
 * PRIVADO `receitas-criadas/<user_id>/<id>.jpg`; a tela recebe uma URL
 * assinada que vale 1 hora.
 */

const BUCKET = 'receitas-criadas'
const VALIDADE_URL_S = 60 * 60

interface CriacaoRow {
  id: string
  titulo: string
  dados: ReceitaGerada
  foto_path: string | null
  feita_em: string | null
  created_at: string
}

const COLUNAS = 'id, titulo, dados, foto_path, feita_em, created_at'

async function urlsAssinadas(caminhos: string[]): Promise<Map<string, string>> {
  if (caminhos.length === 0) return new Map()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(caminhos, VALIDADE_URL_S)
  if (error) {
    console.warn('[criacoes] url assinada falhou', error.message)
    return new Map()
  }
  return new Map(
    (data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])),
  )
}

function paraDominio(row: CriacaoRow, urls: Map<string, string>): ReceitaCriada {
  return {
    id: row.id,
    receita: row.dados,
    fotoUrl: row.foto_path ? urls.get(row.foto_path) ?? null : null,
    feitaEm: row.feita_em ? new Date(row.feita_em) : null,
    criadaEm: new Date(row.created_at),
  }
}

function base64ParaBlob(base64: string, mime: string): Blob {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export const criacoesRepository = {
  async listar(): Promise<ReceitaCriada[]> {
    const { data, error } = await supabase
      .from('receitas_criadas')
      .select(COLUNAS)
      .order('created_at', { ascending: false })
      .returns<CriacaoRow[]>()
    if (error) throw error
    const linhas = data ?? []
    const urls = await urlsAssinadas(linhas.flatMap((r) => (r.foto_path ? [r.foto_path] : [])))
    return linhas.map((r) => paraDominio(r, urls))
  },

  async buscar(id: string): Promise<ReceitaCriada | null> {
    const { data, error } = await supabase
      .from('receitas_criadas')
      .select(COLUNAS)
      .eq('id', id)
      .maybeSingle<CriacaoRow>()
    if (error) throw error
    if (!data) return null
    const urls = await urlsAssinadas(data.foto_path ? [data.foto_path] : [])
    return paraDominio(data, urls)
  },

  async salvar(receita: ReceitaGerada): Promise<string> {
    const { data, error } = await supabase
      .from('receitas_criadas')
      .insert({ titulo: receita.titulo.slice(0, 80) || 'Receita do Life', dados: receita })
      .select('id')
      .single<{ id: string }>()
    if (error) throw error
    return data.id
  },

  /** Sobe a foto do prato (substitui a anterior) e marca a receita como feita. */
  async definirFoto(id: string, foto: { base64: string; mime: string }): Promise<string | null> {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) throw new Error('not_authenticated')
    const ext = foto.mime === 'image/png' ? 'png' : foto.mime === 'image/webp' ? 'webp' : 'jpg'
    const caminho = `${userId}/${id}.${ext}`

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET)
      .upload(caminho, base64ParaBlob(foto.base64, foto.mime), { upsert: true, contentType: foto.mime })
    if (erroUpload) throw erroUpload

    const { error } = await supabase
      .from('receitas_criadas')
      .update({ foto_path: caminho, feita_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error

    return (await urlsAssinadas([caminho])).get(caminho) ?? null
  },

  async excluir(id: string): Promise<void> {
    const { data } = await supabase
      .from('receitas_criadas')
      .select('foto_path')
      .eq('id', id)
      .maybeSingle<{ foto_path: string | null }>()
    if (data?.foto_path) {
      const { error: erroFoto } = await supabase.storage.from(BUCKET).remove([data.foto_path])
      if (erroFoto) console.warn('[criacoes] remover foto falhou', erroFoto.message)
    }
    const { error } = await supabase.from('receitas_criadas').delete().eq('id', id)
    if (error) throw error
  },
}
