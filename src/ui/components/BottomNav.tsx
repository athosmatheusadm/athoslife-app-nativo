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
  { to: '/home', icone: '🏠', chave: 'home' },
  { to: '/dieta', icone: '🥗', chave: 'dieta' },
  { to: '/treinos', icone: '🏋️', chave: 'treinos' },
  { to: '/habitos', icone: '🌱', chave: 'habitos' },
] as const

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
                className="text-xl leading-none"
                style={isActive ? { filter: 'drop-shadow(0 0 5px rgba(34,197,94,0.5))' } : undefined}
                aria-hidden="true"
              >
                {item.icone}
              </span>
              <span className={`text-micro font-bold ${isActive ? 'text-brand' : 'text-content-low'}`}>
                {m.nav[item.chave]}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
