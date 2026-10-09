import { useEffect, useState } from 'react'
import { HUMORES, type NivelHumor } from '@domain/entities/humor'
import { useI18n } from '@/i18n/I18nProvider'
import { vibrar } from '@ui/feedback'
import { humorRepository } from '@data/repositories/humorRepository'

type Estado =
  | { fase: 'carregando' }
  | { fase: 'perguntar' }
  | { fase: 'respondido'; mensagem: string }
  | { fase: 'oculto' }

/**
 * Check-in emocional da Home ("Como você está hoje?").
 *
 * Fiel ao visual da home (card com borda roxa à esquerda, cinco emojis).
 * Agora FUNCIONAL: ao tocar num emoji, grava em checkins_emocionais (tabela
 * que já existe) e mostra um feedback acolhedor conforme o humor.
 *
 * O registro alimenta os insights da IA depois. Se já respondeu hoje,
 * o card não reaparece — não insiste.
 */
export function EmotionalCheckin() {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const { m } = useI18n()
  const t = m.home.humor

  useEffect(() => {
    let ativo = true
    void humorRepository
      .deHoje()
      .then((ja) => {
        if (!ativo) return
        setEstado(ja ? { fase: 'oculto' } : { fase: 'perguntar' })
      })
      .catch(() => ativo && setEstado({ fase: 'perguntar' }))
    return () => {
      ativo = false
    }
  }, [])

  async function escolher(nivel: NivelHumor) {
    // Otimista: mostra o acolhimento na hora, grava em seguida.
    vibrar.leve()
    setEstado({ fase: 'respondido', mensagem: t.respostas[nivel - 1] ?? '' })
    try {
      await humorRepository.registrar(nivel)
    } catch {
      // Falhou a gravação: não punir o usuário, só recolher depois.
    }
    setTimeout(() => setEstado({ fase: 'oculto' }), 2400)
  }

  if (estado.fase === 'carregando' || estado.fase === 'oculto') return null

  return (
    <div className="mx-4 mb-3 flex items-center gap-2.5 rounded-2xl border border-surface-4 border-l-[3px] border-l-accent-recaida bg-surface-2 px-3.5 py-2.5">
      {estado.fase === 'perguntar' ? (
        <>
          <span className="flex-1 text-micro font-semibold text-content-mid">{t.pergunta}</span>
          <span className="flex gap-1.5" role="group" aria-label={t.pergunta}>
            {HUMORES.map((h) => (
              <button
                key={h.nivel}
                onClick={() => void escolher(h.nivel)}
                className="text-lg transition-transform hover:scale-125 active:scale-110"
                aria-label={t.aria(h.nivel)}
              >
                {h.emoji}
              </button>
            ))}
          </span>
          <button
            onClick={() => setEstado({ fase: 'oculto' })}
            className="px-1 text-content-dim"
            aria-label={t.dispensar}
          >
            ✕
          </button>
        </>
      ) : (
        <p role="status" className="flex-1 py-0.5 text-micro font-medium text-content-mid">
          {estado.mensagem}
        </p>
      )}
    </div>
  )
}
