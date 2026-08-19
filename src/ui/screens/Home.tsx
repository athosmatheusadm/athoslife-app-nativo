import { useNavigate } from 'react-router-dom'
import { HomeScreen } from './home/HomeScreen'

export function Home() {
  const navigate = useNavigate()
  return <HomeScreen onNavigate={(rota) => navigate(rota)} />
}
