import { useEffect, useState } from 'react'
import { ativarDiaLeve, diaLeveHoje } from '@data/diaLeve'
import type { Etiqueta } from '@domain/rules/checkinLife'
import { dataLocalISO } from '@domain/rules/datas'
import { metaPassosLeve, type TreinoDiaLeve } from '@domain/rules/diaLeve'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

const CHAVE = 'athos.diaLeve.recusado'

function recusadoHoje(): boolean {
  try {
    return localStorage.getItem(CHAVE) === dataLocalISO()
  } catch {
    return false
  }
}

type Etapa = 'pergunta' | 'treino' | 'pronto'

/**
 * Logo abaixo da resposta do Life no check-in de pouca energia: oferece o
 * dia leve (regras em domain/rules/diaLeve). Dois passos: aceitar e escolher
 * o treino (leve ou caminhada). "Manter como está" some até amanhã.
 */
export function OfertaDiaLeve({ etiquetas, metaPassos }: { etiquetas: readonly Etiqueta[]; metaPassos: number }) {
  const { m, idioma } = useI18n()
  const t = m.home.checkin.diaLeve
  const [etapa, setEtapa] = useState<Etapa | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    if (recusadoHoje()) return
    void diaLeveHoje().then((ativo) => vivo && !ativo && setEtapa('pergunta'))
    return () => {
      vivo = false
    }
  }, [])

  if (!etapa) return null

  function recusar() {
    try {
      localStorage.setItem(CHAVE, dataLocalISO())
    } catch {
      /* sem armazenamento: some só nesta visita */
    }
    setEtapa(null)
  }

  async function escolher(treino: TreinoDiaLeve) {
    setSalvando(true)
    try {
      await ativarDiaLeve(treino, metaPassos)
      vibrar.sucesso()
      setEtapa('pronto')
    } catch {
      avisar.erro(t.erro)
    } finally {
      setSalvando(false)
    }
  }

  const titulo = etiquetas.includes('sono') ? t.tituloSono : t.tituloCansaco
  const opcao = 'min-h-12 w-full rounded-xl border border-surface-4 px-3 py-2 text-left active:bg-content-hi/5 disabled:opacity-50'

  return (
    <div className="mb-1.5 mt-1 rounded-xl border border-accent-water/30 bg-accent-water/10 p-3">
      {etapa === 'pergunta' && (
        <>
          <p className="text-sm font-semibold text-content-hi">{titulo}</p>
          <p className="mt-0.5 text-sm text-content-mid">{t.pergunta}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button onClick={() => setEtapa('treino')} className="min-h-11 rounded-pill bg-brand px-4 text-sm font-bold text-brand-ink active:scale-[0.97]">
              {t.sim}
            </button>
            <button onClick={recusar} className="min-h-11 rounded-pill border border-surface-4 px-4 text-sm font-semibold text-content-mid">
              {t.nao}
            </button>
          </div>
        </>
      )}
      {etapa === 'treino' && (
        <>
          <p className="mb-2 text-sm font-semibold text-content-hi">{t.eOTreino}</p>
          <div className="space-y-2">
            <button disabled={salvando} onClick={() => void escolher('leve')} className={opcao}>
              <span className="block text-sm font-semibold text-content-hi">{t.treinoLeve}</span>
              <span className="block text-micro text-content-low">{t.treinoLeveSub}</span>
            </button>
            <button disabled={salvando} onClick={() => void escolher('caminhada')} className={opcao}>
              <span className="block text-sm font-semibold text-content-hi">{t.caminhada}</span>
              <span className="block text-micro text-content-low">{t.caminhadaSub}</span>
            </button>
          </div>
        </>
      )}
      {etapa === 'pronto' && (
        <p role="status" className="text-sm leading-relaxed text-content-mid">
          {t.pronto(new Intl.NumberFormat(idioma).format(metaPassosLeve(metaPassos)))}
        </p>
      )}
    </div>
  )
}
