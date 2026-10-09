import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AiProxyError,
  carregarHistoricoChat,
  cotaChatHoje,
  enviarMensagemChat,
  responderAcaoLife,
  type AcaoLife,
  type EscolhaAcao,
  type FocoLife,
  type MensagemChat,
} from '@data/ai/aiProxy'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import {
  aoMudarPausa,
  lifePausadoHoje,
  marcarConversaComLife,
  marcarPausaLocal,
  pausarLifeHoje,
  retomarLifeHoje,
} from '@data/lifePausa'
import { useI18n } from '@/i18n/I18nProvider'
import { LifeMascote, type HumorLife } from '@ui/components/LifeMascote'
import { PlanosNoLife } from './PlanosNoLife'

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
 *
 * Um Life por tela (decisão do dono, 29/09): o `foco` diz de onde a conversa
 * foi aberta — o Life sabe de tudo, mas puxa pro assunto da tela (Home
 * junta tudo). Divisão (dono, 08/10): Home e Hábitos são só conversa;
 * Treino tem "Montar treino"; Dieta tem "Montar dieta", o Life-chef e o
 * scanner. Os planos ficam no fim da conversa (PlanosNoLife).
 */
export function LifeChatSheet(props: { onFechar: () => void; foco?: FocoLife; humor?: HumorLife }) {
  const foco = props.foco ?? 'home'
  const navigate = useNavigate()
  const { m } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [historico, setHistorico] = useState<MensagemChat[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [restantes, setRestantes] = useState<number | null>(null)
  const [escolha, setEscolha] = useState<Extract<AcaoLife, { tipo: 'escolha' }> | null>(null)
  const [pausado, setPausado] = useState(false)
  const [mudandoPausa, setMudandoPausa] = useState(false)
  // Mensagem que falhou: reenviar o mesmo texto usa o mesmo id (sem ação em dobro).
  const falhaRef = useRef<{ texto: string; id: string } | null>(null)
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
    const lerPausa = () => void lifePausadoHoje().then((p) => vivo && setPausado(p))
    lerPausa()
    const tirar = aoMudarPausa(lerPausa)
    return () => {
      vivo = false
      tirar()
    }
  }, [])

  /** O que o Life fez no app — só chega depois que o servidor gravou. */
  function aplicarAcao(acao: AcaoLife | null) {
    setEscolha(acao?.tipo === 'escolha' ? acao : null)
    if (acao?.tipo === 'refeicao_atualizada') avisarRegistroDoDia()
    if (acao?.tipo === 'pausa') {
      setPausado(true)
      void marcarPausaLocal()
    }
  }

  async function escolher(valor: EscolhaAcao, rotulo: string) {
    if (!escolha || enviando) return
    const id = escolha.id
    setEscolha(null)
    setHistorico((h) => [...h, { autor: 'usuario', texto: rotulo }])
    setEnviando(true)
    setErro(null)
    try {
      const r = await responderAcaoLife(id, valor)
      setHistorico((h) => [...h, { autor: 'life', texto: r.resposta }])
      aplicarAcao(r.acao)
    } catch (e) {
      setHistorico((h) => h.slice(0, -1))
      setEscolha({ tipo: 'escolha', id, opcoes: escolha.opcoes })
      setErro(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  async function alternarPausa() {
    if (mudandoPausa) return
    setMudandoPausa(true)
    setErro(null)
    try {
      if (pausado) await retomarLifeHoje()
      else await pausarLifeHoje()
      setPausado(!pausado)
    } catch {
      setErro(m.lifeChat.erroPausa)
    } finally {
      setMudandoPausa(false)
    }
  }

  function ir(rota: string) {
    props.onFechar()
    navigate(rota)
  }

  async function enviar() {
    const mensagem = texto.trim()
    if (!mensagem || enviando) return

    setHistorico((h) => [...h, { autor: 'usuario', texto: mensagem }])
    setTexto('')
    setEnviando(true)
    setErro(null)

    const id = falhaRef.current?.texto === mensagem ? falhaRef.current.id : crypto.randomUUID()
    setEscolha(null)
    void marcarConversaComLife()
    try {
      const r = await enviarMensagemChat(mensagem, foco, id)
      falhaRef.current = null
      setHistorico((h) => [...h, { autor: 'life', texto: r.resposta }])
      if (r.restantes !== null) setRestantes(r.restantes)
      aplicarAcao(r.acao)
    } catch (e) {
      falhaRef.current = { texto: mensagem, id }
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
      aria-label={m.lifeChat.titulo[foco]}
    >
      <button
        aria-label="Fechar"
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative flex h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-t border-surface-4 bg-surface-1 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mt-3 h-1 w-10 flex-none rounded-full bg-surface-4" aria-hidden="true" />

        <div className="flex flex-none items-center gap-3 px-6 pb-3 pt-3">
          <LifeMascote humor={props.humor ?? 'normal'} alt="" className="h-14 flex-none" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-content-hi">{m.lifeChat.titulo[foco]}</h2>
            <p className="mt-0.5 text-sm text-content-low">{m.lifeChat.sub[foco]}</p>
          </div>
          {/* Pausa do dia (Life MVP 08/10): vale pra todos os Lifes e avisos. */}
          <button
            type="button"
            onClick={() => void alternarPausa()}
            disabled={mudandoPausa}
            aria-pressed={pausado}
            className={`flex-none rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50 ${
              pausado ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold' : 'border-surface-4 text-content-low'
            }`}
          >
            🌙 {pausado ? `${m.lifeChat.pausado} · ${m.lifeChat.retomar}` : m.lifeChat.pausar}
          </button>
        </div>

        {pausado && <p className="flex-none px-6 pb-3 text-[11px] leading-relaxed text-content-low">{m.lifeChat.pausadoAviso}</p>}

        {/* Atalhos da Dieta (dono, 05/10: Life-chef sem card na tela; 08/10: scanner aqui também). */}
        {foco === 'dieta' && (
          <div className="flex-none space-y-2 px-6 pb-3">
            <Atalho emoji="👨‍🍳" texto={m.cozinha.lifeChefTitulo} onClick={() => ir('/dieta/cozinha/life')} />
            <Atalho emoji="📷" texto={m.cozinha.analisarAlimento} onClick={() => ir('/scanner')} />
          </div>
        )}

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
                  ? 'ml-auto bg-brand text-brand-ink'
                  : 'border border-surface-4 bg-surface-2 text-content-mid'
              }`}
            >
              {m.texto}
            </div>
          ))}

          {escolha && !enviando && (
            <div className="flex flex-wrap justify-end gap-2">
              {escolha.opcoes.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => void escolher(o.valor, o.rotulo)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold active:scale-[0.98] ${
                    o.valor === 'cancelar'
                      ? 'border-surface-4 text-content-mid'
                      : 'border-brand/50 bg-brand/10 text-brand'
                  }`}
                >
                  {o.rotulo}
                </button>
              ))}
            </div>
          )}

          {(foco === 'treino' || foco === 'dieta') && (
            <PlanosNoLife
              area={foco}
              onMudou={() => fimRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })}
              onPreencher={(t) => {
                setTexto(t)
                inputRef.current?.focus()
              }}
              onIr={ir}
            />
          )}

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
            ref={inputRef}
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
            className="flex-none rounded-xl bg-brand px-4 py-3 text-sm font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-40"
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

function Atalho(props: { emoji: string; texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex w-full items-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-left text-sm font-bold text-brand active:scale-[0.99]"
    >
      <span aria-hidden="true">{props.emoji}</span>
      <span className="flex-1">{props.texto}</span>
      <span aria-hidden="true">›</span>
    </button>
  )
}
