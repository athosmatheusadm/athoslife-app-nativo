/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Só em `npm run dev`: 'true' mostra a interface como plano pago (ver access.ts). */
  readonly VITE_DEV_PREMIUM?: string
  /** Chave pública Android do RevenueCat (goog_...). Vazia = assinatura desligada. */
  readonly VITE_RC_GOOGLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.png' {
  const src: string
  export default src
}
