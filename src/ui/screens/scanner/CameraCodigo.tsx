import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { alternarLanterna, iniciarLeitura, lanternaDisponivel, permitirCamera } from '@data/native/codigoBarras'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { vibrar } from '@ui/feedback'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Câmera do código de barras, com a nossa cara: a imagem da câmera fica
 * atrás do app (ML Kit) e aqui por cima vão só a mira, a lanterna e
 * "Digitar o número". Leu: vibra, a mira fica verde e devolve o código.
 * Portal no body: nenhum `transform` de tela pode prender o `fixed`.
 */

const CANTOS = [
  'left-[-2px] top-[-2px] rounded-tl-[18px] border-b-0 border-r-0',
  'right-[-2px] top-[-2px] rounded-tr-[18px] border-b-0 border-l-0',
  'bottom-[-2px] left-[-2px] rounded-bl-[18px] border-r-0 border-t-0',
  'bottom-[-2px] right-[-2px] rounded-br-[18px] border-l-0 border-t-0',
]

interface Props {
  nomeRefeicao: string
  onCodigo: (codigo: string) => void
  onDigitar: () => void
  onFechar: () => void
  onErro: (mensagem: string) => void
}

export function CameraCodigo({ nomeRefeicao, onCodigo, onDigitar, onFechar, onErro }: Props) {
  const { m } = useI18n()
  const t = m.scanner.vidro
  const [lido, setLido] = useState(false)
  const [temLanterna, setTemLanterna] = useState(false)
  const [lanterna, setLanterna] = useState(false)
  // Props mudam a cada render da tela de cima; a câmera liga uma vez só.
  const cb = useRef({ onCodigo, onErro })
  cb.current = { onCodigo, onErro }

  useFecharNoVoltar(true, onFechar)

  useEffect(() => {
    let parar: (() => Promise<void>) | null = null
    let saiu = false
    void (async () => {
      try {
        if (!(await permitirCamera())) {
          if (!saiu) cb.current.onErro(t.semPermissao)
          return
        }
        if (saiu) return
        const p = await iniciarLeitura((codigo) => {
          setLido(true)
          vibrar.sucesso()
          window.setTimeout(() => cb.current.onCodigo(codigo), 280)
        })
        if (saiu) void p()
        else parar = p
        setTemLanterna(await lanternaDisponivel())
      } catch {
        if (!saiu) cb.current.onErro(m.scanner.erros.leitor)
      }
    })()
    return () => {
      saiu = true
      void parar?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="barcode-scanner-modal tema-escuro fixed inset-0 z-[60] overflow-hidden">
      {/* Escurece em volta da mira; o buraco do meio mostra a câmera. */}
      <div
        aria-hidden="true"
        className={`absolute left-[12%] right-[12%] top-[36%] h-[20%] rounded-[18px] shadow-[0_0_0_999px_rgb(0_0_0/0.45)] transition-colors ${
          lido ? 'bg-brand/20' : ''
        }`}
      >
        {CANTOS.map((c) => (
          <i key={c} className={`absolute h-7 w-7 border-[3px] border-brand ${c}`} />
        ))}
        {!lido && (
          <span className="laser-codigo absolute left-[8%] right-[8%] h-0.5 rounded bg-brand shadow-[0_0_12px_rgb(var(--c-brand))]" />
        )}
      </div>

      <div className="absolute inset-x-3.5 top-[calc(env(safe-area-inset-top,0px)+14px)] flex items-center justify-between gap-2">
        <button onClick={onFechar} aria-label={t.fechar} className="vidro grid h-11 w-11 place-items-center rounded-full text-lg">
          ✕
        </button>
        <span className="vidro flex h-8 items-center rounded-pill px-3.5 text-sm font-semibold">{nomeRefeicao}</span>
        {temLanterna ? (
          <button
            onClick={() => {
              void alternarLanterna().then(() => setLanterna((l) => !l))
            }}
            aria-label={t.lanterna}
            aria-pressed={lanterna}
            className={`grid h-11 w-11 place-items-center rounded-full ${lanterna ? 'bg-accent-gold text-brand-ink' : 'vidro'}`}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
              <path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" />
            </svg>
          </button>
        ) : (
          <span className="w-11" />
        )}
      </div>

      <div className="absolute inset-x-3.5 bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] grid justify-items-center gap-2.5">
        <p role="status" className="vidro rounded-pill px-3.5 py-2 text-sm font-semibold">
          {lido ? m.scanner.buscandoProduto : t.aponte}
        </p>
        <button onClick={onDigitar} className="vidro min-h-12 w-full rounded-pill text-sm font-semibold">
          {t.digitar}
        </button>
      </div>
    </div>,
    document.body,
  )
}
