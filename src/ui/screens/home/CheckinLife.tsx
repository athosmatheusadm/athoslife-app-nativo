import { useEffect, useMemo, useState } from 'react'
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

type Fase = 'carregando' | 'esperando' | 'aberto' | 'enviando' | 'feito' | 'fechado'

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
 * Check-in v3 da Home (protótipos v2 + v3 do dono, 16/10).
 *
 * Do v2: nada na abertura — a faixa chega uns segundos depois, ou logo após
 * o primeiro registro do dia; o × some com ela até o próximo momento
 * (manhã, tarde, noite). Do v3: cinco palavras sugeridas, "Outro…" abre o
 * mapa de 16 sentimentos; motivo e nota são opcionais. Grava pela ai-proxy
 * (tipo 'checkin'), que responde com uma frase do Life e mantém o humor
 * antigo (checkins_emocionais) atualizado. Respondido, vira "Hoje: … · editar".
 */
export function CheckinLife() {
  const { profile } = useSession()
  const { m } = useI18n()
  const t = m.home.checkin
  const momento = useMemo(() => momentoAgora(), [])
  const dia = useMemo(() => dataLocalISO(), [])
  const [fase, setFase] = useState<Fase>('carregando')
  const [mapa, setMapa] = useState(false)
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

  async function enviar() {
    if (!palavra || fase === 'enviando') return
    vibrar.leve()
    setFase('enviando')
    setErro(false)
    try {
      const r = await enviarCheckin({ palavra, etiquetas: tags, nota: nota.trim() || null, momento })
      setResposta({ texto: r.resposta, convite: r.conviteConversa })
      setNota('')
      setFase('feito')
    } catch {
      setErro(true)
      setFase('aberto')
    }
  }

  function alternarTag(e: Etiqueta) {
    setTags((atual) => {
      if (e === 'nada') return atual.includes('nada') ? [] : ['nada']
      const sem = atual.filter((x) => x !== 'nada')
      return sem.includes(e) ? sem.filter((x) => x !== e) : [...sem, e]
    })
  }

  if (fase === 'carregando' || fase === 'esperando' || fase === 'fechado') return null

  const cartao = 'mx-4 mb-3 rounded-2xl border border-surface-4 border-l-[3px] border-l-accent-recaida bg-surface-2'

  if (fase === 'feito') {
    const extra = tags
      .filter((x) => x !== 'nada')
      .slice(0, 2)
      .map((x) => t.etiquetas[x].toLowerCase())
      .join(', ')
    return (
      <div className={`${cartao} px-3.5 py-2`}>
        <button
          type="button"
          onClick={() => {
            setResposta(null)
            setMapa(true)
            setFase('aberto')
          }}
          aria-label={t.editarAria}
          className="flex min-h-11 w-full items-center gap-2 text-left text-micro text-content-low"
        >
          <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-accent-recaidaSoft" />
          <span className="min-w-0 flex-1">
            {t.hoje} <b className="font-semibold text-content-hi">{palavra ? rotulo(palavra).toLowerCase() : ''}</b>
            {extra ? ` · ${extra}` : ''} · <span className="underline">{t.editar}</span>
          </span>
        </button>
        {resposta && (
          <div role="status" className="pb-1.5 text-sm leading-relaxed text-content-mid">
            <p>{resposta.texto}</p>
            {palavra && sugereDiaLeve(palavra, tags) && (
              <OfertaDiaLeve etiquetas={tags} metaPassos={profile?.metas.passos ?? 0} />
            )}
            {resposta.convite && (
              <button
                type="button"
                onClick={() => setChatAberto(true)}
                className="mt-1 min-h-11 text-sm font-semibold text-brand"
              >
                {t.conversar} ›
              </button>
            )}
          </div>
        )}
        {chatAberto && <LifeChatSheet foco="home" onFechar={() => setChatAberto(false)} />}
      </div>
    )
  }

  const chip = (marcado: boolean) =>
    `min-h-11 rounded-pill border px-3.5 text-sm font-medium transition-transform active:scale-[0.97] ${
      marcado ? 'border-brand bg-brand/15 text-brand' : 'border-surface-4 text-content-mid'
    }`

  return (
    <section aria-label={t.rotulo} className={`${cartao} px-3.5 py-3 motion-safe:animate-[checkinEntra_0.25s_ease]`}>
      <div className="flex items-start gap-2">
        <p className="flex-1 pt-2.5 text-sm font-semibold text-content-hi">{t.pergunta[momento]}</p>
        <button
          type="button"
          aria-label={t.agoraNao}
          onClick={() => {
            gravarDispensa(dia, momento)
            setFase('fechado')
          }}
          className="flex h-11 w-11 flex-none items-center justify-center text-content-low"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t.sugestoes}>
        {SUGESTOES_CHECKIN[momento].map((p) => (
          <button key={p} type="button" aria-pressed={palavra === p} onClick={() => setPalavra(p)} className={chip(palavra === p)}>
            {rotulo(p)}
          </button>
        ))}
        {!mapa && (
          <button type="button" onClick={() => setMapa(true)} className={`${chip(false)} border-dashed`}>
            {t.outro}
          </button>
        )}
      </div>
      {!mapa && !palavra && <p className="mt-2 text-micro text-content-low">{t.dica}</p>}

      {mapa && (
        <div className="mt-3">
          <p className="text-micro text-content-low">{t.maisEnergia}</p>
          <div className="mt-1 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t.mapa}>
            {MAPA_SENTIMENTOS.map((s) => (
              <button
                key={s.chave}
                type="button"
                role="radio"
                aria-checked={palavra === s.chave}
                onClick={() => setPalavra(s.chave)}
                className={`min-h-12 rounded-xl border px-1 text-micro font-medium leading-tight transition-transform active:scale-[0.97] ${corQuadrante(
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
        </div>
      )}

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
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPalavra(null)
                setTags([])
                setNota('')
                setErro(false)
              }}
              className="min-h-12 flex-1 rounded-xl border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5"
            >
              {t.cancelar}
            </button>
            <button
              type="button"
              disabled={fase === 'enviando'}
              onClick={() => void enviar()}
              className="min-h-12 flex-1 rounded-xl bg-brand text-sm font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {fase === 'enviando' ? t.salvando : t.pronto}
            </button>
          </div>
          {erro && (
            <p role="alert" className="mt-2 text-micro text-accent-danger">
              {t.erro}
            </p>
          )}
          <p className="mt-2 text-micro text-content-low">{t.privacidade}</p>
        </div>
      )}

      <style>{`@keyframes checkinEntra { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  )
}
