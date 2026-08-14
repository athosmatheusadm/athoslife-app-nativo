import { useEffect, useState } from 'react'
import { ProgressRing } from '@ui/components/ProgressRing'
import { aguaRepository } from '@data/repositories/aguaRepository'
import { macrosRepository } from '@data/repositories/macrosRepository'
import { passosRepository } from '@data/repositories/passosRepository'
import { formatarVolume } from '@domain/entities/water'
import { calcularProgresso, type Metas } from '@domain/entities/profile'

/**
 * "Atividade de hoje" — a fileira dos quatro discos.
 * Cores fiéis ao visual atual: água azul, calorias laranja,
 * proteína rosa, passos verde.
 *
 * Cada disco lê seu dado real. Passos hoje é manual (toque abre registro),
 * como no PWA — sensor automático fica pro futuro.
 */
export function TodayActivity({ metas }: { metas: Metas }) {
  const [agua, setAgua] = useState(0)
  const [kcal, setKcal] = useState(0)
  const [prot, setProt] = useState(0)
  const [passos, setPassos] = useState(0)
  const [passosMeta, setPassosMeta] = useState(metas.passos)

  useEffect(() => {
    let ativo = true
    void Promise.all([
      aguaRepository.aguaDoDia(metas.aguaMl),
      macrosRepository.doDia(),
      passosRepository.doDia(metas.passos),
    ]).then(([a, m, p]) => {
      if (!ativo) return
      setAgua(a.totalMl)
      setKcal(m.kcal)
      setProt(m.proteina)
      setPassos(p.passos)
      setPassosMeta(p.meta)
    }).catch(() => {})
    return () => {
      ativo = false
    }
  }, [metas.aguaMl, metas.passos])

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-hi">Atividade de hoje</h2>
        <span className="text-micro font-semibold text-brand">Ver todos</span>
      </div>
      <div className="flex gap-2">
        <ProgressRing
          pct={calcularProgresso(agua, metas.aguaMl)}
          cor="#3b82f6"
          valor={formatarVolume(agua)}
          unidade={formatarVolume(metas.aguaMl)}
          label="Água"
          meta={`Meta: ${formatarVolume(metas.aguaMl)}`}
        />
        <ProgressRing
          pct={calcularProgresso(kcal, metas.kcal)}
          cor="#f97316"
          valor={String(kcal)}
          unidade={`/${metas.kcal}`}
          label="Calorias"
          meta={`Meta: ${metas.kcal}`}
        />
        <ProgressRing
          pct={calcularProgresso(prot, metas.proteina)}
          cor="#f43f5e"
          valor={`${prot}g`}
          unidade={`/${metas.proteina}g`}
          label="Proteínas"
          meta={`Meta: ${metas.proteina}g`}
        />
        <ProgressRing
          pct={calcularProgresso(passos, passosMeta)}
          cor="#22c55e"
          valor={formatarPassos(passos)}
          unidade={`/${formatarPassos(passosMeta)}`}
          label="Passos"
          meta={`Meta: ${formatarPassos(passosMeta)}`}
        />
      </div>
    </section>
  )
}

/** 7432 -> "7.4k", 820 -> "820". Cabe dentro do anel. */
function formatarPassos(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1).replace('.', ',')}k`
}
