import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useSession } from '@app/SessionProvider'
import { aoRegistrarNoDia } from '@data/registroDoDia'
import { energiaPesoRepository } from '@data/repositories/energiaPesoRepository'
import { dataLocalISO } from '@domain/rules/datas'
import {
  caminhoSuave,
  montarResumoEnergiaPeso,
  somarDias,
  trechosComRegistro,
  type ItemKcal,
  type PesoDia,
  type ResumoEnergiaPeso,
} from '@domain/rules/energiaPeso'
import { numero } from '@/i18n/formatos'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Gráfico "Energia e peso" — calorias por dia e peso no MESMO eixo de dias,
 * com uma frase que compara os dois com o objetivo. Fica DENTRO do card
 * "Meu peso" (WeightCard), no lugar da linha de peso antiga; o período
 * (14/30 dias) é do card, que usa o mesmo pra variação e início/atual/meta.
 *
 * Recarrega quando algo do dia é registrado (avisarRegistroDoDia) e quando
 * o app volta pra frente.
 */

const BUSCA_DIAS = 30
export const PERIODOS_ENERGIA_PESO = [14, 30] as const
export type PeriodoEnergiaPeso = (typeof PERIODOS_ENERGIA_PESO)[number]
const M = { esq: 8, dir: 46, topo: 22, base: 6 }

type Estado =
  | { readonly fase: 'carregando' }
  | { readonly fase: 'erro' }
  | { readonly fase: 'ok'; readonly itens: ItemKcal[]; readonly pesos: PesoDia[] }

function useDados() {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const seq = useRef(0)

  const carregar = useCallback(async () => {
    const minha = ++seq.current
    try {
      const hoje = dataLocalISO()
      const dados = await energiaPesoRepository.periodo(somarDias(hoje, -(BUSCA_DIAS - 1)), hoje)
      if (minha === seq.current) setEstado({ fase: 'ok', ...dados })
    } catch {
      if (minha === seq.current) setEstado((ant) => (ant.fase === 'ok' ? ant : { fase: 'erro' }))
    }
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const agendar = () => {
      clearTimeout(timer)
      timer = setTimeout(() => void carregar(), 300)
    }
    const visivel = () => {
      if (document.visibilityState === 'visible') agendar()
    }
    void carregar()
    const parar = aoRegistrarNoDia(agendar)
    document.addEventListener('visibilitychange', visivel)
    return () => {
      clearTimeout(timer)
      parar()
      document.removeEventListener('visibilitychange', visivel)
    }
  }, [carregar])

  return { estado, recarregar: carregar }
}

function useLargura<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(300)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      if (e) setW(Math.max(240, Math.round(e.contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

function xDe(i: number, total: number, largura: number) {
  return M.esq + ((largura - M.esq - M.dir) / total) * (i + 0.5)
}

function alvoFoco(e: PointerEvent<SVGSVGElement>, total: number, largura: number) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * largura
  const area = largura - M.esq - M.dir
  return Math.max(0, Math.min(total - 1, Math.floor(((x - M.esq) / area) * total)))
}

export function EnergiaPesoGrafico({ periodo, onPeriodo }: {
  periodo: PeriodoEnergiaPeso
  onPeriodo: (p: PeriodoEnergiaPeso) => void
}) {
  const { profile } = useSession()
  const { idioma, m } = useI18n()
  const t = m.home.energiaPeso
  const { estado, recarregar } = useDados()
  const [foco, setFoco] = useState<number | null>(null)
  const [ref, largura] = useLargura<HTMLDivElement>()

  const resumo = useMemo<ResumoEnergiaPeso | null>(
    () =>
      estado.fase === 'ok'
        ? montarResumoEnergiaPeso({
            itens: estado.itens,
            pesos: estado.pesos,
            periodo,
            hoje: dataLocalISO(),
            metaKcal: profile?.metas.kcal ?? null,
            objetivo: profile?.objetivo ?? null,
          })
        : null,
    [estado, periodo, profile?.metas.kcal, profile?.objetivo],
  )
  useEffect(() => setFoco(null), [periodo])

  const fmt = (v: number, casas = 0) => numero(idioma, v, casas)

  function frase(r: ResumoEnergiaPeso): string {
    const c = r.comparacao
    if (c.tipo !== 'ok') return t[c.tipo]
    const direcao = t.direcao[c.direcao](fmt(Math.abs(c.kgPorSemana), 1))
    const base = t.resumo(periodo, fmt(c.mediaKcal), c.metaKcal ? fmt(c.metaKcal) : null, direcao)
    if (c.alinhado === null) return base
    return `${base} ${c.alinhado ? t.alinhado : t.desalinhado}`
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-micro font-semibold text-content-low">{t.titulo}</h3>
        <div className="flex gap-1.5" role="group" aria-label={t.ariaPeriodo}>
          {PERIODOS_ENERGIA_PESO.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPeriodo(p)}
              aria-pressed={periodo === p}
              className={`min-h-11 rounded-pill px-4 text-sm font-semibold active:scale-95 ${
                periodo === p ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
              }`}
            >
              {t.periodo(p)}
            </button>
          ))}
        </div>
      </div>

      {estado.fase === 'carregando' && <p className="mt-3 text-micro text-content-low">{t.carregando}</p>}
      {estado.fase === 'erro' && (
        <p className="mt-3 text-sm text-content-mid">
          {t.erro}{' '}
          <button type="button" onClick={() => void recarregar()} className="min-h-11 font-semibold text-brand">
            {t.tentar}
          </button>
        </p>
      )}

      {resumo && (
        <>
          <div ref={ref} className="relative mt-3 touch-pan-y" onPointerLeave={() => setFoco(null)}>
            <GraficoKcal resumo={resumo} largura={largura} foco={foco} setFoco={setFoco} fmt={fmt} />
            <GraficoPeso resumo={resumo} largura={largura} foco={foco} setFoco={setFoco} fmt={fmt} meta={profile?.pesoMeta ?? null} />
            {foco !== null && <Dica resumo={resumo} indice={foco} largura={largura} fmt={fmt} />}
          </div>
          <p
            className={`mt-3 text-sm leading-relaxed ${resumo.comparacao.tipo === 'ok' ? 'text-content-hi' : 'text-content-mid'}`}
            aria-live="polite"
          >
            {frase(resumo)}
          </p>
          <p className="mt-1.5 text-micro text-content-low">{t.nota}</p>
          <TabelaDados resumo={resumo} fmt={fmt} />
        </>
      )}
    </div>
  )
}

interface GraficoProps {
  readonly resumo: ResumoEnergiaPeso
  readonly largura: number
  readonly foco: number | null
  readonly setFoco: (i: number | null) => void
  readonly fmt: (v: number, casas?: number) => string
}

function GraficoKcal({ resumo, largura, foco, setFoco, fmt }: GraficoProps) {
  const t = useI18n().m.home.energiaPeso
  const H = 132
  const { dias, metaKcal } = resumo
  const total = dias.length
  const uid = useId().replace(/:/g, '')
  const maxDado = Math.max(0, ...dias.map((d) => d.kcal ?? 0))
  const topo = Math.max(maxDado, metaKcal ?? 0) * 1.15 || 1
  const base = H - M.base
  const y = (v: number) => M.topo + (base - M.topo) * (1 - v / topo)
  const pts = dias.flatMap((d, i) => (d.kcal === null ? [] : [{ x: xDe(i, total, largura), y: y(d.kcal), i }]))
  const curva = caminhoSuave(pts)
  const primeiroPt = pts[0]
  const ultimoPt = pts[pts.length - 1]
  const areaCurva = primeiroPt && ultimoPt && pts.length > 1 ? `${curva} L${ultimoPt.x},${base} L${primeiroPt.x},${base} Z` : ''
  const blocos = trechosComRegistro(dias)
  const isolados = blocos.filter(([a, b]) => a === b).flatMap(([a]) => pts.filter((p) => p.i === a))
  const ultimo = total - 1
  const ultimoKcal = dias[ultimo]?.kcal ?? null
  const pFoco = foco !== null ? pts.find((p) => p.i === foco) : undefined

  return (
    <figure className="m-0 mb-1.5">
      <figcaption className="mt-1 text-micro text-content-mid">{t.calorias}</figcaption>
      <svg
        width={largura}
        height={H}
        role="img"
        aria-label={t.ariaCalorias(total, resumo.diasComRegistro)}
        className="block overflow-visible text-accent-energy"
        onPointerMove={(e) => setFoco(alvoFoco(e, total, largura))}
        onPointerDown={(e) => setFoco(alvoFoco(e, total, largura))}
      >
        <defs>
          <linearGradient id={`g${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.30" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          {/* Só os trechos de dias seguidos com registro ficam sólidos. */}
          <clipPath id={`c${uid}`}>
            {blocos
              .filter(([a, b]) => b > a)
              .map(([a, b]) => (
                <rect key={a} x={xDe(a, total, largura)} y={0} width={xDe(b, total, largura) - xDe(a, total, largura)} height={H} />
              ))}
          </clipPath>
        </defs>
        <line x1={M.esq} x2={largura - M.dir} y1={base} y2={base} className="stroke-surface-4" />
        {dias.map(
          (d, i) =>
            d.kcal === null && (
              <circle key={d.data} cx={xDe(i, total, largura)} cy={base} r={1.6} className="fill-content-dim" />
            ),
        )}
        {metaKcal && (
          <>
            <line
              x1={M.esq}
              x2={largura - M.dir}
              y1={y(metaKcal)}
              y2={y(metaKcal)}
              className="stroke-content-low"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text x={largura - M.dir + 4} y={y(metaKcal) + 4} className="fill-content-low text-micro tabular-nums">
              {t.meta}
            </text>
          </>
        )}
        {/* Ponte tracejada sobre dias sem registro: liga os trechos sem fingir que houve dado. */}
        {pts.length > 1 && (
          <path d={curva} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" opacity={0.55} />
        )}
        {areaCurva && <path d={areaCurva} fill={`url(#g${uid})`} />}
        <g clipPath={`url(#c${uid})`}>
          {pts.length > 1 && (
            <path d={curva} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </g>
        {isolados.map((p) => (
          <circle key={p.i} cx={p.x} cy={p.y} r={4} fill="currentColor" className="stroke-surface-2" strokeWidth={2} />
        ))}
        {ultimoKcal !== null && (
          <>
            <circle cx={xDe(ultimo, total, largura)} cy={y(ultimoKcal)} r={4.5} fill="currentColor" className="stroke-surface-2" strokeWidth={2} />
            <text
              x={xDe(ultimo, total, largura)}
              y={y(ultimoKcal) - 9}
              textAnchor="end"
              className="fill-content-hi text-micro font-semibold tabular-nums"
            >
              {fmt(ultimoKcal)}
            </text>
          </>
        )}
        {foco !== null && (
          <line
            x1={xDe(foco, total, largura)}
            x2={xDe(foco, total, largura)}
            y1={M.topo - 8}
            y2={base}
            className="stroke-content-low"
            strokeWidth={1}
            opacity={0.5}
          />
        )}
        {pFoco && <circle cx={pFoco.x} cy={pFoco.y} r={5} fill="currentColor" className="stroke-surface-2" strokeWidth={2} />}
      </svg>
    </figure>
  )
}

function GraficoPeso({ resumo, largura, foco, setFoco, fmt, meta }: GraficoProps & { readonly meta: number | null }) {
  const { m } = useI18n()
  const t = m.home.energiaPeso
  const H = 112
  const { dias, pesos, tendencia } = resumo
  const total = dias.length
  const valoresPeso = [...pesos.map((p) => p.peso), ...(tendencia ? [tendencia.inicio, tendencia.fim] : [])]
  const ultimo = pesos[pesos.length - 1]
  const temDados = ultimo !== undefined
  // Meta perto (até 3 kg além das pesagens) entra na escala; longe, a linha
  // fica presa na borda com seta, pra não achatar a curva do peso.
  const metaPerto =
    meta !== null && temDados && meta >= Math.min(...valoresPeso) - 3 && meta <= Math.max(...valoresPeso) + 3
  const valores = metaPerto ? [...valoresPeso, meta] : valoresPeso
  const minV = temDados ? Math.min(...valores) : 0
  const maxV = temDados ? Math.max(...valores) : 1
  const folga = Math.max(0.6, (maxV - minV) * 0.25)
  const lo = minV - folga
  const hi = maxV + folga
  const y = (v: number) => M.topo + (H - M.topo - 22) * (1 - (v - lo) / (hi - lo))
  const yMeta = meta === null || !temDados ? null : metaPerto ? y(meta) : meta > maxV ? M.topo - 6 : H - 26
  const setaMeta = meta === null || metaPerto ? '' : meta > maxV ? ' ↑' : ' ↓'
  const marcas = total <= 14 ? [0, Math.floor(total / 2), total - 1] : [0, 10, 20, total - 1]

  return (
    <figure className="m-0">
      <figcaption className="mt-1 text-micro text-content-mid">{t.peso}</figcaption>
      <svg
        width={largura}
        height={H}
        role="img"
        aria-label={temDados ? t.ariaPeso(pesos.length, fmt(ultimo.peso, 1)) : t.semPesagem(total)}
        className="block overflow-visible text-brand"
        onPointerMove={(e) => setFoco(alvoFoco(e, total, largura))}
        onPointerDown={(e) => setFoco(alvoFoco(e, total, largura))}
      >
        {!temDados && (
          <text x={largura / 2} y={H / 2} textAnchor="middle" className="fill-content-low text-micro">
            {t.semPesagem(total)}
          </text>
        )}
        {/* Linha-guia da meta: o alvo que a curva do peso deve ir buscando. */}
        {yMeta !== null && meta !== null && (
          <g className="text-accent-gold">
            <line
              x1={M.esq}
              x2={largura - M.dir}
              y1={yMeta}
              y2={yMeta}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="2 5"
              strokeLinecap="round"
            />
            <text x={M.esq} y={yMeta - 5} className="fill-current text-micro font-semibold tabular-nums">
              {m.home.peso.linhaMeta(`${fmt(meta, 1)} kg`) + setaMeta}
            </text>
          </g>
        )}
        {tendencia && (
          <line
            x1={xDe(0, total, largura)}
            x2={xDe(total - 1, total, largura)}
            y1={y(tendencia.inicio)}
            y2={y(tendencia.fim)}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.6}
          />
        )}
        {pesos.length > 1 && (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            d={caminhoSuave(pesos.map((p) => ({ x: xDe(p.indice, total, largura), y: y(p.peso) })))}
          />
        )}
        {pesos.map((p) => (
          <circle
            key={p.data}
            cx={xDe(p.indice, total, largura)}
            cy={y(p.peso)}
            r={foco === p.indice ? 5.5 : 4.5}
            fill="currentColor"
            className="stroke-surface-2"
            strokeWidth={2}
          />
        ))}
        {ultimo && (
          <text x={largura - M.dir + 4} y={y(ultimo.peso) + 4} className="fill-content-hi text-micro font-semibold tabular-nums">
            {fmt(ultimo.peso, 1)}
          </text>
        )}
        {marcas.map((i) => (
          <text
            key={i}
            x={xDe(i, total, largura)}
            y={H - 4}
            textAnchor={i === 0 ? 'start' : i === total - 1 ? 'end' : 'middle'}
            className="fill-content-low text-micro tabular-nums"
          >
            {i === total - 1 ? t.hoje : dataCurta(dias[i]?.data ?? '')}
          </text>
        ))}
        {foco !== null && (
          <line
            x1={xDe(foco, total, largura)}
            x2={xDe(foco, total, largura)}
            y1={M.topo - 8}
            y2={H - 22}
            className="stroke-content-low"
            strokeWidth={1}
            opacity={0.5}
          />
        )}
      </svg>
    </figure>
  )
}

function Dica({ resumo, indice, largura, fmt }: Omit<GraficoProps, 'foco' | 'setFoco'> & { readonly indice: number }) {
  const t = useI18n().m.home.energiaPeso
  const d = resumo.dias[indice]
  if (!d) return null
  const p = resumo.pesos.find((x) => x.indice === indice)
  const x = xDe(indice, resumo.dias.length, largura)
  const esquerda = Math.max(4, Math.min(largura - 150, x - 75))
  const diaSemana = t.diasSemana[new Date(`${d.data}T12:00:00Z`).getUTCDay()]
  return (
    <div
      className="pointer-events-none absolute top-0 flex w-[150px] flex-col gap-0.5 rounded-xl border border-surface-4 bg-surface-1 px-2.5 py-2 text-micro text-content-mid shadow-lg"
      style={{ left: esquerda }}
      role="status"
    >
      <b className="font-semibold text-content-hi">
        {diaSemana}, {dataCurta(d.data)}
      </b>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-2 w-2 rounded-sm bg-accent-energy" />
        {d.kcal === null ? t.semRegistro : `${fmt(d.kcal)} kcal`}
      </span>
      {p && (
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2 w-2 rounded-sm bg-brand" />
          {fmt(p.peso, 1)} kg
        </span>
      )}
    </div>
  )
}

function TabelaDados({ resumo, fmt }: Pick<GraficoProps, 'resumo' | 'fmt'>) {
  const t = useI18n().m.home.energiaPeso
  return (
    <details className="mt-2 text-micro text-content-mid">
      <summary className="flex min-h-11 cursor-pointer items-center text-content-low">{t.verTabela}</summary>
      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr className="text-left text-content-low">
            <th className="py-1 font-semibold">{t.colDia}</th>
            <th className="py-1 font-semibold">{t.colCalorias}</th>
            <th className="py-1 font-semibold">{t.colPeso}</th>
          </tr>
        </thead>
        <tbody>
          {[...resumo.dias].reverse().map((d) => {
            const p = resumo.pesos.find((x) => x.data === d.data)
            return (
              <tr key={d.data} className="border-t border-surface-3">
                <td className="py-1">{dataCurta(d.data)}</td>
                <td className="py-1">{d.kcal === null ? '—' : `${fmt(d.kcal)} kcal`}</td>
                <td className="py-1">{p ? `${fmt(p.peso, 1)} kg` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </details>
  )
}
