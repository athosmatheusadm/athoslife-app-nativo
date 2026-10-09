import { useNavigate } from 'react-router-dom'
import { authRepository } from '@data/repositories/authRepository'
import { ProfileScreen } from './profile/ProfileScreen'

export function Perfil() {
  const navigate = useNavigate()

  // A confirmação ("toque de novo pra sair") fica na própria linha do
  // ProfileScreen — antes era o confirm() do sistema, com título "localhost".
  async function sair() {
    await authRepository.sair()
    navigate('/login', { replace: true })
  }

  return <ProfileScreen onNavigate={(rota) => navigate(rota)} onSair={() => void sair()} />
}
