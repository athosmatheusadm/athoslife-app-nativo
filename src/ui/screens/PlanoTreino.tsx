import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { exercicioCatalogoRepository } from '@data/repositories/exercicioCatalogoRepository'
import { planosRepository } from '@data/repositories/planosRepository'
import { temAcessoPremium } from '@domain/rules/access'
import { DIAS_SEMANA, type DiaSemana, type ExercicioCatalogo, type LocalTreino, type NivelTreino } from '@domain/entities/treino'
import {
  gerarPlanoTreino,
  MAX_DIAS,
  validarParametros,
  validarPlanoTreino,
  type ObjetivoTreino,
  type ParametrosTreino,
  type PlanoTreinoGerado,
} from '@domain/rules/geradorTreino'
import {
  PERGUNTAS_TRIAGEM,
  respostasCompletas,
  type RespostasTriagem,
  type TriagemVigente,
} from '@domain/rules/triagemSaude'
import { LifeMascote } from '@ui/components/LifeMascote'
import { dataLocalISO } from '@domain/rules/datas'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Plano de referência de treino (pago) — docs/PLANOS_TREINO_DIETA_DIRETRIZ.md.
 *
 *   intro -> triagem (se não houver vigente) -> [inapto: para aqui]
 *         -> parâmetros -> prévia -> aplicar (RPC valida tudo de novo)
 *
 * A aptidão mostrada é a que o BANCO calculou. O app nunca decide sozinho.
 */
type Etapa = 'carregando' | 'intro' | 'triagem' | 'inapto' | 'parametros' | 'previa' | 'pronto'

export function PlanoTreino() {
  const navigate = useNavigate()
  const { profile } = useSession()
  const { m } = useI18n()
  const t = m.plano
  const pago = profile ? temAcessoPremium(profile) : false

  const [etapa, setEtapa] = useState<Etapa>('carregando')
  const [triagem, setTriagem] = useState<TriagemVigente | null>(null)
  const [catalogo, setCatalogo] = useState<ExercicioCatalogo[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!pago) {
      setEtapa('intro')
      return
    }
    void Promise.all([planosRepository.triagemVigente(), exercicioCatalogoRepository.listar()])
      .then(([tr, cat]) => {
        setTriagem(tr)
        setCatalogo(cat)
        setEtapa('intro')
      })
      .catch(() => {
        setErro(m.comum.erroGenerico)
        setEtapa('intro')
      })
  }, [pago, m.comum.erroGenerico])

  // Parâmetros (padrões a partir do onboarding quando existir).
  const [objetivo, setObjetivo] = useState<ObjetivoTreino>(
    profile?.objetivo === 'massa' ? 'hipertrofia' : profile?.objetivo === 'emagrecer' ? 'condicionamento' : 'saude',
  )
  const [nivel, setNivel] = useState<NivelTreino>('iniciante')
  const [dias, setDias] = useState<DiaSemana[]>(['seg', 'qua', 'sex'])
  const [local, setLocal] = useState<LocalTreino>('academia')
  const [minutos, setMinutos] = useState(45)
  const [plano, setPlano] = useState<PlanoTreinoGerado | null>(null)
  const [aplicando, setAplicando] = useState(false)

  const parametros: ParametrosTreino = { objetivo, nivel, dias, local, minutos }
  const erroParametros = validarParametros(parametros)

  function gerar() {
    setErro(null)
    if (erroParametros) {
      setErro(t.parametros.erros[erroParametros as keyof typeof t.parametros.erros] ?? t.parametros.erros.outro)
      return
    }
    const novo = gerarPlanoTreino(parametros, catalogo)
    const problema = validarPlanoTreino(novo)
    if (problema) {
      setErro(problema === 'vazio' ? t.parametros.erros.vazio : t.parametros.erros.outro)
      return
    }
    setPlano(novo)
    setEtapa('previa')
  }

  async function aplicar() {
    if (!plano) return
    setAplicando(true)
    setErro(null)
    try {
      await planosRepository.aplicarPlanoTreino(plano)
      setEtapa('pronto')
    } catch (e) {
      const c = e instanceof Error ? e.message : ''
      if (c === 'triagem_necessaria') setEtapa('triagem')
      else if (c === 'triagem_inapta') setEtapa('inapto')
      else setErro(c === 'plano_invalido' ? t.parametros.erros.outro : t.previa.erro)
    } finally {
      setAplicando(false)
    }
  }

  const rotuloLocal = local === 'casa' ? m.onboarding.treino.casa : m.onboarding.treino.academia

  return (
    <main className="min-h-full pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label={m.comum.voltar} className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">{t.titulo}</h1>
      </header>

      <div className="px-5">
        {etapa === 'carregando' && (
          <div className="mt-20 flex justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-4 border-t-brand" />
          </div>
        )}

        {etapa === 'intro' && (
          <section className="text-center">
            <LifeMascote humor="treino" className="mx-auto mt-4 h-40" />
            <p className="mt-4 text-sm leading-relaxed text-content-mid">{t.intro}</p>
            <Aviso texto={t.avisoNaoPrescricao} />
            {!pago ? (
              <>
                <p className="mt-5 text-sm font-semibold text-accent-gold">{t.pago}</p>
                <BotaoPrincipal onClick={() => navigate('/perfil/plano')}>{t.verPlanos}</BotaoPrincipal>
              </>
            ) : (
              <BotaoPrincipal
                onClick={() => setEtapa(!triagem ? 'triagem' : triagem.aptoTreino ? 'parametros' : 'inapto')}
              >
                {t.comecar}
              </BotaoPrincipal>
            )}
            {erro && <p className="mt-3 text-sm text-accent-danger">{erro}</p>}
          </section>
        )}

        {etapa === 'triagem' && (
          <FormTriagem
            m={m}
            onEnviada={(tr) => {
              setTriagem(tr)
              setEtapa(tr.aptoTreino ? 'parametros' : 'inapto')
            }}
          />
        )}

        {etapa === 'inapto' && triagem && (
          <section>
            <LifeMascote humor="calmo" className="mx-auto mt-2 h-32" />
            <h2 className="mt-4 text-lg font-bold text-content-hi">{t.inapto.titulo}</h2>
            <p className="mt-2 text-sm text-content-mid">{t.inapto.lead}</p>
            <ul className="mt-3 space-y-1.5">
              {triagem.motivos.map((mo) => (
                <li key={mo} className="flex gap-2 text-sm text-content-mid">
                  <span className="text-accent-recaida" aria-hidden="true">•</span>
                  {t.inapto.motivos[mo]}
                </li>
              ))}
            </ul>
            <Aviso texto={t.inapto.orientacao} />
            <BotaoPrincipal onClick={() => navigate('/treinos', { replace: true })}>{t.inapto.voltar}</BotaoPrincipal>
          </section>
        )}

        {etapa === 'parametros' && (
          <section>
            <Rotulo>{t.parametros.objetivo}</Rotulo>
            <Chips
              opcoes={(['hipertrofia', 'condicionamento', 'saude'] as const).map((o) => ({ valor: o, rotulo: t.parametros.objetivos[o] }))}
              valor={objetivo}
              onMudar={setObjetivo}
            />

            <Rotulo>{t.parametros.nivel}</Rotulo>
            <Chips
              opcoes={(['iniciante', 'intermediario', 'avancado'] as const).map((n) => ({ valor: n, rotulo: t.parametros.niveis[n] }))}
              valor={nivel}
              onMudar={(n) => {
                setNivel(n)
                // Mantém a trava visível: começando = até 4 dias.
                if (dias.length > MAX_DIAS[n]) setDias(dias.slice(0, MAX_DIAS[n]))
              }}
            />

            <Rotulo>{t.parametros.dias}</Rotulo>
            <div className="flex flex-wrap gap-1.5">
              {DIAS_SEMANA.map((d) => {
                const on = dias.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDias(on ? dias.filter((x) => x !== d.id) : [...dias, d.id])}
                    className={`h-11 w-11 rounded-full border text-sm font-bold ${
                      on ? 'border-brand bg-brand/15 text-brand' : 'border-surface-4 text-content-mid'
                    }`}
                  >
                    {t.dias[d.id]}
                  </button>
                )
              })}
            </div>
            <p className="mt-1.5 text-micro text-content-dim">{t.parametros.diasDica}</p>

            <Rotulo>{t.parametros.local}</Rotulo>
            <Chips
              opcoes={[
                { valor: 'academia' as const, rotulo: m.onboarding.treino.academia },
                { valor: 'casa' as const, rotulo: m.onboarding.treino.casa },
              ]}
              valor={local}
              onMudar={setLocal}
            />

            <Rotulo>{t.parametros.minutos}</Rotulo>
            <Chips
              opcoes={[30, 45, 60, 75, 90].map((v) => ({ valor: v, rotulo: `${v} min` }))}
              valor={minutos}
              onMudar={setMinutos}
            />

            {erro && <p className="mt-4 text-sm text-accent-danger">{erro}</p>}
            <BotaoPrincipal onClick={gerar}>{t.parametros.gerar}</BotaoPrincipal>
          </section>
        )}

        {etapa === 'previa' && plano && (
          <section>
            <h2 className="text-lg font-bold text-content-hi">{t.previa.titulo}</h2>
            <p className="mt-1 text-micro text-content-dim">{t.semRevisao}</p>
            <div className="mt-4 space-y-3">
              {plano.sessoes.map((s) => (
                <div key={s.dia} className="rounded-2xl border border-surface-4 bg-surface-2 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-extrabold uppercase tracking-wide text-brand">{t.dias[s.dia]}</span>
                    <span className="text-micro text-content-low">{t.previa.tipos[s.tipo]}</span>
                  </div>
                  <ul className="mt-2 divide-y divide-surface-4/60">
                    {s.itens.map((it) => (
                      <li key={it.exercicio.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 flex-1 text-sm text-content-hi">{it.exercicio.nome}</span>
                        <span className="flex-none text-right text-micro text-content-low">
                          {t.previa.series(it.series.length, it.faixa)}
                          <br />
                          {t.previa.descanso(it.descansoSeg)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <Aviso texto={t.previa.progressao} />
            <Aviso texto={t.avisoNaoPrescricao} />
            <p className="mt-4 text-sm text-content-mid">{t.previa.substituir(rotuloLocal.toLowerCase())}</p>
            {erro && <p className="mt-3 text-sm text-accent-danger">{erro}</p>}
            <BotaoPrincipal disabled={aplicando} onClick={() => void aplicar()}>
              {aplicando ? t.previa.aplicando : t.previa.aplicar}
            </BotaoPrincipal>
            <button
              type="button"
              onClick={() => setEtapa('parametros')}
              className="mt-2 w-full py-2 text-sm text-content-low"
            >
              {t.previa.ajustar}
            </button>
          </section>
        )}

        {etapa === 'pronto' && (
          <section className="text-center">
            <LifeMascote humor="feliz" className="mx-auto mt-6 h-40" />
            <p className="mt-4 text-base font-semibold text-content-hi">{t.previa.sucesso}</p>
            <BotaoPrincipal onClick={() => navigate('/treinos', { replace: true })}>{t.previa.irTreino}</BotaoPrincipal>
          </section>
        )}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------

function FormTriagem(props: { m: ReturnType<typeof useI18n>['m']; onEnviada: (t: TriagemVigente) => void }) {
  const tr = props.m.plano.triagem
  const [respostas, setRespostas] = useState<Partial<RespostasTriagem>>({})
  const [nascimento, setNascimento] = useState('')
  const [declaro, setDeclaro] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const hoje = useMemo(() => dataLocalISO(), [])

  async function enviar() {
    setErro(null)
    if (!respostasCompletas(respostas) || !nascimento || !declaro) {
      setErro(tr.erroIncompleta)
      return
    }
    setEnviando(true)
    try {
      props.onEnviada(await planosRepository.enviarTriagem({ respostas, dataNascimento: nascimento }))
    } catch (e) {
      setErro(e instanceof Error && e.message === 'data_nascimento_invalida' ? tr.erroNascimento : props.m.comum.erroGenerico)
      setEnviando(false)
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-content-hi">{tr.titulo}</h2>
      <p className="mt-1 text-sm text-content-low">{tr.lead}</p>

      <ol className="mt-4 space-y-3">
        {PERGUNTAS_TRIAGEM.map((q, i) => (
          <li key={q} className="rounded-2xl border border-surface-4 bg-surface-2 p-3.5">
            <p className="text-sm leading-snug text-content-hi">
              <span className="mr-1 text-content-dim">{i + 1}.</span>
              {tr.perguntas[q]}
            </p>
            <div className="mt-2.5 flex gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={respostas[q] === v}
                  onClick={() => setRespostas({ ...respostas, [q]: v })}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold ${
                    respostas[q] === v
                      ? v
                        ? 'border-accent-recaida bg-accent-recaida/15 text-accent-recaidaSoft'
                        : 'border-brand bg-brand/15 text-brand'
                      : 'border-surface-4 text-content-mid'
                  }`}
                >
                  {v ? tr.sim : tr.nao}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <label className="mt-5 block text-sm font-semibold text-content-hi">
        {tr.nascimento}
        <input
          type="date"
          value={nascimento}
          max={hoje}
          onChange={(e) => setNascimento(e.target.value)}
          className="mt-1.5 block w-full rounded-xl border border-surface-4 bg-surface-2 px-3 py-3 text-base text-content-hi"
        />
      </label>

      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/5 p-3.5">
        <input
          type="checkbox"
          checked={declaro}
          onChange={(e) => setDeclaro(e.target.checked)}
          className="mt-0.5 h-5 w-5 flex-none accent-[#22c55e]"
        />
        <span className="text-micro leading-relaxed text-content-mid">{tr.declaracao}</span>
      </label>

      {erro && <p className="mt-3 text-sm text-accent-danger">{erro}</p>}
      <BotaoPrincipal disabled={enviando} onClick={() => void enviar()}>
        {tr.botao}
      </BotaoPrincipal>
    </section>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="mt-4 rounded-xl border border-surface-4 bg-surface-3 p-3 text-left text-micro leading-relaxed text-content-low">
      {texto}
    </p>
  )
}

function Rotulo({ children }: { children: string }) {
  return <h3 className="mb-2 mt-5 text-sm font-semibold text-content-hi">{children}</h3>
}

function Chips<T extends string | number>(props: {
  opcoes: readonly { valor: T; rotulo: string }[]
  valor: T
  onMudar: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {props.opcoes.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          aria-pressed={props.valor === o.valor}
          onClick={() => props.onMudar(o.valor)}
          className={`rounded-pill border px-3.5 py-2 text-sm font-semibold ${
            props.valor === o.valor ? 'border-brand bg-brand/15 text-brand' : 'border-surface-4 text-content-mid'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

function BotaoPrincipal(props: { onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="mt-6 w-full rounded-2xl bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98] disabled:opacity-60"
    >
      {props.children}
    </button>
  )
}
