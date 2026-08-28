import { useEffect, useState } from 'react'
import { pesoRepository } from '@data/repositories/pesoRepository'
import {
  corVariacao,
  formatarPeso,
  formatarVariacao,
  gerarPathPeso,
  type ResumoPeso,
} from '@domain/entities/weight'

const COR = { brand: 'text-brand', danger: 'text-accent-danger', neutral: 'text-content-mid' }

/**
 * Card "Meu peso" da Home.
 * Reaproveita o visual do PWA (mesma curva, gradiente e ponto pulsante),
 * mas o traçado é gerado a partir dos pesos reais do usuário.
 */
export function WeightCard({ objetivoPerder = true }: { objetivoPerder?: boolean }) {
  const [resumo, setResumo] = useState<ResumoPeso | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    void pesoRepository
      .resumo()
      .then((r) => ativo && setResumo(r))
      .catch(() => ativo && setResumo(null))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  if (carregando) {
    return (
      <section className="rounded-card border border-surface-4 bg-surface-2 p-5">
        <p className="text-micro text-content-dim">Carregando seu peso…</p>
      </section>
    )
  }

  const temDados = resumo && resumo.registros.length > 0
  const path = gerarPathPeso(resumo?.registros ?? [])
  const cor = resumo ? corVariacao(resumo.variacao, objetivoPerder) : 'neutral'
  const corLinha = path.temPonto ? '#22c55e' : '#3f3f46'

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-0.5 text-micro text-content-dim">⚖️ Meu peso</div>
          <div>
            <span className="text-4xl font-bold text-content-hi">
              {temDados ? formatarPeso(resumo!.atual) : '—'}
            </span>
            <span className="text-lg text-content-low"> kg</span>
          </div>
        </div>
        {temDados && resumo!.variacao !== 0 && (
          <span
            className={`rounded-pill bg-brand/[0.14] px-3 py-1 text-sm font-bold ${COR[cor]}`}
          >
            {formatarVariacao(resumo!.variacao)} kg
          </span>
        )}
      </div>

      {/* Gráfico — sempre presente (linha reta cinza como placeholder até
          existir dado de verdade), idêntico ao PWA quando já tem histórico. */}
      <svg
        className="my-4 h-12 w-full"
        viewBox="0 0 320 48"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={corLinha} stopOpacity="0.25" />
            <stop offset="100%" stopColor={corLinha} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path.area} fill="url(#pesoGrad)" />
        <path
          d={path.linha}
          fill="none"
          stroke={corLinha}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={path.temPonto ? undefined : '4 4'}
        />
        {path.temPonto && (
          <>
            <circle cx={path.fimX} cy={path.fimY} r="3" fill={corLinha} />
            <circle cx={path.fimX} cy={path.fimY} r="3" fill={corLinha} opacity="0.3">
              <animate attributeName="r" from="3" to="8" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
      {!temDados && (
        <p className="mb-3 text-center text-micro text-content-low">
          Registre seu peso alguns dias e sua evolução aparece aqui. 📈
        </p>
      )}

      {temDados && (
        <div className="flex text-center">
          <div className="flex-1">
            <div className="text-micro text-content-dim">Inicial</div>
            <div className="text-sm font-bold text-content-hi">
              {formatarPeso(resumo!.inicial)}kg
            </div>
          </div>
          <div className="flex-1 border-x border-surface-3">
            <div className="text-micro text-content-dim">Atual</div>
            <div className={`text-sm font-bold ${COR[cor]}`}>
              {formatarPeso(resumo!.atual)}kg
            </div>
          </div>
          <div className="flex-1">
            <div className="text-micro text-content-dim">Variação</div>
            <div className={`text-sm font-bold ${COR[cor]}`}>
              {formatarVariacao(resumo!.variacao)}kg
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
