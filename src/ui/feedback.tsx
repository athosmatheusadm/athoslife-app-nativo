import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Toaster, toast } from 'sonner'

/**
 * Retorno ao usuário depois de uma ação: vibração (só no aparelho) e aviso
 * curto embaixo da tela (sonner). Regra da skill de UI/UX: ação que grava
 * vibra leve; sucesso de algo importante vibra "sucesso"; erro avisa o que
 * houve, sem jargão; excluir oferece "Desfazer" em vez de pedir confirmação.
 * Os textos vêm do i18n de quem chama.
 */

const nativo = Capacitor.isNativePlatform()

export const vibrar = {
  leve(): void {
    if (nativo) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  },
  sucesso(): void {
    if (nativo) void Haptics.notification({ type: NotificationType.Success }).catch(() => {})
  },
}

export const avisar = {
  ok(texto: string): void {
    toast(texto, { duration: 2500 })
  },
  erro(texto: string): void {
    toast(texto, { duration: 4000, className: 'athos-toast-erro' })
  },
  /** "Excluído · Desfazer" — 5 s pra voltar atrás. */
  desfazer(texto: string, rotuloDesfazer: string, aoDesfazer: () => void): void {
    toast(texto, { duration: 5000, action: { label: rotuloDesfazer, onClick: aoDesfazer } })
  },
}

/** Uma vez na raiz do app. Fica acima da barra de baixo (≈ 72 px + safe area). */
export function Avisos() {
  return (
    <Toaster
      position="bottom-center"
      offset={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
      mobileOffset={{ bottom: 'calc(84px + env(safe-area-inset-bottom))', left: 16, right: 16 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-2xl border border-surface-4 bg-surface-3 px-4 py-3 text-sm font-medium text-content-hi shadow-lg',
          title: 'flex-1',
          actionButton:
            'min-h-11 flex-none rounded-xl px-3 text-sm font-bold text-brand active:bg-brand/10',
        },
      }}
    />
  )
}
