import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Bottom nav — fiel ao modelo (athoslife_v7_3.html: .bottom-nav/.ni/.ni-icon).
 *
 * "Conquistas" saiu daqui de propósito: não é mais aba fixa, virou linha
 * dentro do Perfil (avatar no canto superior direito de cada tela). Ver
 * `ProfileAvatar` e `domain/entities/conquista.ts`.
 *
 * "Scanner" saiu daqui em 2026-09-24: virou uma opção dentro do menu de
 * cada refeição na Dieta (MealSheet → "Escanear comida"), não precisa mais
 * de aba própria. A rota `/scanner` continua existindo, só não tem mais
 * atalho fixo aqui.
 */
const ITENS = [
  { to: '/home', chave: 'home' },
  { to: '/dieta', chave: 'dieta' },
  { to: '/treinos', chave: 'treinos' },
  { to: '/habitos', chave: 'habitos' },
] as const

/** Verde menta (01/11): emoji → ícones de traço (Lucide, ISC: House, Salad, Dumbbell, Sprout). */
const ICONES_NAV: Record<(typeof ITENS)[number]['chave'], ReactNode> = {
  home: (<><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>),
  dieta: (<><path d="M7 21h10" /><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" /><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1" /><path d="m13 12 4-4" /><path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2" /></>),
  treinos: (<><path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" /><path d="m2.5 21.5 1.4-1.4" /><path d="m20.1 3.9 1.4-1.4" /><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" /><path d="m9.6 14.4 4.8-4.8" /></>),
  habitos: (<><path d="M7 20h10" /><path d="M10 20c5.5-2.5.8-6.4 3-10" /><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" /><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" /></>),
}

/**
 * UI/UX (09/10): legenda era 7px (abaixo do piso de 12px) e o alvo de toque
 * era só o tamanho do ícone. Agora cada aba ocupa 1/4 da largura com 56px
 * de altura, e os rótulos vêm do i18n.
 */
export function BottomNav() {
  const { m } = useI18n()
  return (
    <nav
      aria-label={m.nav.rotulo}
      className="fixed inset-x-0 bottom-0 z-10 flex items-stretch border-t border-surface-1 bg-surface-nav/[0.97] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      {ITENS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-transform active:scale-95"
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-content-hi/[0.09] text-content-hi' : 'text-content-dim'
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={22}
                  height={22}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONES_NAV[item.chave]}
                </svg>
              </span>
              <span className={`text-micro font-semibold ${isActive ? 'text-content-hi' : 'text-content-low'}`}>
                {m.nav[item.chave]}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
