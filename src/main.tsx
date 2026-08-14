import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@capacitor/splash-screen'
import App from './App'
import '@ui/theme/globals.css'

const container = document.getElementById('root')
if (!container) throw new Error('Elemento #root não encontrado')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Splash nativa sai só quando o React já pintou — sem flash branco.
void SplashScreen.hide()
