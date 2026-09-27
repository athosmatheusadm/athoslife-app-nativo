import type { CapacitorConfig } from '@capacitor/cli'

// APK de teste com atualização ao vivo: quando CAP_SERVER_URL existe na hora
// do `cap sync`, o app abre as telas direto do `npm run dev` do PC em vez das
// que vão dentro do APK. Só a automação "APK de teste" define essa variável —
// o build da Play Store nunca passa por aqui.
const servidorDev = process.env.CAP_SERVER_URL

const config: CapacitorConfig = {
  appId: 'br.com.athoslife.app',
  appName: 'ATHOSlife',
  webDir: 'dist',
  ...(servidorDev ? { server: { url: servidorDev, cleartext: true } } : {}),
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
