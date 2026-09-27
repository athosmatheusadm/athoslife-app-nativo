import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from '@app/SessionProvider'
import { SessaoTreinoProvider } from '@app/SessaoTreinoProvider'
import { router } from '@app/router'
import { aplicarPreferencias } from '@ui/theme/preferenciasAcessibilidade'

aplicarPreferencias()

export default function App() {
  return (
    <SessionProvider>
      <SessaoTreinoProvider>
        <RouterProvider router={router} />
      </SessaoTreinoProvider>
    </SessionProvider>
  )
}
