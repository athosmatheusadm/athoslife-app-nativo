import { supabase } from '@data/supabase/client'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { lerLocal, gravarLocal } from './armazem'
import { ehFalhaDeRede, marcarFalhaDeRede, valeTentarRede } from './conexao'
import { usuarioAtualSincrono, usuarioId } from './usuario'

/**
 * Fila de registros feitos sem internet.
 *
 * Toda gravação do app vira uma operação descrita em dados (tabela, valores,
 * filtros) em vez de uma chamada direta. Com rede, ela vai na hora; sem
 * rede, entra na fila (guardada no aparelho) e sobe sozinha, na mesma ordem,
 * quando a conexão volta — ao reabrir o app, ao voltar o sinal ou a cada 30 s.
 *
 * Repetir uma operação não pode duplicar nada, porque a resposta pode se
 * perder depois de o servidor já ter gravado:
 *  - inserção leva o id gerado no aparelho e vai como upsert "ignora se já
 *    existe";
 *  - update e delete por filtro dão o mesmo resultado se repetidos.
 */
type Valor = string | number | boolean | null | readonly unknown[] | Record<string, unknown>
type Linha = Record<string, Valor | undefined>
/** Filtro de igualdade (`null` vira `is null`). */
export type Filtro = readonly [coluna: string, valor: string | number | boolean | null]

export type Operacao =
  | {
      readonly op: 'upsert'
      readonly tabela: string
      readonly valores: Linha | readonly Linha[]
      readonly onConflict?: string
      /** Inserção: se a linha já existe (reenvio), não faz nada. */
      readonly ignorarDuplicados?: boolean
    }
  | { readonly op: 'update'; readonly tabela: string; readonly valores: Linha; readonly filtros: readonly Filtro[] }
  | { readonly op: 'delete'; readonly tabela: string; readonly filtros: readonly Filtro[] }
  | { readonly op: 'rpc'; readonly fn: string; readonly args: Record<string, unknown> }

interface Pendente {
  readonly id: string
  readonly uid: string
  readonly em: number
  readonly operacao: Operacao
}

/** Inserção idempotente: a linha com id do aparelho, ignorada se já subiu. */
export function inserir(tabela: string, valores: Linha | readonly Linha[]): Operacao {
  return { op: 'upsert', tabela, valores, onConflict: 'id', ignorarDuplicados: true }
}

export function novoId(): string {
  const c = globalThis.crypto as Crypto & { randomUUID?: () => string }
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  // WebView antigo: UUID v4 com getRandomValues.
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

async function executar(o: Operacao): Promise<{ error: unknown }> {
  try {
    if (o.op === 'rpc') return await supabase.rpc(o.fn, o.args)
    if (o.op === 'upsert') {
      return await supabase.from(o.tabela).upsert(o.valores as Linha[], {
        ...(o.onConflict ? { onConflict: o.onConflict } : {}),
        ignoreDuplicates: o.ignorarDuplicados ?? false,
      })
    }
    let q = o.op === 'update' ? supabase.from(o.tabela).update(o.valores) : supabase.from(o.tabela).delete()
    for (const [coluna, valor] of o.filtros) q = valor === null ? q.is(coluna, null) : q.eq(coluna, valor)
    return await q
  } catch (e) {
    return { error: e }
  }
}

// ---------------------------------------------------------------------------
// Fila guardada no aparelho (uma por usuário). Toda mudança passa pela
// `trava`, pra gravação nova e envio não se atropelarem.

const chaveFila = (uid: string) => `${uid}:fila`
let trava: Promise<unknown> = Promise.resolve()

function comTrava<T>(fn: () => Promise<T>): Promise<T> {
  const p = trava.then(fn, fn)
  trava = p.catch(() => {})
  return p
}

async function lerFila(uid: string): Promise<Pendente[]> {
  return (await lerLocal<Pendente[]>(chaveFila(uid))) ?? []
}

async function gravarFila(uid: string, fila: Pendente[]): Promise<void> {
  await gravarLocal(chaveFila(uid), fila)
  avisarFila(fila.length)
}

export async function pendentes(uid?: string): Promise<number> {
  const u = uid ?? usuarioAtualSincrono()
  return u ? (await lerFila(u)).length : 0
}

// ---------------------------------------------------------------------------
// Eventos: quantos faltam subir, terminou de subir, e o que o servidor recusou.

const EVENTO_FILA = 'athoslife:fila-offline'
const EVENTO_SINCRONIZOU = 'athoslife:sincronizou'
const EVENTO_RECUSADO = 'athoslife:envio-recusado'

function avisarFila(n: number): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENTO_FILA, { detail: n }))
}

export function aoMudarFila(fn: (pendentes: number) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<number>).detail)
  window.addEventListener(EVENTO_FILA, h)
  return () => window.removeEventListener(EVENTO_FILA, h)
}

/** Os registros feitos offline subiram: telas abertas podem reler do servidor. */
export function aoSincronizar(fn: () => void): () => void {
  window.addEventListener(EVENTO_SINCRONIZOU, fn)
  return () => window.removeEventListener(EVENTO_SINCRONIZOU, fn)
}

/** O servidor recusou algo feito offline (ex.: limite do plano grátis). */
export function aoRecusarEnvio(fn: (mensagem: string) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail)
  window.addEventListener(EVENTO_RECUSADO, h)
  return () => window.removeEventListener(EVENTO_RECUSADO, h)
}

// ---------------------------------------------------------------------------

function ehErroDeSessao(e: unknown): boolean {
  const o = (e ?? {}) as { code?: unknown; message?: unknown; status?: unknown }
  return o.code === 'PGRST301' || o.code === 'PGRST302' || o.status === 401 || /jwt|not_authenticated/i.test(String(o.message ?? ''))
}

/**
 * Grava agora se der; senão guarda na fila. Devolve onde ficou.
 *
 * `local` atualiza a cópia local (o que as telas leem sem rede) — roda só
 * se a gravação foi aceita ou ficou na fila, nunca quando o servidor recusa.
 * Erro do servidor (regra, limite) com rede continua sendo lançado, como
 * antes, pra tela mostrar.
 */
export async function escrever(operacao: Operacao, local?: () => Promise<void> | void): Promise<'servidor' | 'fila'> {
  const uid = await usuarioId()
  if (valeTentarRede()) {
    // Ordem importa: o que ficou da última vez sobe antes.
    if ((await pendentes(uid)) > 0) await sincronizar()
    if ((await pendentes(uid)) === 0 && valeTentarRede()) {
      const { error } = await executar(operacao)
      if (!error) {
        await local?.()
        return 'servidor'
      }
      if (!ehFalhaDeRede(error)) throw error
      marcarFalhaDeRede()
    }
  }
  await comTrava(async () => {
    const fila = await lerFila(uid)
    fila.push({ id: novoId(), uid, em: Date.now(), operacao })
    await gravarFila(uid, fila)
  })
  await local?.()
  return 'fila'
}

let rodando: Promise<void> | null = null

/** Sobe o que está na fila, em ordem. Para no primeiro erro de rede. */
export function sincronizar(): Promise<void> {
  if (rodando) return rodando
  rodando = (async () => {
    const uid = usuarioAtualSincrono()
    if (!uid || !valeTentarRede()) return
    let subiu = 0
    for (;;) {
      const proximo = (await lerFila(uid))[0]
      if (!proximo) break
      const { error } = await executar(proximo.operacao)
      if (error && (ehFalhaDeRede(error) || ehErroDeSessao(error))) {
        if (ehFalhaDeRede(error)) marcarFalhaDeRede()
        break
      }
      if (error) {
        // Recusa definitiva (regra do banco, limite do plano): tentar de
        // novo não muda nada. Sai da fila e a pessoa fica sabendo.
        console.warn('fila offline: recusado', proximo.operacao, error)
        const msg = (error as { message?: unknown }).message
        window.dispatchEvent(new CustomEvent(EVENTO_RECUSADO, { detail: typeof msg === 'string' ? msg : '' }))
      } else {
        subiu++
      }
      await comTrava(async () => {
        const fila = await lerFila(uid)
        await gravarFila(uid, fila.filter((p) => p.id !== proximo.id))
      })
    }
    if (subiu > 0) {
      window.dispatchEvent(new Event(EVENTO_SINCRONIZOU))
      avisarRegistroDoDia()
    }
  })().finally(() => {
    rodando = null
  })
  return rodando
}
