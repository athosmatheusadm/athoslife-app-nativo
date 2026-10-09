import { Device } from '@capacitor/device'

/**
 * Identificador do aparelho, só pra regra "um teste grátis por aparelho"
 * (liberar_teste_gratis). No Android é o ANDROID_ID: o mesmo depois de
 * desinstalar e instalar de novo; só muda com reset de fábrica. O servidor
 * guarda apenas um hash dele, sem ligar à conta.
 * No navegador (npm run dev) o plugin inventa um id e guarda no navegador —
 * serve pra testar, não protege nada.
 */
export async function idDoAparelho(): Promise<string | null> {
  try {
    const { identifier } = await Device.getId()
    return identifier || null
  } catch {
    return null
  }
}
