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
import type { Mensagens } from '@/i18n/mensagens/tipo'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { LifeMascote, type HumorLife } from '@ui/components/LifeMascote'
import { PlanosNoLife } from './PlanosNoLife'

/** Texto de erro por tipo — nunca finge que a conversa funcionou. */
function mensagemDeErro(e: unknown, t: Mensagens['lifeChat']['erros']): string {
  if (!(e instanceof AiProxyError)) return t.geral
  switch (e.info.tipo) {
    case 'limit_reached':
      return e.info.proximoReset ? t.limite(e.info.proximoReset) : t.limiteSemHora
    case 'rate_limited':
      return t.rapido
    case 'indisponivel':
      return t.indisponivel
    case 'not_authenticated':
      return t.sessao
    default:
      return t.geral
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
  const tc = m.lifeChat
  // Voltar do Android fecha o chat (antes minimizava o app nas telas raiz).
  useFecharNoVoltar(true, props.onFechar)
  const inputRef = useRef<HTMLInputElement>(null)
  const [historico, setHistorico] = useState<MensagemChat[]>([])
  // 'carregando' evita o "Oi…" piscar antes do histórico chegar.
  const [estadoHist, setEstadoHist] = useState<'carregando' | 'ok' | 'erro'>('carregando')
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
      .then((h) => {
        if (!vivo) return
        setHistorico(h)
        setEstadoHist('ok')
      })
      .catch(() => vivo && setEstadoHist('erro'))
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
      setErro(mensagemDeErro(e, tc.erros))
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
      setErro(mensagemDeErro(e, tc.erros))
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
        aria-label={tc.fechar}
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative flex h-[85vh] w-full max-w-md supports-[height:100dvh]:h-[85dvh] flex-col rounded-t-3xl border-t border-surface-4 bg-surface-1 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
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
            className={`min-h-11 max-w-[45%] flex-none rounded-full border px-3 text-micro font-semibold leading-tight disabled:opacity-50 ${
              pausado ? 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold' : 'border-surface-4 text-content-low'
            }`}
          >
            🌙 {pausado ? `${m.lifeChat.pausado} · ${m.lifeChat.retomar}` : m.lifeChat.pausar}
          </button>
        </div>

        {pausado && <p className="flex-none px-6 pb-3 text-micro leading-relaxed text-content-low">{m.lifeChat.pausadoAviso}</p>}

        {/* Atalhos da Dieta (dono, 05/10: Life-chef sem card na tela; 08/10: scanner aqui também). */}
        {foco === 'dieta' && (
          <div className="flex-none space-y-2 px-6 pb-3">
            <Atalho emoji="👨‍🍳" texto={m.cozinha.lifeChefTitulo} onClick={() => ir('/dieta/cozinha/life')} />
            <Atalho emoji="📷" texto={m.cozinha.analisarAlimento} onClick={() => ir('/scanner')} />
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-6" role="log" aria-live="polite">
          {estadoHist === 'carregando' && (
            <p className="py-4 text-center text-micro text-content-low">{tc.carregando}</p>
          )}
          {estadoHist === 'erro' && (
            <p className="rounded-xl bg-surface-2 p-3 text-micro text-content-low">{tc.erroHistorico}</p>
          )}
          {estadoHist !== 'carregando' && historico.length === 0 && (
            <div className="rounded-2xl border border-surface-4 bg-surface-2 p-4">
              <p className="text-sm leading-relaxed text-content-mid">{tc.oi}</p>
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
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold active:scale-[0.98] ${
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
            <div className="flex w-fit items-center gap-2 rounded-2xl border border-surface-4 bg-surface-2 p-3.5 text-sm text-content-low" role="status">
              <span className="flex gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-content-low motion-safe:animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-content-low motion-safe:animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-content-low motion-safe:animate-bounce [animation-delay:300ms]" />
              </span>
              {tc.digitando}
            </div>
          )}
          <div ref={fimRef} />
        </div>

        {erro && <p role="alert" className="flex-none px-6 pt-2 text-micro text-accent-danger">{erro}</p>}
        {!erro && restantes !== null && (
          <p className="flex-none px-6 pt-2 text-micro text-content-low">
            {restantes === 0 ? tc.semMensagens : tc.restantes(restantes)}
          </p>
        )}

        <form
          className="flex flex-none items-center gap-2 px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            void enviar()
          }}
        >
          <input
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={tc.placeholder}
            aria-label={tc.placeholder}
            enterKeyHint="send"
            maxLength={800}
            disabled={enviando}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-surface-4 bg-surface-2 px-3.5 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={enviando || texto.trim().length === 0}
            className="min-h-12 flex-none rounded-xl bg-brand px-4 text-sm font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {tc.enviar}
          </button>
        </form>
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
      className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 px-4 text-left text-sm font-bold text-brand active:scale-[0.99]"
    >
      <span aria-hidden="true">{props.emoji}</span>
      <span className="flex-1">{props.texto}</span>
      <span aria-hidden="true">›</span>
    </button>
  )
}
