import { useSearchParams } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { DietScreen } from './diet/DietScreen'

type TipoFixo = 'cafe' | 'almoco' | 'lanche' | 'jantar'
const TIPOS_VALIDOS: readonly TipoFixo[] = ['cafe', 'almoco', 'lanche', 'jantar']

export function Dieta() {
  const { profile } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()

  // Vindo do Home ("toquei em Almoço"), abre direto nesse acordeão em vez
  // de sempre café.
  const refeicaoNaUrl = searchParams.get('refeicao')
  const abrirRefeicao = TIPOS_VALIDOS.includes(refeicaoNaUrl as TipoFixo)
    ? (refeicaoNaUrl as TipoFixo)
    : 'cafe'

  // Vindo do "+" da Home: cria uma refeição extra nova assim que abre.
  const criarNovaAoAbrir = searchParams.get('novaExtra') === '1'

  if (!profile) return null

  return (
    <DietScreen
      profile={profile}
      abrirRefeicao={abrirRefeicao}
      criarNovaAoAbrir={criarNovaAoAbrir}
      onNovaExtraCriada={() => setSearchParams({}, { replace: true })}
    />
  )
}
