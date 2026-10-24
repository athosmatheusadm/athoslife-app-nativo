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
    try {
      const valor = await buscar()
      await gravarLocal(k, valor)
      if (opcoes.validadeMs) await gravarLocal(kEm, Date.now())
      return valor
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
  if (novo !== undefined) await gravarLocal(k, novo)
}

/** Lança se der pra afirmar que não há rede (pra ações que só existem online). */
export function exigirRede(): void {
  if (!valeTentarRede()) throw new SemConexaoError()
}
