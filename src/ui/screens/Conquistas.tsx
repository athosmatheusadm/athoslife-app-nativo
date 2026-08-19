import { useNavigate } from 'react-router-dom'
import { AchievementsGallery } from './achievements/AchievementsGallery'

/**
 * Sub-página do Perfil (não é mais aba da bottom nav).
 * Provisório: ainda não existe `conquistasRepository` — falta ler
 * `avaliar_conquistas()`/tabela de conquistas do Supabase. Próximo
 * "código" da fila; por ora entra vazia em vez de inventar dado.
 */
export function Conquistas() {
  const navigate = useNavigate()
  return <AchievementsGallery conquistas={[]} onVoltar={() => navigate(-1)} />
}
