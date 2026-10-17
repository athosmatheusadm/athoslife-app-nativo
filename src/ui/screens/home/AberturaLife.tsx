import { useEffect, useState } from 'react'
import { buscarAberturaLife } from '@data/ai/aiProxy'
import { dataLocalISO } from '@domain/rules/datas'
import { useI18n } from '@/i18n/I18nProvider'
import { LifeMascote } from '@ui/components/LifeMascote'
import { LifeChatSheet } from '@ui/components/life/LifeChatSheet'

/** O servidor entrega a mensagem uma vez só; guardamos no dia pra não sumir ao voltar pra Home. */
const chave = (dia: string) => `athos.abertura.${dia}`
const FECHADA = '__fechada__'

function ler(dia: string): string | null {
  try {
    return localStorage.getItem(chave(dia))
  } catch {
    return null
  }
}
function gravar(dia: string, valor: string): void {
  try {
    localStorage.setItem(chave(dia), valor)
  } catch {
    // sem storage: a mensagem continua no chat
  }
}

/**
 * O Life puxa assunto na Home (ai-proxy v4.0, tipo 'abertura'): no máximo
 * uma vez por dia, com regras fixas e sem IA — evento que a pessoa contou,
 * "como foi ontem?", marco de hábito, dias pesados, volta depois de sumir.
 * O servidor respeita a pausa do dia e "Life pode puxar conversa". A
 * mensagem já fica no histórico do chat; "Responder" abre o chat.
 */
export function AberturaLife() {
  const { m } = useI18n()
  const t = m.home.abertura
  const [dia] = useState(() => dataLocalISO())
  const [mensagem, setMensagem] = useState<string | null>(() => {
    const salva = ler(dia)
    return salva && salva !== FECHADA ? salva : null
  })
  const [chatAberto, setChatAberto] = useState(false)

  useEffect(() => {
    if (ler(dia) !== null) return
    let vivo = true
    void buscarAberturaLife()
      .then((msg) => {
        if (!msg) return
        gravar(dia, msg)
        if (vivo) setMensagem(msg)
      })
      .catch(() => {
        // sem mensagem hoje
      })
    return () => {
      vivo = false
    }
  }, [dia])

  function fechar() {
    gravar(dia, FECHADA)
    setMensagem(null)
  }

  if (!mensagem) return null

  return (
    <section
      aria-label={t.rotulo}
      className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-surface-4 border-l-[3px] border-l-brand bg-surface-2 px-3.5 py-3"
    >
      <LifeMascote humor="normal" alt="" className="h-12 flex-none" />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-content-hi">{mensagem}</p>
        <button
          type="button"
          onClick={() => {
            // Respondida: não reaparece ao voltar pra Home; o card some quando o chat fecha.
            gravar(dia, FECHADA)
            setChatAberto(true)
          }}
          className="mt-1 min-h-11 text-sm font-semibold text-brand"
        >
          {t.responder} ›
        </button>
      </div>
      <button
        type="button"
        aria-label={t.fechar}
        onClick={fechar}
        className="flex h-11 w-11 flex-none items-center justify-center text-content-low"
      >
        ✕
      </button>
      {chatAberto && (
        <LifeChatSheet
          foco="home"
          onFechar={() => {
            setChatAberto(false)
            setMensagem(null)
          }}
        />
      )}
    </section>
  )
}
