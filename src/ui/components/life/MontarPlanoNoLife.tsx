import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { avisarPlanoAplicado } from '@app/eventosLife'
import { alimentosRepository } from '@data/repositories/alimentosRepository'
import { exercicioCatalogoRepository } from '@data/repositories/exercicioCatalogoRepository'
import { planosRepository } from '@data/repositories/planosRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import { DIAS_SEMANA, type DiaSemana, type ExercicioCatalogo, type LocalTreino, type NivelTreino } from '@domain/entities/treino'
import {
  alimentoDoItem,
  cardapioDentroDaMeta,
  gerarPlanoDieta,
  macrosDoItem,
  NOMES_BASE_PLANO,
  totaisDoPlano,
  trocarItem,
  validarParametrosDieta,
  type AlimentoPlano,
  type AtividadeDieta,
  type CorpoDieta,
  type ObjetivoDieta,
  type PlanoDietaGerado,
  type RestricaoDieta,
  type RitmoDieta,
} from '@domain/rules/geradorDieta'
import {
  gerarPlanoTreino,
  MAX_DIAS,
  validarParametros,
  validarPlanoTreino,
  type ObjetivoTreino,
  type PlanoTreinoGerado,
} from '@domain/rules/geradorTreino'
import { dietaSoManter, treinoSoIniciante, type TriagemVigente } from '@domain/rules/triagemSaude'
import { useI18n } from '@/i18n/I18nProvider'
import { BalaoLife, Historico, Opcao, Opcoes, type Resposta } from './baloes'

/**
 * Montar o plano de referência DENTRO do chat (decisão do dono, 29/09): o
 * Life pergunta as escolhas em balões, mostra a prévia ali mesmo e aplica.
 * Aplicou -> o plano vai pro lugar dele (ficha do Treino / cards da Dieta)
 * e o chat leva a pessoa pra lá. Nada de tela separada.
 *
 * Mesmos geradores e travas de antes; quem valida de verdade é o servidor
 * (aplicar_plano_treino / aplicar_plano_dieta).
 */

type Mensagens = ReturnType<typeof useI18n>['m']

function mensagemErroPlano(m: Mensagens, codigo: string): string {
  if (codigo === 'perfil_incompleto') return m.lifeMontar.perfilIncompleto
  if (codigo === 'plano_invalido') return m.plano.parametros.erros.outro
  return m.planoDieta.previa.erro
}

// ---------------------------------------------------------------
// Treino
// ---------------------------------------------------------------

type PassoTreino = 'objetivo' | 'nivel' | 'dias' | 'local' | 'minutos' | 'previa'

export function MontarTreinoNoLife(props: { triagem: TriagemVigente; onAplicado: (rota: string) => void; onMudou: () => void }) {
  const { m } = useI18n()
  const t = m.plano
  const soIniciante = treinoSoIniciante(props.triagem)

  const [catalogo, setCatalogo] = useState<ExercicioCatalogo[] | null>(null)
  const [passo, setPasso] = useState<PassoTreino>('objetivo')
  const [hist, setHist] = useState<Resposta[]>([])
  const [objetivo, setObjetivo] = useState<ObjetivoTreino>('saude')
  const [nivel, setNivel] = useState<NivelTreino>('iniciante')
  const [dias, setDias] = useState<DiaSemana[]>([])
  const [local, setLocal] = useState<LocalTreino>('academia')
  const [plano, setPlano] = useState<PlanoTreinoGerado | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    void exercicioCatalogoRepository.listar().then(setCatalogo).catch(() => setErro(m.comum.erroGenerico))
  }, [m.comum.erroGenerico])

  useEffect(() => {
    props.onMudou()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, erro, catalogo])

  function responder(pergunta: string, resposta: string, proximo: PassoTreino) {
    setHist((h) => [...h, { pergunta, resposta }])
    setPasso(proximo)
  }

  function gerar(minutos: number) {
    setHist((h) => [...h, { pergunta: t.parametros.minutos, resposta: `${minutos} min` }])
    const parametros = { objetivo, nivel, dias, local, minutos }
    const problema = validarParametros(parametros)
    if (problema || !catalogo) {
      setErro(t.parametros.erros[problema as keyof typeof t.parametros.erros] ?? t.parametros.erros.outro)
      return recomecar()
    }
    const novo = gerarPlanoTreino(parametros, catalogo)
    const invalido = validarPlanoTreino(novo)
    if (invalido) {
      setErro(invalido === 'vazio' ? t.parametros.erros.vazio : t.parametros.erros.outro)
      return recomecar()
    }
    setErro(null)
    setPlano(novo)
    setPasso('previa')
  }

  function recomecar() {
    setHist([])
    setDias([])
    setPlano(null)
    setPasso('objetivo')
  }

  async function aplicar() {
    if (!plano) return
    setAplicando(true)
    setErro(null)
    try {
      await planosRepository.aplicarPlanoTreino(plano)
      avisarPlanoAplicado({ tipo: 'treino', local: plano.parametros.local })
      props.onAplicado('/treinos')
    } catch (e) {
      setErro(mensagemErroPlano(m, e instanceof Error ? e.message : ''))
    } finally {
      setAplicando(false)
    }
  }

  if (!catalogo) return erro ? <p className="text-micro text-accent-danger">{erro}</p> : <BalaoLife>{m.lifeMontar.montando}</BalaoLife>

  const niveis: readonly NivelTreino[] = soIniciante ? ['iniciante'] : ['iniciante', 'intermediario', 'avancado']
  const rotuloLocal = (l: LocalTreino) => (l === 'casa' ? m.onboarding.treino.casa : m.onboarding.treino.academia)

  return (
    <div className="space-y-3">
      <Historico itens={hist} />

      {passo === 'objetivo' && (
        <>
          <BalaoLife>{t.parametros.objetivo}</BalaoLife>
          <Opcoes>
            {(['hipertrofia', 'condicionamento', 'saude'] as const).map((o) => (
              <Opcao
                key={o}
                onClick={() => {
                  setObjetivo(o)
                  if (soIniciante) {
                    setNivel('iniciante')
                    setHist((h) => [...h, { pergunta: t.parametros.objetivo, resposta: t.parametros.objetivos[o] }])
                    setPasso('dias')
                  } else responder(t.parametros.objetivo, t.parametros.objetivos[o], 'nivel')
                }}
              >
                {t.parametros.objetivos[o]}
              </Opcao>
            ))}
          </Opcoes>
        </>
      )}

      {passo === 'nivel' && (
        <>
          <BalaoLife>{t.parametros.nivel}</BalaoLife>
          <Opcoes>
            {niveis.map((n) => (
              <Opcao
                key={n}
                onClick={() => {
                  setNivel(n)
                  responder(t.parametros.nivel, t.parametros.niveis[n], 'dias')
                }}
              >
                {t.parametros.niveis[n]}
              </Opcao>
            ))}
          </Opcoes>
        </>
      )}

      {passo === 'dias' && (
        <>
          {soIniciante && <BalaoLife>{t.soIniciante}</BalaoLife>}
          <BalaoLife>
            {t.parametros.dias}
            <span className="mt-1 block text-micro text-content-low">{t.parametros.diasDica}</span>
          </BalaoLife>
          <Opcoes>
            {DIAS_SEMANA.map((d) => {
              const on = dias.includes(d.id)
              const cheio = !on && dias.length >= MAX_DIAS[nivel]
              return (
                <Opcao
                  key={d.id}
                  ativa={on}
                  disabled={cheio}
                  onClick={() => setDias(on ? dias.filter((x) => x !== d.id) : [...dias, d.id])}
                >
                  {t.dias[d.id]}
                </Opcao>
              )
            })}
          </Opcoes>
          <Opcoes>
            <Opcao
              disabled={dias.length < 2}
              onClick={() => {
                const ordenados = DIAS_SEMANA.map((d) => d.id).filter((d) => dias.includes(d))
                setDias(ordenados)
                responder(t.parametros.dias, ordenados.map((d) => t.dias[d]).join(', '), 'local')
              }}
            >
              {m.lifeMontar.pronto} ✓
            </Opcao>
          </Opcoes>
        </>
      )}

      {passo === 'local' && (
        <>
          <BalaoLife>{t.parametros.local}</BalaoLife>
          <Opcoes>
            {(['academia', 'casa'] as const).map((l) => (
              <Opcao
                key={l}
                onClick={() => {
                  setLocal(l)
                  responder(t.parametros.local, rotuloLocal(l), 'minutos')
                }}
              >
                {rotuloLocal(l)}
              </Opcao>
            ))}
          </Opcoes>
        </>
      )}

      {passo === 'minutos' && (
        <>
          <BalaoLife>{t.parametros.minutos}</BalaoLife>
          <Opcoes>
            {[30, 45, 60, 75, 90].map((v) => (
              <Opcao key={v} onClick={() => gerar(v)}>
                {v} min
              </Opcao>
            ))}
          </Opcoes>
        </>
      )}

      {passo === 'previa' && plano && (
        <>
          <BalaoLife>{m.lifeMontar.previaTreino}</BalaoLife>
          <div className="space-y-2">
            {plano.sessoes.map((s) => (
              <div key={s.dia} className="rounded-2xl border border-surface-4 bg-surface-2 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide text-brand">{t.dias[s.dia]}</span>
                  <span className="text-micro text-content-low">{t.previa.tipos[s.tipo]}</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {s.itens.map((it) => (
                    <li key={it.exercicio.id} className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 flex-1 text-content-hi">{it.exercicio.nome}</span>
                      <span className="flex-none text-micro text-content-low">{t.previa.series(it.series.length, it.faixa)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <BalaoLife>
            {t.previa.progressao}
            <span className="mt-2 block text-micro text-content-low">{t.avisoNaoPrescricao}</span>
            <span className="mt-2 block text-micro text-content-low">{t.previa.substituir(rotuloLocal(local).toLowerCase())}</span>
          </BalaoLife>
          <Opcoes>
            <Opcao onClick={recomecar}>{t.previa.ajustar}</Opcao>
            <Opcao ativa disabled={aplicando} onClick={() => void aplicar()}>
              {aplicando ? t.previa.aplicando : t.previa.aplicar}
            </Opcao>
          </Opcoes>
        </>
      )}

      {erro && <p className="text-micro text-accent-danger">{erro}</p>}
    </div>
  )
}

// ---------------------------------------------------------------
// Dieta
// ---------------------------------------------------------------

type PassoDieta =
  | 'carregando'
  | 'perfil'
  | 'sexo'
  | 'objetivo'
  | 'ritmo'
  | 'atividade'
  | 'refeicoes'
  | 'restricoes'
  | 'evitar'
  | 'previa'

export function MontarDietaNoLife(props: { triagem: TriagemVigente; onAplicado: (rota: string) => void; onMudou: () => void }) {
  const { m } = useI18n()
  const t = m.planoDieta
  const { profile, refresh } = useSession()
  const soManter = dietaSoManter(props.triagem)

  const [passo, setPasso] = useState<PassoDieta>('carregando')
  const [hist, setHist] = useState<Resposta[]>([])
  const [base, setBase] = useState<AlimentoPlano[]>([])
  const [evitar, setEvitar] = useState<string[]>([])
  const [sexo, setSexo] = useState(profile?.sexo ?? null)
  const [objetivo, setObjetivo] = useState<ObjetivoDieta>('manter')
  const [ritmo, setRitmo] = useState<RitmoDieta>('leve')
  const [atividade, setAtividade] = useState<AtividadeDieta>('leve')
  const [refeicoes, setRefeicoes] = useState<3 | 4>(4)
  const [restricoes, setRestricoes] = useState<RestricaoDieta[]>([])
  const [plano, setPlano] = useState<PlanoDietaGerado | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const temCorpo = Boolean(profile?.pesoAtual && profile.alturaCm && profile.idade)
  const sexoConhecido = sexo === 'masculino' || sexo === 'feminino'

  function primeiroPasso(): PassoDieta {
    if (!temCorpo) return 'perfil'
    if (!sexoConhecido) return 'sexo'
    return soManter ? 'atividade' : 'objetivo'
  }

  useEffect(() => {
    void Promise.all([alimentosRepository.paraPlanoDieta(NOMES_BASE_PLANO), profileRepository.preferenciasAlimentares()])
      .then(([alimentos, pref]) => {
        setBase(alimentos)
        setEvitar(pref.evitar)
        if (pref.refeicoesPorDia === '2-3') setRefeicoes(3)
        setPasso(primeiroPasso())
      })
      .catch(() => setErro(m.comum.erroGenerico))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    props.onMudou()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, erro])

  function responder(pergunta: string, resposta: string, proximo: PassoDieta) {
    setHist((h) => [...h, { pergunta, resposta }])
    setPasso(proximo)
  }

  async function escolherSexo(s: 'masculino' | 'feminino') {
    setSexo(s)
    responder(m.lifeMontar.sexo, s === 'masculino' ? m.lifeMontar.masculino : m.lifeMontar.feminino, soManter ? 'atividade' : 'objetivo')
    try {
      await profileRepository.atualizarDadosPessoais('sexo', s)
      await refresh()
    } catch {
      // A conta segue com o sexo escolhido aqui; o servidor lê do perfil ao aplicar.
    }
  }

  function gerar(lista: string[]) {
    if (!profile?.pesoAtual || !profile.alturaCm || !profile.idade) return setPasso('perfil')
    const corpo: CorpoDieta = { pesoKg: profile.pesoAtual, alturaCm: profile.alturaCm, idade: profile.idade, sexo }
    const parametros = { objetivo: soManter ? ('manter' as const) : objetivo, ritmo, atividade, refeicoes, restricoes, evitar: lista }
    const problema = validarParametrosDieta(corpo, parametros)
    if (problema) {
      setErro(t.parametros.erros[problema])
      return recomecar()
    }
    const novo = gerarPlanoDieta(corpo, parametros, base)
    if (!novo || !cardapioDentroDaMeta(novo)) {
      setErro(novo ? t.parametros.erros.fora_da_meta : t.parametros.erros.sem_alimentos)
      return recomecar()
    }
    setErro(null)
    setPlano(novo)
    setPasso('previa')
  }

  function recomecar() {
    setHist([])
    setRestricoes([])
    setPlano(null)
    setPasso(primeiroPasso())
  }

  async function aplicar() {
    if (!plano) return
    setAplicando(true)
    setErro(null)
    try {
      await planosRepository.aplicarPlanoDieta(plano)
      await refresh()
      avisarPlanoAplicado({ tipo: 'dieta' })
      props.onAplicado('/dieta')
    } catch (e) {
      setErro(mensagemErroPlano(m, e instanceof Error ? e.message : ''))
    } finally {
      setAplicando(false)
    }
  }

  if (passo === 'carregando') {
    return erro ? <p className="text-micro text-accent-danger">{erro}</p> : <BalaoLife>{m.lifeMontar.montando}</BalaoLife>
  }

  return (
    <div className="space-y-3">
      <Historico itens={hist} />

      {passo === 'perfil' && <BalaoLife>{m.lifeMontar.perfilIncompleto}</BalaoLife>}

      {passo === 'sexo' && (
        <>
          <BalaoLife>{m.lifeMontar.sexo}</BalaoLife>
          <Opcoes>
            <Opcao onClick={() => void escolherSexo('masculino')}>♂ {m.lifeMontar.masculino}</Opcao>
            <Opcao onClick={() => void escolherSexo('feminino')}>♀ {m.lifeMontar.feminino}</Opcao>
          </Opcoes>
        </>
      )}

      {passo === 'objetivo' && (
        <>
          <BalaoLife>{t.parametros.objetivo}</BalaoLife>
          <Opcoes>
            {(['emagrecer', 'manter', 'massa'] as const).map((o) => (
              <Opcao
                key={o}
                onClick={() => {
                  setObjetivo(o)
                  responder(t.parametros.objetivo, t.parametros.objetivos[o], o === 'manter' ? 'atividade' : 'ritmo')
                }}
              >
                {t.parametros.objetivos[o]}
              </Opcao>
            ))}
          </Opcoes>
        </>
      )}

      {passo === 'ritmo' && (
        <>
          <BalaoLife>
            {t.parametros.ritmo}
            <span className="mt-1 block text-micro text-content-low">{t.parametros.ritmoDica}</span>
          </BalaoLife>
          <Opcoes>
            {(['leve', 'moderado'] as const).map((r) => (
              <Opcao
                key={r}
                onClick={() => {
                  setRitmo(r)
                  responder(t.parametros.ritmo, t.parametros.ritmos[r], 'atividade')
                }}
              >
                {t.parametros.ritmos[r]}
              </Opcao>
            ))}
          </Opcoes>
        </>
      )}

      {passo === 'atividade' && (
        <>
          {soManter && <BalaoLife>{t.soManter}</BalaoLife>}
          <BalaoLife>{t.parametros.atividade}</BalaoLife>
          <div className="ml-auto flex max-w-[90%] flex-col items-end gap-2">
            {(['sedentario', 'leve', 'moderado', 'alto'] as const).map((a) => (
              <Opcao
                key={a}
                onClick={() => {
                  setAtividade(a)
                  responder(t.parametros.atividade, t.parametros.atividades[a], 'refeicoes')
                }}
              >
                {t.parametros.atividades[a]}
              </Opcao>
            ))}
          </div>
        </>
      )}

      {passo === 'refeicoes' && (
        <>
          <BalaoLife>{t.parametros.refeicoes}</BalaoLife>
          <Opcoes>
            {([3, 4] as const).map((n) => (
              <Opcao
                key={n}
                onClick={() => {
                  setRefeicoes(n)
                  responder(t.parametros.refeicoes, String(n), 'restricoes')
                }}
              >
                {n}
              </Opcao>
            ))}
          </Opcoes>
        </>
      )}

      {passo === 'restricoes' && (
        <>
          <BalaoLife>{t.parametros.restricoes}</BalaoLife>
          <Opcoes>
            {(['vegetariano', 'sem_lactose', 'sem_gluten'] as const).map((r) => {
              const on = restricoes.includes(r)
              return (
                <Opcao key={r} ativa={on} onClick={() => setRestricoes(on ? restricoes.filter((x) => x !== r) : [...restricoes, r])}>
                  {t.parametros.restricoesOpcoes[r]}
                </Opcao>
              )
            })}
          </Opcoes>
          <Opcoes>
            <Opcao
              onClick={() => {
                const resposta = restricoes.length
                  ? restricoes.map((r) => t.parametros.restricoesOpcoes[r]).join(', ')
                  : m.lifeMontar.nenhuma
                responder(t.parametros.restricoes, resposta, 'evitar')
              }}
            >
              {restricoes.length ? `${m.lifeMontar.pronto} ✓` : m.lifeMontar.nenhuma}
            </Opcao>
          </Opcoes>
        </>
      )}

      {passo === 'evitar' && (
        <PassoEvitar
          iniciais={evitar}
          onPronto={(lista) => {
            setEvitar(lista)
            setHist((h) => [...h, { pergunta: m.lifeMontar.evitar, resposta: lista.length ? lista.join(', ') : m.lifeMontar.nenhuma }])
            gerar(lista)
          }}
        />
      )}

      {passo === 'previa' && plano && (
        <PreviaDieta
          plano={plano}
          aplicando={aplicando}
          onTrocar={(r, i) => setPlano(trocarItem(plano, r, i))}
          onAplicar={() => void aplicar()}
          onAjustar={recomecar}
        />
      )}

      {erro && <p className="text-micro text-accent-danger">{erro}</p>}
    </div>
  )
}

/**
 * "Não como / não gosto / alergia" — já vem com o que a pessoa disse no
 * onboarding. O que ficou digitado sem tocar em Adicionar também vale
 * (na tela antiga isso se perdia).
 */
function PassoEvitar(props: { iniciais: string[]; onPronto: (lista: string[]) => void }) {
  const { m } = useI18n()
  const t = m.planoDieta.parametros
  const [lista, setLista] = useState(props.iniciais)
  const [texto, setTexto] = useState('')

  function comTexto(): string[] {
    const v = texto.trim()
    return v && !lista.some((x) => x.toLowerCase() === v.toLowerCase()) ? [...lista, v] : lista
  }

  return (
    <>
      <BalaoLife>
        {m.lifeMontar.evitar}
        {props.iniciais.length > 0 && <span className="mt-1 block text-micro text-content-low">{t.evitarDica}</span>}
      </BalaoLife>
      {lista.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {lista.map((v) => (
            <span key={v} className="flex items-center gap-1.5 rounded-pill border border-brand/60 bg-brand/10 py-1.5 pl-3 pr-2 text-sm font-semibold text-brand">
              {v}
              <button
                type="button"
                aria-label={`${m.comum.remover} ${v}`}
                onClick={() => setLista(lista.filter((x) => x !== v))}
                className="-my-2 -mr-1 flex h-9 w-9 items-center justify-center rounded-full active:bg-brand/20"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="ml-auto flex w-[90%] gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            setLista(comTexto())
            setTexto('')
          }}
          placeholder={t.evitarPlaceholder}
          className="min-w-0 flex-1 rounded-xl border border-surface-4 bg-surface-2 px-3 py-2 text-base text-content-hi"
        />
        <button
          type="button"
          onClick={() => {
            setLista(comTexto())
            setTexto('')
          }}
          className="rounded-xl border border-surface-4 px-3 text-sm font-semibold text-content-mid"
        >
          {t.adicionar}
        </button>
      </div>
      <Opcoes>
        <Opcao onClick={() => props.onPronto(comTexto())}>
          {comTexto().length ? `${m.lifeMontar.pronto} ✓` : m.lifeMontar.nenhuma}
        </Opcao>
      </Opcoes>
    </>
  )
}

function PreviaDieta(props: {
  plano: PlanoDietaGerado
  aplicando: boolean
  onTrocar: (refeicao: number, item: number) => void
  onAplicar: () => void
  onAjustar: () => void
}) {
  const { m } = useI18n()
  const t = m.planoDieta
  const { metas } = props.plano
  const total = totaisDoPlano(props.plano.refeicoes)

  return (
    <>
      <BalaoLife>{m.lifeMontar.previaDieta}</BalaoLife>
      <div className="rounded-2xl border border-surface-4 bg-surface-2 p-3.5">
        <p className="text-2xl font-extrabold text-content-hi">
          {metas.kcal} <span className="text-sm font-semibold text-content-low">{t.previa.kcalDia}</span>
        </p>
        <p className="mt-1 text-micro text-content-low">
          {t.previa.proteina} {metas.proteina} g · {t.previa.carboidrato} {metas.carboidrato} g · {t.previa.gordura} {metas.gordura} g
        </p>
        <p className="mt-1 text-micro text-content-low">{t.previa.conta(metas.basal, metas.gasto)}</p>
      </div>
      <p className="px-1 text-micro text-content-low">{t.previa.cardapioDica}</p>
      <div className="space-y-2">
        {props.plano.refeicoes.map((r, ri) => (
          <div key={r.tipo} className="rounded-2xl border border-surface-4 bg-surface-2 p-3">
            <span className="text-xs font-extrabold uppercase tracking-wide text-brand">{t.refeicoes[r.tipo]}</span>
            <ul className="mt-1.5 space-y-1">
              {r.itens.map((it, ii) => {
                const a = alimentoDoItem(it)
                const mac = macrosDoItem(it)
                return (
                  <li key={ii} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 text-content-hi">
                      {a.nome} <span className="text-micro text-content-low">· {quantidade(m, it.gramas, a.porcaoG)} · {mac.calorias} kcal</span>
                    </span>
                    {it.opcoes.length > 1 && (
                      <button
                        type="button"
                        aria-label={`${t.previa.trocar} ${a.nome}`}
                        onClick={() => props.onTrocar(ri, ii)}
                        className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-surface-4 text-base text-content-mid active:bg-content-hi/5"
                      >
                        ⇄
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <BalaoLife>
        {t.previa.totalCardapio(total.calorias, metas.kcal)}
        <span className="mt-2 block text-micro text-content-low">{t.avisoNaoPrescricao}</span>
        <span className="mt-2 block text-micro text-content-low">{t.previa.substituir}</span>
      </BalaoLife>
      <Opcoes>
        <Opcao onClick={props.onAjustar}>{t.previa.ajustar}</Opcao>
        <Opcao ativa disabled={props.aplicando} onClick={props.onAplicar}>
          {props.aplicando ? t.previa.aplicando : t.previa.aplicar}
        </Opcao>
      </Opcoes>
    </>
  )
}

/** Item de unidade (pão, ovo, fatia): "2 × 50 g". Resto: "120 g". */
export function quantidade(m: Mensagens, gramas: number, porcaoG: number): string {
  if (porcaoG <= 60 && gramas % porcaoG === 0 && gramas / porcaoG > 1) return m.planoDieta.unidades(gramas / porcaoG, porcaoG)
  return `${gramas} g`
}
