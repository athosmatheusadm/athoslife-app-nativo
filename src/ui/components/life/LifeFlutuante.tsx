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
 * Rolando pra baixo ele sai de vista (não tapa o conteúdo); rolando pra
 * cima, volta. Botões da tela (ex.: "Montar plano") abrem este chat via
 * pedirAbrirLife().
 */
export function LifeFlutuante(props: { humor: HumorLife; foco: FocoLife; corBrilho?: string }) {
  const { m } = useI18n()
  const [aberto, setAberto] = useState(false)
  const visivel = useVisivelAoRolar()

  useEffect(() => aoPedirAbrirLife(() => setAberto(true)), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={m.lifeChat.abrir}
        className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-2 z-20 transition-transform duration-300 active:scale-95 ${
          visivel ? 'translate-x-0' : '-translate-x-[130%]'
        }`}
      >
        {props.corBrilho && (
          <span
            className="absolute inset-x-0 bottom-0 mx-auto h-24 w-24 rounded-full blur-2xl"
            style={{ backgroundColor: props.corBrilho, opacity: 0.35 }}
            aria-hidden="true"
          />
        )}
        <LifeMascote humor={props.humor} alt="" className="relative h-32" />
      </button>
      {aberto && <LifeChatSheet foco={props.foco} humor={props.humor} onFechar={() => setAberto(false)} />}
    </>
  )
}

/** Esconde ao rolar pra baixo, mostra ao rolar pra cima ou no topo. */
function useVisivelAoRolar(): boolean {
  const [visivel, setVisivel] = useState(true)
  useEffect(() => {
    let ultimo = window.scrollY
    function aoRolar() {
      const y = window.scrollY
      if (y < 40) setVisivel(true)
      else if (y > ultimo + 8) setVisivel(false)
      else if (y < ultimo - 8) setVisivel(true)
      ultimo = y
    }
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])
  return visivel
}
