import { useNavigate } from 'react-router-dom'
import { LifeMascote } from '@ui/components/LifeMascote'
import { Chevron } from '@ui/components/Chevron'

/**
 * Sub-página "Sobre" do Perfil. Termos e Política abrem os documentos
 * de ui/screens/legal (rascunho de 2026-09-28, a revisar por advogado).
 * Suporte segue "em breve" — ainda não existe canal.
 */
export function Sobre() {
  const navigate = useNavigate()

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">Sobre</h1>
      </header>

      <section className="flex flex-col items-center px-5 pb-6 pt-4 text-center">
        <LifeMascote humor="normal" className="h-24" />
        <p className="mt-3 text-lg font-bold text-content-hi">ATHOSlife</p>
        <p className="text-micro text-content-dim">Versão 1.0.0</p>
      </section>

      <nav className="mx-5 divide-y divide-surface-4/50 overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
        <LinhaLink titulo="Termos de uso" onClick={() => navigate('/termos')} />
        <LinhaLink titulo="Política de privacidade" onClick={() => navigate('/politica-de-privacidade')} />
        <LinhaEmBreve titulo="Suporte" />
      </nav>

      <p className="mx-5 mt-4 text-micro text-content-dim">
        O canal de suporte ainda não foi publicado.
      </p>
    </main>
  )
}

function LinhaLink({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
      <span className="text-sm text-content-mid">{titulo}</span>
      <Chevron />
    </button>
  )
}

function LinhaEmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-content-mid">{titulo}</span>
      <span className="text-micro font-semibold text-content-dim">Em breve</span>
    </div>
  )
}
