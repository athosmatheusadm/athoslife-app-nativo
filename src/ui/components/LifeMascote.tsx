/**
 * O Life em PNG/WebP transparente, um humor por contexto (imagens do dono,
 * 2026-09-28 — fundo preto recortado; o roxo "calmo" veio do HTML do
 * onboarding):
 *
 *   normal      Home
 *   feliz       Hábitos firmes
 *   calmo       Hábitos em atenção, consentimento, fim do onboarding
 *   treino      Treinos, boas-vindas
 *   chef        Cozinha, Scanner, alimentação
 *   hidratado   água (Life azul)
 *   desidratado água abaixo da meta
 *   conquista   Conquistas (Life dourado)
 *   resgate     volta depois de dias sem abrir o app
 */
export type HumorLife =
  | 'normal'
  | 'feliz'
  | 'calmo'
  | 'treino'
  | 'chef'
  | 'hidratado'
  | 'desidratado'
  | 'conquista'
  | 'resgate'

export function srcLife(humor: HumorLife): string {
  return `/life/${humor}.webp`
}

export function LifeMascote(props: { humor: HumorLife; className?: string; alt?: string }) {
  return (
    <img
      src={srcLife(props.humor)}
      alt={props.alt ?? 'Life'}
      draggable={false}
      className={`w-auto select-none object-contain drop-shadow-xl ${props.className ?? 'h-24'}`}
    />
  )
}
