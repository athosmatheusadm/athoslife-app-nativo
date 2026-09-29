import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from '@app/SessionProvider'
import { SessaoTreinoProvider } from '@app/SessaoTreinoProvider'
import { router } from '@app/router'
import { I18nProvider } from '@/i18n/I18nProvider'
import { aplicarPreferencias } from '@ui/theme/preferenciasAcessibilidade'

aplicarPreferencias()

export default function App() {
  return (
    <SessionProvider>
      <I18nProvider>
        <SessaoTreinoProvider>
          <RouterProvider router={router} />
        </SessaoTreinoProvider>
      </I18nProvider>
    </SessionProvider>
  )
}
