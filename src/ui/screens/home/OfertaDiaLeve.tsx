import { useEffect, useState } from 'react'
import { ativarDiaLeve, diaLeveHoje } from '@data/diaLeve'
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
export function OfertaDiaLeve({ metaPassos }: { metaPassos: number }) {
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

  const opcao = 'min-h-12 w-full rounded-xl border border-surface-4 px-3 py-2 text-left active:bg-content-hi/5 disabled:opacity-50'

  // Dono, 12/11: a oferta não pode chegar antes de o Life entender o cansaço.
  // Fica um atalho discreto; o cartão só abre se a pessoa tocar.
  if (etapa === 'pergunta') {
    return (
      <button type="button" onClick={() => setEtapa('treino')} className="mt-1 block min-h-11 text-left text-sm text-content-low underline">
        {t.atalho}
      </button>
    )
  }

  return (
    <div className="mb-1.5 mt-1 rounded-xl border border-accent-water/30 bg-accent-water/10 p-3">
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
          <button type="button" onClick={recusar} className="mt-1 min-h-11 text-sm font-semibold text-content-mid">
            {t.nao}
          </button>
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
