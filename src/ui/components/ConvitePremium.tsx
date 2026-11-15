import { ActivityIcon } from '@ui/components/ActivityIcon'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Cartão de "isso é do Premium" com o botão que leva à tela de planos.
 * Recurso travado nunca fica só no texto: sempre tem pra onde ir (dono,
 * 15/11/2026). `onIr` deixa quem está dentro de uma folha (chat do Life)
 * fechar a folha antes de navegar — senão a tela de planos abre por trás.
 */
export function ConvitePremium(props: { titulo?: string; texto: string; onIr: () => void }) {
  const t = useI18n().m.plano
  return (
    <section className="rounded-card border border-accent-gold/40 bg-surface-2 p-4 text-center">
      <ActivityIcon icone="cadeado" tile={false} cor="inherit" className="mx-auto h-8 w-8 text-accent-gold" />
      <p className="mt-2 font-semibold text-content-hi">{props.titulo ?? t.premiumTitulo}</p>
      <p className="mt-1 text-sm text-content-mid">{props.texto}</p>
      <button
        type="button"
        onClick={props.onIr}
        className="mt-3 min-h-12 w-full rounded-pill bg-brand text-sm font-bold text-brand-ink active:scale-[0.98]"
      >
        {t.serPremium}
      </button>
    </section>
  )
}
