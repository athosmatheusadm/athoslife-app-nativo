import { useEffect, useState } from 'react'
import { alternativasPara, mensagemVontade, type Habito } from '@domain/entities/habito'

const DEZ_MINUTOS_SEG = 10 * 60

/**
 * Ainda não existe uma faixa de áudio real no projeto — troca aqui quando
 * tiver o arquivo (ex.: `/audio/acolhedora.mp3` em `public/`). Até lá, a
 * espera funciona só com o visual de respiração, sem fingir que toca música.
 */
const MUSICA_ACOLHEDORA_URL: string | null = null

type Vista = 'menu' | 'esperar' | 'alternativa'

/**
 * Painel do assistente no momento da vontade.
 *
 * Exceção consciente à regra "nada de modal" da Dieta: AQUI interromper é
 * o remédio. No instante da crise, a gente QUER que a pessoa pare tudo,
 * respire e veja que não está sozinha. O painel sobe e escurece o resto —
 * foco total no assistente.
 *
 * Os 4 caminhos (esperar / alternativa / conversar / já passou) moram aqui
 * dentro como vistas próprias — nada disso persiste no banco ainda (decisão
 * consciente registrada em docs/STATUS.md), é só o momento em si.
 */
export function CravingAssistant(props: {
  habito: Habito
  onConversar: () => void
  onFechar: () => void
}) {
  const { habito } = props
  const [vista, setVista] = useState<Vista>('menu')
  const [segundosRestantes, setSegundosRestantes] = useState(DEZ_MINUTOS_SEG)
  const [tocando, setTocando] = useState(false)

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

  const mensagem = mensagemVontade(habito.horarioRisco !== null)
  const alternativas = alternativasPara(habito.categoria)

  function abrirEsperar() {
    setSegundosRestantes(DEZ_MINUTOS_SEG)
    setVista('esperar')
    if (MUSICA_ACOLHEDORA_URL) setTocando(true)
  }

  const min = String(Math.floor(segundosRestantes / 60)).padStart(2, '0')
  const seg = String(segundosRestantes % 60).padStart(2, '0')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Assistente para ${habito.nome}`}
    >
      <button
        aria-label="Fechar"
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />

        {vista === 'menu' && (
          <>
            <h2 className="text-xl font-bold text-content-hi">
              Vontade de {habito.nome.toLowerCase()}…
            </h2>
            <p className="mt-1 text-sm text-content-low">O Life está aqui.</p>

            <div className="mt-4 rounded-2xl border border-surface-4 bg-surface-2 p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-content-mid">
                {mensagem}
              </p>
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={abrirEsperar}
                className="w-full rounded-2xl bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98]"
              >
                Vou esperar 10 minutos ⏱️
              </button>
              <button
                type="button"
                onClick={() => setVista('alternativa')}
                className="w-full rounded-2xl border border-surface-4 py-4 font-semibold text-content-mid transition-colors active:bg-white/5"
              >
                Quero uma alternativa 🍎
              </button>
              <button
                type="button"
                onClick={props.onConversar}
                className="w-full rounded-2xl border border-surface-4 py-4 font-semibold text-content-mid transition-colors active:bg-white/5"
              >
                Conversar com o Life 💬
              </button>
              <button
                type="button"
                onClick={props.onFechar}
                className="w-full rounded-2xl border border-surface-4 py-4 font-semibold text-content-mid transition-colors active:bg-white/5"
              >
                Já passou, obrigado!
              </button>
            </div>
          </>
        )}

        {vista === 'esperar' && (
          <>
            <h2 className="text-xl font-bold text-content-hi">Vamos esperar juntos</h2>
            <p className="mt-1 text-sm text-content-low">
              {MUSICA_ACOLHEDORA_URL
                ? 'Respira. A vontade passa.'
                : 'Respira. A vontade passa. (música de fundo ainda não configurada)'}
            </p>

            <div className="mt-6 flex flex-col items-center py-4">
              <div
                className="flex h-32 w-32 items-center justify-center rounded-full bg-brand/10 motion-safe:animate-[respirar_4s_ease-in-out_infinite]"
                aria-hidden="true"
              >
                <span className="text-3xl font-extrabold tabular-nums text-brand">
                  {min}:{seg}
                </span>
              </div>
              {segundosRestantes === 0 && (
                <p className="mt-4 text-sm font-semibold text-brand">Conseguiu. Isso conta.</p>
              )}
            </div>

            {MUSICA_ACOLHEDORA_URL && (
              <>
                <audio src={MUSICA_ACOLHEDORA_URL} loop autoPlay={tocando} />
                <button
                  type="button"
                  onClick={() => setTocando((t) => !t)}
                  className="mx-auto block rounded-pill border border-surface-4 px-4 py-2 text-sm text-content-mid"
                >
                  {tocando ? '🔇 Pausar música' : '🔊 Tocar música'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={props.onFechar}
              className="mt-5 w-full rounded-2xl border border-surface-4 py-4 font-semibold text-content-mid transition-colors active:bg-white/5"
            >
              Já passou, obrigado!
            </button>
          </>
        )}

        {vista === 'alternativa' && (
          <>
            <h2 className="text-xl font-bold text-content-hi">Tenta uma dessas 👇</h2>
            <p className="mt-1 text-sm text-content-low">Pra trocar {habito.nome.toLowerCase()} agora.</p>

            <ul className="mt-4 space-y-2.5">
              {alternativas.map((a) => (
                <li
                  key={a}
                  className="rounded-2xl border border-surface-4 bg-surface-2 p-4 text-sm leading-relaxed text-content-mid"
                >
                  {a}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={props.onFechar}
              className="mt-5 w-full rounded-2xl bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98]"
            >
              Consegui, obrigado!
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
