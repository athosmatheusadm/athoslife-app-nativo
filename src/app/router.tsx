import { createBrowserRouter, Outlet } from 'react-router-dom'
import { RequireAnon, RequireAuth } from './Guards'
import { useAndroidBackButton } from './useAndroidBackButton'
import { Login } from '@ui/screens/Login'
import { Consentimento } from '@ui/screens/Consentimento'
import { Onboarding } from '@ui/screens/Onboarding'
import { Home } from '@ui/screens/Home'

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
      { path: '/home', element: <RequireAuth><Home /></RequireAuth> },
      { path: '*', element: <RequireAuth><Home /></RequireAuth> },
    ],
  },
])
