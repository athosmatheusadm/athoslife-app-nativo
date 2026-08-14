import { useEffect } from 'react'
import {
  CAMINHOS_VONTADE,
  mensagemVontade,
  type CaminhoVontade,
  type Habito,
} from '@domain/entities/habito'

/**
 * Painel do assistente no momento da vontade.
 *
 * Exceção consciente à regra "nada de modal" da Dieta: AQUI interromper é
 * o remédio. No instante da crise, a gente QUER que a pessoa pare tudo,
 * respire e veja que não está sozinha. O painel sobe e escurece o resto —
 * foco total no assistente.
 *
 * Diferença de intenção, não de descuido: na Dieta você registra com calma
 * (nada interrompe); aqui você está numa crise (tudo para).
 *
 * Animação: translateY + opacity no overlay (GPU-friendly). Fecha no
 * toque fora, no Escape e no "Já passou".
 */
export function CravingAssistant(props: {
  habito: Habito
  onEscolher: (caminho: CaminhoVontade) => void
  onFechar: () => void
}) {
  const { habito } = props

  // Escape fecha (acessibilidade + hábito de app premium).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onFechar()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [props])

  const mensagem = mensagemVontade(habito.horarioRisco !== null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Assistente para ${habito.nome}`}
    >
      {/* Overlay que escurece o resto — foco total */}
      <button
        aria-label="Fechar"
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />

      {/* Painel que sobe */}
      <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />

        <h2 className="text-xl font-bold text-content-hi">
          Vontade de {habito.nome.toLowerCase()}…
        </h2>
        <p className="mt-1 text-sm text-content-low">O Life está aqui.</p>

        {/* Mensagem — peso sem punição */}
        <div className="mt-4 rounded-2xl border border-surface-4 bg-surface-2 p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-content-mid">
            {mensagem}
          </p>
        </div>

        {/* Caminhos: o primeiro é o principal (verde), os outros discretos */}
        <div className="mt-5 space-y-2.5">
          {CAMINHOS_VONTADE.map((c, i) => (
            <button
              key={c.id}
              onClick={() => props.onEscolher(c.id)}
              className={
                i === 0
                  ? 'w-full rounded-2xl bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98]'
                  : 'w-full rounded-2xl border border-surface-4 py-4 font-semibold text-content-mid transition-colors active:bg-white/5'
              }
            >
              {c.rotulo} {c.emoji}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
