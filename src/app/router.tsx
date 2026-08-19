import { createBrowserRouter, Outlet } from 'react-router-dom'
import { RequireAnon, RequireAuth } from './Guards'
import { useAndroidBackButton } from './useAndroidBackButton'
import { AppShell } from './AppShell'
import { Login } from '@ui/screens/Login'
import { Consentimento } from '@ui/screens/Consentimento'
import { Onboarding } from '@ui/screens/Onboarding'
import { Home } from '@ui/screens/Home'
import { Dieta } from '@ui/screens/Dieta'
import { Treinos } from '@ui/screens/Treinos'
import { Habitos } from '@ui/screens/Habitos'
import { Scanner } from '@ui/screens/Scanner'
import { Perfil } from '@ui/screens/Perfil'
import { Conquistas } from '@ui/screens/Conquistas'

/** Casca do app: liga o botão Voltar dentro do contexto do roteador. */
function Shell() {
  useAndroidBackButton()
  return <Outlet />
}

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/login', element: <RequireAnon><Login /></RequireAnon> },
      { path: '/consentimento', element: <Consentimento /> },
      { path: '/onboarding', element: <Onboarding /> },
      {
        element: <RequireAuth><Outlet /></RequireAuth>,
        children: [
          {
            // As 5 abas raiz — com bottom nav.
            element: <AppShell />,
            children: [
              { path: '/home', element: <Home /> },
              { path: '/dieta', element: <Dieta /> },
              { path: '/treinos', element: <Treinos /> },
              { path: '/habitos', element: <Habitos /> },
              { path: '/scanner', element: <Scanner /> },
              { path: '*', element: <Home /> },
            ],
          },
          // Perfil e sub-páginas: tela cheia, sem bottom nav (slide-in).
          // Conquistas mora aqui — deixou de ser aba fixa.
          { path: '/perfil', element: <Perfil /> },
          { path: '/perfil/conquistas', element: <Conquistas /> },
        ],
      },
    ],
  },
])
