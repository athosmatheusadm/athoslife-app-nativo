import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GATILHOS, minutosDeEspera, type CaminhoVitoria, type EventoHabito, type Habito } from '@domain/entities/habito'
import { alternativasDaVontade } from '@data/ai/aiProxy'
import { receitasRepository, type ReceitaCrua } from '@data/repositories/receitasRepository'
import { FotoReceita } from '@ui/screens/cozinha/CardReceita'
import { useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { vibrar } from '@ui/feedback'

/**
 * Ainda não existe uma faixa de áudio real no projeto — troca aqui quando
 * tiver o arquivo (ex.: `/audio/acolhedora.mp3` em `public/`). Até lá, a
 * espera funciona só com o visual de respiração, sem fingir que toca música.
 */
const MUSICA_ACOLHEDORA_URL: string | null = null

type Vista = 'menu' | 'esperar' | 'alternativa'
interface Troca { texto: string; receitaId: string | null; jaFuncionou?: boolean }

/**
 * Painel do assistente no momento da vontade.
 *
 * Exceção consciente à regra "nada de modal" da Dieta: AQUI interromper é
 * o remédio. No instante da crise, a gente QUER que a pessoa pare tudo,
 * respire e veja que não está sozinha. O painel sobe e escurece o resto.
 *
 * 09/11: vencer a vontade conta ("esperei", "já passou", "fui na troca" viram
 * vitória no banco); o que puxou é um toque opcional; a espera segue a
 * intensidade (5/10/15 min); as trocas são do Life, sob medida pra pessoa
 * (hora, gatilho, o que ela não come, do que gosta, o que já funcionou e
 * receita da Cozinha quando cabe). Sem rede ou sem cota: a lista fixa.
 */
export function CravingAssistant(props: {
  habito: Habito
  eventos: readonly EventoHabito[]
  onVitoria: (caminho: CaminhoVitoria, gatilho: string | null, alternativa: string | null) => void
  onConversar: () => void
  onFechar: () => void
}) {
  const { habito } = props
  const minutos = minutosDeEspera(habito.intensidade)
  const [vista, setVista] = useState<Vista>('menu')
  const [segundosRestantes, setSegundosRestantes] = useState(minutos * 60)
  const [tocando, setTocando] = useState(false)
  const [gatilho, setGatilho] = useState<string | null>(null)
  const [trocas, setTrocas] = useState<Troca[] | null>(null)
  const [escolhida, setEscolhida] = useState<string | null>(null)
  const [receitas, setReceitas] = useState<Map<string, ReceitaCrua>>(new Map())
  const venceuRef = useRef(false)
  const ir = useNavigate()
  const { m } = useI18n()
  const t = m.habitos.vontade
  const nomeMin = habito.nome.toLowerCase()
  const nomeGatilho = (g: string) => (m.habitos.gatilhos as Record<string, string>)[g] ?? g

  // Voltar do Android: espera/alternativa voltam pro menu; o menu fecha.
  useFecharNoVoltar(true, props.onFechar)
  useFecharNoVoltar(vista !== 'menu', () => setVista('menu'))

  /** Vitória vale uma vez por abertura do assistente. */
  function vencer(caminho: CaminhoVitoria, alternativa: string | null = null) {
    if (venceuRef.current) return
    venceuRef.current = true
    props.onVitoria(caminho, gatilho, alternativa)
  }

  // Fim da espera: vibração de conquista e a vitória conta (só uma vez).
  useEffect(() => {
    if (vista === 'esperar' && segundosRestantes === 0) {
      vibrar.sucesso()
      vencer('esperar')
    }
  }, [vista, segundosRestantes])

  // Escape fecha (acessibilidade + hábito de app premium).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onFechar()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [props])

  // Contagem regressiva: só roda enquanto a vista "esperar" está aberta.
  useEffect(() => {
    if (vista !== 'esperar' || segundosRestantes <= 0) return
    const id = setInterval(() => setSegundosRestantes((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [vista, segundosRestantes])

  const mensagem = `${habito.horarioRisco !== null ? t.mensagemHorario : t.mensagem}\n\n${t.mensagemFim(minutos)}`
  const porCategoria = t.alternativas as Record<string, readonly string[] | undefined>
  const fixas = (habito.categoria ? porCategoria[habito.categoria] : undefined) ?? t.alternativas.padrao

  // O que já funcionou pra ela nesse hábito (as 2 mais usadas).
  const contagem = new Map<string, number>()
  for (const e of props.eventos) {
    if (e.vicioId === habito.id && e.tipo === 'vitoria' && e.alternativa) contagem.set(e.alternativa, (contagem.get(e.alternativa) ?? 0) + 1)
  }
  const jaFuncionou: Troca[] = [...contagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([texto]) => ({ texto, receitaId: null, jaFuncionou: true }))

  function abrirEsperar() {
    setSegundosRestantes(minutos * 60)
    setVista('esperar')
    if (MUSICA_ACOLHEDORA_URL) setTocando(true)
  }

  function abrirAlternativa() {
    setVista('alternativa')
    if (trocas) return
    alternativasDaVontade(habito.id, gatilho)
      .then((lista) => {
        setTrocas(lista.length ? lista : fixas.map((texto) => ({ texto, receitaId: null })))
        if (lista.some((x) => x.receitaId)) {
          void receitasRepository.listar().then((rs) => setReceitas(new Map(rs.map((r) => [r.id, r])))).catch(() => {})
        }
      })
      .catch(() => setTrocas(fixas.map((texto) => ({ texto, receitaId: null }))))
  }

  const vistas = new Set(jaFuncionou.map((x) => x.texto.toLowerCase()))
  const lista: Troca[] = trocas ? [...jaFuncionou, ...trocas.filter((x) => !vistas.has(x.texto.toLowerCase()))] : []

  const min = String(Math.floor(segundosRestantes / 60)).padStart(2, '0')
  const seg = String(segundosRestantes % 60).padStart(2, '0')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t.aria(habito.nome)}
    >
      <button
        aria-label={t.fechar}
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />

        {vista === 'menu' && (
          <>
            <h2 className="text-xl font-bold text-content-hi">{t.titulo(nomeMin)}</h2>
            <p className="mt-1 text-sm text-content-low">{t.lifeAqui}</p>

            <div className="mt-4 rounded-2xl border border-surface-4 bg-surface-2 p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-content-mid">
                {mensagem}
              </p>
            </div>

            <p className="mt-4 text-micro font-bold uppercase tracking-wide text-content-low">{t.gatilhoPergunta}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GATILHOS.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={gatilho === g}
                  onClick={() => {
                    setGatilho((v) => (v === g ? null : g))
                    setTrocas(null)
                  }}
                  className={`min-h-9 rounded-pill border px-3 text-micro font-semibold transition-colors ${
                    gatilho === g ? 'border-brand bg-brand/15 text-brand' : 'border-surface-4 text-content-mid'
                  }`}
                >
                  {nomeGatilho(g)}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={abrirEsperar}
                className="min-h-14 w-full rounded-2xl bg-brand font-bold text-brand-ink transition-transform active:scale-[0.98]"
              >
                {t.esperar(minutos)}
              </button>
              <button
                type="button"
                onClick={abrirAlternativa}
                className="min-h-14 w-full rounded-2xl border border-surface-4 font-semibold text-content-mid transition-colors active:bg-content-hi/5"
              >
                {t.alternativa}
              </button>
              <button
                type="button"
                onClick={props.onConversar}
                className="min-h-14 w-full rounded-2xl border border-surface-4 font-semibold text-content-mid transition-colors active:bg-content-hi/5"
              >
                {t.conversar}
              </button>
              <button
                type="button"
                onClick={() => {
                  vencer('passou')
                  props.onFechar()
                }}
                className="min-h-14 w-full rounded-2xl border border-surface-4 font-semibold text-content-mid transition-colors active:bg-content-hi/5"
              >
                {t.passou}
              </button>
            </div>
          </>
        )}

        {vista === 'esperar' && (
          <>
            <h2 className="text-xl font-bold text-content-hi">{t.esperarTitulo}</h2>
            <p className="mt-1 text-sm text-content-low">{t.respira}</p>

            <div className="mt-6 flex flex-col items-center py-4">
              <div
                className="flex h-32 w-32 items-center justify-center rounded-full bg-brand/10 motion-safe:animate-[respirar_4s_ease-in-out_infinite]"
                role="timer"
              >
                <span className="text-3xl font-extrabold tabular-nums text-brand">
                  {min}:{seg}
                </span>
              </div>
              {segundosRestantes === 0 && (
                <p role="status" className="mt-4 text-sm font-semibold text-brand">{t.conseguiu}</p>
              )}
            </div>

            {MUSICA_ACOLHEDORA_URL && (
              <>
                <audio src={MUSICA_ACOLHEDORA_URL} loop autoPlay={tocando} />
                <button
                  type="button"
                  onClick={() => setTocando((x) => !x)}
                  className="mx-auto block min-h-11 rounded-pill border border-surface-4 px-4 text-sm text-content-mid"
                >
                  {tocando ? t.pausarMusica : t.tocarMusica}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                vencer('esperar')
                props.onFechar()
              }}
              className="mt-5 min-h-14 w-full rounded-2xl border border-surface-4 font-semibold text-content-mid transition-colors active:bg-content-hi/5"
            >
              {t.passou}
            </button>
          </>
        )}

        {vista === 'alternativa' && (
          <>
            <h2 className="text-xl font-bold text-content-hi">{t.alternativaTitulo}</h2>
            <p className="mt-1 text-sm text-content-low">{t.alternativaSub(nomeMin)}</p>

            {!trocas ? (
              <div className="mt-4 space-y-2.5" role="status" aria-live="polite">
                <p className="text-sm text-content-low">{t.carregando}</p>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-2xl border border-surface-4 bg-surface-2" aria-hidden="true" />
                ))}
              </div>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {lista.map((a) => {
                  const receita = a.receitaId ? receitas.get(a.receitaId) : undefined
                  const marcada = escolhida === a.texto
                  return (
                    <li key={a.texto}>
                      <button
                        type="button"
                        aria-pressed={marcada}
                        onClick={() => setEscolhida(marcada ? null : a.texto)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm leading-relaxed transition-colors ${
                          marcada ? 'border-brand bg-brand/10 text-content-hi' : 'border-surface-4 bg-surface-2 text-content-mid'
                        }`}
                      >
                        {receita && <FotoReceita receita={receita} className="h-12 w-12 flex-none rounded-xl" />}
                        <span className="min-w-0 flex-1">
                          {a.jaFuncionou && (
                            <span className="mb-0.5 block text-micro font-bold text-brand">{t.jaFuncionou}</span>
                          )}
                          {a.texto}
                        </span>
                      </button>
                      {receita && (
                        <button
                          type="button"
                          onClick={() => {
                            vencer('alternativa', a.texto)
                            props.onFechar()
                            ir(`/dieta/cozinha/${receita.id}`)
                          }}
                          className="ml-auto mt-1 block min-h-11 px-2 text-sm font-bold text-brand"
                        >
                          {t.verReceita} ›
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <button
              type="button"
              onClick={() => {
                vencer('alternativa', escolhida)
                props.onFechar()
              }}
              className="mt-5 min-h-14 w-full rounded-2xl bg-brand font-bold text-brand-ink transition-transform active:scale-[0.98]"
            >
              {escolhida ? t.vouNessa : t.consegui}
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes respirar { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.08) } }
      `}</style>
    </div>
  )
}
