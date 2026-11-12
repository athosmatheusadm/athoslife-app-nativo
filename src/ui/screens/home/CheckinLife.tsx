import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { useSession } from '@app/SessionProvider'
import { enviarCheckin } from '@data/ai/aiProxy'
import { aoRegistrarNoDia } from '@data/registroDoDia'
import { lifeMemoriaRepository } from '@data/repositories/lifeMemoriaRepository'
import type { Sexo } from '@domain/entities/profile'
import { dataLocalISO } from '@domain/rules/datas'
import {
  ETIQUETAS_CHECKIN,
  MAPA_SENTIMENTOS,
  SUGESTOES_CHECKIN,
  momentoAgora,
  type Etiqueta,
  type Momento,
  type Sentimento,
} from '@domain/rules/checkinLife'
import { sugereDiaLeve } from '@domain/rules/diaLeve'
import { useI18n } from '@/i18n/I18nProvider'
import { vibrar } from '@ui/feedback'
import { LifeChatSheet } from '@ui/components/life/LifeChatSheet'
import { OfertaDiaLeve } from './OfertaDiaLeve'

/** Segundos depois de abrir a Home até a faixa chegar (protótipo v2: nada na abertura). */
const ATRASO_MS = 3000

type Fase = 'carregando' | 'esperando' | 'aberto' | 'feito' | 'fechado'

const chaveDispensa = (dia: string, m: Momento) => `athos.checkin.dispensado.${dia}.${m}`
function lerDispensa(dia: string, m: Momento): boolean {
  try {
    return localStorage.getItem(chaveDispensa(dia, m)) === '1'
  } catch {
    return false
  }
}
function gravarDispensa(dia: string, m: Momento): void {
  try {
    localStorage.setItem(chaveDispensa(dia, m), '1')
  } catch {
    // sem storage: só some até a próxima abertura
  }
}

/** Índice do rótulo com gênero: [masculino, feminino, neutro]. */
const generoDo = (sexo: Sexo | null) => (sexo === 'masculino' ? 0 : sexo === 'feminino' ? 1 : 2)

/** Cor de cada quadrante do mapa — só tokens; nada de vermelho (sentimento não é erro). */
function corQuadrante(energia: number, agradavel: number, marcado: boolean): string {
  const alta = energia >= 3
  const boa = agradavel >= 3
  if (alta && !boa) return marcado ? 'border-accent-energy bg-accent-energy/25 text-content-hi' : 'border-accent-energy/30 bg-accent-energy/10 text-content-mid'
  if (alta && boa) return marcado ? 'border-accent-gold bg-accent-gold/25 text-content-hi' : 'border-accent-gold/30 bg-accent-gold/10 text-content-mid'
  if (boa) return marcado ? 'border-brand bg-brand/25 text-content-hi' : 'border-brand/30 bg-brand/10 text-content-mid'
  return marcado ? 'border-accent-water bg-accent-water/25 text-content-hi' : 'border-accent-water/30 bg-accent-water/10 text-content-mid'
}

/**
 * Check-in v3 da Home (protótipos v2 + v3 do dono, 16/10; card compacto 01/11).
 *
 * Do v2: nada na abertura — o card chega uns segundos depois, ou logo após
 * o primeiro registro do dia; o × some com ele até o próximo momento
 * (manhã, tarde, noite). Card compacto: pergunta + sugestões numa linha que
 * desliza; um toque numa sugestão já registra (dá pra corrigir no "editar").
 * Tocar no card, no expandir ou em "Outro…" abre a janela de baixo pra cima
 * com o mapa de 16 sentimentos, motivo e nota (opcionais). Grava pela
 * ai-proxy (tipo 'checkin'), que responde com uma frase do Life e mantém o
 * humor antigo (checkins_emocionais) atualizado. Respondido, vira
 * "Hoje: … · editar".
 */
export function CheckinLife() {
  const { profile } = useSession()
  const { m } = useI18n()
  const t = m.home.checkin
  const momento = useMemo(() => momentoAgora(), [])
  const dia = useMemo(() => dataLocalISO(), [])
  const [fase, setFase] = useState<Fase>('carregando')
  const [enviando, setEnviando] = useState(false)
  const [janela, setJanela] = useState(false)
  const [editando, setEditando] = useState<{ palavra: Sentimento | null; tags: Etiqueta[] } | null>(null)
  const [palavra, setPalavra] = useState<Sentimento | null>(null)
  const [tags, setTags] = useState<Etiqueta[]>([])
  const [nota, setNota] = useState('')
  const [resposta, setResposta] = useState<{ texto: string; convite: boolean } | null>(null)
  const [erro, setErro] = useState(false)
  const [chatAberto, setChatAberto] = useState(false)

  useEffect(() => {
    let vivo = true
    void lifeMemoriaRepository
      .checkinDoMomento(dia, momento)
      .then((feito) => {
        if (!vivo) return
        if (feito) {
          setPalavra(feito.palavra)
          setTags(feito.etiquetas)
          setFase('feito')
        } else setFase(lerDispensa(dia, momento) ? 'fechado' : 'esperando')
      })
      .catch(() => vivo && setFase(lerDispensa(dia, momento) ? 'fechado' : 'esperando'))
    return () => {
      vivo = false
    }
  }, [dia, momento])

  useEffect(() => {
    if (fase !== 'esperando') return
    const abrir = () => setFase((f) => (f === 'esperando' ? 'aberto' : f))
    const timer = setTimeout(abrir, ATRASO_MS)
    const tirar = aoRegistrarNoDia(abrir)
    return () => {
      clearTimeout(timer)
      tirar()
    }
  }, [fase])

  const g = generoDo(profile?.sexo ?? null)
  const rotulo = (p: Sentimento) => t.sentimentos[p][g] ?? p

  /** Grava o check-in. Devolve true se deu certo. */
  async function gravar(p: Sentimento, etiquetas: Etiqueta[], texto: string | null): Promise<boolean> {
    if (enviando) return false
    vibrar.leve()
    setEnviando(true)
    setErro(false)
    try {
      const r = await enviarCheckin({ palavra: p, etiquetas, nota: texto, momento })
      setResposta({ texto: r.resposta, convite: r.conviteConversa })
      setNota('')
      setJanela(false)
      setEditando(null)
      setFase('feito')
      return true
    } catch {
      setErro(true)
      return false
    } finally {
      setEnviando(false)
    }
  }

  function registrarRapido(p: Sentimento) {
    setPalavra(p)
    setTags([])
    void gravar(p, [], null)
  }

  function abrirJanela() {
    if (enviando) return
    setErro(false)
    setJanela(true)
  }

  function abrirEdicao() {
    setResposta(null)
    setEditando({ palavra, tags })
    setErro(false)
    setJanela(true)
  }

  /** Fecha sem salvar: na edição volta pro resumo; senão limpa a escolha. */
  function fecharJanela() {
    if (enviando) return
    setJanela(false)
    setErro(false)
    setNota('')
    if (editando) {
      setPalavra(editando.palavra)
      setTags(editando.tags)
      setEditando(null)
    } else {
      setPalavra(null)
      setTags([])
    }
  }

  useFecharNoVoltar(janela, fecharJanela)

  function alternarTag(e: Etiqueta) {
    setTags((atual) => {
      if (e === 'nada') return atual.includes('nada') ? [] : ['nada']
      const sem = atual.filter((x) => x !== 'nada')
      return sem.includes(e) ? sem.filter((x) => x !== e) : [...sem, e]
    })
  }

  if (fase === 'carregando' || fase === 'esperando' || fase === 'fechado') return null

  const chip = (marcado: boolean) =>
    `min-h-11 rounded-pill border px-3.5 text-sm font-medium transition-transform active:scale-[0.97] ${
      marcado ? 'border-brand bg-brand/15 text-brand' : 'border-surface-4 text-content-mid'
    }`

  const folha =
    janela &&
    createPortal(
      // stopPropagation: evento de portal sobe pela árvore do React até o card (que abriria a janela de novo)
      <div className="athos-ck-folha-fundo" onClick={(e) => e.stopPropagation()}>
        <div className="athos-ck-veu" aria-hidden="true" onClick={fecharJanela} />
        <div role="dialog" aria-modal="true" aria-label={t.mapa} className="athos-ck-folha">
          <div className="athos-ck-alca" aria-hidden="true" />
          <div className="athos-ck-folha-topo">
            <img src="/life/calmo.webp" alt="" className="athos-ck-life" draggable={false} />
            <p className="min-w-0 flex-1 text-base font-semibold text-content-hi">{t.pergunta[momento]}</p>
            <button type="button" aria-label={t.fecharJanela} onClick={fecharJanela} className="athos-ck-x">
              ✕
            </button>
          </div>

          <p className="mt-3 text-micro text-content-low">{t.maisEnergia}</p>
          <div className="athos-ck-grade" role="radiogroup" aria-label={t.mapa}>
            {MAPA_SENTIMENTOS.map((s) => (
              <button
                key={s.chave}
                type="button"
                role="radio"
                aria-checked={palavra === s.chave}
                onClick={() => setPalavra(s.chave)}
                className={`athos-ck-tile rounded-xl border transition-transform active:scale-[0.97] ${corQuadrante(
                  s.energia,
                  s.agradavel,
                  palavra === s.chave,
                )}`}
              >
                {rotulo(s.chave)}
              </button>
            ))}
          </div>
          <p className="mt-1 flex justify-between gap-2 text-micro text-content-low">
            <span>{t.menosAgradavel}</span>
            <span>{t.maisAgradavel}</span>
          </p>

          {palavra && (
            <div className="mt-3 border-t border-surface-4 pt-3">
              <p className="text-micro text-content-mid">
                {t.temAVer} <span className="text-content-low">{t.opcional}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ETIQUETAS_CHECKIN.map((e) => (
                  <button key={e} type="button" aria-pressed={tags.includes(e)} onClick={() => alternarTag(e)} className={chip(tags.includes(e))}>
                    {t.etiquetas[e]}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                maxLength={140}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder={t.notaPlaceholder}
                aria-label={t.notaAria}
                className="mt-3 w-full resize-none rounded-xl border border-surface-4 bg-surface-1 px-3 py-2 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
              />
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={fecharJanela}
              className="min-h-12 flex-1 rounded-xl border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5"
            >
              {t.cancelar}
            </button>
            <button
              type="button"
              disabled={!palavra || enviando}
              onClick={() => palavra && void gravar(palavra, tags, nota.trim() || null)}
              className="min-h-12 flex-1 rounded-xl bg-brand text-sm font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {enviando ? t.salvando : t.pronto}
            </button>
          </div>
          {erro && (
            <p role="alert" className="mt-2 text-micro text-accent-danger">
              {t.erro}
            </p>
          )}
          <p className="mt-2 text-micro text-content-low">{t.privacidade}</p>
        </div>
      </div>,
      document.body,
    )

  if (fase === 'feito') {
    const extra = tags
      .filter((x) => x !== 'nada')
      .slice(0, 2)
      .map((x) => t.etiquetas[x].toLowerCase())
      .join(', ')
    return (
      <div className="athos-ck-base px-3.5 py-2">
        <button
          type="button"
          onClick={abrirEdicao}
          aria-label={t.editarAria}
          className="flex min-h-11 w-full items-center gap-2 text-left text-micro text-content-low"
        >
          <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-brand" />
          <span className="min-w-0 flex-1">
            {t.hoje} <b className="font-semibold text-content-hi">{palavra ? rotulo(palavra).toLowerCase() : ''}</b>
            {extra ? ` · ${extra}` : ''} · <span className="underline">{t.editar}</span>
          </span>
        </button>
        {resposta && (
          <div role="status" className="pb-1.5 text-sm leading-relaxed text-content-mid">
            <p>{resposta.texto}</p>
            {resposta.convite && (
              <button
                type="button"
                onClick={() => setChatAberto(true)}
                className="mt-1 min-h-11 text-sm font-semibold text-brand"
              >
                {t.conversar} ›
              </button>
            )}
            {palavra && sugereDiaLeve(palavra, tags) && <OfertaDiaLeve metaPassos={profile?.metas.passos ?? 0} />}
          </div>
        )}
        {chatAberto && <LifeChatSheet foco="home" onFechar={() => setChatAberto(false)} />}
        {folha}
      </div>
    )
  }

  return (
    <section
      aria-label={t.rotulo}
      className="athos-ck-base athos-ck motion-safe:animate-[checkinEntra_0.25s_ease]"
      onClick={abrirJanela}
    >
      <div className="athos-ck-topo">
        <p className="min-w-0 flex-1 text-sm font-semibold text-content-hi">{t.pergunta[momento]}</p>
        <button
          type="button"
          aria-label={t.mapa}
          className="athos-ck-x athos-ck-expandir"
          onClick={(e) => {
            e.stopPropagation()
            abrirJanela()
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={t.agoraNao}
          className="athos-ck-x"
          onClick={(e) => {
            e.stopPropagation()
            gravarDispensa(dia, momento)
            setFase('fechado')
          }}
        >
          ✕
        </button>
      </div>

      <div className="athos-ck-carrossel" role="group" aria-label={t.sugestoes}>
        {SUGESTOES_CHECKIN[momento].map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={palavra === p}
            disabled={enviando}
            className={`athos-ck-chip${palavra === p ? ' on' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              registrarRapido(p)
            }}
          >
            {enviando && palavra === p ? t.salvando : rotulo(p)}
          </button>
        ))}
        <button
          type="button"
          className="athos-ck-chip mais"
          onClick={(e) => {
            e.stopPropagation()
            abrirJanela()
          }}
        >
          {t.outro}
        </button>
      </div>
      {erro && !janela && (
        <p role="alert" className="athos-ck-erro text-micro text-accent-danger">
          {t.erro}
        </p>
      )}
      {folha}

      <style>{`@keyframes checkinEntra { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  )
}
