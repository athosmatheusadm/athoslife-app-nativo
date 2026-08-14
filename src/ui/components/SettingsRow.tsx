import type { ReactNode } from 'react'

/**
 * Linha de ajustes reutilizável — a peça única que monta o Perfil inteiro
 * e qualquer lista de configuração futura. Uma peça, muitos usos.
 *
 * Padrão validado com o dono do produto: estilo Ajustes do WhatsApp
 * (ícone de contorno + título + legenda cinza), toque desliza para a
 * sub-página.
 */
export function SettingsRow(props: {
  icon: ReactNode
  title: string
  subtitle?: string
  trailing?: ReactNode
  danger?: boolean
  onClick?: () => void
}) {
  const { icon, title, subtitle, trailing, danger, onClick } = props
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-[18px] px-5 py-3.5 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]"
    >
      <span
        className={`flex w-7 flex-none items-center justify-center ${
          danger ? 'text-accent-danger' : 'text-content-low'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={`block font-medium ${
            danger ? 'text-accent-danger' : 'text-content-hi'
          }`}
        >
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block text-micro leading-snug text-content-dim">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && <span className="flex-none text-content-dim">{trailing}</span>}
    </button>
  )
}
