import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { planosRepository } from '@data/repositories/planosRepository'
import { useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { ConvitePremium } from '@ui/components/ConvitePremium'

/**
 * Fim do teste / do Premium (dono, 18/11): ao abrir Treino ou Dieta, se o
 * Premium acabou e ainda há algo que o Life montou, o cartão do Premium sobe.
 * "Quero ser Premium" vai pra tela de planos sem apagar nada (se não assinar,
 * o cartão volta na próxima vez). "Agora não" limpa só o que o Life montou —
 * o que a pessoa montou sozinha fica — e a área fica livre pra ela.
 */
export function FimDoPremium(props: { area: 'treino' | 'dieta'; onLimpo: () => void }) {
  const { m } = useI18n()
  const t = m.plano
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [limpando, setLimpando] = useState(false)

  useEffect(() => {
    let vivo = true
    void planosRepository.planoDoLifeVencido().then((v) => {
      if (vivo && (props.area === 'treino' ? v.treino : v.dieta) > 0) setAberto(true)
    })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function agoraNao() {
    if (limpando) return
    setLimpando(true)
    try {
      await planosRepository.limparPlanoDoLife()
      setAberto(false)
      props.onLimpo()
    } catch {
      // sem rede: fecha e tenta de novo na próxima vez que abrir a tela
      setAberto(false)
    } finally {
      setLimpando(false)
    }
  }

  useFecharNoVoltar(aberto, () => void agoraNao())
  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t.fimTitulo}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]" aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />
        <ConvitePremium titulo={t.fimTitulo} texto={t.fimTexto} onIr={() => navigate('/perfil/plano')} />
        <button
          type="button"
          onClick={() => void agoraNao()}
          disabled={limpando}
          className="mt-3 min-h-12 w-full rounded-pill border border-surface-4 text-sm font-semibold text-content-mid active:scale-[0.98] disabled:opacity-50"
        >
          {t.fimAgoraNao}
        </button>
      </div>
    </div>
  )
}
