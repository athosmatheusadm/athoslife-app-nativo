import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'

/**
 * Avatar do canto superior direito — presente no header de toda tela raiz.
 * É a porta de entrada para o Perfil (e, dentro dele, para Conquistas).
 * Substitui a antiga aba "Conquistas" da bottom nav: o acervo não é mais
 * uma aba fixa, mora dentro do Perfil (decisão registrada em
 * `domain/entities/conquista.ts`).
 */
export function ProfileAvatar() {
  const navigate = useNavigate()
  const { profile } = useSession()
  const inicial = (profile?.nome ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <button
      type="button"
      onClick={() => navigate('/perfil')}
      aria-label="Abrir perfil"
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-sm font-extrabold text-[#04120a] ring-1 ring-white/10 transition-transform active:scale-95"
    >
      {inicial}
    </button>
  )
}
