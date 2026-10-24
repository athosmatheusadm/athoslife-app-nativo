import { useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { LifeMascote } from '@ui/components/LifeMascote'

/**
 * Abriu sem internet e sem nada guardado no aparelho (1º acesso neste
 * celular). Antes o app ficava girando pra sempre; agora explica e deixa
 * tentar de novo. Com o perfil já guardado, o app abre direto offline.
 */
export function SemConexao() {
  const { refresh } = useSession()
  const t = useI18n().m.offline
  const [tentando, setTentando] = useState(false)

  async function tentar() {
    setTentando(true)
    try {
      await refresh()
    } finally {
      setTentando(false)
    }
  }

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 bg-surface-1 px-6 pt-safe-t text-center animate-rise">
      <LifeMascote humor="calmo" className="h-28" alt="" />
      <h1 className="text-2xl font-bold text-content-hi">{t.titulo}</h1>
      <p className="max-w-xs text-sm text-content-mid">{t.texto}</p>
      <button
        type="button"
        onClick={() => void tentar()}
        disabled={tentando}
        className="mt-2 min-h-12 w-full max-w-xs rounded-pill bg-brand text-base font-bold text-surface-1 transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {tentando ? t.tentando : t.tentarDeNovo}
      </button>
    </main>
  )
}
