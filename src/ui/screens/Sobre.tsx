import { useNavigate } from 'react-router-dom'

/**
 * Sub-página "Sobre" do Perfil.
 *
 * Termos de uso e política de privacidade ainda não existem como
 * documento de verdade em lugar nenhum do projeto (Consentimento.tsx
 * continua esqueleto da Fase 0) — mostrar link pra um texto que não
 * existe seria pior que não ter a seção. Fica honesto: "em breve".
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
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-3xl">
          🦎
        </span>
        <p className="mt-3 text-lg font-bold text-content-hi">ATHOSlife</p>
        <p className="text-micro text-content-dim">Versão 1.0.0</p>
      </section>

      <nav className="mx-5 divide-y divide-surface-4/50 overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
        <LinhaEmBreve titulo="Termos de uso" />
        <LinhaEmBreve titulo="Política de privacidade" />
        <LinhaEmBreve titulo="Suporte" />
      </nav>

      <p className="mx-5 mt-4 text-micro text-content-dim">
        Termos, política e canal de suporte ainda não foram publicados.
      </p>
    </main>
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
