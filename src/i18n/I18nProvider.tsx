import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSession } from '@app/SessionProvider'
import { definirLocalidadeAtual } from '@data/localidadeAtual'
import {
  localidadeDoAparelho,
  normalizarIdioma,
  type Idioma,
  type Localidade,
} from '@domain/rules/localidade'
import type { Mensagens } from './mensagens/tipo'
import { DICIONARIOS } from './dicionarios'

/**
 * Idioma escolhido NESTE aparelho (troca na tela de boas-vindas ou no
 * Perfil). Preferência de exibição, como as de acessibilidade — por isso
 * localStorage; o perfil no banco guarda o mesmo valor pro Life e pros
 * avisos do servidor.
 */
const CHAVE_IDIOMA = 'athoslife:idioma'

function lerIdiomaSalvo(): Idioma | null {
  try {
    const v = localStorage.getItem(CHAVE_IDIOMA)
    return v ? normalizarIdioma(v) : null
  } catch {
    return null
  }
}

export function localidadeAtualDoAparelho(): Localidade {
  const preferidos = typeof navigator !== 'undefined' ? [...(navigator.languages ?? [navigator.language])] : []
  let fuso: string | undefined
  try {
    fuso = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    fuso = undefined
  }
  return localidadeDoAparelho(preferidos, fuso)
}

interface I18nState {
  readonly idioma: Idioma
  readonly m: Mensagens
  readonly trocarIdioma: (i: Idioma) => void
}

const I18nContext = createContext<I18nState | null>(null)

/**
 * Ordem: escolha feita neste aparelho > perfil (quem já passou do
 * onboarding) > idioma do aparelho. O padrão do banco é pt-BR pra todo
 * mundo, então o perfil só vale depois que o onboarding gravou o idioma real.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { profile } = useSession()
  const [escolhido, setEscolhido] = useState<Idioma | null>(lerIdiomaSalvo)

  const idioma: Idioma =
    escolhido ??
    (profile?.onboardingCompleto ? profile.localidade.idioma : localidadeAtualDoAparelho().idioma)

  const pais = profile?.localidade.pais ?? localidadeAtualDoAparelho().pais
  // Repositórios leem daqui (busca de alimentos no idioma/país da pessoa).
  definirLocalidadeAtual(idioma, pais)

  useEffect(() => {
    document.documentElement.lang = idioma
  }, [idioma])

  const value = useMemo<I18nState>(
    () => ({
      idioma,
      m: DICIONARIOS[idioma],
      trocarIdioma: (i) => {
        try {
          localStorage.setItem(CHAVE_IDIOMA, i)
        } catch {
          // sem storage: vale só até fechar o app
        }
        setEscolhido(i)
      },
    }),
    [idioma],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n precisa estar dentro de I18nProvider')
  return ctx
}
