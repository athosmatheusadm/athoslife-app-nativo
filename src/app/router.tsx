import { createBrowserRouter, Outlet } from 'react-router-dom'
import { RequireAnon, RequireAuth } from './Guards'
import { useAndroidBackButton } from './useAndroidBackButton'
import { IntegracoesNativas } from './IntegracoesNativas'
import { AppShell } from './AppShell'
import { Login } from '@ui/screens/Login'
import { RecuperarSenha } from '@ui/screens/RecuperarSenha'
import { Consentimento } from '@ui/screens/Consentimento'
import { Onboarding } from '@ui/screens/Onboarding'
import { Home } from '@ui/screens/Home'
import { Dieta } from '@ui/screens/Dieta'
import { Treinos } from '@ui/screens/Treinos'
import { Habitos } from '@ui/screens/Habitos'
import { Scanner } from '@ui/screens/Scanner'
import { Perfil } from '@ui/screens/Perfil'
import { Conquistas } from '@ui/screens/Conquistas'
import { Conta } from '@ui/screens/Conta'
import { Metas } from '@ui/screens/Metas'
import { Plano } from '@ui/screens/Plano'
import { Privacidade } from '@ui/screens/Privacidade'
import { Notificacoes } from '@ui/screens/Notificacoes'
import { Acessibilidade } from '@ui/screens/Acessibilidade'
import { Sobre } from '@ui/screens/Sobre'
import { Cozinha } from '@ui/screens/Cozinha'

/** Casca do app: liga o botão Voltar dentro do contexto do roteador. */
function Shell() {
  useAndroidBackButton()
  return (
    <>
      <IntegracoesNativas />
      <Outlet />
    </>
  )
}

export const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/login', element: <RequireAnon><Login /></RequireAnon> },
      // Fora do RequireAnon: validar o código já abre sessão (ver RecuperarSenha).
      { path: '/recuperar-senha', element: <RecuperarSenha /> },
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
          { path: '/perfil/conta', element: <Conta /> },
          { path: '/perfil/metas', element: <Metas /> },
          { path: '/perfil/plano', element: <Plano /> },
          { path: '/perfil/privacidade', element: <Privacidade /> },
          { path: '/perfil/notificacoes', element: <Notificacoes /> },
          { path: '/perfil/acessibilidade', element: <Acessibilidade /> },
          { path: '/perfil/sobre', element: <Sobre /> },
          { path: '/dieta/cozinha/:id', element: <Cozinha /> },
        ],
      },
    ],
  },
])
