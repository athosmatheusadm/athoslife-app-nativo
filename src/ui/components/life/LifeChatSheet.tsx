import { ActivityIcon } from '@ui/components/ActivityIcon'
import { fmtKcal } from '@domain/rules/formatoNumero'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import {
  AiProxyError,
  carregarHistoricoChat,
  cotaChatHoje,
  enviarMensagemChat,
  responderAcaoLife,
  separarCartoes,
  type AcaoLife,
  type EscolhaAcao,
  type FocoLife,
  type LembrancaPendente,
  type MensagemChat,
} from '@data/ai/aiProxy'
import { avisarRegistroDoDia } from '@data/registroDoDia'
import { lifeMemoriaRepository } from '@data/repositories/lifeMemoriaRepository'
import { receitasRepository, type ReceitaCrua } from '@data/repositories/receitasRepository'
import {
  aoMudarPausa,
  lifePausadoHoje,
  marcarConversaComLife,
  marcarPausaLocal,
  retomarLifeHoje,
} from '@data/lifePausa'
import { TextoLife } from './baloes'
import { RegistroNoChat } from './RegistroNoChat'
import { useI18n } from '@/i18n/I18nProvider'
import { ehFalhaDeRede } from '@data/offline/conexao'
import type { Mensagens } from '@/i18n/mensagens/tipo'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { vibrar } from '@ui/feedback'
import { LifeMascote, type HumorLife } from '@ui/components/LifeMascote'
import { PlanosNoLife } from './PlanosNoLife'
import { executarPesoNoApp, lerComandoPeso, resolverNoApp } from './pesoNoChat'

/** Texto de erro por tipo — nunca finge que a conversa funcionou. */
function mensagemDeErro(e: unknown, t: Mensagens['lifeChat']['erros'], semRede: string): string {
  if (ehFalhaDeRede(e)) return semRede
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
export function LifeChatSheet(props: { onFechar: () => void; foco?: FocoLife; humor?: HumorLife; rascunho?: string }) {
  const foco = props.foco ?? 'home'
  const navigate = useNavigate()
  const { refresh: recarregarPerfil } = useSession()
  const { m } = useI18n()
  const tc = m.lifeChat
  // Voltar do Android fecha o chat (antes minimizava o app nas telas raiz).
  useFecharNoVoltar(true, props.onFechar)
  const inputRef = useRef<HTMLInputElement>(null)
  const [historico, setHistorico] = useState<MensagemChat[]>([])
  // 'carregando' evita o "Oi…" piscar antes do histórico chegar.
  const [estadoHist, setEstadoHist] = useState<'carregando' | 'ok' | 'erro'>('carregando')
  const [texto, setTexto] = useState(props.rascunho ?? '')
  /** "82" sozinho: o Life perguntou se anota; aqui fica o peso esperando o Sim/Não. */
  const [pesoAConfirmar, setPesoAConfirmar] = useState<number | null>(null)

  // Rascunho "Pesei  kg": cursor no buraco, pronto pra digitar o número.
  useEffect(() => {
    const el = inputRef.current
    if (!props.rascunho || !el) return
    const buraco = props.rascunho.indexOf('  ')
    const pos = buraco >= 0 ? buraco + 1 : props.rascunho.length
    el.focus()
    el.setSelectionRange(pos, pos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [restantes, setRestantes] = useState<number | null>(null)
  const [escolha, setEscolha] = useState<Extract<AcaoLife, { tipo: 'escolha' }> | null>(null)
  const pendentesMemoria = useRef<LembrancaPendente[]>([])
  const [registro, setRegistro] = useState<Extract<AcaoLife, { tipo: 'registrar_itens' }> | null>(null)
  const [pausado, setPausado] = useState(false)
  const [mudandoPausa, setMudandoPausa] = useState(false)
  // Mensagem que falhou: reenviar o mesmo texto usa o mesmo id (sem ação em dobro).
  const falhaRef = useRef<{ texto: string; id: string } | null>(null)
  const fimRef = useRef<HTMLDivElement>(null)
  // Cards de receita da Cozinha que o Life mostrou (ai-proxy v3.10).
  const [receitas, setReceitas] = useState<Map<string, ReceitaCrua> | null>(null)
  const buscouReceitasRef = useRef(false)
  // Convite da memória (ai-proxy v4.0): aparece quando o Life acha que vale lembrar algo.
  const [conviteMemoria, setConviteMemoria] = useState<'mostrar' | 'salvando' | 'aceito' | 'recusado' | null>(null)
  const [erroMemoria, setErroMemoria] = useState(false)

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

  // Busca a vitrine só quando aparece o primeiro card (a maioria das conversas não tem).
  useEffect(() => {
    if (buscouReceitasRef.current) return
    if (!historico.some((h) => h.autor === 'life' && separarCartoes(h.texto).receitas.length > 0)) return
    buscouReceitasRef.current = true
    void receitasRepository
      .listar()
      .then((lista) => setReceitas(new Map(lista.map((r) => [r.id, r]))))
      .catch(() => {
        buscouReceitasRef.current = false
      })
  }, [historico])

  /** O que o Life fez no app — só chega depois que o servidor gravou. */
  function aplicarAcao(acao: AcaoLife | null) {
    setEscolha(acao?.tipo === 'escolha' ? acao : null)
    setRegistro(acao?.tipo === 'registrar_itens' ? acao : null)
    if (acao?.tipo === 'refeicao_atualizada') avisarRegistroDoDia()
    if (acao?.tipo === 'peso_atualizado') {
      avisarRegistroDoDia()
      void recarregarPerfil() // meta/objetivo novos pro card e pra linha-guia
    }
    if (acao?.tipo === 'pausa') {
      setPausado(true)
      void marcarPausaLocal()
    }
  }

  async function confirmarPeso(sim: boolean) {
    const kg = pesoAConfirmar
    if (kg === null || enviando) return
    setPesoAConfirmar(null)
    setHistorico((h) => [...h, { autor: 'usuario', texto: sim ? tc.peso.sim : tc.peso.nao }])
    if (!sim) {
      setHistorico((h) => [...h, { autor: 'life', texto: tc.peso.naoAnotei }])
      return
    }
    setEnviando(true)
    try {
      const resposta = await executarPesoNoApp({ tipo: 'registrar', kg }, tc.peso)
      setHistorico((h) => [...h, { autor: 'life', texto: resposta }])
      aplicarAcao({ tipo: 'peso_atualizado' })
    } catch {
      setErro(tc.erros.geral)
    } finally {
      setEnviando(false)
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
      setErro(mensagemDeErro(e, tc.erros, m.offline.lifePrecisaInternet))
    } finally {
      setEnviando(false)
    }
  }

  async function alternarPausa() {
    if (mudandoPausa) return
    setMudandoPausa(true)
    setErro(null)
    try {
      if (!pausado) return
      await retomarLifeHoje()
      setPausado(false)
    } catch {
      setErro(m.lifeChat.erroPausa)
    } finally {
      setMudandoPausa(false)
    }
  }

  async function decidirMemoria(aceitou: boolean) {
    setConviteMemoria('salvando')
    setErroMemoria(false)
    try {
      await lifeMemoriaRepository.definirConsentimento(aceitou)
      // O que ela contou e motivou o convite entra agora (antes se perdia).
      if (aceitou) {
        for (const l of pendentesMemoria.current) {
          await lifeMemoriaRepository.contar(l.texto, l.categoria, l.data).catch(() => {})
        }
      }
      pendentesMemoria.current = []
      vibrar.leve()
      setConviteMemoria(aceitou ? 'aceito' : 'recusado')
    } catch {
      setErroMemoria(true)
      setConviteMemoria('mostrar')
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
    setPesoAConfirmar(null)
    void marcarConversaComLife()
    // Peso resolvido no app: número sozinho (pergunta antes) ou sem internet.
    const cmdPeso = lerComandoPeso(mensagem)
    if (cmdPeso && resolverNoApp(cmdPeso)) {
      try {
        const resposta = await executarPesoNoApp(cmdPeso, tc.peso)
        setHistorico((h) => [...h, { autor: 'life', texto: resposta }])
        if (cmdPeso.tipo === 'confirmar') setPesoAConfirmar(cmdPeso.kg)
        else aplicarAcao({ tipo: 'peso_atualizado' })
      } catch {
        setErro(tc.erros.geral)
      } finally {
        setEnviando(false)
      }
      return
    }
    try {
      const r = await enviarMensagemChat(mensagem, foco, id)
      falhaRef.current = null
      setHistorico((h) => [...h, { autor: 'life', texto: r.resposta }])
      if (r.restantes !== null) setRestantes(r.restantes)
      aplicarAcao(r.acao)
      if (r.sugerirMemoria) setConviteMemoria((c) => c ?? 'mostrar')
      if (r.memoriaPendente.length) pendentesMemoria.current = [...pendentesMemoria.current, ...r.memoriaPendente].slice(-4)
    } catch (e) {
      falhaRef.current = { texto: mensagem, id }
      // A mensagem não foi aceita: tira do histórico e devolve pro campo.
      setHistorico((h) => h.slice(0, -1))
      setTexto(mensagem)
      setErro(mensagemDeErro(e, tc.erros, m.offline.lifePrecisaInternet))
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
          <LifeMascote humor={props.humor ?? 'normal'} alt="" className="h-14 flex-none" estatico />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-content-hi">{m.lifeChat.titulo[foco]}</h2>
            <p className="mt-0.5 text-sm text-content-low">{m.lifeChat.sub[foco]}</p>
          </div>
          {/* Pausa do dia: quem oferece é o Life, num momento pesado (dono, 12/10 —
              botão livre deixava qualquer um congelar sequências). Aqui só o Retomar. */}
          {pausado && (
            <button
              type="button"
              onClick={() => void alternarPausa()}
              disabled={mudandoPausa}
              className="min-h-11 max-w-[45%] flex-none rounded-full border border-accent-gold/50 bg-accent-gold/10 px-3 text-micro font-semibold leading-tight text-accent-gold disabled:opacity-50"
            >
              <ActivityIcon icone="ceia" tile={false} cor="inherit" className="mr-1 inline-flex h-4 w-4 align-middle" /> {m.lifeChat.pausado} · {m.lifeChat.retomar}
            </button>
          )}
        </div>

        {pausado && <p className="flex-none px-6 pb-3 text-micro leading-relaxed text-content-low">{m.lifeChat.pausadoAviso}</p>}

        {/* Atalho da Dieta (dono, 05/10: Life-chef sem card na tela; 12/10: "Analisar
            um alimento" saiu daqui — o scanner fica na refeição). */}
        {foco === 'dieta' && (
          <div className="flex-none space-y-2 px-6 pb-3">
            <Atalho texto={m.cozinha.lifeChefTitulo} onClick={() => ir('/dieta/cozinha/life')} />
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

          {historico.map((msg, i) => {
            const c = msg.autor === 'life' ? separarCartoes(msg.texto) : { texto: msg.texto, receitas: [], chef: false }
            return (
              <Fragment key={i}>
                {c.texto && (
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                      msg.autor === 'usuario'
                        ? 'ml-auto bg-brand text-brand-ink'
                        : 'border border-surface-4 bg-surface-2 text-content-mid'
                    }`}
                  >
                    {msg.autor === 'life' ? <TextoLife texto={c.texto} /> : <span className="whitespace-pre-line">{c.texto}</span>}
                  </div>
                )}
                {c.receitas.map((id) => {
                  const r = receitas?.get(id)
                  return r ? <CartaoReceita key={id} receita={r} onClick={() => ir(`/dieta/cozinha/${id}`)} /> : null
                })}
                {c.chef && (
                  <div className="max-w-[85%]">
                    <Atalho texto={m.cozinha.lifeChefTitulo} onClick={() => ir('/dieta/cozinha/life')} />
                  </div>
                )}
              </Fragment>
            )
          })}

          {pesoAConfirmar !== null && !enviando && (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void confirmarPeso(false)}
                className="min-h-11 rounded-full border border-surface-4 px-4 text-sm font-semibold text-content-mid active:scale-[0.98]"
              >
                {tc.peso.nao}
              </button>
              <button
                type="button"
                onClick={() => void confirmarPeso(true)}
                className="min-h-11 rounded-full border border-brand/50 bg-brand/10 px-4 text-sm font-semibold text-brand active:scale-[0.98]"
              >
                {tc.peso.sim}
              </button>
            </div>
          )}

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

          {registro && !enviando && (
            <RegistroNoChat
              key={registro.dia + registro.itens.map((i) => i.alimentoId).join()}
              acao={registro}
              onPronto={(texto) => {
                setRegistro(null)
                setHistorico((h) => [...h, { autor: 'life', texto }])
                avisarRegistroDoDia()
              }}
              onCancelar={() => {
                setRegistro(null)
                setHistorico((h) => [...h, { autor: 'life', texto: tc.registro.cancelado }])
              }}
            />
          )}

          {(conviteMemoria === 'mostrar' || conviteMemoria === 'salvando') && (
            <div className="max-w-[85%] rounded-2xl border border-brand/40 bg-surface-2 p-3.5">
              <p className="text-sm leading-relaxed text-content-mid">{tc.memoria.convite}</p>
              <p className="mt-1.5 text-micro text-content-low">{tc.memoria.nunca}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={conviteMemoria === 'salvando'}
                  onClick={() => void decidirMemoria(false)}
                  className="min-h-11 flex-1 rounded-xl border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5 disabled:opacity-50"
                >
                  {tc.memoria.agoraNao}
                </button>
                <button
                  type="button"
                  disabled={conviteMemoria === 'salvando'}
                  onClick={() => void decidirMemoria(true)}
                  className="min-h-11 flex-1 rounded-xl bg-brand text-sm font-bold text-brand-ink active:scale-[0.98] disabled:opacity-50"
                >
                  {tc.memoria.pode}
                </button>
              </div>
              {erroMemoria && <p role="alert" className="mt-2 text-micro text-accent-danger">{tc.memoria.erro}</p>}
            </div>
          )}
          {(conviteMemoria === 'aceito' || conviteMemoria === 'recusado') && (
            <p className="text-micro text-content-low">{conviteMemoria === 'aceito' ? tc.memoria.aceito : tc.memoria.recusado}</p>
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

function Atalho(props: { texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex min-h-12 w-full items-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 px-4 text-left text-sm font-bold text-brand active:scale-[0.99]"
    >
      <ActivityIcon icone="jantar" tile={false} className="h-6 w-6" />
      <span className="flex-1">{props.texto}</span>
      <span aria-hidden="true">›</span>
    </button>
  )
}

/** Receita da Cozinha sugerida pelo Life — abre a receita (o cadeado é da própria tela). */
function CartaoReceita(props: { receita: ReceitaCrua; onClick: () => void }) {
  const r = props.receita
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex min-h-14 w-full max-w-[85%] items-center gap-3 rounded-2xl border border-surface-4 bg-surface-2 p-3 text-left active:scale-[0.99]"
    >
      <span aria-hidden="true" className="h-10 w-1.5 flex-none rounded-full" style={{ background: r.corTema }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-content-hi">{r.titulo}</span>
        <span className="block text-micro text-content-low">
          {fmtKcal(r.macros.calorias)} kcal{r.tempoPreparoMin ? ` · ${r.tempoPreparoMin} min` : ''}
        </span>
      </span>
      <span aria-hidden="true" className="text-content-low">›</span>
    </button>
  )
}
