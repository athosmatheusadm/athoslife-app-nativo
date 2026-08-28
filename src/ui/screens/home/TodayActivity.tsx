import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from '@app/SessionProvider'
import { ProgressRing } from '@ui/components/ProgressRing'
import { macrosRepository } from '@data/repositories/macrosRepository'
import { passosRepository } from '@data/repositories/passosRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import { useAgua } from '@ui/screens/water/useAgua'
import { ATALHOS_AGUA_ML, formatarVolume, progressoAgua } from '@domain/entities/water'
import { calcularProgresso, type Metas } from '@domain/entities/profile'

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

  const totalAgua = agua.estado?.totalMl ?? 0

  function toggle(d: Disco) {
    setAberto((atual) => (atual === d ? null : d))
  }

  async function adicionarAguaCustom() {
    const v = parseInt(aguaCustom, 10)
    if (Number.isNaN(v) || v <= 0) return
    await agua.adicionar(v)
    setAguaCustom('')
  }

  async function salvarMetaAgua(litros: number) {
    await profileRepository.atualizarMetaAgua(Math.round(litros * 1000))
    setEditandoMetaAgua(false)
    await refresh()
  }

  async function recarregarPassos() {
    const p = await passosRepository.doDia(metas.passos)
    setPassos(p.passos)
    setPassosMeta(p.meta)
  }

  async function salvarPassos() {
    const v = parseInt(passosInput, 10)
    if (Number.isNaN(v) || v < 0) return
    await passosRepository.registrar(v, passosMeta)
    setPassosInput('')
    setPassosEditando(false)
    await recarregarPassos()
  }

  const kmPassos = (passos * 0.00075).toFixed(1).replace('.', ',')
  const calPassos = Math.round(passos * 0.04)
  const pctPassos = calcularProgresso(passos, passosMeta)

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-hi">Atividade de hoje</h2>
        <span className="text-micro font-semibold text-content-dim">Toque num disco ↓</span>
      </div>

      <div className="flex gap-1">
        <ProgressRing
          pct={progressoAgua(totalAgua, metas.aguaMl)}
          cor="#3b82f6"
          valor={formatarVolume(totalAgua)}
          unidade={`/${formatarVolume(metas.aguaMl)}`}
          label="Água"
          meta={`Meta: ${formatarVolume(metas.aguaMl)}`}
          ativo={aberto === 'agua'}
          onClick={() => toggle('agua')}
        />
        <ProgressRing
          pct={calcularProgresso(kcal, metas.kcal)}
          cor="#f97316"
          valor={String(kcal)}
          unidade={`/${metas.kcal}`}
          label="Calorias"
          meta={`Meta: ${metas.kcal}`}
          ativo={aberto === 'calorias'}
          onClick={() => toggle('calorias')}
        />
        <ProgressRing
          pct={calcularProgresso(prot, metas.proteina)}
          cor="#f43f5e"
          valor={`${prot}g`}
          unidade={`/${metas.proteina}g`}
          label="Proteínas"
          meta={`Meta: ${metas.proteina}g`}
          ativo={aberto === 'proteina'}
          onClick={() => toggle('proteina')}
        />
        <ProgressRing
          pct={pctPassos}
          cor="#f97316"
          valor={formatarPassos(passos)}
          unidade={`/${formatarPassos(passosMeta)}`}
          label="Passos"
          meta={`Meta: ${formatarPassos(passosMeta)}`}
          ativo={aberto === 'passos'}
          onClick={() => toggle('passos')}
        />
      </div>

      <div
        className="grid transition-all duration-300 ease-athos"
        style={{ gridTemplateRows: aberto ? '1fr' : '0fr', marginTop: aberto ? '0.75rem' : 0 }}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-surface-4 bg-surface-1 p-3.5">
            {aberto === 'agua' && (
              <div>
                <div className="mb-3 text-sm font-bold text-content-hi">💧 Registrar água</div>
                <div className="mb-3 text-center">
                  <span className="text-2xl font-black text-accent-water">
                    {formatarVolume(totalAgua)}
                  </span>
                  <span className="ml-1.5 text-micro text-content-dim">
                    de {formatarVolume(metas.aguaMl)} •{' '}
                    {Math.round(progressoAgua(totalAgua, metas.aguaMl))}%
                  </span>
                </div>

                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-content-dim">
                  Adicionar rapidamente
                </p>
                <div className="flex gap-2">
                  {ATALHOS_AGUA_ML.map((ml) => (
                    <button
                      key={ml}
                      type="button"
                      onClick={() => void agua.adicionar(ml)}
                      className="flex-1 rounded-pill border border-surface-4 bg-surface-3 py-2.5 text-sm font-extrabold text-content-hi transition-transform active:scale-95"
                    >
                      +{ml}
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <input
                    value={aguaCustom}
                    onChange={(e) => setAguaCustom(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    placeholder="Outro valor (ml)"
                    className="flex-1 rounded-pill border border-surface-4 bg-surface-3 px-3.5 py-2.5 text-sm text-content-hi placeholder:text-content-dim"
                  />
                  <button
                    type="button"
                    onClick={() => void agua.desfazerUltimo()}
                    title="Remover último registro"
                    disabled={!estadoTemRegistros(agua.estado)}
                    className="w-11 rounded-pill border border-surface-4 bg-surface-3 text-xl font-black text-accent-danger disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => void adicionarAguaCustom()}
                    title="Adicionar"
                    className="w-11 rounded-pill border border-surface-4 bg-surface-3 text-xl font-black text-accent-water"
                  >
                    +
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-surface-4 pt-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-content-dim">
                      Meta diária
                    </div>
                    <div className="text-sm font-extrabold text-content-hi">
                      {(metas.aguaMl / 1000).toFixed(1).replace('.', ',')}L
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditandoMetaAgua((v) => !v)}
                    className="text-micro font-bold text-accent-water"
                  >
                    Editar
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
                          onClick={() => void salvarMetaAgua(l)}
                          className={`rounded-pill border border-surface-4 py-2 text-sm font-bold ${
                            ativo ? 'bg-accent-water text-surface-1' : 'bg-surface-3 text-content-hi'
                          }`}
                        >
                          {String(l).replace('.', ',')}L
                        </button>
                      )
                    })}
                  </div>
                )}

                <p className="mb-1.5 mt-3 border-t border-surface-4 pt-3 text-[10px] font-bold uppercase tracking-wide text-content-dim">
                  Histórico · hoje
                </p>
                {agua.carregando && (
                  <p className="py-2 text-micro text-content-dim">Carregando…</p>
                )}
                {agua.erro && <p className="py-2 text-micro text-accent-danger">{agua.erro}</p>}
                {!agua.carregando && !agua.erro && agua.estado?.registros.length === 0 && (
                  <p className="py-2 text-micro text-content-low">
                    Nenhum gole ainda hoje. Bora começar? 💧
                  </p>
                )}
                <ul className="max-h-24 space-y-1 overflow-y-auto">
                  {agua.estado?.registros.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-content-low">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-water" />
                        {r.criadoEm.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="font-bold text-accent-water">+{r.quantidadeMl}ml</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aberto === 'calorias' && (
              <InfoPanel icone="🔥" titulo="Calorias">
                Você consumiu <b className="text-content-hi">{kcal} kcal</b> de{' '}
                <b className="text-content-hi">{metas.kcal}</b>. Faltam{' '}
                <b className="text-content-hi">{Math.max(0, metas.kcal - kcal)} kcal</b> para a
                meta de hoje.
              </InfoPanel>
            )}

            {aberto === 'proteina' && (
              <InfoPanel icone="🥩" titulo="Proteína">
                <b className="text-content-hi">{prot}g</b> de{' '}
                <b className="text-content-hi">{metas.proteina}g</b> de proteína. Faltam{' '}
                <b className="text-content-hi">{Math.max(0, metas.proteina - prot)}g</b> — que tal
                um shake?
              </InfoPanel>
            )}

            {aberto === 'passos' && (
              <div>
                <div className="mb-1 text-sm font-bold text-content-hi">👟 Meus Passos</div>
                <p className="mb-3 text-[11px] text-content-dim">
                  Contagem automática (Health Connect) chega em breve — por enquanto, registre
                  manualmente.
                </p>
                <div className="mb-3 text-center">
                  <div className="text-3xl font-black text-accent-energy">
                    {passos.toLocaleString('pt-BR')}
                  </div>
                  <div className="mb-2.5 text-[11px] text-content-dim">
                    de {passosMeta.toLocaleString('pt-BR')} passos hoje
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-4">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-energy to-accent-gold"
                      style={{ width: `${pctPassos}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-surface-3 p-2.5 text-center">
                    <div className="text-sm font-extrabold text-content-hi">~{kmPassos}km</div>
                    <div className="text-[9px] text-content-dim">percorridos</div>
                  </div>
                  <div className="rounded-2xl bg-surface-3 p-2.5 text-center">
                    <div className="text-sm font-extrabold text-content-hi">~{calPassos}cal</div>
                    <div className="text-[9px] text-content-dim">queimadas</div>
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
                      className="text-micro font-bold text-accent-energy"
                    >
                      Registrar manualmente
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={passosInput}
                        onChange={(e) => setPassosInput(e.target.value)}
                        type="text"
                        inputMode="numeric"
                        placeholder="Passos de hoje"
                        className="flex-1 rounded-pill border border-surface-4 bg-surface-3 px-3.5 py-2 text-sm text-content-hi placeholder:text-content-dim"
                      />
                      <button
                        type="button"
                        onClick={() => void salvarPassos()}
                        className="rounded-pill bg-accent-energy px-4 py-2 text-sm font-bold text-surface-1"
                      >
                        Salvar
                      </button>
                    </div>
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
      <p className="text-xs leading-relaxed text-content-low">{children}</p>
    </div>
  )
}

function estadoTemRegistros(estado: { registros: readonly unknown[] } | null): boolean {
  return (estado?.registros.length ?? 0) > 0
}

/** 7432 -> "7.4k", 820 -> "820". Cabe dentro do anel. */
function formatarPassos(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1).replace('.', ',')}k`
}
