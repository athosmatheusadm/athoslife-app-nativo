import { useNavigate } from 'react-router-dom'
import { ProfileScreen } from './profile/ProfileScreen'

export function Perfil() {
  const navigate = useNavigate()
  return <ProfileScreen onNavigate={(rota) => navigate(rota)} />
}
