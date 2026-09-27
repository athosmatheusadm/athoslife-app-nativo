import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { cozinhaService } from '@domain/services/cozinhaService'
import type { Receita } from '@domain/entities/receita'
import { ReceitaDetalheScreen } from './cozinha/ReceitaDetalheScreen'

/**
 * Sub-página cheia (sem bottom nav), mesmo padrão de `/perfil/conquistas`.
 * A lista de receitas é pequena (25) — busca tudo via `cozinhaService.listar`
 * (já traz `bloqueada`/`favoritada` prontos) e acha a certa pelo id, em vez
 * de existir um endpoint por receita.
 */
export function Cozinha() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { profile } = useSession()
  const [receita, setReceita] = useState<Receita | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!profile || !id) return
    let ativo = true
    setCarregando(true)
    void cozinhaService
      .listar(profile)
      .then((todas) => {
        if (!ativo) return
        setReceita(todas.find((r) => r.id === id) ?? null)
      })
      .catch(() => ativo && setReceita(null))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [profile, id])

  async function alternarFavorito() {
    if (!receita) return
    if (receita.favoritada) await cozinhaService.desfavoritar(receita.id)
    else await cozinhaService.favoritar(receita.id)
    setReceita((atual) => (atual ? { ...atual, favoritada: !atual.favoritada } : atual))
  }

  if (!profile) return null

  return (
    <ReceitaDetalheScreen
      receita={receita}
      carregando={carregando}
      onVoltar={() => navigate(-1)}
      onToggleFavorito={() => void alternarFavorito()}
      onIrParaPlano={() => navigate('/perfil/plano')}
    />
  )
}
