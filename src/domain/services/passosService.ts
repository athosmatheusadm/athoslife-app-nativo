import {
  passosDeHoje,
  pedirPermissaoPassos,
  saudeDisponivel,
} from '@data/health/healthConnect'
import { passosRepository, type PassosDoDia } from '@data/repositories/passosRepository'

/**
 * Serviço de passos — a fachada que a UI usa.
 *
 * Junta os dois mundos, e é o único lugar que decide qual usar:
 *  - Health Connect disponível + permitido -> lê automático e grava no banco.
 *  - Senão -> registro manual (como no PWA).
 *
 * A Home e o disco de passos falam só com este serviço. Eles não sabem se o
 * número veio do sensor ou foi digitado — só recebem PassosDoDia.
 */

export type FontePassos = 'health_connect' | 'manual'

export interface EstadoPassos extends PassosDoDia {
  readonly fonte: FontePassos
}

export const passosService = {
  /** O aparelho tem Health Connect utilizável? Decide se oferece o automático. */
  async automaticoDisponivel(): Promise<boolean> {
    return saudeDisponivel()
  },

  /** Pede permissão e, se concedida, faz a primeira sincronização. */
  async ativarAutomatico(metaPadrao: number): Promise<EstadoPassos | null> {
    const ok = await pedirPermissaoPassos()
    if (!ok) return null
    return this.sincronizar(metaPadrao)
  },

  /**
   * Lê do Health Connect e grava no banco (mantém histórico e permite os
   * lembretes/relatórios lerem sempre da mesma fonte: passos_diarios).
   * Se o Health Connect não devolver, cai no que já está no banco.
   */
  async sincronizar(metaPadrao: number): Promise<EstadoPassos> {
    const doSensor = await passosDeHoje()

    if (doSensor !== null) {
      const atualBanco = await passosRepository.doDia(metaPadrao)
      // Só grava se mudou, pra não escrever à toa a cada abertura.
      if (doSensor !== atualBanco.passos) {
        await passosRepository.registrar(doSensor, atualBanco.meta)
      }
      return { passos: doSensor, meta: atualBanco.meta, fonte: 'health_connect' }
    }

    const manual = await passosRepository.doDia(metaPadrao)
    return { ...manual, fonte: 'manual' }
  },

  /** Registro manual (fallback), quando não há Health Connect. */
  async registrarManual(passos: number, meta: number): Promise<EstadoPassos> {
    await passosRepository.registrar(passos, meta)
    return { passos, meta, fonte: 'manual' }
  },

  /** Só lê o que está no banco, sem tocar no sensor (abertura rápida). */
  async doBanco(metaPadrao: number): Promise<PassosDoDia> {
    return passosRepository.doDia(metaPadrao)
  },
}
