import { useState } from 'react'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'
import {
  definirAltoContraste,
  definirReduzirAnimacoes,
  definirTamanhoTexto,
  lerAltoContraste,
  lerReduzirAnimacoes,
  lerTamanhoTexto,
  type TamanhoTexto,
} from '@ui/theme/preferenciasAcessibilidade'
import { definirTema, lerTema, type Tema } from '@ui/theme/tema'

const TEMAS: readonly { valor: Tema; fundo: string }[] = [
  { valor: 'escuro', fundo: 'bg-[#161616]' },
  { valor: 'claro', fundo: 'bg-white' },
  { valor: 'auto', fundo: 'bg-[linear-gradient(135deg,#161616_50%,#ffffff_50%)]' },
]

const TAMANHOS: readonly { valor: TamanhoTexto; amostra: string }[] = [
  { valor: 'normal', amostra: 'text-sm' },
  { valor: 'grande', amostra: 'text-base' },
  { valor: 'extra', amostra: 'text-lg' },
]

/**
 * Sub-página "Acessibilidade" do Perfil — três preferências reais
 * (aplicadas na hora, guardadas no aparelho): tamanho do texto, reduzir
 * animações, alto contraste. Ver preferenciasAcessibilidade.ts pro porquê
 * de não serem sincronizadas com o banco.
 */
export function Acessibilidade() {
  const t = useI18n().m.perfil.acessibilidade
  const [tamanho, setTamanho] = useState<TamanhoTexto>(lerTamanhoTexto)
  const [reduzirAnimacoes, setReduzirAnimacoes] = useState(lerReduzirAnimacoes)
  const [altoContraste, setAltoContraste] = useState(lerAltoContraste)
  const [tema, setTema] = useState<Tema>(lerTema)

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <section className="mx-5 mt-2">
        <h2 className="mb-2 text-sm font-bold text-content-hi">{t.tema}</h2>
        <div className="flex gap-2" role="radiogroup" aria-label={t.tema}>
          {TEMAS.map((op) => (
            <button
              key={op.valor}
              type="button"
              role="radio"
              aria-checked={tema === op.valor}
              onClick={() => {
                setTema(op.valor)
                definirTema(op.valor)
              }}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center rounded-xl border px-1 text-sm font-semibold transition-colors active:scale-[0.98] ${
                tema === op.valor ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
              }`}
            >
              <span className={`h-5 w-5 rounded-full border border-content-dim/40 ${op.fundo}`} aria-hidden="true" />
              <span className="mt-1 block text-micro">{t.temas[op.valor]}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-micro text-content-low">{t.temaAutoSub}</p>
      </section>

      <section className="mx-5 mt-6">
        <h2 className="mb-2 text-sm font-bold text-content-hi">{t.tamanho}</h2>
        <div className="flex gap-2" role="radiogroup" aria-label={t.tamanho}>
          {TAMANHOS.map((op) => (
            <button
              key={op.valor}
              type="button"
              role="radio"
              aria-checked={tamanho === op.valor}
              onClick={() => {
                setTamanho(op.valor)
                definirTamanhoTexto(op.valor)
              }}
              className={`min-h-16 flex-1 rounded-xl border px-1 text-sm font-semibold transition-colors active:scale-[0.98] ${
                tamanho === op.valor ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
              }`}
            >
              <span className={op.amostra} aria-hidden="true">Aa</span>
              <span className="mt-1 block text-micro">{t.tamanhos[op.valor]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-6 space-y-1">
        <Toggle
          titulo={t.animacoes}
          subtitulo={t.animacoesSub}
          ativo={reduzirAnimacoes}
          onMudar={(v) => {
            setReduzirAnimacoes(v)
            definirReduzirAnimacoes(v)
          }}
        />
        <Toggle
          titulo={t.contraste}
          subtitulo={t.contrasteSub}
          ativo={altoContraste}
          onMudar={(v) => {
            setAltoContraste(v)
            definirAltoContraste(v)
          }}
        />
      </section>

      <p className="mx-5 mt-6 text-micro text-content-low">{t.nota}</p>
    </main>
  )
}

function Toggle(props: {
  titulo: string
  subtitulo: string
  ativo: boolean
  onMudar: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.ativo}
      onClick={() => props.onMudar(!props.ativo)}
      className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-left active:bg-surface-3"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-content-hi">{props.titulo}</span>
        <span className="mt-0.5 block text-micro text-content-low">{props.subtitulo}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
          props.ativo ? 'bg-brand' : 'bg-surface-4'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            props.ativo ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
