import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { POLITICA, TERMOS } from './documentos'

/**
 * Termos / Política dentro do app — rota pública (abre do Consentimento,
 * antes de qualquer aceite, e do Perfil > Sobre).
 */
export function DocumentoLegal({ tipo }: { tipo: 'termos' | 'politica' }) {
  const { idioma, m } = useI18n()
  const navigate = useNavigate()
  const doc = (tipo === 'termos' ? TERMOS : POLITICA)[idioma]

  return (
    <main className="min-h-full bg-surface-1 pt-safe-t">
      <div className="mx-auto max-w-[640px] animate-rise px-5 pb-10 pt-4">
        <button type="button" onClick={() => navigate(-1)} className="-ml-2 min-h-11 px-2 text-sm text-content-low active:text-content-hi">
          ← {m.comum.voltar}
        </button>
        <h1 className="mt-2 text-2xl font-extrabold text-content-hi">{doc.titulo}</h1>
        <p className="mt-1 text-micro text-content-low">{doc.atualizado}</p>
        {doc.secoes.map((s) => (
          <section key={s.titulo} className="mt-6">
            <h2 className="text-base font-bold text-content-hi">{s.titulo}</h2>
            {s.paragrafos.map((p) => (
              <p key={p} className="mt-2 text-sm leading-relaxed text-content-mid">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  )
}
