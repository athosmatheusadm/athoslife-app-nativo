import { Health } from '@capgo/capacitor-health'

/**
 * Health Connect (Android) isolado atrás de uma interface simples.
 *
 * Por que existe: o app não conta passos sozinho — ele PEDE ao Health
 * Connect os passos que o celular/pulseira já contaram. Aqui mora todo o
 * contato com o plugin nativo (@capgo/capacitor-health). O domínio não
 * conhece Health Connect; recebe só um número. Trocar de plugin ou ligar
 * o iOS/HealthKit no futuro não toca no resto do app.
 *
 * IMPORTANTE (mudança da Google em jun/2026): a leitura usa o TOTAL
 * AGREGADO do dia (queryAggregated, sum), sem filtrar por origem. Assim os
 * passos contados pelo próprio aparelho entram e a mudança de atribuição
 * não quebra a conta.
 */

/** O Health Connect existe e está utilizável neste aparelho? */
export async function saudeDisponivel(): Promise<boolean> {
  try {
    const r = await Health.isAvailable()
    return r.available
  } catch {
    return false
  }
}

/** Pede permissão de leitura de passos. Retorna se ficou concedida. */
export async function pedirPermissaoPassos(): Promise<boolean> {
  try {
    await Health.requestAuthorization({ read: ['steps'] })
    const status = await Health.checkAuthorization({ read: ['steps'] })
    return status.readAuthorized.includes('steps')
  } catch {
    return false
  }
}

/**
 * Lê o total de passos de hoje (agregado por dia, soma).
 * Retorna null se não deu (sem permissão, indisponível) — quem chama
 * decide cair no registro manual.
 */
export async function passosDeHoje(): Promise<number | null> {
  try {
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)
    const fim = new Date()

    const r = await Health.queryAggregated({
      dataType: 'steps',
      startDate: inicio.toISOString(),
      endDate: fim.toISOString(),
      bucket: 'day',
      aggregation: 'sum',
    })

    const total = r.samples.reduce((soma, s) => soma + (s.value ?? 0), 0)
    return Math.round(total)
  } catch {
    return null
  }
}

/** Abre os ajustes do Health Connect (quando o usuário revoga a permissão). */
export async function abrirAjustesSaude(): Promise<void> {
  try {
    await Health.openHealthConnectSettings()
  } catch {
    // Sem Health Connect instalado — sem o que abrir.
  }
}
