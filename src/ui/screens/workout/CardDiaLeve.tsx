import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { aoMudarDiaLeve, desativarDiaLeve, diaLeveHoje, trocarTreinoDiaLeve } from '@data/diaLeve'
import { treinoHistoricoRepository } from '@data/repositories/treinoHistoricoRepository'
import { DIA_LEVE, type TreinoDiaLeve } from '@domain/rules/diaLeve'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

/** Dia leve de hoje (aceito no check-in), lido do aparelho e atualizado ao mudar. */
export function useDiaLeve(): TreinoDiaLeve | null {
  const [treino, setTreino] = useState<TreinoDiaLeve | null>(null)
  useEffect(() => {
    let vivo = true
    const ler = () => void diaLeveHoje().then((t) => vivo && setTreino(t))
    ler()
    const tirar = aoMudarDiaLeve(ler)
    return () => {
      vivo = false
      tirar()
    }
  }, [])
  return treino
}

/**
 * Faixa no Treino em dia leve: diz o que mudou, deixa trocar entre treino
 * leve e caminhada, registrar a caminhada ou voltar ao normal.
 */
export function CardDiaLeve({ treino, local, diaSemana }: { treino: TreinoDiaLeve; local: string; diaSemana: string }) {
  const { profile } = useSession()
  const { m } = useI18n()
  const t = m.treino.diaLeve
  const [salvando, setSalvando] = useState(false)
  const [caminhou, setCaminhou] = useState(false)

  useEffect(() => {
    if (treino !== 'caminhada') return
    let vivo = true
    void treinoHistoricoRepository.treinouHoje().then((sim) => vivo && setCaminhou(sim)).catch(() => {})
    return () => {
      vivo = false
    }
  }, [treino])

  async function registrarCaminhada() {
    setSalvando(true)
    try {
      await treinoHistoricoRepository.salvarCaminhada({ minutos: DIA_LEVE.caminhadaMin, local, diaSemana })
      vibrar.sucesso()
      avisar.ok(t.caminhadaSalva)
      setCaminhou(true)
    } catch {
      avisar.erro(t.erro)
    } finally {
      setSalvando(false)
    }
  }

  const link = 'min-h-11 text-sm font-semibold'
  return (
    <div className="mx-4 mb-4 rounded-2xl border border-accent-water/35 bg-accent-water/10 p-3.5">
      <p className="text-sm text-content-hi">{treino === 'leve' ? t.leve : t.caminhada}</p>
      {treino === 'caminhada' && !caminhou && (
        <button
          disabled={salvando}
          onClick={() => void registrarCaminhada()}
          className="mt-2.5 min-h-11 w-full rounded-pill bg-brand text-sm font-bold text-brand-ink active:scale-[0.98] disabled:opacity-60"
        >
          {t.fizCaminhada}
        </button>
      )}
      <div className="mt-1 flex flex-wrap gap-x-4">
        <button onClick={() => void trocarTreinoDiaLeve(treino === 'leve' ? 'caminhada' : 'leve')} className={`${link} text-brand`}>
          {treino === 'leve' ? t.trocarParaCaminhada : t.trocarParaLeve}
        </button>
        <button onClick={() => void desativarDiaLeve(profile?.metas.passos ?? 0)} className={`${link} text-content-low`}>
          {t.voltarNormal}
        </button>
      </div>
    </div>
  )
}
