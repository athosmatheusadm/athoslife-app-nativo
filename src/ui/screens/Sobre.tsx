import { useNavigate } from 'react-router-dom'
import { LifeMascote } from '@ui/components/LifeMascote'
import { Chevron } from '@ui/components/Chevron'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Sub-página "Sobre" do Perfil. Termos e Política abrem os documentos
 * de ui/screens/legal (rascunho de 2026-09-28, a revisar por advogado).
 * Suporte segue "em breve" — ainda não existe canal.
 */
export function Sobre() {
  const navigate = useNavigate()
  const t = useI18n().m.perfil.sobre

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <section className="flex flex-col items-center px-5 pb-6 pt-4 text-center">
        <LifeMascote humor="normal" alt="" className="h-24" />
        <p className="mt-3 text-lg font-bold text-content-hi">ATHOSlife</p>
        <p className="text-micro text-content-low">{t.versao}</p>
      </section>

      <nav className="mx-5 divide-y divide-surface-4/50 overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
        <LinhaLink titulo={t.termos} onClick={() => navigate('/termos')} />
        <LinhaLink titulo={t.politica} onClick={() => navigate('/politica-de-privacidade')} />
        <LinhaLink titulo={t.licencas} onClick={() => navigate('/perfil/sobre/licencas')} />
        <LinhaEmBreve titulo={t.suporte} rotulo={t.emBreve} />
      </nav>

      <p className="mx-5 mt-4 text-micro text-content-low">{t.suporteNota}</p>
      <p className="mx-5 mt-6 text-center text-micro text-brand/70">{t.creditos}</p>
    </main>
  )
}

function LinhaLink({ titulo, onClick }: { titulo: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-14 w-full items-center justify-between px-4 text-left active:bg-content-hi/5">
      <span className="text-sm text-content-mid">{titulo}</span>
      <Chevron />
    </button>
  )
}

function LinhaEmBreve({ titulo, rotulo }: { titulo: string; rotulo: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between px-4">
      <span className="text-sm text-content-mid">{titulo}</span>
      <span className="text-micro font-semibold text-content-low">{rotulo}</span>
    </div>
  )
}
