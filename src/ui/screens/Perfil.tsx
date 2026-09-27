import { useNavigate } from 'react-router-dom'
import { authRepository } from '@data/repositories/authRepository'
import { ProfileScreen } from './profile/ProfileScreen'

export function Perfil() {
  const navigate = useNavigate()

  async function sair() {
    if (!window.confirm('Sair da sua conta?')) return
    await authRepository.sair()
    navigate('/login', { replace: true })
  }

  return <ProfileScreen onNavigate={(rota) => navigate(rota)} onSair={() => void sair()} />
}
