import { useNavigate } from 'react-router-dom'
import { authRepository } from '@data/repositories/authRepository'
import { pendentes, sincronizar } from '@data/offline/fila'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar } from '@ui/feedback'
import { ProfileScreen } from './profile/ProfileScreen'

export function Perfil() {
  const navigate = useNavigate()
  const t = useI18n().m.offline

  async function sairDeVez() {
    await authRepository.sair()
    navigate('/login', { replace: true })
  }

  // A confirmação ("toque de novo pra sair") fica na própria linha do
  // ProfileScreen — antes era o confirm() do sistema, com título "localhost".
  // Registro feito offline que ainda não subiu: tenta subir; se não der,
  // avisa que vai se perder e só sai se a pessoa confirmar no aviso.
  async function sair() {
    await sincronizar().catch(() => {})
    const n = await pendentes()
    if (n > 0) {
      avisar.desfazer(t.sairComPendentes(n), t.sairMesmo, () => void sairDeVez())
      return
    }
    await sairDeVez()
  }

  return <ProfileScreen onNavigate={(rota) => navigate(rota)} onSair={() => void sair()} />
}
