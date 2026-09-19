import { useState } from 'react'
import { AiProxyError, enviarMensagemChat, type MensagemChat } from '@data/ai/aiProxy'

/**
 * Chat com o Life. Histórico só existe em memória enquanto o painel está
 * aberto — não persiste no banco ainda (nenhuma tabela de mensagens existe
 * hoje; adicionar uma é uma decisão à parte, não tomada aqui).
 *
 * Backend (`ai-proxy`, tipo 'chat') pode ainda não estar implementado —
 * ver comentário em `enviarMensagemChat`. Se não estiver, a mensagem de
 * erro abaixo explica isso sem fingir que a conversa funcionou.
 */
export function LifeChatSheet(props: { onFechar: () => void }) {
  const [historico, setHistorico] = useState<MensagemChat[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar() {
    const mensagem = texto.trim()
    if (!mensagem || enviando) return

    const proximoHistorico = [...historico, { autor: 'usuario', texto: mensagem } as const]
    setHistorico(proximoHistorico)
    setTexto('')
    setEnviando(true)
    setErro(null)

    try {
      const resposta = await enviarMensagemChat({ mensagem, historico })
      setHistorico((h) => [...h, { autor: 'life', texto: resposta }])
    } catch (e) {
      if (e instanceof AiProxyError && e.info.tipo === 'limit_reached') {
        setErro('Você usou suas mensagens grátis de hoje. Volta amanhã que o Life te espera.')
      } else {
        setErro('O Life não conseguiu responder agora. Tenta de novo daqui a pouco.')
      }
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
        </div>

        {erro && <p className="flex-none px-6 pt-2 text-[11px] text-accent-danger">{erro}</p>}

        <div className="flex flex-none items-center gap-2 px-6 py-4">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void enviar()
            }}
            placeholder="Escreve pro Life…"
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
