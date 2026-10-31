/**
 * Estado da conexão, do jeito que o app enxerga.
 *
 * `navigator.onLine` sozinho mente: Wi-Fi sem internet ("conectado, sem
 * internet") diz que está online. Por isso o fetch do Supabase (client.ts)
 * também avisa aqui: pedido que falhou por rede marca offline, resposta que
 * chegou marca online. As leituras usam isso pra ir direto à cópia local em
 * vez de esperar um timeout a cada tela.
 */
type Ouvinte = (online: boolean) => void

const ouvintes = new Set<Ouvinte>()
let online = typeof navigator === 'undefined' ? true : navigator.onLine !== false
/** Quando a última falha de rede aconteceu (0 = nenhuma recente). */
let falhouEm = 0

/** Depois de uma falha, quanto tempo as leituras vão direto pro cache. */
const JANELA_FALHA_MS = 15_000

function definir(novo: boolean): void {
  if (novo === online) return
  online = novo
  for (const fn of ouvintes) fn(novo)
}

export function estaOnline(): boolean {
  return online
}

/** Vale a pena tentar a rede agora? Não, se o aparelho diz que está sem rede ou se acabou de falhar. */
export function valeTentarRede(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  return !(falhouEm && Date.now() - falhouEm < JANELA_FALHA_MS)
}

export function marcarFalhaDeRede(): void {
  falhouEm = Date.now()
  definir(false)
}

export function marcarRespostaDoServidor(): void {
  falhouEm = 0
  definir(true)
}

export function aoMudarConexao(fn: Ouvinte): () => void {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => marcarFalhaDeRede())
  // "online" do sistema não prova que há internet: só libera a próxima
  // tentativa. Quem confirma é a primeira resposta do servidor.
  window.addEventListener('online', () => {
    falhouEm = 0
    definir(true)
  })
}

/**
 * Erro de rede (sem internet, DNS, timeout), e não erro do servidor.
 * O supabase-js não lança: devolve `{ error }` com a mensagem do fetch.
 */
export function ehFalhaDeRede(e: unknown): boolean {
  if (!e) return false
  if (e instanceof SemConexaoError) return true
  // AiProxyError('sem_conexao') e SemConexaoError têm essa mensagem.
  if (e instanceof Error && e.message === 'sem_conexao') return true
  const nome = typeof e === 'object' && e !== null && 'name' in e ? String((e as { name: unknown }).name) : ''
  if (nome === 'AbortError' || nome === 'TimeoutError' || nome === 'AuthRetryableFetchError' || nome === 'FunctionsFetchError') return true
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e !== null && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  return /failed to fetch|network ?error|load failed|networkrequestfailed|fetch failed|internet|timed? ?out|aborted|err_internet|err_name_not_resolved|err_connection/i.test(msg)
}

/** Lançado quando algo precisa do servidor e não há rede nem cópia local. */
export class SemConexaoError extends Error {
  constructor() {
    super('sem_conexao')
    this.name = 'SemConexaoError'
  }
}
