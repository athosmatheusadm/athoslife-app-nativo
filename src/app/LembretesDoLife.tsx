import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useNavigate } from 'react-router-dom'
import { useSession } from './SessionProvider'
import { aoAplicarPlano, pedirAbrirLife } from './eventosLife'
import { aoMudarPausa } from '@data/lifePausa'
import { aoRegistrarNoDia } from '@data/registroDoDia'
import { nativo, replanejarLembretes } from '@data/notifications/lembretesDiarios'

const ROTAS = new Set(['/home', '/dieta', '/treinos', '/habitos'])

/**
 * Mantém os lembretes do dia em dia (sem UI): refaz a lista ao abrir, ao
 * voltar pro app e logo depois de qualquer registro (água, refeição, peso,
 * treino), pra o Life não cobrar o que já foi feito. Tocar no aviso abre
 * a tela certa.
 */
export function LembretesDoLife() {
  const { session, profile } = useSession()
  const navigate = useNavigate()
  const metaMl = profile?.metas.aguaMl ?? 2500
  const logado = !!session && !!profile?.onboardingCompleto

  useEffect(() => {
    if (!nativo || !logado) return
    void replanejarLembretes(metaMl)

    let espera: ReturnType<typeof setTimeout> | null = null
    // Vários registros seguidos (ex.: "adicionar tudo") viram um replanejamento só.
    const logoMais = () => {
      if (espera) clearTimeout(espera)
      espera = setTimeout(() => void replanejarLembretes(metaMl), 1500)
    }
    const tirarRegistro = aoRegistrarNoDia(logoMais)
    const tirarPlano = aoAplicarPlano(logoMais)
    // Pausou/retomou ou mudou o "Life puxa conversa": refaz na hora.
    const tirarPausa = aoMudarPausa(logoMais)
    const app = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void replanejarLembretes(metaMl)
    })
    return () => {
      if (espera) clearTimeout(espera)
      tirarRegistro()
      tirarPlano()
      tirarPausa()
      void app.then((h) => h.remove())
    }
  }, [logado, metaMl])

  useEffect(() => {
    if (!nativo) return
    const h = LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
      const rota: unknown = notification.extra?.rota
      if (typeof rota === 'string' && ROTAS.has(rota)) navigate(rota)
      // Check-in do Life: abre o chat (o Life do canto da Home escuta o pedido).
      if (notification.extra?.abrirLife === true) setTimeout(pedirAbrirLife, 400)
    })
    return () => void h.then((x) => x.remove())
  }, [navigate])

  return null
}
