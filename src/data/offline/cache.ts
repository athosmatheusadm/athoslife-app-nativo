import { lerLocal, gravarLocal } from './armazem'
import { ehFalhaDeRede, marcarFalhaDeRede, SemConexaoError, valeTentarRede } from './conexao'
import { pendentes, sincronizar } from './fila'
import { usuarioId } from './usuario'

/**
 * Cópia local do que o app já leu do servidor, por usuário.
 *
 * Com rede: busca no servidor e guarda a resposta. Sem rede (ou se o pedido
 * falha por rede): devolve a última cópia. Os registros feitos offline
 * atualizam a cópia na hora (`mexerNoCache`), então a tela mostra o que a
 * pessoa acabou de fazer mesmo antes de subir.
 *
 * Guarde a linha crua do banco (JSON), não o objeto de domínio: é o que os
 * registros offline sabem atualizar.
 */
const chaveCache = (uid: string, chave: string) => `${uid}:c:${chave}`

/**
 * Com cópia guardada, quanto a tela espera a rede antes de mostrar a cópia.
 * A busca segue por trás e grava a resposta pra próxima leitura.
 */
const ESPERA_REDE_COM_COPIA_MS = 2_500

/**
 * Quantas vezes cada cópia foi mexida por registro (`mexerNoCache`). A busca
 * que terminou por trás só grava se ninguém mexeu na cópia enquanto ela
 * estava no ar — senão apagaria o que a pessoa acabou de registrar.
 */
const versoes = new Map<string, number>()
const versao = (k: string) => versoes.get(k) ?? 0

interface Opcoes<T> {
  /**
   * O que devolver sem rede quando nunca houve cópia. Pra listas "do dia",
   * vazio é a verdade (dia novo começa sem nada); pra dados que só o
   * servidor sabe, deixe sem padrão e a tela recebe SemConexaoError.
   */
  readonly padrao?: T
  /** Ajusta a cópia antes de devolver sem rede (ex.: juntar registros offline guardados em outra chave). */
  readonly ajustarCopia?: (copia: T) => Promise<T>
  /**
   * Conteúdo que quase não muda (base de alimentos, catálogo de exercícios):
   * cópia mais nova que isso é usada direto, sem ir ao servidor.
   */
  readonly validadeMs?: number
}

export async function lerComCache<T>(chave: string, buscar: () => Promise<T>, opcoes: Opcoes<T> = {}): Promise<T> {
  const uid = await usuarioId()
  const k = chaveCache(uid, chave)
  const kEm = `${k}:em`

  if (opcoes.validadeMs) {
    const em = await lerLocal<number>(kEm)
    if (em && Date.now() - em < opcoes.validadeMs) {
      const fresco = await lerLocal<T>(k)
      if (fresco !== undefined) return fresco
    }
  }

  if (valeTentarRede()) {
    if ((await pendentes(uid)) > 0) await sincronizar()
    // Ainda tem registro offline sem subir: a cópia local tem ele e o
    // servidor não — melhor mostrar a cópia que "apagar" o que a pessoa fez.
    const salvoAntes = (await pendentes(uid)) > 0 ? await lerLocal<T>(k) : undefined
    if (salvoAntes !== undefined) return opcoes.ajustarCopia ? opcoes.ajustarCopia(salvoAntes) : salvoAntes
    const antes = versao(k)
    const gravar = async (valor: T) => {
      if (versao(k) !== antes) return
      await gravarLocal(k, valor)
      if (opcoes.validadeMs) await gravarLocal(kEm, Date.now())
    }
    const copiaGuardada = await lerLocal<T>(k)
    const pedido = buscar()
    try {
      if (copiaGuardada === undefined) {
        const valor = await pedido
        await gravar(valor)
        return valor
      }
      let timer: ReturnType<typeof setTimeout> | undefined
      const demorou = new Promise<'demorou'>((ok) => {
        timer = setTimeout(() => ok('demorou'), ESPERA_REDE_COM_COPIA_MS)
      })
      const r = await Promise.race([pedido.then((valor) => ({ valor })), demorou]).finally(() => clearTimeout(timer))
      if (r !== 'demorou') {
        await gravar(r.valor)
        return r.valor
      }
      // Rede lenta: mostra a cópia agora e deixa a resposta chegar por trás.
      pedido.then(gravar).catch((e) => {
        if (ehFalhaDeRede(e)) marcarFalhaDeRede()
      })
      return opcoes.ajustarCopia ? opcoes.ajustarCopia(copiaGuardada) : copiaGuardada
    } catch (e) {
      if (!ehFalhaDeRede(e)) throw e
      marcarFalhaDeRede()
    }
  }

  const salvo = await lerLocal<T>(k)
  const copia = salvo !== undefined ? salvo : 'padrao' in opcoes ? (opcoes.padrao as T) : undefined
  if (copia === undefined) throw new SemConexaoError()
  return opcoes.ajustarCopia ? opcoes.ajustarCopia(copia) : copia
}

/** Só a cópia local (sem rede). */
export async function lerDoCache<T>(chave: string): Promise<T | undefined> {
  return lerLocal<T>(chaveCache(await usuarioId(), chave))
}

/**
 * Atualiza a cópia local depois de um registro. `fn` recebe a cópia atual
 * (ou undefined se nunca foi lida) e devolve a nova; undefined = não mexe.
 */
export async function mexerNoCache<T>(chave: string, fn: (atual: T | undefined) => T | undefined): Promise<void> {
  const k = chaveCache(await usuarioId(), chave)
  const novo = fn(await lerLocal<T>(k))
  if (novo !== undefined) {
    versoes.set(k, versao(k) + 1)
    await gravarLocal(k, novo)
  }
}

/** Lança se der pra afirmar que não há rede (pra ações que só existem online). */
export function exigirRede(): void {
  if (!valeTentarRede()) throw new SemConexaoError()
}
