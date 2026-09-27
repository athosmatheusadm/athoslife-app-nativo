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

const COR = { brand: 'text-brand', danger: 'text-accent-danger', neutral: 'text-content-mid' }
const COR_LINHA = { brand: '#22c55e', danger: '#f43f5e', neutral: '#22c55e' }
const LARGURA = 320
const ALTURA = 64

const OBJETIVOS: ReadonlyArray<{ id: Objetivo; rotulo: string }> = [
  { id: 'emagrecer', rotulo: 'Emagrecer' },
  { id: 'massa', rotulo: 'Ganhar massa' },
  { id: 'manter', rotulo: 'Manter' },
]

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
        <p className="text-micro text-content-dim">Carregando seu peso…</p>
      </section>
    )
  }

  const objetivoAtual = profile?.objetivo ?? null
  const temDados = registros.length > 0
  const atual = todos[todos.length - 1]?.pesoKg ?? 0
  const cor = corVariacao(resumo.variacao, objetivoAtual)
  const corLinha = grafico.temPonto ? COR_LINHA[cor] : '#3f3f46'
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
    if (kg === null) return setErro('Informa um peso entre 20 e 400 kg.')
    setSalvando(true)
    setErro(null)
    try {
      await pesoRepository.registrar(kg)
      await profileRepository.atualizarDadosPessoais('peso_atual', kg)
      await Promise.all([carregar(), refresh()])
      setPainel(null)
      setValor('')
    } catch {
      setErro('Não deu pra salvar. Tenta de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarMeta(e: FormEvent) {
    e.preventDefault()
    const kg = meta.trim() === '' ? null : lerPeso(meta)
    if (meta.trim() !== '' && kg === null) return setErro('Meta entre 20 e 400 kg (ou deixa vazio).')
    setSalvando(true)
    setErro(null)
    try {
      await profileRepository.atualizarObjetivoPeso(objetivo, kg)
      await refresh()
      setPainel(null)
    } catch {
      setErro('Não deu pra salvar. Tenta de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(r: RegistroPeso) {
    try {
      await pesoRepository.excluir(r.data)
      await carregar()
    } catch {
      setErro('Não deu pra apagar. Tenta de novo.')
    }
  }

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-0.5 text-micro text-content-dim">⚖️ Meu peso</div>
          <div>
            <span className="text-4xl font-bold text-content-hi">{atual > 0 ? formatarPeso(atual) : '—'}</span>
            <span className="text-lg text-content-low"> kg</span>
          </div>
          {falta && (
            <div className={`mt-0.5 text-micro font-semibold ${falta.atingida ? 'text-brand' : 'text-content-low'}`}>
              {falta.atingida ? `🎯 Meta de ${formatarPeso(pesoMeta!)} kg atingida!` : `Faltam ${formatarPeso(falta.faltaKg)} kg pra meta`}
            </div>
          )}
        </div>
        {temDados && resumo.variacao !== 0 && (
          <span className={`rounded-pill bg-surface-3 px-3 py-1 text-sm font-bold ${COR[cor]}`}>
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
              className={`rounded-pill px-3 py-1 text-micro font-semibold ${
                periodo === p.id ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-low'
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      )}

      {/* Gráfico — linha reta cinza pontilhada até existirem 2 registros. */}
      <div className="relative mb-1 mt-4 h-16">
        <svg className="h-16 w-full" viewBox={`0 0 ${LARGURA} ${ALTURA}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={corLinha} stopOpacity="0.25" />
              <stop offset="100%" stopColor={corLinha} stopOpacity="0" />
            </linearGradient>
          </defs>
          {grafico.metaY !== null && (
            <line
              x1="0"
              x2={LARGURA}
              y1={grafico.metaY}
              y2={grafico.metaY}
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path d={grafico.area} fill="url(#pesoGrad)" />
          <path
            d={grafico.linha}
            fill="none"
            stroke={corLinha}
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={grafico.temPonto ? undefined : '4 4'}
          />
        </svg>
        {grafico.metaY !== null && (
          <span
            className="absolute right-0 -translate-y-full pb-0.5 text-[10px] font-semibold text-accent-gold"
            style={{ top: `${(grafico.metaY / ALTURA) * 100}%` }}
          >
            meta {formatarPeso(pesoMeta!)}
          </span>
        )}
        {/* Ponto da ponta fora do SVG: com preserveAspectRatio="none" um
            <circle> esticava junto e virava oval em tela larga. */}
        {grafico.temPonto && (
          <span
            className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${(grafico.fimX / LARGURA) * 100}%`, top: `${(grafico.fimY / ALTURA) * 100}%`, background: corLinha }}
          >
            <span className="absolute inset-0 animate-ping rounded-full opacity-40" style={{ background: corLinha }} />
          </span>
        )}
      </div>
      {primeiro && ultimo && registros.length > 1 && (
        <div className="mb-3 flex justify-between text-[11px] text-content-dim">
          <span>{formatarDiaMes(primeiro.data)}</span>
          <span>{registros.length} registros</span>
          <span>{formatarDiaMes(ultimo.data)}</span>
        </div>
      )}

      {!temDados && painel === null && (
        <p className="mb-3 mt-2 text-center text-micro text-content-low">
          Registre seu peso e acompanhe sua evolução aqui. 📈
        </p>
      )}

      {temDados && registros.length > 1 && (
        <div className="mb-3 flex text-center">
          <div className="flex-1">
            <div className="text-micro text-content-dim">Início</div>
            <div className="text-sm font-bold text-content-hi">{formatarPeso(resumo.inicial)}kg</div>
          </div>
          <div className="flex-1 border-x border-surface-3">
            <div className="text-micro text-content-dim">Atual</div>
            <div className={`text-sm font-bold ${COR[cor]}`}>{formatarPeso(resumo.atual)}kg</div>
          </div>
          <div className="flex-1">
            <div className="text-micro text-content-dim">{pesoMeta ? 'Meta' : 'Variação'}</div>
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
            placeholder={atual > 0 ? formatarPeso(atual) : 'Ex.: 78,5'}
            aria-label="Peso de hoje em kg"
            className="min-w-0 flex-1 rounded-card border border-surface-4 bg-surface-1 px-3 py-2.5 text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={salvando || valor === ''}
            className="rounded-pill bg-brand px-4 text-sm font-bold text-surface-1 disabled:opacity-60"
          >
            {salvando ? '…' : 'Salvar'}
          </button>
        </form>
      )}

      {painel === 'meta' && (
        <form onSubmit={(e) => void salvarMeta(e)} className="mb-3 space-y-2.5 rounded-xl bg-surface-3 p-3">
          <div className="text-micro font-semibold text-content-mid">Seu objetivo</div>
          <div className="flex gap-1.5">
            {OBJETIVOS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setObjetivo(o.id)}
                className={`flex-1 rounded-pill py-2 text-micro font-semibold ${
                  objetivo === o.id ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'
                }`}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={meta}
              onChange={(e) => setMeta(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="Peso-meta (opcional)"
              aria-label="Peso-meta em kg"
              className="min-w-0 flex-1 rounded-card border border-surface-4 bg-surface-1 px-3 py-2.5 text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none"
            />
            <button
              type="submit"
              disabled={salvando}
              className="rounded-pill bg-brand px-4 text-sm font-bold text-surface-1 disabled:opacity-60"
            >
              {salvando ? '…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {painel === 'historico' && (
        <ul className="mb-3 max-h-56 space-y-1 overflow-y-auto">
          {[...todos].reverse().map((r) => (
            <li key={r.data.getTime()} className="flex items-center justify-between rounded-lg bg-surface-3 px-3 py-2 text-sm">
              <span className="text-content-low">{formatarDiaMes(r.data)}/{r.data.getFullYear()}</span>
              <span className="flex items-center gap-3">
                <span className="font-semibold text-content-hi">{formatarPeso(r.pesoKg)} kg</span>
                <button
                  onClick={() => void excluir(r)}
                  aria-label={`Apagar registro de ${formatarDiaMes(r.data)}`}
                  className="text-content-dim"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {erro && <p className="mb-3 text-center text-sm font-medium text-accent-danger">{erro}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => abrir('registrar')}
          className={`flex-1 rounded-pill py-2 text-sm font-semibold ${
            painel === 'registrar' ? 'bg-brand text-[#04120a]' : 'border border-brand/40 text-brand'
          }`}
        >
          + Registrar
        </button>
        <button
          onClick={() => abrir('meta')}
          className={`flex-1 rounded-pill py-2 text-sm font-semibold ${
            painel === 'meta' ? 'bg-surface-4 text-content-hi' : 'border border-surface-4 text-content-mid'
          }`}
        >
          {pesoMeta || objetivoAtual ? 'Meta' : 'Definir meta'}
        </button>
        {todos.length > 0 && (
          <button
            onClick={() => abrir('historico')}
            className={`flex-1 rounded-pill py-2 text-sm font-semibold ${
              painel === 'historico' ? 'bg-surface-4 text-content-hi' : 'border border-surface-4 text-content-mid'
            }`}
          >
            Histórico
          </button>
        )}
      </div>
    </section>
  )
}
