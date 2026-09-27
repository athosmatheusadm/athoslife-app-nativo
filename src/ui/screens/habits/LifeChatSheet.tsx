import { useEffect, useRef, useState } from 'react'
import {
  AiProxyError,
  carregarHistoricoChat,
  cotaChatHoje,
  enviarMensagemChat,
  type MensagemChat,
} from '@data/ai/aiProxy'

/** Texto de erro por tipo — nunca finge que a conversa funcionou. */
function mensagemDeErro(e: unknown): string {
  if (!(e instanceof AiProxyError)) return 'O Life não conseguiu responder agora. Tenta de novo daqui a pouco.'
  switch (e.info.tipo) {
    case 'limit_reached':
      return `Acabaram as mensagens de hoje. Renova em ${e.info.proximoReset || 'algumas horas'} — o Life te espera.`
    case 'rate_limited':
      return 'Calma, muitas mensagens seguidas. Espera um minutinho e manda de novo.'
    case 'indisponivel':
      return 'O Life está descansando por hoje. Volta amanhã que ele te responde.'
    case 'not_authenticated':
      return 'Sua sessão expirou. Entra de novo pra continuar a conversa.'
    default:
      return 'O Life não conseguiu responder agora. Tenta de novo daqui a pouco.'
  }
}

/**
 * Chat com o Life. O histórico mora no servidor (life_chat_mensagens) e é
 * carregado ao abrir; cada envio manda só a mensagem nova. Cota diária por
 * plano (grátis 4, pago 40) — o contador aparece acima do campo de texto.
 */
export function LifeChatSheet(props: { onFechar: () => void }) {
  const [historico, setHistorico] = useState<MensagemChat[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [restantes, setRestantes] = useState<number | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  // Sempre mostra a última fala (ao abrir, ao enviar e quando o Life responde).
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end', behavior: historico.length > 0 ? 'smooth' : 'auto' })
  }, [historico, enviando])

  useEffect(() => {
    let vivo = true
    void carregarHistoricoChat()
      .then((h) => vivo && setHistorico(h))
      .catch(() => {})
    void cotaChatHoje().then((c) => vivo && c && setRestantes(Math.max(c.limite - c.usados, 0)))
    return () => {
      vivo = false
    }
  }, [])

  async function enviar() {
    const mensagem = texto.trim()
    if (!mensagem || enviando) return

    setHistorico((h) => [...h, { autor: 'usuario', texto: mensagem }])
    setTexto('')
    setEnviando(true)
    setErro(null)

    try {
      const r = await enviarMensagemChat(mensagem)
      setHistorico((h) => [...h, { autor: 'life', texto: r.resposta }])
      if (r.restantes !== null) setRestantes(r.restantes)
    } catch (e) {
      // A mensagem não foi aceita: tira do histórico e devolve pro campo.
      setHistorico((h) => h.slice(0, -1))
      setTexto(mensagem)
      setErro(mensagemDeErro(e))
      if (e instanceof AiProxyError && e.info.tipo === 'limit_reached') setRestantes(0)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Conversa com o Life"
    >
      <button
        aria-label="Fechar"
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-t border-surface-4 bg-surface-1 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mt-3 h-1 w-10 flex-none rounded-full bg-surface-4" aria-hidden="true" />

        <div className="flex-none px-6 pb-3 pt-3">
          <h2 className="text-xl font-bold text-content-hi">Conversa com o Life</h2>
          <p className="mt-1 text-sm text-content-low">Ele está aqui pra te ouvir.</p>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6">
          {historico.length === 0 && (
            <div className="rounded-2xl border border-surface-4 bg-surface-2 p-4">
              <p className="text-sm leading-relaxed text-content-mid">
                Oi. Sobre o que você quer conversar agora?
              </p>
            </div>
          )}

          {historico.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                m.autor === 'usuario'
                  ? 'ml-auto bg-brand text-[#04120a]'
                  : 'border border-surface-4 bg-surface-2 text-content-mid'
              }`}
            >
              {m.texto}
            </div>
          ))}

          {enviando && (
            <div className="rounded-2xl border border-surface-4 bg-surface-2 p-3.5 text-sm text-content-low">
              Life está digitando…
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {erro && <p className="flex-none px-6 pt-2 text-[11px] text-accent-danger">{erro}</p>}
        {!erro && restantes !== null && (
          <p className="flex-none px-6 pt-2 text-[11px] text-content-low">
            {restantes === 0
              ? 'Sem mensagens hoje — renova à meia-noite.'
              : `${restantes} ${restantes === 1 ? 'mensagem restante' : 'mensagens restantes'} hoje`}
          </p>
        )}

        <div className="flex flex-none items-center gap-2 px-6 py-4">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void enviar()
            }}
            placeholder="Escreve pro Life…"
            maxLength={800}
            disabled={enviando}
            className="flex-1 rounded-xl border border-surface-4 bg-surface-2 px-3.5 py-3 text-sm text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={enviando || texto.trim().length === 0}
            className="flex-none rounded-xl bg-brand px-4 py-3 text-sm font-bold text-[#04120a] transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
