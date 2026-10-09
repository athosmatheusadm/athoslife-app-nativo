import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSession } from '@app/SessionProvider'
import { pesoRepository } from '@data/repositories/pesoRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import type { Objetivo } from '@domain/entities/profile'
import {
  PERIODOS_PESO,
  corVariacao,
  filtrarPeriodo,
  formatarDiaMes,
  formatarPeso,
  formatarVariacao,
  gerarGraficoPeso,
  progressoMeta,
  resumirPesos,
  type PeriodoPeso,
  type RegistroPeso,
} from '@domain/entities/weight'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

// Variação "contra o objetivo" fica neutra, nunca vermelha: peso não é erro
// e vermelho leria como bronca (Humane By Design). A favor = verde da marca.
const COR = { brand: 'text-brand', danger: 'text-content-mid', neutral: 'text-content-mid' }
const COR_LINHA = { brand: 'text-brand', danger: 'text-content-low', neutral: 'text-content-low' }
const LARGURA = 320
const ALTURA = 64

const OBJETIVOS: readonly Objetivo[] = ['emagrecer', 'massa', 'manter']

/** "78,5" / "78.5" -> 78.5, ou null se não for um peso plausível. */
function lerPeso(txt: string): number | null {
  const kg = Number(txt.replace(',', '.'))
  if (!Number.isFinite(kg) || kg < 20 || kg > 400) return null
  return Math.round(kg * 10) / 10
}

type Painel = null | 'registrar' | 'meta' | 'historico'

/**
 * Card "Meu peso" da Home — o gráfico é 100% o que a pessoa registrou.
 *
 *  - Eixo X em tempo real (não em ordem de registro), com as datas das pontas.
 *  - Período 30 dias / 90 dias / tudo.
 *  - Objetivo + peso-meta: linha tracejada da meta no gráfico, "faltam X kg",
 *    e a cor da variação segue o objetivo (emagrecer: perder é verde; ganhar
 *    massa: ganhar é verde; manter/sem objetivo: neutro).
 *  - Histórico com os registros, dá pra apagar um lançado errado.
 *
 * Registrar também atualiza `profiles.peso_atual` (Conta mostra o mesmo número).
 */
export function WeightCard() {
  const { profile, refresh } = useSession()
  const [todos, setTodos] = useState<RegistroPeso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [periodo, setPeriodo] = useState<PeriodoPeso>('90d')
  const [painel, setPainel] = useState<Painel>(null)
  const [valor, setValor] = useState('')
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null)
  const [meta, setMeta] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [apagando, setApagando] = useState<number | null>(null)
  const { m } = useI18n()
  const t = m.home.peso

  const carregar = useCallback(async () => {
    try {
      setTodos(await pesoRepository.historico())
    } catch {
      setTodos([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const registros = useMemo(() => filtrarPeriodo(todos, periodo), [todos, periodo])
  const resumo = useMemo(() => resumirPesos(registros), [registros])
  const pesoMeta = profile?.pesoMeta ?? null
  const grafico = useMemo(() => gerarGraficoPeso(registros, pesoMeta, LARGURA, ALTURA), [registros, pesoMeta])

  if (carregando) {
    return (
      <section className="rounded-card border border-surface-4 bg-surface-2 p-5">
        <p className="text-micro text-content-low">{t.carregando}</p>
      </section>
    )
  }

  const objetivoAtual = profile?.objetivo ?? null
  const temDados = registros.length > 0
  const atual = todos[todos.length - 1]?.pesoKg ?? 0
  const cor = corVariacao(resumo.variacao, objetivoAtual)
  const corLinha = grafico.temPonto ? COR_LINHA[cor] : 'text-surface-4'
  const falta = progressoMeta(atual, pesoMeta, objetivoAtual)
  const primeiro = registros[0]
  const ultimo = registros[registros.length - 1]

  function abrir(p: Painel) {
    setErro(null)
    if (p === 'meta') {
      setObjetivo(objetivoAtual)
      setMeta(pesoMeta ? formatarPeso(pesoMeta) : '')
    }
    setPainel((atualP) => (atualP === p ? null : p))
  }

  async function registrar(e: FormEvent) {
    e.preventDefault()
    const kg = lerPeso(valor)
    if (kg === null) return setErro(t.erroPeso)
    setSalvando(true)
    setErro(null)
    try {
      await pesoRepository.registrar(kg)
      await profileRepository.atualizarDadosPessoais('peso_atual', kg)
      await Promise.all([carregar(), refresh()])
      vibrar.sucesso()
      avisar.ok(t.salvo)
      setPainel(null)
      setValor('')
    } catch {
      setErro(t.erroSalvar)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarMeta(e: FormEvent) {
    e.preventDefault()
    const kg = meta.trim() === '' ? null : lerPeso(meta)
    if (meta.trim() !== '' && kg === null) return setErro(t.erroMeta)
    setSalvando(true)
    setErro(null)
    try {
      await profileRepository.atualizarObjetivoPeso(objetivo, kg)
      await refresh()
      vibrar.leve()
      setPainel(null)
    } catch {
      setErro(t.erroSalvar)
    } finally {
      setSalvando(false)
    }
  }

  // Apagar pede um 2º toque no mesmo ✕ (não dá pra "desfazer": o registro é por data).
  async function excluir(r: RegistroPeso) {
    const chave = r.data.getTime()
    if (apagando !== chave) {
      setApagando(chave)
      setTimeout(() => setApagando((a) => (a === chave ? null : a)), 3000)
      return
    }
    setApagando(null)
    try {
      await pesoRepository.excluir(r.data)
      vibrar.leve()
      await carregar()
    } catch {
      setErro(t.erroApagar)
    }
  }

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="mb-0.5 text-micro font-semibold text-content-low">{t.titulo}</h2>
          <div>
            <span className="text-4xl font-bold tabular-nums text-content-hi">{atual > 0 ? formatarPeso(atual) : '—'}</span>
            <span className="text-lg text-content-low"> kg</span>
          </div>
          {falta && (
            <div className={`mt-0.5 text-micro font-semibold ${falta.atingida ? 'text-brand' : 'text-content-low'}`}>
              {falta.atingida ? t.atingida(formatarPeso(pesoMeta!)) : t.faltam(formatarPeso(falta.faltaKg))}
            </div>
          )}
        </div>
        {temDados && resumo.variacao !== 0 && (
          <span className={`rounded-pill bg-surface-3 px-3 py-1 text-sm font-bold tabular-nums ${COR[cor]}`}>
            {formatarVariacao(resumo.variacao)} kg
          </span>
        )}
      </div>

      {todos.length > 1 && (
        <div className="mt-3 flex gap-1.5">
          {PERIODOS_PESO.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              aria-pressed={periodo === p.id}
              className={`min-h-11 rounded-pill px-4 text-sm font-semibold active:scale-95 ${
                periodo === p.id ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
              }`}
            >
              {t.periodos[p.id]}
            </button>
          ))}
        </div>
      )}

      {/* Gráfico — linha reta cinza pontilhada até existirem 2 registros. */}
      <div className={`relative mb-1 mt-4 h-16 ${corLinha}`}>
        <svg className="h-16 w-full" viewBox={`0 0 ${LARGURA} ${ALTURA}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {grafico.metaY !== null && (
            <line
              x1="0"
              x2={LARGURA}
              y1={grafico.metaY}
              y2={grafico.metaY}
              className="stroke-accent-gold"
              strokeWidth="1"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path d={grafico.area} fill="url(#pesoGrad)" />
          <path
            d={grafico.linha}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={grafico.temPonto ? undefined : '4 4'}
          />
        </svg>
        {grafico.metaY !== null && (
          <span
            className="absolute right-0 -translate-y-full pb-0.5 text-micro font-semibold text-accent-gold"
            style={{ top: `${(grafico.metaY / ALTURA) * 100}%` }}
          >
            {t.linhaMeta(formatarPeso(pesoMeta!))}
          </span>
        )}
        {/* Ponto da ponta fora do SVG: com preserveAspectRatio="none" um
            <circle> esticava junto e virava oval em tela larga. */}
        {grafico.temPonto && (
          <span
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
            style={{ left: `${(grafico.fimX / LARGURA) * 100}%`, top: `${(grafico.fimY / ALTURA) * 100}%` }}
          >
            <span className="absolute inset-0 rounded-full bg-current opacity-40 motion-safe:animate-ping" />
          </span>
        )}
      </div>
      {primeiro && ultimo && registros.length > 1 && (
        <div className="mb-3 flex justify-between text-micro tabular-nums text-content-low">
          <span>{formatarDiaMes(primeiro.data)}</span>
          <span>{t.registros(registros.length)}</span>
          <span>{formatarDiaMes(ultimo.data)}</span>
        </div>
      )}

      {!temDados && painel === null && (
        <p className="mb-3 mt-2 text-center text-micro text-content-low">{t.vazio}</p>
      )}

      {temDados && registros.length > 1 && (
        <div className="mb-3 flex text-center">
          <div className="flex-1">
            <div className="text-micro text-content-low">{t.inicio}</div>
            <div className="text-sm font-bold text-content-hi">{formatarPeso(resumo.inicial)}kg</div>
          </div>
          <div className="flex-1 border-x border-surface-3">
            <div className="text-micro text-content-low">{t.atual}</div>
            <div className={`text-sm font-bold ${COR[cor]}`}>{formatarPeso(resumo.atual)}kg</div>
          </div>
          <div className="flex-1">
            <div className="text-micro text-content-low">{pesoMeta ? t.meta : t.variacao}</div>
            <div className={`text-sm font-bold ${pesoMeta ? 'text-accent-gold' : COR[cor]}`}>
              {pesoMeta ? `${formatarPeso(pesoMeta)}kg` : `${formatarVariacao(resumo.variacao)}kg`}
            </div>
          </div>
        </div>
      )}

      {painel === 'registrar' && (
        <form onSubmit={(e) => void registrar(e)} className="mb-3 flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^0-9.,]/g, ''))}
            enterKeyHint="done"
            placeholder={atual > 0 ? formatarPeso(atual) : t.exemplo}
            aria-label={t.ariaPeso}
            className="min-h-12 min-w-0 flex-1 rounded-card border border-surface-4 bg-surface-1 px-3 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={salvando || valor === ''}
            className="min-h-12 rounded-pill bg-brand px-5 text-sm font-bold text-surface-1 active:scale-95 disabled:opacity-60"
          >
            {salvando ? '…' : t.salvar}
          </button>
        </form>
      )}

      {painel === 'meta' && (
        <form onSubmit={(e) => void salvarMeta(e)} className="mb-3 space-y-2.5 rounded-xl bg-surface-3 p-3">
          <div className="text-micro font-semibold text-content-mid">{t.objetivo}</div>
          <div className="flex gap-1.5">
            {OBJETIVOS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setObjetivo(o)}
                aria-pressed={objetivo === o}
                className={`min-h-11 flex-1 rounded-pill px-1 text-micro font-semibold active:scale-95 ${
                  objetivo === o ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
                }`}
              >
                {t.objetivos[o]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={meta}
              onChange={(e) => setMeta(e.target.value.replace(/[^0-9.,]/g, ''))}
              enterKeyHint="done"
              placeholder={t.metaOpcional}
              aria-label={t.ariaMeta}
              className="min-h-12 min-w-0 flex-1 rounded-card border border-surface-4 bg-surface-1 px-3 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={salvando}
              className="min-h-12 rounded-pill bg-brand px-5 text-sm font-bold text-surface-1 active:scale-95 disabled:opacity-60"
            >
              {salvando ? '…' : t.salvar}
            </button>
          </div>
        </form>
      )}

      {painel === 'historico' && (
        <ul className="mb-3 max-h-56 space-y-1 overflow-y-auto">
          {[...todos].reverse().map((r) => (
            <li key={r.data.getTime()} className="flex items-center justify-between rounded-lg bg-surface-3 py-0.5 pl-3 text-sm">
              <span className="tabular-nums text-content-low">{formatarDiaMes(r.data)}/{r.data.getFullYear()}</span>
              <span className="flex items-center gap-1">
                <span className="font-semibold tabular-nums text-content-hi">{formatarPeso(r.pesoKg)} kg</span>
                <button
                  onClick={() => void excluir(r)}
                  aria-label={t.apagar(formatarDiaMes(r.data))}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm font-semibold ${
                    apagando === r.data.getTime() ? 'text-accent-danger' : 'text-content-low active:text-content-hi'
                  }`}
                >
                  {apagando === r.data.getTime() ? t.confirmarApagar : '✕'}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {erro && <p role="alert" className="mb-3 text-center text-sm font-medium text-accent-danger">{erro}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => abrir('registrar')}
          aria-expanded={painel === 'registrar'}
          className={`min-h-12 flex-1 rounded-pill text-sm font-semibold active:scale-95 ${
            painel === 'registrar' ? 'bg-brand text-brand-ink' : 'border border-brand/40 text-brand'
          }`}
        >
          {t.registrar}
        </button>
        <button
          onClick={() => abrir('meta')}
          aria-expanded={painel === 'meta'}
          className={`min-h-12 flex-1 rounded-pill px-1 text-sm font-semibold active:scale-95 ${
            painel === 'meta' ? 'bg-surface-4 text-content-hi' : 'border border-surface-4 text-content-mid'
          }`}
        >
          {pesoMeta || objetivoAtual ? t.botaoMeta : t.definirMeta}
        </button>
        {todos.length > 0 && (
          <button
            onClick={() => abrir('historico')}
            aria-expanded={painel === 'historico'}
            className={`min-h-12 flex-1 rounded-pill px-1 text-sm font-semibold active:scale-95 ${
              painel === 'historico' ? 'bg-surface-4 text-content-hi' : 'border border-surface-4 text-content-mid'
            }`}
          >
            {t.historico}
          </button>
        )}
      </div>
    </section>
  )
}
