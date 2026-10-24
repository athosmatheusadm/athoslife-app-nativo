import { useEffect, useState } from 'react'
import { aoPedirAbrirLife } from '@app/eventosLife'
import type { FocoLife } from '@data/ai/aiProxy'
import { LifeMascote, type HumorLife } from '@ui/components/LifeMascote'
import { useI18n } from '@/i18n/I18nProvider'
import { LifeChatSheet } from './LifeChatSheet'

/**
 * O Life de cada tela, no canto inferior esquerdo, acima do BottomNav
 * (decisão do dono, 29/09 — já era assim em Hábitos desde 19/09). Tocar
 * abre o chat com o foco da tela.
 *
 * Tamanho igual ao do topo da Home (h-32 — o dono achou o h-24 pequeno).
 * Fica SEMPRE à vista, mesmo rolando (dono, 03/10: antes saía da tela ao
 * rolar pra baixo). Pra não tapar o fim da página, deixa um espaço vazio
 * no fim do conteúdo — por isso vai sempre como último filho da tela.
 * Botões da tela (ex.: "Montar plano") abrem este chat via pedirAbrirLife().
 *
 * aparecerDepoisDe: só aparece depois de rolar tantos px (Home no 1º acesso
 * do dia, quando o Life grande já está no topo da página).
 *
 * Relatório do teste do APK (24/10): ele tapava conteúdo e pegava o toque
 * de botões embaixo dele ("Adicionar exercício"). Agora só o corpo dele
 * (não a caixa transparente da imagem) abre o chat, e enquanto a pessoa
 * rola ele fica translúcido e deixa o toque passar — continua à vista.
 */
export function LifeFlutuante(props: {
  humor: HumorLife
  foco: FocoLife
  corBrilho?: string
  aparecerDepoisDe?: number
}) {
  const { m } = useI18n()
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState<string | undefined>(undefined)
  const visivel = useRolouAlem(props.aparecerDepoisDe ?? 0)
  const rolando = useRolando()

  useEffect(
    () =>
      aoPedirAbrirLife((texto) => {
        setRascunho(texto)
        setAberto(true)
      }),
    [],
  )

  return (
    <>
      <div className="h-28" aria-hidden="true" />
      <div
        className={`pointer-events-none fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-2 z-20 transition-[transform,opacity] duration-300 ${
          visivel ? 'translate-x-0' : '-translate-x-[130%]'
        } ${rolando ? 'opacity-40' : 'opacity-100'}`}
      >
        {props.corBrilho && (
          <span
            className="absolute inset-x-0 bottom-0 mx-auto h-24 w-24 rounded-full blur-2xl"
            style={{ backgroundColor: props.corBrilho, opacity: 0.35 }}
            aria-hidden="true"
          />
        )}
        <LifeMascote humor={props.humor} alt="" className="relative h-32" />
        {/* Área de toque: o corpo do Life, não a imagem inteira. */}
        <button
          type="button"
          onClick={() => {
            setRascunho(undefined)
            setAberto(true)
          }}
          aria-label={m.lifeChat.abrir}
          className={`absolute bottom-2 left-1/2 h-24 w-20 -translate-x-1/2 rounded-full active:scale-95 ${
            rolando ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        />
      </div>
      {aberto && (
        <LifeChatSheet
          foco={props.foco}
          humor={props.humor}
          {...(rascunho ? { rascunho } : {})}
          onFechar={() => setAberto(false)}
        />
      )}
    </>
  )
}

/** true enquanto a página está rolando (e um instante depois). */
function useRolando(): boolean {
  const [rolando, setRolando] = useState(false)
  useEffect(() => {
    let timer = 0
    const aoRolar = () => {
      setRolando(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setRolando(false), 700)
    }
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', aoRolar)
    }
  }, [])
  return rolando
}

/** true quando a página já rolou mais que `limite` px (limite 0 = sempre). */
function useRolouAlem(limite: number): boolean {
  const [rolou, setRolou] = useState(() => limite <= 0 || window.scrollY > limite)
  useEffect(() => {
    if (limite <= 0) return
    const aoRolar = () => setRolou(window.scrollY > limite)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [limite])
  return rolou
}
