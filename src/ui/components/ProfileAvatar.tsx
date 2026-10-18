import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { useI18n } from '@/i18n/I18nProvider'

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
  const { m } = useI18n()
  const inicial = (profile?.nome ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <button
      type="button"
      onClick={() => navigate('/perfil')}
      aria-label={m.home.abrirPerfil}
      className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-dark text-sm font-extrabold text-brand-ink ring-1 ring-content-hi/10 transition-transform active:scale-95"
    >
      {profile?.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        inicial
      )}
    </button>
  )
}
