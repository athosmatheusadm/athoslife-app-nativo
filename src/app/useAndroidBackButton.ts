import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { useLocation, useNavigate } from 'react-router-dom'

/** Telas onde "Voltar" deve sair do app, não navegar. */
const RAIZES = new Set(['/home', '/login', '/dieta', '/treinos', '/habitos'])

/**
 * Botão físico "Voltar" do Android.
 *
 * O PWA não tinha isso e é uma das causas mais comuns de rejeição por
 * UX na Play Store: sem tratamento, o botão fecha o app do nada no meio
 * de um fluxo. Comportamento esperado pelo usuário Android:
 * - tela interna  -> volta uma tela
 * - tela raiz     -> minimiza o app (não destrói o processo)
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const handle = App.addListener('backButton', ({ canGoBack }) => {
      if (RAIZES.has(location.pathname) || !canGoBack) {
        void App.minimizeApp()
        return
      }
      navigate(-1)
    })

    return () => {
      void handle.then((h) => h.remove())
    }
  }, [navigate, location.pathname])
}
