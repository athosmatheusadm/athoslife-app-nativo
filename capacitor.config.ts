import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.athoslife.app',
  appName: 'ATHOSlife',
  webDir: 'dist',
  android: {
    backgroundColor: '#161616',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#161616',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#161616',
    },
    LocalNotifications: {
      // Sem `smallIcon` de propósito: não existe um ícone de status bar
      // dedicado em android/res ainda (só os ic_launcher coloridos, que não
      // servem pra isso). Sem essa chave, o Capacitor usa o ícone do app.
      iconColor: '#22c55e',
    },
  },
}

export default config
