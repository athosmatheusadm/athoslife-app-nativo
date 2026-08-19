import { NavLink } from 'react-router-dom'

/**
 * Bottom nav — fiel ao modelo (athoslife_v7_3.html: .bottom-nav/.ni/.ni-icon).
 *
 * "Conquistas" saiu daqui de propósito: não é mais aba fixa, virou linha
 * dentro do Perfil (avatar no canto superior direito de cada tela). Ver
 * `ProfileAvatar` e `domain/entities/conquista.ts`.
 */
const ITENS = [
  { to: '/home', icone: '🏠', rotulo: 'Home' },
  { to: '/dieta', icone: '🥗', rotulo: 'Dieta' },
  { to: '/treinos', icone: '🏋️', rotulo: 'Treinos' },
  { to: '/habitos', icone: '🌱', rotulo: 'Hábitos' },
  { to: '/scanner', icone: '📷', rotulo: 'Scanner' },
] as const

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-surface-1 bg-[rgba(10,10,10,0.97)] px-1 pb-[calc(16px+env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md"
    >
      {ITENS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className="flex flex-col items-center gap-1 px-2 py-1"
        >
          {({ isActive }) => (
            <>
              <span
                className="text-[17px] leading-none"
                style={isActive ? { filter: 'drop-shadow(0 0 5px rgba(34,197,94,0.5))' } : undefined}
                aria-hidden="true"
              >
                {item.icone}
              </span>
              <span className={`text-[7px] font-bold ${isActive ? 'text-brand' : 'text-content-dim'}`}>
                {item.rotulo}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
