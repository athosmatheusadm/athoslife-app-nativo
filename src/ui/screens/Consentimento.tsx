import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { useI18n } from '@/i18n/I18nProvider'
import { VERSAO_DOCUMENTOS } from './legal/documentos'

/**
 * Consentimento — vem antes do onboarding (ordem do Guards.tsx: dado de
 * saúde só é coletado depois do aceite; LGPD art. 11, GDPR art. 9).
 *
 * Termos + uso de dado de saúde são obrigatórios; hábitos a reduzir
 * (consentimento_habitos) é opcional. Depois de gravar, recarrega o perfil
 * e navega sozinho — antes a tela era esqueleto e a pessoa ficava presa.
 */
export function Consentimento() {
  const { refresh } = useSession()
  const { m } = useI18n()
  const c = m.consentimento
  const navigate = useNavigate()

  const [termos, setTermos] = useState(false)
  const [saude, setSaude] = useState(false)
  // Opcional e dado sensível: começa desmarcada (LGPD — o aceite parte de quem usa).
  const [habitos, setHabitos] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function aceitar() {
    if (!termos || !saude) {
      setErro(c.precisaAceitar)
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await profileRepository.aceitarConsentimento({ habitos, versao: VERSAO_DOCUMENTOS })
      await refresh()
      navigate('/onboarding', { replace: true })
    } catch {
      setErro(m.comum.erroGenerico)
      setSalvando(false)
    }
  }

  return (
    <main className="min-h-full bg-gradient-to-b from-[#070d09] to-[#07100a] pt-safe-t">
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] animate-rise flex-col px-5 pb-6 pt-4">
        <div className="text-lg font-extrabold tracking-tight text-content-hi">
          ATHOS<span className="italic text-[#9cff45]">life</span>
        </div>

        <div className="mt-4 flex justify-center">
          <img src="/life/calmo.webp" alt="Life" className="h-36 w-auto" />
        </div>

        <h1 className="mt-4 text-[1.375rem] font-extrabold leading-tight text-content-hi">{c.titulo}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#98a69d]">{c.lead}</p>

        <ul className="mt-4 space-y-2">
          {c.itens.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-[#cbd6ce]">
              <span className="mt-0.5 text-[#9cff45]" aria-hidden="true">•</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex gap-4 text-sm font-semibold">
          <Link to="/termos" className="text-[#9cff45] underline underline-offset-2">{c.verTermos}</Link>
          <Link to="/politica-de-privacidade" className="text-[#9cff45] underline underline-offset-2">{c.verPolitica}</Link>
        </div>

        <div className="mt-5 space-y-3">
          <Caixa marcada={termos} onMudar={setTermos}>{c.aceitoTermos}</Caixa>
          <Caixa marcada={saude} onMudar={setSaude}>{c.aceitoSaude}</Caixa>
          <Caixa marcada={habitos} onMudar={setHabitos}>{c.aceitoHabitos}</Caixa>
        </div>

        <div className="mt-auto pt-6">
          {erro && <p className="mb-3 text-center text-sm text-accent-danger">{erro}</p>}
          <button
            type="button"
            disabled={salvando}
            onClick={() => void aceitar()}
            className="min-h-[50px] w-full rounded-xl bg-gradient-to-b from-[#a7ff52] to-[#8df13d] text-base font-extrabold text-[#061006] disabled:opacity-60"
          >
            {c.botao} →
          </button>
        </div>
      </div>
    </main>
  )
}

function Caixa(props: { marcada: boolean; onMudar: (v: boolean) => void; children: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#294633] bg-[#08110c] p-3">
      <input
        type="checkbox"
        checked={props.marcada}
        onChange={(e) => props.onMudar(e.target.checked)}
        className="mt-0.5 h-5 w-5 flex-none accent-[#9cff45]"
      />
      <span className="text-sm leading-snug text-[#d8e2da]">{props.children}</span>
    </label>
  )
}
