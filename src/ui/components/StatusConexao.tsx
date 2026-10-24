import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { aoMudarConexao, estaOnline } from '@data/offline/conexao'
import { aoMudarFila, aoRecusarEnvio, aoSincronizar, pendentes } from '@data/offline/fila'
import { avisar } from '@ui/feedback'

/**
 * Selo discreto no topo quando o app está sem internet ou ainda tem registro
 * feito offline esperando subir. Some sozinho quando tudo sobe, com um aviso
 * curto. Se o servidor recusar algo feito offline (ex.: limite do grátis),
 * avisa em vez de sumir calado.
 */
export function StatusConexao() {
  const { session } = useSession()
  const t = useI18n().m.offline
  const [online, setOnline] = useState(estaOnline())
  const [fila, setFila] = useState(0)

  useEffect(() => aoMudarConexao(setOnline), [])

  useEffect(() => {
    if (!session) return
    let vivo = true
    void pendentes().then((n) => vivo && setFila(n))
    const tirarFila = aoMudarFila((n) => setFila(n))
    const tirarSinc = aoSincronizar(() => avisar.ok(t.enviado))
    const tirarRecusa = aoRecusarEnvio(() => avisar.erro(t.recusado))
    return () => {
      vivo = false
      tirarFila()
      tirarSinc()
      tirarRecusa()
    }
  }, [session, t])

  if (!session || (online && fila === 0)) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 6px)' }}
    >
      <span className="flex max-w-full items-center gap-2 rounded-pill border border-surface-4 bg-surface-3/95 px-3 py-1.5 text-micro font-semibold text-content-mid shadow-lg">
        <span
          aria-hidden="true"
          className={`h-2 w-2 flex-none rounded-full ${online ? 'bg-brand motion-safe:animate-pulse' : 'bg-accent-gold'}`}
        />
        <span className="truncate">{fila > 0 ? t.pendentes(fila) : t.faixa}</span>
      </span>
    </div>
  )
}
