import { useCallback, useEffect, useRef, useState } from 'react'
import {
  lifeMemoriaRepository,
  type CategoriaMemoria,
  type MemoriaLife as Memoria,
} from '@data/repositories/lifeMemoriaRepository'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'
import { diaMes } from '@/i18n/formatos'
import { avisar, vibrar } from '@ui/feedback'

const CATEGORIAS: readonly CategoriaMemoria[] = ['gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto']
/** Tempo do "Desfazer" antes de apagar de verdade. */
const DESFAZER_MS = 5000

/**
 * Sub-página "O que o Life lembra" (Perfil › Privacidade e dados).
 *
 * A pessoa liga/desliga a memória (consentimento, LGPD), vê, fixa e apaga
 * o que o Life guardou do chat, e pode contar algo direto. Apagar um item
 * vira "Apagado · Desfazer"; apagar tudo pede confirmação (não tem volta).
 */
export function MemoriaLife() {
  const { m } = useI18n()
  const t = m.perfil.memoriaLife
  const [ligada, setLigada] = useState<boolean | null>(null)
  const [lista, setLista] = useState<Memoria[]>([])
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando')
  const [mudando, setMudando] = useState(false)
  const [novo, setNovo] = useState('')
  const [categoria, setCategoria] = useState<CategoriaMemoria>('gosto')
  const [data, setData] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmarTudo, setConfirmarTudo] = useState(false)
  // Apagar espera o "Desfazer"; se a pessoa sair da tela antes, apaga na hora.
  const pendentes = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const carregar = useCallback(async () => {
    setEstado('carregando')
    try {
      const [c, l] = await Promise.all([lifeMemoriaRepository.consentimento(), lifeMemoriaRepository.listar()])
      setLigada(c === true)
      setLista(l)
      setEstado('ok')
    } catch {
      setEstado('erro')
    }
  }, [])

  useEffect(() => {
    void carregar()
    const mapa = pendentes.current
    return () => {
      for (const [id, timer] of mapa) {
        clearTimeout(timer)
        void lifeMemoriaRepository.apagar(id).catch(() => {})
      }
      mapa.clear()
    }
  }, [carregar])

  async function alternar(valor: boolean) {
    setMudando(true)
    try {
      await lifeMemoriaRepository.definirConsentimento(valor)
      vibrar.leve()
      setLigada(valor)
    } catch {
      avisar.erro(t.erroMudar)
    } finally {
      setMudando(false)
    }
  }

  async function fixar(item: Memoria) {
    setLista((l) => l.map((x) => (x.id === item.id ? { ...x, fixada: !x.fixada } : x)))
    try {
      await lifeMemoriaRepository.fixar(item.id, !item.fixada)
      vibrar.leve()
    } catch {
      setLista((l) => l.map((x) => (x.id === item.id ? { ...x, fixada: item.fixada } : x)))
      avisar.erro(t.erroMudar)
    }
  }

  function apagar(item: Memoria) {
    const posicao = lista.findIndex((x) => x.id === item.id)
    setLista((l) => l.filter((x) => x.id !== item.id))
    vibrar.leve()
    const timer = setTimeout(() => {
      pendentes.current.delete(item.id)
      void lifeMemoriaRepository.apagar(item.id).catch(() => {
        avisar.erro(t.erroMudar)
        void carregar()
      })
    }, DESFAZER_MS)
    pendentes.current.set(item.id, timer)
    avisar.desfazer(t.apagada, t.desfazer, () => {
      clearTimeout(timer)
      pendentes.current.delete(item.id)
      setLista((l) => {
        const nova = [...l]
        nova.splice(Math.min(posicao, nova.length), 0, item)
        return nova
      })
    })
  }

  async function apagarTudo() {
    try {
      await lifeMemoriaRepository.apagarTudo()
      setLista([])
      setConfirmarTudo(false)
      avisar.ok(t.tudoApagado)
    } catch {
      avisar.erro(t.erroMudar)
    }
  }

  async function contar() {
    const texto = novo.trim()
    if (texto.length < 3 || guardando) return
    setGuardando(true)
    try {
      await lifeMemoriaRepository.contar(texto, categoria, categoria === 'evento' && data ? data : null)
      vibrar.leve()
      setNovo('')
      setData('')
      setLista(await lifeMemoriaRepository.listar())
    } catch {
      avisar.erro(t.erroContar)
    } finally {
      setGuardando(false)
    }
  }

  const dataCurta = diaMes

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <p className="mx-5 mt-1 text-micro leading-relaxed text-content-low">{t.intro}</p>

      <section className="mx-5 mt-4 rounded-2xl border border-surface-4 bg-surface-2 p-4">
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-sm font-bold text-content-hi">{t.ligar}</span>
          <input
            type="checkbox"
            role="switch"
            checked={ligada === true}
            disabled={ligada === null || mudando}
            onChange={(e) => void alternar(e.target.checked)}
            className="h-6 w-6 flex-none accent-brand"
          />
        </label>
        {ligada === false && <p className="mt-1 text-micro text-content-low">{t.desligado}</p>}
      </section>

      <section className="mx-5 mt-5">
        {estado === 'carregando' && (
          <div className="space-y-2" aria-label={t.carregando}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-surface-2 motion-safe:animate-pulse" />
            ))}
          </div>
        )}
        {estado === 'erro' && (
          <div className="rounded-xl border border-surface-4 bg-surface-2 p-4">
            <p className="text-sm text-content-mid">{t.erroCarregar}</p>
            <button type="button" onClick={() => void carregar()} className="mt-2 min-h-11 text-sm font-semibold text-brand">
              {t.tentar}
            </button>
          </div>
        )}
        {estado === 'ok' && lista.length === 0 && <p className="text-sm text-content-low">{t.vazio}</p>}
        {estado === 'ok' && lista.length > 0 && (
          <ul className="divide-y divide-surface-4 rounded-2xl border border-surface-4 bg-surface-2">
            {lista.map((item) => (
              <li key={item.id} className="flex items-center gap-1 py-1 pl-4 pr-1">
                <div className="min-w-0 flex-1 py-2">
                  <p className="text-sm text-content-hi">{item.texto}</p>
                  <p className="mt-0.5 text-micro text-content-low">
                    {t.categorias[item.categoria]}
                    {item.dataReferencia ? ` · ${dataCurta(item.dataReferencia)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={item.fixada}
                  aria-label={item.fixada ? t.desafixar : t.fixar}
                  onClick={() => void fixar(item)}
                  className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${
                    item.fixada ? 'text-brand' : 'text-content-low opacity-60'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill={item.fixada ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={t.apagar}
                  onClick={() => apagar(item)}
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-content-low"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ligada && (
        <section className="mx-5 mt-6">
          <h2 className="mb-2 text-sm font-bold text-content-hi">{t.contarTitulo}</h2>
          <input
            type="text"
            maxLength={200}
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            placeholder={t.contarPlaceholder}
            aria-label={t.contarTitulo}
            className="min-h-12 w-full rounded-xl border border-surface-4 bg-surface-2 px-3.5 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t.tipo}</span>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaMemoria)}
                className="min-h-12 w-full rounded-xl border border-surface-4 bg-surface-2 px-3 text-sm text-content-hi focus:border-brand focus:outline-none"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {t.categorias[c]}
                  </option>
                ))}
              </select>
            </label>
            {categoria === 'evento' && (
              <label className="flex-none">
                <span className="sr-only">{t.dataEvento}</span>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="min-h-12 rounded-xl border border-surface-4 bg-surface-2 px-3 text-sm text-content-hi focus:border-brand focus:outline-none"
                />
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={() => void contar()}
            disabled={novo.trim().length < 3 || guardando}
            className="mt-3 min-h-12 w-full rounded-xl bg-brand text-sm font-bold text-brand-ink transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {guardando ? t.guardando : t.guardar}
          </button>
        </section>
      )}

      {lista.length > 0 && (
        <section className="mx-5 mt-8">
          {confirmarTudo ? (
            <div className="rounded-2xl border border-accent-danger/50 bg-accent-danger/10 p-4">
              <p className="text-sm font-semibold text-content-hi">{t.certeza}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmarTudo(false)}
                  className="min-h-12 flex-1 rounded-xl border border-surface-4 text-sm font-semibold text-content-mid active:bg-content-hi/5"
                >
                  {t.cancelar}
                </button>
                <button
                  type="button"
                  onClick={() => void apagarTudo()}
                  className="min-h-12 flex-1 rounded-xl bg-accent-danger text-sm font-bold text-white"
                >
                  {t.simApagar}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarTudo(true)}
              className="min-h-12 w-full rounded-2xl border border-accent-danger/50 text-sm font-bold text-accent-danger transition-colors active:bg-accent-danger/10"
            >
              {t.apagarTudo}
            </button>
          )}
        </section>
      )}
    </main>
  )
}
