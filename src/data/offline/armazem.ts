/**
 * Guarda chave-valor no aparelho (IndexedDB), pra cópia local dos dados e a
 * fila de registros feitos sem internet.
 *
 * Por que não Preferences: lá cabe pouco e tudo vira texto. A base de
 * alimentos e o histórico pesam centenas de KB; o IndexedDB do WebView
 * guarda isso sem esforço e sobrevive a fechar o app.
 *
 * Se o IndexedDB não abrir (raro: modo privado de navegador no dev), cai pra
 * memória — o app funciona, só não lembra depois de fechar.
 */
const BANCO = 'athoslife-offline'
const LOJA = 'kv'

let abrindo: Promise<IDBDatabase | null> | null = null
const memoria = new Map<string, unknown>()

function abrir(): Promise<IDBDatabase | null> {
  if (abrindo) return abrindo
  abrindo = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(BANCO, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(LOJA)) req.result.createObjectStore(LOJA)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return abrindo
}

function pedido<T>(db: IDBDatabase, modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOJA, modo)
    const req = fazer(tx.objectStore(LOJA))
    tx.oncomplete = () => resolve(req.result as T)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function lerLocal<T>(chave: string): Promise<T | undefined> {
  // Toda gravação passa por aqui, então a memória está sempre em dia com o disco.
  if (memoria.has(chave)) return memoria.get(chave) as T | undefined
  const db = await abrir()
  if (!db) return undefined
  try {
    const valor = await pedido<T | undefined>(db, 'readonly', (l) => l.get(chave))
    if (valor !== undefined) memoria.set(chave, valor)
    return valor
  } catch {
    return memoria.get(chave) as T | undefined
  }
}

export async function gravarLocal(chave: string, valor: unknown): Promise<void> {
  memoria.set(chave, valor)
  const db = await abrir()
  if (!db) return
  try {
    await pedido(db, 'readwrite', (l) => l.put(valor, chave))
  } catch (e) {
    console.warn('armazem: falha ao gravar', chave, e)
  }
}

export async function apagarLocal(chave: string): Promise<void> {
  memoria.delete(chave)
  const db = await abrir()
  if (!db) return
  try {
    await pedido(db, 'readwrite', (l) => l.delete(chave))
  } catch {
    // nada a fazer
  }
}

/** Apaga todas as chaves que começam com `prefixo` (ex.: tudo de um usuário ao sair). */
export async function apagarPorPrefixo(prefixo: string): Promise<void> {
  for (const k of [...memoria.keys()]) if (k.startsWith(prefixo)) memoria.delete(k)
  const db = await abrir()
  if (!db) return
  try {
    const faixa = IDBKeyRange.bound(prefixo, prefixo + '￿')
    await pedido(db, 'readwrite', (l) => l.delete(faixa))
  } catch {
    // nada a fazer
  }
}
