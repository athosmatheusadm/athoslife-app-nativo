import { Outlet } from 'react-router-dom'
import { BottomNav } from '@ui/components/BottomNav'

/**
 * Casca das 5 abas raiz (Home, Dieta, Treinos, Hábitos, Scanner).
 * Perfil e suas sub-páginas (ex.: Conquistas) ficam FORA daqui —
 * são telas cheias que deslizam por cima, sem bottom nav.
 */
export function AppShell() {
  return (
    <div className="relative min-h-full">
      <Outlet />
      <BottomNav />
    </div>
  )
}
