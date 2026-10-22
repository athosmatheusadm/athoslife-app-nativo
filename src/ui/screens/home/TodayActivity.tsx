import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from '@app/SessionProvider'
import { ProgressRing } from '@ui/components/ProgressRing'
import { macrosRepository } from '@data/repositories/macrosRepository'
import { passosRepository } from '@data/repositories/passosRepository'
import { aoMudarDiaLeve } from '@data/diaLeve'
import { profileRepository } from '@data/repositories/profileRepository'
import { useAgua } from '@ui/screens/water/useAgua'
import { ATALHOS_AGUA_ML, formatarVolume, progressoAgua } from '@domain/entities/water'
import { calcularProgresso, type Metas } from '@domain/entities/profile'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

type Disco = 'agua' | 'calorias' | 'proteina' | 'passos'

const METAS_AGUA_L = [2, 2.4, 2.8, 3] as const

/**
 * "Atividade de hoje" — os quatro discos + o painel único que expande
 * embaixo deles (só um disco aberto por vez, igual à referência).
 *
 * Água deixou de ser um card separado: agora é o próprio disco que expande
 * com o registro completo (atalhos, valor customizado, meta, histórico).
 * Passos é hoje manual (ponte até o Health Connect existir de verdade);
 * calorias/proteína só mostram um resumo em texto.
 */
export function TodayActivity({ metas }: { metas: Metas }) {
  const { refresh } = useSession()
  const agua = useAgua(metas.aguaMl)
  const { m, idioma } = useI18n()
  const t = m.home
  const numero = new Intl.NumberFormat(idioma)

  const [kcal, setKcal] = useState(0)
  const [prot, setProt] = useState(0)
  const [passos, setPassos] = useState(0)
  const [passosMeta, setPassosMeta] = useState(metas.passos)

  const [aberto, setAberto] = useState<Disco | null>(null)
  const [editandoMetaAgua, setEditandoMetaAgua] = useState(false)
  const [aguaCustom, setAguaCustom] = useState('')
  const [passosEditando, setPassosEditando] = useState(false)
  const [passosInput, setPassosInput] = useState('')

  useEffect(() => {
    let ativo = true
    void Promise.all([macrosRepository.doDia(), passosRepository.doDia(metas.passos)])
      .then(([m, p]) => {
        if (!ativo) return
        setKcal(m.kcal)
        setProt(m.proteina)
        setPassos(p.passos)
        setPassosMeta(p.meta)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [metas.passos])

  // Dia leve muda a meta de passos de hoje.
  useEffect(
    () =>
      aoMudarDiaLeve(() => {
        void passosRepository.doDia(metas.passos).then((p) => {
          setPassos(p.passos)
          setPassosMeta(p.meta)
        }).catch(() => {})
      }),
    [metas.passos],
  )

  const totalAgua = agua.estado?.totalMl ?? 0

  function toggle(d: Disco) {
    setAberto((atual) => (atual === d ? null : d))
  }

  async function adicionarAgua(ml: number) {
    vibrar.leve()
    await agua.adicionar(ml)
  }

  async function adicionarAguaCustom() {
    const v = parseInt(aguaCustom, 10)
    if (Number.isNaN(v) || v <= 0) return
    await adicionarAgua(v)
    setAguaCustom('')
  }

  async function salvarMetaAgua(litros: number) {
    try {
      await profileRepository.atualizarMetaAgua(Math.round(litros * 1000))
      vibrar.leve()
      setEditandoMetaAgua(false)
      await refresh()
    } catch {
      avisar.erro(m.dieta.erroSalvar)
    }
  }

  async function recarregarPassos() {
    const p = await passosRepository.doDia(metas.passos)
    setPassos(p.passos)
    setPassosMeta(p.meta)
  }

  async function salvarPassos() {
    const v = parseInt(passosInput, 10)
    if (Number.isNaN(v) || v < 0) return
    try {
      await passosRepository.registrar(v, passosMeta)
      vibrar.leve()
      setPassosInput('')
      setPassosEditando(false)
      await recarregarPassos()
    } catch {
      avisar.erro(m.dieta.erroSalvar)
    }
  }

  const kmPassos = new Intl.NumberFormat(idioma, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(passos * 0.00075)
  const calPassos = Math.round(passos * 0.04)
  const pctPassos = calcularProgresso(passos, passosMeta)

  const rotuloErroAgua = agua.erro ? t.agua.erroRegistrar : null
  const discos = [
    { id: 'agua' as const, tom: 'agua' as const, pct: progressoAgua(totalAgua, metas.aguaMl), valor: formatarVolume(totalAgua), unidade: `/${formatarVolume(metas.aguaMl)}`, rotulo: t.atividade.agua, meta: formatarVolume(metas.aguaMl) },
    { id: 'calorias' as const, tom: 'calorias' as const, pct: calcularProgresso(kcal, metas.kcal), valor: String(kcal), unidade: `/${metas.kcal}`, rotulo: t.atividade.calorias, meta: String(metas.kcal) },
    { id: 'proteina' as const, tom: 'proteina' as const, pct: calcularProgresso(prot, metas.proteina), valor: `${prot}g`, unidade: `/${metas.proteina}g`, rotulo: t.atividade.proteinas, meta: `${metas.proteina}g` },
    { id: 'passos' as const, tom: 'passos' as const, pct: pctPassos, valor: formatarPassos(passos), unidade: `/${formatarPassos(passosMeta)}`, rotulo: t.atividade.passos, meta: formatarPassos(passosMeta) },
  ]

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-hi">{t.atividade.titulo}</h2>
      </div>

      <div className="flex gap-1">
        {discos.map((d) => (
          <ProgressRing
            key={d.id}
            tom={d.tom}
            pct={d.pct}
            valor={d.valor}
            unidade={d.unidade}
            label={d.rotulo}
            meta={t.atividade.meta(d.meta)}
            ariaLabel={t.atividade.aria(d.rotulo, `${d.valor}${d.unidade}`, d.meta)}
            ativo={aberto === d.id}
            onClick={() => toggle(d.id)}
          />
        ))}
      </div>

      <div
        className="grid transition-all duration-300 ease-athos"
        style={{ gridTemplateRows: aberto ? '1fr' : '0fr', marginTop: aberto ? '0.75rem' : 0 }}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-surface-4 bg-surface-1 p-3.5">
            {aberto === 'agua' && (
              <div>
                <div className="mb-3 text-sm font-bold text-content-hi">{t.agua.titulo}</div>
                <div className="mb-3 text-center">
                  <span className="text-2xl font-black tabular-nums text-accent-water">
                    {formatarVolume(totalAgua)}
                  </span>
                  <span className="ml-1.5 text-micro text-content-low">
                    {t.agua.deMeta(formatarVolume(metas.aguaMl), Math.round(progressoAgua(totalAgua, metas.aguaMl)))}
                  </span>
                </div>

                <p className="mb-1.5 text-micro font-bold uppercase tracking-wide text-content-low">{t.agua.rapido}</p>
                <div className="flex gap-2">
                  {ATALHOS_AGUA_ML.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => void adicionarAgua(ml)}
                      className="min-h-12 flex-1 rounded-pill border border-surface-4 bg-surface-3 text-sm font-extrabold text-content-hi transition-transform active:scale-95 active:bg-surface-4"
                    >
                      +{ml}
                    </button>
                  ))}
                </div>

                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void adicionarAguaCustom()
                  }}
                >
                  <input
                    value={aguaCustom}
                    onChange={(e) => setAguaCustom(e.target.value.replace(/\D/g, ''))}
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="done"
                    placeholder={t.agua.outro}
                    aria-label={t.agua.outro}
                    className="min-h-12 min-w-0 flex-1 rounded-pill border border-surface-4 bg-surface-3 px-4 text-base text-content-hi placeholder:text-content-low focus:border-accent-water focus:outline-none"
                  />
                  {/* Tirar o último gole não é erro: cinza, não vermelho. */}
                  <button
                    type="button"
                    onClick={() => void agua.desfazerUltimo()}
                    aria-label={t.agua.removerUltimo}
                    disabled={!estadoTemRegistros(agua.estado)}
                    className="h-12 w-12 flex-none rounded-pill border border-surface-4 bg-surface-3 text-xl font-black text-content-mid active:bg-surface-4 disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    type="submit"
                    aria-label={t.agua.adicionar}
                    className="h-12 w-12 flex-none rounded-pill border border-surface-4 bg-surface-3 text-xl font-black text-accent-water active:bg-surface-4"
                  >
                    +
                  </button>
                </form>

                <div className="mt-3 flex items-center justify-between border-t border-surface-4 pt-3">
                  <div>
                    <div className="text-micro font-bold uppercase tracking-wide text-content-low">{t.agua.metaDiaria}</div>
                    <div className="text-sm font-extrabold tabular-nums text-content-hi">{formatarVolume(metas.aguaMl)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditandoMetaAgua((v) => !v)}
                    aria-expanded={editandoMetaAgua}
                    className="-mr-2 min-h-11 px-3 text-sm font-bold text-accent-water active:opacity-70"
                  >
                    {t.agua.editar}
                  </button>
                </div>
                {editandoMetaAgua && (
                  <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                    {METAS_AGUA_L.map((l) => {
                      const ativo = metas.aguaMl === Math.round(l * 1000)
                      return (
                        <button
                          key={l}
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => void salvarMetaAgua(l)}
                          className={`min-h-11 rounded-pill border border-surface-4 text-sm font-bold tabular-nums active:scale-95 ${
                            ativo ? 'bg-accent-water text-surface-1' : 'bg-surface-3 text-content-hi'
                          }`}
                        >
                          {formatarVolume(Math.round(l * 1000))}
                        </button>
                      )
                    })}
                  </div>
                )}

                <p className="mb-1.5 mt-3 border-t border-surface-4 pt-3 text-micro font-bold uppercase tracking-wide text-content-low">
                  {t.agua.historico}
                </p>
                {agua.carregando && <p className="py-2 text-micro text-content-low">{t.agua.carregando}</p>}
                {rotuloErroAgua && <p role="alert" className="py-2 text-micro text-accent-danger">{rotuloErroAgua}</p>}
                {!agua.carregando && !agua.erro && agua.estado?.registros.length === 0 && (
                  <p className="py-2 text-micro text-content-low">{t.agua.vazio}</p>
                )}
                <ul className="max-h-28 space-y-1 overflow-y-auto">
                  {agua.estado?.registros.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 tabular-nums text-content-low">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-water" aria-hidden="true" />
                        {r.criadoEm.toLocaleTimeString(idioma, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-bold tabular-nums text-accent-water">+{r.quantidadeMl}ml</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aberto === 'calorias' && (
              <InfoPanel icone="🔥" titulo={t.calorias.titulo}>
                {t.calorias.texto(kcal, metas.kcal, Math.max(0, metas.kcal - kcal))}
              </InfoPanel>
            )}

            {aberto === 'proteina' && (
              <InfoPanel icone="🥩" titulo={t.proteina.titulo}>
                {t.proteina.texto(prot, metas.proteina, Math.max(0, metas.proteina - prot))}
              </InfoPanel>
            )}

            {aberto === 'passos' && (
              <div>
                <div className="mb-1 text-sm font-bold text-content-hi">{t.passos.titulo}</div>
                <p className="mb-3 text-micro text-content-low">{t.passos.aviso}</p>
                <div className="mb-3 text-center">
                  <div className="text-3xl font-black tabular-nums text-brand">{numero.format(passos)}</div>
                  <div className="mb-2.5 text-micro text-content-low">{t.passos.deMeta(numero.format(passosMeta))}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-4">
                    <div
                      className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-500 ease-athos"
                      style={{ transform: `scaleX(${pctPassos / 100})` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-surface-3 p-2.5 text-center">
                    <div className="text-sm font-extrabold tabular-nums text-content-hi">~{kmPassos} km</div>
                    <div className="text-micro text-content-low">{t.passos.km}</div>
                  </div>
                  <div className="rounded-2xl bg-surface-3 p-2.5 text-center">
                    <div className="text-sm font-extrabold tabular-nums text-content-hi">~{calPassos} kcal</div>
                    <div className="text-micro text-content-low">{t.passos.cal}</div>
                  </div>
                </div>

                <div className="mt-3 border-t border-surface-4 pt-3">
                  {!passosEditando ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPassosInput(String(passos))
                        setPassosEditando(true)
                      }}
                      className="min-h-11 text-sm font-bold text-brand active:opacity-70"
                    >
                      {t.passos.registrar}
                    </button>
                  ) : (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void salvarPassos()
                      }}
                    >
                      <input
                        value={passosInput}
                        onChange={(e) => setPassosInput(e.target.value.replace(/\D/g, ''))}
                        type="text"
                        inputMode="numeric"
                        enterKeyHint="done"
                        autoFocus
                        placeholder={t.passos.placeholder}
                        aria-label={t.passos.placeholder}
                        className="min-h-12 min-w-0 flex-1 rounded-pill border border-surface-4 bg-surface-3 px-4 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="min-h-12 rounded-pill bg-brand px-5 text-sm font-bold text-surface-1 active:scale-95"
                      >
                        {t.passos.salvar}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function InfoPanel({
  icone,
  titulo,
  children,
}: {
  icone: string
  titulo: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2.5 text-sm font-bold text-content-hi">
        {icone} {titulo}
      </div>
      <p className="text-sm leading-relaxed text-content-mid">{children}</p>
    </div>
  )
}

function estadoTemRegistros(estado: { registros: readonly unknown[] } | null): boolean {
  return (estado?.registros.length ?? 0) > 0
}

/** 7432 -> "7.4k", 820 -> "820". Cabe dentro do anel. */
function formatarPassos(n: number): string {
  if (n < 1000) return String(n)
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n / 1000)}k`
}
